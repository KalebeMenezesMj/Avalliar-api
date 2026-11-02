# -*- coding: utf-8 -*-
"""Teste: APRENDER o layout com um laudo e PREENCHER os outros.

Este é o teste não-circular do ML:
  1. aprende o layout usando apenas 1 (ou N) laudos de referência;
  2. aplica esse layout nos demais laudos;
  3. compara com o original.

Se o layout aprendido com 1 laudo já serve para os outros, o sistema passa a
automatizar qualquer cliente a partir de UM exemplo preenchido.
"""
import glob
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import openpyxl

import layout as layout_mod
import train

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BLANK = os.path.join(BASE_DIR, "data", "templates",
                     "Homogeneização_Unidades Isoladas_2025_V22.xlsx")


def values_equal(a, b):
    if a is None or b is None:
        return a is None and b is None
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(float(a) - float(b)) < 1e-9
    return a == b


def run(laudos, n_refs, n_test):
    ref = laudos[:n_refs]
    test = laudos[n_refs:n_refs + n_test]

    learned, _ = layout_mod.learn_layout(BLANK, ref)
    total = sum(len(v) for v in learned.values())
    nomeados = sum(1 for v in learned.values() for f in v.values() if f)

    print(f"\n{'=' * 78}")
    print(f"APRENDENDO COM {n_refs} LAUDO(S): {total} células de entrada, "
          f"{nomeados} nomeadas pelo ML ({100 * nomeados / max(total, 1):.0f}%)")

    ok_total = cell_total = 0
    for path in test:
        # os "dados recebidos" são os valores do laudo alvo, nas coords aprendidas
        alvo = layout_mod.input_cells(BLANK, path)
        values = {k: v for k, v in alvo.items()
                  if k[0] in learned and k[1] in learned[k[0]]}

        fd, out = tempfile.mkstemp(suffix=".xlsx")
        os.close(fd)
        layout_mod.fill_by_layout(BLANK, values, learned, out)

        gerado = openpyxl.load_workbook(out, data_only=False)
        original = openpyxl.load_workbook(path, data_only=False)
        ok = 0
        for (sheet, coord), value in alvo.items():
            g = gerado[sheet][coord].value
            if values_equal(g, value):
                ok += 1
        ok_total += ok
        cell_total += len(alvo)
        gerado.close()
        original.close()
        os.unlink(out)

        print(f"  {os.path.basename(path):40s} {ok}/{len(alvo)} "
              f"({100 * ok / len(alvo):.1f}%)")

    pct = 100 * ok_total / cell_total if cell_total else 0
    print(f"  TOTAL: {ok_total}/{cell_total}  ({pct:.1f}%)")
    return pct


def tipologia_de(path):
    """Tipologia pelo nome da pasta: '10035612 - Fulano - Praia Grande - Ocian - casa isolada'."""
    pasta = os.path.basename(os.path.dirname(path))
    return pasta.split(" - ")[-1].strip().lower()


def referencias_diversas(laudos):
    """Um laudo por tipologia — cobre os campos condicionais (esquina, padrão etc.)."""
    escolhidos = {}
    for path in laudos:
        t = tipologia_de(path)
        escolhidos.setdefault(t, path)
    return list(escolhidos.values()), escolhidos


def main():
    laudos = sorted(glob.glob(train.FILLED_GLOB))
    print(f"Total de laudos disponíveis: {len(laudos)}")

    for n_refs in (1, 3, 5):
        run(laudos, n_refs, 10)

    diversas, por_tipologia = referencias_diversas(laudos)
    print(f"\n{'=' * 78}")
    print(f"REFERÊNCIAS DIVERSAS: {len(diversas)} tipologias -> {sorted(por_tipologia)}")
    restantes = [p for p in laudos if p not in diversas][:10]
    run_diversas(diversas, restantes)


def run_diversas(refs, test):
    print(f"\n{'=' * 78}")
    print(f"APRENDENDO COM {len(refs)} LAUDO(S) DE TIPOLOGIAS DIFERENTES")
    learned, _ = layout_mod.learn_layout(BLANK, refs)
    total = sum(len(v) for v in learned.values())
    nomeados = sum(1 for v in learned.values() for f in v.values() if f)
    print(f"  {total} células de entrada, {nomeados} nomeadas pelo ML")

    ok_total = cell_total = 0
    for path in test:
        alvo = layout_mod.input_cells(BLANK, path)
        values = {k: v for k, v in alvo.items()
                  if k[0] in learned and k[1] in learned[k[0]]}
        fd, out = tempfile.mkstemp(suffix=".xlsx")
        os.close(fd)
        layout_mod.fill_by_layout(BLANK, values, learned, out)
        gerado = openpyxl.load_workbook(out, data_only=False)
        ok = 0
        for (sheet, coord), value in alvo.items():
            if values_equal(gerado[sheet][coord].value, value):
                ok += 1
        ok_total += ok
        cell_total += len(alvo)
        gerado.close()
        os.unlink(out)
        print(f"  {os.path.basename(path):40s} {ok}/{len(alvo)} "
              f"({100 * ok / len(alvo):.1f}%)")
    print(f"  TOTAL: {ok_total}/{cell_total}  ({100 * ok_total / cell_total:.1f}%)")


if __name__ == "__main__":
    main()


if __name__ == "__main__":
    main()
