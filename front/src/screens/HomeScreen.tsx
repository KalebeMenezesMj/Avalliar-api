import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
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

import { colors, fonts, spacing } from '../theme';
import BottomNavigation, { TabType } from '../components/BottomNavigation';
import { AuthResponse } from '../services/authService';

export type NavigationTarget =
  | 'home'
  | 'demandas'
  | 'tarefas'
  | 'painel'
  | 'configuracoes'
  | 'nova-demanda'
  | 'listar-demandas'
  | 'usuarios';

interface HomeScreenProps {
  currentUser?: AuthResponse | { nome?: string; email?: string; role?: string } | null;
  onNavigate: (target: NavigationTarget) => void;
  onLogout?: () => void;
  activeTab?: TabType;
  onSelectTab?: (tab: TabType) => void;
}

interface DemandaItem {
  id: string;
  codigo: string;
  imovel: string;
  tipoVistoria: string;
  endereco: string;
  horario: string;
  status: 'EM_CAMPO' | 'CONCLUIDA' | 'AGUARDANDO_LAUDO';
  statusLabel: string;
}

const DEMANDAS_HOJE: DemandaItem[] = [
  {
    id: '1',
    codigo: '#1042',
    imovel: 'Apto. 84 • Edifício Vila Mariana',
    tipoVistoria: 'Entrada',
    endereco: 'Rua Vergueiro, 1200 - SP',
    horario: '14:30',
    status: 'EM_CAMPO',
    statusLabel: 'Em Campo',
  },
  {
    id: '2',
    codigo: '#1039',
    imovel: 'Casa Térrea • Condomínio Araucárias',
    tipoVistoria: 'Saída',
    endereco: 'Alameda dos Ipês, 450 - SP',
    horario: '11:00',
    status: 'CONCLUIDA',
    statusLabel: 'Concluída',
  },
  {
    id: '3',
    codigo: '#1035',
    imovel: 'Sala Comercial 402 • Centro Plaza',
    tipoVistoria: 'Entrega de Chaves',
    endereco: 'Av. Paulista, 1578 - Bela Vista',
    horario: '08:30',
    status: 'AGUARDANDO_LAUDO',
    statusLabel: 'Aguardando Laudo',
  },
];

export default function HomeScreen({
  currentUser,
  onNavigate,
  onLogout,
  activeTab = 'home',
  onSelectTab,
}: HomeScreenProps) {
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [botModalVisible, setBotModalVisible] = useState(false);

  const userName = currentUser?.nome || 'Linux da Silva';
  const userEmail = currentUser?.email || 'linux.silva@fatec.sp.gov.br';
  const userRole = currentUser?.role || 'GESTOR';

  const handleTabChange = (tab: TabType) => {
    if (onSelectTab) {
      onSelectTab(tab);
    } else {
      onNavigate(tab as NavigationTarget);
    }
  };

  const getStatusStyle = (status: DemandaItem['status']) => {
    switch (status) {
      case 'EM_CAMPO':
        return {
          bg: '#EFF6FF',
          text: '#1D4ED8',
          border: '#DBEAFE',
          icon: 'business-outline' as const,
        };
      case 'CONCLUIDA':
        return {
          bg: '#ECFDF5',
          text: '#047857',
          border: '#D1FAE5',
          icon: 'checkmark-circle-outline' as const,
        };
      case 'AGUARDANDO_LAUDO':
        return {
          bg: '#FEF3C7',
          text: '#B45309',
          border: '#FDE68A',
          icon: 'time-outline' as const,
        };
      default:
        return {
          bg: '#F1F5F9',
          text: '#475569',
          border: '#E2E8F0',
          icon: 'document-text-outline' as const,
        };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Header Vermelho com Saudação, Aba de Notificação e Perfil */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>
            Bem-vindo, <Text style={styles.userNameText}>{userName}</Text>
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          {/* Aba / Botão de Notificações com badge */}
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

          {/* Ícone de Perfil */}
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
      >
        {/* 2. Banner com Degradê e Gráfico Resumo Minimalista */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerHeader}>
            <Text style={styles.bannerTitle}>
              Suas vistorias{' '}
              <Text style={styles.bannerHighlight}>cresceram 37%</Text>
              {'\n'}neste mês!
            </Text>
          </View>

          <LinearGradient
            colors={['#FFFFFF', '#F87171', '#DC2626', '#BA1A1A']}
            locations={[0, 0.38, 0.78, 1]}
            style={styles.gradientSection}
          >
            <View style={styles.minimalistChartRow}>
              <View style={styles.performanceInfo}>
                <View style={styles.pillBadge}>
                  <MaterialIcons name="trending-up" size={15} color="#FFFFFF" />
                  <Text style={styles.pillBadgeText}>+37%</Text>
                </View>
                <Text style={styles.performanceSub}>85 vistorias concluídas</Text>
              </View>

              <View style={styles.capsuleBars}>
                <View style={styles.capsuleItem}>
                  <View style={[styles.capsuleBar, { height: 26, opacity: 0.35 }]} />
                  <Text style={styles.capsuleLabel}>Jul</Text>
                </View>
                <View style={styles.capsuleItem}>
                  <View style={[styles.capsuleBar, { height: 38, opacity: 0.5 }]} />
                  <Text style={styles.capsuleLabel}>Ago</Text>
                </View>
                <View style={styles.capsuleItem}>
                  <View style={[styles.capsuleBar, { height: 50, opacity: 0.7 }]} />
                  <Text style={styles.capsuleLabel}>Set</Text>
                </View>
                <View style={styles.capsuleItem}>
                  <View style={[styles.capsuleBar, styles.capsuleBarActive, { height: 68 }]} />
                  <Text style={[styles.capsuleLabel, styles.capsuleLabelActive]}>Out</Text>
                </View>
              </View>
            </View>

            {/* Três faixas horizontais características do protótipo */}
            <View style={styles.stripesContainer}>
              <View style={styles.stripeLine} />
              <View style={styles.stripeLine} />
              <View style={styles.stripeLine} />
            </View>
          </LinearGradient>
        </View>

        {/* 3. Grade 2x2 com os 4 Cards de Ações Rápidas */}
        <View style={styles.cardsGrid}>
          {/* Card 1: Nova Demanda */}
          <Pressable
            style={styles.card}
            onPress={() => onNavigate('nova-demanda')}
            accessibilityRole="button"
            accessibilityLabel="Nova Demanda"
          >
            <View style={styles.cardIconBox}>
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={42}
                color="#E84141"
              />
            </View>
            <Text style={styles.cardTitle}>Nova Demanda</Text>
            <Text style={styles.cardSubtitle}>
              Iniciar o cadastro de uma nova demanda
            </Text>
          </Pressable>

          {/* Card 2: Listar demandas */}
          <Pressable
            style={styles.card}
            onPress={() => onNavigate('listar-demandas')}
            accessibilityRole="button"
            accessibilityLabel="Listar demandas"
          >
            <View style={styles.cardIconBox}>
              <MaterialCommunityIcons
                name="file-check-outline"
                size={42}
                color="#E84141"
              />
            </View>
            <Text style={styles.cardTitle}>Listar demandas</Text>
            <Text style={styles.cardSubtitle}>
              Visualizar todas as avaliações em andamento
            </Text>
          </Pressable>

          {/* Card 3: Painel de Controle */}
          <Pressable
            style={styles.card}
            onPress={() => onNavigate('painel')}
            accessibilityRole="button"
            accessibilityLabel="Painel de Controle"
          >
            <View style={styles.cardIconBox}>
              <MaterialIcons
                name="insert-chart-outlined"
                size={42}
                color="#E84141"
              />
            </View>
            <Text style={styles.cardTitle}>Painel de Controle</Text>
            <Text style={styles.cardSubtitle}>
              Veja estatísticas e atividades recentes
            </Text>
          </Pressable>

          {/* Card 4: Usuários */}
          <Pressable
            style={styles.card}
            onPress={() => onNavigate('usuarios')}
            accessibilityRole="button"
            accessibilityLabel="Usuários"
          >
            <View style={styles.cardIconBox}>
              <MaterialIcons name="groups" size={44} color="#E84141" />
            </View>
            <Text style={styles.cardTitle}>Usuários</Text>
            <Text style={styles.cardSubtitle}>
              Visualizar e gerenciar os utilizadores do sistema
            </Text>
          </Pressable>
        </View>

        {/* 4. Acompanhamento das Demandas do Dia (Recurso funcional integrado) */}
        <View style={styles.demandasSection}>
          <View style={styles.demandasSectionHeader}>
            <View>
              <Text style={styles.demandasSectionTitle}>Demandas de Hoje</Text>
              <Text style={styles.demandasSectionSubtitle}>Acompanhamento em tempo real</Text>
            </View>
            <Pressable
              onPress={() => onNavigate('listar-demandas')}
              hitSlop={8}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllText}>Ver todas</Text>
              <Feather name="arrow-right" size={14} color="#C61010" />
            </Pressable>
          </View>

          <View style={styles.demandasList}>
            {DEMANDAS_HOJE.map((item) => {
              const statusStyle = getStatusStyle(item.status);

              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [styles.demandaCard, pressed && styles.cardPressed]}
                  onPress={() => onNavigate('listar-demandas')}
                  accessibilityRole="button"
                  accessibilityLabel={`Demanda ${item.codigo}, ${item.imovel}`}
                >
                  <View style={styles.demandaTopRow}>
                    <View style={styles.codigoBox}>
                      <Text style={styles.codigoText}>{item.codigo}</Text>
                      <View style={styles.placaPill}>
                        <Text style={styles.placaText}>{item.tipoVistoria}</Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
                      ]}
                    >
                      <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} />
                      <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
                        {item.statusLabel}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.demandaVeiculo} numberOfLines={1}>
                    {item.imovel}
                  </Text>

                  <View style={styles.demandaBottomRow}>
                    <View style={styles.metaInfo}>
                      <Ionicons name="location-outline" size={14} color="#64748B" />
                      <Text style={styles.metaInfoText}>{item.endereco}</Text>
                    </View>

                    <View style={styles.metaInfo}>
                      <Ionicons name="time-outline" size={14} color="#64748B" />
                      <Text style={styles.metaInfoText}>{item.horario}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
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

      {/* 5. Barra de Navegação Inferior Vermelha com Ícones Intuitivos */}
      <BottomNavigation activeTab={activeTab} onSelectTab={handleTabChange} />

      {/* Modal de Notificações */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={notifModalVisible}
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setNotifModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.notifHeader}>
              <View style={styles.notifHeaderLeft}>
                <Ionicons name="notifications" size={20} color="#C61010" />
                <Text style={styles.notifHeaderTitle}>Notificações</Text>
              </View>
              <Pressable onPress={() => setNotifModalVisible(false)} hitSlop={6}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.notifItem}>
              <View style={styles.notifDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifItemTitle}>Nova Vistoria Atribuída</Text>
                <Text style={styles.notifItemBody}>
                  Demanda #1042 (Apto. 84 - Ed. Vila Mariana) agendada para 14:30.
                </Text>
                <Text style={styles.notifItemTime}>Há 25 minutos</Text>
              </View>
            </View>

            <View style={styles.notifItem}>
              <View style={[styles.notifDot, { backgroundColor: '#10B981' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifItemTitle}>Laudo Aprovado</Text>
                <Text style={styles.notifItemBody}>
                  A vistoria #1039 (Casa Térrea - Cond. Araucárias) foi aprovada pela gerência com sucesso.
                </Text>
                <Text style={styles.notifItemTime}>Há 1 hora</Text>
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

      {/* Modal de Perfil do Usuário */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setProfileModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Ionicons name="person-circle" size={56} color="#C61010" />
              <Text style={styles.modalUserName}>{userName}</Text>
              <Text style={styles.modalUserEmail}>{userEmail}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Perfil: {userRole}</Text>
              </View>
            </View>

            <View style={styles.modalDivider} />

            <Pressable
              style={styles.modalOption}
              onPress={() => {
                setProfileModalVisible(false);
                onNavigate('configuracoes');
              }}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} />
              <Text style={styles.modalOptionText}>Configurações de Conta</Text>
            </Pressable>

            {onLogout && (
              <Pressable
                style={[styles.modalOption, styles.modalLogoutOption]}
                onPress={() => {
                  setProfileModalVisible(false);
                  onLogout();
                }}
              >
                <MaterialIcons name="logout" size={20} color="#DC2626" />
                <Text style={styles.modalLogoutText}>Sair da Conta</Text>
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

      {/* Modal do Assistente Virtual / Robô */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={botModalVisible}
        onRequestClose={() => setBotModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setBotModalVisible(false)}>
          <Pressable style={styles.botModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.botHeader}>
              <View style={styles.botIconCircle}>
                <MaterialCommunityIcons name="robot" size={32} color="#C61010" />
              </View>
              <Text style={styles.botTitle}>Assistente Avalliar</Text>
              <Text style={styles.botSubtitle}>
                Olá, {userName}! Em que posso te ajudar com as vistorias hoje?
              </Text>
            </View>

            <View style={styles.botSuggestions}>
              <Pressable
                style={styles.suggestionItem}
                onPress={() => {
                  setBotModalVisible(false);
                  onNavigate('nova-demanda');
                }}
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#C61010" />
                <Text style={styles.suggestionText}>Como criar uma nova demanda?</Text>
              </Pressable>

              <Pressable
                style={styles.suggestionItem}
                onPress={() => {
                  setBotModalVisible(false);
                  onNavigate('listar-demandas');
                }}
              >
                <MaterialCommunityIcons name="format-list-checks" size={18} color="#C61010" />
                <Text style={styles.suggestionText}>Consultar vistorias pendentes</Text>
              </Pressable>

              <Pressable
                style={styles.suggestionItem}
                onPress={() => {
                  setBotModalVisible(false);
                  onNavigate('painel');
                }}
              >
                <MaterialCommunityIcons name="chart-line" size={18} color="#C61010" />
                <Text style={styles.suggestionText}>Visualizar relatório mensal</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.botCloseButton}
              onPress={() => setBotModalVisible(false)}
            >
              <Text style={styles.botCloseButtonText}>Entendido</Text>
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
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 24,
  },

  /* 1. Header Vermelho */
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

  /* 2. Banner com Degradê */
  bannerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
      },
    }),
  },
  bannerHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  bannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 32,
    color: '#1E1E1E',
  },
  bannerHighlight: {
    color: '#E84141',
    fontFamily: fonts.bold,
  },
  gradientSection: {
    width: '100%',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    justifyContent: 'space-between',
  },
  minimalistChartRow: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  performanceInfo: {
    flex: 1,
    paddingRight: spacing.md,
    justifyContent: 'flex-end',
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 6,
  },
  pillBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  performanceSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.92)',
  },
  capsuleBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    height: 75,
    paddingBottom: 2,
  },
  capsuleItem: {
    alignItems: 'center',
    width: 22,
  },
  capsuleBar: {
    width: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  },
  capsuleBarActive: {
    opacity: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  capsuleLabel: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  capsuleLabelActive: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },
  stripesContainer: {
    width: '100%',
    marginTop: spacing.md,
    gap: 3,
  },
  stripeLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#FFFFFF',
    opacity: 0.6,
  },

  /* 3. Cards Grid 2x2 */
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    gap: 16,
  },
  card: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
        cursor: 'pointer',
      },
    }),
  },
  cardIconBox: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#1E1E1E',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 14,
  },

  /* 4. Acompanhamento das Demandas do Dia */
  demandasSection: {
    marginTop: spacing.xl + 4,
    paddingHorizontal: spacing.lg,
  },
  demandasSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.sm + 2,
  },
  demandasSectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#1E1E1E',
  },
  demandasSectionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  seeAllText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: '#C61010',
  },
  demandasList: {
    gap: 10,
  },
  demandaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        cursor: 'pointer',
      },
    }),
  },
  cardPressed: {
    backgroundColor: '#F9FAFB',
  },
  demandaTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codigoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codigoText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#1E1E1E',
  },
  placaPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  placaText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#4B5563',
    letterSpacing: 0.4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  demandaVeiculo: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#1E1E1E',
    marginBottom: 10,
  },
  demandaBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaInfoText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#6B7280',
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
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.xl,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalUserName: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    marginTop: spacing.sm,
  },
  modalUserEmail: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  roleBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#C61010',
  },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: spacing.md,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  modalOptionText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  modalLogoutOption: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalLogoutText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: '#DC2626',
  },
  modalCloseButton: {
    marginTop: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textSecondary,
  },

  /* Notificações */
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  notifHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifHeaderTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#1E1E1E',
  },
  notifItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C61010',
    marginTop: 6,
  },
  notifItemTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#1E1E1E',
  },
  notifItemBody: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
    lineHeight: 17,
  },
  notifItemTime: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },

  /* Modal do Robô */
  botModalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
  },
  botHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  botIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  botTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  botSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  botSuggestions: {
    width: '100%',
    gap: 8,
    marginBottom: spacing.lg,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  suggestionText: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: '#9F1239',
    flex: 1,
  },
  botCloseButton: {
    width: '100%',
    backgroundColor: '#C61010',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  botCloseButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
