import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { fonts } from '../theme';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { ArquivoAnexo } from '../services/demandaService';
import RelatorioVistoriaSection from './RelatorioVistoriaSection';

interface PlanilhaPreenchimentoModalProps {
  visible: boolean;
  arquivo: ArquivoAnexo | null;
  empresaNome?: string;
  demandaTitulo?: string;
  imovelReferencia?: string;
  responsavel?: string;
  onClose: () => void;
  onSucessoPreenchimento?: (arquivo: ArquivoAnexo, campos: Record<string, any>) => void;
}

export default function PlanilhaPreenchimentoModal({
  visible,
  arquivo,
  empresaNome = 'Avalliar',
  demandaTitulo = 'Vistoria Técnica',
  imovelReferencia = 'Imóvel Avaliado',
  responsavel = 'Linux da Silva',
  onClose,
  onSucessoPreenchimento,
}: PlanilhaPreenchimentoModalProps) {
  const { colors: t } = useTheme();
  const styles = makeStyles(t);

  if (!arquivo) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalCard}>
          {/* Header do Modal */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.tagHeaderRow}>
                <View style={styles.templateBadge}>
                  <MaterialCommunityIcons
                    name="microsoft-excel"
                    size={14}
                    color="#15803D"
                  />
                  <Text style={styles.templateBadgeText}>
                    Relatório de Vistoria
                  </Text>
                </View>
              </View>

              <Text style={styles.modalTitle} numberOfLines={1}>
                {arquivo.nome}
              </Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                Empresa: <Text style={{ fontFamily: fonts.bold }}>{empresaNome}</Text>
              </Text>
            </View>

            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={t.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            <RelatorioVistoriaSection
              empresaId={arquivo.empresaId}
              empresaNome={empresaNome || arquivo.empresaNome}
              demandaId={arquivo.tarefaId}
              demandaTitulo={demandaTitulo || arquivo.tarefaTitulo}
              imovelReferencia={imovelReferencia}
              responsavelPadrao={responsavel || arquivo.autor}
              arquivoAlvo={arquivo}
              onSucessoGeracao={onSucessoPreenchimento}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (t: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    modalCard: {
      backgroundColor: t.modalBackground,
      borderRadius: 16,
      width: '100%',
      maxWidth: 600,
      height: Platform.OS === 'web' ? '88%' : '90%',
      maxHeight: '92%',
      padding: 16,
      flexDirection: 'column',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderBottomWidth: 1,
      borderBottomColor: t.divider,
      paddingBottom: 12,
      marginBottom: 12,
    },
    tagHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    templateBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: '#DCFCE7',
    },
    templateBadgeText: {
      fontFamily: fonts.semibold,
      fontSize: 11,
      color: '#15803D',
    },
    modalTitle: {
      fontFamily: fonts.bold,
      fontSize: 15,
      color: t.text,
    },
    modalSubtitle: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: t.textMuted,
      marginTop: 2,
    },
    closeBtn: {
      padding: 4,
    },
    formScroll: {
      flex: 1,
      width: '100%',
    },
  });
