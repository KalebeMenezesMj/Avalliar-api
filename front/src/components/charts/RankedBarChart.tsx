import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { fonts } from '../../theme';
import { chartColors } from './palette';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

export interface RankedBarItem {
  id: string;
  label: string;
  value: number; // 0 a 100
  sub: string;
  onPress?: () => void;
}

// Modelo 1 — Barras horizontais ranqueadas (uma série, eixo único em 0–100%).
// Ideal para comparar valores entre entidades com nomes longos.
export default function RankedBarChart({ items }: { items: RankedBarItem[] }) {
  const { colors: t } = useTheme();
  const styles = makeStyles(t);
  const ranked = [...items].sort((a, b) => b.value - a.value);

  return (
    <View style={styles.list}>
      {ranked.map((item, index) => {
        const pct = Math.min(100, Math.max(0, item.value));
        const content = (
          <>
            <View style={styles.topRow}>
              <View style={styles.labelGroup}>
                <Text style={styles.rank}>{index + 1}</Text>
                <Text style={styles.label} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
              <Text style={styles.value}>{pct}%</Text>
            </View>

            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${pct}%`,
                    backgroundColor: chartColors.taxa,
                  },
                ]}
              />
            </View>

            <Text style={styles.sub}>{item.sub}</Text>
          </>
        );

        return item.onPress ? (
          <Pressable
            key={item.id}
            onPress={item.onPress}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            accessibilityRole="button"
          >
            {content}
          </Pressable>
        ) : (
          <View key={item.id} style={styles.item}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  list: {
    gap: 8,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: t.chipBackground,
    borderWidth: 1,
    borderColor: t.cardBorder,
    gap: 6,
  },
  itemPressed: {
    backgroundColor: t.pressedSurface,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rank: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    color: t.textMuted,
    width: 14,
    textAlign: 'center',
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: t.text,
    flex: 1,
  },
  value: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: t.text,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: t.cardBorder,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: t.textMuted,
  },
});
