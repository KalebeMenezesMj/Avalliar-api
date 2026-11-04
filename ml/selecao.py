# -*- coding: utf-8 -*-
"""Seleção de amostras de mercado similares ao imóvel avaliando.

Requisito (Sara): selecionar as amostras "o mais similar possível ao avaliando",
principalmente por METRAGEM (m²), mostrando o valor por metro quadrado (R$/m²).

A similaridade é um score ponderado 0..1, com a metragem como fator dominante.
"""
PESOS = {
    "area": 0.50,      # metragem (dominante)
    "tipo": 0.15,      # casa vs apartamento
    "quartos": 0.15,   # nº de dormitórios
    "vagas": 0.10,     # nº de vagas
    "bairro": 0.10,    # mesma região
}


def valor_m2(amostra):
    """R$/m² (None se faltar preço ou área)."""
    preco = amostra.get("preco")
    area = amostra.get("area")
    if not preco or not area:
        return None
    return round(preco / area, 2)


def similaridade(avaliando, amostra, pesos=None):
    """Score 0..1 — quanto mais próximo de 1, mais similar ao avaliando."""
    pesos = pesos or PESOS
    score = 0.0

    # metragem: penalidade linear pela diferença relativa de área
    area_av = avaliando.get("area")
    area_am = amostra.get("area")
    if area_av and area_am:
        diff = abs(area_am - area_av) / area_av
        score += pesos["area"] * max(0.0, 1.0 - diff)

    # tipo
    if avaliando.get("tipo") and amostra.get("tipo"):
        score += pesos["tipo"] * (1.0 if avaliando["tipo"] == amostra["tipo"] else 0.0)

    # quartos
    if avaliando.get("quartos") is not None and amostra.get("quartos") is not None:
        score += pesos["quartos"] * (1.0 if avaliando["quartos"] == amostra["quartos"] else 0.0)

    # vagas
    if avaliando.get("vagas") is not None and amostra.get("vagas") is not None:
        score += pesos["vagas"] * (1.0 if avaliando["vagas"] == amostra["vagas"] else 0.0)

    # bairro
    if avaliando.get("bairro") and amostra.get("bairro"):
        score += pesos["bairro"] * (1.0 if avaliando["bairro"].lower() == amostra["bairro"].lower() else 0.0)

    return round(score, 4)


def selecionar(avaliando, amostras, top_n=10, faixa_area=0.30):
    """Filtra pela metragem (±faixa_area em torno do avaliando) e ordena por
    similaridade. Só entra amostra com preço e área (para dar o valor/m²)."""
    area_av = avaliando.get("area")

    dentro = []
    for a in amostras:
        if not a.get("area") or not a.get("preco"):
            continue
        if area_av and abs(a["area"] - area_av) / area_av > faixa_area:
            continue
        a = dict(a)
        a["_valor_m2"] = valor_m2(a)
        a["_score"] = similaridade(avaliando, a)
        dentro.append(a)

    dentro.sort(key=lambda a: (-a["_score"], a["area"]))
    return dentro[:top_n]


def formatar(amostras):
    """Tabela legível das amostras selecionadas."""
    linhas = []
    linhas.append(f"{'#':<3}{'Área m²':>8}{'Preço R$':>12}{'R$/m²':>10}{'Q':>3}{'V':>3}  {'Tipo':<12}{'Bairro'}")
    for i, a in enumerate(amostras, 1):
        linhas.append(
            f"{i:<3}{a['area']:>8}{a['preco']:>12,}{str(a['_valor_m2']):>10}{a.get('quartos','-'):>3}"
            f"{a.get('vagas','-'):>3}  {a.get('tipo',''):<12}{a.get('bairro','')}")
    return "\n".join(linhas)
