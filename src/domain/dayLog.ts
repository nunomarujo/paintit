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

/** Máximo de horas que uma pessoa pode ter num dia, somando todas as obras. */
export const MAXIMO_DIARIO = 2400;

/** A partir daqui o dia é possível mas merece um olhar: ninguém pinta catorze horas por engano. */
export const AVISO_DIARIO = 1200;

export interface HorasNoutraObra {
  pessoaId: string;
  obra: string;
  horas: number;
}

export interface ConflitoDeDia {
  pessoaId: string;
  nome: string;
  /** Horas que esta pessoa já tem noutras obras, nesta data. */
  noutrasObras: number;
  total: number;
  /** Impede guardar. */
  erro?: string;
  /** Deixa guardar, mas diz. */
  aviso?: string;
}

/**
 * O dia de uma pessoa somado em todas as obras.
 *
 * Cada obra guardava as suas horas sem saber das outras, e o limite de 24 horas era por linha — o
 * que deixava passar a mesma pessoa com um dia inteiro em dois sítios. Com o dia repartido que a
 * Gestão de Obra introduz, isto deixa de ser teórico (25/10/2026).
 *
 * Note-se o que **não** se faz aqui: não se recusa um dia repartido, que é legítimo e frequente.
 * Recusa-se um dia impossível.
 */
export function conflitosDoDia(
  presencas: { memberId: string; pessoaId: string | null; nome: string; horas: number }[],
  noutrasObras: HorasNoutraObra[],
): ConflitoDeDia[] {
  const conflitos: ConflitoDeDia[] = [];
  for (const p of presencas) {
    if (!p.pessoaId || p.horas <= 0) continue;
    const outras = noutrasObras.filter((o) => o.pessoaId === p.pessoaId);
    const jaFeitas = outras.reduce((n, o) => n + o.horas, 0);
    if (jaFeitas === 0) continue;
    const total = jaFeitas + p.horas;
    const onde = [...new Set(outras.map((o) => o.obra))].join(' e ');
    const base = { pessoaId: p.pessoaId, nome: p.nome, noutrasObras: jaFeitas, total };
    if (total > MAXIMO_DIARIO) {
      conflitos.push({
        ...base,
        erro: `${p.nome} ficaria com ${formatHoras(total)} horas neste dia — já tem ${formatHoras(jaFeitas)} em ${onde}.`,
      });
    } else if (total > AVISO_DIARIO) {
      conflitos.push({
        ...base,
        aviso: `${p.nome} fica com ${formatHoras(total)} horas neste dia, contando ${formatHoras(jaFeitas)} em ${onde}.`,
      });
    }
  }
  return conflitos;
}
