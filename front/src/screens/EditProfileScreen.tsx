import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, spacing } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { AuthResponse } from '../services/authService';

interface EditProfileScreenProps {
  onBack: () => void;
  currentUser?: AuthResponse | null;
}

const EditProfileScreen = ({ onBack, currentUser }: EditProfileScreenProps) => {
  const { colors: themeColors } = useTheme();

  const handleGoBack = () => {
    onBack();
  };

  const userName = currentUser?.nome || 'Usuário Avalliar';
  const userEmail = currentUser?.email || 'usuario@avalliar.com.br';

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBackground }]}>
        <TouchableOpacity onPress={handleGoBack} style={[styles.backButton, { backgroundColor: themeColors.backButtonBackground }]}>
          <Ionicons name="chevron-back" size={28} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Editar Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, { color: themeColors.text }]}>Nome:</Text>
        <Text style={[styles.value, { color: themeColors.textSecondary }]}>{userName}</Text>

        <Text style={[styles.label, { color: themeColors.text, marginTop: spacing.md }]}>Email:</Text>
        <Text style={[styles.value, { color: themeColors.textSecondary }]}>{userEmail}</Text>

        {/* Placeholder for actual edit functionality */}
        <Text style={[styles.placeholderText, { color: themeColors.textMuted, marginTop: spacing.xl }]}>
          Funcionalidade de edição de perfil será implementada aqui.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 15,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.xl : spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  value: {
    fontFamily: fonts.regular,
    fontSize: 16,
    marginTop: spacing.sm,
  },
  placeholderText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default EditProfileScreen;
