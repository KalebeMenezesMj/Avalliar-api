# -*- coding: utf-8 -*-
"""Idade aparente do imóvel a partir de uma foto — versão LEVE para produção.

Usa só Pillow + numpy + scikit-learn (RandomForest sobre características de cor e
borda). Não precisa de PyTorch, então a imagem Docker continua pequena.

O modelo é treinado por `treinar_idade.py` (precisa das fotos dos laudos, que não
ficam no container) e publicado como `models/idade_model.joblib` — em produção o
`app.py` baixa esse arquivo do Blob Storage no startup.
"""
import io
import os

import numpy as np

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "models"))
MODELO = os.path.join(MODELS_DIR, "idade_model.joblib")
_cache = {}


def extrair_features(origem):
    """Características de cor/textura de uma imagem (caminho, bytes ou file-like).

    Retorna um vetor numpy ou None se a imagem não puder ser lida.
    """
    from PIL import Image
    try:
        if isinstance(origem, (bytes, bytearray)):
            origem = io.BytesIO(origem)
        img = Image.open(origem).convert("RGB").resize((64, 64))
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


def disponivel():
    return os.path.exists(MODELO)


def _modelo():
    import joblib
    mtime = os.path.getmtime(MODELO)
    if _cache.get("mtime") != mtime:  # recarrega se o arquivo mudou
        _cache["modelo"] = joblib.load(MODELO)
        _cache["mtime"] = mtime
    return _cache["modelo"]


def prever(origem):
    """Idade aparente estimada (anos) ou None se a imagem for inválida."""
    feat = extrair_features(origem)
    if feat is None:
        return None
    return float(_modelo().predict([feat])[0])
