# -*- coding: utf-8 -*-
"""Layout da planilha APRENDIDO a partir de laudos preenchidos.

Ideia: entregue UM laudo preenchido de um cliente novo e o sistema descobre
sozinho (1) quais células são de entrada e (2) o que cada uma representa.

O reconhecimento das células de entrada é determinístico (diff entre o
template em branco e o laudo preenchido). O NOME de cada campo é o que o ML
descobre: o rótulo vizinho é classificado pelo mapeador.
"""
import collections
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import openpyxl

import fill as filler
import templates


def input_cells(blank_path, filled_path):
    """Células de entrada: vazias/constantes no template, com valor no laudo.
    Ignora fórmulas (células calculadas). Retorna {(aba, coord): valor}."""
    blank = openpyxl.load_workbook(blank_path, data_only=False)
    filled = openpyxl.load_workbook(filled_path, data_only=False)
    cells = {}
    for sheet in filled.sheetnames:
        if sheet not in blank.sheetnames:
            continue
        ws_f = filled[sheet]
        ws_b = blank[sheet]
        for row in ws_f.iter_rows():
            for cell in row:
                if cell.value is None:
                    continue
                b = ws_b[cell.coordinate]
                if isinstance(b.value, str) and b.value.startswith("="):
                    continue
                if b.value == cell.value:
                    continue
                cells[(sheet, cell.coordinate)] = cell.value
    blank.close()
    filled.close()
    return cells


def find_label(ws, coord, mapper, confidence=0.6):
    """Rótulo do campo: primeira célula com texto à esquerda que o mapeador reconhece."""
    target = ws[coord]
    for offset in range(1, 4):
        col = target.column - offset
        if col < 1:
            break
        c = ws.cell(row=target.row, column=col)
        if not (isinstance(c.value, str) and c.value.strip()):
            continue
        if filler.is_label(mapper, c.value, confidence):
            return c.value
        return None
    return None


def learn_layout(blank_path, filled_paths, mapper=None):
    """Aprende o layout a partir de laudos preenchidos.

    Retorna (layout, votos), onde layout = {aba: {coord: campo_ou_None}}.
    """
    mapper = mapper or filler.load_mapper()
    votos = collections.defaultdict(collections.Counter)

    for path in filled_paths:
        wb = openpyxl.load_workbook(path, data_only=False)
        for (sheet, coord) in input_cells(blank_path, path):
            ws = wb[sheet]
            label = find_label(ws, coord, mapper)
            field = None
            if label:
                field = mapper.predict([templates.normalize(label)])[0]
            votos[(sheet, coord)][field if field else "?"] += 1
        wb.close()

    layout = {}
    for (sheet, coord), contador in votos.items():
        field, _ = contador.most_common(1)[0]
        layout.setdefault(sheet, {})[coord] = None if field == "?" else field
    return layout, votos


def fill_by_layout(blank_path, values, layout, output_path):
    """Preenche o template em branco usando o layout aprendido.

    `values` = {(aba, coord): valor}. Retorna quantas células foram escritas.
    """
    wb = openpyxl.load_workbook(blank_path)
    written = 0
    for (sheet, coord), value in values.items():
        if sheet not in layout or coord not in layout[sheet]:
            continue
        wb[sheet][coord] = value
        written += 1
    wb.save(output_path)
    return written


def save_layout(layout, path):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(layout, fh, ensure_ascii=False, indent=2)


def load_layout(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)
