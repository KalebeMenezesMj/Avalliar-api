import { NativeModules, Platform } from 'react-native';

const PORT = 8080;
// IP da sua máquina na rede local Wi-Fi (usado para conectar do celular físico)
const LAN_IP = '192.168.3.12';

/**
 * Retorna a URL base de acordo com a plataforma/ambiente:
 * - Web no PC: localhost:8080
 * - Celular Físico / Expo Go: extrai o IP da máquina onde o Metro está rodando (ex: 192.168.3.12:8080)
 * - Emulador Android: 10.0.2.2:8080
 */
export const getBaseUrl = (): string => {
  if (Platform.OS === 'web') {
    return `http://localhost:${PORT}`;
  }

  // Tenta extrair o IP automaticamente da URL de onde o app carregou o bundle no Expo
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
    if (match && match[1]) {
      const host = match[1];
      if (host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:${PORT}`;
      }
    }
  }

  // Se estiver em dispositivo móvel físico (iOS/Android), usa o IP da rede local
  return `http://${LAN_IP}:${PORT}`;
};

export const API_BASE_URL = getBaseUrl();

export interface ApiError {
  status: number;
  error: string;
  message: string;
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const errorMessage =
        data?.message || data?.error || `Erro na requisição (Status: ${response.status})`;
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (error: any) {
    if (error.message === 'Network request failed' || error.name === 'TypeError') {
      throw new Error(
        `Não foi possível conectar ao servidor em ${baseUrl}. Verifique se o backend está em execução.`
      );
    }
    throw error;
  }
}
