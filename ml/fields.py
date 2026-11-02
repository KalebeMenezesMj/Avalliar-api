# -*- coding: utf-8 -*-
"""Campos canônicos do Avalliar e exemplos de treino do mapeador de campos.

Os campos canônicos alinham o `campo_canonico` do schema.sql com os rótulos
reais encontrados nas planilhas de homogeneização (V22 e V25).
"""

CANONICAL_FIELDS = [
    "cliente", "numero_proposta", "tipo_laudo", "engenheiro_responsavel",
    "matricula", "tipologia", "unidade", "andar", "bloco_torre",
    "empreendimento", "tipo_endereco", "endereco", "numero", "bairro",
    "cidade", "uf", "cep", "latitude", "longitude",
    "area_privativa", "valor_avaliacao", "estado_conservacao",
    "idade_aparente", "vida_util", "dormitorios", "vagas",
]

# Pares (rótulo encontrado na planilha, campo canônico) usados para treinar o
# classificador que "aprende a entender" o que cada rótulo significa.
# Quanto mais variações, mais o modelo generaliza para rótulos nunca vistos.
TRAINING_PAIRS = [
    # cliente
    ("CLIENTE", "cliente"),
    ("Cliente", "cliente"),
    ("NOME DO CLIENTE", "cliente"),
    ("Solicitante", "cliente"),
    ("CONTRATANTE", "cliente"),
    # numero_proposta
    ("N° DA PROPOSTA", "numero_proposta"),
    ("PROPOSTA Nº", "numero_proposta"),
    ("PROPOSTA", "numero_proposta"),
    ("Nº DA PROPOSTA", "numero_proposta"),
    # tipo_laudo
    ("TIPO DE LAUDO", "tipo_laudo"),
    ("TIPO DE LAUDO:", "tipo_laudo"),
    ("TIPO DE AVALIAÇÃO", "tipo_laudo"),
    # engenheiro_responsavel
    ("Engº Responsável", "engenheiro_responsavel"),
    ("ENGENHEIRO RESPONSÁVEL", "engenheiro_responsavel"),
    ("Responsável Técnico", "engenheiro_responsavel"),
    # matricula
    ("MATRÍCULA", "matricula"),
    ("Matrícula do imóvel", "matricula"),
    ("MATRICULA", "matricula"),
    # tipologia
    ("Tipologia", "tipologia"),
    ("TIPOLOGIA", "tipologia"),
    ("Tipo do imóvel", "tipologia"),
    # unidade
    ("Nº DA UNIDADE", "unidade"),
    ("UNIDADE", "unidade"),
    ("Número da unidade", "unidade"),
    # andar
    ("ANDAR", "andar"),
    ("Andar", "andar"),
    # bloco_torre
    ("BLOCO OU TORRE", "bloco_torre"),
    ("BLOCO", "bloco_torre"),
    ("TORRE", "bloco_torre"),
    # empreendimento
    ("NOME DO EMPREENDIMENTO", "empreendimento"),
    ("EMPREENDIMENTO", "empreendimento"),
    # tipo_endereco
    ("TIPO DE ENDEREÇO", "tipo_endereco"),
    ("TIPO DE LOGRADOURO", "tipo_endereco"),
    # endereco
    ("ENDEREÇO", "endereco"),
    ("ENDEREÇO:", "endereco"),
    ("Logradouro", "endereco"),
    ("Endereço do imóvel", "endereco"),
    # numero
    ("NÚMERO", "numero"),
    ("NÚMERO:", "numero"),
    ("Número do imóvel", "numero"),
    # bairro
    ("BAIRRO", "bairro"),
    ("Bairro", "bairro"),
    # cidade
    ("CIDADE", "cidade"),
    ("Cidade", "cidade"),
    ("Município", "cidade"),
    # uf
    ("UF", "uf"),
    ("UF:", "uf"),
    ("Estado", "uf"),
    ("ESTADO", "uf"),
    # cep
    ("CEP", "cep"),
    ("CEP:", "cep"),
    ("Código postal", "cep"),
    # latitude
    ("LATITUDE", "latitude"),
    ("LATITUDE:", "latitude"),
    ("Lat", "latitude"),
    # longitude
    ("LONGITUDE", "longitude"),
    ("LONGITUDE:", "longitude"),
    ("Long", "longitude"),
    # area_privativa
    ("ÁREA PRIVATIVA DE APARTAMENTO", "area_privativa"),
    ("área privativa (m²)", "area_privativa"),
    ("ÁREA PRIVATIVA", "area_privativa"),
    ("ÁREA ÚTIL", "area_privativa"),
    ("Área privativa", "area_privativa"),
    # valor_avaliacao
    ("VALOR", "valor_avaliacao"),
    ("Valor do Imóvel", "valor_avaliacao"),
    ("Valor de avaliação", "valor_avaliacao"),
    ("Valor de mercado", "valor_avaliacao"),
    # estado_conservacao
    ("ESTADO DE CONSERVAÇÃO", "estado_conservacao"),
    ("Estado de conservação", "estado_conservacao"),
    ("Conservação", "estado_conservacao"),
    # idade_aparente
    ("IDADE APARENTE", "idade_aparente"),
    ("Idade aparente", "idade_aparente"),
    # vida_util
    ("VIDA ÚTIL", "vida_util"),
    ("Vida útil", "vida_util"),
    # dormitorios
    ("NÚMERO DE DORMITs", "dormitorios"),
    ("DORMITÓRIOS", "dormitorios"),
    ("Dormitórios", "dormitorios"),
    ("Quartos", "dormitorios"),
    # vagas
    ("Nº VAGAS", "vagas"),
    ("VAGAS", "vagas"),
    ("Vagas de garagem", "vagas"),
]
