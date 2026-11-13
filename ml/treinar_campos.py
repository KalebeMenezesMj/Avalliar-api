# -*- coding: utf-8 -*-
"""Treina os estimadores de campos por amostra (campos.py).

    python treinar_campos.py [amostras_v22.json]

O JSON vem de coletar_amostras.py (Dados Calc dos laudos V22 reais). Avalia com
validação cruzada por laudo e só então treina com tudo e salva em models/.
"""
import collections
import json
import os
import sys

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import GroupKFold

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import campos
import pandas as pd

CAMINHO = sys.argv[1] if len(sys.argv) > 1 else os.getenv("AMOSTRAS_JSON", "data/amostras_v22.json")


def novo():
    return RandomForestClassifier(n_estimators=400, min_samples_leaf=2, random_state=0, n_jobs=-1)


def main():
    df = pd.DataFrame(json.load(open(CAMINHO, encoding="utf-8")))
    print(f"{len(df)} amostras de {df.laudo.nunique()} laudos")
    modelos, resumo = {}, {}
    for alvo in campos.ALVOS:
        d = df[df[alvo].notna()]
        X, y, g = campos.features(d.to_dict("records")).values, d[alvo].astype(int).values, d.laudo.values
        acc, base = [], []
        for tr, te in GroupKFold(n_splits=5).split(X, y, g):
            m = novo().fit(X[tr], y[tr])
            acc.append(accuracy_score(y[te], m.predict(X[te])))
            moda = collections.Counter(y[tr]).most_common(1)[0][0]
            base.append(accuracy_score(y[te], np.full(len(te), moda)))
        resumo[alvo] = (float(np.mean(acc)), float(np.mean(base)))
        print(f"  {alvo:20s} validação por laudo: {np.mean(acc):.3f}   baseline (moda): {np.mean(base):.3f}")
        modelos[alvo] = novo().fit(X, y)
    os.makedirs(os.path.dirname(campos.MODELO), exist_ok=True)
    joblib.dump(modelos, campos.MODELO, compress=3)
    print("salvo em", campos.MODELO, f"({os.path.getsize(campos.MODELO)/1e6:.1f} MB)")


if __name__ == "__main__":
    main()
