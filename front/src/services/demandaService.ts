import { userService, ClienteDTO } from './userService';

export type StatusEmpresa = 'SEM_PENDENCIAS' | 'COM_PENDENCIAS' | 'EM_ABERTO';
export type Urgencia = 'ALTA' | 'MEDIA' | 'BAIXA';
export type CategoriaArquivo = 'PLANILHA' | 'DOCUMENTO' | 'RELATORIO' | 'VISTORIA';

export interface ArquivoAnexo {
  id: string;
  nome: string;
  categoria: CategoriaArquivo;
  extensao: string;
  tamanho: string;
  dataUpload: string;
  autor: string;
  empresaId?: string;
  empresaNome?: string;
  tarefaId?: string;
  tarefaTitulo?: string;
  templateMl?: string;
  camposExtraidosMl?: Record<string, string | number>;
  conteudoBase64?: string;
  statusMl?: 'NAO_APLICAVEL' | 'PRONTA_ML' | 'RECONHECIDA' | 'PREENCHIDA_ML';
  webFile?: any;
  uriLocal?: string;
  mimeType?: string;
}

export interface TarefaDemanda {
  id: string;
  titulo: string;
  responsavel: string;
  urgencia: Urgencia;
  dataCriacao: string;
  concluida: boolean;
  dataConclusao?: string;
  imovelReferencia?: string;
  tipoVistoria?: string;
  endereco?: string;
  observacoes?: string;
  arquivos?: ArquivoAnexo[];
}

export interface EmpresaDemanda {
  id: string;
  nome: string;
  status: StatusEmpresa;
  quantidadePendentes: number;
  totalDemandas: number;
  descricao: string;
  contato: string;
}

export interface MetricasDashboard {
  totalDemandas: number;
  demandasConcluidas: number;
  demandasPendentes: number;
  taxaConclusao: number; // 0 a 100
  crescimentoPercentual: number;
  porUrgencia: {
    ALTA: { total: number; concluidas: number; pendentes: number };
    MEDIA: { total: number; concluidas: number; pendentes: number };
    BAIXA: { total: number; concluidas: number; pendentes: number };
  };
  porEmpresa: Array<{
    id: string;
    nome: string;
    total: number;
    concluidas: number;
    pendentes: number;
    taxaConclusao: number;
    totalArquivos: number;
    status: StatusEmpresa;
  }>;
  porResponsavel: Array<{
    nome: string;
    total: number;
    concluidas: number;
    pendentes: number;
    taxaConclusao: number;
  }>;
  arquivosResumo: {
    total: number;
    planilhas: number;
    documentos: number;
    relatorios: number;
    vistorias: number;
    processadosMl: number;
  };
  ultimasDemandas: Array<TarefaDemanda & { empresaNome: string; empresaId: string }>;
}

// Arquivos gerais por Empresa (relatórios, documentos de vistorias, laudos e planilhas da empresa)
const arquivosPorEmpresaStore: Record<string, ArquivoAnexo[]> = {
  // Doors LTDA
  '1': [
    {
      id: 'arq-emp-1-1',
      nome: 'Relatorio_Consolidado_Doors_Outubro.pdf',
      categoria: 'RELATORIO',
      extensao: 'pdf',
      tamanho: '2.1 MB',
      dataUpload: '29/Out',
      autor: 'Linux da Silva',
      empresaId: '1',
      empresaNome: 'Doors LTDA',
      statusMl: 'NAO_APLICAVEL',
    },
    {
      id: 'arq-emp-1-2',
      nome: 'Documento_Vistoria_Galpoes_Doors.pdf',
      categoria: 'VISTORIA',
      extensao: 'pdf',
      tamanho: '3.4 MB',
      dataUpload: '28/Out',
      autor: 'Ubuntu Gonçalves',
      empresaId: '1',
      empresaNome: 'Doors LTDA',
      statusMl: 'NAO_APLICAVEL',
    },
  ],
  // Constructor Hub
  '2': [
    {
      id: 'arq-emp-2-1',
      nome: 'Relatorio_Vistoria_Mensal_ConstructorHub.pdf',
      categoria: 'RELATORIO',
      extensao: 'pdf',
      tamanho: '2.4 MB',
      dataUpload: 'Hoje, 09:15',
      autor: 'Linux da Silva',
      empresaId: '2',
      empresaNome: 'Constructor Hub',
      statusMl: 'NAO_APLICAVEL',
    },
    {
      id: 'arq-emp-2-2',
      nome: 'Laudo_Vistoria_Cautelar_Bloco_A.pdf',
      categoria: 'VISTORIA',
      extensao: 'pdf',
      tamanho: '3.8 MB',
      dataUpload: 'Ontem, 16:40',
      autor: 'Ubuntu Gonçalves',
      empresaId: '2',
      empresaNome: 'Constructor Hub',
      statusMl: 'NAO_APLICAVEL',
    },
  ],
  // Clozeyes Imóveis
  '3': [
    {
      id: 'arq-emp-3-1',
      nome: 'Checklist_Vistoria_Locacao_Clozeyes.docx',
      categoria: 'VISTORIA',
      extensao: 'docx',
      tamanho: '512 KB',
      dataUpload: 'Hoje, 08:10',
      autor: 'Debian Silva',
      empresaId: '3',
      empresaNome: 'Clozeyes Imóveis',
      statusMl: 'NAO_APLICAVEL',
    },
  ],
  // Prime Imobiliária & Gestão
  '4': [
    {
      id: 'arq-emp-4-1',
      nome: 'Relatorio_Tecnico_Anual_Prime.pdf',
      categoria: 'RELATORIO',
      extensao: 'pdf',
      tamanho: '1.8 MB',
      dataUpload: 'Ontem',
      autor: 'Fedora Lima',
      empresaId: '4',
      empresaNome: 'Prime Imobiliária & Gestão',
      statusMl: 'NAO_APLICAVEL',
    },
  ],
};

// Armazenamento em memória das demandas por chave (id ou nome normalizado da empresa)
const demandasPorEmpresaStore: Record<string, TarefaDemanda[]> = {
  // Doors LTDA
  '1': [
    {
      id: 'd-1',
      titulo: 'Vistoria de saída no galpão logístico e checagem de portões.',
      responsavel: 'Ubuntu Gonçalves',
      urgencia: 'MEDIA',
      dataCriacao: '29/Out',
      concluida: true,
      dataConclusao: '29/Out, 17:00',
      imovelReferencia: 'Galpão 04 • Rod. Anhanguera',
      arquivos: [
        {
          id: 'arq-d1-1',
          nome: 'Homogeneização_Unidades Isoladas_2025_V22.xlsx',
          categoria: 'PLANILHA',
          extensao: 'xlsx',
          tamanho: '640 KB',
          dataUpload: '29/Out',
          autor: 'Ubuntu Gonçalves',
          empresaId: '1',
          empresaNome: 'Doors LTDA',
          tarefaId: 'd-1',
          templateMl: 'v22_unidades_isoladas',
          statusMl: 'PREENCHIDA_ML',
        },
        {
          id: 'arq-d1-2',
          nome: 'Relatorio_Fotografico_Galpao04.pdf',
          categoria: 'VISTORIA',
          extensao: 'pdf',
          tamanho: '1.9 MB',
          dataUpload: '29/Out',
          autor: 'Ubuntu Gonçalves',
          empresaId: '1',
          empresaNome: 'Doors LTDA',
          tarefaId: 'd-1',
          statusMl: 'NAO_APLICAVEL',
        },
      ],
    },
    {
      id: 'd-2',
      titulo: 'Conferência de laudos de entrega de chaves da construtora.',
      responsavel: 'Linux da Silva',
      urgencia: 'BAIXA',
      dataCriacao: '27/Out',
      concluida: true,
      dataConclusao: '28/Out, 14:20',
      imovelReferencia: 'Edifício Central Park',
      arquivos: [
        {
          id: 'arq-d2-1',
          nome: 'Termo_Recebimento_Chaves_CentralPark.docx',
          categoria: 'DOCUMENTO',
          extensao: 'docx',
          tamanho: '380 KB',
          dataUpload: '27/Out',
          autor: 'Linux da Silva',
          empresaId: '1',
          empresaNome: 'Doors LTDA',
          tarefaId: 'd-2',
          statusMl: 'NAO_APLICAVEL',
        },
      ],
    },
  ],
  // Constructor Hub
  '2': [
    {
      id: 'ch-1',
      titulo: 'Mandar as anotações para o setor de Engenharia e guardar os dados na planilha.',
      responsavel: 'Ubuntu Gonçalves',
      urgencia: 'ALTA',
      dataCriacao: 'Hoje, 09:30',
      concluida: false,
      imovelReferencia: 'Obra Central • Bloco A',
      arquivos: [
        {
          id: 'arq-ch1-1',
          nome: 'Homogeneização_unidades padronizadas_2026_V25.xlsm',
          categoria: 'PLANILHA',
          extensao: 'xlsm',
          tamanho: '890 KB',
          dataUpload: 'Hoje, 09:35',
          autor: 'Ubuntu Gonçalves',
          empresaId: '2',
          empresaNome: 'Constructor Hub',
          tarefaId: 'ch-1',
          templateMl: 'v25_unidades_padronizadas',
          statusMl: 'RECONHECIDA',
        },
        {
          id: 'arq-ch1-2',
          nome: 'Memorial_Descritivo_Bloco_A.pdf',
          categoria: 'DOCUMENTO',
          extensao: 'pdf',
          tamanho: '1.2 MB',
          dataUpload: 'Hoje, 09:40',
          autor: 'Ubuntu Gonçalves',
          empresaId: '2',
          empresaNome: 'Constructor Hub',
          tarefaId: 'ch-1',
          statusMl: 'NAO_APLICAVEL',
        },
      ],
    },
    {
      id: 'ch-2',
      titulo: 'Fazer a vistoria do Apartamento 505 do Residencial Apollo.',
      responsavel: 'Ubuntu Gonçalves',
      urgencia: 'ALTA',
      dataCriacao: 'Hoje, 11:00',
      concluida: true,
      dataConclusao: 'Hoje, 13:15',
      imovelReferencia: 'Apto 505 • Res. Apollo',
      arquivos: [
        {
          id: 'arq-ch2-1',
          nome: 'Laudo_Vistoria_Apto505_Apollo.pdf',
          categoria: 'RELATORIO',
          extensao: 'pdf',
          tamanho: '2.1 MB',
          dataUpload: 'Hoje, 13:10',
          autor: 'Ubuntu Gonçalves',
          empresaId: '2',
          empresaNome: 'Constructor Hub',
          tarefaId: 'ch-2',
          statusMl: 'NAO_APLICAVEL',
        },
      ],
    },
    {
      id: 'ch-3',
      titulo: 'Laudo fotográfico da cobertura duplex e checagem de sacada.',
      responsavel: 'Debian Silva',
      urgencia: 'MEDIA',
      dataCriacao: 'Ontem',
      concluida: false,
      imovelReferencia: 'Cobertura 120 • Res. Apollo',
      arquivos: [],
    },
    {
      id: 'ch-4',
      titulo: 'Checagem de umidade e medição no subsolo 2.',
      responsavel: 'Linux da Silva',
      urgencia: 'BAIXA',
      dataCriacao: '28/Out',
      concluida: false,
      imovelReferencia: 'Garagem Subsolo 2',
      arquivos: [],
    },
  ],
  // Clozeyes Imóveis
  '3': [
    {
      id: 'cz-1',
      titulo: 'Vistoria de entrada na Casa Térrea e laudo fotográfico completo.',
      responsavel: 'Ubuntu Gonçalves',
      urgencia: 'ALTA',
      dataCriacao: 'Hoje, 08:00',
      concluida: false,
      imovelReferencia: 'Casa Térrea • Cond. Araucárias',
      arquivos: [
        {
          id: 'arq-cz1-1',
          nome: 'Planilha_Avaliacao_Casa_Araucarias_V22.xlsx',
          categoria: 'PLANILHA',
          extensao: 'xlsx',
          tamanho: '530 KB',
          dataUpload: 'Hoje, 08:20',
          autor: 'Ubuntu Gonçalves',
          empresaId: '3',
          empresaNome: 'Clozeyes Imóveis',
          tarefaId: 'cz-1',
          templateMl: 'v22_unidades_isoladas',
          statusMl: 'PRONTA_ML',
        },
      ],
    },
    {
      id: 'cz-2',
      titulo: 'Vistoria de saída da Sala Comercial 402 e conferência de pintura.',
      responsavel: 'Debian Silva',
      urgencia: 'MEDIA',
      dataCriacao: 'Hoje, 10:30',
      concluida: false,
      imovelReferencia: 'Sala 402 • Centro Plaza',
      arquivos: [],
    },
  ],
  // Prime Imobiliária & Gestão
  '4': [
    {
      id: 'pi-1',
      titulo: 'Conferência de laudo de desocupação e teste de instalações elétricas.',
      responsavel: 'Ubuntu Gonçalves',
      urgencia: 'ALTA',
      dataCriacao: 'Hoje, 08:30',
      concluida: false,
      imovelReferencia: 'Apto 84 • Ed. Vila Mariana',
      arquivos: [
        {
          id: 'arq-pi1-1',
          nome: 'Matricula_e_IPTU_Apto84_VilaMariana.pdf',
          categoria: 'DOCUMENTO',
          extensao: 'pdf',
          tamanho: '910 KB',
          dataUpload: 'Hoje, 08:45',
          autor: 'Fedora Lima',
          empresaId: '4',
          empresaNome: 'Prime Imobiliária & Gestão',
          tarefaId: 'pi-1',
          statusMl: 'NAO_APLICAVEL',
        },
      ],
    },
    {
      id: 'pi-2',
      titulo: 'Vistoria periódica de locação comercial.',
      responsavel: 'Linux da Silva',
      urgencia: 'MEDIA',
      dataCriacao: 'Ontem',
      concluida: true,
      dataConclusao: 'Ontem, 18:00',
      imovelReferencia: 'Loja 02 • Shopping Norte',
      arquivos: [],
    },
  ],
};

// Empresas base padrão da interface
const EMPRESAS_BASE: EmpresaDemanda[] = [
  {
    id: '1',
    nome: 'Doors LTDA',
    status: 'SEM_PENDENCIAS',
    quantidadePendentes: 0,
    totalDemandas: 2,
    descricao: '| Sem demandas pendentes desta empresa',
    contato: 'contato@doors.com.br',
  },
  {
    id: '2',
    nome: 'Constructor Hub',
    status: 'COM_PENDENCIAS',
    quantidadePendentes: 3,
    totalDemandas: 4,
    descricao: '| 3 Demandas pendentes dessa empresa.',
    contato: 'operacoes@constructorhub.com.br',
  },
  {
    id: '3',
    nome: 'Clozeyes Imóveis',
    status: 'COM_PENDENCIAS',
    quantidadePendentes: 2,
    totalDemandas: 2,
    descricao: '| 2 Demandas pendentes dessa empresa.',
    contato: 'locacao@clozeyes.com.br',
  },
  {
    id: '4',
    nome: 'Prime Imobiliária & Gestão',
    status: 'COM_PENDENCIAS',
    quantidadePendentes: 1,
    totalDemandas: 2,
    descricao: '| 1 Demanda pendente dessa empresa.',
    contato: 'vistorias@primeimoveis.com.br',
  },
];

// Registro de empresas adicionadas dinamicamente
const empresasDinamicas: EmpresaDemanda[] = [];

const chaveEmpresa = (id: string, nome?: string): string => {
  return (nome || id).trim().toLowerCase();
};

const inferirCategoriaPorExtensao = (
  nomeArquivo: string,
  categoriaInformada?: CategoriaArquivo
): {
  categoria: CategoriaArquivo;
  extensao: string;
  statusMl: ArquivoAnexo['statusMl'];
  templateMl?: string;
} => {
  const partes = nomeArquivo.trim().split('.');
  const ext = partes.length > 1 ? partes[partes.length - 1].toLowerCase() : 'pdf';
  const isPlanilha = ['xlsx', 'xlsm', 'xls', 'csv'].includes(ext);

  const categoria: CategoriaArquivo =
    categoriaInformada || (isPlanilha ? 'PLANILHA' : ext === 'pdf' ? 'RELATORIO' : 'DOCUMENTO');

  const lower = nomeArquivo.toLowerCase();
  const templateMl = isPlanilha
    ? lower.includes('v25') || lower.includes('padronizada') || ext === 'xlsm'
      ? 'v25_unidades_padronizadas'
      : 'v22_unidades_isoladas'
    : undefined;

  return {
    categoria,
    extensao: ext,
    statusMl: isPlanilha ? 'PRONTA_ML' : 'NAO_APLICAVEL',
    templateMl,
  };
};

export const demandaService = {
  /**
   * Lista todas as empresas (base + backend + dinâmicas) com contagem real de demandas
   */
  async listarEmpresas(): Promise<EmpresaDemanda[]> {
    let clientesApi: ClienteDTO[] = [];
    try {
      clientesApi = await userService.listarClientes();
    } catch {
      // Offline fallback
    }

    const mapa = new Map<string, EmpresaDemanda>();

    EMPRESAS_BASE.forEach((emp) => {
      mapa.set(emp.nome.toLowerCase(), { ...emp });
    });

    clientesApi.forEach((cli) => {
      const nomeLower = cli.razaoSocial.toLowerCase();
      if (!mapa.has(nomeLower)) {
        mapa.set(nomeLower, {
          id: `cli-${cli.id || Date.now()}`,
          nome: cli.razaoSocial,
          status: 'EM_ABERTO',
          quantidadePendentes: 0,
          totalDemandas: 0,
          descricao: '| Demandas em aberto.',
          contato: cli.email || 'contato@empresa.com.br',
        });
      }
    });

    empresasDinamicas.forEach((emp) => {
      const nomeLower = emp.nome.toLowerCase();
      if (!mapa.has(nomeLower)) {
        mapa.set(nomeLower, { ...emp });
      }
    });

    const resultado: EmpresaDemanda[] = [];

    for (const [, emp] of mapa.entries()) {
      const tarefas = demandaService.obterDemandasPorEmpresa(emp.id, emp.nome);
      const pendentes = tarefas.filter((t) => !t.concluida).length;
      const total = tarefas.length;

      let status: StatusEmpresa = 'EM_ABERTO';
      let descricao = '| Demandas em aberto.';

      if (total > 0 && pendentes === 0) {
        status = 'SEM_PENDENCIAS';
        descricao = '| Sem demandas pendentes desta empresa';
      } else if (pendentes > 0) {
        status = 'COM_PENDENCIAS';
        descricao = `| ${pendentes} Demanda${pendentes > 1 ? 's' : ''} pendente${pendentes > 1 ? 's' : ''} dessa empresa.`;
      }

      resultado.push({
        ...emp,
        quantidadePendentes: pendentes,
        totalDemandas: total,
        status,
        descricao,
      });
    }

    return resultado;
  },

  /**
   * Obtém as tarefas de uma empresa (busca por ID ou pelo nome da empresa)
   */
  obterDemandasPorEmpresa(empresaId: string, empresaNome?: string): TarefaDemanda[] {
    if (demandasPorEmpresaStore[empresaId]) {
      return demandasPorEmpresaStore[empresaId].map((t) => ({
        ...t,
        arquivos: t.arquivos ? [...t.arquivos] : [],
      }));
    }

    if (empresaNome) {
      const chave = chaveEmpresa(empresaId, empresaNome);
      if (demandasPorEmpresaStore[chave]) {
        return demandasPorEmpresaStore[chave].map((t) => ({
          ...t,
          arquivos: t.arquivos ? [...t.arquivos] : [],
        }));
      }

      const base = EMPRESAS_BASE.find(
        (e) => e.nome.toLowerCase() === empresaNome.toLowerCase()
      );
      if (base && demandasPorEmpresaStore[base.id]) {
        return demandasPorEmpresaStore[base.id].map((t) => ({
          ...t,
          arquivos: t.arquivos ? [...t.arquivos] : [],
        }));
      }
    }

    return [];
  },

  /**
   * Obtém uma demanda específica atualizada pelo seu ID
   */
  obterDemandaPorId(
    empresaId: string,
    empresaNome: string,
    tarefaId: string
  ): TarefaDemanda | null {
    const lista = demandaService.obterDemandasPorEmpresa(empresaId, empresaNome);
    return lista.find((t) => t.id === tarefaId) || null;
  },

  /**
   * Obtém os arquivos gerais da empresa (relatórios, documentos de vistorias, etc.) + arquivos das demandas dessa empresa
   */
  obterArquivosDaEmpresa(empresaId: string, empresaNome?: string): ArquivoAnexo[] {
    const mapa = new Map<string, ArquivoAnexo>();

    const baseMatch = empresaNome
      ? EMPRESAS_BASE.find((e) => e.nome.toLowerCase() === empresaNome.toLowerCase())
      : undefined;

    const chaves = new Set<string>([
      empresaId,
      ...(empresaNome ? [chaveEmpresa(empresaId, empresaNome)] : []),
      ...(baseMatch ? [baseMatch.id] : []),
    ]);

    chaves.forEach((k) => {
      (arquivosPorEmpresaStore[k] || []).forEach((arq) => {
        mapa.set(arq.id, { ...arq });
      });
    });

    // Também consolida os arquivos vinculados às demandas da própria empresa
    const tarefas = demandaService.obterDemandasPorEmpresa(empresaId, empresaNome);
    tarefas.forEach((t) => {
      (t.arquivos || []).forEach((arq) => {
        if (!mapa.has(arq.id)) {
          mapa.set(arq.id, {
            ...arq,
            empresaId,
            empresaNome: empresaNome || arq.empresaNome,
            tarefaId: t.id,
            tarefaTitulo: t.titulo,
          });
        }
      });
    });

    return Array.from(mapa.values());
  },

  /**
   * Adiciona um arquivo (relatório, documento de vistoria, documento ou planilha) diretamente no acervo da empresa
   */
  adicionarArquivoEmpresa(params: {
    empresaId: string;
    empresaNome: string;
    nomeArquivo: string;
    categoria: CategoriaArquivo;
    tamanho?: string;
    autor?: string;
    webFile?: any;
    uriLocal?: string;
    mimeType?: string;
  }): ArquivoAnexo {
    const info = inferirCategoriaPorExtensao(params.nomeArquivo, params.categoria);
    const baseMatch = EMPRESAS_BASE.find(
      (e) => e.nome.toLowerCase() === params.empresaNome.toLowerCase()
    );
    const chave = baseMatch?.id || params.empresaId || chaveEmpresa('', params.empresaNome);
    const chaveNome = chaveEmpresa(params.empresaId, params.empresaNome);

    const novo: ArquivoAnexo = {
      id: `arq-emp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      nome: params.nomeArquivo.trim(),
      categoria: info.categoria,
      extensao: info.extensao,
      tamanho: params.tamanho || (info.categoria === 'PLANILHA' ? '680 KB' : '2.1 MB'),
      dataUpload: 'Hoje, agora',
      autor: params.autor || 'Linux da Silva',
      empresaId: params.empresaId,
      empresaNome: params.empresaNome,
      templateMl: info.templateMl,
      statusMl: info.statusMl,
      webFile: params.webFile,
      uriLocal: params.uriLocal,
      mimeType: params.mimeType,
    };

    if (!arquivosPorEmpresaStore[chave]) {
      arquivosPorEmpresaStore[chave] = [];
    }
    arquivosPorEmpresaStore[chave].unshift(novo);

    if (chaveNome !== chave) {
      if (!arquivosPorEmpresaStore[chaveNome]) {
        arquivosPorEmpresaStore[chaveNome] = [];
      }
      if (!arquivosPorEmpresaStore[chaveNome].some((a) => a.id === novo.id)) {
        arquivosPorEmpresaStore[chaveNome].unshift(novo);
      }
    }

    const jaExiste =
      EMPRESAS_BASE.some((e) => e.nome.toLowerCase() === params.empresaNome.toLowerCase()) ||
      empresasDinamicas.some((e) => e.nome.toLowerCase() === params.empresaNome.toLowerCase());

    if (!jaExiste) {
      empresasDinamicas.push({
        id: params.empresaId || `cli-${Date.now()}`,
        nome: params.empresaNome,
        status: 'COM_PENDENCIAS',
        quantidadePendentes: 0,
        totalDemandas: 0,
        descricao: '| Arquivos cadastrados para esta empresa.',
        contato: `contato@${params.empresaNome.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.br`,
      });
    }

    return novo;
  },

  /**
   * Remove um arquivo do acervo da empresa (ou de uma demanda da empresa)
   */
  removerArquivoEmpresa(empresaId: string, empresaNome: string, arquivoId: string): void {
    const baseMatch = EMPRESAS_BASE.find(
      (e) => e.nome.toLowerCase() === empresaNome.toLowerCase()
    );
    const chaves = new Set<string>([
      empresaId,
      chaveEmpresa(empresaId, empresaNome),
      ...(baseMatch ? [baseMatch.id] : []),
    ]);

    chaves.forEach((k) => {
      if (arquivosPorEmpresaStore[k]) {
        arquivosPorEmpresaStore[k] = arquivosPorEmpresaStore[k].filter(
          (a) => a.id !== arquivoId
        );
      }
      if (demandasPorEmpresaStore[k]) {
        demandasPorEmpresaStore[k] = demandasPorEmpresaStore[k].map((t) => ({
          ...t,
          arquivos: (t.arquivos || []).filter((a) => a.id !== arquivoId),
        }));
      }
    });
  },

  /**
   * Adiciona uma nova demanda atribuída à empresa e ao responsável (suporta arquivos iniciais)
   */
  adicionarDemanda(dados: {
    empresaId?: string;
    empresaNome: string;
    titulo: string;
    responsavel: string;
    urgencia: Urgencia;
    imovel?: string;
    endereco?: string;
    tipoVistoria?: string;
    prazo?: string;
    observacoes?: string;
    arquivos?: ArquivoAnexo[];
  }): TarefaDemanda {
    const nomeLimpo = dados.empresaNome.trim();
    const baseMatch = EMPRESAS_BASE.find(
      (e) => e.nome.toLowerCase() === nomeLimpo.toLowerCase()
    );
    const chave = dados.empresaId || baseMatch?.id || chaveEmpresa(nomeLimpo, nomeLimpo);

    const nova: TarefaDemanda = {
      id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      titulo: dados.titulo.trim(),
      responsavel: dados.responsavel.trim() || 'Ubuntu Gonçalves',
      urgencia: dados.urgencia,
      dataCriacao: dados.prazo || 'Hoje, agora',
      concluida: false,
      imovelReferencia: dados.imovel || nomeLimpo,
      tipoVistoria: dados.tipoVistoria,
      endereco: dados.endereco,
      observacoes: dados.observacoes,
      arquivos: dados.arquivos ? [...dados.arquivos] : [],
    };

    if (!demandasPorEmpresaStore[chave]) {
      demandasPorEmpresaStore[chave] = [];
    }
    demandasPorEmpresaStore[chave].unshift(nova);

    const chaveNome = chaveEmpresa('', nomeLimpo);
    if (chaveNome !== chave) {
      if (!demandasPorEmpresaStore[chaveNome]) {
        demandasPorEmpresaStore[chaveNome] = [];
      }
      if (!demandasPorEmpresaStore[chaveNome].some((t) => t.id === nova.id)) {
        demandasPorEmpresaStore[chaveNome].unshift(nova);
      }
    }

    const jaExiste =
      EMPRESAS_BASE.some((e) => e.nome.toLowerCase() === nomeLimpo.toLowerCase()) ||
      empresasDinamicas.some((e) => e.nome.toLowerCase() === nomeLimpo.toLowerCase());

    if (!jaExiste) {
      empresasDinamicas.push({
        id: dados.empresaId || `cli-${Date.now()}`,
        nome: nomeLimpo,
        status: 'COM_PENDENCIAS',
        quantidadePendentes: 1,
        totalDemandas: 1,
        descricao: '| 1 Demanda pendente dessa empresa.',
        contato: `contato@${nomeLimpo.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.br`,
      });
    }

    return nova;
  },

  /**
   * Alterna status concluída/pendente de uma demanda e atualiza métricas do painel
   */
  toggleDemandaConcluida(empresaId: string, empresaNome: string, tarefaId: string): boolean {
    const baseMatch = EMPRESAS_BASE.find(
      (e) => e.nome.toLowerCase() === empresaNome.toLowerCase()
    );
    const chaves = new Set<string>([
      empresaId,
      chaveEmpresa(empresaId, empresaNome),
      ...(baseMatch ? [baseMatch.id] : []),
    ]);

    let novoStatus = false;

    chaves.forEach((k) => {
      if (demandasPorEmpresaStore[k]) {
        demandasPorEmpresaStore[k] = demandasPorEmpresaStore[k].map((t) => {
          if (t.id === tarefaId) {
            novoStatus = !t.concluida;
            return {
              ...t,
              concluida: novoStatus,
              dataConclusao: novoStatus ? 'Hoje, agora' : undefined,
            };
          }
          return t;
        });
      }
    });

    return novoStatus;
  },

  /**
   * Adiciona um arquivo (documento ou planilha) dentro de uma demanda específica de uma empresa
   */
  adicionarArquivoNaDemanda(params: {
    empresaId: string;
    empresaNome: string;
    tarefaId: string;
    tarefaTitulo?: string;
    nomeArquivo: string;
    categoria?: CategoriaArquivo;
    tamanho?: string;
    autor?: string;
    webFile?: any;
    uriLocal?: string;
    mimeType?: string;
  }): ArquivoAnexo {
    const info = inferirCategoriaPorExtensao(params.nomeArquivo, params.categoria);
    const baseMatch = EMPRESAS_BASE.find(
      (e) => e.nome.toLowerCase() === params.empresaNome.toLowerCase()
    );

    const novoArquivo: ArquivoAnexo = {
      id: `arq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      nome: params.nomeArquivo.trim(),
      categoria: info.categoria,
      extensao: info.extensao,
      tamanho: params.tamanho || (info.categoria === 'PLANILHA' ? '720 KB' : '1.4 MB'),
      dataUpload: 'Hoje, agora',
      autor: params.autor || 'Linux da Silva',
      empresaId: params.empresaId,
      empresaNome: params.empresaNome,
      tarefaId: params.tarefaId,
      tarefaTitulo: params.tarefaTitulo,
      templateMl: info.templateMl,
      statusMl: info.statusMl,
      webFile: params.webFile,
      uriLocal: params.uriLocal,
      mimeType: params.mimeType,
    };

    const chaves = new Set<string>([
      params.empresaId,
      chaveEmpresa(params.empresaId, params.empresaNome),
      ...(baseMatch ? [baseMatch.id] : []),
    ]);

    chaves.forEach((k) => {
      if (demandasPorEmpresaStore[k]) {
        demandasPorEmpresaStore[k] = demandasPorEmpresaStore[k].map((t) => {
          if (t.id === params.tarefaId) {
            const atuais = t.arquivos || [];
            if (!atuais.some((a) => a.id === novoArquivo.id)) {
              return {
                ...t,
                arquivos: [novoArquivo, ...atuais],
              };
            }
          }
          return t;
        });
      }
    });

    return novoArquivo;
  },

  /**
   * Remove um arquivo de uma demanda de empresa
   */
  removerArquivoDaDemanda(
    empresaId: string,
    empresaNome: string,
    tarefaId: string,
    arquivoId: string
  ): void {
    const baseMatch = EMPRESAS_BASE.find(
      (e) => e.nome.toLowerCase() === empresaNome.toLowerCase()
    );
    const chaves = new Set<string>([
      empresaId,
      chaveEmpresa(empresaId, empresaNome),
      ...(baseMatch ? [baseMatch.id] : []),
    ]);

    chaves.forEach((k) => {
      if (demandasPorEmpresaStore[k]) {
        demandasPorEmpresaStore[k] = demandasPorEmpresaStore[k].map((t) => {
          if (t.id === tarefaId && t.arquivos) {
            return {
              ...t,
              arquivos: t.arquivos.filter((a) => a.id !== arquivoId),
            };
          }
          return t;
        });
      }
    });
  },

  /**
   * Atualiza o status de processamento ML de um arquivo (ex: após reconhecer ou preencher planilha)
   */
  atualizarStatusMlArquivo(
    arquivoId: string,
    statusMl: ArquivoAnexo['statusMl'],
    templateMl?: string,
    camposExtraidosMl?: Record<string, string | number>,
    conteudoBase64?: string
  ): void {
    Object.keys(arquivosPorEmpresaStore).forEach((k) => {
      arquivosPorEmpresaStore[k] = (arquivosPorEmpresaStore[k] || []).map((a) =>
        a.id === arquivoId
          ? {
              ...a,
              statusMl,
              templateMl: templateMl || a.templateMl,
              camposExtraidosMl: camposExtraidosMl || a.camposExtraidosMl,
              conteudoBase64: conteudoBase64 || a.conteudoBase64,
            }
          : a
      );
    });

    Object.keys(demandasPorEmpresaStore).forEach((k) => {
      demandasPorEmpresaStore[k] = demandasPorEmpresaStore[k].map((t) => {
        if (!t.arquivos) return t;
        return {
          ...t,
          arquivos: t.arquivos.map((a) =>
            a.id === arquivoId
              ? {
                  ...a,
                  statusMl,
                  templateMl: templateMl || a.templateMl,
                  camposExtraidosMl: camposExtraidosMl || a.camposExtraidosMl,
                  conteudoBase64: conteudoBase64 || a.conteudoBase64,
                }
              : a
          ),
        };
      });
    });
  },

  /**
   * Lista todos os arquivos de todas as empresas (para o Painel de Dashboard / ML)
   */
  listarArquivosGerais(): ArquivoAnexo[] {
    const mapa = new Map<string, ArquivoAnexo>();

    // 1. Vasculha diretamente todos os acervos de todas as empresas registradas no store
    Object.values(arquivosPorEmpresaStore).forEach((lista) => {
      (lista || []).forEach((arq) => {
        if (!mapa.has(arq.id)) {
          mapa.set(arq.id, { ...arq });
        }
      });
    });

    // 2. Vasculha diretamente todos os arquivos vinculados a demandas em todas as empresas
    Object.values(demandasPorEmpresaStore).forEach((tarefas) => {
      (tarefas || []).forEach((t) => {
        (t.arquivos || []).forEach((arq) => {
          if (!mapa.has(arq.id)) {
            mapa.set(arq.id, {
              ...arq,
              tarefaId: arq.tarefaId || t.id,
              tarefaTitulo: arq.tarefaTitulo || t.titulo,
            });
          }
        });
      });
    });

    return Array.from(mapa.values());
  },

  /**
   * Adiciona um arquivo vinculado a uma empresa (usado pelo Painel ML se enviar direto)
   */
  adicionarArquivoGeral(params: {
    nomeArquivo: string;
    categoria: CategoriaArquivo;
    empresaNome?: string;
    tamanho?: string;
    autor?: string;
    webFile?: any;
  }): ArquivoAnexo {
    const empNome = params.empresaNome || 'Constructor Hub';
    const baseMatch = EMPRESAS_BASE.find(
      (e) => e.nome.toLowerCase() === empNome.toLowerCase()
    );
    return demandaService.adicionarArquivoEmpresa({
      empresaId: baseMatch?.id || '2',
      empresaNome: empNome,
      nomeArquivo: params.nomeArquivo,
      categoria: params.categoria,
      tamanho: params.tamanho,
      autor: params.autor,
      webFile: params.webFile,
    });
  },

  /**
   * Calcula em tempo real todas as métricas do Painel de Dashboard baseadas na conclusão de demandas e arquivos
   */
  obterMetricasDashboard(): MetricasDashboard {
    const mapaEmpresas = new Map<string, EmpresaDemanda>();
    [...EMPRESAS_BASE, ...empresasDinamicas].forEach((e) => {
      mapaEmpresas.set(e.nome.toLowerCase(), e);
    });

    let totalDemandas = 0;
    let demandasConcluidas = 0;
    let demandasPendentes = 0;

    const porUrgencia = {
      ALTA: { total: 0, concluidas: 0, pendentes: 0 },
      MEDIA: { total: 0, concluidas: 0, pendentes: 0 },
      BAIXA: { total: 0, concluidas: 0, pendentes: 0 },
    };

    const mapaResponsaveis = new Map<
      string,
      { nome: string; total: number; concluidas: number; pendentes: number }
    >();

    const porEmpresa: MetricasDashboard['porEmpresa'] = [];
    const todasTarefasConsolidado: Array<
      TarefaDemanda & { empresaNome: string; empresaId: string }
    > = [];
    const idsTarefasContabilizadas = new Set<string>();

    for (const [, emp] of mapaEmpresas.entries()) {
      const tarefas = demandaService.obterDemandasPorEmpresa(emp.id, emp.nome);
      const arqsEmpresa = demandaService.obterArquivosDaEmpresa(emp.id, emp.nome);
      let empTotal = 0;
      let empConcluidas = 0;
      let empPendentes = 0;

      tarefas.forEach((t) => {
        empTotal++;
        if (t.concluida) {
          empConcluidas++;
        } else {
          empPendentes++;
        }

        if (!idsTarefasContabilizadas.has(t.id)) {
          idsTarefasContabilizadas.add(t.id);
          totalDemandas++;
          if (t.concluida) {
            demandasConcluidas++;
          } else {
            demandasPendentes++;
          }

          const urg = porUrgencia[t.urgencia] || porUrgencia.MEDIA;
          urg.total++;
          if (t.concluida) urg.concluidas++;
          else urg.pendentes++;

          const respKey = (t.responsavel || 'Equipe Avalliar').trim();
          const respAtual = mapaResponsaveis.get(respKey) || {
            nome: respKey,
            total: 0,
            concluidas: 0,
            pendentes: 0,
          };
          respAtual.total++;
          if (t.concluida) respAtual.concluidas++;
          else respAtual.pendentes++;
          mapaResponsaveis.set(respKey, respAtual);

          todasTarefasConsolidado.push({
            ...t,
            empresaNome: emp.nome,
            empresaId: emp.id,
          });
        }
      });

      const taxaEmp = empTotal > 0 ? Math.round((empConcluidas / empTotal) * 100) : 0;
      const statusEmp: StatusEmpresa =
        empTotal > 0 && empPendentes === 0
          ? 'SEM_PENDENCIAS'
          : empPendentes > 0
          ? 'COM_PENDENCIAS'
          : 'EM_ABERTO';

      porEmpresa.push({
        id: emp.id,
        nome: emp.nome,
        total: empTotal,
        concluidas: empConcluidas,
        pendentes: empPendentes,
        taxaConclusao: taxaEmp,
        totalArquivos: arqsEmpresa.length,
        status: statusEmp,
      });
    }

    const taxaConclusao =
      totalDemandas > 0 ? Math.round((demandasConcluidas / totalDemandas) * 100) : 0;

    const crescimentoPercentual = Math.max(12, Math.min(95, 22 + demandasConcluidas * 4));

    const porResponsavel = Array.from(mapaResponsaveis.values())
      .map((r) => ({
        ...r,
        taxaConclusao: r.total > 0 ? Math.round((r.concluidas / r.total) * 100) : 0,
      }))
      .sort((a, b) => b.concluidas - a.concluidas || b.total - a.total);

    const todosArquivos = demandaService.listarArquivosGerais();
    const arquivosResumo = {
      total: todosArquivos.length,
      planilhas: todosArquivos.filter((a) => a.categoria === 'PLANILHA').length,
      documentos: todosArquivos.filter((a) => a.categoria === 'DOCUMENTO').length,
      relatorios: todosArquivos.filter((a) => a.categoria === 'RELATORIO').length,
      vistorias: todosArquivos.filter((a) => a.categoria === 'VISTORIA').length,
      processadosMl: todosArquivos.filter(
        (a) => a.statusMl === 'RECONHECIDA' || a.statusMl === 'PREENCHIDA_ML'
      ).length,
    };

    return {
      totalDemandas,
      demandasConcluidas,
      demandasPendentes,
      taxaConclusao,
      crescimentoPercentual,
      porUrgencia,
      porEmpresa,
      porResponsavel,
      arquivosResumo,
      ultimasDemandas: todasTarefasConsolidado,
    };
  },
};
