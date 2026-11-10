# -*- coding: utf-8 -*-
"""Avaliação dos modelos num conjunto reservado (laudos que NUNCA entram no treino).

    python avaliar.py                 # avalia os modelos de models/ (reconhecedor + mapeador)
    python avaliar.py --extracao      # inclui a extração ponta a ponta nos laudos de avaliação (local)
    python avaliar.py --salvar        # registra o resultado no histórico (models/metricas.json + banco)

O conjunto de avaliação fica em ml_data.eval_examples (montado por dataset.py).
"""
import json
import os
import sys
import warnings
from datetime import datetime, timezone

warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import joblib
import pandas as pd

import templates

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
HISTORICO = os.path.join(MODELS_DIR, "metricas.json")
NENHUM = "__nenhum__"


def _carregar_eval(engine):
    return pd.read_sql("SELECT tipo, texto, label, origem FROM ml_data.eval_examples", con=engine)


def avaliar_reconhecedor(recognizer, ev):
    d = ev[ev["tipo"] == "reconhecedor"]
    if d.empty:
        return {"n": 0, "acuracia": None}
    pred = recognizer.predict(list(d["texto"]))
    certo = (pred == d["label"].values)
    por_classe = {}
    for classe, grupo in d.assign(certo=certo).groupby("label"):
        por_classe[classe] = {"n": int(len(grupo)), "acuracia": round(float(grupo["certo"].mean()), 4)}
    return {"n": int(len(d)), "acuracia": round(float(certo.mean()), 4), "por_classe": por_classe}


def avaliar_mapeador(mapper, ev, textos_treino=()):
    d = ev[ev["tipo"] == "mapeador"]
    if d.empty:
        return {"n": 0}
    x = [templates.normalize(t) for t in d["texto"]]
    pred = mapper.predict(x)
    d = d.assign(pred=pred, certo=(pred == d["label"].values))
    pos = d[d["label"] != NENHUM]
    neg = d[d["label"] == NENHUM]
    # negativos "inéditos": textos que o mapeador nunca viu no treino
    vistos = {templates.normalize(t) for t in textos_treino}
    ineditos = neg[[templates.normalize(t) not in vistos for t in neg["texto"]]]
    return {
        "n": int(len(d)),
        "rotulos_reconhecidos": round(float(pos["certo"].mean()), 4) if len(pos) else None,
        "n_rotulos": int(len(pos)),
        "rejeicao_nao_rotulos": round(float(neg["certo"].mean()), 4) if len(neg) else None,
        "n_nao_rotulos": int(len(neg)),
        "rejeicao_ineditos": round(float(ineditos["certo"].mean()), 4) if len(ineditos) else None,
        "n_ineditos": int(len(ineditos)),
    }


def avaliar_extracao(mapper_dir=None, max_laudos=None):
    """Extração ponta a ponta nos laudos reservados (precisa dos arquivos locais).

    Verdade-terreno: valor ao lado do rótulo com texto EXATO de um sinônimo conhecido.
    Mede quantos campos o `extract` acerta e quantos "inventa" (campos que o laudo não tem).
    """
    import dataset
    import fill
    import openpyxl

    conhecidos = dataset.rotulos_conhecidos()
    mapper = joblib.load(os.path.join(mapper_dir or MODELS_DIR, "mapper.joblib"))
    laudos = [(p, t) for p, t, _ in dataset.listar_laudos() if t in dataset.ABAS and dataset.eh_avaliacao(p)]
    if max_laudos:
        laudos = laudos[:max_laudos]
    acertos = total = falsos = extraidos = 0
    por_template = {}
    for path, tid in laudos:
        wb = openpyxl.load_workbook(path, data_only=False)
        verdade = {}
        for campo, (aba, _) in templates.CELL_MAP[tid].items():
            if aba not in wb.sheetnames:
                continue
            ws = wb[aba]
            achou = False
            for row in ws.iter_rows():
                for c in row:
                    if isinstance(c.value, str) and conhecidos.get(templates.normalize(c.value.strip())) == campo:
                        for off in (1, 2, 3):
                            v = ws.cell(row=c.row, column=c.column + off).value
                            if v not in (None, ""):
                                verdade[campo] = v
                                break
                        achou = campo in verdade
                    if achou:
                        break
                if achou:
                    break
        wb.close()
        ext = fill.extract(tid, path, mapper=mapper)
        ok = sum(1 for k, v in verdade.items() if ext.get(k) == v)
        fp = sum(1 for k in ext if k not in verdade)
        acertos += ok; total += len(verdade); falsos += fp; extraidos += len(ext)
        t = por_template.setdefault(tid, [0, 0, 0])
        t[0] += ok; t[1] += len(verdade); t[2] += fp
    return {
        "laudos": len(laudos),
        "campos_conferidos": total,
        "acertos": acertos,
        "acuracia": round(acertos / total, 4) if total else None,
        "campos_inventados": falsos,
        "por_template": {k: {"acertos": v[0], "de": v[1], "inventados": v[2]} for k, v in por_template.items()},
    }


def avaliar_diretorio(models_dir, engine, extracao=False):
    """Avalia os modelos salvos em `models_dir`. Devolve um dict de métricas."""
    ev = _carregar_eval(engine)
    rec = joblib.load(os.path.join(models_dir, "recognizer.joblib"))
    mapper = joblib.load(os.path.join(models_dir, "mapper.joblib"))
    try:
        treino = pd.read_sql("SELECT rotulo FROM ml_data.mapper_examples", con=engine)["rotulo"].tolist()
    except Exception:
        treino = []
    m = {
        "reconhecedor": avaliar_reconhecedor(rec, ev),
        "mapeador": avaliar_mapeador(mapper, ev, treino),
    }
    if extracao:
        m["extracao"] = avaliar_extracao(models_dir)
    return m


def nota(metricas):
    """Nota única para comparar dois modelos: média do reconhecedor e do mapeador."""
    r = metricas["reconhecedor"].get("acuracia") or 0.0
    mp = metricas["mapeador"]
    partes = [mp.get("rotulos_reconhecidos"), mp.get("rejeicao_nao_rotulos")]
    partes = [p for p in partes if p is not None]
    mapa = sum(partes) / len(partes) if partes else 0.0
    return round((r + mapa) / 2, 4)


def registrar(metricas, origem, promovido, engine=None):
    metricas = dict(metricas, registrado_em=datetime.now(timezone.utc).isoformat(), origem=origem,
                    promovido=promovido, nota=nota(metricas))
    os.makedirs(MODELS_DIR, exist_ok=True)
    hist = []
    if os.path.exists(HISTORICO):
        try:
            hist = json.load(open(HISTORICO, encoding="utf-8"))
        except Exception:
            hist = []
    hist.append(metricas)
    json.dump(hist[-50:], open(HISTORICO, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    if engine is not None:
        try:
            from sqlalchemy import text
            with engine.begin() as con:
                con.execute(text("INSERT INTO ml_data.model_runs (origem, metricas, promovido) "
                                 "VALUES (:o, CAST(:m AS jsonb), :p)"),
                            {"o": origem, "m": json.dumps(metricas, ensure_ascii=False), "p": promovido})
        except Exception as e:
            print(f"  [aviso] não registrou no banco: {e}")
    return metricas


def _imprimir(m):
    r = m["reconhecedor"]
    print(f"Reconhecedor : {r['acuracia']}  ({r['n']} laudos de avaliação)")
    for c, v in (r.get("por_classe") or {}).items():
        print(f"     {c:28s} {v['acuracia']}  (n={v['n']})")
    mp = m["mapeador"]
    print(f"Mapeador     : rótulos reconhecidos {mp.get('rotulos_reconhecidos')} (n={mp.get('n_rotulos')}) | "
          f"rejeita não-rótulos {mp.get('rejeicao_nao_rotulos')} (n={mp.get('n_nao_rotulos')}) | "
          f"inéditos {mp.get('rejeicao_ineditos')} (n={mp.get('n_ineditos')})")
    if "extracao" in m:
        e = m["extracao"]
        print(f"Extração     : {e['acertos']}/{e['campos_conferidos']} = {e['acuracia']}  "
              f"| campos inventados: {e['campos_inventados']}  ({e['laudos']} laudos)")
        for t, v in e["por_template"].items():
            print(f"     {t:28s} {v['acertos']}/{v['de']}  inventados={v['inventados']}")
    print(f"Nota         : {nota(m)}")


if __name__ == "__main__":
    import train
    engine = train.get_db_engine()
    met = avaliar_diretorio(MODELS_DIR, engine, extracao="--extracao" in sys.argv)
    _imprimir(met)
    if "--salvar" in sys.argv:
        registrar(met, "manual", True, engine)
        print("Registrado no histórico.")
