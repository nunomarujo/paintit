// O que o condomínio quer fazer no prédio, registado na ficha do prédio (pedido do promotor,
// 24/10/2026: "descrever que obras quer neste momento fazer: pinturas, revestimento, caleiras,
// telhado, etc").
//
// **A plataforma continua a ser só de pintura.** O promotor nomeou trabalhos que estão fora disso
// (caleiras, telhado, revestimento), e, na falta de decisão dele em contrário, a leitura adotada é a
// conservadora: tudo se **regista** — para o avaliador saber o que vai encontrar e o condomínio não ter
// de fingir que só quer pintura — mas só os trabalhos de pintura se **orçamentam** aqui. Alargar o
// âmbito a outras especialidades é decisão de modelo de negócio (alvarás diferentes, quem orçamenta,
// comissão) e não se toma por omissão.

export const BUILDING_NEEDS = [
  'pintura_exterior',
  'pintura_interior',
  'revestimento_fachada',
  'isolamento_capoto',
  'impermeabilizacao',
  'caleiras_algerozes',
  'telhado_cobertura',
  'serralharia',
  'carpintaria',
  'outro',
] as const;
export type BuildingNeed = (typeof BUILDING_NEEDS)[number];

export const BUILDING_NEED_LABELS: Record<BuildingNeed, string> = {
  pintura_exterior: 'Pintura exterior (fachadas, varandas, muros)',
  pintura_interior: 'Pintura interior (escadas, átrios, zonas comuns)',
  revestimento_fachada: 'Revestimento de fachada (reboco, cerâmico)',
  isolamento_capoto: 'Isolamento pelo exterior (capoto)',
  impermeabilizacao: 'Impermeabilização (terraços, varandas)',
  caleiras_algerozes: 'Caleiras e algerozes',
  telhado_cobertura: 'Telhado ou cobertura',
  serralharia: 'Serralharia (grades, portões, guardas)',
  carpintaria: 'Carpintaria (portas, janelas, madeiras)',
  outro: 'Outro trabalho',
};

/** Trabalhos que a plataforma orçamenta hoje. Os restantes registam-se, mas não geram pedido. */
const QUOTABLE: readonly BuildingNeed[] = ['pintura_exterior', 'pintura_interior', 'impermeabilizacao', 'isolamento_capoto'];

export function isQuotableNeed(need: BuildingNeed): boolean {
  return QUOTABLE.includes(need);
}

export function isBuildingNeed(value: string): value is BuildingNeed {
  return (BUILDING_NEEDS as readonly string[]).includes(value);
}

/** Separa o que se pode pedir aqui do que fica só registado para o avaliador ver. */
export function splitNeeds(needs: readonly string[]): { orcamentaveis: BuildingNeed[]; soRegistados: BuildingNeed[] } {
  const validos = needs.filter(isBuildingNeed);
  return {
    orcamentaveis: validos.filter(isQuotableNeed),
    soRegistados: validos.filter((n) => !isQuotableNeed(n)),
  };
}

/** Há alguma obra assinalada que a plataforma orçamente? É o que faz aparecer o convite a pedir
 * orçamentos na ficha do prédio. */
export function canStartRequest(needs: readonly string[]): boolean {
  return splitNeeds(needs).orcamentaveis.length > 0;
}
