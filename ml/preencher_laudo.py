# -*- coding: utf-8 -*-
"""Preenche o laudo V22 com dados reais: cabeçalho + localização + amostras do VivaReal.

Fluxo: recebe os dados do avaliando, decide o FAM, busca as amostras no VivaReal,
seleciona as mais similares e grava na planilha. Ao final, lista o que não foi
preenchido (campos que o VivaReal não entrega).
"""
import datetime
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import openpyxl

import selecao
import vivareal

BLANK = r"C:/Users/Kalebe/Desktop/Homogeneização_Unidades Isoladas_2025_V22.xlsx"
OUT = os.path.join("data", "output", "laudo_preenchido.xlsx")

AVALIANDO = {
    "numero_proposta": "17992820",
    "cliente": "Itaú",
    "engenheiro": "Jonathan Martins",
    "uf": "São Paulo",
    "cidade": "Peruíbe",
    "data": datetime.datetime(2025, 11, 3),
    "area_terreno": 275,
    "area_util": 149.37,
    "area_privativa": 110.08,
    "idade_aparente": "2000",
    "endereco": "Rua Oto Domingues",
    "numero": 43,
    "bairro": "Balneário Josedy",
    "cep": "11.775-000",
}

# Colunas C..H = 6 amostras
COLUNAS = ["C", "D", "E", "F", "G", "H"]

# Mapeamento linha -> campo do amostra (VivaReal). Linhas ausentes = VivaReal não tem.
MAPA_AMOSTRA = {
    14: ("preco", None),
    15: ("terreno", None),       # área do terreno (parsed da descrição)
    16: ("frente", None),        # frente efetiva (parsed da descrição)
    17: ("area", None),          # área útil ≈ área equivalente
    37: (None, "Rua"),           # tipo endereço (fixo)
    38: ("endereco", None),
    39: ("numero", None),
    42: ("bairro", None),
    43: ("contato", None),
    44: ("telefone", None),
    46: ("latitude_dms", None),
    47: ("longitude_dms", None),
    48: ("cidade", None),
    49: ("uf", None),
    52: ("pavimentos", None),    # casa=1, sobrado=2
    53: ("quartos", None),
    54: ("suites", None),
    55: (None, 1),               # sala (default)
    56: (None, 1),               # cozinha (default)
    57: ("banheiros", None),
    61: (None, 1),               # área de serviço (default)
    62: ("vagas", None),
}


def parse_descricao(desc):
    """Tenta extrair terreno e frente da descrição livre do anúncio."""
    if not desc or not isinstance(desc, str) or desc.startswith("$"):
        return {}
    r = {}
    m = re.search(r'terreno\s*(?:de|com|medindo|:)?\s*(\d+(?:[.,]\d+)?)\s*m', desc, re.I)
    if not m:
        m = re.search(r'\blote\s*(?:de|com)?\s*(\d+(?:[.,]\d+)?)\s*m', desc, re.I)
    if m:
        r["terreno"] = float(m.group(1).replace(",", "."))

    m = re.search(r'frente\s*(?:de|com|:)?\s*(\d+(?:[.,]\d+)?)\s*m', desc, re.I)
    if not m:
        m = re.search(r'testada\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)', desc, re.I)
    if m:
        r["frente"] = float(m.group(1).replace(",", "."))
    return r


def derivar(amostra):
    """Deriva campos que não vêm prontos do VivaReal."""
    a = dict(amostra)
    p = parse_descricao(a.get("descricao"))
    a.setdefault("terreno", p.get("terreno"))
    a.setdefault("frente", p.get("frente"))
    titulo = (a.get("titulo") or "").lower()
    a["pavimentos"] = 2 if "sobrado" in titulo else 1
    return a


def decimal_dms(dec, is_lat):
    if dec is None:
        return None
    hemi = ("N" if dec >= 0 else "S") if is_lat else ("E" if dec >= 0 else "W")
    dec = abs(dec)
    d = int(dec)
    m_float = (dec - d) * 60
    m = int(m_float)
    s = (m_float - m) * 60
    return f'{d}°{m:02d}\'{s:04.1f}"{hemi}'


def decidir_fam(amostras):
    """FAM = Considerar se houver 3+ amostras com benfeitoria (regra da planilha)."""
    com_benfeitoria = sum(1 for a in amostras if a.get("tipo") in ("casa", "apartamento"))
    return "Considerar" if com_benfeitoria >= 3 else "Desconsiderar"


def preencher(wb, amostras):
    fam = decidir_fam(amostras)

    # 1. cabeçalho
    ws = wb["XXX - Dados Laudo"]
    ws["P8"] = AVALIANDO["numero_proposta"]
    ws["P15"] = AVALIANDO["engenheiro"]
    ws["P18"] = fam

    # 2. localização
    calc = wb["XXX - Dados Calc"]
    calc["G1"] = AVALIANDO["uf"]
    calc["G2"] = AVALIANDO["cidade"]
    calc["G3"] = AVALIANDO["data"]

    # 3. amostras
    for i, a in enumerate(amostras[:6]):
        col = COLUNAS[i]
        a = derivar(a)
        a["latitude_dms"] = decimal_dms(a.get("latitude"), True)
        a["longitude_dms"] = decimal_dms(a.get("longitude"), False)
        for linha, (campo, fixo) in MAPA_AMOSTRA.items():
            valor = fixo if campo is None else a.get(campo)
            if valor is not None:
                calc[f"{col}{linha}"] = valor

    # 4. URLs das amostras (abas Amostras01-04 / Amostras05-08)
    a104 = wb["Amostras01-04"]
    for i, coord in enumerate(["C15", "C29", "C43", "C57"]):
        if i < len(amostras):
            a104[coord] = amostras[i].get("url")
    if len(amostras) >= 5:
        wb["Amostras05-08"]["C15"] = amostras[4].get("url")

    return fam


def main():
    print("Buscando casas em Peruíbe no VivaReal...")
    todas = vivareal.buscar("sp", "Peruíbe", "casa", area_min=100, area_max=400)

    avaliando_sel = {"area": AVALIANDO["area_util"], "quartos": 3, "vagas": 2,
                     "tipo": "casa", "bairro": AVALIANDO["bairro"]}
    amostras = selecao.selecionar(avaliando_sel, todas, top_n=6, faixa_area=0.60)

    wb = openpyxl.load_workbook(BLANK)
    fam = preencher(wb, amostras)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    wb.save(OUT)

    print(f"\nFAM decidido pelo modelo: {fam}")
    print(f"Amostras selecionadas: {len(amostras)}")
    print(f"Arquivo salvo: {OUT}\n")

    print("=== AMOSTRAS GRAVADAS (preço / área / quartos / vagas / bairro) ===")
    for i, a in enumerate(amostras, 1):
        print(f"  {i}. R$ {a['preco']:,} | {a['area']} m² | {a['quartos']}q "
              f"{a['banheiros']}ban {a.get('vagas') or '-'}v | {a['bairro']} | R$ {a['_valor_m2']}/m²")

    print("\n=== CAMPOS AINDA NÃO PREENCHIDOS ===")
    nao = ["idade aparente", "estado de conservação", "CEP", "nº da foto"]
    for c in nao:
        print(f"  - {c}")


if __name__ == "__main__":
    main()
