import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Idioma do app — segue o idioma do sistema do dispositivo (Android/iOS) ou do
// navegador (web), e lembra a escolha manual do usuário em todos os ambientes.
export type Locale = 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE';

// Ordem de exibição na seleção de idioma.
export const LOCALES: Locale[] = ['pt-BR', 'en-US', 'es-ES', 'fr-FR', 'de-DE'];

// Rótulo de cada idioma no próprio idioma (como nos sistemas atuais).
export const LOCALE_LABELS: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  'en-US': 'English (US)',
  'es-ES': 'Español',
  'fr-FR': 'Français',
  'de-DE': 'Deutsch',
};

const STORAGE_KEY = 'avalliar_locale';

// Idioma do sistema: no aparelho usa o idioma configurado no Android/iOS,
// na web usa o do navegador.
const getSystemLocale = (): Locale => {
  let raw: string | null | undefined = null;
  if (Platform.OS === 'web') {
    raw = typeof navigator !== 'undefined' ? navigator.language : null;
  } else {
    // RN 0.71+: locale do dispositivo vem via getConstants()
    raw =
      I18nManager.getConstants().localeIdentifier ||
      (I18nManager as unknown as { locale?: string | null }).locale ||
      null;
  }
  if (!raw) return 'pt-BR';
  const normalized = raw.toLowerCase();
  const base = normalized.split('-')[0];
  return (
    LOCALES.find((l) => l.toLowerCase() === normalized) ??
    LOCALES.find((l) => l.toLowerCase().split('-')[0] === base) ??
    'pt-BR'
  );
};

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'pt-BR',
  setLocale: () => {},
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Começa já com o idioma do sistema (sem "piscar" no padrão) e, ao carregar,
  // aplica a última escolha manual salva, se houver.
  const [locale, setLocaleState] = useState<Locale>(getSystemLocale);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (active && saved && (LOCALES as string[]).includes(saved)) {
          setLocaleState(saved as Locale);
        }
      })
      .catch(() => {
        // sem storage disponível — segue o idioma do sistema
      });
    return () => {
      active = false;
    };
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
