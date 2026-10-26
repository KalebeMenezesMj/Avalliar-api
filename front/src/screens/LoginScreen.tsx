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
import { colors, fonts, spacing } from '../theme';

type Props = {
  onBack: () => void;
  onNavigateToRegister: () => void;
  onLoginSuccess: (user: AuthResponse) => void;
};

export default function LoginScreen({
  onBack,
  onNavigateToRegister,
  onLoginSuccess,
}: Props) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    setErrorMessage('');

    const cleanInput = email.trim();
    if (!cleanInput) {
      setErrorMessage('Por favor, informe seu e-mail.');
      return;
    }

    if (!senha) {
      setErrorMessage('Por favor, informe sua senha.');
      return;
    }

    try {
      setLoading(true);
      const response = await authService.login({
        email: cleanInput,
        senha,
      });

      if (Platform.OS === 'web') {
        window.alert(`Bem-vindo(a), ${response.nome || response.email}!`);
      } else {
        Alert.alert('Sucesso', `Bem-vindo(a), ${response.nome || response.email}!`);
      }

      onLoginSuccess(response);
    } catch (err: any) {
      const message = err.message || 'Falha ao autenticar. Tente novamente.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    const msg = 'A recuperação de senha será disponibilizada em breve.';
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Esqueceu a senha?', msg);
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
                label="Email"
                placeholder="Ex: lucasnicolas@gmail.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMessage) setErrorMessage('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInputField
                label="Senha"
                placeholder="••••••••"
                value={senha}
                onChangeText={(text) => {
                  setSenha(text);
                  if (errorMessage) setErrorMessage('');
                }}
                isPassword
              />

              <Pressable
                onPress={handleForgotPassword}
                accessibilityRole="button"
                style={styles.forgotPasswordContainer}
              >
                <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
              </Pressable>

              <Button
                title="ENTRAR"
                variant="primary"
                loading={loading}
                onPress={handleLogin}
                style={styles.loginButton}
              />
            </View>
          </View>

          {/* Rodapé com Navegação para Cadastro e Botão Voltar */}
          <View style={styles.footer}>
            <View style={styles.backButtonContainer}>
              <BackButton onPress={onBack} />
            </View>

            <View style={styles.registerPrompt}>
              <Text style={styles.registerPromptText}>Ainda não possui uma conta?</Text>
              <Pressable
                onPress={onNavigateToRegister}
                accessibilityRole="button"
                hitSlop={6}
              >
                <Text style={styles.registerLinkText}>Cadastre-se já!</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    marginTop: spacing.md,
  },
  title: {
    fontFamily: fonts.boldItalic,
    fontSize: 40,
    color: colors.text,
    letterSpacing: -0.5,
  },
  form: {
    width: '100%',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  errorBoxText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -spacing.xs,
    marginBottom: spacing.xl,
  },
  forgotPasswordText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.text,
  },
  loginButton: {
    width: '75%',
    alignSelf: 'center',
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxl,
    paddingTop: spacing.md,
    position: 'relative',
    minHeight: 56,
  },
  backButtonContainer: {
    position: 'absolute',
    left: 0,
    bottom: 0,
  },
  registerPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerPromptText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  registerLinkText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
});
