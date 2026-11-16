import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as lightColors, fonts, spacing, radius } from '../theme';

// Tokens da paleta escura — preto neutro (sem tom azulado); mesmos chaves da paleta clara
export const darkColors = {
  primary: '#E84141',
  brandRed: '#C61010',
  accentRed: '#F87171', // vermelho legível sobre fundo escuro
  background: '#0A0A0A',
  surface: '#141414',
  cardBackground: '#141414',
  cardBorder: '#272727',
  text: '#FAFAFA',
  textSecondary: '#A3A3A3',
  textMuted: '#6F6F6F',
  inputBackground: '#1F1F1F',
  inputBorder: '#3D3D3D',
  placeholder: '#737373',
  textOnPrimary: '#FFFFFF',
  headerBackground: '#141414',
  backButtonBackground: '#272727',
  iconColor: '#A3A3A3',
  error: '#EF4444',
  success: '#22C55E',
  divider: '#272727',
  chipBackground: '#232323',
  chipText: '#D4D4D4',
  pressedSurface: '#1C1C1C',
  softRedBackground: 'rgba(232, 65, 65, 0.16)',
  softRedText: '#F87171',
  suggestionBackground: 'rgba(190, 18, 60, 0.16)',
  suggestionBorder: 'rgba(251, 113, 133, 0.35)',
  suggestionText: '#FDA4AF',
  purpleSoftBackground: 'rgba(109, 40, 217, 0.22)',
  purpleSoftBorder: 'rgba(139, 92, 246, 0.4)',
  purpleSoftText: '#C4B5FD',
  modalBackground: '#141414',
  statusBg: {
    EM_CAMPO: { bg: 'rgba(29, 78, 216, 0.22)', text: '#93C5FD', border: 'rgba(59, 130, 246, 0.45)' },
    CONCLUIDA: { bg: 'rgba(4, 120, 87, 0.22)', text: '#6EE7B7', border: 'rgba(16, 185, 129, 0.45)' },
    AGUARDANDO_LAUDO: { bg: 'rgba(180, 83, 9, 0.25)', text: '#FCD34D', border: 'rgba(245, 158, 11, 0.45)' },
    DEFAULT: { bg: 'rgba(100, 116, 139, 0.22)', text: '#CBD5E1', border: 'rgba(148, 163, 184, 0.4)' },
  },
};

export const lightThemeColors = {
  ...lightColors,
  brandRed: '#C61010',
  accentRed: '#C61010',
  cardBackground: '#FFFFFF',
  cardBorder: '#F1F5F9',
  headerBackground: '#FFFFFF',
  backButtonBackground: '#F1F5F9',
  iconColor: '#64748B',
  divider: '#F3F4F6',
  chipBackground: '#F3F4F6',
  chipText: '#4B5563',
  pressedSurface: '#F9FAFB',
  softRedBackground: '#FEE2E2',
  softRedText: '#C61010',
  suggestionBackground: '#FFF1F2',
  suggestionBorder: '#FECDD3',
  suggestionText: '#9F1239',
  purpleSoftBackground: '#F5F3FF',
  purpleSoftBorder: '#DDD6FE',
  purpleSoftText: '#5B21B6',
  modalBackground: '#FFFFFF',
  statusBg: {
    EM_CAMPO: { bg: '#EFF6FF', text: '#1D4ED8', border: '#DBEAFE' },
    CONCLUIDA: { bg: '#ECFDF5', text: '#047857', border: '#D1FAE5' },
    AGUARDANDO_LAUDO: { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
    DEFAULT: { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' },
  },
};

export type ThemeColors = typeof lightThemeColors;

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleDarkMode: () => {},
  colors: lightThemeColors,
});

// Padrão do tema: segue o sistema do dispositivo — Android/iOS usam o tema do
// próprio aparelho e a web o tema do navegador, igual aos sistemas atuais.
const getSystemPrefersDark = (): boolean => Appearance.getColorScheme() === 'dark';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => getSystemPrefersDark());
  // Enquanto o usuário não tocar no toggle, o tema acompanha o sistema.
  const [manualChoice, setManualChoice] = useState(false);

  // Escolha explícita persistida: tem precedência sobre o sistema em todo novo
  // lançamento do app. Sem escolha salva, o padrão é sempre o do sistema.
  useEffect(() => {
    AsyncStorage.getItem('avalliar_theme')
      .then((value) => {
        if (value === 'dark' || value === 'light') {
          setManualChoice(true);
          setIsDarkMode(value === 'dark');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (!manualChoice) setIsDarkMode(colorScheme === 'dark');
    });
    return () => subscription.remove();
  }, [manualChoice]);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setManualChoice(true);
    setIsDarkMode(next);
    AsyncStorage.setItem('avalliar_theme', next ? 'dark' : 'light').catch(() => {});
  };

  const themeColors = isDarkMode ? darkColors : lightThemeColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, colors: themeColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
