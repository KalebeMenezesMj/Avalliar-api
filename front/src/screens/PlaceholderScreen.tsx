import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { colors, fonts, spacing } from '../theme';
import BottomNavigation, { TabType } from '../components/BottomNavigation';

interface PlaceholderScreenProps {
  title: string;
  description: string;
  iconName: any;
  onBack: () => void;
  onNavigateTab: (tab: TabType) => void;
  activeTab?: TabType;
}

export default function PlaceholderScreen({
  title,
  description,
  iconName,
  onBack,
  onNavigateTab,
  activeTab = 'home',
}: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header Limpo Nativo */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton} hitSlop={8}>
          <Feather name="arrow-left" size={22} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Content */}
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={iconName} size={42} color="#DC2626" />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }]}
          onPress={onBack}
        >
          <Feather name="chevron-left" size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>Voltar para o Início</Text>
        </Pressable>
      </View>

      {/* Bottom Nav */}
      <BottomNavigation activeTab={activeTab} onSelectTab={onNavigateTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#0F172A',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: '#F8FAFC',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: '#FECDD3',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 3px 10px rgba(220, 38, 38, 0.2)',
        cursor: 'pointer',
      },
    }),
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
