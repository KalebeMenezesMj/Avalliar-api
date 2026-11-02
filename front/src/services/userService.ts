import { request } from './api';

export interface UsuarioDTO {
  id?: number | string;
  nome: string;
  email: string;
  senha?: string;
  role?: 'ADMIN' | 'GESTOR' | 'AVALIADOR' | 'VISTORIADOR' | 'OPERACIONAL';
  cargo?: string;
  telefone?: string;
}

export interface ClienteDTO {
  id?: number | string;
  cnpj?: string;
  razaoSocial: string;
  slaPadraoHoras?: number;
  nomeContato?: string;
  email?: string;
  telefone?: string;
  ativo?: boolean;
}

export const userService = {
  // Funcionários (Tabela usuario)
  async listarFuncionarios(): Promise<UsuarioDTO[]> {
    return request<UsuarioDTO[]>('/api/usuarios');
  },

  async criarFuncionario(data: UsuarioDTO): Promise<UsuarioDTO> {
    return request<UsuarioDTO>('/api/usuarios', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Clientes (Tabela cliente - Contratos)
  async listarClientes(): Promise<ClienteDTO[]> {
    return request<ClienteDTO[]>('/api/clientes');
  },

  async criarCliente(data: ClienteDTO): Promise<ClienteDTO> {
    return request<ClienteDTO>('/api/clientes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async atualizarCliente(id: number | string, data: ClienteDTO): Promise<ClienteDTO> {
    return request<ClienteDTO>(`/api/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
