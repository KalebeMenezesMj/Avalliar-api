import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';
import { AuthResponse } from '../services/authService';

interface SettingsScreenProps {
  onBack: () => void;
  currentUser?: AuthResponse | null;
  onLogout?: () => void;
}

const SettingsScreen = ({ onBack, currentUser, onLogout }: SettingsScreenProps) => {
  const [isNotificationsEnabled, setIsNotificationsEnabled] = React.useState(true);
  const [isDarkModeEnabled, setIsDarkModeEnabled] = React.useState(false);

  const handleGoBack = () => {
    onBack();
  };

  const handleEditProfile = () => {
    console.log('Navegar para Editar Perfil');
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const userName = currentUser?.nome || 'Usuário Avalliar';
  const userEmail = currentUser?.email || 'usuario@avalliar.com.br';

  const NEUTRAL_ICON_COLOR = '#64748B';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajustes</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Perfil Card */}
        <TouchableOpacity style={styles.profileSection} onPress={handleEditProfile} activeOpacity={0.7}>
          <View style={styles.avatarContainer}>
             <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.profileTextContainer}>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Geral */}
        <Text style={styles.sectionLabel}>PREFERÊNCIAS</Text>
        <View style={styles.cardSection}>
          <View style={[styles.settingItem, styles.firstSettingItem]}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="notifications-outline" size={22} color={NEUTRAL_ICON_COLOR} />
              <Text style={styles.settingText}>Notificações</Text>
            </View>
            <Switch
              trackColor={{ false: '#E2E8F0', true: colors.primary }}
              thumbColor="#FFFFFF"
              onValueChange={() => setIsNotificationsEnabled((prev) => !prev)}
              value={isNotificationsEnabled}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="moon-outline" size={22} color={NEUTRAL_ICON_COLOR} />
              <Text style={styles.settingText}>Modo Escuro</Text>
            </View>
            <Switch
              trackColor={{ false: '#E2E8F0', true: colors.primary }}
              thumbColor="#FFFFFF"
              onValueChange={() => setIsDarkModeEnabled((prev) => !prev)}
              value={isDarkModeEnabled}
            />
          </View>

          <TouchableOpacity style={[styles.settingItem, styles.lastSettingItem]} activeOpacity={0.5}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="globe-outline" size={22} color={NEUTRAL_ICON_COLOR} />
              <Text style={styles.settingText}>Idioma</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Suporte */}
        <Text style={styles.sectionLabel}>SUPORTE E INFO</Text>
        <View style={styles.cardSection}>
          <TouchableOpacity style={[styles.settingItem, styles.firstSettingItem]} activeOpacity={0.5}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="information-circle-outline" size={22} color={NEUTRAL_ICON_COLOR} />
              <Text style={styles.settingText}>Sobre</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} activeOpacity={0.5}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="shield-checkmark-outline" size={22} color={NEUTRAL_ICON_COLOR} />
              <Text style={styles.settingText}>Privacidade</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingItem, styles.lastSettingItem]} activeOpacity={0.5}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="help-buoy-outline" size={22} color={NEUTRAL_ICON_COLOR} />
              <Text style={styles.settingText}>Ajuda</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {onLogout && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.logoutButtonText}>Encerrar Sessão</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.versionText}>Versão 1.2.4 (Build 102)</Text>
      </ScrollView>
    </View>
  );
};

const EXTRA_ROUND = 22;

const styles = StyleSheet.create({
  container: {
    paddingTop: 15,
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? spacing.xl : spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: EXTRA_ROUND,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  avatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#FFFFFF',
  },
  profileTextContainer: {
    flex: 1,
  },
  profileName: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  profileEmail: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    letterSpacing: 1.2,
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: EXTRA_ROUND,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  firstSettingItem: {
    borderTopLeftRadius: EXTRA_ROUND,
    borderTopRightRadius: EXTRA_ROUND,
  },
  lastSettingItem: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: EXTRA_ROUND,
    borderBottomRightRadius: EXTRA_ROUND,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 30,
    marginHorizontal: spacing.md,
    marginTop: spacing.xxl,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  logoutButtonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  versionText: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
});

export default SettingsScreen;