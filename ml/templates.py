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
        "metodologia": ("XXX - Dados Laudo", "P4"),
        "cliente": ("XXX - Dados Laudo", "P6"),
        "numero_proposta": ("XXX - Dados Laudo", "P8"),
        "tipo_laudo": ("XXX - Dados Laudo", "P11"),
        "engenheiro_responsavel": ("XXX - Dados Laudo", "P15"),
        "fam_evolutivo": ("XXX - Dados Laudo", "P18"),
        "uf": ("XXX - Dados Calc", "G1"),
        "cidade": ("XXX - Dados Calc", "G2"),
        "data_laudo": ("XXX - Dados Calc", "G3"),
    },
    # V25: rótulos na coluna B, VALORES na coluna C (confirmado pelas fórmulas
    # das demais abas, que referenciam 'DADOS DO IMÓVEL'!C*).
    "v25_unidades_padronizadas": {
        "numero_proposta": ("DADOS DO IMÓVEL", "C2"),
        "trata_se_pv": ("DADOS DO IMÓVEL", "C4"),
        "cliente": ("DADOS DO IMÓVEL", "C6"),
        "tipo_laudo": ("DADOS DO IMÓVEL", "C8"),
        "matricula": ("DADOS DO IMÓVEL", "C10"),
        "tipologia": ("DADOS DO IMÓVEL", "C12"),
        "unidade": ("DADOS DO IMÓVEL", "C14"),
        "andar": ("DADOS DO IMÓVEL", "C16"),
        "bloco_torre": ("DADOS DO IMÓVEL", "C18"),
        "empreendimento": ("DADOS DO IMÓVEL", "C20"),
        "tipo_endereco": ("DADOS DO IMÓVEL", "C22"),
        "endereco": ("DADOS DO IMÓVEL", "C24"),
        "numero": ("DADOS DO IMÓVEL", "C26"),
        "bairro": ("DADOS DO IMÓVEL", "C28"),
        "cidade": ("DADOS DO IMÓVEL", "C30"),
        "uf": ("DADOS DO IMÓVEL", "C32"),
        "cep": ("DADOS DO IMÓVEL", "C34"),
        "latitude": ("DADOS DO IMÓVEL", "C36"),
        "longitude": ("DADOS DO IMÓVEL", "C38"),
        "area_privativa": ("DADOS DO IMÓVEL", "C40"),
        "area_comum": ("DADOS DO IMÓVEL", "C42"),
        "area_total": ("DADOS DO IMÓVEL", "C44"),
        "fracao_ideal": ("DADOS DO IMÓVEL", "C46"),
        "idade_aparente": ("DADOS DO IMÓVEL", "C48"),
        "estado_conservacao": ("DADOS DO IMÓVEL", "C50"),
        "vagas": ("DADOS DO IMÓVEL", "C52"),
        "dormitorios": ("DADOS DO IMÓVEL", "C54"),
        "suites": ("DADOS DO IMÓVEL", "C56"),
        "banheiros": ("DADOS DO IMÓVEL", "C58"),
        "area_equivalente": ("DADOS DO IMÓVEL", "C61"),
        "responsavel_avaliacao": ("DADOS DO IMÓVEL", "C63"),
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
