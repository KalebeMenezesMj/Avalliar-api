import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../theme';

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

const INK = '#0F172A';
const MUTED = '#64748B';

// Cor da taxa: verde quando concluída, azul na metade, vermelho abaixo disso.
const corDaTaxa = (taxa: number) => (taxa === 100 ? '#16A34A' : taxa >= 50 ? '#2563EB' : '#C61010');

// Relatório por empresa: um bloco por empresa com os números e o progresso.
export default function RelatorioEmpresas({ items, onPressEmpresa }: RelatorioEmpresasProps) {
  const totalGeral = items.reduce((acc, i) => acc + i.total, 0);
  const concluidasGeral = items.reduce((acc, i) => acc + i.concluidas, 0);
  const arquivosGeral = items.reduce((acc, i) => acc + i.totalArquivos, 0);

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
            style={({ pressed }) => [styles.item, pressed && { backgroundColor: '#F1F5F9' }]}
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

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: INK,
  },
  summaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: MUTED,
    marginTop: 1,
  },
  item: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: INK,
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
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: INK,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 9.5,
    color: MUTED,
    marginTop: 1,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
