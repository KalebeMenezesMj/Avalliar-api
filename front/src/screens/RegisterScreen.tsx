import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BackButton from '../components/BackButton';
import Button from '../components/Button';
import TextInputField from '../components/TextInputField';
import { AuthResponse, authService } from '../services/authService';
import { fonts, spacing } from '../theme';
import { useTheme, ThemeColors } from '../context/ThemeContext';

type Props = {
  onBack: () => void;
  onNavigateToLogin: () => void;
  onRegisterSuccess: (user: AuthResponse) => void;
};

export default function RegisterScreen({
  onBack,
  onNavigateToLogin,
  onRegisterSuccess,
}: Props) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errors, setErrors] = useState<{
    nome?: string;
    email?: string;
    senha?: string;
    confirmarSenha?: string;
  }>({});
  const { colors: t } = useTheme();
  const styles = makeStyles(t);

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!nome.trim()) {
      newErrors.nome = 'Nome é obrigatório.';
    }

    const emailTrim = email.trim();
    if (!emailTrim) {
      newErrors.email = 'E-mail é obrigatório.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrim)) {
        newErrors.email = 'E-mail inválido.';
      }
    }

    if (!senha) {
      newErrors.senha = 'Senha é obrigatória.';
    } else if (senha.length < 6) {
      newErrors.senha = 'A senha deve ter no mínimo 6 caracteres.';
    }

    if (!confirmarSenha) {
      newErrors.confirmarSenha = 'Confirmação de senha é obrigatória.';
    } else if (senha !== confirmarSenha) {
      newErrors.confirmarSenha = 'As senhas não coincidem.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    setErrorMessage('');

    if (!validate()) {
      return;
    }

    try {
      setLoading(true);
      const response = await authService.register({
        nome: nome.trim(),
        email: email.trim(),
        senha,
      });

      const successMsg = 'Usuário cadastrado com sucesso!';
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Sucesso', successMsg);
      }

      onRegisterSuccess(response);
    } catch (err: any) {
      const message = err.message || 'Falha ao cadastrar usuário. Tente novamente.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Botão de voltar no topo (padrão) */}
            <View style={styles.topBar}>
              <BackButton onPress={onBack} />
            </View>

            {/* Título Principal */}
            <View style={styles.header}>
              <Text style={styles.title}>Avalliar</Text>
            </View>

            {/* Formulário */}
            <View style={styles.form}>
              {!!errorMessage && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>{errorMessage}</Text>
                </View>
              )}

              <TextInputField
                label="Nome de Usuário"
                placeholder="Ex: Lucas Nicolas"
                value={nome}
                onChangeText={(text) => {
                  setNome(text);
                  if (errors.nome) setErrors((prev) => ({ ...prev, nome: undefined }));
                  if (errorMessage) setErrorMessage('');
                }}
                error={errors.nome}
              />

              <TextInputField
                label="Email"
                placeholder="Ex: lucasnicolas@gmail.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  if (errorMessage) setErrorMessage('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />

              <TextInputField
                label="Senha"
                placeholder="••••••••"
                value={senha}
                onChangeText={(text) => {
                  setSenha(text);
                  if (errors.senha) setErrors((prev) => ({ ...prev, senha: undefined }));
                  if (errorMessage) setErrorMessage('');
                }}
                isPassword
                error={errors.senha}
              />

              <TextInputField
                label="Confirmar Senha"
                placeholder="••••••••"
                value={confirmarSenha}
                onChangeText={(text) => {
                  setConfirmarSenha(text);
                  if (errors.confirmarSenha) {
                    setErrors((prev) => ({ ...prev, confirmarSenha: undefined }));
                  }
                  if (errorMessage) setErrorMessage('');
                }}
                isPassword
                error={errors.confirmarSenha}
              />

              <Button
                title="CADASTRAR"
                variant="primary"
                loading={loading}
                onPress={handleRegister}
                style={styles.registerButton}
              />
            </View>
          </View>

          {/* Rodapé com Navegação para Login */}
          <View style={styles.footer}>
            <View style={styles.loginPrompt}>
              <Text style={styles.loginPromptText}>Já possui uma conta?</Text>
              <Pressable
                onPress={onNavigateToLogin}
                accessibilityRole="button"
                hitSlop={6}
              >
                <Text style={styles.loginLinkText}>Entre agora!</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: t.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: spacing.sm,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  title: {
    fontFamily: fonts.boldItalic,
    fontSize: 40,
    color: t.text,
    letterSpacing: -0.5,
  },
  form: {
    width: '100%',
  },
  errorBox: {
    backgroundColor: t.softRedBackground,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  errorBoxText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: t.error,
    textAlign: 'center',
  },
  registerButton: {
    width: '75%',
    alignSelf: 'center',
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  loginPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginPromptText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.textSecondary,
    marginBottom: 2,
  },
  loginLinkText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: t.accentRed,
  },
});
