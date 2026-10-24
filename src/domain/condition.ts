// Estado e patologias de uma zona da obra, anotados pelo avaliador na visita (pedido do promotor,
// 24/10/2026: "anotação de estado e características (rachadelas: sim, muitas > nota de 0 a 10 com
// desenho ilustrativo, sendo 1 o nível suave e 10 um nível tremendo)").
//
// Porque é que isto existe em vez de mais fotografias: uma fotografia de fachada identifica o prédio e
// não se consegue anonimizar com um filtro (ver docs/FOTOGRAFIAS.md). O que o pintor precisa para
// orçamentar não é ver o prédio — é saber **o que está mau, onde, e quanto**. Uma escala comparável entre
// obras dá-lhe isso sem revelar nada, e ainda tem a vantagem de ser somável e verificável, o que uma
// fotografia nunca é.

export const PATHOLOGIES = [
  'fissuras',
  'humidade',
  'tinta_destacada',
  'fungos_algas',
  'reboco_degradado',
  'eflorescencias',
  'ferrugem',
] as const;
export type Pathology = (typeof PATHOLOGIES)[number];

export const PATHOLOGY_LABELS: Record<Pathology, string> = {
  fissuras: 'Fissuras e rachadelas',
  humidade: 'Humidade',
  tinta_destacada: 'Tinta a destacar ou empolada',
  fungos_algas: 'Fungos, algas ou bolor',
  reboco_degradado: 'Reboco degradado ou a desfazer-se',
  eflorescencias: 'Eflorescências (salitre)',
  ferrugem: 'Ferrugem em elementos metálicos',
};

/** O que o avaliador deve procurar em cada patologia — vai para o (i) do campo. */
export const PATHOLOGY_HINTS: Record<Pathology, string> = {
  fissuras: 'Largura, direção e se atravessam o reboco até ao suporte. As que seguem as juntas da estrutura contam mais do que as de superfície.',
  humidade: 'Manchas, tinta a escurecer, cheiro. Procure a origem: infiltração pela cobertura, capilaridade junto ao solo, ou rotura.',
  tinta_destacada: 'Áreas onde a tinta levanta à unha, empola ou cai em placas. Indica má aderência da camada anterior.',
  fungos_algas: 'Manchas verdes, pretas ou acinzentadas, em geral a norte e onde a água escorre ou não seca.',
  reboco_degradado: 'Reboco oco (soa a vazio à pancada), a esfarelar, ou já caído.',
  eflorescencias: 'Crosta branca de sais à superfície, sinal de água a atravessar o material.',
  ferrugem: 'Guardas, grades, portões, caixilhos e ferro à vista em betão degradado.',
};

/**
 * A escala do promotor: 0 é ausência, 1 é o nível suave, 10 é o nível tremendo. Fica propositadamente
 * com os extremos que ele definiu, em vez de uma escala de 1 a 5 como as avaliações — aqui o que se mede
 * é gravidade física, e o avaliador precisa de espaço para distinguir "algumas fissuras finas" de "a
 * fachada está a abrir".
 */
export const SEVERITY_MIN = 0;
export const SEVERITY_MAX = 10;
export type Severity = number;

export type SeverityBand = 'nenhum' | 'ligeiro' | 'moderado' | 'grave';

export const SEVERITY_BAND_LABELS: Record<SeverityBand, string> = {
  nenhum: 'Sem ocorrência',
  ligeiro: 'Ligeiro',
  moderado: 'Moderado',
  grave: 'Grave',
};

export function severityBand(n: Severity): SeverityBand {
  if (n <= 0) return 'nenhum';
  if (n <= 3) return 'ligeiro';
  if (n <= 6) return 'moderado';
  return 'grave';
}

export function isSeverity(n: number): boolean {
  return Number.isInteger(n) && n >= SEVERITY_MIN && n <= SEVERITY_MAX;
}

/** Uma linha de anotação: a patologia, o quanto, e o que o avaliador escreveu. */
export interface ConditionNote {
  pathology: Pathology;
  severity: Severity;
  nota: string;
  /** Quantas fotografias de pormenor foram juntas a esta linha. */
  fotos: number;
}

/**
 * A partir de que gravidade se exige fotografia. Acima de ligeiro, uma anotação sem fotografia não chega:
 * é sobre isso que o pintor vai orçamentar, e é a primeira coisa que ele vai querer ver.
 */
export const SEVERITY_REQUIRING_PHOTO = 4;

export function missingPhotos(notes: readonly ConditionNote[]): Pathology[] {
  return notes.filter((n) => n.severity >= SEVERITY_REQUIRING_PHOTO && n.fotos === 0).map((n) => n.pathology);
}

/** O que falta antes de o levantamento poder ser dado por concluído. */
export function conditionBlockers(notes: readonly ConditionNote[]): string[] {
  const blockers: string[] = [];
  for (const p of missingPhotos(notes)) {
    blockers.push(`${PATHOLOGY_LABELS[p]}: com gravidade ${SEVERITY_REQUIRING_PHOTO} ou mais, junte pelo menos uma fotografia de pormenor.`);
  }
  for (const n of notes) {
    if (!isSeverity(n.severity)) blockers.push(`${PATHOLOGY_LABELS[n.pathology]}: indique uma gravidade de 0 a 10.`);
  }
  return blockers;
}

/** Resumo para o anúncio: só o que tem ocorrência, do mais grave para o menos. */
export function summaryForListing(notes: readonly ConditionNote[]): { pathology: Pathology; severity: Severity; band: SeverityBand }[] {
  return notes
    .filter((n) => n.severity > 0)
    .slice()
    .sort((a, b) => b.severity - a.severity)
    .map((n) => ({ pathology: n.pathology, severity: n.severity, band: severityBand(n.severity) }));
}
