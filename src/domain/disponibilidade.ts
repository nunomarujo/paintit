/**
 * A suspensão de presença de um avaliador («esta semana não estou», férias, baixa).
 *
 * A data guardada é o **último dia** da suspensão, hora de Lisboa: até ao fim desse dia não chegam
 * oportunidades novas, e no dia seguinte a pessoa volta a estar disponível sem fazer nada. A base diz o
 * mesmo em `private.avaliador_disponivel` — se uma mudar, a outra muda.
 */

const FUSO = 'Europe/Lisbon';
const MS_DIA = 86_400_000;

/** «2026-11-05» — o dia civil de Lisboa a que o instante pertence. */
export function diaDeLisboa(instante: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    instante,
  );
}

export type Suspensao = {
  /** O último dia da suspensão, «AAAA-MM-DD». */
  ate: string;
  /** «5 de novembro». */
  ateEmPalavras: string;
  /** 0 = termina hoje. */
  diasRestantes: number;
};

/** Devolve a suspensão em curso, ou `null` se a pessoa está disponível (sem data, ou data já passada). */
export function suspensaoEmCurso(agora: Date, ate: string | null | undefined): Suspensao | null {
  if (!ate) return null;
  const hoje = diaDeLisboa(agora);
  if (ate < hoje) return null;
  // Os dois são dias civis, lidos como UTC ao meio-dia: a diferença é um número inteiro de dias, sem
  // que a mudança de hora de março e de outubro (23 e 25 horas) a desfaça.
  const dias = Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${hoje}T12:00:00Z`)) / MS_DIA);
  const ateEmPalavras = new Intl.DateTimeFormat('pt-PT', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(
    new Date(`${ate}T12:00:00Z`),
  );
  return { ate, ateEmPalavras, diasRestantes: dias };
}

/** «Termina hoje», «Falta 1 dia», «Faltam 4 dias». */
export function faltaParaVoltar(s: Suspensao): string {
  if (s.diasRestantes === 0) return 'Termina hoje';
  if (s.diasRestantes === 1) return 'Falta 1 dia';
  return `Faltam ${s.diasRestantes} dias`;
}
