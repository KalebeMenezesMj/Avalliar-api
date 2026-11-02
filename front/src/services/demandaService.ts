import { userService, ClienteDTO } from './userService';

export type StatusEmpresa = 'SEM_PENDENCIAS' | 'COM_PENDENCIAS' | 'EM_ABERTO';
export type Urgencia = 'ALTA' | 'MEDIA' | 'BAIXA';

export interface TarefaDemanda {
  id: string;
  titulo: string;
  responsavel: string;
  urgencia: Urgencia;
  dataCriacao: string;
  concluida: boolean;
  imovelReferencia?: string;
  tipoVistoria?: string;
  endereco?: string;
  observacoes?: string;
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
      imovelReferencia: 'Galpão 04 • Rod. Anhanguera',
    },
    {
      id: 'd-2',
      titulo: 'Conferência de laudos de entrega de chaves da construtora.',
      responsavel: 'Linux da Silva',
      urgencia: 'BAIXA',
      dataCriacao: '27/Out',
      concluida: true,
      imovelReferencia: 'Edifício Central Park',
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
    },
    {
      id: 'ch-2',
      titulo: 'Fazer a vistoria do Apartamento 505 do Residencial Apollo.',
      responsavel: 'Ubuntu Gonçalves',
      urgencia: 'ALTA',
      dataCriacao: 'Hoje, 11:00',
      concluida: true,
      imovelReferencia: 'Apto 505 • Res. Apollo',
    },
    {
      id: 'ch-3',
      titulo: 'Laudo fotográfico da cobertura duplex e checagem de sacada.',
      responsavel: 'Debian Silva',
      urgencia: 'MEDIA',
      dataCriacao: 'Ontem',
      concluida: false,
      imovelReferencia: 'Cobertura 120 • Res. Apollo',
    },
    {
      id: 'ch-4',
      titulo: 'Checagem de umidade e medição no subsolo 2.',
      responsavel: 'Linux da Silva',
      urgencia: 'BAIXA',
      dataCriacao: '28/Out',
      concluida: false,
      imovelReferencia: 'Garagem Subsolo 2',
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
    },
    {
      id: 'cz-2',
      titulo: 'Vistoria de saída da Sala Comercial 402 e conferência de pintura.',
      responsavel: 'Debian Silva',
      urgencia: 'MEDIA',
      dataCriacao: 'Hoje, 10:30',
      concluida: false,
      imovelReferencia: 'Sala 402 • Centro Plaza',
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
    },
    {
      id: 'pi-2',
      titulo: 'Vistoria periódica de locação comercial.',
      responsavel: 'Linux da Silva',
      urgencia: 'MEDIA',
      dataCriacao: 'Ontem',
      concluida: false,
      imovelReferencia: 'Loja 02 • Shopping Norte',
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
    quantidadePendentes: 2,
    totalDemandas: 2,
    descricao: '| 2 Demandas pendentes dessa empresa.',
    contato: 'vistorias@primeimoveis.com.br',
  },
];

// Registro de empresas adicionadas dinamicamente
const empresasDinamicas: EmpresaDemanda[] = [];

// Função auxiliar para normalizar chave de empresa
const chaveEmpresa = (id: string, nome?: string): string => {
  return (nome || id).trim().toLowerCase();
};

export const demandaService = {
  /**
   * Lista todas as empresas (base + backend + dinâmicas) com contagem real de demandas
   */
  async listarEmpresas(): Promise<EmpresaDemanda[]> {
    // Busca clientes reais do banco de dados (tabela cliente)
    let clientesApi: ClienteDTO[] = [];
    try {
      clientesApi = await userService.listarClientes();
    } catch {
      // Offline fallback
    }

    // Mapa para consolidar empresas por nome normalizado
    const mapa = new Map<string, EmpresaDemanda>();

    // 1. Insere as empresas base
    EMPRESAS_BASE.forEach((emp) => {
      mapa.set(emp.nome.toLowerCase(), { ...emp });
    });

    // 2. Insere clientes vindos do banco de dados
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

    // 3. Insere empresas dinâmicas criadas em tempo de execução
    empresasDinamicas.forEach((emp) => {
      const nomeLower = emp.nome.toLowerCase();
      if (!mapa.has(nomeLower)) {
        mapa.set(nomeLower, { ...emp });
      }
    });

    // 4. Recalcula as pendências reais de cada empresa consultando o store de demandas
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
    // 1. Tenta pelo ID direto
    if (demandasPorEmpresaStore[empresaId]) {
      return [...demandasPorEmpresaStore[empresaId]];
    }

    // 2. Tenta pelo nome normalizado
    if (empresaNome) {
      const chave = chaveEmpresa(empresaId, empresaNome);
      if (demandasPorEmpresaStore[chave]) {
        return [...demandasPorEmpresaStore[chave]];
      }

      // 3. Procura empresa base com esse nome
      const base = EMPRESAS_BASE.find(
        (e) => e.nome.toLowerCase() === empresaNome.toLowerCase()
      );
      if (base && demandasPorEmpresaStore[base.id]) {
        return [...demandasPorEmpresaStore[base.id]];
      }
    }

    return [];
  },

  /**
   * Adiciona uma nova demanda atribuída à empresa e ao responsável
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
  }): TarefaDemanda {
    const nomeLimpo = dados.empresaNome.trim();
    const chave = dados.empresaId || chaveEmpresa(dados.empresaNome, dados.empresaNome);

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
    };

    // Garante array de armazenamento tanto pelo ID quanto pelo nome da empresa
    if (!demandasPorEmpresaStore[chave]) {
      demandasPorEmpresaStore[chave] = [];
    }
    demandasPorEmpresaStore[chave].unshift(nova);

    // Também espelha pelo nome normalizado se tiver ID
    const chaveNome = chaveEmpresa('', nomeLimpo);
    if (chaveNome !== chave) {
      if (!demandasPorEmpresaStore[chaveNome]) {
        demandasPorEmpresaStore[chaveNome] = [];
      }
      if (!demandasPorEmpresaStore[chaveNome].some((t) => t.id === nova.id)) {
        demandasPorEmpresaStore[chaveNome].unshift(nova);
      }
    }

    // Se a empresa ainda não existir nas listas base, registra como dinâmica
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
   * Alterna status concluída/pendente de uma demanda
   */
  toggleDemandaConcluida(empresaId: string, empresaNome: string, tarefaId: string): boolean {
    const chave1 = empresaId;
    const chave2 = chaveEmpresa(empresaId, empresaNome);

    let novoStatus = false;

    [chave1, chave2].forEach((k) => {
      if (demandasPorEmpresaStore[k]) {
        demandasPorEmpresaStore[k] = demandasPorEmpresaStore[k].map((t) => {
          if (t.id === tarefaId) {
            novoStatus = !t.concluida;
            return { ...t, concluida: !t.concluida };
          }
          return t;
        });
      }
    });

    return novoStatus;
  },
};
