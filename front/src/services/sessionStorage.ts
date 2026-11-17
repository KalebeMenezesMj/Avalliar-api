import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse } from './authService';

const CHAVE_SESSAO = 'avalliar_session';

/**
 * Confere apenas a data de expiração (claim `exp`) do JWT, sem validar a assinatura.
 * A validação de verdade é do backend; aqui só evitamos reabrir uma sessão já vencida.
 */
function tokenExpirado(token: string): boolean {
  try {
    const partes = token.split('.');
    if (partes.length !== 3) return true;
    let base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const payload = JSON.parse(atob(base64));
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

/** Devolve a sessão salva se ainda estiver válida; caso contrário, limpa e devolve null. */
export async function carregarSessao(): Promise<AuthResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(CHAVE_SESSAO);
    if (!raw) return null;
    const sessao = JSON.parse(raw) as AuthResponse;
    if (!sessao?.token || tokenExpirado(sessao.token)) {
      await limparSessao();
      return null;
    }
    return sessao;
  } catch {
    return null;
  }
}

export async function salvarSessao(sessao: AuthResponse): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  } catch {
    // Sem persistência o usuário só precisa logar de novo na próxima abertura
  }
}

export async function limparSessao(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAVE_SESSAO);
  } catch {
    // ignora
  }
}
