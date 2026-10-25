// Diário fotográfico da obra (25/10/2026, docs/DECISOES.md).
//
// Seis meses depois da obra aparecem bolhas ou manchas. Sem registo do estado do suporte **antes** de
// se pintar, e sem saber que produto foi aplicado, a discussão perde-se por omissão — a empresa não
// consegue mostrar o que encontrou nem o que fez.
//
// A data que vale é a do servidor, não a da fotografia: os metadados da imagem perdem-se ao exportar,
// mudam de fuso e alteram-se com facilidade. Aliás, a aplicação apaga-os antes de guardar, como já faz
// com as fotografias dos pedidos — levam GPS e modelo do aparelho, que ninguém precisa de guardar.

export const FASES = ['antes', 'preparacao', 'durante', 'depois'] as const;
export type Fase = (typeof FASES)[number];

export const FASE_LABELS: Record<Fase, string> = {
  antes: 'Antes de começar',
  preparacao: 'Preparação',
  durante: 'Durante',
  depois: 'Depois de concluído',
};

/** Por que é que cada fase interessa — aparece no ecrã, para o registo não parecer burocracia. */
export const FASE_PORQUE: Record<Fase, string> = {
  antes: 'O estado em que encontrou o suporte. É esta que o defende numa reclamação.',
  preparacao: 'Lavagem, fissuras tratadas, primário aplicado. Prova o que foi feito por baixo da tinta.',
  durante: 'Demãos e trabalhos em curso, com o produto que está a aplicar.',
  depois: 'O resultado. Serve de prova e serve de portefólio.',
};

export const isFase = (v: unknown): v is Fase => typeof v === 'string' && (FASES as readonly string[]).includes(v);

export interface FotoDiario {
  id: string;
  fase: Fase;
  zona: string | null;
  produto: string | null;
  legenda: string | null;
  /** Data do servidor no momento em que entrou. */
  registadaEm: string;
}

export interface DiarioErrors {
  [campo: string]: string;
}

export function diaryErrors(input: { fase: unknown; legenda: string; zona: string; produto: string }): DiarioErrors {
  const errors: DiarioErrors = {};
  if (!isFase(input.fase)) errors.fase = 'Escolha a fase da obra.';
  if (input.legenda.length > 300) errors.legenda = 'Até 300 caracteres.';
  if (input.zona.length > 120) errors.zona = 'Até 120 caracteres.';
  if (input.produto.length > 160) errors.produto = 'Até 160 caracteres.';
  return errors;
}

/** As fotografias agrupadas por fase, pela ordem em que a obra acontece. */
export function porFase(fotos: FotoDiario[]): { fase: Fase; fotos: FotoDiario[] }[] {
  return FASES.map((fase) => ({
    fase,
    fotos: fotos.filter((f) => f.fase === fase).sort((a, b) => a.registadaEm.localeCompare(b.registadaEm)),
  })).filter((g) => g.fotos.length > 0);
}

/**
 * O que falta ao diário para servir de prova. Não impede nada — avisa, que é o que se pode fazer
 * quando a obra já começou e a fotografia do "antes" já não é possível.
 */
export function faltas(fotos: FotoDiario[]): string[] {
  const tem = new Set(fotos.map((f) => f.fase));
  const out: string[] = [];
  if (!tem.has('antes')) {
    out.push('Sem fotografias do antes. São as que mostram o estado em que encontrou o suporte, e as que mais falta fazem numa reclamação.');
  }
  if (fotos.length > 0 && !fotos.some((f) => f.produto)) {
    out.push('Nenhuma fotografia diz que produto foi aplicado. Sem isso, não há como provar que se cumpriu o sistema proposto.');
  }
  return out;
}
