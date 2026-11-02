import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Modal,
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
import { demandaService, EmpresaDemanda, StatusEmpresa } from '../services/demandaService';

export type { StatusEmpresa, EmpresaDemanda };

const EMPRESAS_DEMANDAS: EmpresaDemanda[] = [
  {
    id: '1',
    nome: 'Doors LTDA',
    status: 'SEM_PENDENCIAS',
    quantidadePendentes: 0,
    totalDemandas: 8,
    descricao: '| Sem demandas pendentes desta empresa',
    contato: 'contato@doors.com.br',
  },
  {
    id: '2',
    nome: 'Constructor Hub',
    status: 'COM_PENDENCIAS',
    quantidadePendentes: 4,
    totalDemandas: 10,
    descricao: '| 4 Demandas pendentes dessa empresa.',
    contato: 'operacoes@constructorhub.com.br',
  },
  {
    id: '3',
    nome: 'Clozeyes Imóveis',
    status: 'EM_ABERTO',
    quantidadePendentes: 2,
    totalDemandas: 2,
    descricao: '| Demandas em aberto.',
    contato: 'locacao@clozeyes.com.br',
  },
  {
    id: '4',
    nome: 'Prime Imobiliária & Gestão',
    status: 'COM_PENDENCIAS',
    quantidadePendentes: 3,
    totalDemandas: 7,
    descricao: '| 3 Demandas pendentes dessa empresa.',
    contato: 'vistorias@primeimoveis.com.br',
  },
];

interface DemandasScreenProps {
  currentUser?: AuthResponse | { nome?: string; email?: string; role?: string } | null;
  onBack: () => void;
  onNavigateToNovaDemanda: () => void;
  onNavigateTab: (tab: TabType) => void;
  onSelectEmpresa?: (empresa: EmpresaDemanda) => void;
  onLogout?: () => void;
  activeTab?: TabType;
}

export default function DemandasScreen({
  currentUser,
  onBack,
  onNavigateToNovaDemanda,
  onNavigateTab,
  onSelectEmpresa,
  onLogout,
  activeTab = 'demandas',
}: DemandasScreenProps) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | StatusEmpresa>('TODOS');
  const [empresaSelecionada, setEmpresaSelecionada] = useState<EmpresaDemanda | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [botModalVisible, setBotModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const userName = currentUser?.nome || 'Linux da Silva';
  const userEmail = currentUser?.email || 'linux.silva@fatec.sp.gov.br';
  const userRole = currentUser?.role || 'GESTOR';

  const [empresas, setEmpresas] = useState<EmpresaDemanda[]>(EMPRESAS_DEMANDAS);

  // Carregar dinamicamente todas as empresas (base + banco de dados + novas) com pendências reais
  useEffect(() => {
    let mounted = true;
    demandaService.listarEmpresas().then((lista) => {
      if (mounted && lista && lista.length > 0) {
        setEmpresas(lista);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Filtragem dinâmica de empresas por busca e por status
  const empresasFiltradas = useMemo(() => {
    return empresas.filter((empresa) => {
      const matchBusca =
        empresa.nome.toLowerCase().includes(busca.toLowerCase()) ||
        empresa.descricao.toLowerCase().includes(busca.toLowerCase());

      const matchStatus =
        filtroStatus === 'TODOS' || empresa.status === filtroStatus;

      return matchBusca && matchStatus;
    });
  }, [empresas, busca, filtroStatus]);

  // Retorna os estilos visuais de cada card baseado no status solicitado:
  // Verde: sem pendências | Azul: tarefas pendentes | Cinza: demandas em aberto
  const getCardTheme = (status: StatusEmpresa) => {
    switch (status) {
      case 'SEM_PENDENCIAS':
        return {
          backgroundColor: '#388E3C', // Verde institucional do protótipo
          accentPill: '#2E7D32',
          iconName: 'checkmark-circle' as const,
          tagText: 'Sem pendências',
        };
      case 'COM_PENDENCIAS':
        return {
          backgroundColor: '#3B68C4', // Azul do protótipo
          accentPill: '#2D55A6',
          iconName: 'time' as const,
          tagText: 'Com pendências',
        };
      case 'EM_ABERTO':
        return {
          backgroundColor: '#3F3F46', // Cinza / Grafite do protótipo
          accentPill: '#27272A',
          iconName: 'alert-circle' as const,
          tagText: 'Em aberto',
        };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Header Vermelho com Saudação e Perfil */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>
            Bem-vindo, <Text style={styles.userNameText}>{userName}</Text>
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <Pressable
            style={styles.headerIconButton}
            onPress={() => setNotifModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Notificações"
            hitSlop={8}
          >
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>2</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.headerIconButton}
            onPress={() => setProfileModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Perfil do usuário"
            hitSlop={8}
          >
            <Ionicons name="person-circle-outline" size={32} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 2. Botão Voltar Circular */}
        <View style={styles.backButtonRow}>
          <Pressable
            style={styles.backButtonCircle}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Voltar para a tela inicial"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color="#DC2626" />
          </Pressable>
        </View>

        {/* 3. Título "Demandas" e Ícone para Adicionar Nova Demanda */}
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Demandas</Text>

          <Pressable
            style={styles.addDemandButton}
            onPress={onNavigateToNovaDemanda}
            accessibilityRole="button"
            accessibilityLabel="Adicionar nova demanda"
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="note-plus-outline"
              size={28}
              color="#C61010"
            />
          </Pressable>
        </View>

        {/* 4. Barra de Pesquisa */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Busque pela demanda de uma empresa específica"
            placeholderTextColor="#9CA3AF"
            value={busca}
            onChangeText={setBusca}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {busca.length > 0 && (
            <Pressable onPress={() => setBusca('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {/* 5. Linha de Filtragem e Filtros Rápidos (Melhoria UI/UX) */}
        <View style={styles.filterSection}>
          <Pressable
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Abrir opções de filtro"
          >
            <MaterialCommunityIcons name="tune-variant" size={20} color="#1E1E1E" />
            <Text style={styles.filterButtonText}>Filtrar</Text>
          </Pressable>

          {/* Chips de filtro rápido por status */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsScroll}
          >
            <Pressable
              style={[
                styles.chip,
                filtroStatus === 'TODOS' && styles.chipActive,
              ]}
              onPress={() => setFiltroStatus('TODOS')}
            >
              <Text
                style={[
                  styles.chipText,
                  filtroStatus === 'TODOS' && styles.chipTextActive,
                ]}
              >
                Todas ({EMPRESAS_DEMANDAS.length})
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.chip,
                filtroStatus === 'SEM_PENDENCIAS' && styles.chipActiveGreen,
              ]}
              onPress={() =>
                setFiltroStatus(
                  filtroStatus === 'SEM_PENDENCIAS' ? 'TODOS' : 'SEM_PENDENCIAS'
                )
              }
            >
              <View style={[styles.statusDot, { backgroundColor: '#388E3C' }]} />
              <Text
                style={[
                  styles.chipText,
                  filtroStatus === 'SEM_PENDENCIAS' && styles.chipTextWhite,
                ]}
              >
                Sem pendências
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.chip,
                filtroStatus === 'COM_PENDENCIAS' && styles.chipActiveBlue,
              ]}
              onPress={() =>
                setFiltroStatus(
                  filtroStatus === 'COM_PENDENCIAS' ? 'TODOS' : 'COM_PENDENCIAS'
                )
              }
            >
              <View style={[styles.statusDot, { backgroundColor: '#3B68C4' }]} />
              <Text
                style={[
                  styles.chipText,
                  filtroStatus === 'COM_PENDENCIAS' && styles.chipTextWhite,
                ]}
              >
                Com pendências
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.chip,
                filtroStatus === 'EM_ABERTO' && styles.chipActiveGray,
              ]}
              onPress={() =>
                setFiltroStatus(
                  filtroStatus === 'EM_ABERTO' ? 'TODOS' : 'EM_ABERTO'
                )
              }
            >
              <View style={[styles.statusDot, { backgroundColor: '#3F3F46' }]} />
              <Text
                style={[
                  styles.chipText,
                  filtroStatus === 'EM_ABERTO' && styles.chipTextWhite,
                ]}
              >
                Em aberto
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* 6. Lista de Cards das Empresas (Fiel ao Figma) */}
        <View style={styles.cardsList}>
          {empresasFiltradas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="file-search-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>Nenhuma empresa encontrada</Text>
              <Text style={styles.emptySubtext}>
                Tente buscar por outro termo ou limpe os filtros ativos.
              </Text>
              <Pressable
                style={styles.clearFilterButton}
                onPress={() => {
                  setBusca('');
                  setFiltroStatus('TODOS');
                }}
              >
                <Text style={styles.clearFilterButtonText}>Limpar Filtros</Text>
              </Pressable>
            </View>
          ) : (
            empresasFiltradas.map((empresa) => {
              const theme = getCardTheme(empresa.status);

              return (
                <Pressable
                  key={empresa.id}
                  style={({ pressed }) => [
                    styles.companyCard,
                    { backgroundColor: theme.backgroundColor },
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => {
                    if (onSelectEmpresa) {
                      onSelectEmpresa(empresa);
                    } else {
                      setEmpresaSelecionada(empresa);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Empresa ${empresa.nome}, ${empresa.descricao}`}
                >
                  {/* Elementos decorativos (círculos translúcidos no canto superior esquerdo do Figma) */}
                  <View style={styles.decorBubbleOne} />
                  <View style={styles.decorBubbleTwo} />

                  {/* Conteúdo do Card */}
                  <View style={styles.cardHeader}>
                    <Text style={styles.companyName}>{empresa.nome}</Text>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.companyDescription}>
                      {empresa.descricao}
                    </Text>
                  </View>

                  {/* Botão de Seta Circular no Canto Inferior Direito */}
                  <View style={styles.cardFooter}>
                    <View style={styles.cardArrowCircle}>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Espaçamento inferior para a nav bar */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Botão Flutuante do Chatbot (Robô) no canto inferior direito */}
      <View style={styles.floatingBotContainer}>
        <Pressable
          style={styles.floatingBotButton}
          onPress={() => setBotModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Abrir assistente virtual"
        >
          <MaterialCommunityIcons
            name="robot-happy-outline"
            size={26}
            color="#C61010"
          />
        </Pressable>
      </View>

      {/* 7. Barra de Navegação Inferior Vermelha (Aba "Demandas" Ativa com Círculo Elevado) */}
      <BottomNavigation activeTab={activeTab} onSelectTab={onNavigateTab} />

      {/* Modal de Detalhes da Empresa e Vistorias */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!empresaSelecionada}
        onRequestClose={() => setEmpresaSelecionada(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEmpresaSelecionada(null)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {empresaSelecionada && (
              <>
                <View style={styles.empresaModalHeader}>
                  <View
                    style={[
                      styles.empresaModalIconCircle,
                      { backgroundColor: getCardTheme(empresaSelecionada.status).backgroundColor },
                    ]}
                  >
                    <MaterialCommunityIcons name="domain" size={28} color="#FFFFFF" />
                  </View>
                  <Text style={styles.empresaModalTitle}>{empresaSelecionada.nome}</Text>
                  <Text style={styles.empresaModalContact}>{empresaSelecionada.contato}</Text>
                </View>

                <View style={styles.empresaMetricsRow}>
                  <View style={styles.empresaMetricBox}>
                    <Text style={styles.empresaMetricNum}>
                      {empresaSelecionada.totalDemandas}
                    </Text>
                    <Text style={styles.empresaMetricLabel}>Total Imóveis</Text>
                  </View>
                  <View style={styles.empresaMetricDivider} />
                  <View style={styles.empresaMetricBox}>
                    <Text
                      style={[
                        styles.empresaMetricNum,
                        {
                          color:
                            empresaSelecionada.quantidadePendentes > 0 ? '#DC2626' : '#10B981',
                        },
                      ]}
                    >
                      {empresaSelecionada.quantidadePendentes}
                    </Text>
                    <Text style={styles.empresaMetricLabel}>Pendentes</Text>
                  </View>
                </View>

                <View style={styles.empresaStatusBox}>
                  <Text style={styles.empresaStatusBoxTitle}>Situação Operacional</Text>
                  <Text style={styles.empresaStatusBoxText}>
                    {empresaSelecionada.descricao.replace('| ', '')}
                  </Text>
                </View>

                <Pressable
                  style={styles.novaDemandaModalButton}
                  onPress={() => {
                    setEmpresaSelecionada(null);
                    onNavigateToNovaDemanda();
                  }}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.novaDemandaModalButtonText}>
                    Criar Demanda para {empresaSelecionada.nome}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.modalCloseButton}
                  onPress={() => setEmpresaSelecionada(null)}
                >
                  <Text style={styles.modalCloseButtonText}>Fechar</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de Filtro Avançado */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.filterModalTitle}>Filtrar Empresas</Text>
            <Text style={styles.filterModalSubtitle}>
              Selecione o estado das vistorias que deseja visualizar:
            </Text>

            <Pressable
              style={[styles.filterOption, filtroStatus === 'TODOS' && styles.filterOptionActive]}
              onPress={() => {
                setFiltroStatus('TODOS');
                setFilterModalVisible(false);
              }}
            >
              <Text style={styles.filterOptionText}>Exibir Todas as Empresas</Text>
              {filtroStatus === 'TODOS' && (
                <Ionicons name="checkmark" size={20} color="#DC2626" />
              )}
            </Pressable>

            <Pressable
              style={[
                styles.filterOption,
                filtroStatus === 'SEM_PENDENCIAS' && styles.filterOptionActive,
              ]}
              onPress={() => {
                setFiltroStatus('SEM_PENDENCIAS');
                setFilterModalVisible(false);
              }}
            >
              <View style={[styles.statusDot, { backgroundColor: '#388E3C' }]} />
              <Text style={styles.filterOptionText}>Sem Pendências (Verde)</Text>
              {filtroStatus === 'SEM_PENDENCIAS' && (
                <Ionicons name="checkmark" size={20} color="#388E3C" />
              )}
            </Pressable>

            <Pressable
              style={[
                styles.filterOption,
                filtroStatus === 'COM_PENDENCIAS' && styles.filterOptionActive,
              ]}
              onPress={() => {
                setFiltroStatus('COM_PENDENCIAS');
                setFilterModalVisible(false);
              }}
            >
              <View style={[styles.statusDot, { backgroundColor: '#3B68C4' }]} />
              <Text style={styles.filterOptionText}>Com Pendências (Azul)</Text>
              {filtroStatus === 'COM_PENDENCIAS' && (
                <Ionicons name="checkmark" size={20} color="#3B68C4" />
              )}
            </Pressable>

            <Pressable
              style={[
                styles.filterOption,
                filtroStatus === 'EM_ABERTO' && styles.filterOptionActive,
              ]}
              onPress={() => {
                setFiltroStatus('EM_ABERTO');
                setFilterModalVisible(false);
              }}
            >
              <View style={[styles.statusDot, { backgroundColor: '#3F3F46' }]} />
              <Text style={styles.filterOptionText}>Em Aberto / Não Iniciado (Cinza)</Text>
              {filtroStatus === 'EM_ABERTO' && (
                <Ionicons name="checkmark" size={20} color="#3F3F46" />
              )}
            </Pressable>

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Fechar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de Perfil */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setProfileModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.profileHeader}>
              <Ionicons name="person-circle" size={56} color="#C61010" />
              <Text style={styles.profileName}>{userName}</Text>
              <Text style={styles.profileEmail}>{userEmail}</Text>
              <View style={styles.profileBadge}>
                <Text style={styles.profileBadgeText}>Perfil: {userRole}</Text>
              </View>
            </View>

            {onLogout && (
              <Pressable
                style={styles.logoutButton}
                onPress={() => {
                  setProfileModalVisible(false);
                  onLogout();
                }}
              >
                <MaterialIcons name="logout" size={20} color="#DC2626" />
                <Text style={styles.logoutText}>Sair da Conta</Text>
              </Pressable>
            )}

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setProfileModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Fechar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de Notificações */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={notifModalVisible}
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setNotifModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.notifHeaderRow}>
              <Ionicons name="notifications" size={20} color="#C61010" />
              <Text style={styles.notifTitle}>Notificações</Text>
            </View>

            <View style={styles.notifItem}>
              <View style={styles.notifDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifItemTitle}>Demanda Atribuída</Text>
                <Text style={styles.notifItemBody}>
                  4 vistorias pendentes registradas para a Constructor Hub.
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setNotifModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Entendido</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal do Assistente Virtual */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={botModalVisible}
        onRequestClose={() => setBotModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setBotModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.botHeader}>
              <MaterialCommunityIcons name="robot" size={32} color="#C61010" />
              <Text style={styles.botTitle}>Assistente Avalliar</Text>
              <Text style={styles.botSub}>
                Deseja ajuda para filtrar demandas ou abrir uma nova vistoria de imóvel?
              </Text>
            </View>

            <Pressable
              style={styles.novaDemandaModalButton}
              onPress={() => {
                setBotModalVisible(false);
                onNavigateToNovaDemanda();
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.novaDemandaModalButtonText}>Cadastrar Nova Demanda</Text>
            </Pressable>

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setBotModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Fechar</Text>
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    padding: 2,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: '#C61010',
  },

  /* 2. Botão Voltar Circular */
  backButtonRow: {
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

  /* 3. Título e Botão Adicionar Demanda */
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
    padding: 4,
  },

  /* 4. Barra de Pesquisa */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    marginBottom: spacing.md + 4,
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
      },
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#1E1E1E',
    height: '100%',
  },

  /* 5. Seção de Filtros */
  filterSection: {
    marginBottom: spacing.lg,
    gap: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  filterButtonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#1E1E1E',
  },
  filterChipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  chipActive: {
    backgroundColor: '#1E1E1E',
    borderColor: '#1E1E1E',
  },
  chipActiveGreen: {
    backgroundColor: '#388E3C',
    borderColor: '#388E3C',
  },
  chipActiveBlue: {
    backgroundColor: '#3B68C4',
    borderColor: '#3B68C4',
  },
  chipActiveGray: {
    backgroundColor: '#3F3F46',
    borderColor: '#3F3F46',
  },
  chipText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#4B5563',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipTextWhite: {
    color: '#FFFFFF',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  /* 6. Cards de Empresas */
  cardsList: {
    gap: 16,
  },
  companyCard: {
    borderRadius: 20,
    padding: spacing.lg,
    minHeight: 140,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
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
        cursor: 'pointer',
      },
    }),
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  /* Bolhas decorativas no topo esquerdo do card (conforme Figma) */
  decorBubbleOne: {
    position: 'absolute',
    top: -12,
    left: -12,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  decorBubbleTwo: {
    position: 'absolute',
    top: 16,
    left: 28,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  cardHeader: {
    zIndex: 2,
    marginBottom: 6,
  },
  companyName: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  cardBody: {
    zIndex: 2,
  },
  companyDescription: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.92)',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 2,
    marginTop: 8,
  },
  cardArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Empty state */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#1E1E1E',
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  clearFilterButton: {
    marginTop: spacing.md,
    backgroundColor: '#C61010',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearFilterButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  /* Botão Flutuante do Chatbot */
  floatingBotContainer: {
    position: 'absolute',
    right: 20,
    bottom: 74,
    zIndex: 20,
  },
  floatingBotButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E84141',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        cursor: 'pointer',
      },
    }),
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
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: spacing.xl,
  },

  /* Modal de Empresa */
  empresaModalHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  empresaModalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  empresaModalTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: '#1E1E1E',
  },
  empresaModalContact: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  empresaMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 12,
    marginVertical: spacing.md,
  },
  empresaMetricBox: {
    alignItems: 'center',
  },
  empresaMetricNum: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#1E1E1E',
  },
  empresaMetricLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  empresaMetricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
  empresaStatusBox: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 10,
    marginBottom: spacing.md,
  },
  empresaStatusBoxTitle: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#991B1B',
  },
  empresaStatusBoxText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
  },
  novaDemandaModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C61010',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  novaDemandaModalButtonText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },

  /* Modal de Filtro */
  filterModalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#1E1E1E',
    marginBottom: 4,
  },
  filterModalSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#6B7280',
    marginBottom: spacing.md,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  filterOptionActive: {
    backgroundColor: '#F9FAFB',
  },
  filterOptionText: {
    fontFamily: fonts.semibold,
    fontSize: 13.5,
    color: '#1E1E1E',
    flex: 1,
  },

  /* Perfil */
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileName: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#1E1E1E',
    marginTop: 8,
  },
  profileEmail: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  profileBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
  },
  profileBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#C61010',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  logoutText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: '#DC2626',
  },

  /* Notificações */
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  notifTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#1E1E1E',
  },
  notifItem: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C61010',
    marginTop: 4,
  },
  notifItemTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#1E1E1E',
  },
  notifItemBody: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },

  /* Botão Fechar Padrão */
  modalCloseButton: {
    marginTop: spacing.md,
    paddingVertical: 11,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: '#4B5563',
  },

  /* Botão Bot */
  botHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  botTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#1E1E1E',
    marginTop: 4,
  },
  botSub: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
});
