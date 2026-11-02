# -*- coding: utf-8 -*-
"""Teste de ida e volta (round-trip):

1. Extrai os valores de ENTRADA de um laudo REAL já preenchido;
2. Preenche o template EM BRANCO com esses valores;
3. Compara célula a célula com o laudo original.

Objetivo: o arquivo gerado deve bater 100% com o laudo pronto.
"""
import glob
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import openpyxl

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BLANK_V22 = os.path.join(BASE_DIR, "data", "templates",
                         "Homogeneização_Unidades Isoladas_2025_V22.xlsx")
FILLED_GLOB = r"C:/Users/Kalebe/Desktop/2025/*/Concluidos/*/*-Homo-*.xlsx"


def is_formula(cell):
    return isinstance(cell.value, str) and cell.value.startswith("=")


def input_cells(blank_path, filled_path):
    """Células de entrada do laudo: vazias/constantes no template, com valor no
    laudo, ignorando fórmulas (células calculadas). Retorna {(aba, coord): valor}."""
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
                if is_formula(b):
                    continue
                if b.value == cell.value:
                    continue
                cells[(sheet, cell.coordinate)] = cell.value
    blank.close()
    filled.close()
    return cells


def values_equal(a, b):
    if a is None or b is None:
        return a is None and b is None
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(float(a) - float(b)) < 1e-9
    return a == b


def roundtrip(filled_path):
    """Extrai, preenche e compara. Retorna (total, [mismatches])."""
    cells = input_cells(BLANK_V22, filled_path)

    wb = openpyxl.load_workbook(BLANK_V22)
    for (sheet, coord), value in cells.items():
        wb[sheet][coord] = value
    fd, out = tempfile.mkstemp(suffix=".xlsx")
    os.close(fd)
    wb.save(out)
    wb.close()

    gen = openpyxl.load_workbook(out, data_only=False)
    mismatches = []
    for (sheet, coord), value in cells.items():
        g = gen[sheet][coord].value
        if not values_equal(g, value):
            mismatches.append((sheet, coord, value, g))
    gen.close()
    os.unlink(out)

    return len(cells), mismatches


def main():
    n_laudos = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    files = sorted(glob.glob(FILLED_GLOB))[:n_laudos]
    print(f"Teste round-trip em {len(files)} laudos reais (V22)...\n")

    total_ok = total_cells = 0
    for path in files:
        n, mismatches = roundtrip(path)
        ok = n - len(mismatches)
        total_ok += ok
        total_cells += n
        pct = 100 * ok / n if n else 0
        print(f"  {os.path.basename(path):40s}  {ok}/{n}  ({pct:.1f}%)")
        for sheet, coord, v, g in mismatches[:5]:
            print(f"       DIFF {sheet}!{coord}: esperado={v!r}  gerado={g!r}")

    print(f"\nTOTAL: {total_ok}/{total_cells}  ({100 * total_ok / total_cells:.1f}%)")


if __name__ == "__main__":
    main()
