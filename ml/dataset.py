# -*- coding: utf-8 -*-
"""Monta o dataset de treino/avaliação a partir dos laudos reais e grava no PostgreSQL.

Uso:
    python dataset.py                 # lê LAUDOS_DIR, mostra o resumo e grava no banco
    python dataset.py --dry-run       # só mostra o resumo, não grava

Separação treino/avaliação (fixa e reprodutível):
    - 20% dos laudos vão para o conjunto de AVALIAÇÃO (nunca entram no treino);
    - o sorteio é por hash do número da proposta, então o mesmo imóvel
      (mesma proposta, vários meses/revisões) nunca fica nos dois lados.

Tabelas (schema ml_data):
    recognizer_examples (sheet_text, label, origem)   -> treino do reconhecedor
    mapper_examples     (rotulo, campo, origem)       -> exemplos negativos do mapeador
    eval_examples       (tipo, texto, label, origem)  -> conjunto de avaliação (nunca treina)
"""
import collections
import glob
import hashlib
import os
import re
import sys
import warnings

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import openpyxl

import fields
import templates

LAUDOS_DIR = os.getenv("LAUDOS_DIR", r"C:/Users/Kalebe/Desktop/2025")
NENHUM = "__nenhum__"          # classe "não é rótulo de campo"
PCT_AVALIACAO = 20             # % dos laudos reservados para avaliação
MAX_NEGATIVOS = 600

# abas onde ficam os campos de cada template (onde buscamos rótulos)
ABAS = {
    "v22_unidades_isoladas": ["XXX - Dados Laudo", "XXX - Dados Calc"],
    "v25_unidades_padronizadas": ["DADOS DO IMÓVEL"],
}


def rotulos_conhecidos():
    """{rótulo normalizado: campo} a partir dos pares de treino."""
    return {templates.normalize(r): c for r, c in fields.TRAINING_PAIRS}


def detectar_tipo(sheetnames):
    if "XXX - Dados Laudo" in sheetnames:
        return "v22_unidades_isoladas"
    if "DADOS DO IMÓVEL" in sheetnames:
        return "v25_unidades_padronizadas"
    return None


def grupo_do_laudo(path):
    """Chave do imóvel: número da proposta no início do nome (ou o caminho)."""
    nome = os.path.basename(path)
    m = re.match(r"(\d+)", nome)
    if not m:
        m = re.search(r"(\d{6,})", os.path.basename(os.path.dirname(path)))
    return m.group(1).lstrip("0") if m else path


def eh_avaliacao(path):
    h = int(hashlib.md5(grupo_do_laudo(path).encode("utf-8")).hexdigest(), 16)
    return h % 100 < PCT_AVALIACAO


def listar_laudos(base=None):
    """Lista (caminho, template_id | 'desconhecido') de todos os laudos legíveis."""
    base = base or LAUDOS_DIR
    achados = []
    for p in glob.glob(base + "/**/*.xls*", recursive=True):
        nome = os.path.basename(p)
        if nome.startswith("~$") or "Homo" not in nome and "Laudo" not in nome:
            continue
        try:
            wb = openpyxl.load_workbook(p, read_only=True)
            names = wb.sheetnames
            wb.close()
        except Exception:
            continue
        tipo = detectar_tipo(names)
        if tipo is None:
            if "Laudo" not in nome:
                continue
            tipo = "desconhecido"
        achados.append((p, tipo, names))
    return sorted(achados, key=lambda x: x[0])


def _celulas(ws):
    """{(linha, coluna): valor} de uma aba (modo leitura)."""
    d = {}
    for r, row in enumerate(ws.iter_rows(values_only=True), 1):
        for c, v in enumerate(row, 1):
            if v not in (None, ""):
                d[(r, c)] = v
    return d


def exemplos_mapeador(path, tipo):
    """Do laudo, devolve (positivos, negativos).

    positivos: [(texto_do_rotulo, campo)] — rótulos conhecidos que aparecem no laudo
    negativos: [texto]                    — valores/instruções que NÃO são rótulos
    """
    if tipo not in ABAS:
        return [], []
    conhecidos = rotulos_conhecidos()
    pos, neg = [], []
    wb = openpyxl.load_workbook(path, read_only=True)
    try:
        for aba in ABAS[tipo]:
            if aba not in wb.sheetnames:
                continue
            cel = _celulas(wb[aba])
            for (r, c), v in cel.items():
                if not isinstance(v, str):
                    continue
                texto = v.strip()
                norm = templates.normalize(texto)
                if norm in conhecidos:
                    pos.append((texto, conhecidos[norm]))
                    for off in (1, 2, 3):  # valor ao lado do rótulo
                        val = cel.get((r, c + off))
                        if isinstance(val, str) and templates.normalize(val.strip()) not in conhecidos:
                            neg.append(val.strip())
                        if val is not None:
                            break
                elif texto.startswith("=") or len(texto) > 40:
                    neg.append(texto)
    finally:
        wb.close()
    corta = lambda t: t[:120]
    return pos, [corta(n) for n in neg if n]


def construir(base=None, verbose=True):
    """Constrói todos os conjuntos. Retorna um dict com as listas."""
    laudos = listar_laudos(base)
    out = {
        "rec_train": [], "rec_eval": [],      # (sheet_text, label, origem)
        "neg_train": collections.Counter(),   # texto negativo -> contagem
        "neg_eval": collections.Counter(),
        "pos_eval": [],                       # (rotulo, campo)
        "n_laudos": collections.Counter(),
    }
    for i, (path, tipo, names) in enumerate(laudos, 1):
        avaliacao = eh_avaliacao(path)
        out["n_laudos"][(tipo, "avaliacao" if avaliacao else "treino")] += 1
        fp = " ".join(sorted(templates.normalize(n) for n in names))
        item = (fp, tipo, os.path.basename(path))
        (out["rec_eval"] if avaliacao else out["rec_train"]).append(item)

        pos, neg = exemplos_mapeador(path, tipo)
        if avaliacao:
            out["pos_eval"].extend(pos)
            out["neg_eval"].update(neg)
        else:
            out["neg_train"].update(neg)
        if verbose and i % 25 == 0:
            print(f"  ... {i}/{len(laudos)} laudos lidos", flush=True)
    return out


# ---------------------------------------------------------------- banco

def garantir_tabelas(engine):
    from sqlalchemy import text
    with engine.begin() as con:
        con.execute(text("CREATE SCHEMA IF NOT EXISTS ml_data"))
        con.execute(text("ALTER TABLE ml_data.recognizer_examples ADD COLUMN IF NOT EXISTS origem text"))
        con.execute(text("""CREATE TABLE IF NOT EXISTS ml_data.mapper_examples (
            id serial PRIMARY KEY, rotulo text NOT NULL, campo varchar(100) NOT NULL, origem text)"""))
        con.execute(text("""CREATE TABLE IF NOT EXISTS ml_data.eval_examples (
            id serial PRIMARY KEY, tipo varchar(20) NOT NULL, texto text NOT NULL,
            label varchar(100) NOT NULL, origem text)"""))
        con.execute(text("""CREATE TABLE IF NOT EXISTS ml_data.model_runs (
            id serial PRIMARY KEY, criado_em timestamptz DEFAULT now(),
            origem varchar(30), metricas jsonb, promovido boolean)"""))


def gravar(engine, ds):
    from sqlalchemy import text
    garantir_tabelas(engine)
    negs_train = [t for t, _ in ds["neg_train"].most_common(MAX_NEGATIVOS)]
    with engine.begin() as con:
        con.execute(text("DELETE FROM ml_data.recognizer_examples"))
        con.execute(text("DELETE FROM ml_data.mapper_examples"))
        con.execute(text("DELETE FROM ml_data.eval_examples"))
        con.execute(text("INSERT INTO ml_data.recognizer_examples (sheet_text, label, origem) "
                         "VALUES (:t, :l, :o)"),
                    [{"t": fp, "l": lab, "o": o} for fp, lab, o in ds["rec_train"]])
        con.execute(text("INSERT INTO ml_data.mapper_examples (rotulo, campo, origem) VALUES (:r, :c, :o)"),
                    [{"r": t, "c": NENHUM, "o": "laudos_reais"} for t in negs_train])
        ev = [{"t": "reconhecedor", "x": fp, "l": lab, "o": o} for fp, lab, o in ds["rec_eval"]]
        ev += [{"t": "mapeador", "x": r, "l": c, "o": "positivo"} for r, c in set(ds["pos_eval"])]
        ev += [{"t": "mapeador", "x": t, "l": NENHUM, "o": "negativo"} for t in ds["neg_eval"]]
        con.execute(text("INSERT INTO ml_data.eval_examples (tipo, texto, label, origem) "
                         "VALUES (:t, :x, :l, :o)"), ev)
    return len(ds["rec_train"]), len(negs_train), len(ev)


def resumo(ds):
    print("Laudos (tipo, conjunto):")
    for k, v in sorted(ds["n_laudos"].items()):
        print(f"   {k[0]:28s} {k[1]:10s} {v}")
    print(f"Mapeador: {len(ds['neg_train'])} textos negativos distintos no treino, "
          f"{len(ds['neg_eval'])} na avaliação, {len(set(ds['pos_eval']))} rótulos positivos na avaliação")


if __name__ == "__main__":
    ds = construir()
    resumo(ds)
    if "--dry-run" in sys.argv:
        sys.exit(0)
    import train
    r, n, e = gravar(train.get_db_engine(), ds)
    print(f"Gravado no banco: {r} exemplos do reconhecedor, {n} negativos do mapeador, {e} exemplos de avaliação")
