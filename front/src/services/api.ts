import { Platform } from 'react-native';

/**
 * URLs oficiais da infraestrutura em produção na Microsoft Azure (Container Apps):
 * - API Java Spring Boot: porta padrão 8080 no container
 * - Serviço ML FastAPI: porta padrão 8000 no container
 */
export const AZURE_API_URL =
  'https://avalliar-api.politefield-70f0caa0.centralus.azurecontainerapps.io';

export const AZURE_ML_URL =
  'https://avalliar-ml.politefield-70f0caa0.centralus.azurecontainerapps.io';

/**
 * Retorna a URL base da API Spring Boot hospedada na Azure.
 */
export const getBaseUrl = (): string => {
  return AZURE_API_URL;
};

export const API_BASE_URL = getBaseUrl();

export interface ApiError {
  status: number;
  error: string;
  message: string;
}

// Token JWT da sessão atual: enviado em todas as requisições (rotas protegidas exigem Bearer)
let tokenAutenticacao: string | null = null;

export function definirTokenAutenticacao(token: string | null): void {
  tokenAutenticacao = token || null;
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(tokenAutenticacao ? { Authorization: `Bearer ${tokenAutenticacao}` } : {}),
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
