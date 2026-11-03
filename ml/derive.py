# -*- coding: utf-8 -*-
"""Aprende o mapa de células (campo -> aba/célula) a partir de planilhas preenchidas.

Em vez de decorar onde cada campo fica, o módulo observa laudos já preenchidos
e descobre, sozinho: "o rótulo X fica na célula Y, e o valor fica na célula à
direita". Isso é o 'aprender a preencher' por exemplos.
"""
import glob
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import openpyxl

import fill as filler
import templates

# Laudos reais preenchidos (V22) — fonte de exemplos supervisionados.
FILLED_GLOB = r"C:/Users/Kalebe/Desktop/2025/*/Concluidos/*/*-Homo-*.xlsx"
CONFIDENCE = 0.6


def _is_label(mapper, text):
    return filler.is_label(mapper, text, CONFIDENCE)


def _find_value_cell(ws, cell, mapper, max_offset=3):
    """Procura a célula de valor do rótulo (heurística compartilhada com fill.py)."""
    return filler.find_value_cell(ws, cell, mapper, CONFIDENCE)


def derive(filled_paths):
    mapper = filler.load_mapper()
    votes = {}  # campo -> {(aba, célula): contagem}

    for path in filled_paths:
        wb = openpyxl.load_workbook(path, data_only=True)
        for ws in wb.worksheets:
            for row in ws.iter_rows():
                for cell in row:
                    if not (isinstance(cell.value, str) and cell.value.strip()):
                        continue
                    if not _is_label(mapper, cell.value):
                        continue
                    field = mapper.predict([templates.normalize(cell.value)])[0]
                    value_cell = _find_value_cell(ws, cell, mapper)
                    if value_cell is None:
                        continue
                    key = (ws.title, value_cell.coordinate)
                    votes.setdefault(field, {}).setdefault(key, 0)
                    votes[field][key] += 1
        wb.close()

    cell_map = {}
    for field, cells in votes.items():
        best = max(cells.items(), key=lambda kv: kv[1])
        cell_map[field] = best[0]
    return cell_map, votes


def main():
    files = glob.glob(FILLED_GLOB)[:8]
    print(f"Analisando {len(files)} laudos preenchidos (V22)...")
    cell_map, votes = derive(files)

    print("\nMapa de células APRENDIDO (campo -> aba!célula):")
    for field in sorted(cell_map):
        sheet, coord = cell_map[field]
        count = votes[field][(sheet, coord)]
        print(f"  {field:22s} -> {sheet}!{coord:6s}  (votos={count})")

    print("\nComparação com o mapa decorado do V22 (templates.py):")
    for field, (sheet, coord) in templates.CELL_MAP["v22_unidades_isoladas"].items():
        learned = cell_map.get(field)
        mark = "OK" if learned == (sheet, coord) else f"DIFERENTE (aprendeu {learned})"
        print(f"  {field:22s} decorado={sheet}!{coord}  ->  {mark}")


if __name__ == "__main__":
    main()
