import type { ElementosDaParte } from './contracting';
import { minutaComElementos } from './contracting';
import { isValidPtIban } from './referral';

// Os elementos de cada parte que o contrato indica: IBAN, telefone, email para correspondência
// (decisão do promotor, 06/11/2026; `docs/DECISOES.md`).
//
// - Registam-se **depois da apresentação** (as partes já se conhecem, regra 6) e **até à primeira
//   assinatura**. Até aí, quem se enganou ou mudou corrige — e a outra parte é avisada de cada campo.
// - Nada se apaga: cada alteração é uma linha nova (`elementos_do_contrato`), e o valor em vigor é o
//   mais recente. O histórico diz quem alterou, quando, e como foi confirmado.
// - Depois da primeira assinatura, a aplicação não altera nada: é por adenda, entre as partes.
// - O email novo confirma-se com um código de 6 algarismos enviado para ele, a menos que seja o
//   mesmo do início de sessão de quem o indica («validado antecipadamente pelo início de sessão»).
// - O telefone não se valida (o promotor só pediu para o email; SMS tem custo — pergunta em aberto).
// - IBAN português por ora (`isValidPtIban`, com o algarismo de controlo). Contas estrangeiras: em aberto.
//
// Não é o `supplier_payout_details` (IBAN por entidade, para pagar comissões a fornecedores): este é por
// contrato, de cada parte, e tem outro fim.

export const LADOS = ['cliente', 'pintor'] as const;
export type Lado = (typeof LADOS)[number];
export const CAMPOS = ['iban', 'telefone', 'email'] as const;
export type Campo = (typeof CAMPOS)[number];
export const CAMPO_LABELS: Record<Campo, string> = { iban: 'IBAN', telefone: 'Telefone', email: 'Email para correspondência' };

export const VALIDACOES = ['sem_validacao', 'codigo', 'inicio_de_sessao'] as const;
export type Validacao = (typeof VALIDACOES)[number];
export const VALIDACAO_LABELS: Record<Validacao, string> = {
  sem_validacao: 'sem validação',
  codigo: 'validado por código',
  inicio_de_sessao: 'validado antecipadamente pelo início de sessão',
};

export const isLado = (v: unknown): v is Lado => v === 'cliente' || v === 'pintor';
export const isCampo = (v: unknown): v is Campo => typeof v === 'string' && (CAMPOS as readonly string[]).includes(v);

/** «pt50 0002 0123…» → «PT500002…»; `null` se não for um IBAN português válido. */
export function normalizarIban(texto: string): string | null {
  const iban = texto.replace(/[\s.-]/g, '').toUpperCase();
  return isValidPtIban(iban) ? iban : null;
}

/** «+351 912 345 678» → «+351912345678»; 9 a 15 algarismos, com o «+» opcional. */
export function normalizarTelefone(texto: string): string | null {
  const t = texto.replace(/[\s().-]/g, '');
  return /^\+?\d{9,15}$/.test(t) ? t : null;
}

export function normalizarEmail(texto: string): string | null {
  const e = texto.trim().toLowerCase();
  return e.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null;
}

export function normalizar(campo: Campo, texto: string): string | null {
  return campo === 'iban' ? normalizarIban(texto) : campo === 'telefone' ? normalizarTelefone(texto) : normalizarEmail(texto);
}

export const ERRO_DO_CAMPO: Record<Campo, string> = {
  iban: 'Indique um IBAN português válido (PT50 e 21 algarismos).',
  telefone: 'Indique um número de telefone, com 9 a 15 algarismos.',
  email: 'Indique um email válido.',
};

/** Nas listas, o IBAN não aparece por inteiro: «PT50 ··· 9015 4». */
export function mascararIban(iban: string): string {
  const i = iban.replace(/\s/g, '');
  return i.length < 9 ? '···' : `${i.slice(0, 4)} ··· ${i.slice(-5, -1)} ${i.slice(-1)}`;
}

export interface LinhaDeElemento {
  lado: Lado;
  campo: Campo;
  valor: string;
  validacao: Validacao;
  criadoEm: string;
  criadoPor: string;
}

const VAZIO: ElementosDaParte = { iban: null, telefone: null, email: null };

/** O em vigor de cada parte: o valor mais recente de cada campo. */
export function emVigor(linhas: readonly LinhaDeElemento[]): { cliente: ElementosDaParte; pintor: ElementosDaParte } {
  const out = { cliente: { ...VAZIO }, pintor: { ...VAZIO } };
  const quando: Record<string, string> = {};
  for (const l of linhas) {
    const k = `${l.lado}.${l.campo}`;
    if (quando[k] !== undefined && quando[k]! > l.criadoEm) continue;
    quando[k] = l.criadoEm;
    out[l.lado][l.campo] = l.valor;
  }
  return out;
}

/** O que muda de facto: um valor igual ao que está em vigor não se regista outra vez. */
export const mudaAlgo = (atual: ElementosDaParte, campo: Campo, valor: string) => atual[campo] !== valor;

/**
 * Pode alterar agora? A mesma regra que a base aplica (`private.elementos_alteraveis`): com a minuta
 * nova, depois da apresentação e antes da primeira assinatura registada.
 */
export function podeAlterar(e: { minuta: string | null; apresentada: boolean; algumaAssinatura: boolean }): boolean {
  return minutaComElementos(e.minuta) && e.apresentada && !e.algumaAssinatura;
}

/**
 * O IBAN do empreiteiro tem de estar no contrato antes de o cliente o assinar (T3.1): sem ele o PDF que
 * o cliente assina não diria para onde vão as tranches. `null` = pode assinar.
 */
export function faltaParaAssinar(minuta: string | null, elementos: { pintor: ElementosDaParte }): string | null {
  if (!minutaComElementos(minuta)) return null;
  return elementos.pintor.iban ? null : 'O empreiteiro ainda não indicou o IBAN para o contrato. O contrato fica pronto a assinar quando o indicar.';
}

// --- Código de confirmação do email ------------------------------------------------

/** Validade do código, em minutos. Proposta do chat, ajustável. */
export const CODIGO_VALIDADE_MIN = 10;
/** Tentativas por código, antes de o código deixar de servir. */
export const CODIGO_MAX_TENTATIVAS = 5;
/** Códigos pedidos por hora, por contratação e parte. */
export const CODIGO_MAX_ENVIOS_HORA = 3;

export interface EstadoDoCodigo {
  expiraEm: string;
  tentativas: number;
  usadoEm: string | null;
}

/** Ainda serve? Por usar, dentro da validade e com tentativas por gastar. */
export function codigoServe(c: EstadoDoCodigo, agora: Date): boolean {
  return c.usadoEm === null && c.tentativas < CODIGO_MAX_TENTATIVAS && Date.parse(c.expiraEm) > agora.getTime();
}

/** Seis algarismos, nem mais nem menos (espaços tolerados). */
export function lerCodigo(texto: string): string | null {
  const c = texto.replace(/\s/g, '');
  return /^\d{6}$/.test(c) ? c : null;
}

/** O que o histórico diz de uma linha: «IBAN · PT50 ··· 9015 4 · validado por código». */
export function linhaDoHistorico(l: LinhaDeElemento, mascarar = true): string {
  const valor = l.campo === 'iban' && mascarar ? mascararIban(l.valor) : l.valor;
  return `${CAMPO_LABELS[l.campo]} · ${valor} · ${VALIDACAO_LABELS[l.validacao]}`;
}
