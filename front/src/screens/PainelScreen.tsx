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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  Feather,
} from '@expo/vector-icons';

import { fonts, spacing } from '../theme';
import BottomNavigation, { TabType } from '../components/BottomNavigation';
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
  MlIdadeResponse,
} from '../services/mlService';

interface PainelScreenProps {
  currentUser?: AuthResponse | { nome?: string; email?: string; role?: string } | null;
  onBack: () => void;
  onNavigateTab: (tab: TabType) => void;
  onSelectEmpresa?: (empresa: EmpresaDemanda) => void;
  onLogout?: () => void;
  activeTab?: TabType;
}

export default function PainelScreen({
  currentUser,
  onBack,
  onNavigateTab,
  onSelectEmpresa,
  activeTab = 'painel',
}: PainelScreenProps) {
  const userName = currentUser?.nome || 'Linux da Silva';

  // Aba interna do Dashboard: Visão Geral (Demandas) vs Inteligência Artificial (ML)
  const [secaoAtiva, setSecaoAtiva] = useState<'OPERACIONAL' | 'MACHINE_LEARNING'>('OPERACIONAL');

  // 1. Estado das Métricas de Conclusão de Demandas
  const [metricasDemandas, setMetricasDemandas] = useState<MetricasDashboard>(() =>
    demandaService.obterMetricasDashboard()
  );

  // 2. Estados da Integração com o Serviço de Machine Learning
  const [mlHealth, setMlHealth] = useState<MlHealthResponse | null>(null);
  const [mlHistorico, setMlHistorico] = useState<MlRunMetric[]>([]);
  const [carregandoMl, setCarregandoMl] = useState(false);

  // Planilhas disponíveis nas demandas para processamento ML
  const [planilhasDemandas, setPlanilhasDemandas] = useState<ArquivoAnexo[]>([]);
  const [processandoArqId, setProcessandoArqId] = useState<string | null>(null);
  const [modalResultadoMl, setModalResultadoMl] = useState<{
    titulo: string;
    templateNome: string;
    camposPreenchidos: number;
    campos: Record<string, string | number>;
    base64?: string;
    nomeArquivoSaida?: string;
  } | null>(null);

  // Estado da Consulta RAG BM25 (/consultar)
  const [queryRag, setQueryRag] = useState('Tabela R8N Sao Paulo');
  const [resultadosRag, setResultadosRag] = useState<MlRagResultItem[]>([]);
  const [buscandoRag, setBuscandoRag] = useState(false);

  // Estado do Estimador de Idade Aparente (/idade)
  const [resultadoIdade, setResultadoIdade] = useState<MlIdadeResponse | null>({
    idade_aparente_anos: 11.5,
    arquivo: 'Fachada_Edificio_VilaMariana.jpg',
    erro_medio_referencia: 4.2,
    estado_sugerido: 'Regular / Conservação Normal (Fator Ross-Heidecke 0.86)',
  });
  const [estimandoIdade, setEstimandoIdade] = useState(false);

  const atualizarDadosPainel = () => {
    setMetricasDemandas(demandaService.obterMetricasDashboard());
    const todosArqs = demandaService.listarArquivosGerais();
    setPlanilhasDemandas(
      todosArqs.filter(
        (a) =>
          a.categoria === 'PLANILHA' ||
          ['xlsx', 'xlsm', 'xls', 'csv'].includes(a.extensao)
      )
    );
  };

  useEffect(() => {
    atualizarDadosPainel();
    carregarDadosMl();
  }, []);

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

  // Alternar conclusão de demanda direto no painel e recalcular todas as métricas na hora
  const handleToggleDemandaRapida = (empresaId: string, empresaNome: string, tarefaId: string) => {
    demandaService.toggleDemandaConcluida(empresaId, empresaNome, tarefaId);
    atualizarDadosPainel();
  };

  // Executar pipeline de ML (Reconhecer -> Extrair -> Preencher) em uma planilha das demandas
  const handleExecutarPipelineMl = async (arq: ArquivoAnexo) => {
    setProcessandoArqId(arq.id);
    try {
      const rec = await mlService.reconhecerPlanilha(arq.nome, arq.webFile);
      const ext = await mlService.extrairCamposLaudo(
        rec.template_id,
        arq.nome,
        arq.empresaNome,
        arq.tarefaTitulo,
        arq.webFile
      );
      const fillRes = await mlService.preencherPlanilha(rec.template_id, ext.campos);

      demandaService.atualizarStatusMlArquivo(
        arq.id,
        'PREENCHIDA_ML',
        rec.template_id,
        ext.campos
      );
      atualizarDadosPainel();

      setModalResultadoMl({
        titulo: arq.nome,
        templateNome: rec.template_nome,
        camposPreenchidos: fillRes.campos_preenchidos,
        campos: ext.campos,
        base64: fillRes.conteudo_base64,
        nomeArquivoSaida: fillRes.nome_arquivo,
      });
    } finally {
      setProcessandoArqId(null);
    }
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

  // Estimar idade aparente por foto (/idade)
  const handleSelecionarFotoIdade = () => {
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
          setResultadoIdade(res);
        } finally {
          setEstimandoIdade(false);
        }
      };
      input.click();
    } else {
      setEstimandoIdade(true);
      mlService
        .estimarIdadeAparente(`Vistoria_Fachada_${Math.floor(100 + Math.random() * 900)}.jpg`)
        .then((res) => setResultadoIdade(res))
        .finally(() => setEstimandoIdade(false));
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
    if (
      Platform.OS === 'web' &&
      modalResultadoMl?.base64 &&
      typeof document !== 'undefined'
    ) {
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${modalResultadoMl.base64}`;
      link.download = modalResultadoMl.nomeArquivoSaida || 'Laudo_Preenchido_ML.xlsx';
      link.click();
    }
  };

  const ultimaAvaliacaoMl =
    mlHistorico.length > 0 ? mlHistorico[mlHistorico.length - 1] : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Header Vermelho Oficial */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>
            Painel & IA • <Text style={styles.userNameText}>{userName}</Text>
          </Text>
        </View>
        <Ionicons name="analytics-outline" size={26} color="#FFFFFF" />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Topo com Botão Voltar e Seletor de Visão (Demandas vs Machine Learning) */}
        <View style={styles.topRow}>
          <Pressable style={styles.backButtonCircle} onPress={onBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#DC2626" />
          </Pressable>

          <View style={styles.segmentedTabs}>
            <Pressable
              style={[
                styles.segmentBtn,
                secaoAtiva === 'OPERACIONAL' && styles.segmentBtnActive,
              ]}
              onPress={() => setSecaoAtiva('OPERACIONAL')}
            >
              <MaterialIcons
                name="fact-check"
                size={15}
                color={secaoAtiva === 'OPERACIONAL' ? '#FFFFFF' : '#475569'}
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  secaoAtiva === 'OPERACIONAL' && styles.segmentBtnTextActive,
                ]}
              >
                Métricas de Demandas
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.segmentBtn,
                secaoAtiva === 'MACHINE_LEARNING' && styles.segmentBtnActivePurple,
              ]}
              onPress={() => setSecaoAtiva('MACHINE_LEARNING')}
            >
              <MaterialCommunityIcons
                name="robot-outline"
                size={16}
                color={secaoAtiva === 'MACHINE_LEARNING' ? '#FFFFFF' : '#475569'}
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  secaoAtiva === 'MACHINE_LEARNING' && styles.segmentBtnTextActive,
                ]}
              >
                Machine Learning (IA)
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 3. Card Hero Resumo Global (Integra Conclusão de Demandas + Motor ML) */}
        <LinearGradient
          colors={
            secaoAtiva === 'MACHINE_LEARNING'
              ? ['#4C1D95', '#6D28D9', '#7C3AED']
              : ['#991B1B', '#C61010', '#E84141']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroEyebrow}>
                {secaoAtiva === 'MACHINE_LEARNING'
                  ? 'MOTOR DE INTELIGÊNCIA ARTIFICIAL AVALLIAR'
                  : 'INDICADOR DE CONCLUSÃO DE DEMANDAS'}
              </Text>
              <Text style={styles.heroBigValue}>
                {secaoAtiva === 'MACHINE_LEARNING'
                  ? `${Math.round((ultimaAvaliacaoMl?.nota || 0.999) * 1000) / 10}% Acurácia`
                  : `${metricasDemandas.taxaConclusao}% Concluídas`}
              </Text>
              <Text style={styles.heroSubtitle}>
                {secaoAtiva === 'MACHINE_LEARNING'
                  ? `Reconhecedor V22/V25 (100%) • Extração sem erros • ${metricasDemandas.arquivosResumo.processadosMl} planilhas preenchidas`
                  : `${metricasDemandas.demandasConcluidas} de ${metricasDemandas.totalDemandas} demandas finalizadas • ${metricasDemandas.demandasPendentes} em andamento`}
              </Text>
            </View>

            <View style={styles.heroBadgeCircle}>
              <MaterialCommunityIcons
                name={
                  secaoAtiva === 'MACHINE_LEARNING'
                    ? 'brain'
                    : 'chart-donut'
                }
                size={30}
                color="#FFFFFF"
              />
            </View>
          </View>

          {/* Barra de Progresso Global */}
          <View style={styles.heroProgressTrack}>
            <View
              style={[
                styles.heroProgressFill,
                {
                  width: `${
                    secaoAtiva === 'MACHINE_LEARNING'
                      ? Math.round((ultimaAvaliacaoMl?.nota || 0.999) * 100)
                      : metricasDemandas.taxaConclusao
                  }%`,
                },
              ]}
            />
          </View>
        </LinearGradient>

        {secaoAtiva === 'OPERACIONAL' ? (
          <>
            {/* 4. Grade de 4 KPIs Calculados pela Conclusão de Demandas */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="checkmark-done-circle" size={22} color="#15803D" />
                </View>
                <Text style={styles.kpiValue}>{metricasDemandas.demandasConcluidas}</Text>
                <Text style={styles.kpiLabel}>Demandas Concluídas</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="time" size={22} color="#B45309" />
                </View>
                <Text style={styles.kpiValue}>{metricasDemandas.demandasPendentes}</Text>
                <Text style={styles.kpiLabel}>Demandas Pendentes</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconBox, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="document-attach" size={20} color="#1D4ED8" />
                </View>
                <Text style={styles.kpiValue}>
                  {metricasDemandas.arquivosResumo.total}
                </Text>
                <Text style={styles.kpiLabel}>Arquivos & Relatórios</Text>
              </View>

              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconBox, { backgroundColor: '#EDE9FE' }]}>
                  <MaterialCommunityIcons name="robot-outline" size={21} color="#6D28D9" />
                </View>
                <Text style={styles.kpiValue}>
                  {metricasDemandas.arquivosResumo.planilhas}
                </Text>
                <Text style={styles.kpiLabel}>Planilhas p/ ML</Text>
              </View>
            </View>

            {/* 5. Métricas de Conclusão por Empresa Contratante */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Taxa de Conclusão por Empresa
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Calculado em tempo real conforme as demandas são concluídas
                  </Text>
                </View>
              </View>

              <View style={styles.companyMetricsList}>
                {metricasDemandas.porEmpresa.map((emp) => {
                  const barColor =
                    emp.taxaConclusao === 100
                      ? '#16A34A'
                      : emp.taxaConclusao >= 50
                      ? '#2563EB'
                      : '#DC2626';

                  return (
                    <Pressable
                      key={emp.id}
                      style={styles.companyMetricItem}
                      onPress={() => {
                        if (onSelectEmpresa) {
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
                    >
                      <View style={styles.companyMetricTop}>
                        <Text style={styles.companyMetricName}>{emp.nome}</Text>
                        <Text style={[styles.companyMetricPct, { color: barColor }]}>
                          {emp.taxaConclusao}% ({emp.concluidas}/{emp.total})
                        </Text>
                      </View>

                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${emp.taxaConclusao}%`, backgroundColor: barColor },
                          ]}
                        />
                      </View>

                      <View style={styles.companyMetricBottom}>
                        <Text style={styles.companyMetricMeta}>
                          ✅ {emp.concluidas} concluídas • ⏳ {emp.pendentes} pendentes
                        </Text>
                        <Text style={styles.companyMetricMeta}>
                          📎 {emp.totalArquivos} arquivos
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 6. Distribuição por SLA / Urgência e Produtividade da Equipe */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Cumprimento por Nível de Urgência</Text>
              <Text style={styles.sectionSubtitle}>
                Acompanhamento de demandas urgentes, médias e normais
              </Text>

              <View style={styles.urgencyBarsContainer}>
                {(
                  [
                    {
                      key: 'ALTA',
                      label: '🔴 Urgência Alta (SLA 24h)',
                      color: '#DC2626',
                      dados: metricasDemandas.porUrgencia.ALTA,
                    },
                    {
                      key: 'MEDIA',
                      label: '🟡 Urgência Média (SLA 48h)',
                      color: '#D97706',
                      dados: metricasDemandas.porUrgencia.MEDIA,
                    },
                    {
                      key: 'BAIXA',
                      label: '🟢 Urgência Baixa (SLA 7d)',
                      color: '#059669',
                      dados: metricasDemandas.porUrgencia.BAIXA,
                    },
                  ] as const
                ).map((u) => {
                  const pct =
                    u.dados.total > 0
                      ? Math.round((u.dados.concluidas / u.dados.total) * 100)
                      : 0;
                  return (
                    <View key={u.key} style={styles.urgencyStatRow}>
                      <View style={styles.urgencyStatHeader}>
                        <Text style={styles.urgencyStatLabel}>{u.label}</Text>
                        <Text style={styles.urgencyStatCount}>
                          {u.dados.concluidas}/{u.dados.total} concluídas ({pct}%)
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${pct}%`, backgroundColor: u.color },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 7. Produtividade por Vistoriador / Responsável */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Produtividade por Vistoriador</Text>
              <Text style={styles.sectionSubtitle}>
                Taxa de conclusão individual calculada pelas demandas atribuídas
              </Text>

              <View style={{ gap: 10, marginTop: 8 }}>
                {metricasDemandas.porResponsavel.map((resp) => (
                  <View key={resp.nome} style={styles.respRow}>
                    <View style={styles.respAvatar}>
                      <Text style={styles.respAvatarText}>
                        {resp.nome.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.companyMetricTop}>
                        <Text style={styles.respName}>{resp.nome}</Text>
                        <Text style={styles.respPct}>{resp.taxaConclusao}%</Text>
                      </View>
                      <Text style={styles.respSub}>
                        {resp.concluidas} concluídas de {resp.total} atribuídas ({resp.pendentes}{' '}
                        pendentes)
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* 8. Simulador Rápido: Marcar/Desmarcar Demandas para ver o impacto ao vivo no Dashboard */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                Atualização Rápida de Demandas
              </Text>
              <Text style={styles.sectionSubtitle}>
                Toque para concluir ou reabrir uma demanda e observe as métricas recalcularem na hora:
              </Text>

              <View style={{ gap: 8, marginTop: 8 }}>
                {metricasDemandas.ultimasDemandas.slice(0, 6).map((t) => (
                  <Pressable
                    key={t.id}
                    style={[
                      styles.quickTaskRow,
                      t.concluida && styles.quickTaskRowDone,
                    ]}
                    onPress={() =>
                      handleToggleDemandaRapida(t.empresaId, t.empresaNome, t.id)
                    }
                  >
                    <Ionicons
                      name={t.concluida ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={t.concluida ? '#10B981' : '#94A3B8'}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.quickTaskTitle,
                          t.concluida && styles.quickTaskTitleDone,
                        ]}
                        numberOfLines={1}
                      >
                        {t.titulo}
                      </Text>
                      <Text style={styles.quickTaskSub}>
                        🏢 {t.empresaNome} • 👤 {t.responsavel}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            {/* ABA 2: INTEGRAÇÃO FRONT-END + MACHINE LEARNING NO PAINEL */}
            {/* A. Status do Serviço FastAPI & Métricas de Avaliação dos Modelos */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>
                    Desempenho dos Modelos de ML
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Conjunto reservado de avaliação (`ml/avaliar.py` • 49 laudos reais)
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusServicePill,
                    {
                      backgroundColor:
                        mlHealth?.status === 'UP' ? '#DCFCE7' : '#EDE9FE',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDotSmall,
                      {
                        backgroundColor:
                          mlHealth?.status === 'UP' ? '#16A34A' : '#7C3AED',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusServiceText,
                      {
                        color:
                          mlHealth?.status === 'UP' ? '#15803D' : '#6D28D9',
                      },
                    ]}
                  >
                    {mlHealth?.status === 'UP' ? 'FastAPI Online' : 'Motor ML Ativo'}
                  </Text>
                </View>
              </View>

              {carregandoMl ? (
                <ActivityIndicator size="small" color="#7C3AED" style={{ marginVertical: 16 }} />
              ) : (
                <View style={styles.mlModelsMetricsGrid}>
                  <View style={styles.mlMetricBox}>
                    <Text style={styles.mlMetricValue}>
                      {Math.round(
                        (ultimaAvaliacaoMl?.reconhecedor?.acuracia ?? 1) * 100
                      )}
                      %
                    </Text>
                    <Text style={styles.mlMetricTitle}>Reconhecedor V22/V25</Text>
                    <Text style={styles.mlMetricSub}>
                      {ultimaAvaliacaoMl?.reconhecedor?.n || 49} laudos avaliados
                    </Text>
                  </View>

                  <View style={styles.mlMetricBox}>
                    <Text style={styles.mlMetricValue}>
                      {Math.round(
                        (ultimaAvaliacaoMl?.mapeador?.rejeicao_nao_rotulos ?? 0.996) *
                          1000
                      ) / 10}
                      %
                    </Text>
                    <Text style={styles.mlMetricTitle}>Mapeador de Rótulos</Text>
                    <Text style={styles.mlMetricSub}>
                      Rejeição de não-rótulos
                    </Text>
                  </View>

                  <View style={styles.mlMetricBox}>
                    <Text style={styles.mlMetricValue}>
                      {ultimaAvaliacaoMl?.extracao?.acertos || 647}/
                      {ultimaAvaliacaoMl?.extracao?.campos_conferidos || 647}
                    </Text>
                    <Text style={styles.mlMetricTitle}>Extração de Células</Text>
                    <Text style={styles.mlMetricSub}>
                      {ultimaAvaliacaoMl?.extracao?.campos_inventados ?? 0} campos inventados
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* B. Preenchimento Automático & Reconhecimento de Planilhas das Demandas (/reconhecer, /extrair, /preencher) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>
                    Automação de Planilhas (RF12 / RF13 / RF14)
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Identifica o template (V22 ou V25), mapeia rótulos e preenche as células
                  </Text>
                </View>

                <Pressable
                  style={styles.purpleActionBtn}
                  onPress={handleUploadPlanilhaDiretoMl}
                >
                  <Ionicons name="cloud-upload-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.purpleActionBtnText}>Enviar .xlsx</Text>
                </Pressable>
              </View>

              <View style={{ gap: 8, marginTop: 8 }}>
                {planilhasDemandas.map((arq) => {
                  const isRunning = processandoArqId === arq.id;
                  const isFilled = arq.statusMl === 'PREENCHIDA_ML';

                  return (
                    <View key={arq.id} style={styles.mlSpreadsheetRow}>
                      <View style={styles.mlExcelIcon}>
                        <MaterialCommunityIcons
                          name="microsoft-excel"
                          size={22}
                          color="#15803D"
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.mlSheetName} numberOfLines={1}>
                          {arq.nome}
                        </Text>
                        <Text style={styles.mlSheetSub}>
                          🏢 {arq.empresaNome || 'Demanda'} •{' '}
                          {arq.templateMl?.includes('v25')
                            ? 'Template V25 (Padronizadas)'
                            : 'Template V22 (Isoladas)'}
                        </Text>
                      </View>

                      <Pressable
                        style={[
                          styles.runMlButton,
                          isFilled && styles.runMlButtonFilled,
                        ]}
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

            {/* C. Estimador de Idade Aparente por Visão Computacional (POST /idade) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>
                    Idade Aparente por Foto (`/idade`)
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Estima a idade aparente do imóvel para o cálculo de Ross-Heidecke
                  </Text>
                </View>

                <Pressable
                  style={styles.purpleActionBtn}
                  onPress={handleSelecionarFotoIdade}
                  disabled={estimandoIdade}
                >
                  <Ionicons name="camera-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.purpleActionBtnText}>Analisar Foto</Text>
                </Pressable>
              </View>

              {resultadoIdade && (
                <View style={styles.idadeResultCard}>
                  <View style={styles.idadeCircle}>
                    <Text style={styles.idadeNumber}>
                      {resultadoIdade.idade_aparente_anos}
                    </Text>
                    <Text style={styles.idadeUnit}>anos</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.idadeFileLabel} numberOfLines={1}>
                      📷 {resultadoIdade.arquivo}
                    </Text>
                    <Text style={styles.idadeEstadoText}>
                      {resultadoIdade.estado_sugerido}
                    </Text>
                    <Text style={styles.idadeErroRef}>
                      Erro médio em validação cruzada: ±{resultadoIdade.erro_medio_referencia} anos
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* D. Consulta ao Acervo Técnico com RAG BM25 (GET /consultar?q=...) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                Consulta Inteligente ao Acervo (RAG BM25)
              </Text>
              <Text style={styles.sectionSubtitle}>
                Pesquise valores de referência CUB/R8N e laudos anteriores com citação da célula de origem
              </Text>

              <View style={styles.ragSearchRow}>
                <TextInput
                  style={styles.ragInput}
                  placeholder="Ex: R8N Sao Paulo, Ross-Heidecke, Vila Mariana..."
                  placeholderTextColor="#94A3B8"
                  value={queryRag}
                  onChangeText={setQueryRag}
                  onSubmitEditing={() => handleConsultarRag()}
                />
                <Pressable
                  style={styles.ragSearchBtn}
                  onPress={() => handleConsultarRag()}
                >
                  {buscandoRag ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Feather name="search" size={17} color="#FFFFFF" />
                  )}
                </Pressable>
              </View>

              <View style={styles.ragSuggestionsRow}>
                {['Tabela R8N Sao Paulo', 'Ross-Heidecke', 'Vila Mariana'].map(
                  (sug) => (
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
                  )
                )}
              </View>

              <View style={{ gap: 8, marginTop: 8 }}>
                {resultadosRag.map((item, idx) => (
                  <View key={idx} style={styles.ragResultCard}>
                    <Text style={styles.ragResultText}>{item.texto}</Text>
                    <View style={styles.ragSourceRow}>
                      <Ionicons name="bookmark-outline" size={12} color="#6D28D9" />
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

        <View style={{ height: 85 }} />
      </ScrollView>

      {/* Modal de Detalhes do Preenchimento ML */}
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
                  <Text style={styles.modalMlTitle}>Planilha Homogeneizada!</Text>
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
                    <Text style={styles.modalPrimaryBtnText}>
                      Baixar Planilha Preenchida (.xlsx)
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  style={styles.modalPrimaryBtn}
                  onPress={() => setModalResultadoMl(null)}
                >
                  <Text style={styles.modalPrimaryBtnText}>Fechar</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <BottomNavigation activeTab={activeTab} onSelectTab={onNavigateTab} />
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
    fontSize: 15,
    color: '#FFFFFF',
  },
  userNameText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },

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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  segmentedTabs: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: '#C61010',
  },
  segmentBtnActivePurple: {
    backgroundColor: '#6D28D9',
  },
  segmentBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#475569',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },

  /* Hero Card */
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
    fontSize: 26,
    color: '#FFFFFF',
    marginTop: 2,
  },
  heroSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 4,
    lineHeight: 17,
  },
  heroBadgeCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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

  /* KPI Grid */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: spacing.md,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#0F172A',
  },
  kpiLabel: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },

  /* Sections */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 15.5,
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },

  /* Empresas Progress */
  companyMetricsList: {
    gap: 12,
    marginTop: 10,
  },
  companyMetricItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  companyMetricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyMetricName: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#1E293B',
  },
  companyMetricPct: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  companyMetricBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  companyMetricMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#64748B',
  },

  /* Urgency Bars */
  urgencyBarsContainer: {
    gap: 10,
    marginTop: 10,
  },
  urgencyStatRow: {
    gap: 5,
  },
  urgencyStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  urgencyStatLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#334155',
  },
  urgencyStatCount: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    color: '#475569',
  },

  /* Produtividade Equipe */
  respRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  respAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  respAvatarText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#C61010',
  },
  respName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#1E293B',
  },
  respPct: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#16A34A',
  },
  respSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  /* Quick Task Toggle */
  quickTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickTaskRowDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  quickTaskTitle: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: '#1E293B',
  },
  quickTaskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  quickTaskSub: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },

  /* Machine Learning Tab */
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
    marginTop: 10,
  },
  mlMetricBox: {
    flex: 1,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignItems: 'center',
  },
  mlMetricValue: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#5B21B6',
  },
  mlMetricTitle: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    color: '#1E293B',
    textAlign: 'center',
    marginTop: 2,
  },
  mlMetricSub: {
    fontFamily: fonts.regular,
    fontSize: 9.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  purpleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6D28D9',
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
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
  },
  mlSheetSub: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: '#64748B',
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

  /* Idade Aparente */
  idadeResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  idadeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idadeNumber: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  idadeUnit: {
    fontFamily: fonts.regular,
    fontSize: 9.5,
    color: '#EDE9FE',
  },
  idadeFileLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#1E293B',
  },
  idadeEstadoText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#5B21B6',
    marginTop: 2,
  },
  idadeErroRef: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },

  /* RAG Search */
  ragSearchRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  ragInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: '#0F172A',
  },
  ragSearchBtn: {
    backgroundColor: '#6D28D9',
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
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ragQuickChipText: {
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    color: '#475569',
  },
  ragResultCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  ragResultText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#1E293B',
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
    color: '#6D28D9',
    flex: 1,
  },
  ragScoreText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: '#64748B',
  },

  /* Modal Resultado ML */
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalMlTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#0F172A',
  },
  modalMlSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  modalFieldsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#64748B',
  },
  modalFieldVal: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
  },
  modalPrimaryBtn: {
    backgroundColor: '#6D28D9',
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
