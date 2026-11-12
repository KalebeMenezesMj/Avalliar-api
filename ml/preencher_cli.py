# -*- coding: utf-8 -*-
"""Script CLI para preenchimento de templates de planilha com Machine Learning.
Lê JSON da entrada padrão (stdin) ou arquivo de parâmetro e gera a planilha preenchida em base64.
"""
import base64
import json
import os
import sys
import tempfile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

import fill as filler
import templates

TEMPLATE_FILES = {
    "v22_unidades_isoladas": "Homogeneização_Unidades Isoladas_2025_V22.xlsx",
    "v25_unidades_padronizadas": "Homogeneização_unidades padronizadas_2026_V25.xlsm",
}


def preencher(payload: dict) -> dict:
    template_id = payload.get("template_id") or payload.get("templateId") or "v22_unidades_isoladas"
    dados = payload.get("dados") or {}
    arquivo_path = payload.get("arquivo_path")

    if arquivo_path and os.path.exists(arquivo_path):
        tpl_path = arquivo_path
        filename = os.path.basename(arquivo_path)
    else:
        filename = TEMPLATE_FILES.get(template_id, TEMPLATE_FILES["v22_unidades_isoladas"])
        tpl_path = os.path.join(BASE_DIR, "data", "templates", filename)

    if not os.path.exists(tpl_path):
        raise FileNotFoundError(f"Template não encontrado: {tpl_path}")

    ext = os.path.splitext(filename)[1]
    fd, out = tempfile.mkstemp(suffix=ext)
    os.close(fd)
    try:
        tid, written = filler.fill(tpl_path, dados, out)
        with open(out, "rb") as fh:
            b64 = base64.b64encode(fh.read()).decode("ascii")
        return {
            "template_id": tid,
            "nome_arquivo": filename,
            "campos_preenchidos": len(written),
            "conteudo_base64": b64,
            "campos_detalhes": [
                {"campo": c[0], "aba": c[1], "celula": c[2], "valor": str(c[3])} for c in written
            ],
        }
    finally:
        if os.path.exists(out):
            try:
                os.unlink(out)
            except Exception:
                pass


def main():
    if len(sys.argv) > 1 and sys.argv[1] != "-":
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            payload = json.load(f)
    else:
        payload = json.load(sys.stdin)

    res = preencher(payload)
    # Imprime apenas o JSON resultante
    sys.stdout.write(json.dumps(res, ensure_ascii=False))


if __name__ == "__main__":
    main()

