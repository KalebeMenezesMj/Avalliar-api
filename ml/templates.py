# -*- coding: utf-8 -*-
"""Definição dos templates de planilha: reconhecimento e mapeamento de células."""
import unicodedata

# template_id -> nome amigável
TEMPLATES = {
    "v22_unidades_isoladas": "Homogeneização — Unidades Isoladas (V22)",
    "v25_unidades_padronizadas": "Homogeneização — Unidades Padronizadas (V25)",
}

# Onde cada campo canônico deve ser ESCRITO, por template.
# Formato: { campo: ("nome_da_aba", "célula") }
# (reverse-engineered da estrutura real de cada planilha)
CELL_MAP = {
    "v22_unidades_isoladas": {
        "cliente": ("XXX - Dados Laudo", "P6"),
        "numero_proposta": ("XXX - Dados Laudo", "P8"),
        "tipo_laudo": ("XXX - Dados Laudo", "P11"),
        "engenheiro_responsavel": ("XXX - Dados Laudo", "P15"),
    },
    "v25_unidades_padronizadas": {
        "numero_proposta": ("DADOS DO IMÓVEL", "D2"),
        "cliente": ("DADOS DO IMÓVEL", "D6"),
        "tipo_laudo": ("DADOS DO IMÓVEL", "D8"),
        "matricula": ("DADOS DO IMÓVEL", "D10"),
        "tipologia": ("DADOS DO IMÓVEL", "D12"),
        "unidade": ("DADOS DO IMÓVEL", "D14"),
        "andar": ("DADOS DO IMÓVEL", "D16"),
        "bloco_torre": ("DADOS DO IMÓVEL", "D18"),
        "empreendimento": ("DADOS DO IMÓVEL", "D20"),
        "tipo_endereco": ("DADOS DO IMÓVEL", "D22"),
        "endereco": ("DADOS DO IMÓVEL", "D24"),
        "numero": ("DADOS DO IMÓVEL", "D26"),
        "bairro": ("DADOS DO IMÓVEL", "D28"),
        "cidade": ("DADOS DO IMÓVEL", "D30"),
        "uf": ("DADOS DO IMÓVEL", "D32"),
        "cep": ("DADOS DO IMÓVEL", "D34"),
        "latitude": ("DADOS DO IMÓVEL", "D36"),
        "longitude": ("DADOS DO IMÓVEL", "D38"),
        "area_privativa": ("DADOS DO IMÓVEL", "D40"),
    },
}


def normalize(text):
    """Minúsculas + remoção de acentos (torna o modelo robusto a variações)."""
    text = str(text).lower()
    text = unicodedata.normalize("NFD", text)
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def fingerprint(workbook):
    """Assinatura de um workbook: nomes das abas normalizados e ordenados."""
    return " ".join(sorted(normalize(n) for n in workbook.sheetnames))
