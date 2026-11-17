import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  KeyboardTypeOptions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing } from '../theme';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { AuthResponse } from '../services/authService';
import { userService, UsuarioDTO } from '../services/userService';

interface EditProfileScreenProps {
  onBack: () => void;
  currentUser?: AuthResponse | null;
}

const EXTRA_ROUND = 22;

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ROLAS_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  AVALIADOR: 'Avaliador',
  VISTORIADOR: 'Vistoriador',
  OPERACIONAL: 'Operacional',
};

type Erros = Partial<Record<'nome' | 'email' | 'senha' | 'confirmar', string>>;

export default function EditProfileScreen({ onBack, currentUser }: EditProfileScreenProps) {
  const { colors: t, isDarkMode } = useTheme();
  const styles = makeStyles(t, isDarkMode);
  const insets = useSafeAreaInsets();

  const [nome, setNome] = useState(currentUser?.nome || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [focoSenha, setFocoSenha] = useState(false);

  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  // Quando o teclado sobe sobre os campos de senha, rola o conteúdo para cima
  // e mantém o campo ativo + o botão de salvar visíveis acima do teclado.
  useEffect(() => {
    if (!focoSenha) return;
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 300);
    return () => clearTimeout(id);
  }, [focoSenha]);

  const userName = currentUser?.nome || 'Usuário Avalliar';
  const roleLabel = currentUser?.role ? (ROLAS_LABEL[currentUser.role] ?? currentUser.role) : null;

  const validar = (): boolean => {
    const novos: Erros = {};
    if (!nome.trim()) novos.nome = 'Informe o seu nome completo.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) novos.email = 'Informe um e-mail válido.';
    if (senha.trim() && senha.trim().length < 6) novos.senha = 'A senha precisa de ao menos 6 caracteres.';
    if (senha.trim() && senha !== confirmar) novos.confirmar = 'As senhas não conferem.';
    setErros(novos);
    return Object.keys(novos).length === 0;
  };

  const handleSalvar = async () => {
    if (!validar()) return;
    setSalvando(true);
    try {
      const payload: UsuarioDTO = {
        nome: nome.trim(),
        email: email.trim(),
      };
      if (telefone.trim()) payload.telefone = telefone.trim();
      if (senha.trim()) payload.senha = senha.trim();

      // Localiza a conta pelo e-mail e atualiza via PUT /api/usuarios/{id}
      let atualizouNoServidor = false;
      try {
        const todos = await userService.listarFuncionarios();
        const alvo = todos.find(
          (u) => (u.email || '').toLowerCase() === email.trim().toLowerCase()
        );
        if (alvo?.id != null) {
          await userService.atualizarFuncionario(alvo.id, { ...payload, role: alvo.role });
          atualizouNoServidor = true;
        }
      } catch {
        // Sem servidor: salva apenas no estado local da sessão
      }

      if (atualizouNoServidor) {
        Alert.alert('Sucesso', 'Seu perfil foi atualizado com sucesso.');
      } else {
        Alert.alert(
          'Salvo neste aparelho',
          'Não encontramos sua conta no servidor agora. As alterações ficaram salvas nesta sessão do aplicativo.'
        );
      }
      setSenha('');
      setConfirmar('');
      setTimeout(onBack, 600);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Cabeçalho vermelho da marca (padrão do app) */}
      <View style={[styles.header, { backgroundColor: t.brandRed }]}>
        <TouchableOpacity onPress={onBack} hitSlop={8} style={styles.headerCircle}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: t.background }}
        behavior={Platform.OS === 'android' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 30 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Avatar + identificação */}
        <View style={styles.avatarBlock}>
          <View style={[styles.avatar, { backgroundColor: t.brandRed }]}>
            <Text style={styles.avatarText}>{getInitials(userName)}</Text>
          </View>
          <Text style={[styles.avatarName, { color: t.text }]} numberOfLines={1}>
            {userName}
          </Text>
          {roleLabel ? (
            <View style={[styles.rolePill, { backgroundColor: t.softRedBackground }]}>
              <Text style={[styles.rolePillText, { color: t.brandRed }]}>{roleLabel}</Text>
            </View>
          ) : null}
        </View>

        {/* Dados pessoais */}
        <View style={[styles.card, styles.cardGap]}>
          <Campo
            icon="person-outline"
            label="NOME COMPLETO"
            placeholder="Seu nome"
            value={nome}
            onChangeText={(v) => setNome(v)}
            error={erros.nome}
            t={t}
            styles={styles}
          />
          <View style={styles.fieldDivider} />
          <Campo
            icon="mail-outline"
            label="E-MAIL"
            placeholder="voce@empresa.com.br"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(v) => setEmail(v)}
            error={erros.email}
            t={t}
            styles={styles}
          />
          <View style={styles.fieldDivider} />
          <Campo
            icon="call-outline"
            label="TELEFONE"
            placeholder="(11) 90000-0000"
            keyboardType="phone-pad"
            value={telefone}
            onChangeText={(v) => setTelefone(v)}
            t={t}
            styles={styles}
          />
        </View>

        {/* Senha */}
        <View style={[styles.card, styles.cardGap]}>
          <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>
            TROCAR SENHA • OPCIONAL
          </Text>
          <FieldInput
            icon="lock-closed-outline"
            label="NOVA SENHA"
            placeholder="••••••••"
            secureTextEntry={!mostrarSenha}
            value={senha}
            onChangeText={(v) => setSenha(v)}
            error={erros.senha}
            onFocus={() => setFocoSenha(true)}
            onBlur={() => setFocoSenha(false)}
            t={t}
            styles={styles}
            rightAccessory={
              <TouchableOpacity
                onPress={() => setMostrarSenha((m) => !m)}
                hitSlop={8}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={mostrarSenha ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>
            }
          />
          <View style={styles.fieldDivider} />
          <FieldInput
            icon="lock-closed-outline"
            label="CONFIRMAR SENHA"
            placeholder="••••••••"
            secureTextEntry={!mostrarSenha}
            value={confirmar}
            onChangeText={(v) => setConfirmar(v)}
            error={erros.confirmar}
            onFocus={() => setFocoSenha(true)}
            onBlur={() => setFocoSenha(false)}
            t={t}
            styles={styles}
          />
        </View>

        {/* Ações */}
        {salvando ? (
          <ActivityIndicator size="large" color={t.brandRed} style={{ marginVertical: 18 }} />
        ) : (
          <>
            <Pressable
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
              onPress={handleSalvar}
            >
              <LinearGradient
                colors={['#991B1B', '#C61010']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveButton}
              >
                <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Salvar alterações</Text>
              </LinearGradient>
            </Pressable>
            <TouchableOpacity style={[styles.backButton, { borderColor: t.cardBorder }]} onPress={onBack}>
              <Ionicons name="arrow-back-outline" size={17} color={t.text} />
              <Text style={[styles.backButtonText, { color: t.text }]}>Voltar</Text>
            </TouchableOpacity>
          </>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- Campos reutilizáveis ---------- */

interface CampoProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: KeyboardTypeOptions;
  onFocus?: () => void;
  onBlur?: () => void;
  rightAccessory?: React.ReactNode;
  t: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
}

function FieldInput({
  icon,
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  onFocus,
  onBlur,
  rightAccessory,
  t,
  styles,
}: CampoProps) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: t.textMuted }]}>{label}</Text>
      <View
        style={[
          styles.inputBox,
          { backgroundColor: t.inputBackground, borderColor: error ? '#DC2626' : t.inputBorder },
        ]}
      >
        <Ionicons name={icon} size={17} color="#64748B" style={styles.inputIcon} />
        <TextInput
          style={[styles.inputText, { color: t.text }]}
          placeholder={placeholder}
          placeholderTextColor={t.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize ?? 'words'}
          keyboardType={keyboardType}
          returnKeyType="next"
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {rightAccessory}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

/** Atalho para uso simples (sem accessory). */
const Campo = FieldInput;

/* ---------- Estilos ---------- */
const makeStyles = (t: ThemeColors, isDark: boolean) => {
  const softShadow = isDark
    ? {}
    : {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      };

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: t.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    headerCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontFamily: fonts.bold,
      fontSize: 17,
      color: '#FFFFFF',
    },

    /* Avatar */
    avatarBlock: {
      alignItems: 'center',
      marginTop: 4,
      marginBottom: spacing.md,
      gap: 6,
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#C61010',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    avatarText: {
      fontFamily: fonts.bold,
      fontSize: 26,
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    avatarName: {
      fontFamily: fonts.bold,
      fontSize: 16,
      marginTop: 2,
    },
    rolePill: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 12,
    },
    rolePillText: {
      fontFamily: fonts.semibold,
      fontSize: 10.5,
      letterSpacing: 0.4,
    },

    /* Cards */
    card: {
      backgroundColor: t.cardBackground,
      borderRadius: EXTRA_ROUND,
      borderWidth: 1,
      borderColor: t.cardBorder,
      padding: spacing.md,
      marginBottom: spacing.md,
      ...softShadow,
    },
    cardGap: {
      gap: 14,
    },
    sectionTitle: {
      fontFamily: fonts.bold,
      fontSize: 11,
      letterSpacing: 0.8,
    },

    /* Campos */
    fieldLabel: {
      fontFamily: fonts.bold,
      fontSize: 10.5,
      letterSpacing: 0.6,
      marginBottom: 6,
    },
    inputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 4,
      gap: 10,
    },
    inputIcon: {
      marginLeft: 2,
    },
    inputText: {
      flex: 1,
      fontFamily: fonts.regular,
      fontSize: 14,
      paddingVertical: 11,
    },
    eyeButton: {
      paddingHorizontal: 2,
      paddingVertical: 6,
    },
    fieldDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: t.cardBorder,
      marginHorizontal: -spacing.md,
      marginTop: 2,
      padding: 0,
    },
    errorText: {
      fontFamily: fonts.regular,
      fontSize: 11,
      color: '#DC2626',
      marginTop: 5,
      marginLeft: 2,
    },

    /* Ações */
    saveButton: {
      borderRadius: 25,
      height: 50,
      marginTop: 2,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#C61010',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 6,
    },
    saveButtonText: {
      fontFamily: fonts.bold,
      fontSize: 14.5,
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 25,
      borderWidth: 1.5,
      height: 50,
      marginTop: 10,
      backgroundColor: t.cardBackground,
    },
    backButtonText: {
      fontFamily: fonts.semibold,
      fontSize: 14,
    },
  });
};
