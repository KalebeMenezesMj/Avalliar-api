# -*- coding: utf-8 -*-
"""Seleção das 5 amostras para o 'Dados Calc' quando as candidatas já têm os campos da planilha
(acervo de laudos anteriores, ou anúncios completados). Usa vários critérios, não só a metragem:
área construída, idade aparente, padrão construtivo e bairro (pesos validados contra os laudos
reais: ver ferramentas/teste_aceite.py)."""
import unicodedata

import terreno

PESOS = {"area": 0.25, "idade": 0.15, "padrao": 0.15, "bairro": 0.20, "terreno": 0.25, "data": 0.0}


def _n(t):
    return "".join(c for c in unicodedata.normalize("NFD", str(t or "").lower()) if c.isascii() and c.isalnum())


def _num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def _prox(a, b, escala):
    """1 = igual; 0 = distante (>= escala). Neutro (0,5) quando falta informação."""
    a, b = _num(a), _num(b)
    if a is None or b is None:
        return 0.5
    return max(0.0, 1.0 - abs(a - b) / escala)


def similaridade(av, a, pesos=None):
    p = pesos or PESOS
    xa, ya = _num(av.get("area_equivalente")), _num(a.get("area_equivalente"))
    s_area = max(0.0, 1.0 - abs(ya - xa) / xa) if xa and ya else 0.0
    s = {
        "area": s_area,
        "idade": _prox(av.get("idade_aparente"), a.get("idade_aparente"), 30),
        "padrao": _prox(av.get("padrao_construtivo"), a.get("padrao_construtivo"), 4),
        "bairro": 1.0 if _n(av.get("bairro")) and _n(av.get("bairro")) == _n(a.get("bairro")) else 0.0,
        "terreno": _prox(av.get("area_terreno"), a.get("area_terreno"), _num(av.get("area_terreno")) or 1),
        "data": 0.5,
    }
    return sum(p[k] * s[k] for k in p)


def selecionar(avaliando, candidatas, n=5, pesos=None):
    """As `n` candidatas mais parecidas com o avaliando, sem repetir (preço, área)."""
    # amostra sem terreno/frente reais (placeholder 1) estraga o Custo01: só entra se faltar opção
    reais = [a for a in candidatas if terreno.valido(a)]
    if len(reais) >= n:
        candidatas = reais
    ordem = sorted(candidatas, key=lambda a: -similaridade(avaliando, a, pesos))
    vistos, out = set(), []
    for a in ordem:
        k = (a.get("preco"), a.get("area_equivalente"))
        if not a.get("preco") or k in vistos:
            continue
        vistos.add(k)
        out.append(a)
        if len(out) == n:
            break
    return out
