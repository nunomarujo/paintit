// Dados públicos da empresa dona da plataforma (declaração de início de atividade, 16/05/2024).
// O IBAN e as credenciais (banco, software de faturação) NÃO ficam aqui: só em variáveis na Vercel.
export const COMPANY = {
  name: 'RELEVANTEPLANETA, UNIPESSOAL LDA',
  nif: '517588676',
  address: 'Rua Salvato Feijó, Torre Active Centre, loja Y',
  postalCode: '4900-415',
  city: 'Viana do Castelo',
  country: 'PT',
  legalForm: 'Sociedade unipessoal por quotas',
  /** Atividade registada; a confirmar com o contabilista se cobre a intermediação (ver docs/CONTABILIDADE.md). */
  cae: '74900',
  email: 'nm@quempinta.pt',
  bank: 'EuroBic',
  vatPeriodicity: 'trimestral',
} as const;
