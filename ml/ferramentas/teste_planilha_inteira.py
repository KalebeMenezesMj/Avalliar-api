# -*- coding: utf-8 -*-
"""Teste da planilha INTEIRA (Windows + Excel).

Preenche o template V22 em branco com os dados de laudos reais, o Excel recalcula tudo
(ferramentas/recalc.ps1) e cada célula de todas as abas (menos Fotos/Croqui) é comparada
com o laudo do avaliador.

    LAUDOS_DIR=D:/laudos python ferramentas/teste_planilha_inteira.py 8
"""
import sys, os, glob, json, subprocess, datetime, collections, warnings, tempfile
warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import openpyxl, fill as filler, calc

BLANK = os.path.join(os.path.dirname(HERE), "data", "templates", "Homogeneização_Unidades Isoladas_2025_V22.xlsx")
V22 = "v22_unidades_isoladas"
IGNORAR = {"Fotos", "Croqui  Amostras"}
SAIDA = os.getenv("SAIDA_TESTE", os.path.join(HERE, "saida")); os.makedirs(SAIDA, exist_ok=True)
paths = sorted(glob.glob(os.getenv("LAUDOS_DIR", "D:/Avalliar/laudos_2025") + "/*/Concluidos/*/*-Homo-*.xlsx"))
N = int(sys.argv[1]); passo = max(1, len(paths)//N); amostra = paths[::passo][:N]

def igual(a, b):
    if a in (None, "") and b in (None, ""): return True
    if isinstance(a, bool) or isinstance(b, bool): return a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(a - b) <= 1e-6 * max(1, abs(a), abs(b))
    if isinstance(a, str) and isinstance(b, str): return a.strip() == b.strip()
    if isinstance(a, datetime.datetime) and isinstance(b, datetime.datetime): return a == b
    return a == b

tot = collections.Counter(); ok = collections.Counter(); amostras_dif = collections.defaultdict(list)
for k, p in enumerate(amostra):
    nome = f"{k:02d}"
    real_f = openpyxl.load_workbook(p)
    dados = filler.extract(V22, p)
    dados.update(calc.ler(real_f)); dados["cub"] = calc.ler_cub(real_f)
    g3 = real_f["XXX - Dados Laudo"]["G3"].value
    if g3 is not None: dados["caracterizacao_imovel"] = g3
    out = f"{SAIDA}/{nome}_preenchida.xlsx"
    tid, esc = filler.fill(BLANK, dados, out)
    calcd = f"{SAIDA}/{nome}_recalculada.xlsx"
    if os.path.exists(calcd): os.remove(calcd)
    subprocess.run(["powershell", "-NoProfile", "-File", os.path.join(HERE, "recalc.ps1"), out.replace("/", "\\"), calcd.replace("/", "\\")],
                   check=True, capture_output=True, timeout=300)
    mine = openpyxl.load_workbook(calcd, data_only=True)
    real = openpyxl.load_workbook(p, data_only=True)
    erros = 0
    for ws in real:
        if ws.title in IGNORAR or ws.title not in mine.sheetnames: continue
        m = mine[ws.title]
        for row in ws.iter_rows():
            for c in row:
                if c.value in (None, ""): continue
                tot[ws.title] += 1
                v = m[c.coordinate].value
                if igual(c.value, v): ok[ws.title] += 1
                elif len(amostras_dif[ws.title]) < 6: amostras_dif[ws.title].append((nome, c.coordinate, str(c.value)[:30], str(v)[:30]))
        for row in m.iter_rows():
            for c in row:
                if isinstance(c.value, str) and c.value.startswith("#"): erros += 1
    print(f"{nome} {os.path.basename(p)[:40]} campos={len(esc)} erros_excel={erros}", flush=True)

print("\nABA  (células com valor no laudo real que batem após o Excel recalcular)")
T = O = 0
for a in tot:
    T += tot[a]; O += ok[a]
    print(f"  {a:28s} {ok[a]:6d}/{tot[a]:6d} = {ok[a]/tot[a]:.4f}")
print(f"TOTAL {O}/{T} = {O/T:.4f}")
for a, l in amostras_dif.items():
    if l: print(a, l[:4])
