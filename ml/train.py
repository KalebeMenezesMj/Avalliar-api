# -*- coding: utf-8 -*-
"""Treina o reconhecedor de template e o mapeador de campos, salvando em models/."""
import glob
import os

import joblib
import openpyxl
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

import fields
import templates

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.abspath(os.path.join(BASE_DIR, "models"))

V22_TEMPLATE = os.path.join(BASE_DIR, "data", "templates",
                           "Homogeneização_Unidades Isoladas_2025_V22.xlsx")
V25_TEMPLATE = os.path.join(BASE_DIR, "data", "templates",
                           "Homogeneização_unidades padronizadas_2026_V25.xlsm")

# Pasta com laudos já preenchidos — exemplos reais rotulados como V22.
FILLED_GLOB = r"C:/Users/Kalebe/Desktop/2025/*/Concluidos/*/*-Homo-*.xlsx"


def collect_recognizer_examples(max_filled=20):
    """Retorna [(caminho, template_id)] para treinar o reconhecedor."""
    examples = [
        (V22_TEMPLATE, "v22_unidades_isoladas"),
        (V25_TEMPLATE, "v25_unidades_padronizadas"),
    ]
    for path in glob.glob(FILLED_GLOB)[:max_filled]:
        examples.append((path, "v22_unidades_isoladas"))
    return examples


def _sheet_names(path):
    wb = openpyxl.load_workbook(path, read_only=True)
    names = list(wb.sheetnames)
    wb.close()
    return names


def train_recognizer(examples):
    x, y = [], []
    for path, label in examples:
        try:
            names = _sheet_names(path)
            x.append(" ".join(sorted(templates.normalize(n) for n in names)))
            y.append(label)
        except Exception as e:  # noqa: BLE001
            print(f"  [aviso] ignorando {os.path.basename(path)}: {e}")
    model = Pipeline([
        ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5))),
        ("clf", LogisticRegression(max_iter=1000, class_weight="balanced")),
    ])
    model.fit(x, y)
    return model


def train_mapper():
    x = [templates.normalize(rotulo) for rotulo, _ in fields.TRAINING_PAIRS]
    y = [campo for _, campo in fields.TRAINING_PAIRS]
    model = Pipeline([
        ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5))),
        ("clf", LogisticRegression(max_iter=1000, C=10)),
    ])
    model.fit(x, y)
    return model


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)

    print("Coletando exemplos para o reconhecedor...")
    examples = collect_recognizer_examples()
    print(f"  {len(examples)} workbooks rotulados")

    print("Treinando reconhecedor de template...")
    recognizer = train_recognizer(examples)
    joblib.dump(recognizer, os.path.join(MODELS_DIR, "recognizer.joblib"))

    print("Treinando mapeador de campos (rótulo -> campo canônico)...")
    mapper = train_mapper()
    joblib.dump(mapper, os.path.join(MODELS_DIR, "mapper.joblib"))

    print(f"Modelos salvos em {MODELS_DIR}")


if __name__ == "__main__":
    main()
