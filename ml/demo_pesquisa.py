# -*- coding: utf-8 -*-
"""Demo da pesquisa de mercado + seleção de amostras.

Mostra: (1) a URL de busca do VivaReal montada para o avaliando, (2) a seleção
das amostras mais similares por metragem, com valor por m².

Como o fetch ao vivo responde 403 de datacenter (Cloudflare), o demo usa um
conjunto de amostras realista no lugar da chamada real a `vivareal.buscar`.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import selecao
import vivareal

AVALIANDO = {
    "area": 120,            # m² — a metragem do imóvel que está sendo avaliado
    "quartos": 3,
    "banheiros": 2,
    "vagas": 2,
    "tipo": "casa",
    "cidade": "Praia Grande",
    "bairro": "Boqueirão",
}

# Amostras de mercado (formato igual ao que `vivareal.buscar` retorna).
AMOSTRAS = [
    {"preco": 495000, "area": 108, "quartos": 2, "banheiros": 2, "vagas": 2, "tipo": "casa", "bairro": "Ocian", "url": "https://vivareal.com/x1"},
    {"preco": 550000, "area": 125, "quartos": 3, "banheiros": 2, "vagas": 2, "tipo": "casa", "bairro": "Boqueirão", "url": "https://vivareal.com/x2"},
    {"preco": 380000, "area": 80,  "quartos": 2, "banheiros": 1, "vagas": 1, "tipo": "casa", "bairro": "Ocian", "url": "https://vivareal.com/x3"},
    {"preco": 680000, "area": 170, "quartos": 4, "banheiros": 3, "vagas": 3, "tipo": "casa", "bairro": "Canto do Forte", "url": "https://vivareal.com/x4"},
    {"preco": 520000, "area": 118, "quartos": 3, "banheiros": 2, "vagas": 2, "tipo": "casa", "bairro": "Boqueirão", "url": "https://vivareal.com/x5"},
    {"preco": 460000, "area": 95,  "quartos": 2, "banheiros": 1, "vagas": 1, "tipo": "casa", "bairro": "Solemar", "url": "https://vivareal.com/x6"},
    {"preco": 590000, "area": 130, "quartos": 3, "banheiros": 2, "vagas": 2, "tipo": "casa", "bairro": "Tupi", "url": "https://vivareal.com/x7"},
    {"preco": 415000, "area": 132, "quartos": 3, "banheiros": 2, "vagas": 1, "tipo": "apartamento", "bairro": "Boqueirão", "url": "https://vivareal.com/x8"},
    {"preco": 300000, "area": 62,  "quartos": 2, "banheiros": 1, "vagas": 1, "tipo": "casa", "bairro": "Ocian", "url": "https://vivareal.com/x9"},
    {"preco": 710000, "area": 145, "quartos": 4, "banheiros": 3, "vagas": 2, "tipo": "casa", "bairro": "Guilhermina", "url": "https://vivareal.com/x10"},
]


def main():
    print("=" * 72)
    print("IMÓVEL AVALIANDO")
    print(f"  {AVALIANDO['tipo'].capitalize()} · {AVALIANDO['area']} m² · "
          f"{AVALIANDO['quartos']} quartos · {AVALIANDO['vagas']} vagas · "
          f"{AVALIANDO['bairro']}, {AVALIANDO['cidade']}")
    print()

    print("URL DE BUSCA NO VIVAREAL (o que o fetcher monta):")
    print(f"  {vivareal.montar_url(AVALIANDO['uf'] if 'uf' in AVALIANDO else 'sp', AVALIANDO['cidade'], AVALIANDO['tipo'], bairro=AVALIANDO['bairro'], area_min=84, area_max=156)}")
    print()

    selecionadas = selecao.selecionar(AVALIANDO, AMOSTRAS, top_n=6, faixa_area=0.30)
    print(f"AMOSTRAS SELECIONADAS (metragem ±30%, ordenadas por similaridade):")
    print(selecao.formatar(selecionadas))
    print()

    print("Leitura: as amostras 2 e 5 (125 m² e 118 m², 3 quartos, 2 vagas, Boqueirão)")
    print("são as mais similares ao avaliando (120 m²). O R$/m² de cada uma é o")
    print("valor por metragem quadrada que a Sara quer ver na planilha.")


if __name__ == "__main__":
    main()
