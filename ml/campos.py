# -*- coding: utf-8 -*-
"""Estima campos que o avaliador decide por amostra (Dados Calc) quando o VivaReal não os traz.

estado_conservacao (linha 19) e coluna_ibape (linha 95), aprendidos de 695 amostras
de 137 laudos reais. Acurácia em validação cruzada por laudo: ~94% e ~65%
(baseline = moda: 64% e 53%). Os valores estimados devem ser revisados pelo avaliador.
"""
import os

import joblib
import pandas as pd

MODELO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "campos_amostra.joblib")
ALVOS = ("estado_conservacao", "coluna_ibape")
NUM = ["area_equivalente", "area_terreno", "preco", "idade_aparente",
       "dormitorios", "suites", "banheiros", "vagas", "pavimentos", "amostra"]
_cache = {}


def features(linhas):
    """DataFrame de features a partir de dicts com os nomes de campo do calc.py."""
    d = pd.DataFrame(linhas)
    for c in NUM:
        if c not in d:
            d[c] = None
    X = d[NUM].apply(pd.to_numeric, errors="coerce")
    X["preco_m2"] = X.preco / X.area_equivalente
    X["terreno_sobre_area"] = X.area_terreno / X.area_equivalente
    return X.replace([float("inf"), float("-inf")], float("nan")).fillna(-1)


def disponivel():
    return os.path.exists(MODELO)


def completar(amostras):
    """Preenche estado_conservacao e coluna_ibape que faltam em `amostras` (lista de dicts,
    modifica no lugar). Retorna a lista de (indice, campo, valor) estimados."""
    if not amostras or not disponivel():
        return []
    if "m" not in _cache:
        _cache["m"] = joblib.load(MODELO)
    modelos = _cache["m"]
    linhas = [dict(a, amostra=i + 1) for i, a in enumerate(amostras)]
    X = features(linhas)
    estimados = []
    for alvo in ALVOS:
        if alvo not in modelos:
            continue
        previsto = modelos[alvo].predict(X)
        for i, a in enumerate(amostras):
            if a.get(alvo) in (None, ""):
                a[alvo] = int(previsto[i])
                estimados.append((i + 1, alvo, a[alvo]))
    return estimados
