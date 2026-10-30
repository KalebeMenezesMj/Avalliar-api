import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Animated,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export type TabType = 'demandas' | 'painel' | 'home' | 'tarefas' | 'configuracoes';

interface BottomNavigationProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

interface NavItemConfig {
  key: TabType;
  label: string;
  renderIcon: (color: string, size: number) => React.ReactNode;
}

// 5 Abas com a Home no centro (conforme o protótipo) e os novos ícones intuitivos
const NAV_ITEMS: NavItemConfig[] = [
  {
    key: 'demandas',
    label: 'Demandas',
    renderIcon: (color, size) => (
      <MaterialCommunityIcons name="file-document-outline" size={size} color={color} />
    ),
  },
  {
    key: 'painel',
    label: 'Painel',
    renderIcon: (color, size) => (
      <Ionicons name="stats-chart-outline" size={size} color={color} />
    ),
  },
  {
    key: 'home',
    label: 'Home',
    renderIcon: (color, size) => (
      <Ionicons name="home" size={size} color={color} />
    ),
  },
  {
    key: 'tarefas',
    label: 'Tarefas',
    renderIcon: (color, size) => (
      <Ionicons name="calendar-outline" size={size} color={color} />
    ),
  },
  {
    key: 'configuracoes',
    label: 'Ajustes',
    renderIcon: (color, size) => (
      <Ionicons name="settings-outline" size={size} color={color} />
    ),
  },
];

const CIRCLE_SIZE = 58;

export default function BottomNavigation({ activeTab, onSelectTab }: BottomNavigationProps) {
  const [barWidth, setBarWidth] = useState(0);

  const activeIndex = Math.max(
    0,
    NAV_ITEMS.findIndex((item) => item.key === activeTab)
  );

  const animatedX = useRef(new Animated.Value(0)).current;
  const animatedScale = useRef(new Animated.Value(1)).current;

  const tabWidth = barWidth > 0 ? barWidth / NAV_ITEMS.length : 0;

  useEffect(() => {
    if (tabWidth > 0) {
      const targetX = activeIndex * tabWidth + (tabWidth - CIRCLE_SIZE) / 2;

      Animated.parallel([
        Animated.spring(animatedX, {
          toValue: targetX,
          friction: 8,
          tension: 65,
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.timing(animatedScale, {
            toValue: 0.88,
            duration: 80,
            useNativeDriver: false,
          }),
          Animated.spring(animatedScale, {
            toValue: 1,
            friction: 5,
            tension: 80,
            useNativeDriver: false,
          }),
        ]),
      ]).start();
    }
  }, [activeIndex, tabWidth]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && width !== barWidth) {
      setBarWidth(width);
      const initialTabWidth = width / NAV_ITEMS.length;
      animatedX.setValue(activeIndex * initialTabWidth + (initialTabWidth - CIRCLE_SIZE) / 2);
    }
  };

  const currentActiveItem = NAV_ITEMS[activeIndex] || NAV_ITEMS[2];

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Círculo animado em vermelho com borda branca que desliza suavemente */}
      {barWidth > 0 && (
        <Animated.View
          style={[
            styles.animatedBubble,
            {
              left: animatedX,
              transform: [{ scale: animatedScale }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.bubbleInner}>
            {/* Ícone ativo perfeitamente centralizado sem vazar texto */}
            {currentActiveItem.renderIcon('#FFFFFF', 28)}
          </View>
        </Animated.View>
      )}

      {/* Barra vermelha de navegação clássica */}
      <View style={styles.bar}>
        {NAV_ITEMS.map((item, index) => {
          const isActive = activeIndex === index;

          return (
            <Pressable
              key={item.key}
              style={styles.navItemSlot}
              onPress={() => onSelectTab(item.key)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              hitSlop={8}
            >
              <View style={[styles.slotContent, isActive && { opacity: 0 }]}>
                {item.renderIcon('rgba(255, 255, 255, 0.72)', 24)}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent',
    alignItems: 'center',
    position: 'relative',
    zIndex: 20,
  },
  bar: {
    width: '100%',
    height: 60,
    backgroundColor: '#C61010',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.18,
        shadowRadius: 5,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 -2px 10px rgba(0,0,0,0.18)',
      },
    }),
  },
  navItemSlot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedBubble: {
    position: 'absolute',
    top: -20,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    zIndex: 30,
  },
  bubbleInner: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#C61010',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 6,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.28)',
      },
    }),
  },
});
