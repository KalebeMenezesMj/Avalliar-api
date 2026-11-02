# -*- coding: utf-8 -*-
"""Preenche uma planilha de homogeneização usando os modelos treinados."""
import os

import joblib
import openpyxl

import templates

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "models"))


def load_recognizer():
    return joblib.load(os.path.join(MODELS_DIR, "recognizer.joblib"))


def load_mapper():
    return joblib.load(os.path.join(MODELS_DIR, "mapper.joblib"))


def recognize(path):
    """Identifica o template de um arquivo .xlsx/.xlsm."""
    recognizer = load_recognizer()
    wb = openpyxl.load_workbook(path, read_only=True)
    fp = templates.fingerprint(wb)
    wb.close()
    return recognizer.predict([fp])[0]


def _load_workbook(path):
    if path.lower().endswith(".xlsm"):
        return openpyxl.load_workbook(path, keep_vba=True)
    return openpyxl.load_workbook(path)


def fill(template_path, data, output_path):
    """Reconhece o template e escreve os valores de `data` nas células mapeadas.

    Retorna (template_id, [(campo, aba, célula, valor), ...]).
    """
    wb = _load_workbook(template_path)
    recognizer = load_recognizer()
    template_id = recognizer.predict([templates.fingerprint(wb)])[0]

    cell_map = templates.CELL_MAP.get(template_id, {})
    written = []
    for field, value in data.items():
        if field in cell_map:
            sheet_name, cell = cell_map[field]
            wb[sheet_name][cell] = value
            written.append((field, sheet_name, cell, value))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    wb.save(output_path)
    return template_id, written


def _cli():
    import argparse
    import json

    parser = argparse.ArgumentParser(
        prog="fill.py",
        description="Avalliar ML — reconhecer template e preencher planilha")
    sub = parser.add_subparsers(dest="comando", required=True)

    r = sub.add_parser("reconhecer", help="identifica o template de um arquivo .xlsx/.xlsm")
    r.add_argument("arquivo")

    p = sub.add_parser("preencher", help="preenche um template com dados de um JSON")
    p.add_argument("template")
    p.add_argument("dados", help="arquivo .json com {campo: valor}")
    p.add_argument("saida")

    args = parser.parse_args()

    if args.comando == "reconhecer":
        tid = recognize(args.arquivo)
        print(f"{tid}\t{templates.TEMPLATES[tid]}")
    elif args.comando == "preencher":
        with open(args.dados, encoding="utf-8") as fh:
            data = json.load(fh)
        tid, written = fill(args.template, data, args.saida)
        print(f"Template: {tid} ({templates.TEMPLATES[tid]})")
        for campo, aba, cel, valor in written:
            print(f"  {aba}!{cel} = {valor!r}")
        print(f"Salvo em: {args.saida}")


if __name__ == "__main__":
    _cli()
