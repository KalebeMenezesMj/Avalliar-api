import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Platform,
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
import { userService } from '../services/userService';

export type UserTypeFilter = 'TODOS' | 'FUNCIONARIOS' | 'CLIENTES';

export interface UsuarioItem {
  id: string;
  nome: string;
  email: string;
  tipo: 'FUNCIONARIO' | 'CLIENTE';
  cargoOuEmpresa: string;
  empresaVinculada?: string;
  telefone?: string;
  avatarBg: string;
  avatarIcon: keyof typeof Ionicons.glyphMap;
  ativo: boolean; // Para clientes: true = Contrato Ativo, false = Contrato Finalizado
}

const USUARIOS_INICIAIS: UsuarioItem[] = [
  {
    id: '1',
    nome: 'Linux da Silva',
    email: 'linux.silva@fatec.sp.gov.br',
    tipo: 'FUNCIONARIO',
    cargoOuEmpresa: 'Engenheiro Civil',
    telefone: '(11) 98765-4321',
    avatarBg: '#34D399',
    avatarIcon: 'construct-outline',
    ativo: true,
  },
  {
    id: '2',
    nome: 'Ubuntu Gonçalves',
    email: 'ubuntu.goncalves@avalliar.com.br',
    tipo: 'FUNCIONARIO',
    cargoOuEmpresa: 'Encarregado de Vistoria',
    telefone: '(11) 97654-3210',
    avatarBg: '#60A5FA',
    avatarIcon: 'shield-checkmark-outline',
    ativo: true,
  },
  {
    id: '3',
    nome: 'Windows Gates Jr.',
    email: 'windows.gates@doors.com.br',
    tipo: 'CLIENTE',
    cargoOuEmpresa: 'Cliente • Doors LTDA',
    empresaVinculada: 'Doors LTDA',
    telefone: '(11) 91234-5678',
    avatarBg: '#FBBF24',
    avatarIcon: 'business-outline',
    ativo: true, // Contrato Ativo
  },
  {
    id: '4',
    nome: 'Fedora Lima',
    email: 'fedora.lima@avalliar.com.br',
    tipo: 'FUNCIONARIO',
    cargoOuEmpresa: 'Analista Financeiro',
    telefone: '(11) 96543-2109',
    avatarBg: '#A3E635',
    avatarIcon: 'calculator-outline',
    ativo: true,
  },
  {
    id: '5',
    nome: 'Sonnet Alves',
    email: 'sonnet.alves@constructorhub.com.br',
    tipo: 'CLIENTE',
    cargoOuEmpresa: 'Cliente • Constructor Hub',
    empresaVinculada: 'Constructor Hub',
    telefone: '(11) 92345-6789',
    avatarBg: '#38BDF8',
    avatarIcon: 'home-outline',
    ativo: true, // Contrato Ativo
  },
  {
    id: '6',
    nome: 'Kimi Lee',
    email: 'kimi.lee@clozeyes.com.br',
    tipo: 'CLIENTE',
    cargoOuEmpresa: 'Cliente • Clozeyes Imóveis',
    empresaVinculada: 'Clozeyes Imóveis',
    telefone: '(11) 93456-7890',
    avatarBg: '#F472B6',
    avatarIcon: 'key-outline',
    ativo: true, // Contrato Ativo
  },
  {
    id: '7',
    nome: 'Roberto Antunes',
    email: 'roberto@primeimoveis.com.br',
    tipo: 'CLIENTE',
    cargoOuEmpresa: 'Cliente • Prime Imóveis',
    empresaVinculada: 'Prime Imóveis',
    telefone: '(11) 94567-8901',
    avatarBg: '#94A3B8',
    avatarIcon: 'business-outline',
    ativo: false, // Contrato Finalizado
  },
];

interface UsuariosScreenProps {
  currentUser?: AuthResponse | { nome?: string; email?: string; role?: string } | null;
  onBack: () => void;
  onNavigateTab: (tab: TabType) => void;
  onLogout?: () => void;
  activeTab?: TabType;
}

export default function UsuariosScreen({
  currentUser,
  onBack,
  onNavigateTab,
  onLogout,
  activeTab = 'home',
}: UsuariosScreenProps) {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>(USUARIOS_INICIAIS);
  const [filtroTipo, setFiltroTipo] = useState<UserTypeFilter>('TODOS');
  const [busca, setBusca] = useState('');
  const [mostrarBusca, setMostrarBusca] = useState(false);

  // Modais
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [botModalVisible, setBotModalVisible] = useState(false);
  const [usuarioModalVisible, setUsuarioModalVisible] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioItem | null>(null);

  // Formulário
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formTipo, setFormTipo] = useState<'FUNCIONARIO' | 'CLIENTE'>('FUNCIONARIO');
  const [formCargo, setFormCargo] = useState('');
  const [formEmpresa, setFormEmpresa] = useState('Doors LTDA');
  const [formNovaEmpresaModo, setFormNovaEmpresaModo] = useState(false);
  const [dropdownEmpresaAberto, setDropdownEmpresaAberto] = useState(false);
  const [formAtivo, setFormAtivo] = useState(true);
  const [formCnpj, setFormCnpj] = useState('');

  const userName = currentUser?.nome || 'Linux da Silva';
  const userEmail = currentUser?.email || 'linux.silva@fatec.sp.gov.br';

  // Lista dinâmica de empresas (agrega todas as empresas cadastradas no banco + base)
  const empresasDisponiveis = useMemo(() => {
    const nomes = new Set<string>();
    usuarios.forEach((u) => {
      if (u.tipo === 'CLIENTE' && u.empresaVinculada) {
        nomes.add(u.empresaVinculada);
      }
    });
    ['Doors LTDA', 'Constructor Hub', 'Clozeyes Imóveis', 'Prime Imóveis'].forEach((e) =>
      nomes.add(e)
    );
    return Array.from(nomes).sort();
  }, [usuarios]);

  // Formatação de CNPJ em tempo real (Suporta tanto o padrão numérico quanto o novo padrão alfanumérico da Receita Federal 2026)
  const formatarCnpjAlfanumerico = (valor: string): string => {
    // Mantém apenas letras maiúsculas e números (padrão oficial alfanumérico)
    const limpo = valor.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);

    let formatado = '';
    if (limpo.length > 0) formatado += limpo.slice(0, 2);
    if (limpo.length > 2) formatado += '.' + limpo.slice(2, 5);
    if (limpo.length > 5) formatado += '.' + limpo.slice(5, 8);
    if (limpo.length > 8) formatado += '/' + limpo.slice(8, 12);
    if (limpo.length > 12) formatado += '-' + limpo.slice(12, 14);

    return formatado;
  };

  // Carregar dados reais do backend (tabela usuario e tabela cliente)
  useEffect(() => {
    let mounted = true;

    const carregarDados = async () => {
      try {
        const [resFuncs, resClis] = await Promise.allSettled([
          userService.listarFuncionarios(),
          userService.listarClientes(),
        ]);

        if (!mounted) return;

        const listaMapeada: UsuarioItem[] = [];

        // 1. Mapeia funcionários da tabela 'usuario'
        if (resFuncs.status === 'fulfilled' && resFuncs.value && resFuncs.value.length > 0) {
          const cores = ['#34D399', '#60A5FA', '#A3E635', '#C084FC'];
          resFuncs.value.forEach((f, idx) => {
            listaMapeada.push({
              id: `func-${f.id}`,
              nome: f.nome,
              email: f.email,
              tipo: 'FUNCIONARIO',
              cargoOuEmpresa: f.cargo || (f.role ? f.role : 'Funcionário'),
              telefone: f.telefone || '(11) 98765-4321',
              avatarBg: cores[idx % cores.length],
              avatarIcon: 'construct-outline',
              ativo: true,
            });
          });
        }

        // 2. Mapeia clientes da tabela 'cliente' (gestão organizacional de contratos)
        if (resClis.status === 'fulfilled' && resClis.value && resClis.value.length > 0) {
          const cores = ['#FBBF24', '#38BDF8', '#F472B6', '#F59E0B'];
          resClis.value.forEach((c, idx) => {
            listaMapeada.push({
              id: `cli-${c.id}`,
              nome: c.nomeContato || c.razaoSocial,
              email: c.email || 'contato@empresa.com.br',
              tipo: 'CLIENTE',
              cargoOuEmpresa: `Cliente • ${c.razaoSocial}`,
              empresaVinculada: c.razaoSocial,
              telefone: c.telefone || '(11) 91234-5678',
              avatarBg: cores[idx % cores.length],
              avatarIcon: 'business-outline',
              ativo: c.ativo !== false, // Contrato Ativo vs Finalizado
            });
          });
        }

        if (listaMapeada.length > 0) {
          setUsuarios(listaMapeada);
        }
      } catch (err) {
        // Se a API não responder, mantém os dados iniciais do Figma
      }
    };

    carregarDados();

    return () => {
      mounted = false;
    };
  }, []);

  // Filtragem da lista
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((user) => {
      const matchTipo =
        filtroTipo === 'TODOS' ||
        (filtroTipo === 'FUNCIONARIOS' && user.tipo === 'FUNCIONARIO') ||
        (filtroTipo === 'CLIENTES' && user.tipo === 'CLIENTE');

      const matchBusca =
        !busca.trim() ||
        user.nome.toLowerCase().includes(busca.toLowerCase()) ||
        user.cargoOuEmpresa.toLowerCase().includes(busca.toLowerCase()) ||
        user.email.toLowerCase().includes(busca.toLowerCase());

      return matchTipo && matchBusca;
    });
  }, [usuarios, filtroTipo, busca]);

  // Contadores para as abas
  const countTodos = usuarios.length;
  const countFuncionarios = usuarios.filter((u) => u.tipo === 'FUNCIONARIO').length;
  const countClientes = usuarios.filter((u) => u.tipo === 'CLIENTE').length;

  // Abrir modal de criação
  const handleAbrirCriacao = () => {
    setUsuarioEditando(null);
    setFormNome('');
    setFormEmail('');
    setFormTelefone('');
    setFormTipo(filtroTipo === 'CLIENTES' ? 'CLIENTE' : 'FUNCIONARIO');
    setFormCargo('');
    setFormEmpresa(empresasDisponiveis[0] || 'Doors LTDA');
    setFormNovaEmpresaModo(false);
    setDropdownEmpresaAberto(false);
    setFormAtivo(true);
    setFormCnpj('');
    setUsuarioModalVisible(true);
  };

  // Abrir modal de edição
  const handleAbrirEdicao = (user: UsuarioItem) => {
    setUsuarioEditando(user);
    setFormNome(user.nome);
    setFormEmail(user.email);
    setFormTelefone(user.telefone || '');
    setFormTipo(user.tipo);
    setFormAtivo(user.ativo);
    setFormNovaEmpresaModo(false);
    setDropdownEmpresaAberto(false);
    if (user.tipo === 'CLIENTE') {
      setFormEmpresa(user.empresaVinculada || 'Doors LTDA');
      setFormCargo('');
    } else {
      setFormCargo(user.cargoOuEmpresa);
      setFormEmpresa('Doors LTDA');
    }
    setUsuarioModalVisible(true);
  };

  // Salvar novo ou editado (Persistência no banco de dados)
  const handleSalvarUsuario = async () => {
    if (!formNome.trim() || !formEmail.trim()) return;

    const empresaFinal = formEmpresa.trim() || 'Empresa Contratante';

    const cargoOuEmpresa =
      formTipo === 'CLIENTE'
        ? `Cliente • ${empresaFinal}`
        : formCargo.trim() || 'Vistoriador';

    // Gravação real no banco de dados via API
    try {
      if (formTipo === 'FUNCIONARIO') {
        // Tabela usuario
        await userService.criarFuncionario({
          nome: formNome.trim(),
          email: formEmail.trim(),
          telefone: formTelefone.trim(),
          cargo: formCargo.trim() || 'Vistoriador',
          role: 'OPERACIONAL',
        });
      } else {
        // Tabela cliente (Organização de contratos)
        await userService.criarCliente({
          razaoSocial: empresaFinal,
          nomeContato: formNome.trim(),
          email: formEmail.trim(),
          telefone: formTelefone.trim(),
          ativo: formAtivo,
          cnpj: formCnpj.trim() || undefined,
        });
      }
    } catch (err) {
      // Continua e atualiza a UI localmente caso offline
    }

    if (usuarioEditando) {
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === usuarioEditando.id
            ? {
                ...u,
                nome: formNome.trim(),
                email: formEmail.trim(),
                telefone: formTelefone.trim(),
                tipo: formTipo,
                cargoOuEmpresa,
                empresaVinculada: formTipo === 'CLIENTE' ? formEmpresa : undefined,
                ativo: formTipo === 'CLIENTE' ? formAtivo : true,
              }
            : u
        )
      );
    } else {
      const cores = ['#34D399', '#60A5FA', '#FBBF24', '#A3E635', '#38BDF8', '#F472B6', '#C084FC'];
      const corSorteada = cores[Math.floor(Math.random() * cores.length)];

      const novo: UsuarioItem = {
        id: `user-${Date.now()}`,
        nome: formNome.trim(),
        email: formEmail.trim(),
        telefone: formTelefone.trim() || '(11) 99999-0000',
        tipo: formTipo,
        cargoOuEmpresa,
        empresaVinculada: formTipo === 'CLIENTE' ? formEmpresa : undefined,
        avatarBg: corSorteada,
        avatarIcon: formTipo === 'CLIENTE' ? 'business-outline' : 'person-outline',
        ativo: formTipo === 'CLIENTE' ? formAtivo : true,
      };

      setUsuarios((prev) => [novo, ...prev]);
    }

    setUsuarioModalVisible(false);
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
      {/* 1. Header Vermelho Superior */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Bem-vindo, {userName}</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => setNotifModalVisible(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Notificações"
            >
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={styles.profileButton}
              onPress={() => setProfileModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Perfil do usuário"
            >
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={20} color="#C61010" />
              </View>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Botão Voltar */}
        <View style={styles.backButtonContainer}>
          <Pressable
            style={styles.backButton}
            onPress={onBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Ionicons name="chevron-back" size={22} color="#C61010" />
          </Pressable>
        </View>

        {/* 3. Título e Ação de Adicionar Usuário */}
        <View style={styles.titleRow}>
          <Text style={styles.titleText}>Lista de Usuários</Text>

          <View style={styles.titleActions}>
            <Pressable
              style={styles.searchIconButton}
              onPress={() => setMostrarBusca(!mostrarBusca)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Buscar usuário"
            >
              <Ionicons
                name={mostrarBusca ? 'close-circle-outline' : 'search-outline'}
                size={22}
                color="#64748B"
              />
            </Pressable>

            <Pressable
              style={styles.addUserButton}
              onPress={handleAbrirCriacao}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Adicionar usuário"
            >
              <Ionicons name="person-add-outline" size={24} color="#C61010" />
            </Pressable>
          </View>
        </View>

        {/* Campo de Busca Expansível */}
        {mostrarBusca && (
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nome, cargo ou empresa..."
              placeholderTextColor="#94A3B8"
              value={busca}
              onChangeText={setBusca}
              autoFocus
            />
            {busca.length > 0 && (
              <Pressable onPress={() => setBusca('')} hitSlop={6}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </Pressable>
            )}
          </View>
        )}

        {/* 4. Container Principal do Card de Usuários (Figma) */}
        <View style={styles.mainCard}>
          {/* Abas de Filtro: Todos, Funcionários, Clientes */}
          <View style={styles.tabsRow}>
            <Pressable
              style={[styles.tabItem, filtroTipo === 'TODOS' && styles.tabItemActive]}
              onPress={() => setFiltroTipo('TODOS')}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar Todos, ${countTodos} usuários`}
            >
              <Text
                style={[
                  styles.tabLabel,
                  filtroTipo === 'TODOS' && styles.tabLabelActive,
                ]}
              >
                Todos
              </Text>
              {filtroTipo === 'TODOS' && <View style={styles.tabIndicator} />}
            </Pressable>

            <Pressable
              style={[styles.tabItem, filtroTipo === 'FUNCIONARIOS' && styles.tabItemActive]}
              onPress={() => setFiltroTipo('FUNCIONARIOS')}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar Funcionários, ${countFuncionarios} funcionários`}
            >
              <Text
                style={[
                  styles.tabLabel,
                  filtroTipo === 'FUNCIONARIOS' && styles.tabLabelActive,
                ]}
              >
                Funcionários
              </Text>
              {filtroTipo === 'FUNCIONARIOS' && <View style={styles.tabIndicator} />}
            </Pressable>

            <Pressable
              style={[styles.tabItem, filtroTipo === 'CLIENTES' && styles.tabItemActive]}
              onPress={() => setFiltroTipo('CLIENTES')}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar Clientes, ${countClientes} clientes`}
            >
              <Text
                style={[
                  styles.tabLabel,
                  filtroTipo === 'CLIENTES' && styles.tabLabelActive,
                ]}
              >
                Clientes
              </Text>
              {filtroTipo === 'CLIENTES' && <View style={styles.tabIndicator} />}
            </Pressable>
          </View>

          {/* 5. Lista de Usuários */}
          <View style={styles.usersList}>
            {usuariosFiltrados.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Nenhum usuário encontrado</Text>
                <Text style={styles.emptySubtitle}>
                  Tente alterar o filtro ou termo pesquisado
                </Text>
              </View>
            ) : (
              usuariosFiltrados.map((item, index) => {
                const isLast = index === usuariosFiltrados.length - 1;

                return (
                  <View key={item.id}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.userRow,
                        pressed && styles.userRowPressed,
                      ]}
                      onPress={() => handleAbrirEdicao(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.nome}, ${item.cargoOuEmpresa}`}
                    >
                      {/* Avatar Ilustrado */}
                      <View
                        style={[
                          styles.avatarWrapper,
                          { backgroundColor: item.avatarBg },
                        ]}
                      >
                        <Text style={styles.avatarInitials}>
                          {getInitials(item.nome)}
                        </Text>
                        <View style={styles.avatarIconBadge}>
                          <Ionicons name={item.avatarIcon} size={11} color="#FFFFFF" />
                        </View>
                      </View>

                      {/* Informações: Nome, Cargo/Empresa e Status de Contrato (para clientes) */}
                      <View style={styles.userInfo}>
                        <View style={styles.userNameRow}>
                          <Text style={styles.userNameText} numberOfLines={1}>
                            {item.nome}
                          </Text>

                          {/* Badge de status do contrato para Clientes */}
                          {item.tipo === 'CLIENTE' && (
                            <View
                              style={[
                                styles.contractBadge,
                                item.ativo ? styles.contractBadgeAtivo : styles.contractBadgeInativo,
                              ]}
                            >
                              <View
                                style={[
                                  styles.contractDot,
                                  item.ativo ? styles.contractDotAtivo : styles.contractDotInativo,
                                ]}
                              />
                              <Text
                                style={[
                                  styles.contractBadgeText,
                                  item.ativo ? styles.contractBadgeTextAtivo : styles.contractBadgeTextInativo,
                                ]}
                              >
                                {item.ativo ? 'Ativo' : 'Finalizado'}
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text style={styles.userRoleText} numberOfLines={1}>
                          {item.cargoOuEmpresa}
                        </Text>
                      </View>

                      {/* Ícone de Edição (Lápis do Figma) */}
                      <Pressable
                        style={styles.editIconButton}
                        onPress={() => handleAbrirEdicao(item)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Editar ${item.nome}`}
                      >
                        <Feather name="edit-2" size={17} color="#64748B" />
                      </Pressable>
                    </Pressable>

                    {/* Divisor suave entre itens */}
                    {!isLast && <View style={styles.userDivider} />}
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Espaçamento inferior para a barra de navegação */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* 6. Botão Flutuante do Assistente / Suporte */}
      <Pressable
        style={styles.floatingBotButton}
        onPress={() => setBotModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Assistente Avalliar"
      >
        <MaterialCommunityIcons name="robot-outline" size={24} color="#C61010" />
      </Pressable>

      {/* 7. Barra de Navegação Inferior Vermelha */}
      <BottomNavigation activeTab={activeTab} onSelectTab={onNavigateTab} />

      {/* MODAL: Adicionar / Editar Usuário ou Cliente */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={usuarioModalVisible}
        onRequestClose={() => setUsuarioModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setUsuarioModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {usuarioEditando
                  ? formTipo === 'FUNCIONARIO'
                    ? 'Editar Funcionário'
                    : 'Editar Cliente / Contrato'
                  : formTipo === 'FUNCIONARIO'
                  ? 'Novo Funcionário'
                  : 'Novo Cliente / Contrato'}
              </Text>
              <Pressable
                onPress={() => setUsuarioModalVisible(false)}
                hitSlop={6}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              {/* Seleção do Tipo: Funcionário vs Cliente */}
              <Text style={styles.fieldLabel}>Classificação</Text>
              <View style={styles.tipoSelector}>
                <Pressable
                  style={[
                    styles.tipoOption,
                    formTipo === 'FUNCIONARIO' && styles.tipoOptionActive,
                  ]}
                  onPress={() => setFormTipo('FUNCIONARIO')}
                >
                  <Ionicons
                    name="briefcase-outline"
                    size={16}
                    color={formTipo === 'FUNCIONARIO' ? '#FFFFFF' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.tipoOptionText,
                      formTipo === 'FUNCIONARIO' && styles.tipoOptionTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    Funcionário
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.tipoOption,
                    formTipo === 'CLIENTE' && styles.tipoOptionActive,
                  ]}
                  onPress={() => setFormTipo('CLIENTE')}
                >
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color={formTipo === 'CLIENTE' ? '#FFFFFF' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.tipoOptionText,
                      formTipo === 'CLIENTE' && styles.tipoOptionTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    Cliente
                  </Text>
                </Pressable>
              </View>

              {/* Se for Funcionário */}
              {formTipo === 'FUNCIONARIO' ? (
                <>
                  <Text style={styles.fieldLabel}>Nome Completo</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ex: Carlos Eduardo Silva"
                    placeholderTextColor="#94A3B8"
                    value={formNome}
                    onChangeText={setFormNome}
                  />

                  <Text style={styles.fieldLabel}>E-mail Corporativo</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="carlos@avalliar.com.br"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formEmail}
                    onChangeText={setFormEmail}
                  />

                  <Text style={styles.fieldLabel}>Cargo / Função</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ex: Engenheiro Civil, Vistoriador..."
                    placeholderTextColor="#94A3B8"
                    value={formCargo}
                    onChangeText={setFormCargo}
                  />

                  <Text style={styles.fieldLabel}>Telefone / WhatsApp</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="(11) 99999-9999"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={formTelefone}
                    onChangeText={setFormTelefone}
                  />
                </>
              ) : (
                /* Se for Cliente (Pessoa Jurídica / Contratante) */
                <>
                  <Text style={styles.fieldLabel}>Empresa Contratante</Text>

                  {/* Caixa de Seleção Dinâmica (Dropdown) */}
                  <Pressable
                    style={styles.dropdownSelector}
                    onPress={() => setDropdownEmpresaAberto(!dropdownEmpresaAberto)}
                    accessibilityRole="button"
                    accessibilityLabel="Selecionar empresa contratante"
                  >
                    <View style={styles.dropdownSelectorLeft}>
                      <Ionicons name="business-outline" size={18} color="#C61010" />
                      <Text
                        style={[
                          styles.dropdownSelectorText,
                          !formEmpresa && !formNovaEmpresaModo && styles.dropdownPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {formNovaEmpresaModo
                          ? '➕ Cadastrar Nova Empresa...'
                          : formEmpresa || 'Selecione uma empresa...'}
                      </Text>
                    </View>
                    <Ionicons
                      name={dropdownEmpresaAberto ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#64748B"
                    />
                  </Pressable>

                  {/* Lista Suspensa com todas as empresas cadastradas */}
                  {dropdownEmpresaAberto && (
                    <View style={styles.dropdownListContainer}>
                      <ScrollView
                        style={styles.dropdownScroll}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {/* Ação rápida para cadastrar nova empresa */}
                        <Pressable
                          style={[
                            styles.dropdownItem,
                            styles.dropdownItemNova,
                            formNovaEmpresaModo && styles.dropdownItemActive,
                          ]}
                          onPress={() => {
                            setFormNovaEmpresaModo(true);
                            setFormEmpresa('');
                            setDropdownEmpresaAberto(false);
                          }}
                        >
                          <Ionicons name="add-circle" size={18} color="#C61010" />
                          <Text style={styles.dropdownItemNovaText}>
                            + Cadastrar Nova Empresa...
                          </Text>
                        </Pressable>

                        {/* Relação de empresas já cadastradas */}
                        {empresasDisponiveis.map((emp) => {
                          const isSelected = !formNovaEmpresaModo && formEmpresa === emp;
                          return (
                            <Pressable
                              key={emp}
                              style={[
                                styles.dropdownItem,
                                isSelected && styles.dropdownItemActive,
                              ]}
                              onPress={() => {
                                setFormEmpresa(emp);
                                setFormNovaEmpresaModo(false);
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

                  {/* Se o modo de nova empresa estiver ativo, exibe o campo para digitação */}
                  {formNovaEmpresaModo && (
                    <View style={styles.novaEmpresaInputBox}>
                      <Text style={styles.novaEmpresaInputLabel}>
                        Nome da Nova Empresa Contratante:
                      </Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Ex: Alvorada Construtora, Prime Imóveis..."
                        placeholderTextColor="#94A3B8"
                        value={formEmpresa}
                        onChangeText={setFormEmpresa}
                        autoFocus
                      />
                    </View>
                  )}

                  <Text style={styles.fieldLabel}>Ponto Focal / Representante</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ex: Windows Gates Jr."
                    placeholderTextColor="#94A3B8"
                    value={formNome}
                    onChangeText={setFormNome}
                  />

                  <Text style={styles.fieldLabel}>E-mail de Contato</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="contato@empresa.com.br"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formEmail}
                    onChangeText={setFormEmail}
                  />

                  <Text style={styles.fieldLabel}>Telefone / WhatsApp</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="(11) 91234-5678"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={formTelefone}
                    onChangeText={setFormTelefone}
                  />

                  <Text style={styles.fieldLabel}>CNPJ (Opcional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="00.000.000/0001-00 ou Alfanumérico"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    value={formCnpj}
                    onChangeText={(txt) => setFormCnpj(formatarCnpjAlfanumerico(txt))}
                    maxLength={18}
                  />
                  <Text style={styles.inputHelperText}>
                    Formatação automática. Aceita números e o novo padrão alfanumérico da Receita Federal (ex.: 12.ABC.345/0001-99).
                  </Text>

                  {/* Status do Contrato */}
                  <Text style={styles.fieldLabel}>Status do Contrato</Text>
                  <View style={styles.contractStatusSelector}>
                    <Pressable
                      style={[
                        styles.contractStatusOption,
                        formAtivo && styles.contractStatusOptionAtivo,
                      ]}
                      onPress={() => setFormAtivo(true)}
                    >
                      <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                      <Text
                        style={[
                          styles.contractStatusText,
                          formAtivo && styles.contractStatusTextAtivo,
                        ]}
                      >
                        Contrato Ativo
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.contractStatusOption,
                        !formAtivo && styles.contractStatusOptionInativo,
                      ]}
                      onPress={() => setFormAtivo(false)}
                    >
                      <View style={[styles.statusDot, { backgroundColor: '#64748B' }]} />
                      <Text
                        style={[
                          styles.contractStatusText,
                          !formAtivo && styles.contractStatusTextInativo,
                        ]}
                      >
                        Finalizado / Inativo
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}

              {/* Botões do Modal */}
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setUsuarioModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={styles.confirmButton}
                  onPress={handleSalvarUsuario}
                >
                  <Text style={styles.confirmButtonText}>
                    {usuarioEditando ? 'Salvar Alterações' : 'Cadastrar'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL: Perfil do Usuário */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <Pressable
          style={styles.profileModalOverlay}
          onPress={() => setProfileModalVisible(false)}
        >
          <Pressable
            style={styles.profileModalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.profileModalAvatar}>
              <Ionicons name="person" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.profileModalName}>{userName}</Text>
            <Text style={styles.profileModalEmail}>{userEmail}</Text>
            <View style={styles.profileRoleBadge}>
              <Text style={styles.profileRoleText}>GESTOR / ADMINISTRADOR</Text>
            </View>

            <View style={styles.profileModalDivider} />

            {onLogout && (
              <Pressable
                style={styles.logoutButton}
                onPress={() => {
                  setProfileModalVisible(false);
                  onLogout();
                }}
              >
                <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                <Text style={styles.logoutButtonText}>Sair da conta</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL: Notificações */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={notifModalVisible}
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <Pressable
          style={styles.profileModalOverlay}
          onPress={() => setNotifModalVisible(false)}
        >
          <Pressable
            style={styles.notifModalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.notifHeaderRow}>
              <View style={styles.notifTitleGroup}>
                <Ionicons name="notifications" size={20} color="#C61010" />
                <Text style={styles.notifTitle}>Notificações</Text>
              </View>
              <Pressable onPress={() => setNotifModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.notifItem}>
              <Ionicons name="business" size={18} color="#3B82F6" />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifItemTitle}>Contrato Atualizado</Text>
                <Text style={styles.notifItemDesc}>
                  Doors LTDA renovou o contrato de vistoria periódica.
                </Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL: Assistente Virtual Avalli */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={botModalVisible}
        onRequestClose={() => setBotModalVisible(false)}
      >
        <Pressable
          style={styles.profileModalOverlay}
          onPress={() => setBotModalVisible(false)}
        >
          <Pressable
            style={styles.botModalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.botIconLarge}>
              <MaterialCommunityIcons name="robot" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.botModalTitle}>Assistente Avalli</Text>
            <Text style={styles.botModalDesc}>
              Aqui você gerencia os funcionários (com acesso ao aplicativo) e acompanha a relação de clientes com contratos ativos ou finalizados.
            </Text>
            <Pressable
              style={styles.botModalCloseBtn}
              onPress={() => setBotModalVisible(false)}
            >
              <Text style={styles.botModalCloseText}>Entendido</Text>
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
  header: {
    backgroundColor: '#C61010',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? spacing.sm : 0,
    paddingBottom: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeText: {
    fontFamily: fonts.bold,
    fontSize: 15.5,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    padding: 2,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  backButtonContainer: {
    marginBottom: spacing.sm,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        cursor: 'pointer',
      },
    }),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleText: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#1E1E1E',
    letterSpacing: -0.3,
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addUserButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.md,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#1E1E1E',
  },

  /* Card Principal */
  mainCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      },
    }),
  },

  /* Abas */
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 2,
    marginBottom: spacing.sm,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabItemActive: {},
  tabLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13.5,
    color: '#64748B',
  },
  tabLabelActive: {
    fontFamily: fonts.bold,
    color: '#1E1E1E',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#C61010',
  },

  /* Lista */
  usersList: {
    marginTop: spacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  userRowPressed: {
    opacity: 0.7,
  },
  avatarWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarInitials: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  avatarIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    gap: 6,
  },
  userNameText: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: '#1E1E1E',
    flex: 1,
  },
  userRoleText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#64748B',
  },

  /* Badges de Contrato para Clientes */
  contractBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  contractBadgeAtivo: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  contractBadgeInativo: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  contractDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  contractDotAtivo: {
    backgroundColor: '#10B981',
  },
  contractDotInativo: {
    backgroundColor: '#94A3B8',
  },
  contractBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  contractBadgeTextAtivo: {
    color: '#047857',
  },
  contractBadgeTextInativo: {
    color: '#64748B',
  },

  editIconButton: {
    padding: 8,
  },
  userDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 64,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#475569',
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#94A3B8',
  },

  floatingBotButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 80,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
        cursor: 'pointer',
      },
    }),
  },

  /* Modal */
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
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#1E1E1E',
  },
  modalScroll: {
    width: '100%',
  },
  fieldLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  subFieldLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    marginBottom: 6,
  },
  tipoSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  tipoOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  tipoOptionActive: {
    backgroundColor: '#C61010',
    borderColor: '#C61010',
  },
  tipoOptionText: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: '#64748B',
  },
  tipoOptionTextActive: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: spacing.md,
    height: 44,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#1E1E1E',
  },
  /* Dropdown de Empresa */
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: spacing.md,
    height: 46,
  },
  dropdownSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownSelectorText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: '#1E1E1E',
    flex: 1,
  },
  dropdownPlaceholder: {
    fontFamily: fonts.regular,
    color: '#94A3B8',
  },
  dropdownListContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    marginTop: 6,
    marginBottom: 8,
    maxHeight: 180,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  dropdownScroll: {
    maxHeight: 175,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#FEE2E2',
  },
  dropdownItemNova: {
    backgroundColor: '#FEF2F2',
    justifyContent: 'flex-start',
    gap: 8,
  },
  dropdownItemNovaText: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: '#C61010',
  },
  dropdownItemText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: '#334155',
  },
  dropdownItemTextActive: {
    color: '#C61010',
    fontFamily: fonts.bold,
  },
  novaEmpresaInputBox: {
    marginTop: 8,
    marginBottom: 4,
  },
  novaEmpresaInputLabel: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    color: '#C61010',
    marginBottom: 4,
  },
  inputHelperText: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 14,
  },

  /* Seletor de Status de Contrato */
  contractStatusSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  contractStatusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  contractStatusOptionAtivo: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  contractStatusOptionInativo: {
    borderColor: '#94A3B8',
    backgroundColor: '#F1F5F9',
  },
  contractStatusText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#64748B',
  },
  contractStatusTextAtivo: {
    fontFamily: fonts.bold,
    color: '#047857',
  },
  contractStatusTextInativo: {
    fontFamily: fonts.bold,
    color: '#475569',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: spacing.xl,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: '#64748B',
  },
  confirmButton: {
    backgroundColor: '#C61010',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  confirmButtonText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },

  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  profileModalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
  },
  profileModalAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#C61010',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  profileModalName: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#1E1E1E',
  },
  profileModalEmail: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  profileRoleBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  profileRoleText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#C61010',
  },
  profileModalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: spacing.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  logoutButtonText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#DC2626',
  },
  notifModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.xl,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  notifTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#1E1E1E',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  notifItemTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#1E1E1E',
  },
  notifItemDesc: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  botModalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
  },
  botIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#C61010',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  botModalTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#1E1E1E',
  },
  botModalDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  botModalCloseBtn: {
    backgroundColor: '#C61010',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: spacing.lg,
  },
  botModalCloseText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
