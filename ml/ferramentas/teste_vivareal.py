# -*- coding: utf-8 -*-
"""Diagnóstico das fontes de busca do VivaReal (bloqueio Cloudflare na Azure).

Uso local:
    python ml\\ferramentas\\teste_vivareal.py [uf] [cidade] [tipo]
    # padrão: sp Peruíbe casa

Env opcionais (mesmas do container; ver docs/07):
    VIVAREAL_SCRAPIANT, VIVAREAL_RELAY, VIVAREAL_RELAY_KEY, VIVAREAL_PROXY

Dentro do container (testa exatamente o que a VPS vai usar):
    docker run --rm -e VIVAREAL_RELAY=https://... -e VIVAREAL_RELAY_KEY=... \\
        nicolassilvar/avalliar-ml:vN python ferramentas/teste_vivareal.py
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import vivareal


def main():
    args = sys.argv[1:]
    uf = args[0] if len(args) > 0 else "sp"
    cidade = args[1] if len(args) > 1 else "Peruíbe"
    tipo = args[2] if len(args) > 2 else "casa"

    print("Fontes configuradas:")
    for fonte in vivareal.resumo_fontes():
        print("  -", fonte)
    print()

    ok = False
    for prefixo in ("scrapingant", "relay", "proxy", "direta"):
        if not any(f.startswith(prefixo) for f in vivareal.resumo_fontes()):
            continue
        try:
            anuncios = vivareal.buscar(uf, cidade, tipo, _fonte=prefixo)
            if anuncios:
                print(f"[{prefixo}] OK — {len(anuncios)} anúncios (preço de um: R$ {anuncios[0].get('preco')})")
                ok = True
            else:
                print(f"[{prefixo}] respondeu, mas sem anúncios parseáveis")
        except Exception as e:
            print(f"[{prefixo}] falha — {e}")

    if not ok:
        print("\nNenhuma fonte funcionou. Verifique as env vars e o relay (docs/07).")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
