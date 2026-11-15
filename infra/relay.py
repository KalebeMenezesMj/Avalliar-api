# -*- coding: utf-8 -*-
"""Relay de busca do Avalliar: fetcha páginas para o servidor (Azure) pelo IP
desta máquina (residencial, que o VivaReal não bloqueia).

Uso:
    python infra\\relay.py                 # escuta em 0.0.0.0:8899
    set RELAY_KEY=segredo && python infra\\relay.py   # exige header X-Avalliar-Key: segredo
    set ALLOWED_HOSTS=vivareal.com.br,viacep.com.br && ...   # amplia hosts permitidos

Endpoints:
    GET /healthz              -> {"ok": true}
    GET /fetch?url=<https>    -> corpo da página (status do alvo é repassado)

Depois exponha com um tunnel gratuito (o subir-relay.bat já faz tudo):
    cloudflared tunnel --url http://localhost:8899
e aponte VIVAREAL_RELAY=https://xxxx.trycloudflare.com no container app (docs/07).

Só usa a biblioteca padrão.
"""
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

try:  # o Cloudflare do VivaReal bloqueia o fingerprint TLS/headers do urllib puro
    import requests as _requests
except ImportError:
    _requests = None

PORTA = int(os.getenv("RELAY_PORT", "8899"))
CHAVE = os.getenv("RELAY_KEY", "").strip()
ALLOWED = [h.strip().lower().lstrip(".") for h in
           os.getenv("ALLOWED_HOSTS", "vivareal.com.br").split(",") if h.strip()]
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
}


def _fetch(url):
    """Devolve (status, corpo). Com requests usa o mesmo cliente do scrapper
    (que o VivaReal aceita); urllib puro serve só de contingência."""
    if _requests is not None:
        r = _requests.get(url, headers=HEADERS, timeout=40)
        return r.status_code, r.content
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print("[relay] " + (fmt % args), flush=True)

    def _enviar(self, status, corpo=b"", ctype="text/html; charset=utf-8"):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(corpo)

    def _json(self, status, obj):
        self._enviar(status, json.dumps(obj).encode("utf-8"), "application/json")

    def do_GET(self):  # noqa: N802 (API do http.server)
        qs = urllib.parse.urlparse(self.path)
        if qs.path == "/healthz":
            self._json(200, {"ok": True, "hosts_permitidos": ALLOWED})
            return
        if qs.path != "/fetch":
            self._json(404, {"erro": "rota não encontrada; use /fetch?url=<https://...>"})
            return

        params = urllib.parse.parse_qs(qs.query)
        url = (params.get("url") or [""])[0].strip()
        if CHAVE and self.headers.get("X-Avalliar-Key") != CHAVE:
            self._json(401, {"erro": "chave inválida (header X-Avalliar-Key)"})
            return
        host = urllib.parse.urlparse(url).hostname or ""
        if not any(host == h or host.endswith("." + h) for h in ALLOWED):
            self._json(400, {"erro": f"host não permitido: {host}"})
            return
        try:
            status, corpo = _fetch(url)
        except Exception as e:
            self.log_message("erro ao fetch %s: %s", url, e)
            self._json(502, {"erro": str(e)})
            return
        self.log_message("%s %s -> %s (%d bytes)", self.client_address[0], host, status, len(corpo))
        self._enviar(status, corpo)


if __name__ == "__main__":
    backend = "requests" if _requests is not None else "urllib (pior fingerprint — ideal: pip install requests)"
    print(f"[relay] escutando em 0.0.0.0:{PORTA} | backend: {backend} | hosts: {', '.join(ALLOWED)} | senha: {'sim' if CHAVE else 'NÃO'}",
          flush=True)
    print("[relay] para testar: curl http://localhost:%d/healthz" % PORTA, flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORTA), Handler).serve_forever()
