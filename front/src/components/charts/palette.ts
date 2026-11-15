// Paleta de dados do Avalliar (derivada dos tokens da marca e validada com
// o validador de paleta do skill dataviz: CVD ΔE 9.4 entre verde e vermelho).
//
// Papel de cada cor:
//  - concluida / pendente: série categórica (verde x vermelho), sempre com legenda
//  - taxa:                 métrica de progresso em um único tom (azul)
//  - urgencia:             status (com ícone + rótulo, nunca só cor)

export const chartColors = {
  concluida: '#16A34A',
  pendente: '#C61010',
  taxa: '#2563EB',
  track: '#E2E8F0',
  grid: '#E2E8F0',
  axis: '#64748B',
  ink: '#0F172A',
  inkSecondary: '#475569',
  urgencia: {
    ALTA: '#C61010',
    MEDIA: '#D97706',
    BAIXA: '#16A34A',
  },
} as const;
