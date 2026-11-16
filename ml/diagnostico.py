"""Diagnóstico temporário do preenchimento de planilhas.

Grava, no Azure Files (compartilhamento DIAG_AZURE_SHARE, padrão "diagnostico"),
cada pedido de preenchimento: os dados enviados, a planilha recebida (quando há),
a planilha devolvida, o tamanho e o sha256 de cada uma. Serve para descobrir onde
o arquivo é cortado ou onde o erro acontece.

Sem DIAG_AZURE_CONNECTION_STRING não grava nada. Nunca lança exceção: o diagnóstico
não pode derrubar o preenchimento.
"""

import datetime
import hashlib
import json
import os

_CONN = os.getenv("DIAG_AZURE_CONNECTION_STRING", "")
_SHARE_NOME = os.getenv("DIAG_AZURE_SHARE", "diagnostico")
_share = None


def _compartilhamento():
    global _share
    if _share is None and _CONN:
        from azure.storage.fileshare import ShareServiceClient

        share = ShareServiceClient.from_connection_string(_CONN).get_share_client(_SHARE_NOME)
        try:
            share.create_share()
        except Exception:
            pass  # já existe
        _share = share
    return _share


def _subir(share, caminho: str, conteudo: bytes) -> None:
    pasta, nome = caminho.rsplit("/", 1)
    diretorio = share.get_directory_client(pasta)
    try:
        diretorio.create_directory()
    except Exception:
        pass  # já existe
    diretorio.get_file_client(nome).upload_file(conteudo)


def registrar(evento: str, info: dict, arquivo: bytes | None = None) -> None:
    """Grava um registro: um JSON com os dados e, se houver, o arquivo com sha256."""
    try:
        share = _compartilhamento()
        if share is None:
            return
        agora = datetime.datetime.now(datetime.timezone.utc)
        quando = agora.strftime("%Y%m%dT%H%M%S%fZ")
        base = f"{agora.strftime('%Y%m%d')}/{quando}_{evento}"
        meta = {"evento": evento, "quando": quando, **info}
        if arquivo is not None:
            meta["tamanho_bytes"] = len(arquivo)
            meta["sha256"] = hashlib.sha256(arquivo).hexdigest()
            meta["arquivo"] = f"{base.rsplit('/', 1)[1]}.xlsx"
            _subir(share, f"{base}.xlsx", arquivo)
        _subir(
            share,
            f"{base}.json",
            json.dumps(meta, ensure_ascii=False, indent=2, default=str).encode("utf-8"),
        )
    except Exception as e:  # diagnóstico nunca derruba a requisição
        print(f"[diagnostico] falhou ao gravar {evento}: {e}", flush=True)
