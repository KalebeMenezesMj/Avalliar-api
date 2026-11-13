# -*- coding: utf-8 -*-
"""Busca amostras no VivaReal, seleciona as mais parecidas e devolve campos prontos
para as colunas D..H do 'Dados Calc' (ver calc.py)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import requests

import calc
import campos
import selecao
import vivareal

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}


def _idade_da_foto(url):
    """Idade aparente (anos) a partir da foto do anúncio; None se indisponível."""
    if not url:
        return None
    try:
        import idade
        if not idade.disponivel():
            return None
        r = requests.get(url, timeout=15, headers=HEADERS)
        if r.status_code != 200:
            return None
        anos = idade.prever(r.content)
        return None if anos is None else round(anos)
    except Exception:
        return None


def _cep(uf, cidade, logradouro):
    if not (uf and cidade and logradouro):
        return None
    try:
        r = requests.get(f"https://viacep.com.br/ws/{uf}/{cidade}/{logradouro}/json/",
                         timeout=10, headers=HEADERS)
        dados = r.json()
        if isinstance(dados, list) and dados and dados[0].get("cep"):
            return dados[0]["cep"]
    except Exception:
        pass
    return None


def buscar(busca, completar=True):
    """`busca`: {uf, cidade, tipo='casa', bairro?, area?, quartos?, vagas?, top_n=5,
    faixa_area=0.6, area_min?, area_max?}.

    Retorna (amostras_para_calc, avisos). Nunca levanta por falha do site: devolve
    lista vazia e um aviso, para o preenchimento do restante da planilha seguir."""
    avisos = []
    uf, cidade = busca.get("uf"), busca.get("cidade")
    if not uf or not cidade:
        return [], ["busca de amostras ignorada: informe 'uf' e 'cidade' em dados.busca"]
    tipo = busca.get("tipo", "casa")
    filtros = {k: busca[k] for k in ("area_min", "area_max") if busca.get(k) is not None}
    try:
        anuncios = vivareal.buscar(uf, cidade, tipo, busca.get("bairro"), **filtros)
    except Exception as e:
        return [], [f"VivaReal indisponível ({e}); amostras não preenchidas"]
    if not anuncios:
        return [], ["VivaReal não retornou anúncios para essa busca; amostras não preenchidas"]

    alvo = {"area": busca.get("area"), "tipo": tipo, "quartos": busca.get("quartos"),
            "vagas": busca.get("vagas"), "bairro": busca.get("bairro")}
    top_n = min(int(busca.get("top_n", 5)), len(calc.COLUNAS_AMOSTRAS))
    escolhidas = selecao.selecionar(alvo, anuncios, top_n=top_n,
                                    faixa_area=float(busca.get("faixa_area", 0.6)))
    if len(escolhidas) < top_n:
        avisos.append(f"só {len(escolhidas)} amostra(s) compatíveis de {top_n} pedidas")

    out = []
    for a in escolhidas:
        idade = _idade_da_foto(a.get("imagem_url")) if completar else None
        cep = _cep(a.get("uf"), a.get("cidade"), a.get("endereco")) if completar else None
        out.append(calc.amostra_do_vivareal(a, idade=idade, cep=cep))
    estimados = campos.completar(out)
    for a in out:
        a.setdefault("estado_conservacao", 3)  # reserva se o modelo não estiver disponível
    if estimados:
        nomes = sorted({campo for _, campo, _ in estimados})
        avisos.append("campos estimados pelo modelo (revisar): " + ", ".join(nomes))
    return out, avisos
