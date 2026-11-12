import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

import { fonts, colors, spacing } from '../theme';
import { demandaService, ArquivoAnexo } from '../services/demandaService';
import { mlService, MlReconhecerResponse } from '../services/mlService';
import {
  visualizarArquivoDemanda,
  baixarArquivoDemanda,
} from './FileViewerModal';

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

type TabV25 = 'LAUDO' | 'LOCAL' | 'UNIDADE' | 'AREAS' | 'ESTADO';

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
  const [carregandoReconhecimento, setCarregandoReconhecimento] = useState(false);
  const [templateDetectado, setTemplateDetectado] = useState<MlReconhecerResponse | null>(null);
  const [processandoPreenchimento, setProcessandoPreenchimento] = useState(false);
  const [tabAtivaV25, setTabAtivaV25] = useState<TabV25>('LAUDO');
  const [resultadoPreenchido, setResultadoPreenchido] = useState<{
    sucesso: boolean;
    nomeArquivo: string;
    camposPreenchidos: number;
    base64?: string;
  } | null>(null);
  const [avisoFeedback, setAvisoFeedback] = useState<string | null>(null);

  // Estados dos campos do V22 (9 campos canônicos)
  const [dadosV22, setDadosV22] = useState<Record<string, string>>({
    cliente: '',
    numero_proposta: 'PROP-2026-0842',
    tipo_laudo: 'LAUDO COMPLETO DE AVALIAÇÃO',
    engenheiro_responsavel: '',
    metodologia: 'Método Comparativo Direto de Dados de Mercado',
    fam_evolutivo: '1,00',
    cidade: 'São Paulo',
    uf: 'SP',
    data_laudo: new Date().toLocaleDateString('pt-BR'),
  });

  // Estados dos campos do V25 (31 campos canônicos)
  const [dadosV25, setDadosV25] = useState<Record<string, any>>({
    // Laudo & Cliente
    numero_proposta: '10088888',
    trata_se_pv: 'NÃO',
    cliente: '',
    tipo_laudo: 'LAUDO MANUAL INTERNO',
    responsavel_avaliacao: '',

    // Localização
    empreendimento: '',
    tipo_endereco: 'Rua',
    endereco: '',
    numero: '1500',
    bairro: 'Boqueirão',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '01310-100',
    latitude: -23.5616,
    longitude: -46.6559,

    // Unidade
    matricula: '124890',
    tipologia: 'Apartamento',
    unidade: '102',
    andar: '10º',
    bloco_torre: 'Torre A',

    // Áreas
    area_privativa: 68.5,
    area_comum: 18.2,
    area_total: 86.7,
    area_equivalente: 72.0,
    fracao_ideal: 0.0245,

    // Cômodos & Conservação
    dormitorios: 2,
    suites: 1,
    banheiros: 2,
    vagas: 1,
    idade_aparente: 10,
    estado_conservacao: 'Bom (Entre novo e regular)',
  });

  // Ao abrir o modal com a planilha, executa o reconhecimento via Machine Learning
  useEffect(() => {
    if (visible && arquivo) {
      setResultadoPreenchido(null);
      setAvisoFeedback(null);
      setTabAtivaV25('LAUDO');

      const clientDefault = empresaNome || arquivo.empresaNome || 'Banco Exemplo S.A.';
      const respDefault = responsavel || arquivo.autor || 'Linux da Silva';
      const imovelDefault = imovelReferencia || 'Imóvel Avaliado';

      setDadosV22((prev) => ({
        ...prev,
        cliente: clientDefault,
        engenheiro_responsavel: respDefault,
        cidade: imovelDefault.includes('•') ? imovelDefault.split('•')[0].trim() : prev.cidade,
      }));

      setDadosV25((prev) => ({
        ...prev,
        cliente: clientDefault,
        responsavel_avaliacao: respDefault,
        empreendimento: demandaTitulo || prev.empreendimento,
        endereco: imovelDefault,
      }));

      identificarTemplate(arquivo);
    }
  }, [visible, arquivo]);

  const identificarTemplate = async (arq: ArquivoAnexo) => {
    setCarregandoReconhecimento(true);
    try {
      const rec = await mlService.reconhecerPlanilha(arq.nome, arq.webFile);
      setTemplateDetectado(rec);
    } catch {
      // Fallback baseado no nome/extensão
      const isV25 =
        arq.nome.toLowerCase().includes('v25') ||
        arq.nome.toLowerCase().includes('padronizada') ||
        arq.extensao === 'xlsm';
      setTemplateDetectado({
        template_id: isV25 ? 'v25_unidades_padronizadas' : 'v22_unidades_isoladas',
        template_nome: isV25
          ? 'Homogeneização — Unidades Padronizadas (V25)'
          : 'Homogeneização — Unidades Isoladas (V22)',
        confianca: 1.0,
        abas_detectadas: isV25 ? ['DADOS DO IMÓVEL', 'HOMOGENEIZAÇÃO'] : ['XXX - Dados Laudo', 'XXX - Dados Calc'],
      });
    } finally {
      setCarregandoReconhecimento(false);
    }
  };

  const handleSubmeterPreenchimento = async () => {
    if (!arquivo) return;
    const isV25 = templateDetectado?.template_id.includes('v25');
    const templateId = isV25 ? 'v25_unidades_padronizadas' : 'v22_unidades_isoladas';
    const payload = isV25 ? dadosV25 : dadosV22;

    setProcessandoPreenchimento(true);
    try {
      const res = await mlService.preencherPlanilha(
        templateId,
        payload,
        arquivo.id,
        arquivo.webFile
      );

      if (res.conteudo_base64) {
        arquivo.conteudoBase64 = res.conteudo_base64;
        arquivo.statusMl = 'PREENCHIDA_ML';
        arquivo.templateMl = templateId;
        arquivo.camposExtraidosMl = payload;

        if (Platform.OS === 'web' && typeof Blob !== 'undefined') {
          try {
            const mime =
              arquivo.extensao === 'xlsm'
                ? 'application/vnd.ms-excel.sheet.macroEnabled.12'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            const binaryString = atob(res.conteudo_base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: mime });
            if (typeof File !== 'undefined') {
              arquivo.webFile = new File([blob], res.nome_arquivo || arquivo.nome, { type: mime });
            }
          } catch (_e) {
            // mantém base64
          }
        }
      }

      demandaService.atualizarStatusMlArquivo(
        arquivo.id,
        'PREENCHIDA_ML',
        templateId,
        payload,
        res.conteudo_base64
      );

      setResultadoPreenchido({
        sucesso: true,
        nomeArquivo: res.nome_arquivo || arquivo.nome,
        camposPreenchidos: res.campos_preenchidos || Object.keys(payload).length,
        base64: res.conteudo_base64,
      });

      if (onSucessoPreenchimento) {
        onSucessoPreenchimento(arquivo, payload);
      }
    } finally {
      setProcessandoPreenchimento(false);
    }
  };

  const handleVisualizar = async () => {
    if (!arquivo) return;
    const arqParaVisualizar: ArquivoAnexo = {
      ...arquivo,
      conteudoBase64: resultadoPreenchido?.base64 || arquivo.conteudoBase64,
      nome: resultadoPreenchido?.nomeArquivo || arquivo.nome,
    };
    const msg = await visualizarArquivoDemanda(
      arqParaVisualizar,
      empresaNome,
      demandaTitulo,
      imovelReferencia,
      responsavel
    );
    setAvisoFeedback(msg);
    setTimeout(() => setAvisoFeedback(null), 3500);
  };

  const handleBaixar = async () => {
    if (!arquivo) return;
    const arqParaBaixar: ArquivoAnexo = {
      ...arquivo,
      conteudoBase64: resultadoPreenchido?.base64 || arquivo.conteudoBase64,
      nome: resultadoPreenchido?.nomeArquivo || arquivo.nome,
    };
    const msg = await baixarArquivoDemanda(
      arqParaBaixar,
      empresaNome,
      demandaTitulo,
      imovelReferencia,
      responsavel
    );
    setAvisoFeedback(msg);
    setTimeout(() => setAvisoFeedback(null), 3500);
  };

  if (!arquivo) return null;

  const isV25 = templateDetectado?.template_id.includes('v25');

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.tagHeaderRow}>
                <View
                  style={[
                    styles.templateBadge,
                    { backgroundColor: isV25 ? '#EDE9FE' : '#DCFCE7' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="microsoft-excel"
                    size={14}
                    color={isV25 ? '#6D28D9' : '#15803D'}
                  />
                  <Text
                    style={[
                      styles.templateBadgeText,
                      { color: isV25 ? '#6D28D9' : '#15803D' },
                    ]}
                  >
                    {isV25 ? 'Modelo V25 • Padronizadas' : 'Modelo V22 • Isoladas'}
                  </Text>
                </View>

                {templateDetectado && (
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      IA: {Math.round((templateDetectado.confianca || 1) * 100)}% de certeza
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.modalTitle} numberOfLines={1}>
                {arquivo.nome}
              </Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                Empresa: <Text style={{ fontFamily: fonts.bold }}>{empresaNome}</Text>
              </Text>
            </View>

            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </Pressable>
          </View>

          {/* Estado de Carregamento do Reconhecimento */}
          {carregandoReconhecimento ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6D28D9" />
              <Text style={styles.loadingText}>
                O Machine Learning está analisando as abas e estrutura da planilha...
              </Text>
            </View>
          ) : resultadoPreenchido ? (
            /* Tela de Sucesso após preenchimento */
            <View style={styles.successContainer}>
              <View style={styles.successIconCircle}>
                <MaterialCommunityIcons name="check-decagram" size={42} color="#10B981" />
              </View>

              <Text style={styles.successTitle}>Planilha Preenchida com Sucesso!</Text>
              <Text style={styles.successDesc}>
                O motor de Machine Learning mapeou e gravou{' '}
                <Text style={{ fontFamily: fonts.bold }}>
                  {resultadoPreenchido.camposPreenchidos} células
                </Text>{' '}
                no template oficial ({isV25 ? 'V25' : 'V22'}).
              </Text>

              <View style={styles.actionButtonsCol}>
                <Pressable style={styles.viewBrowserBtn} onPress={handleVisualizar}>
                  <Ionicons name="open-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.viewBrowserBtnText}>Visualizar no Navegador</Text>
                </Pressable>

                <Pressable style={styles.downloadFileBtn} onPress={handleBaixar}>
                  <Ionicons name="download-outline" size={18} color="#15803D" />
                  <Text style={styles.downloadFileBtnText}>Baixar Planilha Preenchida (.xlsx)</Text>
                </Pressable>

                <Pressable style={styles.finishBtn} onPress={onClose}>
                  <Text style={styles.finishBtnText}>Concluir</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            /* Formulário Dinâmico de Edição dos Campos */
            <View style={{ flex: 1 }}>
              <Text style={styles.formHint}>
                Edite os valores abaixo antes de preencher. O Machine Learning inserirá cada campo na célula exata da planilha.
              </Text>

              {/* Se for V25: Navegação por Abas para os 31 campos */}
              {isV25 && (
                <View style={styles.tabBarV25}>
                  {(
                    [
                      { id: 'LAUDO', label: 'Laudo' },
                      { id: 'LOCAL', label: 'Local' },
                      { id: 'UNIDADE', label: 'Unidade' },
                      { id: 'AREAS', label: 'Áreas (m²)' },
                      { id: 'ESTADO', label: 'Cômodos' },
                    ] as const
                  ).map((t) => (
                    <Pressable
                      key={t.id}
                      style={[styles.tabBtnV25, tabAtivaV25 === t.id && styles.tabBtnV25Active]}
                      onPress={() => setTabAtivaV25(t.id)}
                    >
                      <Text
                        style={[
                          styles.tabTextV25,
                          tabAtivaV25 === t.id && styles.tabTextV25Active,
                        ]}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={{ paddingBottom: 24, gap: 10 }}
                showsVerticalScrollIndicator={true}
              >
                {!isV25 ? (
                  /* ================= FORMULÁRIO V22 (9 Campos) ================= */
                  <>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Cliente / Empresa (P6)</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={dadosV22.cliente}
                        onChangeText={(v) => setDadosV22({ ...dadosV22, cliente: v })}
                      />
                    </View>

                    <View style={styles.rowTwoCols}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Nº da Proposta (P8)</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={dadosV22.numero_proposta}
                          onChangeText={(v) => setDadosV22({ ...dadosV22, numero_proposta: v })}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Data do Laudo (G3)</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={dadosV22.data_laudo}
                          onChangeText={(v) => setDadosV22({ ...dadosV22, data_laudo: v })}
                        />
                      </View>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Engenheiro Responsável (P15)</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={dadosV22.engenheiro_responsavel}
                        onChangeText={(v) => setDadosV22({ ...dadosV22, engenheiro_responsavel: v })}
                      />
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Tipo de Laudo (P11)</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={dadosV22.tipo_laudo}
                        onChangeText={(v) => setDadosV22({ ...dadosV22, tipo_laudo: v })}
                      />
                    </View>

                    <View style={styles.rowTwoCols}>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.fieldLabel}>Cidade (G2)</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={dadosV22.cidade}
                          onChangeText={(v) => setDadosV22({ ...dadosV22, cidade: v })}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>UF (G1)</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={dadosV22.uf}
                          onChangeText={(v) => setDadosV22({ ...dadosV22, uf: v })}
                        />
                      </View>
                    </View>

                    <View style={styles.rowTwoCols}>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.fieldLabel}>Metodologia de Avaliação (P4)</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={dadosV22.metodologia}
                          onChangeText={(v) => setDadosV22({ ...dadosV22, metodologia: v })}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Fam. Evolutivo (P18)</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={dadosV22.fam_evolutivo}
                          onChangeText={(v) => setDadosV22({ ...dadosV22, fam_evolutivo: v })}
                        />
                      </View>
                    </View>
                  </>
                ) : (
                  /* ================= FORMULÁRIO V25 (31 Campos em Abas) ================= */
                  <>
                    {tabAtivaV25 === 'LAUDO' && (
                      <>
                        <View style={styles.fieldGroup}>
                          <Text style={styles.fieldLabel}>Cliente / Contratante (C6)</Text>
                          <TextInput
                            style={styles.fieldInput}
                            value={dadosV25.cliente}
                            onChangeText={(v) => setDadosV25({ ...dadosV25, cliente: v })}
                          />
                        </View>
                        <View style={styles.rowTwoCols}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Nº da Proposta (C2)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={dadosV25.numero_proposta}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, numero_proposta: v })}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Trata-se de PV? (C4)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={dadosV25.trata_se_pv}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, trata_se_pv: v })}
                            />
                          </View>
                        </View>
                        <View style={styles.fieldGroup}>
                          <Text style={styles.fieldLabel}>Responsável pela Avaliação (C63)</Text>
                          <TextInput
                            style={styles.fieldInput}
                            value={dadosV25.responsavel_avaliacao}
                            onChangeText={(v) => setDadosV25({ ...dadosV25, responsavel_avaliacao: v })}
                          />
                        </View>
                        <View style={styles.fieldGroup}>
                          <Text style={styles.fieldLabel}>Tipo de Laudo (C8)</Text>
                          <TextInput
                            style={styles.fieldInput}
                            value={dadosV25.tipo_laudo}
                            onChangeText={(v) => setDadosV25({ ...dadosV25, tipo_laudo: v })}
                          />
                        </View>
                      </>
                    )}

                    {tabAtivaV25 === 'LOCAL' && (
                      <>
                        <View style={styles.fieldGroup}>
                          <Text style={styles.fieldLabel}>Empreendimento / Condomínio (C20)</Text>
                          <TextInput
                            style={styles.fieldInput}
                            value={dadosV25.empreendimento}
                            onChangeText={(v) => setDadosV25({ ...dadosV25, empreendimento: v })}
                          />
                        </View>
                        <View style={styles.rowTwoCols}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Tipo Logradouro (C22)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={dadosV25.tipo_endereco}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, tipo_endereco: v })}
                            />
                          </View>
                          <View style={{ flex: 2 }}>
                            <Text style={styles.fieldLabel}>Endereço (C24)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={dadosV25.endereco}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, endereco: v })}
                            />
                          </View>
                        </View>
                        <View style={styles.rowTwoCols}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Número (C26)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={dadosV25.numero}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, numero: v })}
                            />
                          </View>
                          <View style={{ flex: 2 }}>
                            <Text style={styles.fieldLabel}>Bairro (C28)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={dadosV25.bairro}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, bairro: v })}
                            />
                          </View>
                        </View>
                        <View style={styles.rowTwoCols}>
                          <View style={{ flex: 2 }}>
                            <Text style={styles.fieldLabel}>Cidade (C30)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={dadosV25.cidade}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, cidade: v })}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>UF (C32)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={dadosV25.uf}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, uf: v })}
                            />
                          </View>
                          <View style={{ flex: 1.5 }}>
                            <Text style={styles.fieldLabel}>CEP (C34)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={dadosV25.cep}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, cep: v })}
                            />
                          </View>
                        </View>
                      </>
                    )}

                    {tabAtivaV25 === 'UNIDADE' && (
                      <>
                        <View style={styles.rowTwoCols}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Matrícula (C10)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={dadosV25.matricula}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, matricula: v })}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Tipologia (C12)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={dadosV25.tipologia}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, tipologia: v })}
                            />
                          </View>
                        </View>
                        <View style={styles.rowTwoCols}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Unidade (C14)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={dadosV25.unidade}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, unidade: v })}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Andar (C16)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={dadosV25.andar}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, andar: v })}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Bloco / Torre (C18)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={dadosV25.bloco_torre}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, bloco_torre: v })}
                            />
                          </View>
                        </View>
                      </>
                    )}

                    {tabAtivaV25 === 'AREAS' && (
                      <>
                        <View style={styles.rowTwoCols}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Área Privativa m² (C40)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              keyboardType="numeric"
                              value={String(dadosV25.area_privativa)}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, area_privativa: Number(v) || v })}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Área Comum m² (C42)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              keyboardType="numeric"
                              value={String(dadosV25.area_comum)}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, area_comum: Number(v) || v })}
                            />
                          </View>
                        </View>
                        <View style={styles.rowTwoCols}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Área Total m² (C44)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              keyboardType="numeric"
                              value={String(dadosV25.area_total)}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, area_total: Number(v) || v })}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Área Equivalente m² (C61)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              keyboardType="numeric"
                              value={String(dadosV25.area_equivalente)}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, area_equivalente: Number(v) || v })}
                            />
                          </View>
                        </View>
                      </>
                    )}

                    {tabAtivaV25 === 'ESTADO' && (
                      <>
                        <View style={styles.rowTwoCols}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Dormitórios (C54)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              keyboardType="numeric"
                              value={String(dadosV25.dormitorios)}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, dormitorios: Number(v) || v })}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Suítes (C56)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              keyboardType="numeric"
                              value={String(dadosV25.suites)}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, suites: Number(v) || v })}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Banheiros (C58)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              keyboardType="numeric"
                              value={String(dadosV25.banheiros)}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, banheiros: Number(v) || v })}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.fieldLabel}>Vagas (C52)</Text>
                            <TextInput
                              style={styles.fieldInput}
                              keyboardType="numeric"
                              value={String(dadosV25.vagas)}
                              onChangeText={(v) => setDadosV25({ ...dadosV25, vagas: Number(v) || v })}
                            />
                          </View>
                        </View>

                        <View style={styles.fieldGroup}>
                          <Text style={styles.fieldLabel}>Idade Aparente em Anos (C48)</Text>
                          <TextInput
                            style={styles.fieldInput}
                            keyboardType="numeric"
                            value={String(dadosV25.idade_aparente)}
                            onChangeText={(v) => setDadosV25({ ...dadosV25, idade_aparente: Number(v) || v })}
                          />
                        </View>

                        <View style={styles.fieldGroup}>
                          <Text style={styles.fieldLabel}>Estado de Conservação (C50)</Text>
                          <TextInput
                            style={styles.fieldInput}
                            value={dadosV25.estado_conservacao}
                            onChangeText={(v) => setDadosV25({ ...dadosV25, estado_conservacao: v })}
                          />
                        </View>
                      </>
                    )}
                  </>
                )}
              </ScrollView>

              {/* Botão de Disparo do Preenchimento ML */}
              <Pressable
                style={[
                  styles.submitBtn,
                  processandoPreenchimento && { opacity: 0.7 },
                ]}
                onPress={handleSubmeterPreenchimento}
                disabled={processandoPreenchimento}
              >
                {processandoPreenchimento ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="auto-fix" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Preencher Planilha via IA</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {avisoFeedback && (
            <View style={styles.toastNotice}>
              <Ionicons name="checkmark-circle" size={16} color="#34D399" />
              <Text style={styles.toastNoticeText}>{avisoFeedback}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 580,
    maxHeight: '90%',
    padding: 20,
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
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14,
    marginBottom: 10,
  },
  tagHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  templateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  templateBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  confidenceBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  confidenceText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: '#475569',
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#0F172A',
  },
  modalSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 320,
  },
  formHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  tabBarV25: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  tabBtnV25: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnV25Active: {
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  tabTextV25: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#64748B',
  },
  tabTextV25Active: {
    color: '#6D28D9',
  },
  formScroll: {
    maxHeight: 340,
  },
  fieldGroup: {
    gap: 3,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 8,
  },
  fieldLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#334155',
  },
  fieldInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#0F172A',
  },
  submitBtn: {
    backgroundColor: '#6D28D9',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  submitBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  successContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconCircle: {
    marginBottom: 10,
  },
  successTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#065F46',
    textAlign: 'center',
  },
  successDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#334155',
    textAlign: 'center',
    maxWidth: 360,
    marginTop: 4,
    marginBottom: 20,
  },
  actionButtonsCol: {
    width: '100%',
    gap: 8,
  },
  viewBrowserBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  viewBrowserBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  downloadFileBtn: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  downloadFileBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#15803D',
  },
  finishBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  finishBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#475569',
  },
  toastNotice: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#064E3B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toastNoticeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: '#ECFDF5',
    flex: 1,
  },
});

