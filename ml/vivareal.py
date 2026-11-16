# -*- coding: utf-8 -*-
"""Cliente da API do VivaReal (camada HTML/SSR).

Conforme o mapa da API (`VivaReal-API.md`): o site não expõe API pública, mas a
página de resultados (Next.js) embute os 30 imóveis num payload RSC
(`self.__next_f.push([1,"..."])`). Cada listing traz `usableAreas` (m²), preço,
quartos, banheiros, vagas e endereço — exatamente o que a seleção de amostras
precisa.

Bloqueio (Cloudflare 403) em IP de datacenter/Azure: o HTML é buscado por uma
cadeia de fontes, cada uma ligada por variável de ambiente (ver docs/07):

| Ordem | Fonte           | Env                                |
|-------|-----------------|------------------------------------|
| 1     | ScrapingAnt     | VIVAREAL_SCRAPIANT                 |
| 2     | Relay residencial | VIVAREAL_RELAY (+ VIVAREAL_RELAY_KEY) |
| 3     | Direta          | (VIVAREAL_PROXY opcional)          |

A primeira fonte que devolver a página de resultados é usada; se falhar ou
voltar página de desafio do Cloudflare, tenta a seguinte. O resultado fica em
cache em memória por VIVAREAL_CACHE_TTL segundos (padrão 1800) para repetir a
mesma busca não gastar de novo (crédito/relay).
"""
import json
import os
import re
import time
import urllib.parse

import requests

BASE = "https://www.vivareal.com.br"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
}

# --- Fontes de busca (configuráveis por ambiente) -------------------------------
_RELAY = os.getenv("VIVAREAL_RELAY", "").strip()          # ex.: https://xxx.trycloudflare.com
_RELAY_KEY = os.getenv("VIVAREAL_RELAY_KEY", "").strip()  # compartilhada com infra/relay.py (RELAY_KEY)
_PROXY = os.getenv("VIVAREAL_PROXY", "").strip()           # ex.: http://user:pass@host:porta
_SCRAPIANT = os.getenv("VIVAREAL_SCRAPIANT", "").strip()   # chave da API ScrapingAnt
_TTL = max(int(os.getenv("VIVAREAL_CACHE_TTL", "") or "1800"), 0)

_cache = {}  # url -> (agora, nome_da_fonte, html)
_estado = {"ultima_fonte": None, "ultima_url": None}


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


# --- Cadeia de fontes anti-bloqueio ----------------------------------------------

def resumo_fontes():
    """Fontes disponíveis, na ordem em que serão tentadas (diagnóstico)."""
    fontes = []
    if _SCRAPIANT:
        fontes.append("scrapingant (sem browser)")
        fontes.append("scrapingant (browser)")
    if _lista_proxies():
        fontes.append(f"proxy x{len(_lista_proxies())} (VIVAREAL_PROXY)")
    if _RELAY:
        fontes.append(f"relay ({_RELAY})")
    fontes.append("direta")
    if _TTL:
        fontes.append(f"cache em memória {_TTL}s")
    return fontes


def estado():
    """Última busca e a fonte que atendeu (diagnóstico)."""
    return dict(_estado)


def _parece_bloqueado(status, html):
    """True se a resposta não parece o HTML de resultados do VivaReal."""
    if status >= 400 or not html:
        return True
    # página real tem ~1 MB; challenge/página errada tem bem menos
    if len(html) < 50_000:
        return True
    cabeca = html[:30_000].lower()
    return "just a moment" in cabeca or "cf-chl-" in cabeca or "challenge-platform" in cabeca


def _fetch_direta(url, proxy=None):
    proxies = {"http": proxy, "https": proxy} if proxy else None
    # 1ª opção: fingerprint de Chrome real (passa no Cloudflare onde o ssl do
    # Python puro recebe 403 — mesmo saindo do mesmo IP residencial).
    try:
        from curl_cffi import requests as _crequests
        r = _crequests.get(url, impersonate="chrome", timeout=30, proxies=proxies)
        return r.status_code, r.text
    except ImportError:
        pass
    r = requests.get(url, headers=HEADERS, timeout=30, proxies=proxies)
    return r.status_code, r.text


def _lista_proxies():
    """VIVAREAL_PROXY aceita uma lista separada por vírgula (ex.: gateways do
    DataImpulse); cada um vira uma tentativa própria."""
    return [p.strip() for p in _PROXY.split(",") if p.strip()]


def _fetch_relay(url):
    """Pede o HTML ao relay residencial (infra/relay.py + tunnel): sai pela
    internet da máquina do relay, que o VivaReal não bloqueia."""
    destino = _RELAY.rstrip("/") + "/fetch?url=" + urllib.parse.quote(url, safe="")
    headers = {"X-Avalliar-Key": _RELAY_KEY} if _RELAY_KEY else {}
    r = requests.get(destino, headers=headers, timeout=60)
    return r.status_code, r.text


def _fetch_scrapingant(url, browser=False):
    """API de scraping ScrapingAnt (plano grátis: 10 mil créditos/mês, sem cartão;
    1 crédito por busca simples, 10 com browser). Retorna o HTML da página."""
    r = requests.get(
        "https://api.scrapingant.com/v2/general",
        params={"url": url, "browser": "true" if browser else "false"},
        headers={"x-api-key": _SCRAPIANT},
        timeout=90,
    )
    if "json" in r.headers.get("content-type", "").lower():
        try:
            dados = r.json()
        except ValueError:
            dados = {"message": r.text[:200]}
        html = str(dados.get("html") or dados.get("content") or dados.get("data") or "")
        if html:
            return 200, html
        return int(dados.get("code") or r.status_code or 500), str(dados.get("message") or "")
    return r.status_code, r.text


def _obter_html(url, fonte_obrigatoria="auto"):
    """Busca o HTML da URL tentando as fontes configuradas; devolve (html, fonte).

    fonte_obrigatoria: "auto" ou o prefixo de uma fonte ("scrapingant", "relay",
    "direta", "cache") — usado pelo script de teste para checar cada uma.
    """
    agora = time.time()
    if _TTL and fonte_obrigatoria in ("auto", "cache"):
        hit = _cache.get(url)
        if hit and agora - hit[0] < _TTL:
            _estado.update({"ultima_fonte": f"cache ({hit[1]})", "ultima_url": url})
            return hit[2], "cache"

    tentativas = []
    if _SCRAPIANT:
        tentativas.append(("scrapingant (sem browser)", lambda: _fetch_scrapingant(url, False)))
        tentativas.append(("scrapingant (browser)", lambda: _fetch_scrapingant(url, True)))
    # proxies primeiro: é a fonte que funciona na VPS sem depender de máquina local
    for i, p in enumerate(_lista_proxies()):
        tentativas.append((f"proxy[{i}]", lambda p=p: _fetch_direta(url, proxy=p)))
    if _RELAY:
        tentativas.append((f"relay ({_RELAY})", lambda: _fetch_relay(url)))
    tentativas.append(("direta", lambda: _fetch_direta(url)))
    if fonte_obrigatoria not in ("auto", "cache"):
        tentativas = [t for t in tentativas if t[0].startswith(fonte_obrigatoria)]

    erros = []
    for nome, fn in tentativas:
        try:
            status, html = fn()
        except Exception as e:
            erros.append(f"{nome}: {type(e).__name__} {e}")
            continue
        if _parece_bloqueado(status, html):
            trecho = re.sub(r"\s+", " ", html[:150])
            erros.append(f"{nome}: HTTP {status}, bloqueio — trecho: {trecho}")
            continue
        _cache[url] = (agora, nome, html)
        _estado.update({"ultima_fonte": nome, "ultima_url": url})
        print(f"vivareal: {urllib.parse.urlparse(url).path} via {nome} ({len(html)} bytes)")
        return html, nome
    raise RuntimeError("VivaReal indisponível nas fontes tentadas — " + " | ".join(erros))


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
    coords = address.get("coordinates") or {}
    if not isinstance(coords, dict):
        coords = {}
    advertiser = listing.get("advertiser") or {}
    phones = advertiser.get("phoneNumbers") or []
    if not isinstance(phones, list):
        phones = []

    medias = listing.get("medias") or {}
    images = medias.get("images") or []
    primeira = images[0] if images else {}
    imagem_url = _resolver_imagem(primeira.get("dangerousSrc"), primeira.get("alt") or "")

    return _sem_undefined({
        "id": listing.get("id"),
        "url": listing.get("href"),
        "titulo": listing.get("title"),
        "preco": sale.get("value"),
        "area": areas[0] if areas else None,
        "quartos": (amenities.get("bedrooms") or [None])[0],
        "suites": (amenities.get("suites") or [None])[0],
        "banheiros": (amenities.get("bathrooms") or [None])[0],
        "vagas": (amenities.get("parkingSpaces") or [None])[0],
        "tipo": "apartamento" if listing.get("unitType") == "APARTMENT" else "casa",
        "cidade": address.get("city"),
        "uf": address.get("stateAcronym"),
        "bairro": address.get("neighborhood"),
        "endereco": address.get("street"),
        "numero": address.get("streetNumber"),
        "latitude": coords.get("latitude"),
        "longitude": coords.get("longitude"),
        "contato": advertiser.get("name"),
        "telefone": phones[0] if phones else None,
        "descricao": listing.get("description"),
        "imagem_url": imagem_url,
    })


def _sem_undefined(d):
    """O payload RSC do Next.js serializa valores ausentes como a string '$undefined'."""
    return {k: (None if v == "$undefined" else v) for k, v in d.items()}


def _resolver_imagem(template, alt):
    """Resolve o template de imagem do CDN (seção 14 da doc)."""
    if not template:
        return None
    slug = re.sub(r"[^a-z0-9]+", "-", alt.lower()).strip("-")[:60] or "imovel"
    return (template.replace("{description}", slug)
                      .replace("{action}", "crop")
                      .replace("{width}", "800")
                      .replace("{height}", "600"))


def buscar(uf, cidade, tipo, bairro=None, pagina=1, _fonte="auto", **filtros):
    """Busca imóveis no VivaReal e devolve as amostras normalizadas.

    O HTML vem de `_obter_html` (cadeia de fontes anti-bloqueio); levanta
    RuntimeError se nenhuma fonte entregar a página. `_fonte` força uma fonte
    específica (usado no teste de diagnóstico).
    """
    url = montar_url(uf, cidade, tipo, bairro, **filtros)
    anuncios = _buscar_url(url, _fonte)
    if not anuncios and (filtros.get("area_min") or filtros.get("area_max")):
        # a página veio sem anúncios (filtro estreito ou resposta vazia intermitente): tenta sem o filtro
        # de área e deixa a seleção por similaridade descartar o que não serve
        sem_area = {k: v for k, v in filtros.items() if k not in ("area_min", "area_max")}
        anuncios = _buscar_url(montar_url(uf, cidade, tipo, bairro, **sem_area), _fonte)
    return anuncios


def _buscar_url(url, _fonte="auto", tentativas=3):
    """Baixa e extrai os anúncios; página sem anúncios não fica no cache e é tentada de novo."""
    for _ in range(tentativas):
        html, _nome = _obter_html(url, fonte_obrigatoria=_fonte)
        anuncios = _listar(html)
        if anuncios:
            return anuncios
        _cache.pop(url, None)
    return []



def _listar(html):
    """Extrai os anúncios do HTML de resultados ([] se a página veio sem eles)."""
    chunks = _extrair_chunks(html)
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
