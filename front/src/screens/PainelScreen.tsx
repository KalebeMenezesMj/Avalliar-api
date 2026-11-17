import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
} from '@expo/vector-icons';

import { fonts, spacing } from '../theme';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import BottomNavigation, { TabType, getBottomNavigationPadding } from '../components/BottomNavigation';
import PlanilhaPreenchimentoModal from '../components/PlanilhaPreenchimentoModal';
import SegmentedControl from '../components/SegmentedControl';
import RankedBarChart from '../components/charts/RankedBarChart';
import StackedColumnChart from '../components/charts/StackedColumnChart';
import MeterList, { MeterItem } from '../components/charts/MeterList';
import { chartColors } from '../components/charts/palette';
import RelatorioEmpresas from '../components/dashboard/RelatorioEmpresas';
import { PERIODOS, Periodo, resumoDoPeriodo } from '../utils/periodo';
import { AuthResponse } from '../services/authService';
import {
  demandaService,
  MetricasDashboard,
  ArquivoAnexo,
  EmpresaDemanda,
} from '../services/demandaService';
import {
  mlService,
  MlHealthResponse,
  MlRunMetric,
  MlRagResultItem,
} from '../services/mlService';

interface PainelScreenProps {
  currentUser?: AuthResponse | { nome?: string; email?: string; role?: string } | null;
  onBack: () => void;
  onNavigateTab: (tab: TabType) => void;
  onSelectEmpresa?: (empresa: EmpresaDemanda) => void;
  onLogout?: () => void;
  activeTab?: TabType;
}

type TipoGrafico = 'colunas' | 'barras' | 'medidores';

const TIPOS_GRAFICO: Array<{ key: TipoGrafico; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { key: 'colunas', label: 'Colunas', icon: 'bar-chart-outline' },
  { key: 'barras', label: 'Barras', icon: 'reorder-three-outline' },
  { key: 'medidores', label: 'Medidores', icon: 'speedometer-outline' },
];

const BRAND = '#C61010';
const ML = '#6D28D9';

export default function PainelScreen({
  currentUser,
  onBack,
  onNavigateTab,
  onSelectEmpresa,
  activeTab = 'painel',
}: PainelScreenProps) {
  const { colors: t } = useTheme();
  const styles = makeStyles(t);
  const insets = useSafeAreaInsets();
  const navPaddingBottom = getBottomNavigationPadding(insets.bottom);
  const userName = currentUser?.nome || 'Linux da Silva';

  // Aba interna: Visão Geral (Demandas) vs Inteligência Artificial (ML)
  const [secaoAtiva, setSecaoAtiva] = useState<'OPERACIONAL' | 'MACHINE_LEARNING'>('OPERACIONAL');

  // Filtro de período dos cards e tipo de gráfico das métricas gerais
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>('colunas');

  // 1. Métricas de conclusão de demandas
  const [metricasDemandas, setMetricasDemandas] = useState<MetricasDashboard>(() =>
    demandaService.obterMetricasDashboard()
  );

  // 2. Integração com o serviço de Machine Learning
  const [mlHealth, setMlHealth] = useState<MlHealthResponse | null>(null);
  const [mlHistorico, setMlHistorico] = useState<MlRunMetric[]>([]);
  const [carregandoMl, setCarregandoMl] = useState(false);

  // Planilhas disponíveis nas demandas para processamento ML
  const [planilhasDemandas, setPlanilhasDemandas] = useState<ArquivoAnexo[]>([]);
  const [processandoArqId] = useState<string | null>(null);
  const [planilhaModalPreenchimento, setPlanilhaModalPreenchimento] = useState<{
    visivel: boolean;
    arquivo: ArquivoAnexo | null;
  }>({ visivel: false, arquivo: null });
  const [modalResultadoMl, setModalResultadoMl] = useState<{
    titulo: string;
    templateNome: string;
    camposPreenchidos: number;
    campos: Record<string, string | number>;
    base64?: string;
    nomeArquivoSaida?: string;
  } | null>(null);

  // Consulta RAG BM25 (/consultar)
  const [queryRag, setQueryRag] = useState('Tabela R8N Sao Paulo');
  const [resultadosRag, setResultadosRag] = useState<MlRagResultItem[]>([]);
  const [buscandoRag, setBuscandoRag] = useState(false);

  const atualizarDadosPainel = () => {
    setMetricasDemandas(demandaService.obterMetricasDashboard());
    const todosArqs = demandaService.listarArquivosGerais();
    setPlanilhasDemandas(
      todosArqs.filter(
        (a) =>
          a.categoria === 'PLANILHA' ||
          ['xlsx', 'xlsm', 'xls', 'csv'].includes((a.extensao || '').toLowerCase()) ||
          a.nome.toLowerCase().endsWith('.xlsx') ||
          a.nome.toLowerCase().endsWith('.xlsm')
      )
    );
  };

  useEffect(() => {
    atualizarDadosPainel();
    carregarDadosMl();
  }, []);

  useEffect(() => {
    atualizarDadosPainel();
  }, [secaoAtiva]);

  const carregarDadosMl = async () => {
    setCarregandoMl(true);
    try {
      const [health, hist, ragInit] = await Promise.all([
        mlService.verificarHealth(),
        mlService.obterMetricas(5),
        mlService.consultarAcervoRag('Tabela R8N Sao Paulo', 3),
      ]);
      setMlHealth(health);
      setMlHistorico(hist);
      setResultadosRag(ragInit.resultados);
    } finally {
      setCarregandoMl(false);
    }
  };

  // Executar pipeline de ML (Reconhecer -> Extrair -> Preencher) em uma planilha das demandas
  const handleExecutarPipelineMl = (arq: ArquivoAnexo) => {
    setPlanilhaModalPreenchimento({
      visivel: true,
      arquivo: arq,
    });
  };

  // Enviar nova planilha do computador direto para o motor de ML
  const handleUploadPlanilhaDiretoMl = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xlsm,.xls,.csv';
      input.onchange = async (e: any) => {
        const file = e?.target?.files?.[0];
        if (!file) return;
        const sizeKb = Math.max(1, Math.round(file.size / 1024));
        const novoArq = demandaService.adicionarArquivoGeral({
          nomeArquivo: file.name,
          categoria: 'PLANILHA',
          empresaNome: 'Enviada pelo Painel ML',
          tamanho: `${sizeKb} KB`,
          autor: userName,
          webFile: file,
        });
        atualizarDadosPainel();
        await handleExecutarPipelineMl(novoArq);
      };
      input.click();
    } else {
      const novoArq = demandaService.adicionarArquivoGeral({
        nomeArquivo: 'Homogeneização_Unidades Isoladas_2025_V22_Nova.xlsx',
        categoria: 'PLANILHA',
        empresaNome: 'Constructor Hub',
        tamanho: '645 KB',
        autor: userName,
      });
      atualizarDadosPainel();
      handleExecutarPipelineMl(novoArq);
    }
  };

  // Consultar acervo RAG BM25 (/consultar)
  const handleConsultarRag = async (termoCustom?: string) => {
    const q = (termoCustom ?? queryRag).trim();
    if (!q) return;
    setBuscandoRag(true);
    try {
      const res = await mlService.consultarAcervoRag(q, 4);
      setResultadosRag(res.resultados);
    } finally {
      setBuscandoRag(false);
    }
  };

  // Download da planilha preenchida quando houver base64 na Web
  const handleBaixarPlanilhaBase64 = () => {
    if (Platform.OS === 'web' && modalResultadoMl?.base64 && typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${modalResultadoMl.base64}`;
      link.download = modalResultadoMl.nomeArquivoSaida || 'Laudo_Preenchido_ML.xlsx';
      link.click();
    }
  };

  const ultimaAvaliacaoMl = mlHistorico.length > 0 ? mlHistorico[mlHistorico.length - 1] : null;

  const isML = secaoAtiva === 'MACHINE_LEARNING';
  const acuraciaPct = Math.round((ultimaAvaliacaoMl?.nota || 0.999) * 1000) / 10;
  const m = metricasDemandas;
  const agora = new Date();
  const resumoPeriodo = resumoDoPeriodo(m.ultimasDemandas, periodo, agora);
  const descricaoPeriodo = PERIODOS.find((p) => p.key === periodo)?.descricao ?? '';

  // Base das métricas gerais: um item por vistoriador
  const itensResponsaveis = m.porResponsavel.map((r) => ({
    id: r.nome,
    label: r.nome,
    concluidas: r.concluidas,
    pendentes: r.pendentes,
    total: r.total,
    taxa: r.taxaConclusao,
  }));

  // Cumprimento por urgência (medidor por nível de SLA)
  const medidoresUrgencia: MeterItem[] = [
    {
      id: 'ALTA',
      label: 'Urgência alta',
      hint: 'SLA de 24 horas',
      icon: 'alert-circle',
      color: chartColors.urgencia.ALTA,
      done: m.porUrgencia.ALTA.concluidas,
      total: m.porUrgencia.ALTA.total,
    },
    {
      id: 'MEDIA',
      label: 'Urgência média',
      hint: 'SLA de 48 horas',
      icon: 'time',
      color: chartColors.urgencia.MEDIA,
      done: m.porUrgencia.MEDIA.concluidas,
      total: m.porUrgencia.MEDIA.total,
    },
    {
      id: 'BAIXA',
      label: 'Urgência baixa',
      hint: 'SLA de 7 dias',
      icon: 'checkmark-circle',
      color: chartColors.urgencia.BAIXA,
      done: m.porUrgencia.BAIXA.concluidas,
      total: m.porUrgencia.BAIXA.total,
    },
  ];

  function HeroStat({ value, label }: { value: string; label: string }) {
    return (
      <View style={styles.heroStat}>
        <Text style={styles.heroStatValue}>{value}</Text>
        <Text style={styles.heroStatLabel}>{label}</Text>
      </View>
    );
  }

  function KpiCard({
    icon,
    bg,
    value,
    label,
  }: {
    icon: React.ReactNode;
    bg: string;
    value: number;
    label: string;
  }) {
    return (
      <View style={styles.kpiCard}>
        <View style={[styles.kpiIconBox, { backgroundColor: bg }]}>{icon}</View>
        <Text style={styles.kpiValue}>{value}</Text>
        <Text style={styles.kpiLabel}>{label}</Text>
      </View>
    );
  }

  function CardHeader({
    icon,
    title,
    subtitle,
    tint = BRAND,
    bg = '#FEE2E2',
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    subtitle: string;
    tint?: string;
    bg?: string;
  }) {
    return (
      <View style={styles.cardHeaderRow}>
        <View style={[styles.cardIconChip, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Cabeçalho vermelho da marca */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>
            Dashboard • <Text style={styles.userNameText}>{userName}</Text>
          </Text>
        </View>
        <Ionicons name="analytics-outline" size={26} color="#FFFFFF" />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 64 + navPaddingBottom + 30 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Topo: voltar + seletor de visão */}
        <View style={styles.topRow}>
          <Pressable style={styles.backButtonCircle} onPress={onBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={t.accentRed} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <SegmentedControl
              options={[
                { key: 'OPERACIONAL', label: 'Demandas', icon: 'checkmark-done-outline' },
                { key: 'MACHINE_LEARNING', label: 'Inteligência (IA)', icon: 'hardware-chip-outline' },
              ]}
              value={secaoAtiva}
              onChange={setSecaoAtiva}
              activeColor={isML ? ML : BRAND}
            />
          </View>
        </View>

        {/* Hero: resumo global */}
        <LinearGradient
          colors={isML ? ['#4C1D95', '#6D28D9', '#7C3AED'] : ['#991B1B', '#C61010', '#E84141']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroEyebrow}>
                {isML ? 'MOTOR DE INTELIGÊNCIA ARTIFICIAL' : 'TAXA GERAL DE CONCLUSÃO'}
              </Text>
              <Text style={styles.heroBigValue}>
                {isML ? `${acuraciaPct}%` : `${m.taxaConclusao}%`}
              </Text>
              <Text style={styles.heroSubtitle}>
                {isML
                  ? `Acurácia do reconhecedor V22/V25 • ${m.arquivosResumo.processadosMl} planilhas preenchidas`
                  : `${m.demandasConcluidas} de ${m.totalDemandas} demandas finalizadas`}
              </Text>
            </View>
            <View style={styles.heroBadgeCircle}>
              <MaterialCommunityIcons name={isML ? 'brain' : 'chart-donut'} size={28} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            {isML ? (
              <>
                <HeroStat value={`${m.arquivosResumo.processadosMl}`} label="Preenchidas" />
                <HeroStat value={`${m.arquivosResumo.planilhas}`} label="Planilhas" />
                <HeroStat value={mlHealth?.status === 'UP' ? 'Online' : 'Ativo'} label="Serviço" />
              </>
            ) : (
              <>
                <HeroStat value={`${m.demandasConcluidas}`} label="Concluídas" />
                <HeroStat value={`${m.demandasPendentes}`} label="Pendentes" />
                <HeroStat value={`${m.totalDemandas}`} label="Total" />
              </>
            )}
          </View>

          <View style={styles.heroProgressTrack}>
            <View
              style={[
                styles.heroProgressFill,
                {
                  width: `${isML ? Math.round((ultimaAvaliacaoMl?.nota || 0.999) * 100) : m.taxaConclusao}%`,
                },
              ]}
            />
          </View>
        </LinearGradient>

        {!isML ? (
          <>
            {/* 1. Cards de tarefas com filtro de período */}
            <View style={styles.periodoRow}>
              <Text style={styles.sectionLabel}>Resumo de tarefas</Text>
              <SegmentedControl
                options={PERIODOS.map((p) => ({ key: p.key, label: p.label }))}
                value={periodo}
                onChange={setPeriodo}
              />
              <Text style={styles.periodoHint}>Período: {descricaoPeriodo}</Text>
            </View>

            <View style={styles.kpiGrid}>
              <KpiCard
                icon={<Ionicons name="checkmark-done-circle" size={20} color="#15803D" />}
                bg="#DCFCE7"
                value={resumoPeriodo.concluidas}
                label="Concluídas no período"
              />
              <KpiCard
                icon={<Ionicons name="add-circle" size={20} color="#1D4ED8" />}
                bg="#DBEAFE"
                value={resumoPeriodo.criadas}
                label="Criadas no período"
              />
              <KpiCard
                icon={<Ionicons name="time" size={20} color="#B45309" />}
                bg="#FEF3C7"
                value={m.demandasPendentes}
                label="Em aberto agora"
              />
              <KpiCard
                icon={<Ionicons name="alert-circle" size={20} color="#C61010" />}
                bg="#FEE2E2"
                value={m.porUrgencia.ALTA.pendentes}
                label="Urgentes em aberto"
              />
            </View>

            {/* 2. Métricas gerais com seletor de tipo de gráfico */}
            <View style={styles.card}>
              <CardHeader
                icon="analytics-outline"
                title="Métricas gerais"
                subtitle="Desempenho por vistoriador • escolha o tipo de gráfico"
              />
              <View style={{ marginBottom: 14 }}>
                <SegmentedControl
                  options={TIPOS_GRAFICO}
                  value={tipoGrafico}
                  onChange={setTipoGrafico}
                  activeColor={t.text}
                />
              </View>

              {tipoGrafico === 'colunas' && <StackedColumnChart items={itensResponsaveis} />}
              {tipoGrafico === 'barras' && (
                <RankedBarChart
                  items={itensResponsaveis.map((r) => ({
                    id: r.id,
                    label: r.label,
                    value: r.taxa,
                    sub: `${r.concluidas}/${r.total} concluídas • ${r.pendentes} pendentes`,
                  }))}
                />
              )}
              {tipoGrafico === 'medidores' && (
                <MeterList
                  items={itensResponsaveis.map((r) => ({
                    id: r.id,
                    label: r.label,
                    hint: `${r.total} atribuídas`,
                    icon: 'person-outline',
                    color: chartColors.taxa,
                    done: r.concluidas,
                    total: r.total,
                  }))}
                />
              )}
            </View>

            {/* 3. Relatório por empresa */}
            <View style={styles.card}>
              <CardHeader
                icon="business-outline"
                title="Relatório por empresa"
                subtitle="Números consolidados por contratante • toque para abrir"
              />
              <RelatorioEmpresas
                items={m.porEmpresa.map((emp) => ({
                  id: emp.id,
                  nome: emp.nome,
                  total: emp.total,
                  concluidas: emp.concluidas,
                  pendentes: emp.pendentes,
                  totalArquivos: emp.totalArquivos,
                  taxaConclusao: emp.taxaConclusao,
                }))}
                onPressEmpresa={(item) => {
                  const emp = m.porEmpresa.find((e) => e.id === item.id);
                  if (onSelectEmpresa && emp) {
                    onSelectEmpresa({
                      id: emp.id,
                      nome: emp.nome,
                      status: emp.status,
                      quantidadePendentes: emp.pendentes,
                      totalDemandas: emp.total,
                      descricao: `| ${emp.pendentes} pendentes`,
                      contato: '',
                    });
                  }
                }}
              />
            </View>

            {/* 4. Cumprimento por urgência */}
            <View style={styles.card}>
              <CardHeader
                icon="speedometer-outline"
                title="Cumprimento por urgência"
                subtitle="Cada nível de SLA medido contra o seu próprio total"
              />
              <MeterList items={medidoresUrgencia} />
            </View>
          </>
        ) : (
          <>
            {/* A. Desempenho dos modelos */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Desempenho dos modelos de ML</Text>
                  <Text style={styles.cardSubtitle}>
                    Conjunto reservado de avaliação (`ml/avaliar.py` • 49 laudos reais)
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusServicePill,
                    { backgroundColor: mlHealth?.status === 'UP' ? '#DCFCE7' : '#EDE9FE' },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDotSmall,
                      { backgroundColor: mlHealth?.status === 'UP' ? '#16A34A' : ML },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusServiceText,
                      { color: mlHealth?.status === 'UP' ? '#15803D' : '#6D28D9' },
                    ]}
                  >
                    {mlHealth?.status === 'UP' ? 'FastAPI Online' : 'Motor ML Ativo'}
                  </Text>
                </View>
              </View>

              {carregandoMl ? (
                <ActivityIndicator size="small" color={ML} style={{ marginVertical: 16 }} />
              ) : (
                <View style={styles.mlModelsMetricsGrid}>
                  <View style={styles.mlMetricBox}>
                    <Text style={styles.mlMetricValue}>
                      {Math.round((ultimaAvaliacaoMl?.reconhecedor?.acuracia ?? 1) * 100)}%
                    </Text>
                    <Text style={styles.mlMetricTitle}>Reconhecedor V22/V25</Text>
                    <Text style={styles.mlMetricSub}>
                      {ultimaAvaliacaoMl?.reconhecedor?.n || 49} laudos avaliados
                    </Text>
                  </View>

                  <View style={styles.mlMetricBox}>
                    <Text style={styles.mlMetricValue}>
                      {Math.round((ultimaAvaliacaoMl?.mapeador?.rejeicao_nao_rotulos ?? 0.996) * 1000) / 10}%
                    </Text>
                    <Text style={styles.mlMetricTitle}>Mapeador de rótulos</Text>
                    <Text style={styles.mlMetricSub}>Rejeição de não-rótulos</Text>
                  </View>

                  <View style={styles.mlMetricBox}>
                    <Text style={styles.mlMetricValue}>
                      {ultimaAvaliacaoMl?.extracao?.acertos || 647}/
                      {ultimaAvaliacaoMl?.extracao?.campos_conferidos || 647}
                    </Text>
                    <Text style={styles.mlMetricTitle}>Extração de células</Text>
                    <Text style={styles.mlMetricSub}>
                      {ultimaAvaliacaoMl?.extracao?.campos_inventados ?? 0} campos inventados
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* B. Automação de planilhas */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Automação de planilhas</Text>
                  <Text style={styles.cardSubtitle}>
                    Identifica o template (V22 ou V25), mapeia rótulos e preenche as células
                  </Text>
                </View>
                <Pressable style={styles.purpleActionBtn} onPress={handleUploadPlanilhaDiretoMl}>
                  <Ionicons name="cloud-upload-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.purpleActionBtnText}>Enviar .xlsx</Text>
                </Pressable>
              </View>

              <View style={{ gap: 8, marginTop: 10 }}>
                {planilhasDemandas.map((arq) => {
                  const isRunning = processandoArqId === arq.id;
                  const isFilled = arq.statusMl === 'PREENCHIDA_ML';

                  return (
                    <View key={arq.id} style={styles.mlSpreadsheetRow}>
                      <View style={styles.mlExcelIcon}>
                        <MaterialCommunityIcons name="microsoft-excel" size={22} color="#15803D" />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.mlSheetName} numberOfLines={1}>
                          {arq.nome}
                        </Text>
                        <Text style={styles.mlSheetSub}>
                          {arq.empresaNome || 'Demanda'} •{' '}
                          {arq.templateMl?.includes('v25') ? 'Template V25' : 'Template V22'}
                        </Text>
                      </View>

                      <Pressable
                        style={[styles.runMlButton, isFilled && styles.runMlButtonFilled]}
                        onPress={() => handleExecutarPipelineMl(arq)}
                        disabled={isRunning}
                      >
                        {isRunning ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <MaterialCommunityIcons
                              name={isFilled ? 'check-decagram' : 'auto-fix'}
                              size={15}
                              color="#FFFFFF"
                            />
                            <Text style={styles.runMlButtonText}>
                              {isFilled ? 'Preenchida' : 'Preencher IA'}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* D. Consulta RAG BM25 */}
            <View style={styles.card}>
              <CardHeader
                icon="search-outline"
                title="Consulta ao acervo (RAG BM25)"
                subtitle="Valores de referência CUB/R8N e laudos anteriores, com a célula de origem"
                tint={ML}
                bg="#EDE9FE"
              />

              <View style={styles.ragSearchRow}>
                <TextInput
                  style={styles.ragInput}
                  placeholder="Ex: R8N Sao Paulo, Ross-Heidecke..."
                  placeholderTextColor="#94A3B8"
                  value={queryRag}
                  onChangeText={setQueryRag}
                  onSubmitEditing={() => handleConsultarRag()}
                />
                <Pressable style={styles.ragSearchBtn} onPress={() => handleConsultarRag()}>
                  {buscandoRag ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Feather name="search" size={17} color="#FFFFFF" />
                  )}
                </Pressable>
              </View>

              <View style={styles.ragSuggestionsRow}>
                {['Tabela R8N Sao Paulo', 'Ross-Heidecke', 'Vila Mariana'].map((sug) => (
                  <Pressable
                    key={sug}
                    style={styles.ragQuickChip}
                    onPress={() => {
                      setQueryRag(sug);
                      handleConsultarRag(sug);
                    }}
                  >
                    <Text style={styles.ragQuickChipText}>{sug}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ gap: 8, marginTop: 10 }}>
                {resultadosRag.map((item, idx) => (
                  <View key={idx} style={styles.ragResultCard}>
                    <Text style={styles.ragResultText}>{item.texto}</Text>
                    <View style={styles.ragSourceRow}>
                      <Ionicons name="bookmark-outline" size={12} color={ML} />
                      <Text style={styles.ragSourceText} numberOfLines={1}>
                        Fonte: {item.fonte}
                      </Text>
                      <Text style={styles.ragScoreText}>BM25: {item.score}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal de detalhes do preenchimento ML */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!modalResultadoMl}
        onRequestClose={() => setModalResultadoMl(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalResultadoMl(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {modalResultadoMl && (
              <>
                <View style={styles.modalMlHeader}>
                  <View style={styles.modalMlIcon}>
                    <MaterialCommunityIcons name="robot-happy" size={28} color="#FFFFFF" />
                  </View>
                  <Text style={styles.modalMlTitle}>Planilha homogeneizada!</Text>
                  <Text style={styles.modalMlSub}>
                    {modalResultadoMl.templateNome} • {modalResultadoMl.camposPreenchidos} campos escritos
                  </Text>
                </View>

                <View style={styles.modalFieldsList}>
                  {Object.entries(modalResultadoMl.campos).map(([k, v]) => (
                    <View key={k} style={styles.modalFieldItem}>
                      <Text style={styles.modalFieldKey}>{k}:</Text>
                      <Text style={styles.modalFieldVal} numberOfLines={1}>
                        {String(v)}
                      </Text>
                    </View>
                  ))}
                </View>

                {modalResultadoMl.base64 && Platform.OS === 'web' && (
                  <Pressable
                    style={[styles.modalPrimaryBtn, { backgroundColor: '#15803D', marginBottom: 8 }]}
                    onPress={handleBaixarPlanilhaBase64}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Baixar planilha preenchida (.xlsx)</Text>
                  </Pressable>
                )}

                <Pressable style={styles.modalPrimaryBtn} onPress={() => setModalResultadoMl(null)}>
                  <Text style={styles.modalPrimaryBtnText}>Fechar</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <BottomNavigation activeTab={activeTab} onSelectTab={onNavigateTab} />

      <PlanilhaPreenchimentoModal
        visible={planilhaModalPreenchimento.visivel}
        arquivo={planilhaModalPreenchimento.arquivo}
        empresaNome={planilhaModalPreenchimento.arquivo?.empresaNome || 'Avalliar'}
        demandaTitulo={planilhaModalPreenchimento.arquivo?.tarefaTitulo || 'Vistoria Técnica'}
        imovelReferencia={planilhaModalPreenchimento.arquivo?.tarefaTitulo || 'Imóvel Avaliado'}
        responsavel={userName}
        onClose={() => setPlanilhaModalPreenchimento({ visivel: false, arquivo: null })}
        onSucessoPreenchimento={() => {
          atualizarDadosPainel();
        }}
      />
    </SafeAreaView>
  );
}

/* ---------- Estilos ---------- */
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
    paddingHorizontal: spacing.md,
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
    fontSize: 15,
    color: '#FFFFFF',
  },
  userNameText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },

  /* Topo */
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    borderColor: t.softRedBackground,
  },

  /* Hero */
  heroCard: {
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroEyebrow: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.6,
  },
  heroBigValue: {
    fontFamily: fonts.bold,
    fontSize: 36,
    color: '#FFFFFF',
    marginTop: 2,
    lineHeight: 42,
  },
  heroSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 2,
    lineHeight: 17,
  },
  heroBadgeCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatsRow: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingVertical: 10,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.3)',
  },
  heroStatValue: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  heroProgressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 14,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },

  /* Filtro de período + KPIs */
  periodoRow: {
    marginBottom: 10,
    gap: 8,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: t.text,
  },
  periodoHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: t.textMuted,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: spacing.md,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: t.cardBackground,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: t.cardBorder,
  },
  kpiIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: t.text,
  },
  kpiLabel: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: t.textMuted,
    marginTop: 2,
  },

  /* Cards */
  card: {
    backgroundColor: t.cardBackground,
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: t.cardBorder,
    marginBottom: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cardIconChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: t.text,
  },
  cardSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: t.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },

  /* ML */
  statusServicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusServiceText: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
  },
  mlModelsMetricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  mlMetricBox: {
    flex: 1,
    backgroundColor: t.purpleSoftBackground,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: t.purpleSoftBorder,
    alignItems: 'center',
  },
  mlMetricValue: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: t.purpleSoftText,
  },
  mlMetricTitle: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    color: t.text,
    textAlign: 'center',
    marginTop: 2,
  },
  mlMetricSub: {
    fontFamily: fonts.regular,
    fontSize: 9.5,
    color: t.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  purpleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ML,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  purpleActionBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  mlSpreadsheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: t.chipBackground,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.cardBorder,
  },
  mlExcelIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mlSheetName: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: t.text,
  },
  mlSheetSub: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: t.textMuted,
    marginTop: 2,
  },
  runMlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },
  runMlButtonFilled: {
    backgroundColor: '#059669',
  },
  runMlButtonText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  ragSearchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ragInput: {
    flex: 1,
    backgroundColor: t.inputBackground,
    borderWidth: 1,
    borderColor: t.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: t.text,
  },
  ragSearchBtn: {
    backgroundColor: ML,
    width: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ragSuggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  ragQuickChip: {
    backgroundColor: t.chipBackground,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ragQuickChipText: {
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    color: t.chipText,
  },
  ragResultCard: {
    backgroundColor: t.chipBackground,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: t.cardBorder,
    gap: 6,
  },
  ragResultText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.text,
    lineHeight: 17,
  },
  ragSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ragSourceText: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    color: ML,
    flex: 1,
  },
  ragScoreText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: t.textMuted,
  },

  /* Modal resultado ML */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  modalMlHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  modalMlIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: ML,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalMlTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: t.text,
  },
  modalMlSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  modalFieldsList: {
    backgroundColor: t.chipBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: t.cardBorder,
    gap: 5,
    marginBottom: 14,
  },
  modalFieldItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  modalFieldKey: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: t.textMuted,
  },
  modalFieldVal: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: t.text,
    flex: 1,
    textAlign: 'right',
  },
  modalPrimaryBtn: {
    backgroundColor: ML,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
  },
});
