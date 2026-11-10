# -*- coding: utf-8 -*-
"""Teste de regressão: os modelos em models/ não podem cair abaixo do piso no conjunto reservado.

    python test_avaliacao.py            # só banco (rápido)
    python test_avaliacao.py --extracao # inclui extração ponta a ponta (precisa dos laudos locais)

Requer as variáveis DB_* e o conjunto montado por `python dataset.py`.
Sai com código 1 se algum piso for violado (serve em CI).
"""
import sys

import avaliar
import train

PISOS = {
    "reconhecedor": 0.95,        # acurácia do reconhecedor de template
    "rotulos_reconhecidos": 0.95,  # rótulos de campo reconhecidos pelo mapeador
    "rejeicao_nao_rotulos": 0.95,  # textos que NÃO são rótulos rejeitados
    "rejeicao_ineditos": 0.90,   # idem, só para textos nunca vistos no treino
    "extracao": 0.97,            # campos extraídos corretamente (ponta a ponta)
}


def main():
    m = avaliar.avaliar_diretorio(avaliar.MODELS_DIR, train.get_db_engine(),
                                  extracao="--extracao" in sys.argv)
    avaliar._imprimir(m)
    medidas = {
        "reconhecedor": m["reconhecedor"].get("acuracia"),
        "rotulos_reconhecidos": m["mapeador"].get("rotulos_reconhecidos"),
        "rejeicao_nao_rotulos": m["mapeador"].get("rejeicao_nao_rotulos"),
        "rejeicao_ineditos": m["mapeador"].get("rejeicao_ineditos"),
    }
    if "extracao" in m:
        medidas["extracao"] = m["extracao"].get("acuracia")

    falhas = []
    print("\nPisos:")
    for nome, valor in medidas.items():
        ok = valor is not None and valor >= PISOS[nome]
        print(f"  {'OK  ' if ok else 'FALHA'} {nome:24s} {valor}  (piso {PISOS[nome]})")
        if not ok:
            falhas.append(nome)
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
