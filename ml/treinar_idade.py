# -*- coding: utf-8 -*-
"""Treina um modelo para estimar a idade aparente a partir da foto do imóvel.

Dataset: imagens das amostras (pasta Amostras/) + idade aparente (Dados Calc
linha 18) dos laudos reais em 2025/. Features simples de cor/textura + regressão
por RandomForest (baseline CPU, sem modelo pré-treinado).
"""
import glob
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import joblib
import numpy as np
import openpyxl
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import GroupKFold

from idade import extrair_features  # mesma função usada em produção

LAUDOS = r"C:/Users/Kalebe/Desktop/2025/*/Concluidos/*/*-Homo-*.xlsx"


def extrair_idades(wb_path):
    """Idade aparente das amostras: linha 18, colunas C..H -> {amostra: idade}."""
    wb = openpyxl.load_workbook(wb_path, data_only=True)
    calc = wb["XXX - Dados Calc"]
    idades = {}
    for i, col in enumerate("CDEFGH", 1):
        v = calc[f"{col}18"].value
        if isinstance(v, (int, float)):
            idades[i] = v
    wb.close()
    return idades


def montar_dataset():
    """Triplas (caminho_da_imagem, idade_aparente, laudo) a partir das imagens em Amostras/."""
    pares = []
    for wb_path in sorted(glob.glob(LAUDOS)):
        d = os.path.dirname(wb_path)
        amostras_dir = os.path.join(d, "Amostras")
        if not os.path.isdir(amostras_dir):
            continue
        idades = extrair_idades(wb_path)
        if not idades:
            continue
        for f in sorted(os.listdir(amostras_dir)):
            if not f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                continue
            m = re.match(r"(\d+)", f)  # "01.webp" -> amostra 1
            if not m:
                continue
            idx = int(m.group(1))
            if idx in idades:
                pares.append((os.path.join(amostras_dir, f), idades[idx], d))
    return pares


def main():
    pares = montar_dataset()
    print(f"Dataset: {len(pares)} fotos (imagem -> idade aparente)")

    X, y, grupos = [], [], []
    for p, idade, laudo in pares:
        feat = extrair_features(p)
        if feat is not None:
            X.append(feat)
            y.append(idade)
            grupos.append(laudo)
    X = np.array(X)
    y = np.array(y)
    grupos = np.array(grupos)
    print(f"Usáveis: {len(X)} fotos de {len(set(grupos))} laudos "
          f"(idade mín={y.min()}, máx={y.max()}, média={y.mean():.1f})")

    # Validação cruzada POR LAUDO: fotos do mesmo imóvel nunca ficam no treino e no teste.
    mae_cv, mae_base = [], []
    for tr, te in GroupKFold(n_splits=5).split(X, y, grupos):
        m = RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1).fit(X[tr], y[tr])
        mae_cv.append(mean_absolute_error(y[te], m.predict(X[te])))
        mae_base.append(mean_absolute_error(y[te], np.full(len(te), y[tr].mean())))
    mae, base = float(np.mean(mae_cv)), float(np.mean(mae_base))
    print(f"\nErro médio (validação cruzada por laudo, 5 partes): {mae:.1f} anos")
    print(f"Baseline (prever sempre a média):                 {base:.1f} anos")
    print(f"Melhoria vs baseline: {(base - mae) / base * 100:+.1f}%")

    # Modelo final: treinado com todos os dados.
    model = RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1).fit(X, y)
    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/idade_model.joblib")
    print("Modelo salvo em models/idade_model.joblib")


if __name__ == "__main__":
    main()
