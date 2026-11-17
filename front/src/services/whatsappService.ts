import { request } from './api';

/**
 * Conexão do WhatsApp pela Evolution API (feita pelo back; a chave não sai do servidor).
 */

export interface WhatsappStatus {
  estado: 'CONNECTED' | 'CONNECTING' | 'CLOSE' | 'NAO_CRIADA' | 'DESCONHECIDO' | string;
  qrCodeBase64?: string | null;
  codigo?: string | null;
}

export const whatsappService = {
  /** Estado atual da conexão. */
  async status(): Promise<WhatsappStatus> {
    return request<WhatsappStatus>('/api/whatsapp/status');
  },

  /** Gera (ou renova) o QR code para conectar o WhatsApp. */
  async conectar(): Promise<WhatsappStatus> {
    return request<WhatsappStatus>('/api/whatsapp/conectar', { method: 'POST' });
  },
};
