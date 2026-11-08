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
from PIL import Image
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

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
    """Pares (caminho_da_imagem, idade_aparente) a partir das imagens em Amostras/."""
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
                pares.append((os.path.join(amostras_dir, f), idades[idx]))
    return pares


def extrair_features(path):
    try:
        img = Image.open(path).convert("RGB").resize((64, 64))
    except Exception:
        return None
    a = np.asarray(img).astype(np.float32)

    medias = a.mean(axis=(0, 1))
    desvios = a.std(axis=(0, 1))
    hists = []
    for c in range(3):
        hist, _ = np.histogram(a[:, :, c], bins=8, range=(0, 255))
        hists.append(hist / (64 * 64))
    gx = np.abs(np.diff(a, axis=1)).mean()  # densidade de borda
    gy = np.abs(np.diff(a, axis=0)).mean()

    return np.concatenate([medias, desvios, *hists, [gx, gy]])


def main():
    pares = montar_dataset()
    print(f"Dataset: {len(pares)} pares (imagem -> idade aparente)")

    X, y = [], []
    for p, idade in pares:
        feat = extrair_features(p)
        if feat is not None:
            X.append(feat)
            y.append(idade)
    X = np.array(X)
    y = np.array(y)
    print(f"Usáveis: {len(X)}  (idade mín={y.min()}, máx={y.max()}, média={y.mean():.1f})")

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=300, random_state=42)
    model.fit(Xtr, ytr)
    pred = model.predict(Xte)
    mae = mean_absolute_error(yte, pred)

    baseline = mean_absolute_error(yte, np.full_like(yte, ytr.mean()))

    print(f"\nMAE do modelo: {mae:.1f} anos")
    print(f"Baseline (prever a média): {baseline:.1f} anos")
    print(f"Melhoria vs baseline: {(baseline - mae) / baseline * 100:+.1f}%")

    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/idade_model.joblib")
    print("Modelo salvo em models/idade_model.joblib")


if __name__ == "__main__":
    main()
