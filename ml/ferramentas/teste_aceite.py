# -*- coding: utf-8 -*-
"""Teste de aceite com amostras NOVAS: usa o imóvel avaliado de um laudo real, deixa o ML
buscar 5 amostras no VivaReal (não as do laudo), preenche, recalcula (LibreOffice) e compara
o resultado da regressão (valor de mercado e R$/m²) com o do avaliador.
Também confere que as abas obrigatórias não ficaram vazias nem com erro.

    LAUDOS_DIR=/laudos python ferramentas/teste_aceite.py 6 [tolerancia_pct]
"""
import sys, os, glob, unicodedata, warnings, json
warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
import openpyxl, fill as filler, calc, recalc

# Fonte das amostras novas: anúncios reais de OUTROS laudos (o VivaReal bloqueia acesso automatizado).
POOL = json.load(open(os.getenv("AMOSTRAS_JSON", "/dados/amostras_v22.json"), encoding="utf-8"))

def _n(t): return "".join(c for c in unicodedata.normalize("NFD", str(t or "").lower()) if unicodedata.category(c) != "Mn")

def amostras_novas_de(av, proprias, laudo_nome, n=5):
    """5 amostras mais parecidas (metragem dominante, cidade, bairro) tiradas de outros laudos,
    sem repetir nenhuma das que o próprio laudo já usa."""
    usadas = {(a.get("preco"), a.get("area_equivalente")) for a in proprias}
    cand = []
    for a in POOL:
        if a["laudo"] == laudo_nome or (a.get("preco"), a.get("area_equivalente")) in usadas: continue
        if _n(a.get("cidade")) != _n(av.get("cidade")) or not a.get("area_equivalente") or not a.get("preco"): continue
        d = abs(a["area_equivalente"] - av["area_equivalente"]) / av["area_equivalente"]
        score = 0.7 * max(0, 1 - d) + 0.3 * (_n(a.get("bairro")) == _n(av.get("bairro")))
        cand.append((score, a))
    cand.sort(key=lambda x: -x[0]); vistos = set(); out = []
    for _, a in cand:
        k = (a["preco"], a["area_equivalente"])
        if k in vistos: continue
        vistos.add(k); out.append({k2: v for k2, v in a.items() if k2 not in ("laudo", "amostra")})
        if len(out) == n: break
    return out

BLANK = os.path.join(os.path.dirname(HERE), "data", "templates", "Homogeneização_Unidades Isoladas_2025_V22.xlsx")
OBRIGATORIAS = ["XXX - Dados Calc", "Custo01", "Custo02", "Amostras01-04", "Amostras05-08", "INSPECTOS"]
UF = {"acre":"ac","alagoas":"al","amapa":"ap","amazonas":"am","bahia":"ba","ceara":"ce","distrito federal":"df","espirito santo":"es",
      "goias":"go","maranhao":"ma","mato grosso":"mt","mato grosso do sul":"ms","minas gerais":"mg","para":"pa","paraiba":"pb","parana":"pr",
      "pernambuco":"pe","piaui":"pi","rio de janeiro":"rj","rio grande do norte":"rn","rio grande do sul":"rs","rondonia":"ro",
      "roraima":"rr","santa catarina":"sc","sao paulo":"sp","sergipe":"se","tocantins":"to"}
def sigla(nome):
    n = unicodedata.normalize("NFD", str(nome).lower().strip()); n = "".join(c for c in n if unicodedata.category(c) != "Mn")
    return n if len(n) == 2 else UF.get(n)

paths = sorted(glob.glob(os.getenv("LAUDOS_DIR", "/laudos") + "/*/Concluidos/*/*-Homo-*.xlsx"))
N = int(sys.argv[1]); TOL = float(sys.argv[2]) if len(sys.argv) > 2 else 15.0
passo = max(1, len(paths) // N)
res = []
for k, p in enumerate(paths[::passo][: N * 3]):
    if len(res) >= N: break
    rf = openpyxl.load_workbook(p); rv = openpyxl.load_workbook(p, data_only=True)
    if "Comparativo" not in rv.sheetnames: continue
    lido = calc.ler(rf); av = lido["avaliando"]
    dados = filler.extract("v22_unidades_isoladas", p)
    dados["avaliando"] = av; dados["caracterizacao_imovel"] = rf["XXX - Dados Laudo"]["G3"].value
    dados["cub"] = calc.ler_cub(rf)
    if not av.get("area_equivalente") or not av.get("cidade"): continue
    laudo_nome = os.path.basename(os.path.dirname(p))
    amostras_novas = amostras_novas_de(av, lido["amostras"], laudo_nome); avisos = []
    nome = os.path.basename(p)[:28]
    if len(amostras_novas) < 5:
        print(f"- {nome}: só {len(amostras_novas)} amostra(s) ({avisos}) -> ignorado", flush=True); continue
    dados["amostras"] = amostras_novas
    out = f"/tmp/a{k}.xlsx"; filler.fill(BLANK, dados, out); aviso = recalc.preencher_cache(out)
    mine = openpyxl.load_workbook(out, data_only=True); mf = openpyxl.load_workbook(out)
    vazias = {}
    for aba in OBRIGATORIAS:
        if aba not in mf.sheetnames: continue
        form = [c for r in mf[aba].iter_rows() for c in r if isinstance(c.value, str) and c.value.startswith("=")]
        sem = sum(1 for c in form if mine[aba][c.coordinate].value is None)
        err = sum(1 for c in form if isinstance(mine[aba][c.coordinate].value, str) and mine[aba][c.coordinate].value.startswith("#"))
        vazias[aba] = (len(form), err)
    real_v = rv["Comparativo"]["F39"].value; meu_v = mine["Comparativo"]["F39"].value
    real_u = rv["XXX - Dados Calc"]["C7"].value; meu_u = mine["XXX - Dados Calc"]["C7"].value
    def dif(a, b): return None if not all(isinstance(x, (int, float)) and x for x in (a, b)) else 100 * (b - a) / a
    dv, du = dif(real_v, meu_v), dif(real_u, meu_u)
    ok = dv is not None and abs(dv) <= TOL
    res.append(ok)
    print(f"{'OK ' if ok else 'FALHA'} {nome} valor real={real_v} meu={meu_v if meu_v is None else round(meu_v)} ({dv if dv is None else round(dv,1)}%)  R$/m² real={real_u and round(real_u)} meu={meu_u and round(meu_u) if isinstance(meu_u,(int,float)) else meu_u} ({du if du is None else round(du,1)}%)  aviso={aviso}", flush=True)
    print("     abas (fórmulas, com erro):", vazias, flush=True)
print(f"\n{sum(res)}/{len(res)} dentro de ±{TOL}% no valor de mercado")
