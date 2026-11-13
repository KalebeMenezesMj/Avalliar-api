# -*- coding: utf-8 -*-
"""Valida o recalc.py (LibreOffice): preenche o template com dados de laudos reais, grava os
valores calculados e compara, aba por aba, com os valores do laudo do avaliador.
Roda em qualquer SO que tenha `soffice` (no Docker da imagem do ML).

    LAUDOS_DIR=/laudos python ferramentas/teste_cache.py 5
"""
import sys, os, glob, collections, warnings, datetime
warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
import openpyxl, fill as filler, calc, recalc

BLANK = os.path.join(os.path.dirname(HERE), "data", "templates", "Homogeneização_Unidades Isoladas_2025_V22.xlsx")
ABAS = ["XXX - Dados Calc", "Custo01", "Custo02", "Amostras01-04", "Amostras05-08", "INSPECTOS"]
paths = sorted(glob.glob(os.getenv("LAUDOS_DIR", "/laudos") + "/*/Concluidos/*/*-Homo-*.xlsx"))
N = int(sys.argv[1]); passo = max(1, len(paths) // N); amostra = paths[::passo][:N]

def igual(a, b):
    if a in (None, "") and b in (None, ""): return True
    if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
        return abs(a - b) <= 1e-6 * max(1, abs(a), abs(b))
    if isinstance(a, str) and isinstance(b, str): return a.strip() == b.strip()
    return a == b

tot = collections.Counter(); ok = collections.Counter(); ex = collections.defaultdict(list); vazias = collections.Counter()
for k, p in enumerate(amostra):
    real_f = openpyxl.load_workbook(p)
    dados = filler.extract("v22_unidades_isoladas", p); dados.update(calc.ler(real_f)); dados["cub"] = calc.ler_cub(real_f)
    g3 = real_f["XXX - Dados Laudo"]["G3"].value
    if g3 is not None: dados["caracterizacao_imovel"] = g3
    out = f"/tmp/t{k}.xlsx"
    filler.fill(BLANK, dados, out)
    aviso = recalc.preencher_cache(out)
    print(k, os.path.basename(p)[:35], "aviso:", aviso, flush=True)
    mine = openpyxl.load_workbook(out, data_only=True); real = openpyxl.load_workbook(p, data_only=True)
    for nome in [a for a in ABAS if a in real.sheetnames]:
        for row in real[nome].iter_rows():
            for c in row:
                if c.value in (None, ""): continue
                tot[nome] += 1; v = mine[nome][c.coordinate].value
                if v is None: vazias[nome] += 1
                if igual(c.value, v): ok[nome] += 1
                elif len(ex[nome]) < 4: ex[nome].append((c.coordinate, str(c.value)[:25], str(v)[:25]))
for n in ABAS:
    print(f"{n:20s} {ok[n]:6d}/{tot[n]:6d} = {ok[n]/max(1,tot[n]):.4f}  vazias={vazias[n]}  {ex[n]}")
