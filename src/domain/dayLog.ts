// "Registar o dia" (25/10/2026, docs/DECISOES.md).
//
// A picagem de horas tem o maior retorno de todas as ferramentas de obra — sem ela não há margem
// real, porque ninguém sabe quantas horas foram a cada obra — e é também a que corre maior risco de
// nunca ser usada: exige disciplina diária de um gerente que não gosta de aplicações e que faz isto
// ao fim do dia, cansado.
//
// A aposta do desenho é toda numa ideia: **pré-preencher o dia normal e pedir só as excepções**. Quem
// trabalhou o dia todo com a equipa toda faz dois toques — abrir e guardar. É isso que decide se esta
// ferramenta vive ou morre, e é por isso que o dia normal não é um campo vazio.

/** Horas de um dia de trabalho normal, em centésimos de hora. */
export const DIA_NORMAL = 800;

export interface PresencaInput {
  memberId: string;
  /** Centésimos de hora; 0 = faltou. */
  horas: number;
}

export interface Presenca extends PresencaInput {
  nome: string;
}

/** O dia pré-preenchido: toda a gente activa, com o dia normal. */
export const diaPorOmissao = (membros: { id: string; nome: string }[]): Presenca[] =>
  membros.map((m) => ({ memberId: m.id, nome: m.nome, horas: DIA_NORMAL }));

export interface DiaErrors {
  [campo: string]: string;
}

/** Um dia só se guarda se alguém lá esteve, e ninguém faz mais de 24 horas. */
export function dayErrors(presencas: PresencaInput[], data: string): DiaErrors {
  const errors: DiaErrors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) errors.data = 'Data em AAAA-MM-DD.';
  if (presencas.some((p) => !Number.isInteger(p.horas) || p.horas < 0 || p.horas > 2400)) {
    errors.horas = 'Horas entre 0 e 24 por pessoa.';
  }
  if (presencas.every((p) => p.horas === 0)) errors.horas = 'Ninguém esteve na obra neste dia — não há nada a registar.';
  return errors;
}

/** As presenças que dão origem a lançamento: quem faltou não gera linha nenhuma. */
export const presencasEfetivas = (presencas: PresencaInput[]): PresencaInput[] => presencas.filter((p) => p.horas > 0);

/** Total de horas do dia, para o ecrã confirmar o que vai guardar. */
export const totalHoras = (presencas: PresencaInput[]): number => presencas.reduce((n, p) => n + p.horas, 0);

/** Formata centésimos de hora como "8", "7,5" ou "0,25". */
export const formatHoras = (centesimos: number): string =>
  (centesimos / 100).toLocaleString('pt-PT', { maximumFractionDigits: 2 });

/**
 * Resumo do que vai ser guardado, em palavras — o pintor confirma uma frase, não uma tabela. Quando
 * foi um dia normal para toda a gente, di-lo assim mesmo, que é o caso mais frequente.
 */
export function resumoDoDia(presencas: Presenca[]): string {
  const presentes = presencas.filter((p) => p.horas > 0);
  if (presentes.length === 0) return 'Ninguém na obra.';
  const faltaram = presencas.length - presentes.length;
  const todosNormal = presentes.every((p) => p.horas === DIA_NORMAL);

  const quem = presentes.length === 1 ? presentes[0]!.nome : `${presentes.length} pessoas`;
  const horas = todosNormal ? `${formatHoras(DIA_NORMAL)} horas cada` : `${formatHoras(totalHoras(presentes))} horas no total`;
  const ausencias = faltaram > 0 ? `, ${faltaram} ${faltaram === 1 ? 'falta' : 'faltas'}` : '';
  return `${quem}, ${horas}${ausencias}.`;
}
