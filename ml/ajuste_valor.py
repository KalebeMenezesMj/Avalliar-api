# -*- coding: utf-8 -*-
"""Troca de amostras para aproximar o valor de mercado de um valor de referência.

O avaliador, na prática, troca anúncios até a regressão ficar coerente. Aqui isso é feito
com uma busca guiada: o valor da planilha cresce com o R$/m² médio das amostras, então um
modelo simples (valor proporcional ao R$/m² médio) propõe a próxima combinação de 5 dentre
as melhores candidatas, e a planilha de verdade (`avaliar`) confirma. Repete até chegar na
tolerância ou esgotar `max_aval` cálculos; devolve a melhor combinação já avaliada.
"""
from itertools import combinations

import selecao_calc


def _ppm(a):
    try:
        return float(a["preco"]) / float(a["area_equivalente"])
    except (KeyError, TypeError, ValueError, ZeroDivisionError):
        return None


def _media_ppm(conj):
    v = [_ppm(a) for a in conj]
    return sum(v) / len(v)


def ajustar(avaliando, candidatas, alvo, avaliar, n=5, tol=0.03, max_aval=5, pool=12):
    """`avaliar(amostras) -> valor de mercado (float|None)`. Devolve (amostras, valor, avaliacoes)."""
    top = [a for a in selecao_calc.selecionar(avaliando, candidatas, pool) if _ppm(a)]
    if len(top) < n:
        return top[:n], None, 0
    idx = list(range(len(top)))
    sim = [selecao_calc.similaridade(avaliando, a) for a in top]
    atual = tuple(idx[:n])
    historico = {}  # combinação -> valor
    melhor = None
    for _ in range(max_aval):
        v = avaliar([top[i] for i in atual])
        historico[atual] = v
        if v:
            if melhor is None or abs(v - alvo) < abs(historico[melhor] - alvo):
                melhor = atual
            if abs(v - alvo) / alvo <= tol:
                break
            # valor ~ R$/m² médio: ppm desejado para o valor de referência
            desejado = _media_ppm([top[i] for i in atual]) * alvo / v
        else:
            break
        prox = None
        for c in sorted(combinations(idx, n), key=lambda c: (abs(_media_ppm([top[i] for i in c]) - desejado),
                                                              -sum(sim[i] for i in c))):
            if c not in historico:
                prox = c
                break
        if prox is None:
            break
        atual = prox
    melhor = melhor or tuple(idx[:n])
    return [top[i] for i in melhor], historico.get(melhor), len(historico)
