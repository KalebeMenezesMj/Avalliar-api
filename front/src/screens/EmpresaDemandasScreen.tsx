import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
} from '@expo/vector-icons';

import { fonts, spacing } from '../theme';
import BottomNavigation, { TabType } from '../components/BottomNavigation';
import { AuthResponse } from '../services/authService';
import { EmpresaDemanda } from './DemandasScreen';
import { userService, UsuarioDTO } from '../services/userService';
import {
  demandaService,
  TarefaDemanda,
  Urgencia,
  ArquivoAnexo,
  CategoriaArquivo,
} from '../services/demandaService';
import { mlService } from '../services/mlService';
import FileViewerModal, {
  visualizarArquivoDemanda,
  baixarArquivoDemanda,
  selecionarArquivoDoDispositivo,
  enviarArquivoParaServidor,
  ArquivoDispositivoSelecionado,
} from '../components/FileViewerModal';

export type { Urgencia, TarefaDemanda };

interface EmpresaDemandasScreenProps {
  empresa: EmpresaDemanda;
  currentUser?: AuthResponse | { nome?: string; email?: string; role?: string } | null;
  onBack: () => void;
  onNavigateToNovaDemanda: () => void;
  onSelectDemanda?: (demanda: TarefaDemanda) => void;
  onNavigateTab: (tab: TabType) => void;
  onLogout?: () => void;
  activeTab?: TabType;
}

const SUGESTOES_ARQUIVOS_EMPRESA: Array<{
  nome: string;
  categoria: CategoriaArquivo;
  tamanho: string;
  desc: string;
}> = [
  {
    nome: 'Homogeneização_Unidades Isoladas_2025_V22.xlsx',
    categoria: 'PLANILHA',
    tamanho: '645 KB',
    desc: 'Planilha de Homogeneização • Template V22 (ML)',
  },
  {
    nome: 'Homogeneização_unidades padronizadas_2026_V25.xlsm',
    categoria: 'PLANILHA',
    tamanho: '890 KB',
    desc: 'Planilha de Homogeneização • Template V25 (ML)',
  },
  {
    nome: 'Relatorio_Vistoria_Tecnica_Mensal.pdf',
    categoria: 'RELATORIO',
    tamanho: '2.4 MB',
    desc: 'Relatório executivo de vistorias da empresa',
  },
  {
    nome: 'Laudo_Vistoria_Cautelar_Imovel.pdf',
    categoria: 'VISTORIA',
    tamanho: '3.1 MB',
    desc: 'Documento de vistoria técnica e fotos de campo',
  },
  {
    nome: 'Doc_Matricula_e_Planta_Imovel.pdf',
    categoria: 'DOCUMENTO',
    tamanho: '1.4 MB',
    desc: 'Documento Técnico • Matrícula e Croqui',
  },
];

export default function EmpresaDemandasScreen({
  empresa,
  currentUser,
  onBack,
  onSelectDemanda,
  onNavigateTab,
  activeTab = 'demandas',
}: EmpresaDemandasScreenProps) {
  const [tarefas, setTarefas] = useState<TarefaDemanda[]>(() =>
    demandaService.obterDemandasPorEmpresa(empresa.id, empresa.nome)
  );
  const [arquivosDaEmpresa, setArquivosDaEmpresa] = useState<ArquivoAnexo[]>(() =>
    demandaService.obterArquivosDaEmpresa(empresa.id, empresa.nome)
  );

  useEffect(() => {
    setTarefas(demandaService.obterDemandasPorEmpresa(empresa.id, empresa.nome));
    setArquivosDaEmpresa(demandaService.obterArquivosDaEmpresa(empresa.id, empresa.nome));
  }, [empresa.id, empresa.nome]);

  const [busca, setBusca] = useState('');
  const [filtroUrgencia, setFiltroUrgencia] = useState<'TODAS' | Urgencia>('TODAS');
  const [filtroCatArquivo, setFiltroCatArquivo] = useState<'TODOS' | CategoriaArquivo>('TODOS');

  const [novaDemandaModal, setNovaDemandaModal] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoResponsavel, setNovoResponsavel] = useState('Ubuntu Gonçalves');
  const [novaUrgencia, setNovaUrgencia] = useState<Urgencia>('ALTA');
  const [arquivosNovaDemanda, setArquivosNovaDemanda] = useState<
    Array<{
      nome: string;
      categoria: CategoriaArquivo;
      tamanho: string;
      webFile?: any;
      uriLocal?: string;
      mimeType?: string;
      selecionado?: ArquivoDispositivoSelecionado;
    }>
  >([]);

  // Modal de inserção de arquivos:
  // - Quando `tarefaAlvoArquivo` está preenchido -> insere dentro daquela demanda específica (documentos e planilhas)
  // - Quando `modalArquivoEmpresaAberto` é true e `tarefaAlvoArquivo` é null -> insere no acervo geral da empresa (relatórios, documentos de vistorias, planilhas, etc.)
  const [tarefaAlvoArquivo, setTarefaAlvoArquivo] = useState<TarefaDemanda | null>(null);
  const [dropdownTarefaDestinoAberto, setDropdownTarefaDestinoAberto] = useState(false);
  const [modalArquivoEmpresaAberto, setModalArquivoEmpresaAberto] = useState(false);
  const [nomeNovoArquivo, setNomeNovoArquivo] = useState('');
  const [categoriaNovoArquivo, setCategoriaNovoArquivo] = useState<CategoriaArquivo>('PLANILHA');
  const [webFileSelecionado, setWebFileSelecionado] = useState<any>(null);
  const [tamanhoWebFile, setTamanhoWebFile] = useState<string>('');
  const [arquivoDispositivoSelecionado, setArquivoDispositivoSelecionado] =
    useState<ArquivoDispositivoSelecionado | null>(null);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [processandoMlId, setProcessandoMlId] = useState<string | null>(null);
  const [arquivoVisualizando, setArquivoVisualizando] = useState<ArquivoAnexo | null>(null);
  const [demandaContextoVisualizacao, setDemandaContextoVisualizacao] =
    useState<TarefaDemanda | null>(null);
  const [toastDownload, setToastDownload] = useState<string | null>(null);
  const [feedbackMl, setFeedbackMl] = useState<{
    visivel: boolean;
    titulo: string;
    detalhe: string;
    campos?: Record<string, string | number>;
  } | null>(null);

  const [funcionarios, setFuncionarios] = useState<UsuarioDTO[]>([]);
  const [dropdownResponsavelAberto, setDropdownResponsavelAberto] = useState(false);

  const userName = currentUser?.nome || 'Linux da Silva';

  const recarregarTudoDaEmpresa = () => {
    setTarefas(demandaService.obterDemandasPorEmpresa(empresa.id, empresa.nome));
    setArquivosDaEmpresa(demandaService.obterArquivosDaEmpresa(empresa.id, empresa.nome));
  };

  useEffect(() => {
    let mounted = true;
    userService
      .listarFuncionarios()
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setFuncionarios(data);
          if (!novoResponsavel) {
            setNovoResponsavel(data[0].nome);
          }
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const listaFuncionarios = useMemo(() => {
    const fallback: UsuarioDTO[] = [
      { id: '1', nome: 'Ubuntu Gonçalves', email: 'ubuntu@avalliar.com.br', cargo: 'Encarregado de Vistoria', role: 'VISTORIADOR' },
      { id: '2', nome: 'Linux da Silva', email: 'linux.silva@fatec.sp.gov.br', cargo: 'Engenheiro Civil', role: 'GESTOR' },
      { id: '3', nome: 'Debian Silva', email: 'debian@avalliar.com.br', cargo: 'Vistoriador de Imóveis', role: 'VISTORIADOR' },
      { id: '4', nome: 'Fedora Lima', email: 'fedora@avalliar.com.br', cargo: 'Analista de Laudos', role: 'OPERACIONAL' },
    ];
    if (funcionarios.length > 0) {
      const nomes = new Set<string>();
      const combinada: UsuarioDTO[] = [];
      funcionarios.forEach((f) => {
        if (!nomes.has(f.nome)) {
          nomes.add(f.nome);
          combinada.push(f);
        }
      });
      fallback.forEach((f) => {
        if (!nomes.has(f.nome)) {
          nomes.add(f.nome);
          combinada.push(f);
        }
      });
      return combinada;
    }
    return fallback;
  }, [funcionarios]);

  const handleToggleConcluida = (tarefaId: string) => {
    demandaService.toggleDemandaConcluida(empresa.id, empresa.nome, tarefaId);
    recarregarTudoDaEmpresa();
  };

  const handleEscolherArquivoDispositivo = async (paraNovaDemanda = false) => {
    const selecionado = await selecionarArquivoDoDispositivo(categoriaNovoArquivo);
    if (!selecionado) return;

    if (paraNovaDemanda) {
      setArquivosNovaDemanda((prev) => [
        ...prev,
        {
          nome: selecionado.nome,
          categoria: selecionado.categoria,
          tamanho: selecionado.tamanho,
          webFile: selecionado.webFile,
          uriLocal: selecionado.uri,
          mimeType: selecionado.mimeType,
          selecionado,
        },
      ]);
    } else {
      setNomeNovoArquivo(selecionado.nome);
      setCategoriaNovoArquivo(selecionado.categoria);
      setWebFileSelecionado(selecionado.webFile || null);
      setTamanhoWebFile(selecionado.tamanho);
      setArquivoDispositivoSelecionado(selecionado);
    }
  };

  // Salva o arquivo: se houver `tarefaAlvoArquivo`, salva dentro da demanda específica; caso contrário, salva no acervo geral da empresa
  const handleSalvarArquivo = async () => {
    if (!nomeNovoArquivo.trim() || enviandoArquivo) return;

    setEnviandoArquivo(true);
    try {
      let novoArq: ArquivoAnexo;

      if (tarefaAlvoArquivo) {
        novoArq = demandaService.adicionarArquivoNaDemanda({
          empresaId: empresa.id,
          empresaNome: empresa.nome,
          tarefaId: tarefaAlvoArquivo.id,
          nomeArquivo: nomeNovoArquivo.trim(),
          categoria: categoriaNovoArquivo,
          tamanho: tamanhoWebFile || arquivoDispositivoSelecionado?.tamanho || undefined,
          autor: userName,
          webFile: webFileSelecionado,
          uriLocal: arquivoDispositivoSelecionado?.uri,
          mimeType: arquivoDispositivoSelecionado?.mimeType,
        });
      } else {
        novoArq = demandaService.adicionarArquivoEmpresa({
          empresaId: empresa.id,
          empresaNome: empresa.nome,
          nomeArquivo: nomeNovoArquivo.trim(),
          categoria: categoriaNovoArquivo,
          tamanho: tamanhoWebFile || arquivoDispositivoSelecionado?.tamanho || undefined,
          autor: userName,
          webFile: webFileSelecionado,
          uriLocal: arquivoDispositivoSelecionado?.uri,
          mimeType: arquivoDispositivoSelecionado?.mimeType,
        });
      }

      await enviarArquivoParaServidor(novoArq, arquivoDispositivoSelecionado || undefined);

      recarregarTudoDaEmpresa();
      setNomeNovoArquivo('');
      setWebFileSelecionado(null);
      setTamanhoWebFile('');
      setArquivoDispositivoSelecionado(null);
      setDropdownTarefaDestinoAberto(false);
      setTarefaAlvoArquivo(null);
      setModalArquivoEmpresaAberto(false);
      setToastDownload(
        tarefaAlvoArquivo
          ? `Arquivo enviado para a tarefa "${tarefaAlvoArquivo.titulo}"!`
          : `Arquivo enviado para o acervo de ${empresa.nome}!`
      );
      setTimeout(() => setToastDownload(null), 3200);
    } finally {
      setEnviandoArquivo(false);
    }
  };

  const handleRemoverArquivoDaDemanda = (tarefaId: string, arquivoId: string) => {
    demandaService.removerArquivoDaDemanda(empresa.id, empresa.nome, tarefaId, arquivoId);
    recarregarTudoDaEmpresa();
  };

  const handleRemoverArquivoDaEmpresa = (arquivoId: string) => {
    demandaService.removerArquivoEmpresa(empresa.id, empresa.nome, arquivoId);
    recarregarTudoDaEmpresa();
  };

  const handleProcessarPlanilhaMl = async (
    arq: ArquivoAnexo,
    imovelReferencia?: string
  ) => {
    setProcessandoMlId(arq.id);
    try {
      const rec = await mlService.reconhecerPlanilha(arq.nome, arq.webFile);
      const ext = await mlService.extrairCamposLaudo(
        rec.template_id,
        arq.nome,
        empresa.nome,
        imovelReferencia,
        arq.webFile
      );
      const preenchido = await mlService.preencherPlanilha(rec.template_id, ext.campos);

      demandaService.atualizarStatusMlArquivo(
        arq.id,
        'PREENCHIDA_ML',
        rec.template_id,
        ext.campos,
        preenchido.conteudo_base64
      );
      recarregarTudoDaEmpresa();

      setFeedbackMl({
        visivel: true,
        titulo: 'Planilha Processada via ML!',
        detalhe: `Template reconhecido: ${rec.template_nome} (${Math.round(
          rec.confianca * 100
        )}% de confiança). ${preenchido.campos_preenchidos} células mapeadas e preenchidas automaticamente.`,
        campos: ext.campos,
      });
    } finally {
      setProcessandoMlId(null);
    }
  };

  const handleAbrirVisualizador = async (
    arq: ArquivoAnexo,
    tarefaContexto?: TarefaDemanda
  ) => {
    const msg = await visualizarArquivoDemanda(
      arq,
      empresa.nome,
      tarefaContexto?.titulo,
      tarefaContexto?.imovelReferencia,
      tarefaContexto?.responsavel
    );
    setToastDownload(msg);
    setTimeout(() => {
      setToastDownload(null);
    }, 3200);
  };

  const handleBaixarArquivoRapido = async (
    arq: ArquivoAnexo,
    tarefaContexto?: TarefaDemanda
  ) => {
    const msg = await baixarArquivoDemanda(
      arq,
      empresa.nome,
      tarefaContexto?.titulo,
      tarefaContexto?.imovelReferencia,
      tarefaContexto?.responsavel
    );
    setToastDownload(msg);
    setTimeout(() => {
      setToastDownload(null);
    }, 3200);
  };

  const handleCriarDemanda = async () => {
    if (!novoTitulo.trim()) return;

    const respFinal =
      novoResponsavel.trim() || listaFuncionarios[0]?.nome || 'Ubuntu Gonçalves';

    const nova = demandaService.adicionarDemanda({
      empresaId: empresa.id,
      empresaNome: empresa.nome,
      titulo: novoTitulo.trim(),
      responsavel: respFinal,
      urgencia: novaUrgencia,
    });

    for (const arq of arquivosNovaDemanda) {
      const novoArq = demandaService.adicionarArquivoNaDemanda({
        empresaId: empresa.id,
        empresaNome: empresa.nome,
        tarefaId: nova.id,
        nomeArquivo: arq.nome,
        categoria: arq.categoria,
        tamanho: arq.tamanho,
        autor: userName,
        webFile: arq.webFile,
        uriLocal: arq.uriLocal,
        mimeType: arq.mimeType,
      });
      await enviarArquivoParaServidor(novoArq, arq.selecionado);
    }

    recarregarTudoDaEmpresa();
    setNovoTitulo('');
    setArquivosNovaDemanda([]);
    setDropdownResponsavelAberto(false);
    setNovaDemandaModal(false);
  };

  const tarefasProcessadas = useMemo(() => {
    const filtradas = tarefas.filter((t) => {
      const matchBusca =
        t.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        t.responsavel.toLowerCase().includes(busca.toLowerCase()) ||
        (t.arquivos || []).some((a) => a.nome.toLowerCase().includes(busca.toLowerCase()));
      const matchUrgencia =
        filtroUrgencia === 'TODAS' || t.urgencia === filtroUrgencia;

      return matchBusca && matchUrgencia;
    });

    const pendentes = filtradas.filter((t) => !t.concluida);
    const concluidas = filtradas.filter((t) => t.concluida);

    const pesoUrgencia: Record<Urgencia, number> = {
      ALTA: 3,
      MEDIA: 2,
      BAIXA: 1,
    };

    pendentes.sort((a, b) => pesoUrgencia[b.urgencia] - pesoUrgencia[a.urgencia]);

    return {
      pendentes,
      concluidas,
      todasOrdenadas: [...pendentes, ...concluidas],
    };
  }, [tarefas, busca, filtroUrgencia]);

  const arquivosEmpresaFiltrados = useMemo(() => {
    return arquivosDaEmpresa.filter((arq) => {
      const matchCat =
        filtroCatArquivo === 'TODOS' || arq.categoria === filtroCatArquivo;
      const matchBusca =
        !busca.trim() ||
        arq.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (arq.tarefaTitulo || '').toLowerCase().includes(busca.toLowerCase());
      return matchCat && matchBusca;
    });
  }, [arquivosDaEmpresa, filtroCatArquivo, busca]);

  const getBannerColor = () => {
    if (tarefas.length > 0 && tarefasProcessadas.pendentes.length === 0) {
      return '#388E3C';
    }
    if (tarefasProcessadas.pendentes.length > 0) {
      return '#3B68C4';
    }
    return '#3F3F46';
  };

  const getUrgenciaBadge = (urgencia: Urgencia) => {
    switch (urgencia) {
      case 'ALTA':
        return { label: 'Urgente', bg: '#FEE2E2', text: '#DC2626' };
      case 'MEDIA':
        return { label: 'Média', bg: '#FEF3C7', text: '#B45309' };
      case 'BAIXA':
        return { label: 'Normal', bg: '#F1F5F9', text: '#64748B' };
    }
  };

  const getCategoriaBadgeStyle = (cat: CategoriaArquivo) => {
    switch (cat) {
      case 'RELATORIO':
        return {
          label: 'Relatório',
          bg: '#FEE2E2',
          text: '#C61010',
          icon: 'file-chart-outline' as const,
        };
      case 'VISTORIA':
        return {
          label: 'Doc. Vistoria',
          bg: '#FEF3C7',
          text: '#B45309',
          icon: 'clipboard-check-outline' as const,
        };
      case 'PLANILHA':
        return {
          label: 'Planilha ML',
          bg: '#DCFCE7',
          text: '#15803D',
          icon: 'microsoft-excel' as const,
        };
      case 'DOCUMENTO':
      default:
        return {
          label: 'Documento',
          bg: '#DBEAFE',
          text: '#1D4ED8',
          icon: 'file-document-outline' as const,
        };
    }
  };

  // Renderiza a seção de arquivos (Documentos e Planilhas) dentro de cada card de demanda da empresa
  const renderArquivosDaDemanda = (item: TarefaDemanda) => {
    const arquivos = item.arquivos || [];

    return (
      <View style={styles.demandFilesContainer}>
        <View style={styles.demandFilesHeader}>
          <Pressable
            style={styles.demandFilesHeaderLeft}
            onPress={() => onSelectDemanda && onSelectDemanda(item)}
          >
            <MaterialCommunityIcons
              name="folder-open-outline"
              size={15}
              color="#475569"
            />
            <Text style={styles.demandFilesTitle} numberOfLines={1}>
              Arquivos ({arquivos.length})
            </Text>
          </Pressable>

          <View style={styles.demandFilesHeaderActions}>
            <Pressable
              style={styles.attachFileMiniBtn}
              onPress={() => {
                setTarefaAlvoArquivo(item);
                setDropdownTarefaDestinoAberto(false);
                setCategoriaNovoArquivo('VISTORIA');
                setNomeNovoArquivo('');
                setWebFileSelecionado(null);
                setTamanhoWebFile('');
                setArquivoDispositivoSelecionado(null);
                setModalArquivoEmpresaAberto(true);
              }}
            >
              <Ionicons name="attach" size={13} color="#C61010" />
              <Text style={styles.attachFileMiniBtnText}>Anexar</Text>
            </Pressable>

            {onSelectDemanda && (
              <Pressable
                style={[styles.attachFileMiniBtn, { backgroundColor: '#1E293B' }]}
                onPress={() => onSelectDemanda(item)}
              >
                <Text style={[styles.attachFileMiniBtnText, { color: '#FFFFFF' }]}>
                  Abrir
                </Text>
                <Ionicons name="chevron-forward" size={12} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </View>

        {arquivos.length > 0 && (
          <View style={styles.filesList}>
            {arquivos.map((arq) => {
              const isPlanilha =
                arq.categoria === 'PLANILHA' ||
                ['xlsx', 'xlsm', 'xls', 'csv'].includes(arq.extensao);
              const isProcessando = processandoMlId === arq.id;

              return (
                <View key={arq.id} style={styles.fileChipCard}>
                  <Pressable
                    style={styles.fileChipMainRow}
                    onPress={() => handleAbrirVisualizador(arq, item)}
                  >
                    <View
                      style={[
                        styles.fileIconBox,
                        { backgroundColor: isPlanilha ? '#DCFCE7' : '#DBEAFE' },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={isPlanilha ? 'microsoft-excel' : 'file-document-outline'}
                        size={17}
                        color={isPlanilha ? '#15803D' : '#1D4ED8'}
                      />
                    </View>

                    <View style={styles.fileInfoCol}>
                      <Text
                        style={styles.fileNameText}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {arq.nome}
                      </Text>
                      <View style={styles.fileMetaRow}>
                        <Text style={styles.fileMetaText} numberOfLines={1}>
                          {isPlanilha ? 'Planilha' : 'Doc'} • {arq.tamanho}
                        </Text>

                        {isPlanilha && arq.templateMl && (
                          <View
                            style={[
                              styles.mlTagBadge,
                              arq.statusMl === 'PREENCHIDA_ML' && styles.mlTagBadgeFilled,
                            ]}
                          >
                            <MaterialCommunityIcons
                              name="robot-outline"
                              size={10}
                              color={
                                arq.statusMl === 'PREENCHIDA_ML' ? '#047857' : '#6D28D9'
                              }
                            />
                            <Text
                              style={[
                                styles.mlTagText,
                                arq.statusMl === 'PREENCHIDA_ML' && styles.mlTagTextFilled,
                              ]}
                            >
                              {arq.statusMl === 'PREENCHIDA_ML'
                                ? 'IA OK'
                                : arq.templateMl.includes('v25')
                                ? 'V25'
                                : 'V22'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>

                  <View style={styles.fileChipActionsRow}>
                    <Pressable
                      onPress={() => handleAbrirVisualizador(arq, item)}
                      hitSlop={4}
                      style={styles.fileActionIconBtn}
                      accessibilityLabel="Abrir arquivo no navegador"
                    >
                      <Ionicons name="open-outline" size={15} color="#1D4ED8" />
                    </Pressable>

                    <Pressable
                      onPress={() => handleBaixarArquivoRapido(arq, item)}
                      hitSlop={4}
                      style={[styles.fileActionIconBtn, { backgroundColor: '#DCFCE7' }]}
                      accessibilityLabel="Baixar arquivo"
                    >
                      <Ionicons name="download-outline" size={15} color="#15803D" />
                    </Pressable>

                    {isPlanilha && (
                      <Pressable
                        style={[
                          styles.mlActionMiniBtn,
                          arq.statusMl === 'PREENCHIDA_ML' && styles.mlActionMiniBtnDone,
                        ]}
                        onPress={() =>
                          handleProcessarPlanilhaMl(arq, item.imovelReferencia)
                        }
                        disabled={isProcessando}
                      >
                        {isProcessando ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <MaterialCommunityIcons
                              name="auto-fix"
                              size={12}
                              color="#FFFFFF"
                            />
                            <Text style={styles.mlActionMiniBtnText}>IA</Text>
                          </>
                        )}
                      </Pressable>
                    )}

                    <Pressable
                      onPress={() => handleRemoverArquivoDaDemanda(item.id, arq.id)}
                      hitSlop={6}
                      style={styles.removeFileBtn}
                    >
                      <Ionicons name="trash-outline" size={15} color="#94A3B8" />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Header Vermelho Oficial */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>
            Bem-vindo, <Text style={styles.userNameText}>{userName}</Text>
          </Text>
        </View>
        <Ionicons name="person-circle-outline" size={32} color="#FFFFFF" />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Breadcrumb com Botão Voltar */}
        <View style={styles.breadcrumbRow}>
          <Pressable
            style={styles.backButtonCircle}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Voltar para a lista de demandas"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color="#DC2626" />
          </Pressable>

          <Text style={styles.breadcrumbText} numberOfLines={1}>
            Demandas / <Text style={styles.breadcrumbCompany}>{empresa.nome}</Text>
          </Text>
        </View>

        {/* 3. Título Principal da Tela com Ação de Inserir Arquivo na Empresa e Nova Demanda */}
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Demandas</Text>

          <View style={styles.titleActions}>
            <Pressable
              style={styles.insertCompanyFileBtn}
              onPress={() => {
                setTarefaAlvoArquivo(null);
                setDropdownTarefaDestinoAberto(false);
                setCategoriaNovoArquivo('RELATORIO');
                setNomeNovoArquivo('');
                setWebFileSelecionado(null);
                setTamanhoWebFile('');
                setArquivoDispositivoSelecionado(null);
                setModalArquivoEmpresaAberto(true);
              }}
            >
              <Ionicons name="cloud-upload-outline" size={15} color="#C61010" />
              <Text style={styles.insertCompanyFileBtnText}>Inserir Arquivo</Text>
            </Pressable>

            <Pressable
              style={styles.addDemandButton}
              onPress={() => setNovaDemandaModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Nova demanda para esta empresa"
            >
              <Ionicons name="add-circle" size={30} color="#C61010" />
            </Pressable>
          </View>
        </View>

        {/* 4. Banner com o Card da Empresa + Contagem de Demandas e Arquivos */}
        <View style={[styles.companyBannerCard, { backgroundColor: getBannerColor() }]}>
          <View style={styles.decorBubbleOne} />
          <View style={styles.decorBubbleTwo} />

          <Text style={styles.bannerCompanyName}>{empresa.nome}</Text>

          <View style={styles.bannerInfoRow}>
            <View style={styles.bannerCountPill}>
              <Text style={styles.bannerCountText}>
                {tarefasProcessadas.pendentes.length} pendentes •{' '}
                {tarefasProcessadas.concluidas.length} concluídas
              </Text>
            </View>

            <View style={styles.bannerCountPill}>
              <Ionicons name="document-attach-outline" size={12} color="#FFFFFF" />
              <Text style={styles.bannerCountText}>
                {arquivosDaEmpresa.length} arquivos na empresa
              </Text>
            </View>
          </View>
        </View>

        {/* 5. Barra de Pesquisa de Tarefas ou Arquivos da Empresa */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={17} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Filtrar demandas, relatórios ou planilhas da empresa..."
            placeholderTextColor="#9CA3AF"
            value={busca}
            onChangeText={setBusca}
            clearButtonMode="while-editing"
          />
          {busca.length > 0 && (
            <Pressable onPress={() => setBusca('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {/* 6. Filtros Rápidos por Urgência */}
        <View style={styles.filterPillsRow}>
          {(['TODAS', 'ALTA', 'MEDIA', 'BAIXA'] as const).map((urg) => {
            const isActive = filtroUrgencia === urg;
            return (
              <Pressable
                key={urg}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setFiltroUrgencia(urg)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isActive && styles.filterPillTextActive,
                  ]}
                >
                  {urg === 'TODAS'
                    ? `Todas (${tarefas.length})`
                    : urg === 'ALTA'
                    ? 'Urgentes'
                    : urg === 'MEDIA'
                    ? 'Médias'
                    : 'Normais'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 7. Lista Enfileirada de Demandas da Empresa (Pendentes no topo, Concluídas no final) */}
        <View style={styles.tasksSection}>
          {tarefasProcessadas.todasOrdenadas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={44} color="#9CA3AF" />
              <Text style={styles.emptyText}>Nenhuma demanda encontrada para este filtro.</Text>
            </View>
          ) : (
            <>
              {/* SEÇÃO 1: DEMANDAS PENDENTES */}
              {tarefasProcessadas.pendentes.length > 0 && (
                <View style={styles.subgroupContainer}>
                  <View style={styles.subgroupHeader}>
                    <Text style={styles.subgroupTitle}>
                      Pendentes ({tarefasProcessadas.pendentes.length})
                    </Text>
                    <Text style={styles.subgroupHint}>Toque no círculo para concluir</Text>
                  </View>

                  {tarefasProcessadas.pendentes.map((item) => {
                    const badge = getUrgenciaBadge(item.urgencia);

                    return (
                      <View key={item.id} style={styles.taskCardPending}>
                        <View style={styles.taskCardTopMeta}>
                          <View style={[styles.urgencyBadge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.urgencyBadgeText, { color: badge.text }]}>
                              {badge.label}
                            </Text>
                          </View>

                          <View style={styles.dateContainer}>
                            <Ionicons name="time-outline" size={12} color="#94A3B8" />
                            <Text style={styles.taskDateText}>{item.dataCriacao}</Text>
                          </View>
                        </View>

                        <View style={styles.taskCardBody}>
                          <Pressable
                            style={styles.taskCardTextContent}
                            onPress={() =>
                              onSelectDemanda
                                ? onSelectDemanda(item)
                                : handleToggleConcluida(item.id)
                            }
                          >
                            <Text style={styles.taskTitlePending}>{item.titulo}</Text>
                            {item.imovelReferencia && (
                              <Text style={styles.imovelRefText}>
                                📍 {item.imovelReferencia}
                              </Text>
                            )}
                            <Text style={styles.taskResponsiblePending}>
                              Responsável:{' '}
                              <Text style={styles.taskResponsibleBold}>{item.responsavel}</Text>
                            </Text>
                          </Pressable>

                          <Pressable
                            style={styles.checkboxCirclePending}
                            onPress={() => handleToggleConcluida(item.id)}
                            hitSlop={8}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: false }}
                          />
                        </View>

                        {/* Inserção de Documentos e Planilhas na Demanda */}
                        {renderArquivosDaDemanda(item)}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* SEÇÃO 2: DEMANDAS CONCLUÍDAS */}
              {tarefasProcessadas.concluidas.length > 0 && (
                <View style={styles.subgroupContainer}>
                  <View style={styles.subgroupHeader}>
                    <Text style={styles.subgroupTitleCompleted}>
                      Concluídas ({tarefasProcessadas.concluidas.length})
                    </Text>
                    <Text style={styles.subgroupHint}>Contabilizadas no Painel</Text>
                  </View>

                  {tarefasProcessadas.concluidas.map((item) => (
                    <View key={item.id} style={styles.taskCardCompleted}>
                      <View style={styles.taskCardTopMeta}>
                        <View style={styles.completedBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                          <Text style={styles.completedBadgeText}>Concluída</Text>
                        </View>

                        <View style={styles.dateContainer}>
                          <Ionicons name="time-outline" size={12} color="#94A3B8" />
                          <Text style={styles.taskDateText}>{item.dataCriacao}</Text>
                        </View>
                      </View>

                      <View style={styles.taskCardBody}>
                        <Pressable
                          style={styles.taskCardTextContent}
                          onPress={() =>
                            onSelectDemanda
                              ? onSelectDemanda(item)
                              : handleToggleConcluida(item.id)
                          }
                        >
                          <Text style={styles.taskTitleCompleted}>{item.titulo}</Text>
                          <Text style={styles.taskResponsibleCompleted}>
                            Responsável: {item.responsavel}
                          </Text>
                        </Pressable>

                        <Pressable
                          style={styles.checkboxCircleCompleted}
                          onPress={() => handleToggleConcluida(item.id)}
                          hitSlop={8}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: true }}
                        >
                          <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                        </Pressable>
                      </View>

                      {/* Inserção de Documentos e Planilhas na Demanda Concluída */}
                      {renderArquivosDaDemanda(item)}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* 8. Central de Arquivos da Empresa (Relatórios, Documentos de Vistorias, Planilhas e Documentos) */}
        <View style={styles.companyRepositorySection}>
          <View style={styles.companyRepositoryHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.companyRepositoryTitle}>
                Arquivos e Relatórios de {empresa.nome}
              </Text>
              <Text style={styles.companyRepositorySub}>
                Relatórios técnicos, documentos de vistorias, laudos e planilhas da empresa
              </Text>
            </View>

            <Pressable
              style={styles.addRepoFileBtn}
              onPress={() => {
                setTarefaAlvoArquivo(null);
                setDropdownTarefaDestinoAberto(false);
                setCategoriaNovoArquivo('RELATORIO');
                setNomeNovoArquivo('');
                setWebFileSelecionado(null);
                setTamanhoWebFile('');
                setArquivoDispositivoSelecionado(null);
                setModalArquivoEmpresaAberto(true);
              }}
            >
              <Ionicons name="add" size={17} color="#FFFFFF" />
              <Text style={styles.addRepoFileBtnText}>Adicionar</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.repoFilterRow}
          >
            {(
              [
                { id: 'TODOS', label: `Todos (${arquivosDaEmpresa.length})` },
                { id: 'RELATORIO', label: 'Relatórios' },
                { id: 'VISTORIA', label: 'Docs de Vistoria' },
                { id: 'PLANILHA', label: 'Planilhas ML' },
                { id: 'DOCUMENTO', label: 'Documentos' },
              ] as const
            ).map((cat) => {
              const active = filtroCatArquivo === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[styles.repoFilterChip, active && styles.repoFilterChipActive]}
                  onPress={() => setFiltroCatArquivo(cat.id)}
                >
                  <Text
                    style={[
                      styles.repoFilterChipText,
                      active && styles.repoFilterChipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.repoFilesList}>
            {arquivosEmpresaFiltrados.map((arq) => {
              const badge = getCategoriaBadgeStyle(arq.categoria);
              const isPlanilha =
                arq.categoria === 'PLANILHA' ||
                ['xlsx', 'xlsm', 'xls', 'csv'].includes(arq.extensao);
              const isProcessando = processandoMlId === arq.id;

              return (
                <View key={arq.id} style={styles.repoFileCard}>
                  <Pressable
                    style={styles.fileChipMainRow}
                    onPress={() => handleAbrirVisualizador(arq)}
                  >
                    <View style={[styles.repoFileIcon, { backgroundColor: badge.bg }]}>
                      <MaterialCommunityIcons
                        name={badge.icon}
                        size={19}
                        color={badge.text}
                      />
                    </View>

                    <View style={styles.fileInfoCol}>
                      <Text
                        style={styles.fileNameText}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {arq.nome}
                      </Text>
                      <View style={styles.fileMetaRow}>
                        <View
                          style={[
                            styles.repoCatPill,
                            { backgroundColor: badge.bg },
                          ]}
                        >
                          <Text style={[styles.repoCatPillText, { color: badge.text }]}>
                            {badge.label}
                          </Text>
                        </View>
                        <Text style={styles.fileMetaText} numberOfLines={1}>
                          {arq.tamanho} • {arq.dataUpload}
                        </Text>
                      </View>
                    </View>
                  </Pressable>

                  <View style={styles.fileChipActionsRow}>
                    <Pressable
                      onPress={() => handleAbrirVisualizador(arq)}
                      hitSlop={4}
                      style={styles.fileActionIconBtn}
                      accessibilityLabel="Abrir arquivo no navegador"
                    >
                      <Ionicons name="open-outline" size={15} color="#1D4ED8" />
                    </Pressable>

                    <Pressable
                      onPress={() => handleBaixarArquivoRapido(arq)}
                      hitSlop={4}
                      style={[styles.fileActionIconBtn, { backgroundColor: '#DCFCE7' }]}
                      accessibilityLabel="Baixar arquivo"
                    >
                      <Ionicons name="download-outline" size={15} color="#15803D" />
                    </Pressable>

                    {isPlanilha && (
                      <Pressable
                        style={[
                          styles.mlActionMiniBtn,
                          arq.statusMl === 'PREENCHIDA_ML' && styles.mlActionMiniBtnDone,
                        ]}
                        onPress={() => handleProcessarPlanilhaMl(arq)}
                        disabled={isProcessando}
                      >
                        {isProcessando ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <MaterialCommunityIcons
                              name="auto-fix"
                              size={12}
                              color="#FFFFFF"
                            />
                            <Text style={styles.mlActionMiniBtnText}>IA</Text>
                          </>
                        )}
                      </Pressable>
                    )}

                    <Pressable
                      onPress={() => handleRemoverArquivoDaEmpresa(arq.id)}
                      hitSlop={6}
                      style={styles.removeFileBtn}
                    >
                      <Ionicons name="trash-outline" size={15} color="#94A3B8" />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Barra de Navegação Inferior Vermelha */}
      <BottomNavigation activeTab={activeTab} onSelectTab={onNavigateTab} />

      {/* Modal para Inserir Arquivo (na Demanda específica ou no Acervo da Empresa) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalArquivoEmpresaAberto}
        onRequestClose={() => {
          setModalArquivoEmpresaAberto(false);
          setDropdownTarefaDestinoAberto(false);
          setTarefaAlvoArquivo(null);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setModalArquivoEmpresaAberto(false);
            setDropdownTarefaDestinoAberto(false);
            setTarefaAlvoArquivo(null);
          }}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>
                {tarefaAlvoArquivo
                  ? 'Enviar Arquivo na Tarefa'
                  : `Enviar Arquivo em ${empresa.nome}`}
              </Text>
              <Pressable
                onPress={() => {
                  setModalArquivoEmpresaAberto(false);
                  setDropdownTarefaDestinoAberto(false);
                  setTarefaAlvoArquivo(null);
                }}
                hitSlop={6}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            {/* Destino do arquivo: Acervo Geral da Empresa OU uma Tarefa/Demanda específica */}
            <Text style={styles.inputLabel}>Destino do Documento / Arquivo</Text>
            <Pressable
              style={styles.dropdownSelector}
              onPress={() => setDropdownTarefaDestinoAberto(!dropdownTarefaDestinoAberto)}
            >
              <View style={styles.dropdownSelectorLeft}>
                <Ionicons
                  name={tarefaAlvoArquivo ? 'clipboard-outline' : 'business-outline'}
                  size={18}
                  color="#C61010"
                />
                <Text style={styles.dropdownSelectorText} numberOfLines={1}>
                  {tarefaAlvoArquivo
                    ? `Tarefa: ${tarefaAlvoArquivo.titulo}`
                    : `Acervo Geral da Empresa (${empresa.nome})`}
                </Text>
              </View>
              <Ionicons
                name={dropdownTarefaDestinoAberto ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#64748B"
              />
            </Pressable>

            {dropdownTarefaDestinoAberto && (
              <View style={styles.dropdownListContainer}>
                <ScrollView
                  style={styles.dropdownScroll}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  <Pressable
                    style={[
                      styles.dropdownItem,
                      !tarefaAlvoArquivo && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setTarefaAlvoArquivo(null);
                      setDropdownTarefaDestinoAberto(false);
                    }}
                  >
                    <View style={styles.dropdownItemLeft}>
                      <View
                        style={[
                          styles.dropdownAvatarBadge,
                          { backgroundColor: '#FEE2E2' },
                        ]}
                      >
                        <Ionicons name="business" size={14} color="#C61010" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.dropdownItemText,
                            !tarefaAlvoArquivo && styles.dropdownItemTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          Acervo Geral de {empresa.nome}
                        </Text>
                        <Text style={styles.dropdownItemSubtext} numberOfLines={1}>
                          Relatórios, planilhas e documentos gerais da empresa
                        </Text>
                      </View>
                    </View>
                    {!tarefaAlvoArquivo && (
                      <Ionicons name="checkmark-circle" size={18} color="#C61010" />
                    )}
                  </Pressable>

                  {tarefas.map((t) => {
                    const isSelected = tarefaAlvoArquivo?.id === t.id;
                    return (
                      <Pressable
                        key={t.id}
                        style={[
                          styles.dropdownItem,
                          isSelected && styles.dropdownItemActive,
                        ]}
                        onPress={() => {
                          setTarefaAlvoArquivo(t);
                          setDropdownTarefaDestinoAberto(false);
                        }}
                      >
                        <View style={styles.dropdownItemLeft}>
                          <View
                            style={[
                              styles.dropdownAvatarBadge,
                              { backgroundColor: '#DBEAFE' },
                            ]}
                          >
                            <Ionicons name="document-text" size={14} color="#1D4ED8" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.dropdownItemText,
                                isSelected && styles.dropdownItemTextActive,
                              ]}
                              numberOfLines={1}
                            >
                              {t.titulo}
                            </Text>
                            <Text style={styles.dropdownItemSubtext} numberOfLines={1}>
                              Resp: {t.responsavel} • {(t.arquivos || []).length} arq(s)
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color="#C61010" />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Botão para escolher arquivo real do computador/celular */}
            <Pressable
              style={styles.deviceUploadBox}
              onPress={() => handleEscolherArquivoDispositivo(false)}
            >
              <Ionicons name="folder-open-outline" size={24} color="#C61010" />
              <View style={{ flex: 1 }}>
                <Text style={styles.deviceUploadTitle}>
                  {arquivoDispositivoSelecionado
                    ? 'Trocar arquivo selecionado do dispositivo'
                    : 'Selecionar arquivo do seu dispositivo'}
                </Text>
                <Text style={styles.deviceUploadSub}>
                  Toque para escolher PDF, Planilha (.xlsx/.xlsm), Word (.docx) ou Imagem do seu celular/computador
                </Text>
              </View>
            </Pressable>

            {arquivoDispositivoSelecionado && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: '#ECFDF5',
                  borderWidth: 1,
                  borderColor: '#A7F3D0',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  marginBottom: 8,
                }}
              >
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 12,
                      color: '#065F46',
                    }}
                    numberOfLines={1}
                  >
                    {arquivoDispositivoSelecionado.nome}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 11,
                      color: '#047857',
                    }}
                  >
                    Tamanho real: {arquivoDispositivoSelecionado.tamanho} • Pronto para envio
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.inputLabel}>Categoria do Arquivo</Text>
            <View style={styles.typeSelectGrid}>
              {(
                [
                  { id: 'PLANILHA', label: '📗 Planilha (.xlsx)' },
                  { id: 'DOCUMENTO', label: '📄 Documento' },
                  { id: 'RELATORIO', label: '📊 Relatório' },
                  { id: 'VISTORIA', label: '📋 Doc. Vistoria' },
                ] as const
              ).map((t) => {
                const active = categoriaNovoArquivo === t.id;
                return (
                  <Pressable
                    key={t.id}
                    style={[
                      styles.typeOptionBtn,
                      active && styles.typeOptionBtnActive,
                    ]}
                    onPress={() => setCategoriaNovoArquivo(t.id)}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        active && styles.typeOptionTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Nome de Exibição do Arquivo</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Selecione um arquivo acima ou digite o nome..."
              placeholderTextColor="#9CA3AF"
              value={nomeNovoArquivo}
              onChangeText={setNomeNovoArquivo}
            />

            <Pressable
              style={[
                styles.submitButton,
                (!nomeNovoArquivo.trim() || enviandoArquivo) && { opacity: 0.6 },
              ]}
              onPress={handleSalvarArquivo}
              disabled={!nomeNovoArquivo.trim() || enviandoArquivo}
            >
              {enviandoArquivo ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {tarefaAlvoArquivo
                    ? 'Enviar Arquivo para esta Tarefa'
                    : 'Enviar Arquivo para a Empresa'}
                </Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de Resultado do Processamento Machine Learning na Planilha */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!feedbackMl?.visivel}
        onRequestClose={() => setFeedbackMl(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFeedbackMl(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {feedbackMl && (
              <>
                <View style={styles.mlFeedbackHeader}>
                  <View style={styles.mlFeedbackIconCircle}>
                    <MaterialCommunityIcons name="robot-happy" size={28} color="#FFFFFF" />
                  </View>
                  <Text style={styles.mlFeedbackTitle}>{feedbackMl.titulo}</Text>
                  <Text style={styles.mlFeedbackDesc}>{feedbackMl.detalhe}</Text>
                </View>

                {feedbackMl.campos && (
                  <View style={styles.mlFieldsBox}>
                    <Text style={styles.mlFieldsBoxTitle}>
                      Campos Canônicos Extraídos / Preenchidos:
                    </Text>
                    {Object.entries(feedbackMl.campos)
                      .slice(0, 6)
                      .map(([k, v]) => (
                        <View key={k} style={styles.mlFieldRow}>
                          <Text style={styles.mlFieldKey}>{k}:</Text>
                          <Text style={styles.mlFieldVal} numberOfLines={1}>
                            {String(v)}
                          </Text>
                        </View>
                      ))}
                  </View>
                )}

                <Pressable
                  style={styles.submitButton}
                  onPress={() => setFeedbackMl(null)}
                >
                  <Text style={styles.submitButtonText}>Concluído</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal para Adicionar Nova Demanda para a Empresa (com anexos de documentos/planilhas) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={novaDemandaModal}
        onRequestClose={() => setNovaDemandaModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setNovaDemandaModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Nova Demanda</Text>
              <Pressable onPress={() => setNovaDemandaModal(false)} hitSlop={6}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <Text style={styles.modalCompanySubtitle}>
              Empresa vinculada: <Text style={{ fontFamily: fonts.bold }}>{empresa.nome}</Text>
            </Text>

            <Text style={styles.inputLabel}>Descrição da Demanda / Vistoria</Text>
            <TextInput
              style={styles.modalTextArea}
              placeholder="Ex: Fazer a vistoria de saída do Apto 302 e preencher planilha V22..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              value={novoTitulo}
              onChangeText={setNovoTitulo}
            />

            <Text style={styles.inputLabel}>Responsável Atribuído (Vistoriador / Equipe)</Text>
            <Pressable
              style={styles.dropdownSelector}
              onPress={() => setDropdownResponsavelAberto(!dropdownResponsavelAberto)}
              accessibilityRole="button"
              accessibilityLabel="Selecionar responsável atribuído"
            >
              <View style={styles.dropdownSelectorLeft}>
                <Ionicons name="person-circle-outline" size={20} color="#C61010" />
                <Text style={styles.dropdownSelectorText} numberOfLines={1}>
                  {novoResponsavel || 'Selecione um funcionário...'}
                </Text>
              </View>
              <Ionicons
                name={dropdownResponsavelAberto ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#64748B"
              />
            </Pressable>

            {dropdownResponsavelAberto && (
              <View style={styles.dropdownListContainer}>
                <ScrollView
                  style={styles.dropdownScroll}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {listaFuncionarios.map((func) => {
                    const isSelected = novoResponsavel === func.nome;
                    return (
                      <Pressable
                        key={func.id || func.nome}
                        style={[
                          styles.dropdownItem,
                          isSelected && styles.dropdownItemActive,
                        ]}
                        onPress={() => {
                          setNovoResponsavel(func.nome);
                          setDropdownResponsavelAberto(false);
                        }}
                      >
                        <View style={styles.dropdownItemLeft}>
                          <View style={styles.dropdownAvatarBadge}>
                            <Text style={styles.dropdownAvatarText}>
                              {func.nome.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.dropdownItemText,
                                isSelected && styles.dropdownItemTextActive,
                              ]}
                              numberOfLines={1}
                            >
                              {func.nome}
                            </Text>
                            <Text style={styles.dropdownItemSubtext} numberOfLines={1}>
                              {func.cargo || func.role || 'Funcionário • Vistoriador'}
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#C61010"
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <Text style={styles.inputLabel}>Nível de Urgência</Text>
            <View style={styles.urgencySelectRow}>
              {(['ALTA', 'MEDIA', 'BAIXA'] as const).map((urg) => (
                <Pressable
                  key={urg}
                  style={[
                    styles.urgencyOption,
                    novaUrgencia === urg && styles.urgencyOptionActive,
                  ]}
                  onPress={() => setNovaUrgencia(urg)}
                >
                  <Text
                    style={[
                      styles.urgencyOptionText,
                      novaUrgencia === urg && styles.urgencyOptionTextActive,
                    ]}
                  >
                    {urg === 'ALTA' ? '🔴 Alta' : urg === 'MEDIA' ? '🟡 Média' : '🟢 Baixa'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.newDemandAttachRow}>
              <Text style={styles.inputLabel}>
                Documentos e Planilhas ({arquivosNovaDemanda.length})
              </Text>
              <Pressable
                style={styles.attachFileMiniBtn}
                onPress={() => handleEscolherArquivoDispositivo(true)}
              >
                <Ionicons name="add-circle-outline" size={14} color="#C61010" />
                <Text style={styles.attachFileMiniBtnText}>Anexar</Text>
              </Pressable>
            </View>

            {arquivosNovaDemanda.length > 0 && (
              <View style={{ gap: 4, marginTop: 4 }}>
                {arquivosNovaDemanda.map((arq, idx) => (
                  <View key={idx} style={styles.fileChipCard}>
                    <MaterialCommunityIcons
                      name={
                        arq.categoria === 'PLANILHA'
                          ? 'microsoft-excel'
                          : 'file-document-outline'
                      }
                      size={16}
                      color={arq.categoria === 'PLANILHA' ? '#15803D' : '#1D4ED8'}
                    />
                    <Text style={[styles.fileNameText, { flex: 1 }]} numberOfLines={1}>
                      {arq.nome}
                    </Text>
                    <Pressable
                      onPress={() =>
                        setArquivosNovaDemanda((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <Pressable style={styles.submitButton} onPress={handleCriarDemanda}>
              <Text style={styles.submitButtonText}>Cadastrar Demanda</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de Visualização e Download de Arquivos */}
      <FileViewerModal
        visible={!!arquivoVisualizando}
        arquivo={arquivoVisualizando}
        empresaNome={empresa.nome}
        demandaTitulo={demandaContextoVisualizacao?.titulo}
        imovelReferencia={demandaContextoVisualizacao?.imovelReferencia}
        onClose={() => {
          setArquivoVisualizando(null);
          setDemandaContextoVisualizacao(null);
        }}
        onProcessarMl={(arq) =>
          handleProcessarPlanilhaMl(arq, demandaContextoVisualizacao?.imovelReferencia)
        }
      />

      {toastDownload && (
        <View
          style={{
            position: 'absolute',
            bottom: 86,
            left: 16,
            right: 16,
            backgroundColor: '#064E3B',
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 11,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            elevation: 6,
          }}
        >
          <Ionicons name="checkmark-circle" size={18} color="#34D399" />
          <Text
            style={{
              fontFamily: fonts.semibold,
              fontSize: 12,
              color: '#ECFDF5',
              flex: 1,
            }}
            numberOfLines={2}
          >
            {toastDownload}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#C61010',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 24,
  },

  header: {
    backgroundColor: '#C61010',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: '#FFFFFF',
  },
  userNameText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },

  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.sm,
  },
  backButtonCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  breadcrumbText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: '#C61010',
    flex: 1,
  },
  breadcrumbCompany: {
    fontFamily: fonts.bold,
    color: '#991B1B',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  screenTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: '#1E1E1E',
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  insertCompanyFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  insertCompanyFileBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    color: '#C61010',
  },
  addDemandButton: {
    padding: 2,
  },

  companyBannerCard: {
    borderRadius: 20,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg + 4,
    minHeight: 110,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  decorBubbleOne: {
    position: 'absolute',
    top: -10,
    left: -10,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  decorBubbleTwo: {
    position: 'absolute',
    top: 14,
    left: 28,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  bannerCompanyName: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    zIndex: 2,
  },
  bannerInfoRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    zIndex: 2,
  },
  bannerCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bannerCountText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#FFFFFF',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: spacing.sm,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#1E1E1E',
  },

  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md + 2,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterPillActive: {
    backgroundColor: '#1E1E1E',
    borderColor: '#1E1E1E',
  },
  filterPillText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#6B7280',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },

  tasksSection: {
    gap: 16,
  },
  subgroupContainer: {
    gap: 12,
  },
  subgroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  subgroupTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#1E1E1E',
  },
  subgroupTitleCompleted: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#6B7280',
  },
  subgroupHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#9CA3AF',
  },

  taskCardPending: {
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    padding: spacing.md + 2,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    gap: 6,
    width: '100%',
    overflow: 'hidden',
  },
  taskCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  taskCardTextContent: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  taskCardTopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  urgencyBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  completedBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#047857',
  },
  taskDateText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#94A3B8',
  },
  taskTitlePending: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    lineHeight: 19,
    color: '#1E1E1E',
    marginBottom: 4,
  },
  imovelRefText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#475569',
    marginBottom: 4,
  },
  taskResponsiblePending: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: '#4B5563',
  },
  taskResponsibleBold: {
    fontFamily: fonts.bold,
    color: '#1E1E1E',
  },
  checkboxCirclePending: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    backgroundColor: '#FFFFFF',
  },

  taskCardCompleted: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: spacing.md + 2,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 6,
    opacity: 0.92,
    width: '100%',
    overflow: 'hidden',
  },
  taskTitleCompleted: {
    fontFamily: fonts.semibold,
    fontSize: 13.5,
    lineHeight: 19,
    color: '#64748B',
    textDecorationLine: 'line-through',
    textDecorationColor: '#94A3B8',
    marginBottom: 6,
  },
  taskResponsibleCompleted: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: '#94A3B8',
  },
  checkboxCircleCompleted: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#10B981',
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Seção de Arquivos dentro das Demandas da Empresa */
  demandFilesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
    width: '100%',
    overflow: 'hidden',
  },
  demandFilesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  demandFilesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
    minWidth: 0,
  },
  demandFilesHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  demandFilesTitle: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#475569',
    flexShrink: 1,
  },
  attachFileMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  attachFileMiniBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#C61010',
  },
  filesList: {
    gap: 6,
    width: '100%',
  },
  fileChipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    width: '100%',
    overflow: 'hidden',
  },
  fileChipMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  fileChipActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  fileActionIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fileInfoCol: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  fileNameText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#1E293B',
  },
  fileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  fileMetaText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#64748B',
  },
  mlTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  mlTagBadgeFilled: {
    backgroundColor: '#D1FAE5',
  },
  mlTagText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: '#6D28D9',
  },
  mlTagTextFilled: {
    color: '#047857',
  },
  mlActionMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mlActionMiniBtnDone: {
    backgroundColor: '#059669',
  },
  mlActionMiniBtnText: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    color: '#FFFFFF',
  },
  removeFileBtn: {
    padding: 3,
  },

  /* 8. Acervo de Arquivos da Empresa (Relatórios, Vistorias, Documentos, Planilhas) */
  companyRepositorySection: {
    marginTop: spacing.xl,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    width: '100%',
    overflow: 'hidden',
  },
  companyRepositoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
  },
  companyRepositoryTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#0F172A',
  },
  companyRepositorySub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  addRepoFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#C61010',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    flexShrink: 0,
  },
  addRepoFileBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    color: '#FFFFFF',
  },
  repoFilterRow: {
    gap: 6,
    paddingVertical: 2,
  },
  repoFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  repoFilterChipActive: {
    backgroundColor: '#1E1E1E',
    borderColor: '#1E1E1E',
  },
  repoFilterChipText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#475569',
  },
  repoFilterChipTextActive: {
    color: '#FFFFFF',
  },
  repoFilesList: {
    gap: 8,
    width: '100%',
  },
  repoFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    width: '100%',
    overflow: 'hidden',
  },
  repoFileIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  repoCatPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  repoCatPillText: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: 8,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },

  /* Modais */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.xl,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalHeaderTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#1E1E1E',
    flex: 1,
  },
  modalCompanySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#6B7280',
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#1E1E1E',
    marginBottom: 4,
    marginTop: 8,
  },
  modalTextArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    fontFamily: fonts.regular,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#1E1E1E',
  },
  typeSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  typeOptionBtn: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeOptionBtnActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
  },
  typeOptionText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#64748B',
  },
  typeOptionTextActive: {
    color: '#C61010',
    fontFamily: fonts.bold,
  },
  deviceUploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#F87171',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  deviceUploadTitle: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: '#991B1B',
  },
  deviceUploadSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#B91C1C',
  },
  quickTemplatesList: {
    gap: 6,
    marginTop: 4,
  },
  quickTemplateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickTemplateName: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#1E293B',
  },
  quickTemplateDesc: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#64748B',
  },
  newDemandAttachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  mlFeedbackHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  mlFeedbackIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mlFeedbackTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#1E1E1E',
    textAlign: 'center',
  },
  mlFeedbackDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  mlFieldsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  mlFieldsBoxTitle: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    color: '#334155',
    marginBottom: 4,
  },
  mlFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  mlFieldKey: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#64748B',
  },
  mlFieldVal: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
  },

  urgencySelectRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  urgencyOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  urgencyOptionActive: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  urgencyOptionText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#4B5563',
  },
  urgencyOptionTextActive: {
    color: '#DC2626',
    fontFamily: fonts.bold,
  },
  submitButton: {
    backgroundColor: '#C61010',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },

  dropdownSelector: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dropdownSelectorText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: '#1E1E1E',
  },
  dropdownListContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginTop: 6,
    maxHeight: 160,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 160,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#FEF2F2',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownAvatarBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownAvatarText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#C61010',
  },
  dropdownItemText: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: '#334155',
  },
  dropdownItemTextActive: {
    color: '#C61010',
    fontFamily: fonts.bold,
  },
  dropdownItemSubtext: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
});
