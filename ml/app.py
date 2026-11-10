# -*- coding: utf-8 -*-
"""Serviço FastAPI que expõe o módulo de ML do Avalliar.

Como rodar:
    cd ml
    uvicorn app:app --host 0.0.0.0 --port 8000

Endpoints:
    GET  /health     -> status do serviço
    POST /reconhecer -> upload de um arquivo, retorna o template identificado
    POST /extrair    -> upload de um laudo + template, retorna {campo: valor}
    POST /preencher  -> {template_id, dados} -> planilha preenchida em base64
"""
import base64
import hmac
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from pydantic import BaseModel

import fill as filler
import templates

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(BASE_DIR, "data", "templates")

# template_id -> arquivo de modelo em data/templates/
TEMPLATE_FILES = {
    "v22_unidades_isoladas": "Homogeneização_Unidades Isoladas_2025_V22.xlsx",
    "v25_unidades_padronizadas": "Homogeneização_unidades padronizadas_2026_V25.xlsm",
}


def _blob_url(blob, filename):
    """Monta a URL de download do arquivo no Blob (aceita SAS token na env)."""
    from urllib.parse import quote
    filename = quote(filename)  # nomes têm acentos/espaços
    if "?" in blob:
        base, sas = blob.split("?", 1)
        return f"{base.rstrip('/')}/{filename}?{sas}"
    return f"{blob.rstrip('/')}/{filename}"


MODELS_DIR = os.path.join(BASE_DIR, "models")
# modelos que não são treinados no container (precisam das fotos dos laudos): vêm do Blob
ARTEFATOS = {"idade_model.joblib": MODELS_DIR}


def baixar_templates():
    """Baixa os templates e os modelos prontos do Blob (env TEMPLATES_BLOB) se faltarem localmente."""
    import urllib.request
    blob = os.getenv("TEMPLATES_BLOB")
    if not blob:
        return
    os.makedirs(TEMPLATES_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)
    alvos = [(f, TEMPLATES_DIR) for f in TEMPLATE_FILES.values()] + list(ARTEFATOS.items())
    for filename, pasta in alvos:
        dest = os.path.join(pasta, filename)
        if os.path.exists(dest):
            continue
        try:
            urllib.request.urlretrieve(_blob_url(blob, filename), dest)
            print(f"  [ok] {filename} baixado do Blob")
        except Exception as e:
            print(f"  [aviso] não baixou {filename}: {e}")


baixar_templates()

app = FastAPI(title="Avalliar ML", version="1.0.0")


class PreencherRequest(BaseModel):
    template_id: str
    dados: dict


def _salvar_upload(upload: UploadFile) -> str:
    """Salva o arquivo enviado num temporário e devolve o caminho."""
    ext = os.path.splitext(upload.filename or "")[1]
    fd, tmp = tempfile.mkstemp(suffix=ext)
    os.close(fd)
    with open(tmp, "wb") as fh:
        fh.write(upload.file.read())
    return tmp


@app.get("/health")
def health():
    import idade
    return {"status": "UP", "service": "avalliar-ml", "templates": list(TEMPLATE_FILES),
            "idade_aparente": idade.disponivel()}


@app.post("/reconhecer")
def reconhecer(file: UploadFile = File(...)):
    tmp = _salvar_upload(file)
    try:
        tid = filler.recognize(tmp)
    finally:
        os.unlink(tmp)
    return {"template_id": tid, "template_nome": templates.TEMPLATES.get(tid, tid)}


@app.post("/extrair")
def extrair(template_id: str, file: UploadFile = File(...)):
    if template_id not in templates.CELL_MAP:
        raise HTTPException(404, f"Template desconhecido: {template_id}")
    tmp = _salvar_upload(file)
    try:
        dados = filler.extract(template_id, tmp)
    finally:
        os.unlink(tmp)
    return {"template_id": template_id, "campos": dados}


@app.post("/preencher")
def preencher(req: PreencherRequest):
    if req.template_id not in TEMPLATE_FILES:
        raise HTTPException(404, f"Template desconhecido: {req.template_id}")

    template_path = os.path.join(TEMPLATES_DIR, TEMPLATE_FILES[req.template_id])
    if not os.path.exists(template_path):
        raise HTTPException(404, "Arquivo de template não encontrado no servidor")

    ext = os.path.splitext(TEMPLATE_FILES[req.template_id])[1]
    fd, out = tempfile.mkstemp(suffix=ext)
    os.close(fd)
    try:
        tid, escritos = filler.fill(template_path, req.dados, out)
        with open(out, "rb") as fh:
            b64 = base64.b64encode(fh.read()).decode("ascii")
        return {
            "template_id": tid,
            "nome_arquivo": TEMPLATE_FILES[req.template_id],
            "campos_preenchidos": len(escritos),
            "conteudo_base64": b64,
        }
    finally:
        os.unlink(out)


@app.post("/idade")
def idade_aparente(file: UploadFile = File(...)):
    """Estima a idade aparente (anos) do imóvel a partir de uma foto."""
    import idade

    if not idade.disponivel():
        raise HTTPException(503, "Modelo de idade aparente indisponível (idade_model.joblib não carregado).")
    anos = idade.prever(file.file.read())
    if anos is None:
        raise HTTPException(400, "Não foi possível ler a imagem enviada.")
    return {"idade_aparente_anos": round(anos, 1), "arquivo": file.filename}


@app.post("/retreinar")
def retreinar(forcar: bool = False, x_token: str = Header(default=None)):
    """Retreina com os dados atuais do banco e só promove o modelo se não piorar.

    Protegido por token: defina RETRAIN_TOKEN no ambiente e envie `X-Token`.
    """
    import retreino

    esperado = os.getenv("RETRAIN_TOKEN")
    if not esperado:
        raise HTTPException(503, "Retreino desabilitado: defina RETRAIN_TOKEN no ambiente.")
    if not x_token or not hmac.compare_digest(x_token, esperado):
        raise HTTPException(403, "Token inválido.")
    resultado = retreino.executar(forcar)
    if not resultado.get("ok"):
        raise HTTPException(409, resultado.get("motivo"))
    return resultado


@app.get("/metricas")
def metricas(n: int = 5):
    """Histórico das últimas avaliações no conjunto reservado."""
    import json

    caminho = os.path.join(MODELS_DIR, "metricas.json")
    if not os.path.exists(caminho):
        return {"historico": []}
    with open(caminho, encoding="utf-8") as fh:
        return {"historico": json.load(fh)[-n:]}


@app.get("/consultar")
def consultar(q: str, k: int = 5):
    """Consulta o acervo (tabelas de referência + laudos) com BM25 e fonte."""
    import rag

    resultados = rag.search(q, k)
    return {
        "consulta": q,
        "resultados": [
            {"texto": c["texto"], "fonte": c["fonte"], "score": round(float(s), 2)}
            for c, s in resultados
        ],
    }
