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
} from '@expo/vector-icons';

import { fonts, spacing } from '../theme';
import BottomNavigation, { TabType } from '../components/BottomNavigation';
import FileViewerModal, {
  visualizarArquivoDemanda,
  baixarArquivoDemanda,
  selecionarArquivoDoDispositivo,
  enviarArquivoParaServidor,
  ArquivoDispositivoSelecionado,
} from '../components/FileViewerModal';
import PlanilhaPreenchimentoModal from '../components/PlanilhaPreenchimentoModal';
import { AuthResponse } from '../services/authService';
import {
  demandaService,
  EmpresaDemanda,
  TarefaDemanda,
  ArquivoAnexo,
  CategoriaArquivo,
  Urgencia,
} from '../services/demandaService';
import { mlService, MlIdadeResponse } from '../services/mlService';

interface DemandaDetalheScreenProps {
  empresa: EmpresaDemanda;
  demandaInicial: TarefaDemanda;
  currentUser?: AuthResponse | { nome?: string; email?: string; role?: string } | null;
  onBack: () => void;
  onNavigateTab: (tab: TabType) => void;
  activeTab?: TabType;
}

export default function DemandaDetalheScreen({
  empresa,
  demandaInicial,
  currentUser,
  onBack,
  onNavigateTab,
  activeTab = 'demandas',
}: DemandaDetalheScreenProps) {
  const userName = currentUser?.nome || 'Linux da Silva';

  const [demanda, setDemanda] = useState<TarefaDemanda>(() => {
    return (
      demandaService.obterDemandaPorId(empresa.id, empresa.nome, demandaInicial.id) ||
      demandaInicial
    );
  });

  useEffect(() => {
    const atualizada = demandaService.obterDemandaPorId(
      empresa.id,
      empresa.nome,
      demandaInicial.id
    );
    if (atualizada) {
      setDemanda(atualizada);
    }
  }, [empresa.id, empresa.nome, demandaInicial.id]);

  const [filtroCat, setFiltroCat] = useState<'TODOS' | CategoriaArquivo>('TODOS');
  const [modalAnexoAberto, setModalAnexoAberto] = useState(false);
  const [modalPreenchimentoPlanilha, setModalPreenchimentoPlanilha] = useState<{
    visivel: boolean;
    arquivo: ArquivoAnexo | null;
  }>({ visivel: false, arquivo: null });
  const [nomeNovoArquivo, setNomeNovoArquivo] = useState('');
  const [categoriaNovoArquivo, setCategoriaNovoArquivo] =
    useState<CategoriaArquivo>('VISTORIA');
  const [tamanhoNovoArquivo, setTamanhoNovoArquivo] = useState('');
  const [webFileSelecionado, setWebFileSelecionado] = useState<any>(null);
  const [arquivoDispositivo, setArquivoDispositivo] =
    useState<ArquivoDispositivoSelecionado | null>(null);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);

  // Integração ML dentro da demanda específica
  const [processandoMlId, setProcessandoMlId] = useState<string | null>(null);
  const [feedbackMl, setFeedbackMl] = useState<{
    visivel: boolean;
    titulo: string;
    detalhe: string;
    campos?: Record<string, string | number>;
    base64?: string;
    nomeArquivoSaida?: string;
  } | null>(null);

  const [idadeAparente, setIdadeAparente] = useState<MlIdadeResponse | null>(null);
  const [estimandoIdade, setEstimandoIdade] = useState(false);

  // Estados para Visualização e Download de Arquivos da Demanda
  const [arquivoEmVisualizacao, setArquivoEmVisualizacao] =
    useState<ArquivoAnexo | null>(null);
  const [avisoDownload, setAvisoDownload] = useState<string | null>(null);

  const recarregarDemanda = () => {
    const atualizada = demandaService.obterDemandaPorId(
      empresa.id,
      empresa.nome,
      demanda.id
    );
    if (atualizada) {
      setDemanda(atualizada);
    }
  };

  // Alternar conclusão da demanda (impacta diretamente as métricas do Painel de Dashboard)
  const handleToggleConcluida = () => {
    demandaService.toggleDemandaConcluida(empresa.id, empresa.nome, demanda.id);
    recarregarDemanda();
  };

  // Sugestões de arquivos contextualizadas para o imóvel desta demanda
  const sufixoImovel = useMemo(() => {
    const ref = (demanda.imovelReferencia || empresa.nome)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    return ref.slice(0, 22) || 'Imovel';
  }, [demanda.imovelReferencia, empresa.nome]);

  const sugestoesContextualizadas = useMemo(
    () => [
      {
        nome: `Laudo_Vistoria_${sufixoImovel}.pdf`,
        categoria: 'VISTORIA' as CategoriaArquivo,
        tamanho: '2.8 MB',
        desc: 'Documento de vistoria técnica e checklist deste imóvel',
      },
      {
        nome: `Relatorio_Fotografico_${sufixoImovel}.pdf`,
        categoria: 'RELATORIO' as CategoriaArquivo,
        tamanho: '3.4 MB',
        desc: 'Relatório com registro fotográfico e constatações',
      },
      {
        nome: 'Homogeneização_Unidades Isoladas_2025_V22.xlsx',
        categoria: 'PLANILHA' as CategoriaArquivo,
        tamanho: '645 KB',
        desc: 'Planilha de Homogeneização • Template V22 (ML)',
      },
      {
        nome: 'Homogeneização_unidades padronizadas_2026_V25.xlsm',
        categoria: 'PLANILHA' as CategoriaArquivo,
        tamanho: '890 KB',
        desc: 'Planilha de Homogeneização • Template V25 (ML)',
      },
      {
        nome: `Termo_e_Matricula_${sufixoImovel}.docx`,
        categoria: 'DOCUMENTO' as CategoriaArquivo,
        tamanho: '510 KB',
        desc: 'Documentação complementar da demanda',
      },
    ],
    [sufixoImovel]
  );

  // Selecionar arquivo real do computador ou celular (ExpoDocumentPicker / File Input)
  const handleEscolherArquivoDispositivo = async () => {
    const selecionado = await selecionarArquivoDoDispositivo(categoriaNovoArquivo);
    if (!selecionado) return;

    setArquivoDispositivo(selecionado);
    setNomeNovoArquivo(selecionado.nome);
    setCategoriaNovoArquivo(selecionado.categoria);
    setTamanhoNovoArquivo(selecionado.tamanho);
    setWebFileSelecionado(selecionado.webFile || null);
  };

  // Salvar e enviar arquivo real anexado dentro desta demanda específica
  const handleSalvarArquivoNaDemanda = async () => {
    const nomeFinal = (nomeNovoArquivo || arquivoDispositivo?.nome || '').trim();
    if (!nomeFinal) return;

    setEnviandoArquivo(true);
    try {
      const novoArq = demandaService.adicionarArquivoNaDemanda({
        empresaId: empresa.id,
        empresaNome: empresa.nome,
        tarefaId: demanda.id,
        tarefaTitulo: demanda.titulo,
        nomeArquivo: nomeFinal,
        categoria: categoriaNovoArquivo,
        tamanho: tamanhoNovoArquivo || arquivoDispositivo?.tamanho || undefined,
        autor: userName,
        webFile: webFileSelecionado || arquivoDispositivo?.webFile,
        uriLocal: arquivoDispositivo?.uri,
        mimeType: arquivoDispositivo?.mimeType,
      });

      await enviarArquivoParaServidor(novoArq, arquivoDispositivo);

      recarregarDemanda();
      setNomeNovoArquivo('');
      setTamanhoNovoArquivo('');
      setWebFileSelecionado(null);
      setArquivoDispositivo(null);
      setModalAnexoAberto(false);
      setAvisoDownload(`Arquivo "${novoArq.nome}" enviado para esta demanda!`);
      setTimeout(() => setAvisoDownload(null), 3500);
    } finally {
      setEnviandoArquivo(false);
    }
  };

  const handleRemoverArquivo = (arquivoId: string) => {
    demandaService.removerArquivoDaDemanda(
      empresa.id,
      empresa.nome,
      demanda.id,
      arquivoId
    );
    recarregarDemanda();
  };

  const handleVisualizarArquivoNoNavegador = async (arq: ArquivoAnexo) => {
    const msg = await visualizarArquivoDemanda(
      arq,
      empresa.nome,
      demanda.titulo,
      demanda.imovelReferencia || empresa.nome,
      demanda.responsavel
    );
    setAvisoDownload(msg);
    setTimeout(() => setAvisoDownload(null), 3500);
  };

  const handleBaixarArquivoDireto = async (arq: ArquivoAnexo) => {
    const msg = await baixarArquivoDemanda(
      arq,
      empresa.nome,
      demanda.titulo,
      demanda.imovelReferencia || empresa.nome,
      demanda.responsavel
    );
    setAvisoDownload(msg);
    setTimeout(() => setAvisoDownload(null), 4000);
  };

  // Processar planilha desta demanda com Machine Learning (/reconhecer -> /extrair -> /preencher)
  const handleProcessarPlanilhaMl = (arq: ArquivoAnexo) => {
    setModalPreenchimentoPlanilha({
      visivel: true,
      arquivo: arq,
    });
  };

  // Estimar idade aparente do imóvel desta demanda via foto (/idade)
  const handleEstimarIdadeFotoVistoria = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e?.target?.files?.[0];
        if (!file) return;
        setEstimandoIdade(true);
        try {
          const res = await mlService.estimarIdadeAparente(file.name, file);
          setIdadeAparente(res);
        } finally {
          setEstimandoIdade(false);
        }
      };
      input.click();
    } else {
      setEstimandoIdade(true);
      mlService
        .estimarIdadeAparente(`Foto_Vistoria_${sufixoImovel}.jpg`)
        .then((res) => setIdadeAparente(res))
        .finally(() => setEstimandoIdade(false));
    }
  };

  const handleBaixarPlanilhaPreenchida = async () => {
    const planilhaAlvo: ArquivoAnexo = {
      id: 'ml-filled',
      nome: feedbackMl?.nomeArquivoSaida || 'Planilha_Demanda_ML.xlsx',
      extensao: 'xlsx',
      categoria: 'PLANILHA',
      tamanho: '680 KB',
      dataUpload: 'Agora',
      autor: userName,
      conteudoBase64: feedbackMl?.base64,
      camposExtraidosMl: feedbackMl?.campos,
    };
    await handleBaixarArquivoDireto(planilhaAlvo);
  };

  const arquivosDaDemanda = demanda.arquivos || [];

  const arquivosFiltrados = useMemo(() => {
    if (filtroCat === 'TODOS') return arquivosDaDemanda;
    return arquivosDaDemanda.filter((a) => a.categoria === filtroCat);
  }, [arquivosDaDemanda, filtroCat]);

  const getUrgenciaBadge = (urgencia: Urgencia) => {
    switch (urgencia) {
      case 'ALTA':
        return { label: 'Urgente (SLA 24h)', bg: '#FEE2E2', text: '#DC2626' };
      case 'MEDIA':
        return { label: 'Média (SLA 48h)', bg: '#FEF3C7', text: '#B45309' };
      case 'BAIXA':
        return { label: 'Normal (SLA 7d)', bg: '#F1F5F9', text: '#64748B' };
    }
  };

  const getCategoriaBadgeStyle = (cat: CategoriaArquivo) => {
    switch (cat) {
      case 'VISTORIA':
        return {
          label: 'Doc. Vistoria',
          bg: '#FEF3C7',
          text: '#B45309',
          icon: 'clipboard-check-outline' as const,
        };
      case 'RELATORIO':
        return {
          label: 'Relatório',
          bg: '#FEE2E2',
          text: '#C61010',
          icon: 'file-chart-outline' as const,
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

  const badgeUrg = getUrgenciaBadge(demanda.urgencia);

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
            accessibilityLabel="Voltar para as demandas da empresa"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color="#DC2626" />
          </Pressable>

          <Text style={styles.breadcrumbText} numberOfLines={1}>
            {empresa.nome} / <Text style={styles.breadcrumbStrong}>Demanda</Text>
          </Text>
        </View>

        {/* 3. Card de Detalhes da Demanda Específica */}
        <View
          style={[
            styles.demandaDetailCard,
            demanda.concluida && styles.demandaDetailCardDone,
          ]}
        >
          <View style={styles.topBadgesRow}>
            <View style={[styles.urgencyPill, { backgroundColor: badgeUrg.bg }]}>
              <Text style={[styles.urgencyPillText, { color: badgeUrg.text }]}>
                {badgeUrg.label}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: demanda.concluida ? '#DCFCE7' : '#DBEAFE',
                },
              ]}
            >
              <Ionicons
                name={demanda.concluida ? 'checkmark-circle' : 'time-outline'}
                size={14}
                color={demanda.concluida ? '#15803D' : '#1D4ED8'}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: demanda.concluida ? '#15803D' : '#1D4ED8' },
                ]}
              >
                {demanda.concluida ? 'Concluída' : 'Em Andamento'}
              </Text>
            </View>
          </View>

          <Text style={styles.demandaTitle}>{demanda.titulo}</Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaRowItem}>
              <Ionicons name="business-outline" size={16} color="#64748B" />
              <Text style={styles.metaLabel}>Empresa:</Text>
              <Text style={styles.metaValue}>{empresa.nome}</Text>
            </View>

            {demanda.imovelReferencia && (
              <View style={styles.metaRowItem}>
                <Ionicons name="home-outline" size={16} color="#64748B" />
                <Text style={styles.metaLabel}>Imóvel:</Text>
                <Text style={styles.metaValue}>{demanda.imovelReferencia}</Text>
              </View>
            )}

            <View style={styles.metaRowItem}>
              <Ionicons name="person-outline" size={16} color="#64748B" />
              <Text style={styles.metaLabel}>Responsável:</Text>
              <Text style={styles.metaValue}>{demanda.responsavel}</Text>
            </View>

            <View style={styles.metaRowItem}>
              <Ionicons name="calendar-outline" size={16} color="#64748B" />
              <Text style={styles.metaLabel}>Registrada:</Text>
              <Text style={styles.metaValue}>{demanda.dataCriacao}</Text>
            </View>
          </View>

          {/* Botão para Concluir / Reabrir a Demanda */}
          <Pressable
            style={[
              styles.toggleStatusButton,
              demanda.concluida
                ? styles.toggleStatusButtonReopen
                : styles.toggleStatusButtonComplete,
            ]}
            onPress={handleToggleConcluida}
          >
            <Ionicons
              name={
                demanda.concluida
                  ? 'refresh-circle-outline'
                  : 'checkmark-done-circle-outline'
              }
              size={19}
              color="#FFFFFF"
            />
            <Text style={styles.toggleStatusButtonText} numberOfLines={1}>
              {demanda.concluida ? 'Reabrir Demanda' : 'Concluir Demanda'}
            </Text>
          </Pressable>
        </View>

        {/* 4. Seção de Inserção de Arquivos da Demanda Específica */}
        <View style={styles.filesSectionCard}>
          <View style={styles.filesSectionHeader}>
            <View style={styles.filesSectionHeaderInfo}>
              <Text style={styles.filesSectionTitle}>
                Arquivos da Demanda ({arquivosDaDemanda.length})
              </Text>
              <Text style={styles.filesSectionSubtitle}>
                Documentos de vistoria, relatórios, laudos e planilhas desta demanda
              </Text>
            </View>

            <Pressable
              style={styles.addFilePrimaryBtn}
              onPress={() => {
                setNomeNovoArquivo('');
                setCategoriaNovoArquivo('VISTORIA');
                setTamanhoNovoArquivo('');
                setWebFileSelecionado(null);
                setArquivoDispositivo(null);
                setModalAnexoAberto(true);
              }}
            >
              <Ionicons name="cloud-upload-outline" size={15} color="#FFFFFF" />
              <Text style={styles.addFilePrimaryBtnText}>Inserir</Text>
            </Pressable>
          </View>

          {/* Filtros por categoria de arquivo dentro da demanda */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterCatScroll}
          >
            {(
              [
                { id: 'TODOS', label: `Todos (${arquivosDaDemanda.length})` },
                { id: 'VISTORIA', label: 'Doc. Vistoria' },
                { id: 'RELATORIO', label: 'Relatórios' },
                { id: 'PLANILHA', label: 'Planilhas (ML)' },
                { id: 'DOCUMENTO', label: 'Documentos' },
              ] as const
            ).map((cat) => {
              const active = filtroCat === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  style={[styles.catChip, active && styles.catChipActive]}
                  onPress={() => setFiltroCat(cat.id)}
                >
                  <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Aviso de Download Concluído */}
          {avisoDownload && (
            <View style={styles.downloadBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#15803D" />
              <Text style={styles.downloadBannerText}>{avisoDownload}</Text>
            </View>
          )}

          {/* Lista de Arquivos Anexados nesta Demanda */}
          {arquivosFiltrados.length === 0 ? (
            <View style={styles.emptyFilesBox}>
              <MaterialCommunityIcons
                name="file-plus-outline"
                size={38}
                color="#94A3B8"
              />
              <Text style={styles.emptyFilesTitle}>
                Nenhum arquivo anexado nesta categoria
              </Text>
              <Text style={styles.emptyFilesSub}>
                Toque no botão abaixo para anexar o documento de vistoria, relatório ou planilha desta demanda.
              </Text>
              <Pressable
                style={styles.emptyUploadBtn}
                onPress={() => setModalAnexoAberto(true)}
              >
                <Ionicons name="add-circle-outline" size={16} color="#C61010" />
                <Text style={styles.emptyUploadBtnText}>
                  Anexar Arquivo na Demanda
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.filesListContainer}>
              {arquivosFiltrados.map((arq) => {
                const badge = getCategoriaBadgeStyle(arq.categoria);
                const isPlanilha =
                  arq.categoria === 'PLANILHA' ||
                  ['xlsx', 'xlsm', 'xls', 'csv'].includes(arq.extensao);
                const isProcessando = processandoMlId === arq.id;

                return (
                  <View key={arq.id} style={styles.fileItemCard}>
                    <Pressable
                      style={styles.fileItemTopRow}
                      onPress={() => handleVisualizarArquivoNoNavegador(arq)}
                    >
                      <View
                        style={[styles.fileItemIcon, { backgroundColor: badge.bg }]}
                      >
                        <MaterialCommunityIcons
                          name={badge.icon}
                          size={21}
                          color={badge.text}
                        />
                      </View>

                      <View style={styles.fileItemInfo}>
                        <Text
                          style={styles.fileItemName}
                          numberOfLines={1}
                          ellipsizeMode="middle"
                        >
                          {arq.nome}
                        </Text>

                        <View style={styles.fileItemMetaRow}>
                          <View style={[styles.catMiniPill, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.catMiniPillText, { color: badge.text }]}>
                              {badge.label}
                            </Text>
                          </View>

                          <Text style={styles.fileItemMetaText}>
                            {arq.tamanho} • {arq.dataUpload}
                          </Text>

                          {isPlanilha && arq.templateMl && (
                            <View
                              style={[
                                styles.mlBadge,
                                arq.statusMl === 'PREENCHIDA_ML' && styles.mlBadgeDone,
                              ]}
                            >
                              <MaterialCommunityIcons
                                name="robot-outline"
                                size={11}
                                color={
                                  arq.statusMl === 'PREENCHIDA_ML' ? '#047857' : '#6D28D9'
                                }
                              />
                              <Text
                                style={[
                                  styles.mlBadgeText,
                                  arq.statusMl === 'PREENCHIDA_ML' && styles.mlBadgeTextDone,
                                ]}
                              >
                                {arq.statusMl === 'PREENCHIDA_ML'
                                  ? 'Preenchida IA'
                                  : arq.templateMl.includes('v25')
                                  ? 'V25'
                                  : 'V22'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </Pressable>

                    {/* Barra de Ações do Arquivo contida dentro do Card */}
                    <View style={styles.fileActionBtnsRow}>
                      <Pressable
                        style={styles.actionChipBtnOpen}
                        onPress={() => handleVisualizarArquivoNoNavegador(arq)}
                        accessibilityRole="button"
                        accessibilityLabel={`Abrir ${arq.nome} no navegador`}
                      >
                        <Ionicons name="open-outline" size={14} color="#1D4ED8" />
                        <Text style={styles.actionChipBtnOpenText}>Abrir</Text>
                      </Pressable>

                      <Pressable
                        style={styles.actionChipBtnDownload}
                        onPress={() => handleBaixarArquivoDireto(arq)}
                        accessibilityRole="button"
                        accessibilityLabel={`Baixar ${arq.nome}`}
                      >
                        <Ionicons name="download-outline" size={14} color="#15803D" />
                        <Text style={styles.actionChipBtnDownloadText}>Baixar</Text>
                      </Pressable>

                      {isPlanilha && (
                        <Pressable
                          style={[
                            styles.mlProcessBtn,
                            arq.statusMl === 'PREENCHIDA_ML' && styles.mlProcessBtnDone,
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
                                size={13}
                                color="#FFFFFF"
                              />
                              <Text style={styles.mlProcessBtnText}>
                                {arq.statusMl === 'PREENCHIDA_ML' ? 'Reprocessar IA' : 'Preencher IA'}
                              </Text>
                            </>
                          )}
                        </Pressable>
                      )}

                      <Pressable
                        onPress={() => handleRemoverArquivo(arq.id)}
                        hitSlop={8}
                        style={styles.deleteBtn}
                        accessibilityLabel={`Excluir ${arq.nome}`}
                      >
                        <Ionicons name="trash-outline" size={16} color="#94A3B8" />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 5. Recurso ML na Vistoria da Demanda: Estimar Idade Aparente por Foto do Imóvel (/idade) */}
        <View style={styles.mlVistoriaCard}>
          <View style={styles.mlVistoriaHeader}>
            <View style={styles.mlVistoriaIconBox}>
              <MaterialCommunityIcons name="camera-iris" size={22} color="#6D28D9" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mlVistoriaTitle}>
                IA na Vistoria • Idade Aparente do Imóvel
              </Text>
              <Text style={styles.mlVistoriaSub}>
                Envie uma foto da vistoria desta demanda para estimar a idade aparente (`/idade`)
              </Text>
            </View>
            <Pressable
              style={styles.mlVistoriaBtn}
              onPress={handleEstimarIdadeFotoVistoria}
              disabled={estimandoIdade}
            >
              {estimandoIdade ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.mlVistoriaBtnText}>Analisar Foto</Text>
                </>
              )}
            </Pressable>
          </View>

          {idadeAparente && (
            <View style={styles.idadeResultBox}>
              <Text style={styles.idadeResultMain}>
                Idade Aparente Estimada:{' '}
                <Text style={{ color: '#6D28D9' }}>
                  {idadeAparente.idade_aparente_anos} anos
                </Text>
              </Text>
              <Text style={styles.idadeResultSub}>
                {idadeAparente.estado_sugerido} • Arquivo: {idadeAparente.arquivo}
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 85 }} />
      </ScrollView>

      <BottomNavigation activeTab={activeTab} onSelectTab={onNavigateTab} />

      {/* Modal de Visualização e Download Integrado */}
      <FileViewerModal
        visible={!!arquivoEmVisualizacao}
        arquivo={arquivoEmVisualizacao}
        empresaNome={empresa.nome}
        demandaTitulo={demanda.titulo}
        imovelReferencia={demanda.imovelReferencia || empresa.nome}
        onClose={() => setArquivoEmVisualizacao(null)}
        onProcessarMl={async (arq) => {
          await handleProcessarPlanilhaMl(arq);
          const atualizada = demandaService.obterDemandaPorId(
            empresa.id,
            empresa.nome,
            demanda.id
          );
          const arqAtualizado = atualizada?.arquivos?.find((a) => a.id === arq.id);
          if (arqAtualizado) {
            setArquivoEmVisualizacao(arqAtualizado);
          }
        }}
      />

      {/* Modal para Inserir Arquivo dentro desta Demanda Específica */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalAnexoAberto}
        onRequestClose={() => setModalAnexoAberto(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalAnexoAberto(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Anexar Arquivo na Demanda</Text>
              <Pressable onPress={() => setModalAnexoAberto(false)} hitSlop={6}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <Text style={styles.modalSub} numberOfLines={2}>
              Demanda: <Text style={{ fontFamily: fonts.bold }}>{demanda.titulo}</Text>
            </Text>

            <Text style={styles.fieldLabel}>Tipo de Arquivo da Demanda</Text>
            <View style={styles.catGrid}>
              {(
                [
                  { id: 'VISTORIA', label: '📋 Doc. Vistoria' },
                  { id: 'RELATORIO', label: '📊 Relatório' },
                  { id: 'PLANILHA', label: '📗 Planilha (.xlsx)' },
                  { id: 'DOCUMENTO', label: '📄 Documento' },
                ] as const
              ).map((c) => {
                const active = categoriaNovoArquivo === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.catOption, active && styles.catOptionActive]}
                    onPress={() => setCategoriaNovoArquivo(c.id)}
                  >
                    <Text
                      style={[
                        styles.catOptionText,
                        active && styles.catOptionTextActive,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={styles.uploadDropzone}
              onPress={handleEscolherArquivoDispositivo}
            >
              <Ionicons name="cloud-upload-outline" size={24} color="#C61010" />
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadDropzoneTitle}>
                  {arquivoDispositivo
                    ? 'Trocar arquivo do dispositivo'
                    : 'Selecionar arquivo do dispositivo'}
                </Text>
                <Text style={styles.uploadDropzoneSub}>
                  Toque para buscar no celular ou computador (.pdf, .xlsx, .xlsm, .docx, foto)
                </Text>
              </View>
            </Pressable>

            {arquivoDispositivo && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#ECFDF5',
                  borderWidth: 1,
                  borderColor: '#6EE7B7',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  marginTop: 8,
                }}
              >
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 12,
                      color: '#065F46',
                    }}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {arquivoDispositivo.nome}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 10.5,
                      color: '#047857',
                    }}
                  >
                    Arquivo selecionado • {arquivoDispositivo.tamanho}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.fieldLabel}>Nome do Arquivo na Tarefa</Text>
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
              onPress={handleSalvarArquivoNaDemanda}
              disabled={!nomeNovoArquivo.trim() || enviandoArquivo}
            >
              {enviandoArquivo ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Enviar Arquivo para esta Demanda
                </Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de Resultado ML */}
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
                <View style={{ alignItems: 'center', marginBottom: 12 }}>
                  <View style={styles.mlModalCircle}>
                    <MaterialCommunityIcons
                      name="robot-happy"
                      size={28}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.modalTitle}>{feedbackMl.titulo}</Text>
                  <Text
                    style={[
                      styles.modalSub,
                      { textAlign: 'center', marginTop: 4 },
                    ]}
                  >
                    {feedbackMl.detalhe}
                  </Text>
                </View>

                {feedbackMl.campos && (
                  <View style={styles.mlFieldsBox}>
                    {Object.entries(feedbackMl.campos).map(([k, v]) => (
                      <View key={k} style={styles.mlFieldRow}>
                        <Text style={styles.mlFieldKey}>{k}:</Text>
                        <Text style={styles.mlFieldVal} numberOfLines={1}>
                          {String(v)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {feedbackMl.base64 && Platform.OS === 'web' && (
                  <Pressable
                    style={[
                      styles.submitButton,
                      { backgroundColor: '#15803D', marginBottom: 6 },
                    ]}
                    onPress={handleBaixarPlanilhaPreenchida}
                  >
                    <Text style={styles.submitButtonText}>
                      Baixar Planilha Preenchida (.xlsx)
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  style={styles.submitButton}
                  onPress={() => setFeedbackMl(null)}
                >
                  <Text style={styles.submitButtonText}>Fechar</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
      {/* Modal Dinâmico de Reconhecimento e Preenchimento de Planilhas via ML */}
      <PlanilhaPreenchimentoModal
        visible={modalPreenchimentoPlanilha.visivel}
        arquivo={modalPreenchimentoPlanilha.arquivo}
        empresaNome={empresa.nome}
        demandaTitulo={demanda.titulo}
        imovelReferencia={demanda.imovelReferencia || empresa.nome}
        responsavel={demanda.responsavel}
        onClose={() => setModalPreenchimentoPlanilha({ visivel: false, arquivo: null })}
        onSucessoPreenchimento={() => {
          recarregarDemanda();
        }}
      />
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
    backgroundColor: '#F8FAFC',
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
    marginBottom: spacing.md,
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
  breadcrumbStrong: {
    fontFamily: fonts.bold,
    color: '#991B1B',
  },

  /* Card Principal da Demanda */
  demandaDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    marginBottom: spacing.md,
  },
  demandaDetailCardDone: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  topBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  urgencyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgencyPillText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  demandaTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#0F172A',
    lineHeight: 24,
    marginBottom: 12,
  },
  metaGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  metaRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#64748B',
  },
  metaValue: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#1E293B',
    flex: 1,
  },
  toggleStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: '100%',
    overflow: 'hidden',
  },
  toggleStatusButtonComplete: {
    backgroundColor: '#16A34A',
  },
  toggleStatusButtonReopen: {
    backgroundColor: '#475569',
  },
  toggleStatusButtonText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
    textAlign: 'center',
    flexShrink: 1,
  },

  /* Seção de Arquivos da Demanda Específica */
  filesSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.md,
    gap: 12,
    width: '100%',
    overflow: 'hidden',
  },
  filesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
  },
  filesSectionHeaderInfo: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  filesSectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 15.5,
    color: '#0F172A',
  },
  filesSectionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  addFilePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#C61010',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexShrink: 0,
  },
  addFilePrimaryBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  filterCatScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  catChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  catChipText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#475569',
  },
  catChipTextActive: {
    color: '#FFFFFF',
  },
  emptyFilesBox: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    gap: 6,
  },
  emptyFilesTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#334155',
  },
  emptyFilesSub: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
  },
  emptyUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 4,
  },
  emptyUploadBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    color: '#C61010',
  },
  filesListContainer: {
    gap: 10,
    width: '100%',
  },
  downloadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  downloadBannerText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#15803D',
    flex: 1,
  },
  fileItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    width: '100%',
    overflow: 'hidden',
  },
  fileItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  fileItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fileItemInfo: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  fileItemName: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: '#0F172A',
  },
  fileItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  catMiniPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  catMiniPillText: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
  },
  fileItemMetaText: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: '#64748B',
  },
  mlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  mlBadgeDone: {
    backgroundColor: '#D1FAE5',
  },
  mlBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    color: '#6D28D9',
  },
  mlBadgeTextDone: {
    color: '#047857',
  },
  fileActionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    width: '100%',
  },
  actionChipBtnOpen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionChipBtnOpenText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#1D4ED8',
  },
  actionChipBtnDownload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionChipBtnDownloadText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#15803D',
  },
  mlProcessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mlProcessBtnDone: {
    backgroundColor: '#059669',
  },
  mlProcessBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  deleteBtn: {
    marginLeft: 'auto',
    padding: 5,
  },

  /* Card IA Idade Aparente na Demanda */
  mlVistoriaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  mlVistoriaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mlVistoriaIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mlVistoriaTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#0F172A',
  },
  mlVistoriaSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  mlVistoriaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6D28D9',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },
  mlVistoriaBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  idadeResultBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  idadeResultMain: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#1E293B',
  },
  idadeResultSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
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
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#0F172A',
  },
  modalSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 4,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  catOption: {
    width: '48%',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  catOptionActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
  },
  catOptionText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#475569',
  },
  catOptionTextActive: {
    fontFamily: fonts.bold,
    color: '#C61010',
  },
  uploadDropzone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#F87171',
    borderRadius: 12,
    padding: 12,
  },
  uploadDropzoneTitle: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: '#991B1B',
  },
  uploadDropzoneSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#B91C1C',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#0F172A',
  },
  presetsList: {
    gap: 6,
    marginTop: 4,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetName: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#1E293B',
  },
  presetDesc: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#64748B',
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
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  mlModalCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mlFieldsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
    marginBottom: 10,
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
});

