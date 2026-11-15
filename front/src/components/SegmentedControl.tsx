import React from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../theme';

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

// Seletor segmentado genérico (filtro de período, tipo de gráfico, etc.).
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  activeColor = '#C61010',
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.segment, active && { backgroundColor: activeColor }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            {opt.icon && (
              <Ionicons name={opt.icon} size={14} color={active ? '#FFFFFF' : '#475569'} />
            )}
            <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    gap: 4,
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
  text: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: '#475569',
  },
  textActive: {
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },
});
