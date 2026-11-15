import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../theme';
import { chartColors } from './palette';

export interface MeterItem {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  done: number;
  total: number;
}

// Modelo 3 — Lista de medidores (um medidor por urgência, cada um contra o seu próprio total).
// Cor de status acompanhada de ícone e rótulo; o número exato fica sempre visível.
export default function MeterList({ items }: { items: MeterItem[] }) {
  return (
    <View style={styles.list}>
      {items.map((item) => {
        const pct = item.total > 0 ? Math.round((item.done / item.total) * 100) : 0;
        return (
          <View key={item.id} style={styles.item}>
            <View style={styles.topRow}>
              <View style={[styles.iconChip, { backgroundColor: `${item.color}1A` }]}>
                <Ionicons name={item.icon} size={16} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.hint}>{item.hint}</Text>
              </View>
              <View style={styles.valueGroup}>
                <Text style={[styles.pct, { color: item.color }]}>{pct}%</Text>
                <Text style={styles.count}>
                  {item.done}/{item.total} concluídas
                </Text>
              </View>
            </View>

            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${pct}%`, backgroundColor: item.color },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  item: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: chartColors.track,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: chartColors.ink,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: chartColors.axis,
    marginTop: 1,
  },
  valueGroup: {
    alignItems: 'flex-end',
  },
  pct: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  count: {
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: chartColors.axis,
    marginTop: 1,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: chartColors.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
