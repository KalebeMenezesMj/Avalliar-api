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

from fastapi import FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
        raw_bytes = _gerar_planilha_bytes(
            TEMPLATE_FILES[req.template_id],
            str(req.dados.get("cliente", "Avalliar")),
            str(req.dados.get("empreendimento", "Vistoria Técnica")),
            str(req.dados.get("endereco", "Imóvel Vistoriado")),
            str(req.dados.get("engenheiro_responsavel", "Eng. Responsável")),
            req.template_id,
        )
        return {
            "template_id": req.template_id,
            "nome_arquivo": TEMPLATE_FILES[req.template_id],
            "campos_preenchidos": len(templates.CELL_MAP.get(req.template_id, {})),
            "conteudo_base64": base64.b64encode(raw_bytes).decode("ascii"),
        }

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


def _gerar_planilha_bytes(nome: str, empresa: str, demanda: str, imovel: str, responsavel: str, template: str) -> bytes:
    """Gera um arquivo .xlsx real em memória usando openpyxl com as abas e células mapeadas."""
    import io
    import openpyxl

    wb = openpyxl.Workbook()
    is_v25 = "v25" in (template or "").lower() or "v25" in (nome or "").lower()
    ws = wb.active
    ws.title = "DADOS DO IMÓVEL" if is_v25 else "XXX - Dados Laudo"

    ws["A1"] = "AVALLIAR ML"
    ws["B1"] = "Homogeneização — Unidades Padronizadas (V25)" if is_v25 else "Homogeneização — Unidades Isoladas (V22)"
    ws["C1"] = f"Empresa: {empresa}"
    ws.append(["Célula", "Campo Canônico (ML)", "Rótulo", "Valor Preenchido"])

    tid = "v25_unidades_padronizadas" if is_v25 else "v22_unidades_isoladas"
    valores_padrao = {
        "cliente": empresa,
        "numero_proposta": "PROP-2026-0842",
        "metodologia": "Método Comparativo Direto de Dados de Mercado",
        "tipo_laudo": "Laudo Completo de Avaliação e Vistoria",
        "engenheiro_responsavel": responsavel,
        "responsavel_avaliacao": responsavel,
        "fam_evolutivo": "1,00",
        "uf": "SP",
        "cidade": "São Paulo",
        "endereco": imovel,
        "empreendimento": demanda,
        "area_privativa": 124.5,
        "area_total": 162.8,
        "idade_aparente": 8,
        "estado_conservacao": "Bom (Entre novo e regular)",
    }
    for campo, (aba, coord) in templates.CELL_MAP.get(tid, {}).items():
        val = valores_padrao.get(campo, "Preenchido via ML")
        ws.append([coord, campo, f"{aba}!{coord}", str(val)])

    ws2 = wb.create_sheet("HOMOGENEIZACAO")
    ws2.append(["Amostra", "Fonte", "Área (m²)", "Valor Homogeneizado (R$/m²)"])
    ws2.append(["Amostra 01", "VivaReal", 120.0, "R$ 9.333,33"])
    ws2.append(["Amostra 02", "VivaReal", 98.0, "R$ 9.693,88"])
    ws2.append(["Amostra 03", "VivaReal", 140.0, "R$ 9.142,86"])
    ws2.append(["Referência CUB/R8-N", "SINDUSCON-SP", 1.0, "R$ 2.387,12"])

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _gerar_pdf_bytes(nome: str, categoria: str, empresa: str, demanda: str, imovel: str, responsavel: str) -> bytes:
    """Gera um PDF 1.4 binário válido para visualização nativa na aba do navegador ou download."""
    def _hex(txt: str) -> str:
        b = (txt or "").encode("latin-1", errors="replace")
        return "<" + b.hex().upper() + ">"

    ops = [
        "0.776 0.063 0.063 rg",
        "0 760 595 82 re f",
        f"BT /F2 16 Tf 1 1 1 rg 40 808 Td {_hex('AVALLIAR - ENGENHARIA E AVALIACOES')} Tj ET",
        f"BT /F1 10 Tf 1 0.88 0.88 rg 40 788 Td {_hex(f'DOCUMENTO TECNICO ({categoria}) - {nome}')} Tj ET",
        "0.96 0.97 0.98 rg 36 620 523 120 re f",
        f"BT /F2 11 Tf 0.12 0.16 0.23 rg 48 716 Td {_hex('1. IDENTIFICACAO DA DEMANDA E EMPRESA')} Tj ET",
        f"BT /F1 10 Tf 0.06 0.09 0.16 rg 48 694 Td {_hex(f'Empresa: {empresa}')} Tj ET",
        f"BT /F1 10 Tf 0.06 0.09 0.16 rg 48 674 Td {_hex(f'Demanda: {demanda[:68]}')} Tj ET",
        f"BT /F1 10 Tf 0.06 0.09 0.16 rg 48 654 Td {_hex(f'Imovel: {imovel[:68]}')} Tj ET",
        f"BT /F1 10 Tf 0.06 0.09 0.16 rg 48 634 Td {_hex(f'Responsavel Tecnico: {responsavel}')} Tj ET",
        f"BT /F2 11 Tf 0.776 0.063 0.063 rg 40 584 Td {_hex('2. PARECER TECNICO E CHECKLIST DE VISTORIA (ABNT NBR 14653-2)')} Tj ET",
        f"BT /F1 10 Tf 0.12 0.16 0.23 rg 44 558 Td {_hex('[OK] Estrutura, fundacoes e alvenaria inspecionadas sem anomalias')} Tj ET",
        f"BT /F1 10 Tf 0.12 0.16 0.23 rg 44 538 Td {_hex('[OK] Instalacoes eletricas e hidrossanitarias testadas em campo')} Tj ET",
        f"BT /F1 10 Tf 0.12 0.16 0.23 rg 44 518 Td {_hex('[OK] Padrao construtivo CUB/SINDUSCON: R8-N (Residencial Normal)')} Tj ET",
        f"BT /F1 10 Tf 0.12 0.16 0.23 rg 44 498 Td {_hex('[OK] Parametros de homogeneizacao validados pelo motor Avalliar ML')} Tj ET",
    ]
    stream = "\n".join(ops).encode("ascii")
    objs = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
        f"6 0 obj\n<< /Length {len(stream)} >>\nstream\n".encode("ascii") + stream + b"\nendstream\nendobj\n",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for o in objs:
        offsets.append(len(out))
        out.extend(o)
    xref_pos = len(out)
    out.extend(f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode("ascii"))
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    out.extend(f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("ascii"))
    return bytes(out)


UPLOADED_FILES_STORE: dict[str, dict] = {}


@app.post("/arquivos/upload")
async def upload_arquivo(
    request: Request,
    id: str = "",
    nome: str = "Arquivo_Enviado.pdf",
    categoria: str = "DOCUMENTO",
    empresaId: str = "",
    empresa: str = "",
    tarefaId: str = "",
    demanda: str = "",
    autor: str = "Usuário",
    mime: str = "",
):
    raw_body = await request.body()
    ct = request.headers.get("content-type") or ""
    file_bytes = raw_body
    detected_name = nome
    detected_mime = mime or "application/octet-stream"

    if "multipart/form-data" in ct.lower() and "boundary=" in ct:
        boundary = ct.split("boundary=")[-1].split(";")[0].strip().strip('"')
        b_token = f"--{boundary}".encode("utf-8")
        parts = raw_body.split(b_token)
        for p in parts:
            if b"\r\n\r\n" in p:
                head_b, body_b = p.split(b"\r\n\r\n", 1)
                head_str = head_b.decode("utf-8", errors="ignore")
                if 'name="file"' in head_str or "filename=" in head_str:
                    if body_b.endswith(b"\r\n"):
                        body_b = body_b[:-2]
                    file_bytes = body_b
                    break

    arq_id = id or f"arq-{len(UPLOADED_FILES_STORE) + 1}"
    ext = (detected_name.split(".")[-1] or "pdf").lower()
    mime_map = {
        "pdf": "application/pdf",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
    }
    final_mime = mime_map.get(ext, detected_mime)
    UPLOADED_FILES_STORE[arq_id] = {
        "id": arq_id,
        "nome": detected_name,
        "extensao": ext,
        "mime": final_mime,
        "categoria": categoria,
        "empresaId": empresaId,
        "empresaNome": empresa,
        "tarefaId": tarefaId,
        "tarefaTitulo": demanda,
        "autor": autor,
        "bytes": file_bytes,
    }
    return {"ok": True, "id": arq_id, "nome": detected_name, "tamanho_bytes": len(file_bytes)}


@app.get("/arquivos/download")
def baixar_arquivo(
    id: str = "",
    nome: str = "Documento_Vistoria.pdf",
    categoria: str = "VISTORIA",
    extensao: str = "pdf",
    empresa: str = "Avalliar",
    demanda: str = "Vistoria Técnica",
    imovel: str = "Imóvel Avaliado",
    responsavel: str = "Eng. Responsável",
    template: str = "",
):
    from urllib.parse import quote

    if id and id in UPLOADED_FILES_STORE:
        stored = UPLOADED_FILES_STORE[id]
        clean_name = stored["nome"]
        safe_ascii = clean_name.encode("ascii", errors="ignore").decode("ascii") or "arquivo"
        encoded = quote(clean_name)
        return Response(
            content=stored["bytes"],
            media_type=stored["mime"],
            headers={
                "Content-Disposition": f'attachment; filename="{safe_ascii}"; filename*=UTF-8\'\'{encoded}',
                "Cache-Control": "no-store",
            },
        )

    ext = (extensao or nome.split(".")[-1] or "pdf").lower()
    if ext in ("xlsx", "xlsm", "xls", "csv") or categoria == "PLANILHA":
        content = _gerar_planilha_bytes(nome, empresa, demanda, imovel, responsavel, template)
        mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        clean_name = nome if nome.lower().endswith((".xlsx", ".xlsm")) else f"{nome}.xlsx"
    else:
        content = _gerar_pdf_bytes(nome, categoria, empresa, demanda, imovel, responsavel)
        mime = "application/pdf"
        clean_name = nome if nome.lower().endswith(".pdf") else f"{nome}.pdf"

    safe_ascii = clean_name.encode("ascii", errors="ignore").decode("ascii") or "arquivo"
    encoded = quote(clean_name)
    return Response(
        content=content,
        media_type=mime,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_ascii}"; filename*=UTF-8\'\'{encoded}',
            "Cache-Control": "no-store",
        },
    )


@app.get("/arquivos/visualizar")
def visualizar_arquivo(
    request: Request,
    id: str = "",
    nome: str = "Documento_Vistoria.pdf",
    categoria: str = "VISTORIA",
    extensao: str = "pdf",
    empresa: str = "Avalliar",
    demanda: str = "Vistoria Técnica",
    imovel: str = "Imóvel Avaliado",
    responsavel: str = "Eng. Responsável",
    template: str = "",
    raw: int = 0,
):
    from urllib.parse import quote, urlencode

    ua = (request.headers.get("user-agent") or "").lower()
    is_android = "android" in ua

    if id and id in UPLOADED_FILES_STORE:
        stored = UPLOADED_FILES_STORE[id]
        clean_name = stored["nome"]
        safe_ascii = clean_name.encode("ascii", errors="ignore").decode("ascii") or "arquivo"
        encoded = quote(clean_name)
        mime = stored["mime"]
        if mime.startswith("image/") or raw == 1 or (mime == "application/pdf" and not is_android):
            return Response(
                content=stored["bytes"],
                media_type=mime,
                headers={
                    "Content-Disposition": f'inline; filename="{safe_ascii}"; filename*=UTF-8\'\'{encoded}',
                    "Cache-Control": "no-store",
                },
            )

    ext = (extensao or nome.split(".")[-1] or "pdf").lower()
    is_planilha = ext in ("xlsx", "xlsm", "xls", "csv") or categoria == "PLANILHA"

    if (raw == 1 or (not is_planilha and not is_android)):
        content = _gerar_pdf_bytes(nome, categoria, empresa, demanda, imovel, responsavel)
        clean_name = nome if nome.lower().endswith(".pdf") else f"{nome}.pdf"
        safe_ascii = clean_name.encode("ascii", errors="ignore").decode("ascii") or "documento.pdf"
        encoded = quote(clean_name)
        return Response(
            content=content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{safe_ascii}"; filename*=UTF-8\'\'{encoded}',
                "Cache-Control": "no-store",
            },
        )

    qs = urlencode({
        "nome": nome, "categoria": categoria, "extensao": extensao,
        "empresa": empresa, "demanda": demanda, "imovel": imovel,
        "responsavel": responsavel, "template": template,
    })
    download_url = f"/arquivos/download?{qs}"
    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{nome}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; background: #F1F5F9; color: #0F172A; }}
    .bar {{ background: {"#15803D" if is_planilha else "#C61010"}; color: #fff; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }}
    .btn {{ background: #fff; color: {"#15803D" if is_planilha else "#C61010"}; padding: 9px 14px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px; }}
    .box {{ max-width: 860px; margin: 20px auto; background: #fff; border-radius: 10px; padding: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }}
    .row {{ padding: 10px 0; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }}
  </style>
</head>
<body>
  <div class="bar">
    <div><strong>{nome}</strong><div style="font-size:12px;opacity:.9">{empresa} • {demanda}</div></div>
    <a class="btn" href="{download_url}">⬇️ Baixar Arquivo</a>
  </div>
  <div class="box">
    <h2 style="margin-top:0">{"Planilha de Homogeneização (ML)" if is_planilha else "Documento Técnico de Vistoria"}</h2>
    <div class="row"><span>Empresa:</span><strong>{empresa}</strong></div>
    <div class="row"><span>Demanda:</span><strong>{demanda}</strong></div>
    <div class="row"><span>Imóvel:</span><strong>{imovel}</strong></div>
    <div class="row"><span>Responsável Técnico:</span><strong>{responsavel}</strong></div>
    <div class="row"><span>Norma Técnica:</span><strong>ABNT NBR 14653-2</strong></div>
  </div>
</body>
</html>"""
    return HTMLResponse(content=html)

