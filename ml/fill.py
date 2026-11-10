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


NENHUM = "__nenhum__"  # classe do mapeador: "este texto não é rótulo de campo"


def is_label(mapper, text, confidence=0.6):
    """O texto é reconhecido como rótulo de campo pelo mapeador?"""
    if text.strip().startswith("="):  # fórmula nunca é rótulo
        return False
    proba = mapper.predict_proba([templates.normalize(text)])[0]
    i = proba.argmax()
    return mapper.classes_[i] != NENHUM and proba[i] >= confidence


def find_value_cell(ws, cell, mapper, confidence=0.6):
    """Célula de valor de um rótulo: primeira não-vazia à direita.
    Ao pular células vazias, ignora outras que também sejam rótulos."""
    for offset in range(1, 4):
        v = ws.cell(row=cell.row, column=cell.column + offset)
        if v.value in (None, ""):
            continue
        if offset > 1 and isinstance(v.value, str) and is_label(mapper, v.value, confidence):
            continue
        return v
    return None


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


def extract(template_id, filled_path, mapper=None, confidence=0.6):
    """Extrai {campo: valor} de um laudo preenchido.

    Para cada campo esperado, procura o RÓTULO correspondente na aba onde o
    campo é escrito e lê o valor adjacente. Isso desambigua rótulos repetidos
    (ex.: 'UF' existe como cabeçalho de tabela e como campo do laudo).
    """
    mapper = mapper or load_mapper()
    cell_map = templates.CELL_MAP.get(template_id, {})
    wb = openpyxl.load_workbook(filled_path, data_only=False)
    data = {}

    por_aba = {}
    for field, (target_sheet, _) in cell_map.items():
        por_aba.setdefault(target_sheet, []).append(field)

    for sheet, campos in por_aba.items():
        if sheet not in wb.sheetnames:
            continue
        ws = wb[sheet]
        # candidatos: células de texto (nunca fórmulas), classificadas em lote
        cells = [c for row in ws.iter_rows() for c in row
                 if isinstance(c.value, str) and c.value.strip()
                 and not c.value.strip().startswith("=")]
        if not cells:
            continue
        proba = mapper.predict_proba([templates.normalize(c.value) for c in cells])
        classes = list(mapper.classes_)
        for field in campos:
            if field not in classes:
                continue
            j = classes.index(field)
            # candidatos (a classe prevista é o campo); a confiança só desempata
            # quando a diferença é relevante — rótulos repetidos valem o primeiro
            # na ordem de leitura (linha, coluna), como no laudo.
            cand = [i for i in range(len(cells))
                    if proba[i][j] >= 0.35 and classes[int(proba[i].argmax())] == field]
            if not cand:
                continue
            melhor = max(proba[i][j] for i in cand)
            ordem = sorted((i for i in cand if proba[i][j] >= melhor - 0.05),
                           key=lambda i: (cells[i].row, cells[i].column))
            ordem += sorted((i for i in cand if proba[i][j] < melhor - 0.05),
                            key=lambda i: -proba[i][j])
            for i in ordem:
                value_cell = find_value_cell(ws, cells[i], mapper, confidence)
                if value_cell is not None:
                    data[field] = value_cell.value
                    break
    wb.close()
    return data


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
