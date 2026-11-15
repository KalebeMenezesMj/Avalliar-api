import React from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

interface BottomNavigationProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

// Flutua sobre o conteúdo, sem faixa de fundo: a área fora da pílula é transparente.
// As telas com esta barra já têm margem inferior (110px) para o conteúdo não ficar atrás dela.
export default function BottomNavigation({ activeTab, onSelectTab }: BottomNavigationProps) {
  const active = TAB_ALIAS[activeTab] ?? 'home';

  return (
    <View style={styles.dock} pointerEvents="box-none">
      <View style={styles.pill}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          return (
            <Pressable
              key={item.key}
              style={styles.slot}
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
    height: 64,
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
  slot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
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
