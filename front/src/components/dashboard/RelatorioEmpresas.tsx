import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../theme';
import { useTheme, ThemeColors } from '../../context/ThemeContext';

export interface RelatorioEmpresaItem {
  id: string;
  nome: string;
  total: number;
  concluidas: number;
  pendentes: number;
  totalArquivos: number;
  taxaConclusao: number;
}

interface RelatorioEmpresasProps {
  items: RelatorioEmpresaItem[];
  onPressEmpresa?: (item: RelatorioEmpresaItem) => void;
}

// Cor da taxa: verde quando concluída, azul na metade, vermelho abaixo disso.
const corDaTaxa = (taxa: number) => (taxa === 100 ? '#16A34A' : taxa >= 50 ? '#2563EB' : '#C61010');

// Relatório por empresa: um bloco por empresa com os números e o progresso.
export default function RelatorioEmpresas({ items, onPressEmpresa }: RelatorioEmpresasProps) {
  const { colors: t } = useTheme();
  const styles = makeStyles(t);
  const totalGeral = items.reduce((acc, i) => acc + i.total, 0);
  const concluidasGeral = items.reduce((acc, i) => acc + i.concluidas, 0);
  const arquivosGeral = items.reduce((acc, i) => acc + i.totalArquivos, 0);

  function SummaryItem({ value, label }: { value: number; label: string }) {
    return (
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
    );
  }

  function Stat({ value, label }: { value: number; label: string }) {
    return (
      <View style={styles.statBox}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.summary}>
        <SummaryItem value={items.length} label="Empresas" />
        <SummaryItem value={totalGeral} label="Demandas" />
        <SummaryItem value={concluidasGeral} label="Concluídas" />
        <SummaryItem value={arquivosGeral} label="Arquivos" />
      </View>

      {items.map((emp) => {
        const cor = corDaTaxa(emp.taxaConclusao);
        const conteudo = (
          <>
            <View style={styles.topRow}>
              <Text style={styles.nome} numberOfLines={1}>
                {emp.nome}
              </Text>
              <Text style={[styles.taxa, { color: cor }]}>{emp.taxaConclusao}%</Text>
              {onPressEmpresa && <Ionicons name="chevron-forward" size={16} color="#94A3B8" />}
            </View>

            <View style={styles.stats}>
              <Stat value={emp.total} label="Total" />
              <Stat value={emp.concluidas} label="Concluídas" />
              <Stat value={emp.pendentes} label="Pendentes" />
              <Stat value={emp.totalArquivos} label="Arquivos" />
            </View>

            <View style={styles.track}>
              <View style={[styles.fill, { width: `${emp.taxaConclusao}%`, backgroundColor: cor }]} />
            </View>
          </>
        );

        return onPressEmpresa ? (
          <Pressable
            key={emp.id}
            style={({ pressed }) => [styles.item, pressed && { backgroundColor: t.pressedSurface }]}
            onPress={() => onPressEmpresa(emp)}
            accessibilityRole="button"
          >
            {conteudo}
          </Pressable>
        ) : (
          <View key={emp.id} style={styles.item}>
            {conteudo}
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  summary: {
    flexDirection: 'row',
    backgroundColor: t.chipBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.cardBorder,
    paddingVertical: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: t.text,
  },
  summaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: t.textMuted,
    marginTop: 1,
  },
  item: {
    backgroundColor: t.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 12,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nome: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: t.text,
  },
  taxa: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  stats: {
    flexDirection: 'row',
    gap: 6,
  },
  statBox: {
    flex: 1,
    backgroundColor: t.chipBackground,
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: t.text,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 9.5,
    color: t.textMuted,
    marginTop: 1,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: t.cardBorder,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
