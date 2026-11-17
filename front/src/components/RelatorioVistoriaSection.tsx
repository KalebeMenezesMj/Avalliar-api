import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

import { fonts, spacing } from '../theme';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import {
  demandaService,
  ArquivoAnexo,
  EmpresaDemanda,
  TarefaDemanda,
} from '../services/demandaService';
import { mlService } from '../services/mlService';
import { registrar } from '../services/logService';
import {
  visualizarArquivoDemanda,
  baixarArquivoDemanda,
  enviarArquivoParaServidor,
} from './FileViewerModal';

export type TipologiaImovel =
  | 'Apartamento'
  | 'Casa'
  | 'Sobrado'
  | 'Terreno'
  | 'Sala Comercial'
  | 'Galpão';

const TIPOLOGIAS: Array<{
  id: TipologiaImovel;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}> = [
  { id: 'Apartamento', label: 'Apartamento', icon: 'office-building-outline' },
  { id: 'Casa', label: 'Casa', icon: 'home-outline' },
  { id: 'Sobrado', label: 'Sobrado', icon: 'home-city-outline' },
  { id: 'Terreno', label: 'Terreno', icon: 'vector-square' },
  { id: 'Sala Comercial', label: 'Comercial', icon: 'domain' },
  { id: 'Galpão', label: 'Galpão', icon: 'warehouse' },
];

const TIPOS_LOGRADOURO = ['Rua', 'Avenida', 'Alameda', 'Praça', 'Rodovia', 'Travessa'];

export interface RelatorioVistoriaSectionProps {
  empresaId?: string;
  empresaNome?: string;
  empresasDisponiveis?: EmpresaDemanda[];
  demandaId?: string;
  demandaTitulo?: string;
  imovelReferencia?: string;
  enderecoInicial?: string;
  responsavelPadrao?: string;
  arquivoAlvo?: ArquivoAnexo | null;
  onSucessoGeracao?: (arquivo: ArquivoAnexo, campos: Record<string, any>) => void;
}

export default function RelatorioVistoriaSection({
  empresaId,
  empresaNome,
  empresasDisponiveis,
  demandaId,
  demandaTitulo,
  imovelReferencia,
  enderecoInicial,
  responsavelPadrao = 'Engenheiro Avaliador',
  arquivoAlvo,
  onSucessoGeracao,
}: RelatorioVistoriaSectionProps) {
  const { colors: t } = useTheme();
  const styles = makeStyles(t);

  // Empresa selecionada (caso esteja na aba geral de Demandas)
  const [empSelecionadaNome, setEmpSelecionadaNome] = useState<string>(
    empresaNome || empresasDisponiveis?.[0]?.nome || 'Constructor Hub'
  );
  const [empSelecionadaId, setEmpSelecionadaId] = useState<string>(
    empresaId || empresasDisponiveis?.[0]?.id || '2'
  );

  useEffect(() => {
    if (empresaNome) setEmpSelecionadaNome(empresaNome);
    if (empresaId) setEmpSelecionadaId(empresaId);
  }, [empresaId, empresaNome]);

  // 1. Tipologia (Casa, Sobrado, Terreno, Apartamento, etc.)
  const [tipologia, setTipologia] = useState<string>('Apartamento');

  // 2. Endereço Completo (tipo, logradouro, numero, bairro, cidade, uf e cep)
  const [cep, setCep] = useState<string>('01310-100');
  const [tipoEndereco, setTipoEndereco] = useState<string>('Avenida');
  const [logradouro, setLogradouro] = useState<string>('Paulista');
  const [numero, setNumero] = useState<string>('1578');
  const [complemento, setComplemento] = useState<string>('');
  const [bairro, setBairro] = useState<string>('Bela Vista');
  const [cidade, setCidade] = useState<string>('São Paulo');
  const [uf, setUf] = useState<string>('SP');
  const [buscandoCep, setBuscandoCep] = useState<boolean>(false);

  // 3. Metragem (area privativa, area total e area comum caso seja um apartamento)
  const [areaPrivativa, setAreaPrivativa] = useState<string>('72,00');
  const [areaComum, setAreaComum] = useState<string>('18,50');
  const [areaTotal, setAreaTotal] = useState<string>('90,50');

  // 4. Características do Imóvel (cômodos e vagas para busca no mercado e homogeneização)
  const [dormitorios, setDormitorios] = useState<string>('3');
  const [suites, setSuites] = useState<string>('1');
  const [banheiros, setBanheiros] = useState<string>('2');
  const [vagas, setVagas] = useState<string>('2');

  // 5. Cliente (proponente, corretor, contato, numero da proposta)
  const [proponente, setProponente] = useState<string>(
    empresaNome || 'Constructor Hub S.A.'
  );
  const [corretor, setCorretor] = useState<string>(responsavelPadrao);
  const [contato, setContato] = useState<string>('(11) 98765-4321');
  const [numeroProposta, setNumeroProposta] = useState<string>(
    () => `PROP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );

  // 6. Data
  const [dataVistoria, setDataVistoria] = useState<string>(() =>
    new Date().toLocaleDateString('pt-BR')
  );

  // Estado de processamento do Machine Learning e Planilha Gerada
  const [salvandoMl, setSalvandoMl] = useState<boolean>(false);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [avisoFeedback, setAvisoFeedback] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [acaoPlanilhaEmAndamento, setAcaoPlanilhaEmAndamento] = useState(false);
  const [planilhaGerada, setPlanilhaGerada] = useState<{
    arquivo: ArquivoAnexo;
    templateNome: string;
    camposPreenchidos: number;
    resumo: {
      enderecoCompleto: string;
      tipologia: string;
      metragem: string;
      cliente: string;
      proposta: string;
      data: string;
    };
  } | null>(null);

  // Preenche valores iniciais baseados na demanda/empresa quando disponíveis
  useEffect(() => {
    if (empresaNome) {
      setProponente(empresaNome);
    }
    if (responsavelPadrao) {
      setCorretor(responsavelPadrao);
    }
    const refTexto = (imovelReferencia || enderecoInicial || demandaTitulo || '').toLowerCase();
    if (refTexto.includes('casa')) setTipologia('Casa');
    else if (refTexto.includes('sobrado')) setTipologia('Sobrado');
    else if (refTexto.includes('terreno') || refTexto.includes('lote')) setTipologia('Terreno');
    else if (refTexto.includes('galp')) setTipologia('Galpão');
    else if (refTexto.includes('sala') || refTexto.includes('comercial'))
      setTipologia('Sala Comercial');
    else if (refTexto.includes('apto') || refTexto.includes('apartamento'))
      setTipologia('Apartamento');
  }, [empresaNome, responsavelPadrao, imovelReferencia, enderecoInicial, demandaTitulo]);

  const isApartamento = tipologia.trim().toLowerCase() === 'apartamento';

  // Atualiza automaticamente a área total quando área privativa ou área comum mudam
  const atualizarAreas = (novaPrivativa: string, novaComum: string, isApto: boolean) => {
    const priv = parseFloat(novaPrivativa.replace(',', '.')) || 0;
    const com = isApto ? parseFloat(novaComum.replace(',', '.')) || 0 : 0;
    if (priv > 0 || com > 0) {
      const soma = priv + com;
      setAreaTotal(soma.toFixed(2).replace('.', ','));
    }
  };

  const handleChangeAreaPrivativa = (val: string) => {
    setAreaPrivativa(val);
    atualizarAreas(val, areaComum, isApartamento);
  };

  const handleChangeAreaComum = (val: string) => {
    setAreaComum(val);
    atualizarAreas(areaPrivativa, val, true);
  };

  const handleSelectTipologia = (novaTipologia: string) => {
    setTipologia(novaTipologia);
    const ehApto = novaTipologia.trim().toLowerCase() === 'apartamento';
    atualizarAreas(areaPrivativa, areaComum, ehApto);
  };

  // Formatação e busca automática de CEP (ViaCEP)
  const handleCepChange = async (valor: string) => {
    const digitos = valor.replace(/\D/g, '').slice(0, 8);
    const formatado =
      digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
    setCep(formatado);

    if (digitos.length === 8) {
      setBuscandoCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            if (data.logradouro) {
              const partes = data.logradouro.split(' ');
              const primeiro = partes[0];
              if (
                TIPOS_LOGRADOURO.some(
                  (t) => t.toLowerCase() === primeiro.toLowerCase()
                )
              ) {
                setTipoEndereco(primeiro);
                setLogradouro(partes.slice(1).join(' '));
              } else {
                setLogradouro(data.logradouro);
              }
            }
            if (data.bairro) setBairro(data.bairro);
            if (data.localidade) setCidade(data.localidade);
            if (data.uf) setUf(data.uf);
          }
        }
      } catch {
        // Permite preenchimento manual caso offline
      } finally {
        setBuscandoCep(false);
      }
    }
  };

  const parseNumero = (valor: string): number => {
    const limpo = String(valor || '0').replace(/\./g, '').replace(',', '.').trim();
    const n = parseFloat(limpo);
    return Number.isNaN(n) ? 0 : n;
  };

  // Salvar Relatório de Vistoria e acionar o gatilho de Machine Learning
  const handleSalvarEGerarPlanilha = async () => {
    setErroValidacao(null);
    registrar('relatorio.gerar.clique', { plataforma: Platform.OS });

    if (!logradouro.trim() || !cidade.trim() || !uf.trim()) {
      setErroValidacao('Preencha o endereço completo (logradouro, cidade e UF).');
      return;
    }
    if (!areaTotal.trim() && !areaPrivativa.trim()) {
      setErroValidacao('Informe a metragem do imóvel (área privativa ou área total).');
      return;
    }
    if (!proponente.trim() || !numeroProposta.trim()) {
      setErroValidacao('Informe os dados do cliente (proponente e número da proposta).');
      return;
    }

    setSalvandoMl(true);
    try {
      // Utiliza por padrão o template completo V22 (mesma planilha de 20 abas do módulo de IA),
      // exceto se o arquivo alvo for explicitamente um template V25 (.xlsm)
      const usarV25 = Boolean(
        arquivoAlvo &&
          (arquivoAlvo.nome.toLowerCase().includes('v25') ||
            arquivoAlvo.nome.toLowerCase().includes('padronizada') ||
            arquivoAlvo.extensao === 'xlsm')
      );

      const templateId = usarV25
        ? 'v25_unidades_padronizadas'
        : 'v22_unidades_isoladas';

      const templateNome = usarV25
        ? 'Modelo V25 • Unidades Padronizadas (.xlsm)'
        : 'Modelo V22 • Unidades Isoladas (.xlsx)';

      const numPrivativa = parseNumero(areaPrivativa);
      const numComum = isApartamento ? parseNumero(areaComum) : 0;
      const numTotal = parseNumero(areaTotal) || numPrivativa + numComum;
      const numDormitorios = Math.max(1, parseInt(dormitorios, 10) || 3);
      const numSuites = Math.max(0, parseInt(suites, 10) || 1);
      const numBanheiros = Math.max(1, parseInt(banheiros, 10) || 2);
      const numVagas = Math.max(0, parseInt(vagas, 10) || 2);

      const enderecoFormatado = `${tipoEndereco.trim()} ${logradouro.trim()}, ${numero.trim()}${
        complemento.trim() ? ` (${complemento.trim()})` : ''
      } - ${bairro.trim()}, ${cidade.trim()}/${uf.trim().toUpperCase()} - CEP ${cep.trim()}`;

      // Monta o payload oficial compatível com a API hospedada (/api/laudos/preencher) e o ML:
      // O bloco "busca" é indispensável para trazer as 5 amostras comparáveis do VivaReal e evitar erros #DIV/0!
      const payloadMl: Record<string, any> = usarV25
        ? {
            numero_proposta: numeroProposta.trim(),
            trata_se_pv: 'NÃO',
            cliente: proponente.trim(),
            tipo_laudo: 'LAUDO MANUAL INTERNO',
            responsavel_avaliacao: corretor.trim(),
            contato: contato.trim(),
            data_laudo: dataVistoria.trim(),
            empreendimento: demandaTitulo || `${tipologia} • ${bairro.trim()}`,
            tipo_endereco: tipoEndereco.trim(),
            endereco: `${tipoEndereco.trim()} ${logradouro.trim()}`.trim(),
            logradouro: logradouro.trim(),
            numero: numero.trim(),
            complemento: complemento.trim(),
            bairro: bairro.trim(),
            cidade: cidade.trim(),
            uf: uf.trim().toUpperCase(),
            cep: cep.trim(),
            tipologia: tipologia.trim(),
            unidade: complemento.trim() || numero.trim(),
            area_privativa: numPrivativa,
            area_comum: numComum,
            area_total: numTotal,
            area_equivalente: numPrivativa || numTotal,
            busca: {
              uf: uf.trim().toUpperCase(),
              cidade: cidade.trim(),
              tipo: tipologia.toLowerCase(),
              bairro: bairro.trim(),
              area: numPrivativa || numTotal,
              quartos: numDormitorios,
              vagas: numVagas,
              top_n: 5,
            },
          }
        : {
            cliente: proponente.trim(),
            numero_proposta: numeroProposta.trim(),
            tipo_laudo: 'LAUDO COMPLETO DE AVALIAÇÃO',
            engenheiro_responsavel: corretor.trim(),
            metodologia: 'Método Comparativo Direto de Dados de Mercado',
            fam_evolutivo: '1,00',
            cidade: cidade.trim(),
            uf: uf.trim().toUpperCase(),
            data_laudo: dataVistoria.trim(),
            endereco: enderecoFormatado,
            empreendimento: demandaTitulo || `${tipologia} • ${bairro.trim()}`,
            avaliando: {
              tipo_imovel: tipologia.trim(),
              tipo_endereco: tipoEndereco.trim(),
              logradouro: `${tipoEndereco.trim()} ${logradouro.trim()}`.trim(),
              numero: numero.trim(),
              ...(complemento.trim() ? { complemento: complemento.trim() } : {}),
              bairro: bairro.trim(),
              contato: corretor.trim(),
              telefone: contato.trim(),
              cep: cep.trim(),
              cidade: cidade.trim(),
              estado: uf.trim().toUpperCase(),
              area_terreno: numTotal,
              area_equivalente: numPrivativa || numTotal,
              area_privativa: numPrivativa,
              area_comum: numComum,
              area_total: numTotal,
              dormitorios: numDormitorios,
              suites: numSuites,
              banheiros: numBanheiros,
              vagas: numVagas,
              idade_aparente: 10,
              pavimentos: 1,
              salas: 1,
              cozinhas: 1,
              area_servico: 1,
            },
            busca: {
              uf: uf.trim().toUpperCase(),
              cidade: cidade.trim(),
              tipo: tipologia.toLowerCase(),
              bairro: bairro.trim(),
              area: numPrivativa || numTotal,
              quartos: numDormitorios,
              vagas: numVagas,
              top_n: 5,
            },
          };

      // Aciona o serviço de geração da planilha baseada no template oficial (V25 / V22)
      const respostaMl = await mlService.preencherPlanilha(
        templateId,
        payloadMl,
        arquivoAlvo?.id,
        arquivoAlvo?.webFile
      );

      const extSaida = usarV25 ? 'xlsm' : 'xlsx';
      const nomePlanilhaGerada =
        respostaMl.nome_arquivo ||
        (usarV25
          ? 'Homogeneização_unidades padronizadas_2026_V25_Preenchida.xlsm'
          : 'Homogeneização_Unidades Isoladas_2025_V22_Preenchida.xlsx');

      let webFileGerado: any = arquivoAlvo?.webFile;
      if (respostaMl.conteudo_base64 && Platform.OS === 'web' && typeof Blob !== 'undefined') {
        try {
          const mime =
            extSaida === 'xlsm'
              ? 'application/vnd.ms-excel.sheet.macroEnabled.12'
              : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          const binaryString = atob(respostaMl.conteudo_base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: mime });
          if (typeof File !== 'undefined') {
            webFileGerado = new File([blob], nomePlanilhaGerada, { type: mime });
          }
        } catch {
          // mantém referência base64
        }
      }

      let arquivoFinal: ArquivoAnexo;

      if (arquivoAlvo) {
        demandaService.atualizarStatusMlArquivo(
          arquivoAlvo.id,
          'PREENCHIDA_ML',
          templateId,
          payloadMl,
          respostaMl.conteudo_base64
        );
        arquivoFinal = {
          ...arquivoAlvo,
          nome: nomePlanilhaGerada,
          extensao: extSaida,
          statusMl: 'PREENCHIDA_ML',
          templateMl: templateId,
          camposExtraidosMl: payloadMl,
          conteudoBase64: respostaMl.conteudo_base64,
          webFile: webFileGerado,
        };
      } else if (demandaId) {
        const criado = demandaService.adicionarArquivoNaDemanda({
          empresaId: empSelecionadaId,
          empresaNome: empSelecionadaNome,
          tarefaId: demandaId,
          tarefaTitulo: demandaTitulo || `Vistoria • ${logradouro.trim()}, ${numero.trim()}`,
          nomeArquivo: nomePlanilhaGerada,
          categoria: 'PLANILHA',
          tamanho: usarV25 ? '890 KB' : '645 KB',
          autor: corretor.trim() || responsavelPadrao,
          webFile: webFileGerado,
        });
        demandaService.atualizarStatusMlArquivo(
          criado.id,
          'PREENCHIDA_ML',
          templateId,
          payloadMl,
          respostaMl.conteudo_base64
        );
        arquivoFinal = {
          ...criado,
          extensao: extSaida,
          statusMl: 'PREENCHIDA_ML',
          templateMl: templateId,
          camposExtraidosMl: payloadMl,
          conteudoBase64: respostaMl.conteudo_base64,
          webFile: webFileGerado,
        };
      } else {
        const criado = demandaService.adicionarArquivoEmpresa({
          empresaId: empSelecionadaId,
          empresaNome: empSelecionadaNome,
          nomeArquivo: nomePlanilhaGerada,
          categoria: 'PLANILHA',
          tamanho: usarV25 ? '890 KB' : '645 KB',
          autor: corretor.trim() || responsavelPadrao,
          webFile: webFileGerado,
        });
        demandaService.atualizarStatusMlArquivo(
          criado.id,
          'PREENCHIDA_ML',
          templateId,
          payloadMl,
          respostaMl.conteudo_base64
        );
        arquivoFinal = {
          ...criado,
          extensao: extSaida,
          statusMl: 'PREENCHIDA_ML',
          templateMl: templateId,
          camposExtraidosMl: payloadMl,
          conteudoBase64: respostaMl.conteudo_base64,
          webFile: webFileGerado,
        };
      }

      if (arquivoFinal.conteudoBase64) {
        await enviarArquivoParaServidor(arquivoFinal);
      }

      setPlanilhaGerada({
        arquivo: arquivoFinal,
        templateNome,
        camposPreenchidos: respostaMl.campos_preenchidos || 16,
        resumo: {
          enderecoCompleto: enderecoFormatado,
          tipologia: tipologia.trim(),
          metragem: isApartamento
            ? `Privativa: ${areaPrivativa} m² • Comum: ${areaComum} m² • Total: ${areaTotal} m²`
            : `Privativa: ${areaPrivativa} m² • Total: ${areaTotal} m²`,
          cliente: `${proponente.trim()} (Corretor: ${corretor.trim()} • ${contato.trim()})`,
          proposta: numeroProposta.trim(),
          data: dataVistoria.trim(),
        },
      });

      if (onSucessoGeracao) {
        onSucessoGeracao(arquivoFinal, payloadMl);
      }
    } catch (e: any) {
      // Falha na geração (ML/API fora do ar, timeout, sem planilha): mostra o motivo na tela
      registrar('relatorio.gerar.erro', { motivo: String(e?.message ?? e) }, 'erro');
      setErroValidacao(
        e?.message || 'Não foi possível gerar a planilha. Tente novamente em instantes.'
      );
    } finally {
      setSalvandoMl(false);
    }
  };

  const handleVisualizarPlanilha = async () => {
    if (!planilhaGerada) return;
    if (acaoPlanilhaEmAndamento) return;
    setErroAcao(null);
    setAcaoPlanilhaEmAndamento(true);
    try {
      const msg = await visualizarArquivoDemanda(
        planilhaGerada.arquivo,
        empSelecionadaNome,
        demandaTitulo || `Vistoria ${planilhaGerada.resumo.tipologia}`,
        planilhaGerada.resumo.enderecoCompleto,
        corretor
      );
      setAvisoFeedback(msg);
      setTimeout(() => setAvisoFeedback(null), 4000);
    } catch (e: any) {
      setErroAcao(`Não foi possível visualizar a planilha: ${e?.message || 'erro desconhecido'}`);
    } finally {
      setAcaoPlanilhaEmAndamento(false);
    }
  };

  const handleBaixarPlanilha = async () => {
    if (!planilhaGerada) return;
    if (acaoPlanilhaEmAndamento) return;
    setErroAcao(null);
    setAcaoPlanilhaEmAndamento(true);
    try {
      const msg = await baixarArquivoDemanda(
        planilhaGerada.arquivo,
        empSelecionadaNome,
        demandaTitulo || `Vistoria ${planilhaGerada.resumo.tipologia}`,
        planilhaGerada.resumo.enderecoCompleto,
        corretor
      );
      setAvisoFeedback(msg);
      setTimeout(() => setAvisoFeedback(null), 4000);
    } catch (e: any) {
      setErroAcao(`Não foi possível baixar a planilha: ${e?.message || 'erro desconhecido'}`);
    } finally {
      setAcaoPlanilhaEmAndamento(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Banner do Relatório de Vistoria */}
      <View style={styles.headerBanner}>
        <View style={styles.headerIconCircle}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={24} color="#C61010" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerTitle}>Relatório de Vistoria</Text>
          <Text style={styles.headerSubtitle}>
            Preencha os dados do imóvel e do cliente abaixo. Ao salvar, a planilha será gerada automaticamente para visualização e download.
          </Text>
        </View>
      </View>

      {/* Caso a planilha já tenha sido gerada após salvar */}
      {planilhaGerada && (
        <View style={styles.generatedCard}>
          <View style={styles.generatedHeader}>
            <View style={styles.generatedIconBox}>
              <MaterialCommunityIcons name="check-decagram" size={28} color="#10B981" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.generatedTitle}>
                Planilha Gerada com Sucesso!
              </Text>
              <Text style={styles.generatedSubtitle} numberOfLines={2}>
                {planilhaGerada.arquivo.nome}
              </Text>
            </View>
          </View>

          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tipologia:</Text>
              <Text style={styles.summaryVal}>{planilhaGerada.resumo.tipologia}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Endereço:</Text>
              <Text style={styles.summaryVal}>{planilhaGerada.resumo.enderecoCompleto}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Metragem:</Text>
              <Text style={styles.summaryVal}>{planilhaGerada.resumo.metragem}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cliente:</Text>
              <Text style={styles.summaryVal}>{planilhaGerada.resumo.cliente}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Proposta / Data:</Text>
              <Text style={styles.summaryVal}>
                {planilhaGerada.resumo.proposta} • {planilhaGerada.resumo.data}
              </Text>
            </View>
          </View>

          {avisoFeedback && (
            <View style={styles.feedbackToast}>
              <Ionicons name="checkmark-circle" size={16} color="#15803D" />
              <Text style={styles.feedbackToastText}>{avisoFeedback}</Text>
            </View>
          )}

          {erroAcao && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorBannerText}>{erroAcao}</Text>
            </View>
          )}

          <View style={styles.generatedActionsRow}>
            <Pressable
              style={[styles.viewBtn, acaoPlanilhaEmAndamento && { opacity: 0.5 }]}
              onPress={handleVisualizarPlanilha}
              disabled={acaoPlanilhaEmAndamento}
            >
              <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
              <Text style={styles.viewBtnText}>Visualizar Planilha</Text>
            </Pressable>

            <Pressable
              style={[styles.downloadBtn, acaoPlanilhaEmAndamento && { opacity: 0.5 }]}
              onPress={handleBaixarPlanilha}
              disabled={acaoPlanilhaEmAndamento}
            >
              <Ionicons name="download-outline" size={18} color="#15803D" />
              <Text style={styles.downloadBtnText}>
                Baixar (.{planilhaGerada.arquivo.extensao || 'xlsx'})
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Seletor de Empresa (exibido quando está na aba geral de Demandas sem empresa fixa) */}
      {!empresaNome && empresasDisponiveis && empresasDisponiveis.length > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="business-outline" size={17} color="#C61010" />
            <Text style={styles.sectionTitle}>Empresa Vinculada</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {empresasDisponiveis.map((emp) => {
              const active = emp.nome === empSelecionadaNome;
              return (
                <Pressable
                  key={emp.id}
                  style={[styles.choiceChip, active && styles.choiceChipActive]}
                  onPress={() => {
                    setEmpSelecionadaNome(emp.nome);
                    setEmpSelecionadaId(emp.id);
                    setProponente(emp.nome);
                  }}
                >
                  <Text
                    style={[
                      styles.choiceChipText,
                      active && styles.choiceChipTextActive,
                    ]}
                  >
                    {emp.nome}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 1. TIPOLOGIA DO IMÓVEL */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="home-analytics" size={18} color="#C61010" />
          <Text style={styles.sectionTitle}>1. Tipologia do Imóvel</Text>
        </View>

        <View style={styles.tipologiaGrid}>
          {TIPOLOGIAS.map((item) => {
            const selecionada =
              tipologia.trim().toLowerCase() === item.id.toLowerCase();
            return (
              <Pressable
                key={item.id}
                style={[
                  styles.tipologiaCard,
                  selecionada && styles.tipologiaCardActive,
                ]}
                onPress={() => handleSelectTipologia(item.id)}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={20}
                  color={selecionada ? '#FFFFFF' : t.text}
                />
                <Text
                  style={[
                    styles.tipologiaCardText,
                    selecionada && styles.tipologiaCardTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Tipologia selecionada / personalizada</Text>
          <TextInput
            style={styles.input}
            value={tipologia}
            onChangeText={handleSelectTipologia}
            placeholder="Ex: Apartamento, Casa, Sobrado, Terreno..."
            placeholderTextColor={t.textMuted}
          />
        </View>
      </View>

      {/* 2. ENDEREÇO COMPLETO */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="location-outline" size={18} color="#C61010" />
          <Text style={styles.sectionTitle}>2. Endereço Completo</Text>
          {buscandoCep && (
            <ActivityIndicator size="small" color="#C61010" style={{ marginLeft: 6 }} />
          )}
        </View>

        <View style={styles.rowTwoCols}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>CEP</Text>
            <TextInput
              style={styles.input}
              value={cep}
              onChangeText={handleCepChange}
              keyboardType="numeric"
              placeholder="00000-000"
              placeholderTextColor={t.textMuted}
              maxLength={9}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Tipo (Rua, Av., etc.)</Text>
            <TextInput
              style={styles.input}
              value={tipoEndereco}
              onChangeText={setTipoEndereco}
              placeholder="Rua / Avenida"
              placeholderTextColor={t.textMuted}
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.miniChipsRow}
        >
          {TIPOS_LOGRADOURO.map((tp) => {
            const active = tipoEndereco.toLowerCase() === tp.toLowerCase();
            return (
              <Pressable
                key={tp}
                style={[styles.miniChip, active && styles.miniChipActive]}
                onPress={() => setTipoEndereco(tp)}
              >
                <Text
                  style={[styles.miniChipText, active && styles.miniChipTextActive]}
                >
                  {tp}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Logradouro</Text>
          <TextInput
            style={styles.input}
            value={logradouro}
            onChangeText={setLogradouro}
            placeholder="Nome da rua, avenida ou alameda"
            placeholderTextColor={t.textMuted}
          />
        </View>

        <View style={styles.rowTwoCols}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Número</Text>
            <TextInput
              style={styles.input}
              value={numero}
              onChangeText={setNumero}
              placeholder="Ex: 1500"
              placeholderTextColor={t.textMuted}
            />
          </View>

          <View style={{ flex: 1.4 }}>
            <Text style={styles.fieldLabel}>Complemento / Unidade</Text>
            <TextInput
              style={styles.input}
              value={complemento}
              onChangeText={setComplemento}
              placeholder="Ex: Apto 102, Bloco A"
              placeholderTextColor={t.textMuted}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Bairro</Text>
          <TextInput
            style={styles.input}
            value={bairro}
            onChangeText={setBairro}
            placeholder="Bairro"
            placeholderTextColor={t.textMuted}
          />
        </View>

        <View style={styles.rowTwoCols}>
          <View style={{ flex: 2.2 }}>
            <Text style={styles.fieldLabel}>Cidade</Text>
            <TextInput
              style={styles.input}
              value={cidade}
              onChangeText={setCidade}
              placeholder="Cidade"
              placeholderTextColor={t.textMuted}
            />
          </View>

          <View style={{ flex: 0.8 }}>
            <Text style={styles.fieldLabel}>UF</Text>
            <TextInput
              style={styles.input}
              value={uf}
              onChangeText={(v) => setUf(v.toUpperCase().slice(0, 2))}
              placeholder="SP"
              placeholderTextColor={t.textMuted}
              maxLength={2}
              autoCapitalize="characters"
            />
          </View>
        </View>
      </View>

      {/* 3. METRAGEM */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="ruler-square" size={18} color="#C61010" />
          <Text style={styles.sectionTitle}>3. Metragem (m²)</Text>
          {isApartamento && (
            <View style={styles.aptoTag}>
              <Text style={styles.aptoTagText}>Apartamento • Inclui Área Comum</Text>
            </View>
          )}
        </View>

        {isApartamento ? (
          <>
            <View style={styles.rowTwoCols}>
              <View style={styles.colHalf}>
                <Text style={styles.fieldLabel}>Área Privativa (m²)</Text>
                <TextInput
                  style={styles.input}
                  value={areaPrivativa}
                  onChangeText={handleChangeAreaPrivativa}
                  keyboardType="numeric"
                  placeholder="Ex: 72,00"
                  placeholderTextColor={t.textMuted}
                />
              </View>

              <View style={styles.colHalf}>
                <Text style={styles.fieldLabel}>Área Comum (m²)</Text>
                <TextInput
                  style={styles.input}
                  value={areaComum}
                  onChangeText={handleChangeAreaComum}
                  keyboardType="numeric"
                  placeholder="Ex: 18,50"
                  placeholderTextColor={t.textMuted}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Área Total (m²)</Text>
              <TextInput
                style={styles.input}
                value={areaTotal}
                onChangeText={setAreaTotal}
                keyboardType="numeric"
                placeholder="Ex: 90,50"
                placeholderTextColor={t.textMuted}
              />
            </View>
          </>
        ) : (
          <View style={styles.rowTwoCols}>
            <View style={styles.colHalf}>
              <Text style={styles.fieldLabel}>Área Privativa (m²)</Text>
              <TextInput
                style={styles.input}
                value={areaPrivativa}
                onChangeText={handleChangeAreaPrivativa}
                keyboardType="numeric"
                placeholder="Ex: 72,00"
                placeholderTextColor={t.textMuted}
              />
            </View>

            <View style={styles.colHalf}>
              <Text style={styles.fieldLabel}>Área Total (m²)</Text>
              <TextInput
                style={styles.input}
                value={areaTotal}
                onChangeText={setAreaTotal}
                keyboardType="numeric"
                placeholder="Ex: 90,50"
                placeholderTextColor={t.textMuted}
              />
            </View>
          </View>
        )}
      </View>

      {/* 4. CARACTERÍSTICAS DO IMÓVEL (QUARTOS, SUÍTES, BANHEIROS E VAGAS) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="bed-king-outline" size={18} color="#C61010" />
          <Text style={styles.sectionTitle}>4. Características do Imóvel</Text>
        </View>

        <View style={styles.rowTwoCols}>
          <View style={styles.colHalf}>
            <Text style={styles.fieldLabel}>Quartos / Dormitórios</Text>
            <TextInput
              style={styles.input}
              value={dormitorios}
              onChangeText={setDormitorios}
              keyboardType="numeric"
              placeholder="Ex: 3"
              placeholderTextColor={t.textMuted}
            />
          </View>

          <View style={styles.colHalf}>
            <Text style={styles.fieldLabel}>Suítes</Text>
            <TextInput
              style={styles.input}
              value={suites}
              onChangeText={setSuites}
              keyboardType="numeric"
              placeholder="Ex: 1"
              placeholderTextColor={t.textMuted}
            />
          </View>
        </View>

        <View style={styles.rowTwoCols}>
          <View style={styles.colHalf}>
            <Text style={styles.fieldLabel}>Banheiros</Text>
            <TextInput
              style={styles.input}
              value={banheiros}
              onChangeText={setBanheiros}
              keyboardType="numeric"
              placeholder="Ex: 2"
              placeholderTextColor={t.textMuted}
            />
          </View>

          <View style={styles.colHalf}>
            <Text style={styles.fieldLabel}>Vagas de Garagem</Text>
            <TextInput
              style={styles.input}
              value={vagas}
              onChangeText={setVagas}
              keyboardType="numeric"
              placeholder="Ex: 2"
              placeholderTextColor={t.textMuted}
            />
          </View>
        </View>
      </View>

      {/* 5. CLIENTE E PROPOSTA */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="person-outline" size={18} color="#C61010" />
          <Text style={styles.sectionTitle}>5. Cliente & Proposta</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Proponente (Cliente)</Text>
          <TextInput
            style={styles.input}
            value={proponente}
            onChangeText={setProponente}
            placeholder="Nome do proponente ou empresa"
            placeholderTextColor={t.textMuted}
          />
        </View>

        <View style={styles.rowTwoCols}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Corretor / Responsável</Text>
            <TextInput
              style={styles.input}
              value={corretor}
              onChangeText={setCorretor}
              placeholder="Nome do corretor"
              placeholderTextColor={t.textMuted}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Contato (Tel / E-mail)</Text>
            <TextInput
              style={styles.input}
              value={contato}
              onChangeText={setContato}
              placeholder="(11) 99999-9999"
              placeholderTextColor={t.textMuted}
            />
          </View>
        </View>

        <View style={styles.rowTwoCols}>
          <View style={{ flex: 1.2 }}>
            <Text style={styles.fieldLabel}>Número da Proposta</Text>
            <TextInput
              style={styles.input}
              value={numeroProposta}
              onChangeText={setNumeroProposta}
              placeholder="PROP-2026-0001"
              placeholderTextColor={t.textMuted}
            />
          </View>

          {/* 6. DATA */}
          <View style={{ flex: 0.8 }}>
            <Text style={styles.fieldLabel}>6. Data</Text>
            <TextInput
              style={styles.input}
              value={dataVistoria}
              onChangeText={setDataVistoria}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={t.textMuted}
            />
          </View>
        </View>
      </View>

      {erroValidacao && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#DC2626" />
          <Text style={styles.errorBannerText}>{erroValidacao}</Text>
        </View>
      )}

      {/* BOTÃO SALVAR E GERAR PLANILHA */}
      <Pressable
        style={({ pressed }) => [
          styles.saveMlButton,
          salvandoMl && { opacity: 0.75 },
          pressed && { transform: [{ scale: 0.99 }] },
        ]}
        onPress={handleSalvarEGerarPlanilha}
        disabled={salvandoMl}
        accessibilityRole="button"
        accessibilityLabel="Salvar Relatório de Vistoria e gerar planilha"
      >
        {salvandoMl ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.saveMlButtonText}>
              Gerando planilha...
            </Text>
          </>
        ) : (
          <>
            <MaterialCommunityIcons name="content-save-check-outline" size={20} color="#FFFFFF" />
            <Text style={styles.saveMlButtonText}>
              Salvar e Gerar Planilha
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const makeStyles = (t: ThemeColors) =>
  StyleSheet.create({
    container: {
      gap: 14,
    },
    headerBanner: {
      backgroundColor: t.cardBackground,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      borderWidth: 1,
      borderColor: t.cardBorder,
    },
    headerIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    aiBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#EDE9FE',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    aiBadgeText: {
      fontFamily: fonts.bold,
      fontSize: 10.5,
      color: '#6D28D9',
    },
    headerTitle: {
      fontFamily: fonts.bold,
      fontSize: 16,
      color: t.text,
    },
    headerSubtitle: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: t.textMuted,
      marginTop: 2,
      lineHeight: 17,
    },
    sectionCard: {
      backgroundColor: t.cardBackground,
      borderRadius: 16,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: t.cardBorder,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 2,
    },
    sectionTitle: {
      fontFamily: fonts.bold,
      fontSize: 14,
      color: t.text,
    },
    aptoTag: {
      marginLeft: 'auto',
      backgroundColor: '#FEE2E2',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    aptoTagText: {
      fontFamily: fonts.semibold,
      fontSize: 10,
      color: '#B91C1C',
    },
    chipsScroll: {
      gap: 8,
      paddingVertical: 2,
    },
    choiceChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: t.chipBackground,
      borderWidth: 1,
      borderColor: t.cardBorder,
    },
    choiceChipActive: {
      backgroundColor: '#C61010',
      borderColor: '#C61010',
    },
    choiceChipText: {
      fontFamily: fonts.semibold,
      fontSize: 12,
      color: t.chipText,
    },
    choiceChipTextActive: {
      color: '#FFFFFF',
    },
    tipologiaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tipologiaCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: t.chipBackground,
      borderWidth: 1,
      borderColor: t.cardBorder,
    },
    tipologiaCardActive: {
      backgroundColor: '#C61010',
      borderColor: '#C61010',
    },
    tipologiaCardText: {
      fontFamily: fonts.semibold,
      fontSize: 12,
      color: t.text,
    },
    tipologiaCardTextActive: {
      color: '#FFFFFF',
    },
    miniChipsRow: {
      gap: 6,
      paddingVertical: 2,
    },
    miniChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: t.chipBackground,
    },
    miniChipActive: {
      backgroundColor: '#FEE2E2',
      borderWidth: 1,
      borderColor: '#FCA5A5',
    },
    miniChipText: {
      fontFamily: fonts.semibold,
      fontSize: 11,
      color: t.chipText,
    },
    miniChipTextActive: {
      color: '#B91C1C',
    },
    fieldGroup: {
      gap: 4,
    },
    rowTwoCols: {
      flexDirection: 'row',
      gap: 10,
    },
    colHalf: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    fieldLabel: {
      fontFamily: fonts.semibold,
      fontSize: 11.5,
      color: t.text,
    },
    input: {
      width: '100%',
      backgroundColor: t.inputBackground,
      borderWidth: 1,
      borderColor: t.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      fontFamily: fonts.regular,
      fontSize: 13,
      color: t.text,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#FEF2F2',
      borderWidth: 1,
      borderColor: '#FECACA',
      borderRadius: 10,
      padding: 12,
    },
    errorBannerText: {
      fontFamily: fonts.semibold,
      fontSize: 12,
      color: '#DC2626',
      flex: 1,
    },
    saveMlButton: {
      backgroundColor: '#C61010',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      ...Platform.select({
        ios: {
          shadowColor: '#C61010',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    saveMlButtonText: {
      fontFamily: fonts.bold,
      fontSize: 14,
      color: '#FFFFFF',
    },
    generatedCard: {
      backgroundColor: '#ECFDF5',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1.5,
      borderColor: '#6EE7B7',
      gap: 12,
    },
    generatedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    generatedIconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#D1FAE5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    generatedTitle: {
      fontFamily: fonts.bold,
      fontSize: 15,
      color: '#065F46',
    },
    generatedSubtitle: {
      fontFamily: fonts.regular,
      fontSize: 11.5,
      color: '#047857',
      marginTop: 2,
    },
    summaryBox: {
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      padding: 12,
      gap: 6,
      borderWidth: 1,
      borderColor: '#A7F3D0',
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 6,
    },
    summaryLabel: {
      fontFamily: fonts.bold,
      fontSize: 11.5,
      color: '#065F46',
      width: 100,
    },
    summaryVal: {
      fontFamily: fonts.regular,
      fontSize: 11.5,
      color: '#1E293B',
      flex: 1,
    },
    feedbackToast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#D1FAE5',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
    },
    feedbackToastText: {
      fontFamily: fonts.semibold,
      fontSize: 11.5,
      color: '#065F46',
      flex: 1,
    },
    generatedActionsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    viewBtn: {
      flex: 1,
      backgroundColor: '#1D4ED8',
      borderRadius: 10,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    viewBtnText: {
      fontFamily: fonts.bold,
      fontSize: 12.5,
      color: '#FFFFFF',
    },
    downloadBtn: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: '#15803D',
      borderRadius: 10,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    downloadBtnText: {
      fontFamily: fonts.bold,
      fontSize: 12.5,
      color: '#15803D',
    },
  });
