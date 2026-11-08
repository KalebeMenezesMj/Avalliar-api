# -*- coding: utf-8 -*-
"""RAG leve (BM25 offline) — consulta as tabelas de referência e os laudos.

Extrai chunks com contexto e fonte, indexa com BM25 e responde consultas
devolvendo os trechos mais relevantes COM a fonte (arquivo/aba/célula).

Uso:
    python rag.py --build                  # (re)constrói o corpus
    python rag.py "qual o R8N de Sao Paulo?"
    python rag.py "laudos de casa em Praia Grande"
"""
import glob
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import openpyxl
from rank_bm25 import BM25Okapi

BASE = os.path.dirname(os.path.abspath(__file__))
V22 = os.path.join(BASE, "data", "templates",
                   "Homogeneização_Unidades Isoladas_2025_V22.xlsx")
LAUDOS_GLOB = r"C:/Users/Kalebe/Desktop/2025/*/Concluidos/*/*-Homo-*.xlsx"
CACHE_DIR = os.path.join(BASE, "data", "rag")


def _norm(text):
    text = str(text).lower()
    text = unicodedata.normalize("NFD", text)
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def _tokenize(text):
    return re.findall(r"[a-z0-9]+", _norm(text))


def _tabela_chunks():
    """Tabela CUB/R8N por estado do template V22 (F41:G68)."""
    wb = openpyxl.load_workbook(V22, data_only=False)
    ws = wb["XXX - Dados Laudo"]
    chunks = []
    for r in range(42, 69):
        uf = ws.cell(row=r, column=6).value     # F
        valor = ws.cell(row=r, column=7).value  # G
        data = ws.cell(row=r, column=8).value   # H
        if uf and valor is not None:
            chunks.append({
                "tipo": "tabela",
                "texto": f"CUB/R8N {uf}: R$ {valor}/m² (competência {data})",
                "fonte": f"V22 · XXX - Dados Laudo!F{r}:H{r}",
            })
    wb.close()
    return chunks


def _laudo_chunks(max_laudos=60):
    chunks = []
    for path in sorted(glob.glob(LAUDOS_GLOB))[:max_laudos]:
        try:
            wb = openpyxl.load_workbook(path, data_only=True)
            ws = wb["XXX - Dados Laudo"]
            cliente = ws["P6"].value
            numero = ws["P8"].value
            tipo = ws["P11"].value
            desc = ws["B18"].value
            wb.close()
            texto = f"Laudo {numero}: {cliente} — {tipo}. {desc or ''}"
            chunks.append({
                "tipo": "laudo",
                "texto": texto,
                "fonte": os.path.basename(path),
            })
        except Exception as e:  # noqa: BLE001
            print(f"  [aviso] {os.path.basename(path)}: {e}")
    return chunks


def build_corpus():
    chunks = _tabela_chunks() + _laudo_chunks()
    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(os.path.join(CACHE_DIR, "corpus.json"), "w", encoding="utf-8") as fh:
        json.dump(chunks, fh, ensure_ascii=False, indent=2)
    return chunks


def load_corpus():
    path = os.path.join(CACHE_DIR, "corpus.json")
    if not os.path.exists(path):
        return build_corpus()
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def search(query, k=5):
    chunks = load_corpus()
    tokenized = [_tokenize(c["texto"]) for c in chunks]
    bm25 = BM25Okapi(tokenized)
    scores = bm25.get_scores(_tokenize(query))
    ranked = sorted(range(len(chunks)), key=lambda i: -scores[i])[:k]
    return [(chunks[i], scores[i]) for i in ranked if scores[i] > 0]


def responder(query, k=4):
    """Resposta em texto: usa um LLM (Claude) se houver chave; senão, extrativa."""
    resultados = search(query, k)
    if not resultados:
        return "Não encontrei nada no acervo sobre isso."

    contexto = "\n".join(f"- {c['texto']} [fonte: {c['fonte']}]" for c, _ in resultados)
    via_llm = _llm(query, contexto)
    if via_llm:
        return via_llm
    return _resposta_extrativa(resultados)


def _llm(query, contexto):
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None
    try:
        import anthropic
        client = anthropic.Anthropic()
        msg = client.messages.create(
            model="claude-sonnet-5",
            max_tokens=300,
            messages=[{"role": "user",
                       "content": f"Responda a pergunta usando APENAS o contexto abaixo, "
                                  f"citando a fonte.\n\nContexto:\n{contexto}\n\nPergunta: {query}"}],
        )
        return msg.content[0].text
    except Exception:
        return None


def _resposta_extrativa(resultados):
    linhas = [f"- {c['texto']}" for c, _ in resultados[:3]]
    fontes = [c['fonte'] for c, _ in resultados[:3]]
    return ("Resposta extrativa (sem LLM configurado):\n" + "\n".join(linhas)
            + "\n\nFontes:\n" + "\n".join(f"  - {f}" for f in fontes))


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("--build", "-b"):
        n = len(build_corpus())
        print(f"Corpus construído: {n} chunks")
        return

    query = " ".join(sys.argv[1:])
    resultados = search(query)
    if not resultados:
        print("Nada encontrado.")
        return
    for chunk, score in resultados:
        print(f"[{score:.2f}] {chunk['texto']}")
        print(f"        fonte: {chunk['fonte']}\n")


if __name__ == "__main__":
    main()
