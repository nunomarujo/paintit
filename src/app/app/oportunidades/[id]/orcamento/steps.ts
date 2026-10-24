export type StepId = 'trabalhos' | 'capoto' | 'precos' | 'condicoes' | 'rever';
export const STEP_IDS: StepId[] = ['trabalhos', 'capoto', 'precos', 'condicoes', 'rever'];
export const STEP_LABELS: Record<StepId, string> = {
  trabalhos: 'Trabalhos',
  capoto: 'Capoto',
  precos: 'Preços',
  condicoes: 'Condições',
  rever: 'Rever',
};
