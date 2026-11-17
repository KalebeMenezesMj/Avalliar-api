import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Telas que usam a barra. "demandas" são as telas de tarefas e destacam a aba Tarefas.
export type TabType = 'painel' | 'home' | 'demandas' | 'tarefas' | 'configuracoes';

type NavKey = 'painel' | 'home' | 'tarefas' | 'configuracoes';

const TAB_ALIAS: Record<TabType, NavKey> = {
  painel: 'painel',
  home: 'home',
  demandas: 'tarefas',
  tarefas: 'tarefas',
  configuracoes: 'configuracoes',
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface NavItemConfig {
  key: NavKey;
  label: string;
  icon: IoniconName;
  iconOutline: IoniconName;
}

// Quatro ícones, sem texto, em pílula flutuante vermelha (estilo Instagram).
const NAV_ITEMS: NavItemConfig[] = [
  { key: 'painel', label: 'Métricas', icon: 'stats-chart', iconOutline: 'stats-chart-outline' },
  { key: 'home', label: 'Início', icon: 'home', iconOutline: 'home-outline' },
  { key: 'tarefas', label: 'Tarefas', icon: 'clipboard', iconOutline: 'clipboard-outline' },
  { key: 'configuracoes', label: 'Configurações', icon: 'settings', iconOutline: 'settings-outline' },
];

const BRAND = '#C61010';

// Destaque que desliza atrás da aba ativa. A altura da pílula é 64 (estilo abaixo).
const THUMB_WIDTH = 44;
const THUMB_HEIGHT = 40;
const PILL_HEIGHT = 64;

interface BottomNavigationProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const getBottomNavigationPadding = (bottomInset: number = 0): number => {
  // No Android, a barra de navegação nativa (3 botões: ~48dp, gestos: ~24dp) frequentemente
  // reporta bottomInset = 0 no React Native se não estiver com edge-to-edge nativo vinculado.
  // Garantimos no mínimo 52dp no Android para que os botões do sistema não fiquem sobrepostos.
  if (Platform.OS === 'android') {
    return Math.max(bottomInset + 12, 52);
  }
  return Math.max(bottomInset + 8, 16);
};

export const getBottomNavigationHeight = (bottomInset: number = 0): number => {
  return PILL_HEIGHT + getBottomNavigationPadding(bottomInset);
};

// Flutua sobre o conteúdo, sem faixa de fundo: a área fora da pílula é transparente.
// As telas com esta barra já têm margem inferior para o conteúdo não ficar atrás dela.
// O destaque da aba ativa desliza de forma fluida entre os ícones (spring, native driver).
export default function BottomNavigation({ activeTab, onSelectTab }: BottomNavigationProps) {
  const insets = useSafeAreaInsets();
  const active = TAB_ALIAS[activeTab] ?? 'home';
  const activeIndex = Math.max(0, NAV_ITEMS.findIndex((n) => n.key === active));

  const [measured, setMeasured] = useState(false);
  const slotWidthRef = useRef(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(false);

  // No Android ou iOS, ajusta a margem inferior para respeitar a barra nativa do sistema
  // (3 botões: ~48dp, gestos: ~24dp, ou home indicator no iOS: 34dp).
  const bottomInset = insets.bottom;
  const paddingBottom = getBottomNavigationPadding(bottomInset);

  const handlePillLayout = (e: LayoutChangeEvent) => {
    const slot = e.nativeEvent.layout.width / NAV_ITEMS.length;
    slotWidthRef.current = slot;
    setMeasured(true);
    translateX.setValue(activeIndex * slot + (slot - THUMB_WIDTH) / 2);
  };

  // Desliza o destaque quando a aba ativa muda (sem animar no primeiro mount).
  useEffect(() => {
    const first = !mountedRef.current;
    mountedRef.current = true;
    if (first || slotWidthRef.current === 0) return;
    Animated.spring(translateX, {
      toValue: activeIndex * slotWidthRef.current + (slotWidthRef.current - THUMB_WIDTH) / 2,
      tension: 120,
      friction: 15,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  return (
    <View style={[styles.dock, { paddingBottom }]} pointerEvents="box-none">
      <View style={styles.pill} onLayout={handlePillLayout}>
        <Animated.View
          pointerEvents="none"
          style={[styles.thumb, { opacity: measured ? 1 : 0, transform: [{ translateX }] }]}
        />
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [styles.slot, pressed && styles.slotPressed]}
              onPress={() => onSelectTab(item.key as TabType)}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
              hitSlop={6}
            >
              <Ionicons
                name={isActive ? item.icon : item.iconOutline}
                size={26}
                color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.7)'}
              />
              <View style={[styles.activeDot, isActive && styles.activeDotVisible]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: 'transparent',
    zIndex: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: PILL_HEIGHT,
    borderRadius: 32,
    backgroundColor: BRAND,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 6px 16px rgba(198,16,16,0.35)',
      },
    }),
  },
  thumb: {
    position: 'absolute',
    top: (PILL_HEIGHT - THUMB_HEIGHT) / 2,
    left: 0,
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  slot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  slotPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.92 }],
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  activeDotVisible: {
    backgroundColor: '#FFFFFF',
  },
});
