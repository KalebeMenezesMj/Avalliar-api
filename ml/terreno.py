# -*- coding: utf-8 -*-
"""Estima terreno e frente de amostras que não os informam (anúncios do VivaReal só trazem a
área construída). O Custo01 usa esses dois campos para o valor unitário de terreno: sem eles,
ou com valor-padrão 1, o resultado explode (R$/m² na casa das centenas de milhares).

Proporções medianas em 515 amostras de laudos reais de 2025 (Dados Calc):
    area_terreno  ~ 1,75 x area_equivalente   (p25 1,47 · p75 2,02)
    frente        ~ 0,45 x raiz(area_terreno)  (p25 0,44 · p75 0,53)
São estimativas: o aviso pede revisão do avaliador.
"""
import math

RAZAO_TERRENO = 1.75
K_FRENTE = 0.45


def valido(a):
    """A amostra tem terreno e frente reais (não ausentes nem o valor-padrão 1)?"""
    try:
        return float(a.get("area_terreno") or 0) > 20 and float(a.get("frente_efetiva") or 0) > 1
    except (TypeError, ValueError):
        return False


def completar(amostras, trocar_um=False):
    """Preenche area_terreno/frente_efetiva AUSENTES. Com `trocar_um`, também troca o valor-padrão 1
    (usado ao reaproveitar amostras do acervo, onde 1 significa 'sem lote'; numa amostra enviada
    pelo avaliador o 1 é intencional e não é tocado). Modifica no lugar.
    Retorna a lista de (indice, campo, valor) estimados."""
    minimo = 1 if trocar_um else 0
    estimados = []
    for i, a in enumerate(amostras):
        area = a.get("area_equivalente")
        try:
            area = float(area)
        except (TypeError, ValueError):
            continue
        if area <= 0:
            continue
        try:
            terr = float(a.get("area_terreno") or 0)
        except (TypeError, ValueError):
            terr = 0
        if terr <= minimo:
            terr = round(RAZAO_TERRENO * area)
            a["area_terreno"] = terr
            estimados.append((i + 1, "area_terreno", terr))
        try:
            fr = float(a.get("frente_efetiva") or 0)
        except (TypeError, ValueError):
            fr = 0
        if fr <= minimo:
            fr = round(K_FRENTE * math.sqrt(terr))
            a["frente_efetiva"] = fr
            estimados.append((i + 1, "frente_efetiva", fr))
    return estimados
