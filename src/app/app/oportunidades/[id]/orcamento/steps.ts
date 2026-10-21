export type StepId = 'trabalhos' | 'precos' | 'condicoes' | 'rever';
export const STEP_IDS: StepId[] = ['trabalhos', 'precos', 'condicoes', 'rever'];
export const STEP_LABELS: Record<StepId, string> = { trabalhos: 'Trabalhos', precos: 'Preços', condicoes: 'Condições', rever: 'Rever' };
