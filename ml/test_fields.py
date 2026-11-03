# -*- coding: utf-8 -*-
"""Teste por CAMPO — o que realmente exercita o ML:

1. O ML **entende os rótulos** do laudo real (mapeador) e extrai os valores;
2. O ML preenche o template em branco com esses valores (mapa de células);
3. Compara com o laudo original.

Este é o teste que valida a cadeia inteira: entender -> extrair -> posicionar.
"""
import glob
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import openpyxl

import fill as filler
import templates

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BLANK_V22 = os.path.join(BASE_DIR, "data", "templates",
                         "Homogeneização_Unidades Isoladas_2025_V22.xlsx")
FILLED_GLOB = r"C:/Users/Kalebe/Desktop/2025/*/Concluidos/*/*-Homo-*.xlsx"
TEMPLATE_ID = "v22_unidades_isoladas"


def extract_fields(filled_path, mapper, confidence=0.6):
    """Extrai {campo: valor} do laudo usando o mapeador (ML)."""
    return filler.extract(TEMPLATE_ID, filled_path, mapper, confidence)


def values_equal(a, b):
    if a is None or b is None:
        return a is None and b is None
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(float(a) - float(b)) < 1e-9
    return a == b


def main():
    mapper = filler.load_mapper()
    cell_map = templates.CELL_MAP[TEMPLATE_ID]
    n_laudos = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    files = sorted(glob.glob(FILLED_GLOB))[:n_laudos]

    print(f"Teste por CAMPO em {len(files)} laudos reais (V22)\n")
    print(f"{'campo':22s} {'extraído':>10s}  {'posicionado':>10s}  detalhe")
    print("-" * 78)

    totals = {}
    for path in files:
        extracted = extract_fields(path, mapper)
        original = openpyxl.load_workbook(path, data_only=False)

        # preenche o template em branco com o que o ML extraiu
        wb = openpyxl.load_workbook(BLANK_V22)
        for field, value in extracted.items():
            if field in cell_map:
                sheet, coord = cell_map[field]
                wb[sheet][coord] = value
        fd, out = tempfile.mkstemp(suffix=".xlsx")
        os.close(fd)
        wb.save(out)
        wb.close()

        generated = openpyxl.load_workbook(out, data_only=False)

        for field, (sheet, coord) in cell_map.items():
            extracted_ok = field in extracted
            orig_value = original[sheet][coord].value
            gen_value = generated[sheet][coord].value
            placed_ok = values_equal(gen_value, orig_value)
            ok = extracted_ok and placed_ok
            t = totals.setdefault(field, [0, 0])
            t[0] += 1 if ok else 0
            t[1] += 1
            if not ok:
                print(f"{field:22s} {'SIM' if extracted_ok else 'NAO':>10s}  "
                      f"{'SIM' if placed_ok else 'NAO':>10s}  "
                      f"orig={orig_value!r} gen={gen_value!r}")

        original.close()
        generated.close()
        os.unlink(out)

    print("-" * 78)
    print(f"{'campo':22s} {'acertos':>10s}")
    total_ok = total = 0
    for field in sorted(totals):
        ok, n = totals[field]
        total_ok += ok
        total += n
        pct = 100 * ok / n
        flag = "" if pct == 100 else "   <-- precisa melhorar"
        print(f"{field:22s} {ok}/{n} ({pct:.0f}%){flag}")
    print(f"\nTOTAL: {total_ok}/{total}  ({100 * total_ok / total:.1f}%)")


if __name__ == "__main__":
    main()
