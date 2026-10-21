// Plano de contas (SNC, simplificado) proposto em docs/CONTABILIDADE.md §9. A base de dados tem o mesmo plano
// (migração livro_de_movimentos); um teste confirma que os códigos usados no código existem lá.

export type Nature = 'devedora' | 'credora';

export const ACCOUNTS = {
  banco: { codigo: '12.1', nome: 'Depósitos à ordem: EuroBic', natureza: 'devedora' },
  stripe: { codigo: '13.1', nome: 'Outros depósitos: saldo Stripe', natureza: 'devedora' },
  clientesPintores: { codigo: '21.1', nome: 'Clientes: pintores', natureza: 'devedora' },
  clientesFornecedores: { codigo: '21.2', nome: 'Clientes: fornecedores', natureza: 'devedora' },
  clientesCaucoes: { codigo: '21.3', nome: 'Clientes: cauções retidas', natureza: 'devedora' },
  fornecedoresTintas: { codigo: '22.1', nome: 'Fornecedores: tintas (comissões de adesão)', natureza: 'credora' },
  fornecedoresOutros: { codigo: '22.2', nome: 'Fornecedores: Stripe e outros', natureza: 'credora' },
  retencoes: { codigo: '24.2', nome: 'Retenções na fonte (IRS/IRC)', natureza: 'credora' },
  ivaDedutivel: { codigo: '24.32', nome: 'IVA dedutível', natureza: 'devedora' },
  ivaLiquidado: { codigo: '24.33', nome: 'IVA liquidado', natureza: 'credora' },
  caucoesTerceiros: { codigo: '27.8.1', nome: 'Cauções de clientes (valores de terceiros)', natureza: 'credora' },
  gastoAdesao: { codigo: '62.2.1', nome: 'Comissões de adesão a fornecedores', natureza: 'devedora' },
  gastoStripe: { codigo: '62.2.2', nome: 'Comissões e taxas de pagamento (Stripe)', natureza: 'devedora' },
  recComissoes: { codigo: '72.1', nome: 'Comissões de sucesso (pintores)', natureza: 'credora' },
  recSubscricoes: { codigo: '72.2', nome: 'Subscrições de fornecedores', natureza: 'credora' },
  recCaucoes: { codigo: '72.3', nome: 'Cauções retidas', natureza: 'credora' },
} as const satisfies Record<string, { codigo: string; nome: string; natureza: Nature }>;

export type AccountKey = keyof typeof ACCOUNTS;
export const ACCOUNT_LIST = Object.values(ACCOUNTS);
export const accountName = (codigo: string) => ACCOUNT_LIST.find((a) => a.codigo === codigo)?.nome ?? codigo;
