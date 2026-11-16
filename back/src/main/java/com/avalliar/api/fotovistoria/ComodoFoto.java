package com.avalliar.api.fotovistoria;

/**
 * Cômodo ou área fotografada no relatório. Lista provisória: confirmar com o time
 * (o ML só precisa da ordem e do cômodo para montar o relatório).
 */
public enum ComodoFoto {
    // Identificação e entorno
    FACHADA,
    ENTORNO,

    // Áreas internas sociais
    SALA_ESTAR,
    SALA_JANTAR,
    HALL_ENTRADA,
    CORREDOR,
    ESCRITORIO,

    // Dormitórios
    QUARTO,
    SUITE,
    CLOSET,

    // Banheiros
    BANHEIRO_SOCIAL,
    BANHEIRO_SUITE,
    LAVABO,

    // Cozinha e serviço
    COZINHA,
    COPA,
    DESPENSA,
    AREA_SERVICO,
    LAVANDERIA,

    // Áreas externas e lazer
    VARANDA_SACADA,
    QUINTAL_JARDIM,
    AREA_GOURMET,
    PISCINA,
    AREA_LAZER,

    // Garagem
    GARAGEM,

    // Áreas comuns (condomínio)
    PORTARIA,
    ELEVADOR,
    ESCADA_CIRCULACAO,
    SALAO_FESTAS,
    ACADEMIA,
    PLAYGROUND,
    GARAGEM_COMUM,
    COBERTURA_TELHADO,
    CAIXA_DAGUA,

    // Instalações
    QUADRO_ELETRICO,
    INSTALACAO_HIDRAULICA,
    INSTALACAO_GAS,

    // Outros
    OUTROS
}
