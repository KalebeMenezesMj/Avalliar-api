# -*- coding: utf-8 -*-
"""Teste do reconhecedor de template.

Cada laudo real deve ser identificado como V22. O teste também separa os
laudos que foram VISTOS no treino dos que NÃO foram (generalização real).
"""
import glob
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import fill as filler
import train

N = int(sys.argv[1]) if len(sys.argv) > 1 else 30
ESPERADO = "v22_unidades_isoladas"


def main():
    files = sorted(glob.glob(train.FILLED_GLOB))[:N]
    vistos = {p for p, _ in train.collect_recognizer_examples()}

    ok = n = 0
    ok_held = n_held = 0
    erros = []

    for path in files:
        tid = filler.recognize(path)
        hit = tid == ESPERADO
        ok += hit
        n += 1
        if path not in vistos:
            n_held += 1
            ok_held += hit
        if not hit:
            erros.append((os.path.basename(path), tid))
        print(f"  {os.path.basename(path):40s}  {tid:28s} "
              f"{'OK' if hit else 'ERRO'}"
              f"{'  (nao visto no treino)' if path not in vistos else ''}")

    print(f"\nTotal:            {ok}/{n}  ({100 * ok / n:.1f}%)")
    if n_held:
        print(f"Generalizacao:    {ok_held}/{n_held}  ({100 * ok_held / n_held:.1f}%) "
              f"— laudos NAO vistos no treino")
    for nome, tid in erros:
        print(f"  ERRO: {nome} -> {tid}")


if __name__ == "__main__":
    main()
