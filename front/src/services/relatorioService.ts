import { request, requestBase64 } from './api';

/**
 * Relatório de vistoria salvo no banco, ligado à OS. A demanda do app guarda o id da OS
 * como "os-<id>"; quando não é uma OS (ex.: demanda de exemplo), não há o que salvar.
 */

export interface RelatorioSalvo {
  ordemServicoId: number;
  dados: Record<string, any>;
  temPlanilha: boolean;
  planilhaNome?: string | null;
  planilhaTamanhoBytes?: number | null;
  atualizadoEm: string;
}

export interface PlanilhaParaSalvar {
  nome: string;
  base64: string;
}

/** Converte o id da demanda ("os-17") no id numérico da OS. Devolve null se não for uma OS. */
export function osIdDaDemanda(demandaId?: string | null): number | null {
  const m = /^os-(\d+)$/.exec(demandaId ?? '');
  return m ? Number(m[1]) : null;
}

export const relatorioService = {
  /** Salva (ou atualiza) os dados do relatório e, se vier, a planilha gerada. */
  async salvar(
    osId: number,
    dados: Record<string, any>,
    planilha?: PlanilhaParaSalvar
  ): Promise<RelatorioSalvo> {
    return request<RelatorioSalvo>(`/api/ordens-servico/${osId}/relatorio`, {
      method: 'POST',
      body: JSON.stringify({
        dados,
        planilhaNome: planilha?.nome,
        planilhaBase64: planilha?.base64,
      }),
    });
  },

  /** Baixa a planilha salva da OS, em base64 (para abrir ou compartilhar). */
  async baixarPlanilhaBase64(osId: number): Promise<string> {
    return requestBase64(`/api/ordens-servico/${osId}/relatorio/planilha`);
  },

  /** Busca o relatório salvo da OS. Devolve null se ainda não existe. */
  async buscar(osId: number): Promise<RelatorioSalvo | null> {
    try {
      return await request<RelatorioSalvo>(`/api/ordens-servico/${osId}/relatorio`);
    } catch (erro: any) {
      if (String(erro?.message ?? '').includes('não encontrado')) return null;
      throw erro;
    }
  },
};
