// Avisos por tentar partilhar contactos antes da apresentação (decisão de 21/10/2026):
// 1.ª tentativa: aviso; 2.ª: último aviso; 3.ª: conta bloqueada para sempre.
// Um desbloqueio é sempre uma decisão da equipa da plataforma.

export const MAX_STRIKES = 3;
export type StrikeLevel = 'aviso' | 'ultimo' | 'bloqueada';

export interface StrikeInfo {
  n: number;
  max: number;
  level: StrikeLevel;
  titulo: string;
  texto: string;
}

export function strikeLevel(n: number): StrikeInfo {
  if (n >= MAX_STRIKES) {
    return {
      n: MAX_STRIKES,
      max: MAX_STRIKES,
      level: 'bloqueada',
      titulo: 'Conta bloqueada',
      texto:
        'Foi detetada, pela terceira vez, uma tentativa de partilhar contactos ou de contornar a plataforma. A conta foi bloqueada e não poderá voltar a ser usada.',
    };
  }
  if (n === 2) {
    return {
      n,
      max: MAX_STRIKES,
      level: 'ultimo',
      titulo: 'Último aviso',
      texto:
        'Voltou a tentar partilhar contactos ou a contornar a plataforma. Se tentar de novo, a conta será bloqueada de forma permanente e não poderá voltar à plataforma.',
    };
  }
  return {
    n: Math.max(1, n),
    max: MAX_STRIKES,
    level: 'aviso',
    titulo: 'Aviso: contactos só depois da apresentação',
    texto:
      'A mensagem tem dados de contacto, localização ou um pedido para tratar do negócio fora da plataforma. Estes dados só são trocados depois da apresentação. Não foi enviada. Repetir a tentativa tem consequências, até ao bloqueio da conta.',
  };
}
