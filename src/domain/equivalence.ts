// Produto «ou equivalente» (decisão de 21/10/2026). A equivalência assenta em características verificáveis;
// o preço de referência é só um limite de segurança. A decisão em caso de desacordo é matéria jurídica, não da
// plataforma: o contrato e a proposta limitam-se a expor os termos. Texto sujeito a parecer jurídico.

/** Diferença máxima do preço de referência de mercado, em pontos-base (10%). */
export const EQUIVALENT_TOLERANCE_BPS = 1000;
export const EQUIVALENT_LABEL = 'ou equivalente';

const pct = `${EQUIVALENT_TOLERANCE_BPS / 100}%`;

/** Os termos, ditos da mesma forma na caixa de ajuda, na proposta e no contrato. */
export const EQUIVALENT_RULE = `Produto «${EQUIVALENT_LABEL}»: o pintor pode aplicar outro produto, desde que tenha características técnicas iguais ou superiores (tipo, uso, acabamento, rendimento e classe técnica) e que o preço de referência de mercado não difira mais de ${pct} do produto indicado.`;

export const EQUIVALENT_PROPOSAL_NOTE = `${EQUIVALENT_RULE} Qualquer diferença visível para o cliente (por exemplo, a cor) tem de ser indicada pelo pintor e aceite por escrito antes da aplicação. Consultar as fichas técnicas dos produtos.`;

/** Chave, dentro de `campos`, que assinala que o campo de produto admite equivalente. */
export const equivalentFlag = (fieldKey: string) => `${fieldKey}~eq`;
export const hasEquivalent = (text: string | null | undefined) => (text ?? '').includes(EQUIVALENT_LABEL);

/** Interruptor até haver parecer jurídico: a opção só aparece ao pintor com NEXT_PUBLIC_EQUIVALENTE=1. */
export const equivalentEnabled = () => process.env.NEXT_PUBLIC_EQUIVALENTE === '1';
