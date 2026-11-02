import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
} from '@expo/vector-icons';

import { colors, fonts, spacing } from '../theme';
import BottomNavigation, { TabType } from '../components/BottomNavigation';
import { AuthResponse } from '../services/authService';
import { userService, UsuarioDTO, ClienteDTO } from '../services/userService';
import { demandaService } from '../services/demandaService';

export type Urgencia = 'ALTA' | 'MEDIA' | 'BAIXA';
export type TipoVistoria = 'ENTRADA' | 'SAIDA' | 'ENTREGA_CHAVES' | 'PERIODICA';

interface NovaDemandaScreenProps {
  currentUser?: AuthResponse | { nome?: string; email?: string; role?: string } | null;
  onBack: () => void;
  onSuccess: (empresaNome?: string) => void;
  onNavigateTab: (tab: TabType) => void;
  onLogout?: () => void;
  activeTab?: TabType;
  empresaPreSelecionada?: string;
}

export default function NovaDemandaScreen({
  currentUser,
  onBack,
  onSuccess,
  onNavigateTab,
  onLogout,
  activeTab = 'demandas',
  empresaPreSelecionada,
}: NovaDemandaScreenProps) {
  // Dados do formulário
  const [empresa, setEmpresa] = useState(empresaPreSelecionada || 'Doors LTDA');
  const [novaEmpresaModo, setNovaEmpresaModo] = useState(false);
  const [novaEmpresaNome, setNovaEmpresaNome] = useState('');
  const [dropdownEmpresaAberto, setDropdownEmpresaAberto] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [imovel, setImovel] = useState('');
  const [endereco, setEndereco] = useState('');
  const [tipoVistoria, setTipoVistoria] = useState<TipoVistoria>('ENTRADA');
  
  // Responsável Atribuído (Funcionário)
  const [responsavel, setResponsavel] = useState('Ubuntu Gonçalves');
  const [dropdownResponsavelAberto, setDropdownResponsavelAberto] = useState(false);

  // Urgência e Prazo
  const [urgencia, setUrgencia] = useState<Urgencia>('ALTA');
  const [prazoPrevisao, setPrazoPrevisao] = useState('Hoje, 14:30');
  const [observacoes, setObservacoes] = useState('');

  // Modais auxiliares
  const [modalSucesso, setModalSucesso] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [botModalVisible, setBotModalVisible] = useState(false);

  // Estados com dados do backend
  const [funcionarios, setFuncionarios] = useState<UsuarioDTO[]>([]);
  const [clientes, setClientes] = useState<ClienteDTO[]>([]);
  const [salvando, setSalvando] = useState(false);

  const userName = currentUser?.nome || 'Linux da Silva';
  const userEmail = currentUser?.email || 'linux.silva@fatec.sp.gov.br';

  // Carregar listas de funcionários e empresas clientes do backend
  useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      userService.listarFuncionarios(),
      userService.listarClientes(),
    ]).then(([resFuncs, resClis]) => {
      if (!mounted) return;

      if (resFuncs.status === 'fulfilled' && resFuncs.value && resFuncs.value.length > 0) {
        setFuncionarios(resFuncs.value);
        if (!responsavel) {
          setResponsavel(resFuncs.value[0].nome);
        }
      }

      if (resClis.status === 'fulfilled' && resClis.value && resClis.value.length > 0) {
        setClientes(resClis.value);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Lista dinâmica e unificada de empresas contratantes
  const listaEmpresas = useMemo(() => {
    const nomes = new Set<string>();
    clientes.forEach((c) => {
      if (c.razaoSocial) nomes.add(c.razaoSocial);
    });
    ['Doors LTDA', 'Constructor Hub', 'Clozeyes Imóveis', 'Prime Imobiliária & Gestão'].forEach(
      (e) => nomes.add(e)
    );
    return Array.from(nomes).sort();
  }, [clientes]);

  // Lista de funcionários unificada (backend + equipe padrão Avalliar)
  const listaFuncionarios = useMemo(() => {
    const fallback: UsuarioDTO[] = [
      { id: '1', nome: 'Ubuntu Gonçalves', email: 'ubuntu@avalliar.com.br', cargo: 'Encarregado de Vistoria', role: 'VISTORIADOR' },
      { id: '2', nome: 'Linux da Silva', email: 'linux.silva@fatec.sp.gov.br', cargo: 'Engenheiro Civil', role: 'GESTOR' },
      { id: '3', nome: 'Debian Silva', email: 'debian@avalliar.com.br', cargo: 'Vistoriador de Imóveis', role: 'VISTORIADOR' },
      { id: '4', nome: 'Fedora Lima', email: 'fedora@avalliar.com.br', cargo: 'Analista de Laudos', role: 'OPERACIONAL' },
    ];

    if (funcionarios.length > 0) {
      const nomes = new Set<string>();
      const unificada: UsuarioDTO[] = [];
      funcionarios.forEach((f) => {
        if (!nomes.has(f.nome)) {
          nomes.add(f.nome);
          unificada.push(f);
        }
      });
      fallback.forEach((f) => {
        if (!nomes.has(f.nome)) {
          nomes.add(f.nome);
          unificada.push(f);
        }
      });
      return unificada;
    }

    return fallback;
  }, [funcionarios]);

  // Submissão do formulário
  const handleSubmit = async () => {
    const empresaFinal = novaEmpresaModo ? novaEmpresaNome.trim() : empresa.trim();

    if (!empresaFinal) {
      Alert.alert('Atenção', 'Selecione ou informe a Empresa Contratante.');
      return;
    }

    if (!titulo.trim()) {
      Alert.alert('Atenção', 'Por favor, informe o título ou descrição da demanda.');
      return;
    }

    setSalvando(true);

    try {
      // 1. Se cadastrou uma nova empresa na criação da demanda, persiste na tabela de clientes
      if (novaEmpresaModo && novaEmpresaNome.trim()) {
        await userService.criarCliente({
          razaoSocial: novaEmpresaNome.trim(),
          ativo: true,
          nomeContato: responsavel,
        }).catch(() => {});
      }

      // 2. Salva e atribui a demanda na empresa via demandaService
      demandaService.adicionarDemanda({
        empresaNome: empresaFinal,
        titulo: titulo.trim(),
        responsavel: responsavel.trim() || 'Ubuntu Gonçalves',
        urgencia,
        tipoVistoria,
        imovel: imovel.trim() || undefined,
        endereco: endereco.trim() || undefined,
        prazo: prazoPrevisao.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      });
    } catch (err) {
      // Continua caso offline
    } finally {
      setSalvando(false);
      setModalSucesso(true);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Header Superior Vermelho Padrão Avalliar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>Bem-vindo,</Text>
          <Text style={styles.userNameText}>{userName}</Text>
        </View>

        <Pressable
          style={styles.profileButton}
          onPress={() => setProfileModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil"
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{getInitials(userName)}</Text>
          </View>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 2. Botão Voltar Circular com Breadcrumb */}
        <View style={styles.topNavigationRow}>
          <Pressable
            style={styles.backButtonCircle}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color="#DC2626" />
          </Pressable>

          <View style={styles.breadcrumbBadge}>
            <Text style={styles.breadcrumbText}>Demandas / Nova Demanda</Text>
          </View>
        </View>

        {/* 3. Título Principal da Tela */}
        <View style={styles.titleSection}>
          <View style={styles.titleIconBadge}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={26} color="#C61010" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.screenTitle}>Nova Demanda</Text>
            <Text style={styles.screenSubtitle}>
              Preencha os dados abaixo para cadastrar e despachar uma vistoria técnica.
            </Text>
          </View>
        </View>

        {/* 4. Card do Formulário Principal */}
        <View style={styles.formCard}>
          {/* A. Empresa Contratante */}
          <Text style={styles.fieldLabel}>
            Empresa Contratante <Text style={styles.requiredAsterisk}>*</Text>
          </Text>

          {/* Caixa de Seleção Dinâmica de Empresa */}
          <Pressable
            style={styles.dropdownSelector}
            onPress={() => {
              setDropdownEmpresaAberto(!dropdownEmpresaAberto);
              setDropdownResponsavelAberto(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Selecionar empresa contratante"
          >
            <View style={styles.dropdownSelectorLeft}>
              <Ionicons name="business-outline" size={18} color="#C61010" />
              <Text
                style={[
                  styles.dropdownSelectorText,
                  !empresa && !novaEmpresaModo && styles.dropdownPlaceholder,
                ]}
                numberOfLines={1}
              >
                {novaEmpresaModo
                  ? '➕ Cadastrar Nova Empresa...'
                  : empresa || 'Selecione uma empresa...'}
              </Text>
            </View>
            <Ionicons
              name={dropdownEmpresaAberto ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#64748B"
            />
          </Pressable>

          {/* Lista do Dropdown de Empresas */}
          {dropdownEmpresaAberto && (
            <View style={styles.dropdownListContainer}>
              <ScrollView
                style={styles.dropdownScroll}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {/* Opção para cadastrar nova empresa */}
                <Pressable
                  style={[styles.dropdownItem, styles.dropdownItemNova]}
                  onPress={() => {
                    setNovaEmpresaModo(true);
                    setEmpresa('');
                    setDropdownEmpresaAberto(false);
                  }}
                >
                  <Ionicons name="add-circle" size={18} color="#C61010" />
                  <Text style={styles.dropdownItemNovaText}>
                    + Cadastrar Nova Empresa...
                  </Text>
                </Pressable>

                {listaEmpresas.map((emp) => {
                  const isSelected = !novaEmpresaModo && empresa === emp;
                  return (
                    <Pressable
                      key={emp}
                      style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                      onPress={() => {
                        setEmpresa(emp);
                        setNovaEmpresaModo(false);
                        setDropdownEmpresaAberto(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          isSelected && styles.dropdownItemTextActive,
                        ]}
                      >
                        {emp}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color="#C61010" />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Se estiver no modo de nova empresa */}
          {novaEmpresaModo && (
            <View style={styles.novaEmpresaBox}>
              <Text style={styles.novaEmpresaLabel}>Nome da Nova Empresa Contratante:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Alvorada Engenharia & Vistorias..."
                placeholderTextColor="#94A3B8"
                value={novaEmpresaNome}
                onChangeText={setNovaEmpresaNome}
                autoFocus
              />
            </View>
          )}

          {/* B. Título / Descrição da Demanda */}
          <Text style={styles.fieldLabel}>
            Título / Objeto da Demanda <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ex: Vistoria de saída do Apartamento 505 com checagem de pintura"
            placeholderTextColor="#94A3B8"
            value={titulo}
            onChangeText={setTitulo}
          />

          {/* C. Imóvel e Endereço */}
          <Text style={styles.fieldLabel}>Imóvel de Referência</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ex: Apto 505 • Residencial Apollo"
            placeholderTextColor="#94A3B8"
            value={imovel}
            onChangeText={setImovel}
          />

          <Text style={styles.fieldLabel}>Endereço Completo</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ex: Av. Paulista, 1578 - Bela Vista, São Paulo - SP"
            placeholderTextColor="#94A3B8"
            value={endereco}
            onChangeText={setEndereco}
          />

          {/* D. Tipo de Vistoria (Chips Selecionáveis) */}
          <Text style={styles.fieldLabel}>Tipo de Vistoria</Text>
          <View style={styles.chipsRow}>
            {(
              [
                { tipo: 'ENTRADA', label: 'Entrada', icon: 'log-in-outline' },
                { tipo: 'SAIDA', label: 'Saída', icon: 'log-out-outline' },
                { tipo: 'ENTREGA_CHAVES', label: 'Entrega de Chaves', icon: 'key-outline' },
                { tipo: 'PERIODICA', label: 'Constatação', icon: 'search-outline' },
              ] as const
            ).map((item) => {
              const active = tipoVistoria === item.tipo;
              return (
                <Pressable
                  key={item.tipo}
                  style={[styles.chipItem, active && styles.chipItemActive]}
                  onPress={() => setTipoVistoria(item.tipo)}
                >
                  <Ionicons
                    name={item.icon}
                    size={15}
                    color={active ? '#FFFFFF' : '#64748B'}
                  />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* E. Responsável Atribuído (Caixa de Seleção com Funcionários Cadastrados) */}
          <Text style={styles.fieldLabel}>
            Responsável Atribuído (Vistoriador / Engenheiro){' '}
            <Text style={styles.requiredAsterisk}>*</Text>
          </Text>

          <Pressable
            style={styles.dropdownSelector}
            onPress={() => {
              setDropdownResponsavelAberto(!dropdownResponsavelAberto);
              setDropdownEmpresaAberto(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Selecionar funcionário responsável"
          >
            <View style={styles.dropdownSelectorLeft}>
              <Ionicons name="person-circle-outline" size={20} color="#C61010" />
              <Text style={styles.dropdownSelectorText} numberOfLines={1}>
                {responsavel || 'Selecione um funcionário...'}
              </Text>
            </View>
            <Ionicons
              name={dropdownResponsavelAberto ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#64748B"
            />
          </Pressable>

          {/* Lista Suspensa com Funcionários da Tabela usuario */}
          {dropdownResponsavelAberto && (
            <View style={styles.dropdownListContainer}>
              <ScrollView
                style={styles.dropdownScroll}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {listaFuncionarios.map((func) => {
                  const isSelected = responsavel === func.nome;
                  return (
                    <Pressable
                      key={func.id || func.nome}
                      style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                      onPress={() => {
                        setResponsavel(func.nome);
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
                            {func.cargo || func.role || 'Vistoriador de Imóveis'}
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

          {/* F. Nível de Urgência e SLA */}
          <Text style={styles.fieldLabel}>Nível de Urgência / SLA</Text>
          <View style={styles.urgencyRow}>
            {(
              [
                { urg: 'ALTA', label: '🔴 Alta', desc: 'Até 24 horas' },
                { urg: 'MEDIA', label: '🟡 Média', desc: '48h a 72h' },
                { urg: 'BAIXA', label: '🟢 Baixa', desc: 'Até 7 dias' },
              ] as const
            ).map((item) => {
              const active = urgencia === item.urg;
              return (
                <Pressable
                  key={item.urg}
                  style={[styles.urgencyCard, active && styles.urgencyCardActive]}
                  onPress={() => setUrgencia(item.urg)}
                >
                  <Text style={[styles.urgencyTitle, active && styles.urgencyTitleActive]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.urgencyDesc, active && styles.urgencyDescActive]}>
                    {item.desc}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* G. Previsão de Horário */}
          <Text style={styles.fieldLabel}>Previsão de Atendimento / Horário</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ex: Hoje às 14:30 ou 04/11 às 10:00"
            placeholderTextColor="#94A3B8"
            value={prazoPrevisao}
            onChangeText={setPrazoPrevisao}
          />

          {/* H. Observações Adicionais */}
          <Text style={styles.fieldLabel}>Observações e Orientações Técnicas</Text>
          <TextInput
            style={styles.textAreaInput}
            placeholder="Ex: Retirar as chaves com o síndico na portaria. Atenção especial a marcas de umidade na suíte principal..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            value={observacoes}
            onChangeText={setObservacoes}
          />

          {/* Botões de Ação */}
          <Pressable
            style={[styles.submitButton, salvando && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={salvando}
          >
            <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>
              {salvando ? 'Cadastrando Demanda...' : 'Criar e Atribuir Demanda'}
            </Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={onBack}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* 5. Assistente Flutuante (Robôzinho Avalliar) */}
      <View style={styles.botContainer}>
        <View style={styles.speechBubble}>
          <Text style={styles.speechBubbleText}>Dúvidas sobre a demanda?</Text>
        </View>

        <Pressable
          style={styles.botCircle}
          onPress={() => setBotModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Abrir assistente virtual"
        >
          <MaterialCommunityIcons name="robot" size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* 6. Barra de Navegação Vermelha Fixa */}
      <BottomNavigation activeTab={activeTab} onSelectTab={onNavigateTab} />

      {/* Modal de Confirmação de Sucesso */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalSucesso}
        onRequestClose={() => {
          setModalSucesso(false);
          onSuccess(novaEmpresaModo ? novaEmpresaNome : empresa);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-sharp" size={36} color="#FFFFFF" />
            </View>

            <Text style={styles.successModalTitle}>Demanda Cadastrada!</Text>
            <Text style={styles.successModalMessage}>
              A demanda foi registrada com sucesso para a empresa{' '}
              <Text style={{ fontFamily: fonts.bold, color: '#C61010' }}>
                {novaEmpresaModo ? novaEmpresaNome : empresa}
              </Text>{' '}
              e atribuída ao vistoriador{' '}
              <Text style={{ fontFamily: fonts.bold }}>{responsavel}</Text>.
            </Text>

            <View style={styles.successDetailBox}>
              <View style={styles.successDetailRow}>
                <Ionicons name="clipboard-outline" size={16} color="#64748B" />
                <Text style={styles.successDetailText} numberOfLines={1}>
                  {titulo}
                </Text>
              </View>
              <View style={styles.successDetailRow}>
                <Ionicons name="time-outline" size={16} color="#64748B" />
                <Text style={styles.successDetailText}>
                  {prazoPrevisao || 'Aguardando agendamento'} • Urgência {urgencia}
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.successPrimaryButton}
              onPress={() => {
                setModalSucesso(false);
                onSuccess(novaEmpresaModo ? novaEmpresaNome : empresa);
              }}
            >
              <Text style={styles.successPrimaryButtonText}>Ir para Lista de Demandas</Text>
            </Pressable>

            <Pressable
              style={styles.successSecondaryButton}
              onPress={() => {
                setModalSucesso(false);
                setTitulo('');
                setImovel('');
                setEndereco('');
                setObservacoes('');
              }}
            >
              <Text style={styles.successSecondaryButtonText}>Cadastrar Outra Demanda</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal do Assistente Virtual IA */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={botModalVisible}
        onRequestClose={() => setBotModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setBotModalVisible(false)}>
          <Pressable style={styles.botModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.botModalHeader}>
              <View style={styles.botModalHeaderLeft}>
                <View style={styles.botModalAvatar}>
                  <MaterialCommunityIcons name="robot" size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.botModalTitle}>Assistente Avalliar</Text>
                  <Text style={styles.botModalStatus}>Online • Pronto para ajudar</Text>
                </View>
              </View>
              <Pressable onPress={() => setBotModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView style={styles.botModalBody}>
              <View style={styles.botMessageBubble}>
                <Text style={styles.botMessageText}>
                  Olá, <Text style={{ fontFamily: fonts.bold }}>{userName}</Text>! Estou aqui
                  para te apoiar no cadastramento de vistorias técnicas.
                </Text>
                <Text style={[styles.botMessageText, { marginTop: 8 }]}>
                  Dica: Para laudos de locação, vistorias do tipo <Text style={{ fontFamily: fonts.bold }}>Entrada</Text> ou <Text style={{ fontFamily: fonts.bold }}>Saída</Text> atribuídas com urgência <Text style={{ fontFamily: fonts.bold }}>Alta</Text> disparam notificações imediatas no aplicativo do vistoriador.
                </Text>
              </View>
            </ScrollView>

            <Pressable
              style={styles.botCloseButton}
              onPress={() => setBotModalVisible(false)}
            >
              <Text style={styles.botCloseButtonText}>Entendido</Text>
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
          <Pressable style={styles.profileModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.profileModalHeader}>
              <View style={styles.profileModalAvatar}>
                <Text style={styles.profileModalAvatarText}>{getInitials(userName)}</Text>
              </View>
              <Text style={styles.profileModalName}>{userName}</Text>
              <Text style={styles.profileModalEmail}>{userEmail}</Text>
            </View>

            {onLogout && (
              <Pressable
                style={styles.logoutButton}
                onPress={() => {
                  setProfileModalVisible(false);
                  onLogout();
                }}
              >
                <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                <Text style={styles.logoutButtonText}>Sair da Conta</Text>
              </Pressable>
            )}
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
    paddingBottom: 40,
  },

  /* Header Superior */
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
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  userNameText: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  profileButton: {
    padding: 2,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },

  /* Top Navigation / Breadcrumb */
  topNavigationRow: {
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
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
  breadcrumbBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breadcrumbText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#64748B',
  },

  /* Título da Tela */
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.lg,
  },
  titleIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#1E1E1E',
  },
  screenSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },

  /* Card do Formulário */
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
      },
    }),
  },

  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: '#1E293B',
    marginTop: 14,
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: '#C61010',
    fontFamily: fonts.bold,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#1E293B',
  },
  textAreaInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#1E293B',
    minHeight: 80,
    textAlignVertical: 'top',
  },

  /* Dropdown Dinâmico de Empresas e Funcionários */
  dropdownSelector: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
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
    color: '#1E293B',
  },
  dropdownPlaceholder: {
    color: '#94A3B8',
  },
  dropdownListContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginTop: 6,
    maxHeight: 200,
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
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#FEF2F2',
  },
  dropdownItemNova: {
    backgroundColor: '#FFF7ED',
    gap: 8,
    justifyContent: 'flex-start',
  },
  dropdownItemNovaText: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: '#C61010',
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

  novaEmpresaBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  novaEmpresaLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#9A3412',
    marginBottom: 6,
  },

  /* Chips de Tipo de Vistoria */
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  chipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipItemActive: {
    backgroundColor: '#C61010',
    borderColor: '#C61010',
  },
  chipText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },

  /* Cards de Urgência */
  urgencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  urgencyCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  urgencyCardActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
    borderWidth: 1.5,
  },
  urgencyTitle: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#475569',
  },
  urgencyTitleActive: {
    color: '#C61010',
    fontFamily: fonts.bold,
  },
  urgencyDesc: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  urgencyDescActive: {
    color: '#991B1B',
  },

  /* Botões de Ação */
  submitButton: {
    backgroundColor: '#C61010',
    paddingVertical: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#C61010',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(198, 16, 16, 0.25)',
        cursor: 'pointer',
      },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: '#64748B',
  },

  /* Assistente Virtual */
  botContainer: {
    position: 'absolute',
    right: 16,
    bottom: 84,
    alignItems: 'flex-end',
    zIndex: 99,
  },
  speechBubble: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      },
    }),
  },
  speechBubbleText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  botCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#C61010',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#C61010',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(198, 16, 16, 0.35)',
        cursor: 'pointer',
      },
    }),
  },

  /* Modal de Sucesso */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: spacing.xl,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successModalTitle: {
    fontFamily: fonts.bold,
    fontSize: 19,
    color: '#1E293B',
    marginBottom: 6,
  },
  successModalMessage: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  successDetailBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  successDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successDetailText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  successPrimaryButton: {
    width: '100%',
    backgroundColor: '#C61010',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  successPrimaryButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  successSecondaryButton: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
  },
  successSecondaryButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: '#64748B',
  },

  /* Modais Bot e Perfil */
  botModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.lg,
  },
  botModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  botModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botModalAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C61010',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botModalTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#1E293B',
  },
  botModalStatus: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#10B981',
  },
  botModalBody: {
    paddingVertical: 14,
    maxHeight: 260,
  },
  botMessageBubble: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 12,
  },
  botMessageText: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },
  botCloseButton: {
    backgroundColor: '#C61010',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  botCloseButtonText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },

  profileModalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
  },
  profileModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileModalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  profileModalAvatarText: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: '#C61010',
  },
  profileModalName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#1E293B',
  },
  profileModalEmail: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  logoutButtonText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#DC2626',
  },
});
