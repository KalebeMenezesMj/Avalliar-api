import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../theme';
import { useTheme, ThemeColors } from '../context/ThemeContext';

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  activeColor?: string;
}

// Geometria da trilha — precisa bater com os estilos track/thumb.
const TRACK_PADDING = 3;
const SEGMENT_GAP = 4;

// Fundo ativo claro (ex.: branco no dark) pede texto escuro para continuar legível.
const isLightHex = (hex: string): boolean => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};

// Seletor segmentado genérico (filtro de período, tipo de gráfico, etc.).
// A "pílula" ativa desliza de forma fluida entre as opções (spring, native driver).
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  activeColor = '#C61010',
}: SegmentedControlProps<T>) {
  const { colors: t } = useTheme();
  const styles = makeStyles(t);

  const [segWidth, setSegWidth] = useState(0);
  const segWidthRef = useRef(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(false);

  const activeIndex = Math.max(0, options.findIndex((o) => o.key === value));

  const handleTrackLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    const w = (width - TRACK_PADDING * 2 - SEGMENT_GAP * (options.length - 1)) / options.length;
    segWidthRef.current = w;
    setSegWidth(w);
    translateX.setValue(TRACK_PADDING + activeIndex * (w + SEGMENT_GAP));
  };

  // Desliza a pílula quando a opção ativa muda (sem animar no primeiro mount).
  useEffect(() => {
    const first = !mountedRef.current;
    mountedRef.current = true;
    if (first || segWidthRef.current === 0) return;
    Animated.spring(translateX, {
      toValue: TRACK_PADDING + activeIndex * (segWidthRef.current + SEGMENT_GAP),
      tension: 120,
      friction: 14,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const activeTextColor = isLightHex(activeColor) ? '#111111' : '#FFFFFF';

  return (
    <View style={styles.track} onLayout={handleTrackLayout}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          { width: segWidth, backgroundColor: activeColor, transform: [{ translateX }] },
        ]}
      />
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={({ pressed }) => [styles.segment, pressed && styles.segmentPressed]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            {opt.icon && (
              <Ionicons name={opt.icon} size={14} color={active ? activeTextColor : t.textSecondary} />
            )}
            <Text
              style={[styles.text, active && { fontFamily: fonts.bold, color: activeTextColor }]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: t.chipBackground,
    borderRadius: 12,
    padding: TRACK_PADDING,
    gap: SEGMENT_GAP,
  },
  thumb: {
    position: 'absolute',
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: 0,
    borderRadius: 9,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: 9,
  },
  segmentPressed: {
    opacity: 0.8,
  },
  text: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: t.textSecondary,
  },
});
