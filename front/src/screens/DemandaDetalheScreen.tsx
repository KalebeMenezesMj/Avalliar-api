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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import { fonts, spacing } from '../theme';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import BottomNavigation, { TabType, getBottomNavigationPadding } from '../components/BottomNavigation';
import FileViewerModal, {
  visualizarArquivoDemanda,
  baixarArquivoDemanda,
  selecionarArquivoDoDispositivo,
  enviarArquivoParaServidor,
  ArquivoDispositivoSelecionado,
} from '../components/FileViewerModal';
import PlanilhaPreenchimentoModal from '../components/PlanilhaPreenchimentoModal';
import RelatorioVistoriaSection from '../components/RelatorioVistoriaSection';
import { AuthResponse } from '../services/authService';
import {
  demandaService,
  EmpresaDemanda,
  TarefaDemanda,
  ArquivoAnexo,
  CategoriaArquivo,
  Urgencia,
} from '../services/demandaService';
import { mlService } from '../services/mlService';
import { relatorioService, osIdDaDemanda } from '../services/relatorioService';
import { whatsappService } from '../services/whatsappService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { registrar } from '../services/logService';

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
  const { colors: t } = useTheme();
  const styles = makeStyles(t);
  const insets = useSafeAreaInsets();
  const navPaddingBottom = getBottomNavigationPadding(insets.bottom);

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

  const [abaDetalhe, setAbaDetalhe] = useState<'RELATORIO_VISTORIA' | 'ARQUIVOS'>('RELATORIO_VISTORIA');
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

  // Estados para Visualização e Download de Arquivos da Demanda
  const [arquivoEmVisualizacao, setArquivoEmVisualizacao] =
    useState<ArquivoAnexo | null>(null);
  const [avisoDownload, setAvisoDownload] = useState<string | null>(null);

  // Agendamento via WhatsApp dentro da demanda (visual — o disparo real via API
  // entra na próxima etapa; por ora o botão apenas simula o envio)
  const [modalAgendamentoAberto, setModalAgendamentoAberto] = useState(false);
  const [agendContato, setAgendContato] = useState('');
  const [agendNome, setAgendNome] = useState('');
  const [agendData, setAgendData] = useState<Date | null>(null);
  const [agendEnviando, setAgendEnviando] = useState(false);
  const [agendErro, setAgendErro] = useState<string | null>(null);
  const [pickerAberto, setPickerAberto] = useState<'date' | 'time' | null>(null);
  const [agendamentoPronto, setAgendamentoPronto] = useState(false);

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

  // Abrir o modal de agendamento com os campos zerados
  const handleAbrirAgendamento = () => {
    setAgendContato('');
    setAgendNome('');
    setAgendData(null);
    setAgendamentoPronto(false);
    setModalAgendamentoAberto(true);
  };

  // Data e horário da vistoria: texto para mostrar e valor para o campo do navegador
  const formatarDataHora = (d: Date) =>
    d.toLocaleString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  const paraValorLocal = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  // Monta a mensagem de agendamento no padrão combinado
  const montarMensagemAgendamento = (): string => {
    const data = agendData as Date;
    const semana = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'][data.getDay()];
    const p = (n: number) => String(n).padStart(2, '0');
    const nome = agendNome.trim();
    const engenheiro = demanda.responsavel && demanda.responsavel !== '—' ? demanda.responsavel : userName;
    return (
      `Olá ${nome}, tudo bem?\n\n` +
      'Estamos entrando em contato para agendar a vistoria referente a:\n\n' +
      `Proponente : ${nome}\n` +
      `Engenheiro Vistoriador : ${engenheiro}\n\n` +
      `Data disponível: ${semana}, dia ${p(data.getDate())}/${p(data.getMonth() + 1)}, às ${p(data.getHours())}:${p(data.getMinutes())}h. Podemos confirmar`
    );
  };

  // Envia a mensagem na hora, pelo WhatsApp conectado na Evolution API
  const handleDispararAgendamento = async () => {
    if (!agendData) return;
    setAgendEnviando(true);
    setAgendErro(null);
    try {
      await whatsappService.enviarMensagem(agendContato, montarMensagemAgendamento());
      setAgendamentoPronto(true);
      registrar('whatsapp.enviada', { os: osIdDaDemanda(demanda.id) });
    } catch (e: any) {
      setAgendErro(e?.message || 'Não foi possível enviar a mensagem.');
    } finally {
      setAgendEnviando(false);
    }
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

  // Planilha salva no servidor: baixa o conteúdo (com o token) antes de abrir ou baixar
  const completarArquivoSalvo = async (arq: ArquivoAnexo): Promise<ArquivoAnexo> => {
    if (!arq.id.startsWith('rel-') || arq.conteudoBase64 || !osIdDemanda) return arq;
    const conteudoBase64 = await relatorioService.baixarPlanilhaBase64(osIdDemanda);
    return { ...arq, conteudoBase64 };
  };

  const handleVisualizarArquivoNoNavegador = async (arqOriginal: ArquivoAnexo) => {
    try {
      const arq = await completarArquivoSalvo(arqOriginal);
      const msg = await visualizarArquivoDemanda(
        arq,
        empresa.nome,
        demanda.titulo,
        demanda.imovelReferencia || empresa.nome,
        demanda.responsavel
      );
      setAvisoDownload(msg);
      setTimeout(() => setAvisoDownload(null), 3500);
    } catch (e: any) {
      setAvisoDownload(`Erro ao visualizar: ${e?.message || 'erro desconhecido'}`);
      setTimeout(() => setAvisoDownload(null), 6000);
    }
  };

  const handleBaixarArquivoDireto = async (arqOriginal: ArquivoAnexo) => {
    try {
      const arq = await completarArquivoSalvo(arqOriginal);
      const msg = await baixarArquivoDemanda(
        arq,
        empresa.nome,
        demanda.titulo,
        demanda.imovelReferencia || empresa.nome,
        demanda.responsavel
      );
      setAvisoDownload(msg);
      setTimeout(() => setAvisoDownload(null), 4000);
    } catch (e: any) {
      setAvisoDownload(`Erro ao baixar: ${e?.message || 'erro desconhecido'}`);
      setTimeout(() => setAvisoDownload(null), 6000);
    }
  };

  // Processar planilha desta demanda com Machine Learning (/reconhecer -> /extrair -> /preencher)
  const handleProcessarPlanilhaMl = (arq: ArquivoAnexo) => {
    setModalPreenchimentoPlanilha({
      visivel: true,
      arquivo: arq,
    });
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

  // Planilha salva do relatório de vistoria (no servidor): aparece na lista de arquivos da demanda
  const [planilhaSalva, setPlanilhaSalva] = useState<ArquivoAnexo | null>(null);
  const osIdDemanda = osIdDaDemanda(demanda.id);

  useEffect(() => {
    if (!osIdDemanda) {
      setPlanilhaSalva(null);
      return;
    }
    let cancelado = false;
    relatorioService
      .buscar(osIdDemanda)
      .then((rel) => {
        if (cancelado) return;
        if (!rel || !rel.temPlanilha) {
          setPlanilhaSalva(null);
          return;
        }
        const nome = rel.planilhaNome || 'planilha.xlsx';
        const extensao = (nome.split('.').pop() || 'xlsx').toLowerCase();
        const kb = rel.planilhaTamanhoBytes
          ? `${Math.max(1, Math.round(rel.planilhaTamanhoBytes / 1024))} KB`
          : '';
        setPlanilhaSalva({
          id: `rel-${osIdDemanda}`,
          nome,
          categoria: 'PLANILHA',
          extensao,
          tamanho: kb,
          dataUpload: rel.atualizadoEm,
          autor: 'Relatório de vistoria',
          tarefaId: demanda.id,
          statusMl: 'PREENCHIDA_ML',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      })
      .catch(() => {
        if (!cancelado) setPlanilhaSalva(null);
      });
    return () => {
      cancelado = true;
    };
  }, [osIdDemanda, demanda.id]);

  const arquivosDaDemanda = useMemo(
    () => (planilhaSalva ? [planilhaSalva, ...(demanda.arquivos || [])] : demanda.arquivos || []),
    [planilhaSalva, demanda.arquivos]
  );

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

          {/* Botão para disparar agendamento pelo WhatsApp (esboço visual) */}
          <Pressable
            style={styles.agendarWhatsBtn}
            onPress={handleAbrirAgendamento}
            accessibilityRole="button"
            accessibilityLabel="Agendar vistoria no WhatsApp do proponente"
          >
            <MaterialCommunityIcons name="whatsapp" size={18} color="#FFFFFF" />
            <Text style={styles.agendarWhatsBtnText}>Agendar no WhatsApp</Text>
          </Pressable>
        </View>

        {/* Seletor de Abas da Demanda: Relatório de Vistoria (IA) vs Arquivos da Demanda */}
        <View style={styles.sectionTabsBar}>
          <Pressable
            style={[
              styles.sectionTabBtn,
              abaDetalhe === 'RELATORIO_VISTORIA' && styles.sectionTabBtnActive,
            ]}
            onPress={() => setAbaDetalhe('RELATORIO_VISTORIA')}
          >
            <MaterialCommunityIcons
              name="clipboard-edit-outline"
              size={17}
              color={abaDetalhe === 'RELATORIO_VISTORIA' ? '#FFFFFF' : t.textMuted}
            />
            <Text
              style={[
                styles.sectionTabText,
                abaDetalhe === 'RELATORIO_VISTORIA' && styles.sectionTabTextActive,
              ]}
            >
              Relatório de Vistoria
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.sectionTabBtn,
              abaDetalhe === 'ARQUIVOS' && styles.sectionTabBtnActive,
            ]}
            onPress={() => setAbaDetalhe('ARQUIVOS')}
          >
            <Ionicons
              name="folder-open-outline"
              size={17}
              color={abaDetalhe === 'ARQUIVOS' ? '#FFFFFF' : t.textMuted}
            />
            <Text
              style={[
                styles.sectionTabText,
                abaDetalhe === 'ARQUIVOS' && styles.sectionTabTextActive,
              ]}
            >
              Arquivos ({arquivosDaDemanda.length})
            </Text>
          </Pressable>
        </View>

        {abaDetalhe === 'RELATORIO_VISTORIA' ? (
          <RelatorioVistoriaSection
            empresaId={empresa.id}
            empresaNome={empresa.nome}
            demandaId={demanda.id}
            demandaTitulo={demanda.titulo}
            imovelReferencia={demanda.imovelReferencia}
            enderecoInicial={demanda.endereco}
            responsavelPadrao={demanda.responsavel || userName}
            onSucessoGeracao={() => {
              recarregarDemanda();
            }}
          />
        ) : (
          <>
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
                <Ionicons name="add-circle-outline" size={16} color={t.accentRed} />
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

          </>
        )}

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
                <Ionicons name="close" size={22} color={t.textMuted} />
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
              <Ionicons name="cloud-upload-outline" size={24} color={t.softRedText} />
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

      {/* Modal de Agendamento no WhatsApp (esboço visual — disparo real via API depois) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalAgendamentoAberto}
        onRequestClose={() => setModalAgendamentoAberto(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalAgendamentoAberto(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Agendar no WhatsApp</Text>
              <Pressable onPress={() => setModalAgendamentoAberto(false)} hitSlop={6}>
                <Ionicons name="close" size={22} color={t.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.modalSub} numberOfLines={2}>
              Demanda: <Text style={{ fontFamily: fonts.bold }}>{demanda.titulo}</Text>
            </Text>

            <Text style={styles.fieldLabel}>Contato do proponente (WhatsApp)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="(11) 99999-9999"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={15}
              value={agendContato}
              onChangeText={setAgendContato}
            />

            <Text style={styles.fieldLabel}>Nome do proponente</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Quem vai comparecer à vistoria"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              value={agendNome}
              onChangeText={setAgendNome}
            />

            <Text style={styles.fieldLabel}>Data e horário da vistoria</Text>
            {Platform.OS === 'web' ? (
              React.createElement('input', {
                type: 'datetime-local',
                value: agendData ? paraValorLocal(agendData) : '',
                onChange: (e: any) => setAgendData(e.target.value ? new Date(e.target.value) : null),
                style: {
                  width: '100%',
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 8,
                  border: '1px solid #D1D5DB',
                  boxSizing: 'border-box',
                },
              })
            ) : (
              <Pressable style={styles.modalInput} onPress={() => setPickerAberto('date')}>
                <Text style={{ color: agendData ? '#111827' : '#9CA3AF' }}>
                  {agendData ? formatarDataHora(agendData) : 'Selecionar data e horário'}
                </Text>
              </Pressable>
            )}
            {Platform.OS !== 'web' && pickerAberto && (
              <DateTimePicker
                value={agendData ?? new Date()}
                mode={pickerAberto}
                is24Hour
                display="default"
                onChange={(_evento, escolhida) => {
                  if (!escolhida) {
                    setPickerAberto(null);
                    return;
                  }
                  if (pickerAberto === 'date') {
                    const base = new Date(escolhida);
                    base.setHours(agendData?.getHours() ?? 9, agendData?.getMinutes() ?? 0);
                    setAgendData(base);
                    setPickerAberto('time');
                  } else {
                    const base = new Date(agendData ?? new Date());
                    base.setHours(escolhida.getHours(), escolhida.getMinutes());
                    setAgendData(base);
                    setPickerAberto(null);
                  }
                }}
              />
            )}

            {agendamentoPronto && (
              <View style={styles.agendamentoOkBox}>
                <Ionicons name="checkmark-circle" size={16} color="#15803D" />
                <Text style={styles.agendamentoOkText}>
                  Mensagem enviada para {agendNome || 'o proponente'} em{' '}
                  {agendData ? formatarDataHora(agendData) : ''}.
                </Text>
              </View>
            )}
            {agendErro && (
              <Text style={{ color: '#DC2626', marginBottom: 8 }}>{agendErro}</Text>
            )}

            <Pressable
              style={[
                styles.submitButton,
                styles.whatsSubmit,
                (!agendContato.trim() || !agendNome.trim() || !agendData || agendEnviando) && { opacity: 0.6 },
              ]}
              onPress={handleDispararAgendamento}
              disabled={!agendContato.trim() || !agendNome.trim() || !agendData || agendEnviando}
            >
              <MaterialCommunityIcons name="whatsapp" size={17} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>{agendEnviando ? 'Enviando...' : 'Disparar Mensagem'}</Text>
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

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: t.brandRed,
  },
  scrollView: {
    flex: 1,
    backgroundColor: t.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 110,
  },
  header: {
    backgroundColor: t.brandRed,
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
    backgroundColor: t.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.cardBorder,
  },
  breadcrumbText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: t.accentRed,
    flex: 1,
  },
  breadcrumbStrong: {
    fontFamily: fonts.bold,
    color: t.softRedText,
  },

  /* Card Principal da Demanda */
  demandaDetailCard: {
    backgroundColor: t.cardBackground,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: t.inputBorder,
    marginBottom: spacing.md,
  },
  demandaDetailCardDone: {
    borderColor: t.statusBg.CONCLUIDA.border,
    backgroundColor: t.statusBg.CONCLUIDA.bg,
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
    color: t.text,
    lineHeight: 24,
    marginBottom: 12,
  },
  metaGrid: {
    backgroundColor: t.chipBackground,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: t.cardBorder,
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
    color: t.textMuted,
  },
  metaValue: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: t.text,
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

  /* Agendamento no WhatsApp (esboço visual) */
  agendarWhatsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#25D366',
    marginTop: 8,
  },
  agendarWhatsBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
    textAlign: 'center',
    flexShrink: 1,
  },
  agendamentoOkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginTop: 12,
  },
  agendamentoOkText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#15803D',
    flex: 1,
  },
  whatsSubmit: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    gap: 8,
  },
  sectionTabsBar: {
    flexDirection: 'row',
    backgroundColor: t.cardBackground,
    borderRadius: 14,
    padding: 4,
    gap: 6,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: t.cardBorder,
  },
  sectionTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  sectionTabBtnActive: {
    backgroundColor: '#C61010',
  },
  sectionTabBtnActiveMl: {
    backgroundColor: '#6D28D9',
  },
  sectionTabText: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: t.textMuted,
  },
  sectionTabTextActive: {
    color: '#FFFFFF',
  },

  /* Seção de Arquivos da Demanda Específica */
  filesSectionCard: {
    backgroundColor: t.cardBackground,
    borderRadius: 20,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: t.cardBorder,
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
    color: t.text,
  },
  filesSectionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: t.textMuted,
    marginTop: 2,
  },
  addFilePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: t.brandRed,
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
    backgroundColor: t.chipBackground,
    borderWidth: 1,
    borderColor: t.cardBorder,
  },
  catChipActive: {
    backgroundColor: t.brandRed,
    borderColor: t.brandRed,
  },
  catChipText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: t.chipText,
  },
  catChipTextActive: {
    color: '#FFFFFF',
  },
  emptyFilesBox: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: t.chipBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.inputBorder,
    gap: 6,
  },
  emptyFilesTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: t.text,
  },
  emptyFilesSub: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: t.textMuted,
    textAlign: 'center',
  },
  emptyUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: t.softRedBackground,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 4,
  },
  emptyUploadBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    color: t.accentRed,
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
    backgroundColor: t.chipBackground,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: t.cardBorder,
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
    color: t.text,
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
    color: t.textMuted,
  },
  mlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: t.purpleSoftBackground,
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
    color: t.purpleSoftText,
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
    borderTopColor: t.divider,
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
    backgroundColor: t.modalBackground,
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
    color: t.text,
  },
  modalSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.textMuted,
    marginBottom: 10,
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: t.text,
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
    backgroundColor: t.chipBackground,
    borderWidth: 1,
    borderColor: t.cardBorder,
    alignItems: 'center',
  },
  catOptionActive: {
    backgroundColor: t.softRedBackground,
    borderColor: t.suggestionBorder,
  },
  catOptionText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: t.chipText,
  },
  catOptionTextActive: {
    fontFamily: fonts.bold,
    color: t.accentRed,
  },
  uploadDropzone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: t.softRedBackground,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#F87171',
    borderRadius: 12,
    padding: 12,
  },
  uploadDropzoneTitle: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: t.softRedText,
  },
  uploadDropzoneSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: t.softRedText,
  },
  modalInput: {
    backgroundColor: t.inputBackground,
    borderWidth: 1,
    borderColor: t.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: t.text,
  },
  presetsList: {
    gap: 6,
    marginTop: 4,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.chipBackground,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.cardBorder,
  },
  presetName: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: t.text,
  },
  presetDesc: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: t.textMuted,
  },
  submitButton: {
    backgroundColor: t.brandRed,
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
    backgroundColor: t.chipBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: t.cardBorder,
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
    color: t.textMuted,
  },
  mlFieldVal: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: t.text,
    flex: 1,
    textAlign: 'right',
  },
});

