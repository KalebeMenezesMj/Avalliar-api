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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  Feather,
} from '@expo/vector-icons';

import { colors, fonts, spacing } from '../theme';
import BottomNavigation, { TabType } from '../components/BottomNavigation';
import { AuthResponse } from '../services/authService';
import { EmpresaDemanda } from './DemandasScreen';
import { userService, UsuarioDTO } from '../services/userService';
import { demandaService, TarefaDemanda, Urgencia } from '../services/demandaService';

export type { Urgencia, TarefaDemanda };

// Dados mockados iniciais por empresa
const DEMANDAS_POR_EMPRESA: Record<string, TarefaDemanda[]> = {
  // Constructor Hub (conforme o protótipo do Figma)
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
  // Default / Prime Imobiliária
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

interface EmpresaDemandasScreenProps {
  empresa: EmpresaDemanda;
  currentUser?: AuthResponse | { nome?: string; email?: string; role?: string } | null;
  onBack: () => void;
  onNavigateToNovaDemanda: () => void;
  onNavigateTab: (tab: TabType) => void;
  onLogout?: () => void;
  activeTab?: TabType;
}

export default function EmpresaDemandasScreen({
  empresa,
  currentUser,
  onBack,
  onNavigateToNovaDemanda,
  onNavigateTab,
  onLogout,
  activeTab = 'demandas',
}: EmpresaDemandasScreenProps) {
  // Lista de tarefas da empresa com estado interativo de conclusão sincronizado via demandaService
  const [tarefas, setTarefas] = useState<TarefaDemanda[]>(() =>
    demandaService.obterDemandasPorEmpresa(empresa.id, empresa.nome)
  );

  useEffect(() => {
    setTarefas(demandaService.obterDemandasPorEmpresa(empresa.id, empresa.nome));
  }, [empresa.id, empresa.nome]);
  const [busca, setBusca] = useState('');
  const [filtroUrgencia, setFiltroUrgencia] = useState<'TODAS' | Urgencia>('TODAS');
  const [novaDemandaModal, setNovaDemandaModal] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoResponsavel, setNovoResponsavel] = useState('Ubuntu Gonçalves');
  const [novaUrgencia, setNovaUrgencia] = useState<Urgencia>('ALTA');

  // Estado para lista de funcionários cadastrados e controle do dropdown
  const [funcionarios, setFuncionarios] = useState<UsuarioDTO[]>([]);
  const [dropdownResponsavelAberto, setDropdownResponsavelAberto] = useState(false);

  const userName = currentUser?.nome || 'Linux da Silva';

  // Buscar funcionários reais cadastrados no backend
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
      .catch(() => {
        // Fallback garantido
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Lista consolidada de funcionários (dados da API + padrão)
  const listaFuncionarios = useMemo(() => {
    const fallback: UsuarioDTO[] = [
      { id: '1', nome: 'Ubuntu Gonçalves', email: 'ubuntu@avalliar.com.br', cargo: 'Encarregado de Vistoria', role: 'VISTORIADOR' },
      { id: '2', nome: 'Linux da Silva', email: 'linux.silva@fatec.sp.gov.br', cargo: 'Engenheiro Civil', role: 'GESTOR' },
      { id: '3', nome: 'Debian Silva', email: 'debian@avalliar.com.br', cargo: 'Vistoriador de Imóveis', role: 'VISTORIADOR' },
      { id: '4', nome: 'Fedora Lima', email: 'fedora@avalliar.com.br', cargo: 'Analista de Laudos', role: 'OPERACIONAL' },
    ];
    if (funcionarios.length > 0) {
      // Mescla garantindo unicidade por nome
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

  // Toggle do status da demanda (Pendente <-> Concluída)
  const handleToggleConcluida = (tarefaId: string) => {
    demandaService.toggleDemandaConcluida(empresa.id, empresa.nome, tarefaId);
    setTarefas((prev) =>
      prev.map((item) =>
        item.id === tarefaId ? { ...item, concluida: !item.concluida } : item
      )
    );
  };

  // Cadastrar nova demanda rápida para a empresa
  const handleCriarDemanda = () => {
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

    setTarefas((prev) => [nova, ...prev]);
    setNovoTitulo('');
    setDropdownResponsavelAberto(false);
    setNovaDemandaModal(false);
  };

  // ENFILEIRAMENTO INTELIGENTE:
  // 1. Demandas pendentes no topo (ordenadas por urgência: ALTA -> MEDIA -> BAIXA)
  // 2. Demandas concluídas jogadas para o final da tela!
  const tarefasProcessadas = useMemo(() => {
    const filtradas = tarefas.filter((t) => {
      const matchBusca =
        t.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        t.responsavel.toLowerCase().includes(busca.toLowerCase());
      const matchUrgencia =
        filtroUrgencia === 'TODAS' || t.urgencia === filtroUrgencia;

      return matchBusca && matchUrgencia;
    });

    const pendentes = filtradas.filter((t) => !t.concluida);
    const concluidas = filtradas.filter((t) => t.concluida);

    // Ordem de urgência para as pendentes
    const pesoUrgencia: Record<Urgencia, number> = {
      ALTA: 3,
      MEDIA: 2,
      BAIXA: 1,
    };

    pendentes.sort((a, b) => pesoUrgencia[b.urgencia] - pesoUrgencia[a.urgencia]);

    // Retorna pendentes primeiro e concluídas no final
    return {
      pendentes,
      concluidas,
      todasOrdenadas: [...pendentes, ...concluidas],
    };
  }, [tarefas, busca, filtroUrgencia]);

  // Cor do card da empresa no banner superior
  const getBannerColor = () => {
    switch (empresa.status) {
      case 'SEM_PENDENCIAS':
        return '#388E3C';
      case 'COM_PENDENCIAS':
        return '#3B68C4';
      case 'EM_ABERTO':
        return '#3F3F46';
      default:
        return '#3B68C4';
    }
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

        {/* 3. Título Principal da Tela */}
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Demandas</Text>

          <Pressable
            style={styles.addDemandButton}
            onPress={() => setNovaDemandaModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Nova demanda para esta empresa"
          >
            <Ionicons name="add-circle" size={30} color="#C61010" />
          </Pressable>
        </View>

        {/* 4. Banner com o Card da Empresa (Idêntico ao Figma) */}
        <View style={[styles.companyBannerCard, { backgroundColor: getBannerColor() }]}>
          <View style={styles.decorBubbleOne} />
          <View style={styles.decorBubbleTwo} />

          <Text style={styles.bannerCompanyName}>{empresa.nome}</Text>

          <View style={styles.bannerInfoRow}>
            <View style={styles.bannerCountPill}>
              <Text style={styles.bannerCountText}>
                {tarefasProcessadas.pendentes.length} pendentes • {tarefasProcessadas.concluidas.length} concluídas
              </Text>
            </View>
          </View>
        </View>

        {/* 5. Barra de Pesquisa de Tarefas da Empresa */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={17} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Filtrar demandas ou responsável..."
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

        {/* 6. Filtros Rápidos por Urgência (Melhoria UI/UX) */}
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

        {/* 7. Lista Enfileirada de Demandas (Pendentes no topo, Concluídas no final) */}
        <View style={styles.tasksSection}>
          {tarefasProcessadas.todasOrdenadas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={44} color="#9CA3AF" />
              <Text style={styles.emptyText}>Nenhuma demanda encontrada para este filtro.</Text>
            </View>
          ) : (
            <>
              {/* SEÇÃO 1: DEMANDAS PENDENTES (Ordenadas por urgência/mais recente) */}
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
                      <Pressable
                        key={item.id}
                        style={styles.taskCardPending}
                        onPress={() => handleToggleConcluida(item.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: false }}
                        accessibilityLabel={`Demanda pendente: ${item.titulo}`}
                      >
                        {/* Linha superior ocupando todo o bloco: Status/Prioridade na extremidade esquerda e Data na extremidade direita */}
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

                        {/* Linha de conteúdo: Título e Responsável à esquerda, Checkbox na extremidade direita */}
                        <View style={styles.taskCardBody}>
                          <View style={styles.taskCardTextContent}>
                            <Text style={styles.taskTitlePending}>{item.titulo}</Text>
                            <Text style={styles.taskResponsiblePending}>
                              Responsável:{' '}
                              <Text style={styles.taskResponsibleBold}>{item.responsavel}</Text>
                            </Text>
                          </View>

                          {/* Círculo Vazio (Checkbox Não Marcada) */}
                          <Pressable
                            style={styles.checkboxCirclePending}
                            onPress={() => handleToggleConcluida(item.id)}
                            hitSlop={8}
                          />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* SEÇÃO 2: DEMANDAS CONCLUÍDAS (Jogadas para o final da tela) */}
              {tarefasProcessadas.concluidas.length > 0 && (
                <View style={styles.subgroupContainer}>
                  <View style={styles.subgroupHeader}>
                    <Text style={styles.subgroupTitleCompleted}>
                      Concluídas ({tarefasProcessadas.concluidas.length})
                    </Text>
                    <Text style={styles.subgroupHint}>Finalizadas e arquivadas</Text>
                  </View>

                  {tarefasProcessadas.concluidas.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.taskCardCompleted}
                      onPress={() => handleToggleConcluida(item.id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: true }}
                      accessibilityLabel={`Demanda concluída: ${item.titulo}`}
                    >
                      {/* Linha superior ocupando todo o bloco: Status Concluída na esquerda e Data na direita */}
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

                      {/* Linha de conteúdo: Título e Responsável à esquerda, Checkbox com checkmark verde à direita */}
                      <View style={styles.taskCardBody}>
                        <View style={styles.taskCardTextContent}>
                          <Text style={styles.taskTitleCompleted}>{item.titulo}</Text>
                          <Text style={styles.taskResponsibleCompleted}>
                            Responsável: {item.responsavel}
                          </Text>
                        </View>

                        {/* Círculo com Checkmark Verde de Sucesso */}
                        <Pressable
                          style={styles.checkboxCircleCompleted}
                          onPress={() => handleToggleConcluida(item.id)}
                          hitSlop={8}
                        >
                          <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Espaçamento inferior */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* 8. Barra de Navegação Inferior Vermelha */}
      <BottomNavigation activeTab={activeTab} onSelectTab={onNavigateTab} />

      {/* Modal para Adicionar Nova Demanda para a Empresa */}
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
              placeholder="Ex: Fazer a vistoria de saída do Apto 302..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              value={novoTitulo}
              onChangeText={setNovoTitulo}
            />

            <Text style={styles.inputLabel}>Responsável Atribuído (Vistoriador / Equipe)</Text>
            {/* Caixa de Seleção Dinâmica para Responsável */}
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

            <Pressable style={styles.submitButton} onPress={handleCriarDemanda}>
              <Text style={styles.submitButtonText}>Cadastrar Demanda</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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

  /* 1. Header */
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

  /* 2. Breadcrumb */
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        cursor: 'pointer',
      },
    }),
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

  /* 3. Título e Botão Adicionar */
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
  addDemandButton: {
    padding: 2,
  },

  /* 4. Banner Card da Empresa (Fiel ao Figma) */
  companyBannerCard: {
    borderRadius: 20,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg + 4,
    minHeight: 110,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
      },
    }),
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
    marginTop: 6,
    flexDirection: 'row',
    zIndex: 2,
  },
  bannerCountPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  bannerCountText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#FFFFFF',
  },

  /* 5. Barra de Pesquisa */
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

  /* 6. Filtros por Urgência */
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

  /* 7. Tarefas / Demandas */
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

  /* Card Pendente (Conforme o protótipo do Figma: Borda cinza, sem risco) */
  taskCardPending: {
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    padding: spacing.md + 2,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        cursor: 'pointer',
      },
    }),
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
  },
  taskCardTopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Status na esquerda extrema e Data na direita extrema do bloco
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
    marginBottom: 6,
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

  /* Card Concluído: Estilo neutro, sofisticado e sem vermelho agressivo */
  taskCardCompleted: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: spacing.md + 2,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 6,
    opacity: 0.88,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
        cursor: 'pointer',
      },
    }),
  },
  taskTitleCompleted: {
    fontFamily: fonts.semibold,
    fontSize: 13.5,
    lineHeight: 19,
    color: '#64748B', // Cinza neutro elegante
    textDecorationLine: 'line-through',
    textDecorationColor: '#94A3B8', // Linha tachada em cinza suave
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
    backgroundColor: '#10B981', // Verde de sucesso no checkbox preenchido
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Empty state */
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

  /* Modal de Nova Demanda */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
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
    fontSize: 18,
    color: '#1E1E1E',
  },
  modalCompanySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#6B7280',
    marginBottom: spacing.md,
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
    marginTop: spacing.lg,
  },
  submitButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },

  /* Dropdown de Responsável Atribuído */
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
    maxHeight: 180,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      },
    }),
  },
  dropdownScroll: {
    maxHeight: 180,
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
