# -*- coding: utf-8 -*-
"""Teste de consistência do template V25.

Não temos um laudo V25 preenchido para comparar, mas dá para validar o mapa
de células por outra via: as fórmulas das outras abas referenciam exatamente as
células de ENTRADA de 'DADOS DO IMÓVEL'. Logo, todo campo do mapa deveria
apontar para uma célula referenciada, e toda célula referenciada deveria estar
no mapa.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import openpyxl

import templates

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
V25 = os.path.join(BASE_DIR, "data", "templates",
                    "Homogeneização_unidades padronizadas_2026_V25.xlsm")
TEMPLATE_ID = "v25_unidades_padronizadas"
SHEET = "DADOS DO IMÓVEL"


def referenced_cells(workbook, sheet):
    """Células de `sheet` referenciadas por fórmulas do workbook."""
    padrao = re.compile(r"'{}'!\$?([A-Z]{{1,2}})\$?(\d+)".format(re.escape(sheet)), re.IGNORECASE)
    achadas = set()
    for ws in workbook.worksheets:
        for row in ws.iter_rows():
            for cell in row:
                v = cell.value
                if isinstance(v, str) and v.startswith("="):
                    for m in padrao.finditer(v):
                        achadas.add(f"{m.group(1).upper()}{m.group(2)}")
    return achadas


def main():
    wb = openpyxl.load_workbook(V25, data_only=False)
    refs = referenced_cells(wb, SHEET)

    mapeadas = {coord for sheet, coord in templates.CELL_MAP[TEMPLATE_ID].values()
                if sheet == SHEET}

    # célula de input = referenciada por alguma fórmula
    nao_mapeadas = sorted(refs - mapeadas, key=lambda c: (int(re.sub(r"\D", "", c)), c))
    nao_referenciadas = sorted(mapeadas - refs, key=lambda c: (int(re.sub(r"\D", "", c)), c))

    print(f"Células de '{SHEET}' referenciadas por fórmulas: {len(refs)}")
    print(f"Campos no mapa do V25:                           {len(mapeadas)}")
    print(f"\nCorretas (no mapa e referenciadas):              {len(mapeadas & refs)}")

    if nao_mapeadas:
        print(f"\n!! Células de entrada NÃO mapeadas ({len(nao_mapeadas)}):")
        for c in nao_mapeadas:
            rotulo = wb[SHEET][f"B{''.join(ch for ch in c if ch.isdigit())}"].value
            print(f"   {c:6s}  rótulo={rotulo!r}")
    if nao_referenciadas:
        print(f"\n!! Campos mapeados cuja célula não é referenciada ({len(nao_referenciadas)}):")
        for c in nao_referenciadas:
            campo = [f for f, (s, cc) in templates.CELL_MAP[TEMPLATE_ID].items() if cc == c]
            print(f"   {c:6s}  campo={campo}")

    wb.close()
    ok = not nao_mapeadas and not nao_referenciadas
    print(f"\nRESULTADO: {'OK - mapa consistente' if ok else 'AJUSTES NECESSARIOS'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
