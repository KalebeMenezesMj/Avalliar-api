# -*- coding: utf-8 -*-
"""Versão com CNN pré-treinada (ResNet18) para estimar a idade aparente.

Usa a ResNet18 do torchvision como extrator de features (512-d) e um regressor
RandomForest por cima. Deve reduzir o MAE em relação às features manuais.
"""
import glob
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import joblib
import numpy as np
import openpyxl
import torch
import torchvision.models as models
import torchvision.transforms as T
from PIL import Image
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

LAUDOS = r"C:/Users/Kalebe/Desktop/2025/*/Concluidos/*/*-Homo-*.xlsx"


def montar_dataset():
    pares = []
    for wb_path in sorted(glob.glob(LAUDOS)):
        d = os.path.dirname(wb_path)
        amostras_dir = os.path.join(d, "Amostras")
        if not os.path.isdir(amostras_dir):
            continue
        wb = openpyxl.load_workbook(wb_path, data_only=True)
        calc = wb["XXX - Dados Calc"]
        idades = {}
        for i, col in enumerate("CDEFGH", 1):
            v = calc[f"{col}18"].value
            if isinstance(v, (int, float)):
                idades[i] = v
        wb.close()
        for f in sorted(os.listdir(amostras_dir)):
            if not f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                continue
            m = re.match(r"(\d+)", f)
            if not m:
                continue
            idx = int(m.group(1))
            if idx in idades:
                pares.append((os.path.join(amostras_dir, f), idades[idx]))
    return pares


def main():
    resnet = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
    resnet = torch.nn.Sequential(*list(resnet.children())[:-1])
    resnet.eval()

    transform = T.Compose([
        T.Resize(256), T.CenterCrop(224), T.ToTensor(),
        T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    pares = montar_dataset()
    X, y = [], []
    with torch.no_grad():
        for p, idade in pares:
            try:
                img = Image.open(p).convert("RGB")
                t = transform(img).unsqueeze(0)
                feat = resnet(t).flatten().numpy()
                X.append(feat)
                y.append(idade)
            except Exception:
                pass
    X = np.array(X)
    y = np.array(y)
    print(f"Dataset: {len(X)} imagens, features={X.shape[1]}")

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestRegressor(n_estimators=300, random_state=42)
    model.fit(Xtr, ytr)
    mae = mean_absolute_error(yte, model.predict(Xte))
    baseline = mean_absolute_error(yte, np.full_like(yte, ytr.mean()))
    print(f"MAE CNN: {mae:.1f} anos  (baseline média: {baseline:.1f})")
    print(f"Melhoria vs baseline: {(baseline - mae) / baseline * 100:+.1f}%")

    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/idade_model_cnn.joblib")
    print("Modelo CNN salvo em models/idade_model_cnn.joblib")


if __name__ == "__main__":
    main()
