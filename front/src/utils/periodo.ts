// Filtro de período (dia / semana / mês) para as métricas do dashboard.
//
// As datas das tarefas são rótulos de texto (ex.: '28/Out, 14:20', 'Hoje, 09:30',
// 'Ontem', 'Hoje, agora'). Este módulo converte esses rótulos em Date para poder
// comparar com o período escolhido. Rótulos que não podem ser interpretados
// retornam null e ficam fora dos filtros de período.

export type Periodo = 'dia' | 'semana' | 'mes';

export const PERIODOS: Array<{ key: Periodo; label: string; descricao: string }> = [
  { key: 'dia', label: 'Dia', descricao: 'Hoje' },
  { key: 'semana', label: 'Semana', descricao: 'Últimos 7 dias' },
  { key: 'mes', label: 'Mês', descricao: 'Mês atual' },
];

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function parseDataLabel(label: string | undefined, agora: Date): Date | null {
  if (!label) return null;

  const [parteData = '', parteHora = ''] = label
    .trim()
    .toLowerCase()
    .split(',')
    .map((s) => s.trim());

  if (parteHora === 'agora') return agora;

  let base: Date | null = null;

  if (parteData === 'hoje') {
    base = inicioDoDia(agora);
  } else if (parteData === 'ontem') {
    base = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1);
  } else {
    const match = parteData.match(/^(\d{1,2})\/([a-zç]{3,}|\d{1,2})/);
    if (match) {
      const dia = Number(match[1]);
      const mesTxt = match[2];
      const mes = /^\d+$/.test(mesTxt) ? Number(mesTxt) - 1 : MESES.indexOf(mesTxt.slice(0, 3));
      if (mes < 0 || mes > 11) return null;

      let candidata = new Date(agora.getFullYear(), mes, dia);
      // Data sem ano: se cair no futuro, pertence ao ano anterior.
      if (candidata.getTime() > agora.getTime()) {
        candidata = new Date(agora.getFullYear() - 1, mes, dia);
      }
      base = candidata;
    }
  }

  if (!base) return null;

  const hora = parteHora.match(/^(\d{1,2}):(\d{2})/);
  if (hora) base.setHours(Number(hora[1]), Number(hora[2]), 0, 0);

  return base;
}

export function dentroDoPeriodo(data: Date | null, periodo: Periodo, agora: Date): boolean {
  if (!data) return false;

  const hoje = inicioDoDia(agora);

  if (periodo === 'dia') {
    return inicioDoDia(data).getTime() === hoje.getTime();
  }

  if (periodo === 'semana') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 6);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
    return data >= inicio && data < fim;
  }

  return data.getFullYear() === agora.getFullYear() && data.getMonth() === agora.getMonth();
}

export interface TarefaComData {
  concluida: boolean;
  dataCriacao: string;
  dataConclusao?: string;
}

// Conta tarefas concluídas (pela data de conclusão) e criadas (pela data de criação)
// dentro do período escolhido.
export function resumoDoPeriodo(tarefas: TarefaComData[], periodo: Periodo, agora: Date) {
  let concluidas = 0;
  let criadas = 0;

  for (const t of tarefas) {
    if (t.concluida && dentroDoPeriodo(parseDataLabel(t.dataConclusao, agora), periodo, agora)) {
      concluidas++;
    }
    if (dentroDoPeriodo(parseDataLabel(t.dataCriacao, agora), periodo, agora)) {
      criadas++;
    }
  }

  return { concluidas, criadas };
}
