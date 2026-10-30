import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import Button from '../components/Button';
import CornerDecoration from '../components/CornerDecoration';
import { colors, fonts, spacing } from '../theme';

type Props = {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
  currentUser?: { nome: string; email: string; role: string } | null;
  onLogout?: () => void;
};

export default function WelcomeScreen({
  onNavigateToLogin,
  onNavigateToRegister,
  currentUser,
  onLogout,
}: Props) {
  return (
    <View style={styles.root}>
      <CornerDecoration position="topLeft" />
      <CornerDecoration position="bottomRight" />

      <SafeAreaView style={styles.container}>
        <View style={styles.brand}>
          <MaterialIcons name="settings" size={56} color={colors.text} />
          <Text style={styles.title}>Avalliar</Text>
          {currentUser && (
            <View style={styles.loggedBox}>
              <Text style={styles.welcomeText}>Conectado como</Text>
              <Text style={styles.userName}>{currentUser.nome || currentUser.email}</Text>
              <Text style={styles.userRole}>Perfil: {currentUser.role}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {currentUser ? (
            <Button
              title="Sair"
              variant="secondary"
              style={styles.button}
              onPress={onLogout}
            />
          ) : (
            <>
              <Button
                title="Entrar"
                variant="primary"
                style={styles.button}
                onPress={onNavigateToLogin}
              />
              <Button
                title="Cadastrar-se"
                variant="secondary"
                style={styles.button}
                onPress={onNavigateToRegister}
              />
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  brand: {
    alignItems: 'center',
  },
  loggedBox: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  welcomeText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  userName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginTop: 2,
  },
  userRole: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  title: {
    fontFamily: fonts.boldItalic,
    fontSize: 40,
    color: colors.text,
    marginTop: spacing.xs,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  button: {
    width: '70%',
    maxWidth: 320,
  },
});
