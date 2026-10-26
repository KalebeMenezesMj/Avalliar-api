import { request } from './api';

export interface RegisterDTO {
  nome: string;
  email: string;
  senha: string;
  role?: 'GESTOR' | 'OPERACIONAL' | 'VISTORIADOR';
}

export interface LoginDTO {
  email: string;
  senha: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  nome: string;
  role: string;
}

export const authService = {
  async register(data: RegisterDTO): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: LoginDTO): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
