# -*- coding: utf-8 -*-
"""Aba 'XXX - Dados Calc' (V22) e URLs das abas Amostras: mapa, escrita, leitura.

Layout confirmado em 141 laudos reais de 2025: coluna C = imóvel avaliado,
colunas D..H = amostras 1..5 (VivaReal). Cada linha é um atributo. As abas
Custo01, Custo02, Comparativo, INSPECTOS e BASE INSPECTOS não têm nenhuma célula
digitada em nenhum dos laudos (são fórmulas sobre esta aba), então não se escreve nelas.

Formato de entrada dentro de `dados`:
    "avaliando": {campo: valor, ...}                       -> coluna C
    "amostras":  [{campo: valor, "url": "..."}, ... (até 5)] -> colunas D..H (+ URL nas abas Amostras)
"""
import re

CALC_SHEET = "XXX - Dados Calc"

COLUNA_AVALIANDO = "C"
COLUNAS_AMOSTRAS = ["D", "E", "F", "G", "H"]

# linha -> campo (rótulos da coluna B da planilha)
LINHAS = {
    14: "preco",
    15: "area_terreno",
    16: "frente_efetiva",
    17: "area_equivalente",
    18: "idade_aparente",
    19: "estado_conservacao",
    30: "data_referencia",
    32: "padrao_construtivo",
    33: "formato_terreno",
    34: "zona_ibape",
    35: "tipo_imovel",
    36: "zoneamento",
    37: "tipo_endereco",
    38: "logradouro",
    39: "numero",
    40: "complemento",
    42: "bairro",
    43: "contato",
    44: "telefone",
    45: "cep",
    46: "latitude",
    47: "longitude",
    48: "cidade",
    49: "estado",
    50: "situacao",
    51: "topografia",
    52: "pavimentos",
    53: "dormitorios",
    54: "suites",
    55: "salas",
    56: "cozinhas",
    57: "banheiros",
    58: "lavabos",
    59: "dep_empregada",
    60: "wc_empregada",
    61: "area_servico",
    62: "vagas",
    90: "numero_foto",
    95: "coluna_ibape",
}
CAMPO_LINHA = {v: k for k, v in LINHAS.items()}

# O preço só existe nas amostras (C14 do avaliado é '**').
SO_AMOSTRA = {"preco", "data_referencia"}

# amostra i (0-based) -> (aba, célula) da URL do anúncio
URLS = {
    0: ("Amostras01-04", "C15"),
    1: ("Amostras01-04", "C29"),
    2: ("Amostras01-04", "C43"),
    3: ("Amostras01-04", "C57"),
    4: ("Amostras05-08", "C15"),
}

# Valores usados quando o VivaReal não informa (os mesmos que o avaliador usa
# na imensa maioria dos laudos reais: moda das colunas 55/56/61 e 19).
PADRAO_AMOSTRA = {
    "tipo_endereco": "Rua",
    "salas": 1,
    "cozinhas": 1,
    "area_servico": 1,
}


def _tem(v):
    return v is not None and v != ""


# Campos de topo de `dados` que não são rótulo+valor adjacentes (por isso ficam fora do CELL_MAP,
# que também alimenta a extração por rótulo).
CAMPOS_LAUDO = {"caracterizacao_imovel": ("XXX - Dados Laudo", "G3")}


def escrever(wb, dados):
    """Escreve `avaliando` e `amostras` de `dados` no workbook. Retorna a lista de
    (campo, aba, célula, valor) escritos."""
    escritos = []
    for campo, (aba, celula) in CAMPOS_LAUDO.items():
        if _tem(dados.get(campo)) and aba in wb.sheetnames:
            wb[aba][celula] = dados[campo]
            escritos.append((campo, aba, celula, dados[campo]))
    if CALC_SHEET not in wb.sheetnames:
        return escritos
    ws = wb[CALC_SHEET]

    def grava(coluna, campos, so_amostra=True):
        for campo, valor in (campos or {}).items():
            linha = CAMPO_LINHA.get(campo)
            if linha is None or not _tem(valor):
                continue
            if campo in SO_AMOSTRA and coluna == COLUNA_AVALIANDO:
                continue
            celula = f"{coluna}{linha}"
            ws[celula] = valor
            escritos.append((campo, CALC_SHEET, celula, valor))

    grava(COLUNA_AVALIANDO, dados.get("avaliando"))
    for i, amostra in enumerate((dados.get("amostras") or [])[: len(COLUNAS_AMOSTRAS)]):
        grava(COLUNAS_AMOSTRAS[i], amostra)
        url = amostra.get("url")
        if _tem(url) and i in URLS and URLS[i][0] in wb.sheetnames:
            aba, celula = URLS[i]
            wb[aba][celula] = url
            escritos.append((f"amostra_{i + 1}_url", aba, celula, url))
    return escritos


def ler(wb):
    """Lê de um workbook (fórmulas preservadas) o que `escrever` grava.
    Retorna {"avaliando": {...}, "amostras": [...]} só com células de entrada (sem '=')."""
    if CALC_SHEET not in wb.sheetnames:
        return {"avaliando": {}, "amostras": []}
    ws = wb[CALC_SHEET]

    def coluna(letra):
        d = {}
        for linha, campo in LINHAS.items():
            v = ws[f"{letra}{linha}"].value
            if _tem(v) and not (isinstance(v, str) and (v.startswith("=") or v.strip() == "**")):
                d[campo] = v
        return d

    amostras = []
    for i, letra in enumerate(COLUNAS_AMOSTRAS):
        a = coluna(letra)
        if i in URLS and URLS[i][0] in wb.sheetnames:
            aba, celula = URLS[i]
            url = wb[aba][celula].value
            if isinstance(url, str) and url.startswith("http"):
                a["url"] = url
        amostras.append(a)
    while amostras and not amostras[-1]:
        amostras.pop()
    return {"avaliando": coluna(COLUNA_AVALIANDO), "amostras": amostras}


# ----------------------------------------------------------------- VivaReal
def _dms(dec, lat):
    if dec is None:
        return None
    hemi = ("N" if dec >= 0 else "S") if lat else ("E" if dec >= 0 else "W")
    dec = abs(float(dec))
    d = int(dec)
    m_float = (dec - d) * 60
    m = int(m_float)
    s = (m_float - m) * 60
    return f'{d}°{m:02d}\'{s:04.1f}"{hemi}'


def _num(texto):
    return float(texto.replace(",", "."))


def parse_descricao(desc):
    """Terreno e frente a partir do texto livre do anúncio (só quando mencionados)."""
    if not desc or not isinstance(desc, str) or desc.startswith("$"):
        return {}
    r = {}
    m = (re.search(r"terreno\s*(?:de|com|medindo|:)?\s*(\d+(?:[.,]\d+)?)\s*m", desc, re.I)
         or re.search(r"\blote\s*(?:de|com)?\s*(\d+(?:[.,]\d+)?)\s*m", desc, re.I))
    if m:
        r["area_terreno"] = _num(m.group(1))
    m = (re.search(r"frente\s*(?:de|com|:)?\s*(\d+(?:[.,]\d+)?)\s*m", desc, re.I)
         or re.search(r"testada\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)", desc, re.I))
    if m:
        r["frente_efetiva"] = _num(m.group(1))
    return r


def amostra_do_vivareal(a, idade=None, cep=None):
    """Converte um anúncio normalizado de vivareal.buscar() em campos de uma coluna do Dados Calc.
    `idade` e `cep` são opcionais (modelo de idade / ViaCEP): ficam vazios se não vierem."""
    titulo = (a.get("titulo") or "").lower()
    out = dict(PADRAO_AMOSTRA)
    out.update({
        "preco": a.get("preco"),
        "area_equivalente": a.get("area"),
        "logradouro": a.get("endereco"),
        "numero": a.get("numero"),
        "bairro": a.get("bairro"),
        "contato": a.get("contato"),
        "telefone": a.get("telefone"),
        "cep": cep,
        "latitude": _dms(a.get("latitude"), True),
        "longitude": _dms(a.get("longitude"), False),
        "cidade": a.get("cidade"),
        "estado": a.get("uf"),
        "pavimentos": 2 if "sobrado" in titulo else 1,
        "dormitorios": a.get("quartos"),
        "suites": a.get("suites"),
        "banheiros": a.get("banheiros"),
        "vagas": a.get("vagas"),
        "idade_aparente": idade,
        "url": a.get("url"),
    })
    out.update(parse_descricao(a.get("descricao")))
    return {k: v for k, v in out.items() if _tem(v)}


# ------------------------------------------------------------------- CUB
LAUDO_SHEET = "XXX - Dados Laudo"
CUB_ROTULO = "D27"
CUB_LINHAS = range(42, 69)  # F = "Cidade/UF", G = R$/m², H = competência, E = fonte (às vezes 'IBGE')


def _uf_da_linha(ws, linha):
    nome = ws[f"F{linha}"].value
    if isinstance(nome, str) and "/" in nome:
        return nome.rsplit("/", 1)[1].strip().upper()
    return None


def escrever_cub(wb, cub):
    """Tabela CUB estadual (R8N). `cub`: {"rotulo": str, "referencia": data, "valores": {UF: R$/m²},
    "fontes": {UF: 'IBGE'}}. UFs não informadas mantêm o valor do template."""
    escritos = []
    if not cub or LAUDO_SHEET not in wb.sheetnames:
        return escritos
    ws = wb[LAUDO_SHEET]
    if _tem(cub.get("rotulo")):
        ws[CUB_ROTULO] = cub["rotulo"]
        escritos.append(("cub_rotulo", LAUDO_SHEET, CUB_ROTULO, cub["rotulo"]))
    valores = {k.upper(): v for k, v in (cub.get("valores") or {}).items()}
    fontes = {k.upper(): v for k, v in (cub.get("fontes") or {}).items()}
    competencias = {k.upper(): v for k, v in (cub.get("competencias") or {}).items()}
    for linha in CUB_LINHAS:
        uf = _uf_da_linha(ws, linha)
        if uf in valores and _tem(valores[uf]):
            ws[f"G{linha}"] = valores[uf]
            escritos.append((f"cub_{uf}", LAUDO_SHEET, f"G{linha}", valores[uf]))
            comp = competencias.get(uf) or cub.get("referencia")
            if _tem(comp):
                ws[f"H{linha}"] = comp
        if uf in fontes:
            ws[f"E{linha}"] = fontes[uf]
    return escritos


def ler_cub(wb):
    if LAUDO_SHEET not in wb.sheetnames:
        return {}
    ws = wb[LAUDO_SHEET]
    valores, fontes, comps, ref = {}, {}, {}, None
    for linha in CUB_LINHAS:
        uf = _uf_da_linha(ws, linha)
        v = ws[f"G{linha}"].value
        if uf and isinstance(v, (int, float)):
            valores[uf] = v
            comps[uf] = ws[f"H{linha}"].value
            ref = ref or comps[uf]
        f = ws[f"E{linha}"].value
        if uf and _tem(f):
            fontes[uf] = f
    out = {"rotulo": ws[CUB_ROTULO].value, "referencia": ref, "valores": valores,
           "competencias": comps}
    if fontes:
        out["fontes"] = fontes
    return out
