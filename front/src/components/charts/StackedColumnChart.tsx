import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../theme';
import { chartColors } from './palette';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

export interface StackedColumnItem {
  id: string;
  label: string;
  concluidas: number;
  pendentes: number;
}

const PLOT_HEIGHT = 140;
const AXIS_WIDTH = 26;
const SEGMENT_GAP = 2;
// Espaço reservado acima da área de plotagem para os rótulos de total não
// colidirem com a legenda quando a coluna chega ao topo do gráfico.
const LABEL_PAD = 20;

const GRAD_CONCLUIDA = ['#22C55E', '#16A34A'] as const;
const GRAD_PENDENTE = ['#EF4444', '#C61010'] as const;

// Modelo 2 — Colunas empilhadas (duas séries, um único eixo y que começa em 0).
// Mostra volume total e a proporção concluída/pendente por vistoriador.
// Toque numa coluna para ver os números exatos (camada de "hover" no mobile).
export default function StackedColumnChart({ items }: { items: StackedColumnItem[] }) {
  const { colors: t } = useTheme();
  const styles = makeStyles(t);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const max = Math.max(1, ...items.map((i) => i.concluidas + i.pendentes));
  const ticks = [max, Math.round(max / 2), 0];
  const selected = items.find((i) => i.id === selectedId) ?? null;

  function LegendChip({ color, label }: { color: string; label: string }) {
    return (
      <View style={styles.legendChip}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text style={styles.legendText}>{label}</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Legenda obrigatória para 2+ séries */}
      <View style={styles.legend}>
        <LegendChip color={chartColors.concluida} label="Concluídas" />
        <LegendChip color={chartColors.pendente} label="Pendentes" />
      </View>

      <View style={styles.chartRow}>
        {/* Eixo y */}
        <View style={[styles.axis, { height: PLOT_HEIGHT + LABEL_PAD }]}>
          {ticks.map((t, idx) => (
            <Text
              key={`${t}-${idx}`}
              style={[
                styles.tickLabel,
                { top: LABEL_PAD + (1 - t / max) * PLOT_HEIGHT - 6 },
              ]}
            >
              {t}
            </Text>
          ))}
        </View>

        {/* Área de plotagem (com folga superior p/ os rótulos de total) */}
        <View style={{ flex: 1 }}>
          <View style={{ height: LABEL_PAD }} />
          <View style={{ position: 'relative', height: PLOT_HEIGHT }}>
            {ticks.map((tick, idx) => (
              <View
                key={`grid-${idx}`}
                pointerEvents="none"
                style={[
                  styles.gridLine,
                  { top: (1 - tick / max) * PLOT_HEIGHT },
                ]}
              />
            ))}

            <View style={styles.columnsRow}>
              {items.map((item) => {
                const total = item.concluidas + item.pendentes;
                const hConc = (item.concluidas / max) * PLOT_HEIGHT;
                const hPend = (item.pendentes / max) * PLOT_HEIGHT;
                const isSelected = selectedId === item.id;

                return (
                  <Pressable
                    key={item.id}
                    style={styles.column}
                    onPress={() => setSelectedId(isSelected ? null : item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.label}: ${item.concluidas} concluídas, ${item.pendentes} pendentes`}
                  >
                    <Text style={[styles.totalLabel, isSelected && styles.totalLabelActive]}>
                      {total}
                    </Text>

                    <View style={[styles.stackTrack, isSelected && styles.stackTrackSelected]}>
                      {item.pendentes > 0 && (
                        <LinearGradient
                          colors={GRAD_PENDENTE}
                          start={{ x: 0, y: 1 }}
                          end={{ x: 0, y: 0 }}
                          style={[
                            styles.segment,
                            styles.segmentTop,
                            {
                              height: Math.max(hPend, 2),
                              marginBottom: item.concluidas > 0 ? SEGMENT_GAP : 0,
                            },
                          ]}
                        />
                      )}
                      {item.concluidas > 0 && (
                        <LinearGradient
                          colors={GRAD_CONCLUIDA}
                          start={{ x: 0, y: 1 }}
                          end={{ x: 0, y: 0 }}
                          style={[
                            styles.segment,
                            item.pendentes === 0 && styles.segmentTop,
                            {
                              height: Math.max(hConc, 2),
                            },
                          ]}
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* Rótulos do eixo x */}
      <View style={styles.xLabelsRow}>
        <View style={{ width: AXIS_WIDTH }} />
        <View style={styles.xLabels}>
          {items.map((item) => (
            <Text
              key={item.id}
              style={[styles.xLabel, selectedId === item.id && styles.xLabelActive]}
              numberOfLines={1}
            >
              {item.label.split(' ')[0]}
            </Text>
          ))}
        </View>
      </View>

      {/* Detalhe da coluna selecionada (valores exatos) */}
      <View style={styles.detail}>
        {selected ? (
          <>
            <Text style={styles.detailText}>
              <Text style={styles.detailName}>{selected.label}: </Text>
              {selected.concluidas} concluídas • {selected.pendentes} pendentes
            </Text>
          </>
        ) : (
          <View style={styles.detailHintRow}>
            <Ionicons name="finger-print-outline" size={13} color={t.textMuted} />
            <Text style={styles.detailHint}>Toque em uma coluna para ver os números exatos</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  legend: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.chipBackground,
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: t.textSecondary,
  },
  chartRow: {
    flexDirection: 'row',
  },
  axis: {
    width: AXIS_WIDTH,
    position: 'relative',
  },
  tickLabel: {
    position: 'absolute',
    right: 6,
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: t.textMuted,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.cardBorder,
  },
  columnsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: PLOT_HEIGHT,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: PLOT_HEIGHT,
  },
  totalLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: t.textSecondary,
    marginBottom: 4,
  },
  totalLabelActive: {
    color: t.text,
    fontSize: 12,
  },
  stackTrack: {
    width: '66%',
    maxWidth: 36,
    alignItems: 'center',
  },
  stackTrackSelected: {
    opacity: 0.92,
  },
  segment: {
    width: '100%',
  },
  segmentTop: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  xLabelsRow: {
    flexDirection: 'row',
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.cardBorder,
    paddingTop: 4,
  },
  xLabels: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  xLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    color: t.textMuted,
  },
  xLabelActive: {
    color: t.text,
    fontFamily: fonts.bold,
  },
  detail: {
    marginTop: 14,
    backgroundColor: t.chipBackground,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: t.cardBorder,
  },
  detailText: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: t.textSecondary,
  },
  detailName: {
    fontFamily: fonts.bold,
    color: t.text,
  },
  detailHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  detailHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: t.textMuted,
  },
});
