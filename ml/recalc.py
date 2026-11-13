# -*- coding: utf-8 -*-
"""Grava os valores CALCULADOS das fórmulas na planilha preenchida.

O openpyxl salva fórmulas sem resultado (<v></v>). No Excel elas recalculam ao abrir,
mas qualquer visualizador sem motor de cálculo mostra as abas de fórmulas
(Custo01, Custo02, INSPECTOS, Comparativo...) em branco.

Aqui o LibreOffice (headless) calcula uma cópia e os resultados são injetados, como
valor em cache, no arquivo ORIGINAL (nada é regravado pelo LibreOffice, então imagens,
macros e formatação do arquivo do openpyxl ficam como estão). `fullCalcOnLoad` continua
ligado: o Excel recalcula de novo ao abrir.
"""
import os
import re
import shutil
import subprocess
import tempfile
import zipfile
from xml.sax.saxutils import escape

import openpyxl

TIMEOUT = int(os.getenv("RECALC_TIMEOUT", "240"))

_CELULA = re.compile(r'<c r="([A-Z]+[0-9]+)"([^>]*)>(<f[^>]*?(?:/>|>.*?</f>))<v\s*/>|'
                     r'<c r="([A-Z]+[0-9]+)"([^>]*)>(<f[^>]*?(?:/>|>.*?</f>))<v></v>', re.S)


def soffice():
    return shutil.which("soffice") or shutil.which("libreoffice")


def disponivel():
    return soffice() is not None


_PERFIL = """<?xml version="1.0" encoding="UTF-8"?>
<oor:items xmlns:oor="http://openoffice.org/2001/registry" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<item oor:path="/org.openoffice.Setup/L10N"><prop oor:name="ooSetupSystemLocale" oor:op="fuse"><value>pt-BR</value></prop></item>
<item oor:path="/org.openoffice.Setup/L10N"><prop oor:name="ooLocale" oor:op="fuse"><value>pt-BR</value></prop></item>
<item oor:path="/org.openoffice.Office.Calc/Formula/Load"><prop oor:name="OOXMLRecalcMode" oor:op="fuse"><value>0</value></prop></item>
<item oor:path="/org.openoffice.Office.Calc/Formula/Load"><prop oor:name="ODFRecalcMode" oor:op="fuse"><value>0</value></prop></item>
</oor:items>
"""


# O Excel nunca considera booleano igual a número (FALSE=0 é FALSE); o LibreOffice sim.
# A V22 usa IF(ISBLANK(x)=0,...) em Custo01 e só funciona com a semântica do Excel.
_BOOL_IGUAL_ZERO = re.compile(r"ISBLANK\(([^()<>]*)\)=0")


def _copia_semantica_excel(origem, destino):
    with zipfile.ZipFile(origem) as zin, zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            dados = zin.read(item.filename)
            if item.filename.startswith("xl/worksheets/") and item.filename.endswith(".xml"):
                dados = _BOOL_IGUAL_ZERO.sub("FALSE", dados.decode("utf-8")).encode("utf-8")
            zout.writestr(item, dados)


def _calcular(path):
    """Converte para xlsx pelo LibreOffice (recalcula tudo) e devolve o workbook com valores."""
    exe = soffice()
    with tempfile.TemporaryDirectory() as tmp:
        origem = os.path.join(tmp, "entrada" + os.path.splitext(path)[1].lower())
        _copia_semantica_excel(path, origem)
        saida = os.path.join(tmp, "saida")
        os.makedirs(saida)
        # As planilhas são do Excel em pt-BR: texto de número ("1913,5"), datas e TEXT() dependem do idioma.
        user = os.path.join(tmp, "perfil", "user")
        os.makedirs(user)
        with open(os.path.join(user, "registrymodifications.xcu"), "w", encoding="utf-8") as fh:
            fh.write(_PERFIL)
        subprocess.run(
            [exe, "--headless", "--norestore", f"-env:UserInstallation=file://{tmp.replace(os.sep, '/')}/perfil",
             "--convert-to", "xlsx:Calc MS Excel 2007 XML", "--outdir", saida, origem],
            check=True, capture_output=True, timeout=TIMEOUT)
        gerado = os.path.join(saida, "entrada.xlsx")
        if not os.path.exists(gerado):
            raise RuntimeError("LibreOffice não gerou o arquivo recalculado")
        wb = openpyxl.load_workbook(gerado, data_only=True)
        return {ws.title: {c.coordinate: c.value for row in ws.iter_rows() for c in row if c.value is not None}
                for ws in wb.worksheets}


def _mapa_abas(z):
    """nome da aba -> caminho do XML dentro do zip."""
    wb = z.read("xl/workbook.xml").decode("utf-8")
    rels = z.read("xl/_rels/workbook.xml.rels").decode("utf-8")
    alvo = {}
    for m in re.finditer(r"<Relationship\b[^>]*>", rels):
        tag = m.group(0)
        i = re.search(r'Id="([^"]+)"', tag)
        t = re.search(r'Target="([^"]+)"', tag)
        if i and t:
            alvo[i.group(1)] = t.group(1)
    abas = {}
    for m in re.finditer(r"<sheet\b[^>]*>", wb):
        tag = m.group(0)
        nome = re.search(r'name="([^"]*)"', tag)
        rid = re.search(r'r:id="([^"]+)"', tag)
        if nome and rid and rid.group(1) in alvo:
            t = alvo[rid.group(1)]
            t = t.lstrip("/") if t.startswith("/") else "xl/" + t
            from html import unescape
            abas[unescape(nome.group(1))] = t
    return abas


def _valor_xml(v):
    """(atributo_t, texto) para o cache da célula, ou None se não há valor."""
    if v is None:
        return None
    if isinstance(v, bool):
        return ' t="b"', "1" if v else "0"
    if isinstance(v, (int, float)):
        return "", repr(float(v)) if isinstance(v, float) else str(v)
    if hasattr(v, "isoformat"):
        from openpyxl.utils.datetime import to_excel
        return "", repr(float(to_excel(v)))
    s = str(v)
    if s.startswith("#"):
        return ' t="e"', escape(s)
    return ' t="str"', escape(s)


def injetar(path, valores):
    """Reescreve `path` com o cache <v> preenchido. Devolve (fórmulas, preenchidas)."""
    total = ok = 0
    tmp = path + ".tmp"
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        abas = _mapa_abas(zin)
        por_arquivo = {arq: nome for nome, arq in abas.items()}
        for item in zin.infolist():
            dados = zin.read(item.filename)
            nome = por_arquivo.get(item.filename)
            if nome is not None:
                vals = valores.get(nome, {})
                texto = dados.decode("utf-8")

                def troca(m):
                    nonlocal total, ok
                    total += 1
                    ref, attrs, f = (m.group(1), m.group(2), m.group(3)) if m.group(1) else (m.group(4), m.group(5), m.group(6))
                    xml = _valor_xml(vals.get(ref))
                    if xml is None:
                        return m.group(0)
                    ok += 1
                    attrs = re.sub(r'\s+t="[^"]*"', "", attrs)
                    return f'<c r="{ref}"{attrs}{xml[0]}>{f}<v>{xml[1]}</v>'

                texto = _CELULA.sub(troca, texto)
                dados = texto.encode("utf-8")
            zout.writestr(item, dados)
    os.replace(tmp, path)
    return total, ok


def preencher_cache(path):
    """Calcula e grava os valores em cache. Devolve um aviso (str) se não foi possível."""
    if not disponivel():
        return "Valores calculados não gravados (LibreOffice indisponível): abra a planilha no Excel para recalcular."
    try:
        valores = _calcular(path)
        total, ok = injetar(path, valores)
        return None if ok else f"Nenhum valor calculado pôde ser gravado ({total} fórmulas)."
    except Exception as e:  # nunca derruba o preenchimento
        return f"Valores calculados não gravados ({type(e).__name__}): abra a planilha no Excel para recalcular."
