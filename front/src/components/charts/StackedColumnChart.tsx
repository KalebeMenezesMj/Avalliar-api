import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { fonts } from '../../theme';
import { chartColors } from './palette';

export interface StackedColumnItem {
  id: string;
  label: string;
  concluidas: number;
  pendentes: number;
}

const PLOT_HEIGHT = 140;
const AXIS_WIDTH = 26;
const SEGMENT_GAP = 2;

// Modelo 2 — Colunas empilhadas (duas séries, um único eixo y que começa em 0).
// Mostra volume total e a proporção concluída/pendente por vistoriador.
// Toque numa coluna para ver os números exatos (camada de "hover" no mobile).
export default function StackedColumnChart({ items }: { items: StackedColumnItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const max = Math.max(1, ...items.map((i) => i.concluidas + i.pendentes));
  const ticks = [max, Math.round(max / 2), 0];
  const selected = items.find((i) => i.id === selectedId) ?? null;

  return (
    <View>
      {/* Legenda obrigatória para 2+ séries */}
      <View style={styles.legend}>
        <LegendItem color={chartColors.concluida} label="Concluídas" />
        <LegendItem color={chartColors.pendente} label="Pendentes" />
      </View>

      <View style={styles.chartRow}>
        {/* Eixo y */}
        <View style={[styles.axis, { height: PLOT_HEIGHT }]}>
          {ticks.map((t, idx) => (
            <Text
              key={`${t}-${idx}`}
              style={[
                styles.tickLabel,
                { top: (1 - t / max) * PLOT_HEIGHT - 6 },
              ]}
            >
              {t}
            </Text>
          ))}
        </View>

        {/* Área de plotagem */}
        <View style={{ flex: 1, height: PLOT_HEIGHT }}>
          {ticks.map((t, idx) => (
            <View
              key={`grid-${idx}`}
              pointerEvents="none"
              style={[
                styles.gridLine,
                { top: (1 - t / max) * PLOT_HEIGHT },
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
                  <Text style={styles.totalLabel}>{total}</Text>

                  <View
                    style={[
                      styles.stack,
                      isSelected && styles.stackSelected,
                    ]}
                  >
                    {item.pendentes > 0 && (
                      <View
                        style={[
                          styles.segment,
                          styles.segmentTop,
                          {
                            height: Math.max(hPend, 2),
                            backgroundColor: chartColors.pendente,
                            marginBottom: item.concluidas > 0 ? SEGMENT_GAP : 0,
                          },
                        ]}
                      />
                    )}
                    {item.concluidas > 0 && (
                      <View
                        style={[
                          styles.segment,
                          item.pendentes === 0 && styles.segmentTop,
                          {
                            height: Math.max(hConc, 2),
                            backgroundColor: chartColors.concluida,
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
          <Text style={styles.detailText}>
            <Text style={styles.detailName}>{selected.label}: </Text>
            {selected.concluidas} concluídas • {selected.pendentes} pendentes
          </Text>
        ) : (
          <Text style={styles.detailHint}>Toque em uma coluna para ver os números exatos</Text>
        )}
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    color: chartColors.inkSecondary,
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
    fontFamily: fonts.regular,
    fontSize: 10,
    color: chartColors.axis,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: chartColors.grid,
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
    fontSize: 10.5,
    color: chartColors.ink,
    marginBottom: 3,
  },
  stack: {
    width: '62%',
    maxWidth: 34,
    borderRadius: 6,
    padding: 2,
    backgroundColor: 'transparent',
  },
  stackSelected: {
    backgroundColor: '#F1F5F9',
  },
  segment: {
    width: '100%',
  },
  segmentTop: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  xLabelsRow: {
    flexDirection: 'row',
    marginTop: 6,
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
    color: chartColors.axis,
  },
  xLabelActive: {
    color: chartColors.ink,
    fontFamily: fonts.bold,
  },
  detail: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: chartColors.track,
  },
  detailText: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: chartColors.inkSecondary,
  },
  detailName: {
    fontFamily: fonts.bold,
    color: chartColors.ink,
  },
  detailHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: chartColors.axis,
  },
});
