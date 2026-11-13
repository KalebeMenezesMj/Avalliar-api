# -*- coding: utf-8 -*-
"""Extrai o Dados Calc (colunas D..H) de todos os laudos V22 reais para treinar campos.py.

    LAUDOS_DIR=... AMOSTRAS_JSON=... python coletar_amostras.py
"""
import sys, os, glob, json, warnings, datetime
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import openpyxl, calc
BASE = os.getenv("LAUDOS_DIR", "D:/Avalliar/laudos_2025")
SAIDA = os.getenv("AMOSTRAS_JSON", "data/amostras_v22.json")
paths = sorted(glob.glob(BASE + "/*/Concluidos/*/*-Homo-*.xlsx"))
print(len(paths), flush=True)
linhas = []
for i, p in enumerate(paths):
    try:
        wb = openpyxl.load_workbook(p)
    except Exception as e:
        print("falhou", p, e, flush=True); continue
    ws = wb[calc.CALC_SHEET]
    laudo = os.path.basename(os.path.dirname(p))
    for j, col in enumerate(calc.COLUNAS_AMOSTRAS):
        reg = {"laudo": laudo, "amostra": j + 1}
        for linha, campo in calc.LINHAS.items():
            v = ws[f"{col}{linha}"].value
            if isinstance(v, (datetime.datetime, datetime.date)): v = v.isoformat()
            reg[campo] = v
        reg["coluna_ibape"] = ws[f"{col}95"].value
        linhas.append(reg)
    if i % 10 == 0: print(i, flush=True)
os.makedirs(os.path.dirname(SAIDA) or ".", exist_ok=True)
json.dump(linhas, open(SAIDA, "w", encoding="utf-8"), ensure_ascii=False)
print("ok", len(linhas))
