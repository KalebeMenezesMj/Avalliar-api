# -*- coding: utf-8 -*-
"""Cliente da API do VivaReal (camada HTML/SSR).

Conforme o mapa da API (`VivaReal-API.md`): o site não expõe API pública, mas a
página de resultados (Next.js) embute os 30 imóveis num payload RSC
(`self.__next_f.push([1,"..."])`). Cada listing traz `usableAreas` (m²), preço,
quartos, banheiros, vagas e endereço — exatamente o que a seleção de amostras
precisa.

OBSERVAÇÃO: de datacenter/CI o site responde 403 (Cloudflare). Em produção,
rode esta chamada dentro de um browser real (Playwright/Puppeteer) ou com os
headers exatos da seção 5 da doc.
"""
import json
import re
import urllib.parse

import requests

BASE = "https://www.vivareal.com.br"


def _slug(texto):
    """Transforma 'Praia Grande' em 'praia-grande' (kebab-case)."""
    texto = texto.lower()
    texto = re.sub(r"[áàâãä]", "a", texto)
    texto = re.sub(r"[éèêë]", "e", texto)
    texto = re.sub(r"[íìîï]", "i", texto)
    texto = re.sub(r"[óòôõö]", "o", texto)
    texto = re.sub(r"[úùûü]", "u", texto)
    texto = re.sub(r"[ç]", "c", texto)
    texto = re.sub(r"[^a-z0-9]+", "-", texto).strip("-")
    return texto


def montar_url(uf, cidade, tipo, bairro=None, **filtros):
    """Monta a URL canônica de busca (seção 3 da doc)."""
    op = "venda"
    uf_slug = _slug(uf)
    cidade_slug = _slug(cidade)
    tipo_slug = "casa_residencial" if tipo == "casa" else "apartamento_residencial"

    if bairro:
        path = f"/{op}/{uf_slug}/{cidade_slug}/bairros/{_slug(bairro)}/{tipo_slug}/"
    else:
        path = f"/{op}/{uf_slug}/{cidade_slug}/{tipo_slug}/"

    params = {}
    if filtros.get("area_min"):
        params["areaMinima"] = filtros["area_min"]
    if filtros.get("area_max"):
        params["areaMaxima"] = filtros["area_max"]
    if filtros.get("preco_min"):
        params["precoMinimo"] = filtros["preco_min"]
    if filtros.get("preco_max"):
        params["precoMaximo"] = filtros["preco_max"]
    if filtros.get("quartos"):
        params["quartos"] = filtros["quartos"]
    if filtros.get("vagas"):
        params["vagas"] = filtros["vagas"]

    url = BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    return url


def _extrair_chunks(html):
    """Decodifica os chunks RSC de `self.__next_f.push([1,"..."])` (seção 15.2 da doc).

    Cada chunk é uma string JSON escapada; este parser percorre a string
    respeitando os escapes (`\\` e `\"`) e decodifica com json.loads.
    """
    chunks = []
    marcador = 'self.__next_f.push([1,"'
    i = 0
    while True:
        i = html.find(marcador, i)
        if i == -1:
            break
        start = i + len(marcador)
        j = start
        while j < len(html):
            c = html[j]
            if c == '\\':
                j += 2
                continue
            if c == '"':
                break
            j += 1
        try:
            chunks.append(json.loads(html[start - 1:j + 1]))
        except json.JSONDecodeError:
            pass
        i = j + 1
    return chunks


def _normalizar(listing):
    """Mapeia um listing do VivaReal para o formato de amostra do Avalliar."""
    amenities = listing.get("amenities") or {}
    areas = amenities.get("usableAreas") or []
    prices = listing.get("prices") or {}
    sale = prices.get("sale") or {}
    address = listing.get("address") or {}

    return {
        "id": listing.get("id"),
        "url": listing.get("href"),
        "titulo": listing.get("title"),
        "preco": sale.get("value"),
        "area": areas[0] if areas else None,
        "quartos": (amenities.get("bedrooms") or [None])[0],
        "banheiros": (amenities.get("bathrooms") or [None])[0],
        "vagas": (amenities.get("parkingSpaces") or [None])[0],
        "tipo": "apartamento" if listing.get("unitType") == "APARTMENT" else "casa",
        "cidade": address.get("city"),
        "uf": address.get("stateAcronym"),
        "bairro": address.get("neighborhood"),
    }


def buscar(uf, cidade, tipo, bairro=None, pagina=1, **filtros):
    """Busca imóveis no VivaReal e devolve as amostras normalizadas.

    Levanta RuntimeError se o site responder com bloqueio (403).
    """
    url = montar_url(uf, cidade, tipo, bairro, **filtros)
    resp = requests.get(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
    }, timeout=30)
    if resp.status_code == 403:
        raise RuntimeError("VivaReal bloqueou a requisição (Cloudflare). Use um browser real (Playwright).")

    chunks = _extrair_chunks(resp.text)
    flight = "\n".join(chunks)
    # linha RSC com os dados da busca (seção 15.2 da doc)
    linha = next((l for l in flight.split("\n") if '"content":{"listings"' in l), None)
    if not linha:
        return []

    try:
        dados = json.loads(linha[linha.index(":") + 1:])
    except json.JSONDecodeError:
        return []

    # a árvore RSC: ["$", ..., null, {searchParams, pageName, children:[..., {content:{listings,...}}]}]
    listings = []
    def _walk(node):
        if isinstance(node, dict):
            if "listings" in node.get("content", {}):
                listings.extend(node["content"]["listings"])
            for v in node.values():
                _walk(v)
        elif isinstance(node, list):
            for v in node:
                _walk(v)
    _walk(dados)
    return [_normalizar(l) for l in listings]
