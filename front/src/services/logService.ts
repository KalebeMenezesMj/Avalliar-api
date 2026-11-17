import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { File as ArquivoNativo, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Log de diagnóstico que roda no próprio aparelho.
 *
 * Grava eventos com horário (tempo de cada requisição do ML, mudanças de estado do app,
 * falhas) no armazenamento local. Pelas Configurações o usuário exporta o arquivo e
 * manda para o time. Só guarda metadados (rota, status, duração, motivo): nunca
 * dados de cliente, telefone, e-mail ou token.
 */

export type NivelLog = 'info' | 'aviso' | 'erro';

export interface EntradaLog {
  t: string;
  nivel: NivelLog;
  evento: string;
  dados?: Record<string, string | number | boolean | null>;
}

const CHAVE = 'avalliar_log_diagnostico';
const MAX_ENTRADAS = 1000;

let buffer: EntradaLog[] | null = null;
let carregamento: Promise<void> | null = null;
let gravacaoAgendada: ReturnType<typeof setTimeout> | null = null;

function carregar(): Promise<void> {
  if (!carregamento) {
    carregamento = (async () => {
      try {
        const bruto = await AsyncStorage.getItem(CHAVE);
        const salvo = bruto ? (JSON.parse(bruto) as EntradaLog[]) : [];
        buffer = [...salvo, ...(buffer ?? [])].slice(-MAX_ENTRADAS);
      } catch {
        buffer = buffer ?? [];
      }
    })();
  }
  return carregamento;
}

function agendarGravacao(): void {
  if (gravacaoAgendada) return;
  gravacaoAgendada = setTimeout(() => {
    gravacaoAgendada = null;
    AsyncStorage.setItem(CHAVE, JSON.stringify(buffer ?? [])).catch(() => {});
  }, 500);
}

/** Registra um evento. Nunca lança erro: o log não pode quebrar o app. */
export function registrar(
  evento: string,
  dados?: EntradaLog['dados'],
  nivel: NivelLog = 'info'
): void {
  try {
    const entrada: EntradaLog = { t: new Date().toISOString(), nivel, evento, dados };
    buffer = [...(buffer ?? []), entrada].slice(-MAX_ENTRADAS);
    if (__DEV__) {
      console.log(`[log] ${evento}`, dados ?? '');
    }
    carregar().then(agendarGravacao);
  } catch {
    // ignora
  }
}

/** Mede o tempo de uma operação assíncrona e registra início e fim. */
export async function medir<T>(
  evento: string,
  operacao: () => Promise<T>,
  dadosIniciais?: EntradaLog['dados']
): Promise<T> {
  const inicio = Date.now();
  registrar(`${evento}.inicio`, dadosIniciais);
  try {
    const resultado = await operacao();
    registrar(`${evento}.fim`, { ...dadosIniciais, duracao_ms: Date.now() - inicio });
    return resultado;
  } catch (erro: any) {
    registrar(
      `${evento}.erro`,
      { ...dadosIniciais, duracao_ms: Date.now() - inicio, motivo: String(erro?.message ?? erro) },
      'erro'
    );
    throw erro;
  }
}

/** Devolve o log inteiro como texto, um evento por linha (JSON). */
export async function textoDoLog(): Promise<string> {
  await carregar();
  return (buffer ?? []).map((e) => JSON.stringify(e)).join('\n');
}

/** Apaga o log do aparelho. */
export async function limparLog(): Promise<void> {
  buffer = [];
  await AsyncStorage.removeItem(CHAVE).catch(() => {});
}

/**
 * Exporta o log como arquivo .txt e abre o compartilhamento (no celular)
 * ou baixa o arquivo (na web). Devolve uma mensagem para a tela.
 */
export async function exportarLog(): Promise<string> {
  const texto = await textoDoLog();
  if (!texto) return 'O log está vazio. Gere uma planilha e tente de novo.';

  const nome = `avalliar-log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;

  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return 'Exportação indisponível nesta plataforma.';
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return `Log baixado: ${nome}`;
  }

  const arquivo = new ArquivoNativo(Paths.cache, nome);
  arquivo.create({ overwrite: true });
  arquivo.write(texto);
  if (!(await Sharing.isAvailableAsync())) {
    return `Log salvo em ${arquivo.uri}`;
  }
  await Sharing.shareAsync(arquivo.uri, { mimeType: 'text/plain', dialogTitle: 'Log do Avalliar' });
  return `Log exportado: ${nome}`;
}
