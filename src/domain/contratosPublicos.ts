import type { Cents } from './money';
import { CPV_PINTURA } from './obrasPublicas';

// Mapa de Contratos Públicos: ler os contratos de empreitada já celebrados e saber quais são de
// pintura, para dizer ao pintor quem contrata pintura à volta dele e quem costuma ser convidado.
//
// A razão de ser está medida (25/10/2026, docs/DECISOES.md), na carga real e não na exploração: em
// 2026 houve 482 empreitadas de pintura, fachadas e isolamento, de 199 701 contratos; 326 (68%) foram
// por ajuste directo ou consulta prévia, que ninguém anuncia, e em 124 delas — mais de um terço — foi
// chamada uma empresa só. A lista de convidados é pública, quando a entidade a publica: falta em 113
// dos 326 convites, e é por isso que o mapa conta essa falta à parte.
//
// Fonte: "Contratos Públicos — Portal Base — IMPIC", em dados.gov.pt, domínio público, semanal.

/** O contrato como vem no ficheiro do portal BASE, nos campos que interessam. */
export interface ContratoBruto {
  tipoContrato: string[];
  objectoContrato: string;
  cpv: string[];
  tipoprocedimento: string;
}

/**
 * Palavras do objecto que identificam pintura por si só.
 *
 * Sem acentos e em minúsculas: o texto é normalizado antes de comparar, porque nos ficheiros do BASE
 * a mesma palavra aparece com e sem acento, em maiúsculas, e com entidades HTML por escapar.
 */
export const PALAVRAS_FORTES = [
  'pintur', 'repintur', 'caiac', 'barrament', 'estuque', 'capoto', 'etics',
  'isolamento termico', 'fachada', 'impermeabiliza', 'revestimento exterior',
];

// Deliberadamente fora da lista: "reabilitação", "requalificação", "conservação". São qualquer obra
// de edifício e, medidas no ficheiro de 2026, enchiam o mapa de obras que não são de pintura.

const CPV_NUCLEO = new Set(CPV_PINTURA.filter((c) => c.nucleo).map((c) => c.codigo.slice(0, 8)));
/** Os restantes CPV da família: confirmam, mas nunca decidem sozinhos. */
const CPV_AMPLO = new Set(CPV_PINTURA.filter((c) => !c.nucleo).map((c) => c.codigo.slice(0, 8)));

/** Minúsculas, sem acentos e sem entidades HTML, para comparar texto que vem sujo. */
export function normalizar(texto: string): string {
  return texto
    .replace(/&amp;/g, '&')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export type ViaDeDeteccao = 'cpv' | 'objecto' | 'ambos';

export interface Classificacao {
  pintura: boolean;
  via: ViaDeDeteccao | null;
  /** Alta quando o CPV é de pintura ou o objecto traz uma palavra inequívoca. */
  confianca: 'alta' | 'media' | null;
}

/**
 * É um contrato de pintura?
 *
 * Só empreitadas: uma aquisição de serviços de limpeza com a palavra "fachada" não é obra. O código
 * CPV é preenchido pela entidade adjudicante e engana-se muito — em 2026, 258 das 401 empreitadas de
 * pintura **não** tinham CPV de pintura, pelo que ler o objecto não é um luxo, é a maior parte do
 * trabalho.
 */
export function classificarContrato(c: ContratoBruto): Classificacao {
  const eEmpreitada = (c.tipoContrato ?? []).some((t) => normalizar(t).includes('empreitada'));
  if (!eEmpreitada) return { pintura: false, via: null, confianca: null };

  const codigos = (c.cpv ?? []).map((x) => String(x).slice(0, 8));
  const porCpvNucleo = codigos.some((x) => CPV_NUCLEO.has(x));
  const porCpvAmplo = codigos.some((x) => CPV_AMPLO.has(x));

  const objecto = normalizar(c.objectoContrato ?? '');
  const forte = PALAVRAS_FORTES.some((p) => objecto.includes(p));

  // Só o CPV de núcleo ou uma palavra inequívoca contam. Medido a 25/10/2026 nos 199 701 contratos
  // do ano: aceitar também os CPV amplos ('Outras obras de acabamento de edifícios') dava 2 034
  // contratos em vez de 401, e o que entrava a mais eram obras de recuperação de igrejas e
  // adaptações de instalações sanitárias. Um mapa assim perde-se à primeira consulta.
  if (!porCpvNucleo && !forte) return { pintura: false, via: null, confianca: null };

  const via: ViaDeDeteccao = porCpvNucleo && forte ? 'ambos' : porCpvNucleo ? 'cpv' : 'objecto';
  // Média: só um dos dois sinais, e o CPV amplo a condizer. Serve para mostrar, não para prometer.
  const confianca = porCpvNucleo && forte ? 'alta' : porCpvAmplo || forte ? 'alta' : 'media';
  return { pintura: true, via, confianca };
}

/** Por convite: ajuste directo e consulta prévia, que não são anunciados a ninguém. */
export function porConvite(tipoprocedimento: string): boolean {
  const t = normalizar(tipoprocedimento ?? '');
  return t.includes('ajuste direto') || t.includes('ajuste directo') || t.includes('consulta previa');
}

/** "Portugal, Braga, Barcelos" → distrito e concelho. Devolve null no que vier incompleto. */
export function lugar(localExecucao: string | null | undefined): { distrito: string | null; concelho: string | null } {
  const partes = (localExecucao ?? '').split(',').map((p) => p.trim()).filter(Boolean);
  return { distrito: partes[1] ?? null, concelho: partes[2] ?? null };
}

/** "500051062 - Município de Sintra" → NIF e nome, separados. */
export function entidade(bruta: string | null | undefined): { nif: string | null; nome: string } {
  const texto = (bruta ?? '').replace(/&amp;/g, '&').trim();
  const m = texto.match(/^(\d{9})\s*-\s*(.+)$/);
  return m ? { nif: m[1]!, nome: m[2]!.trim() } : { nif: null, nome: texto };
}

/**
 * O nome de um concorrente é mesmo de uma empresa ou pessoa?
 *
 * O campo dos concorrentes é texto livre no formulário do portal, e há entidades que lá põem a
 * repartição do procedimento em vez de quem convidaram: num concurso de 2026 repartido em lotes,
 * os "concorrentes" de quatro contratos eram "Lote 2" e "Lote 3", com NIF e tudo. São oito linhas em
 * 742, mas subiam ao topo da lista de quem costuma ser convidado, que é um dos ecrãs do mapa.
 *
 * O filtro é deliberadamente estreito — só o que é exactamente um rótulo de lote. Um contrato que
 * fique sem convidados nenhuns passa a contar como sem lista publicada, que é o que de facto se sabe.
 */
export function pareceEmpresa(nome: string): boolean {
  const limpo = normalizar(nome).trim();
  return limpo.length > 0 && !/^lotes?\s*\d+$/.test(limpo);
}

export interface ContratoDeEntidade {
  precoCents: Cents;
  porConvite: boolean;
  convidados: number;
}

export interface ResumoDeEntidade {
  contratos: number;
  totalCents: Cents;
  porConvite: number;
  /** Convites em que foi chamada uma empresa só: aí, estar na lista é ganhar a obra. */
  conviteUnico: number;
}

/** O que dizer de uma entidade ao pintor, a partir dos contratos dela. */
export function resumirEntidade(cs: ContratoDeEntidade[]): ResumoDeEntidade {
  return {
    contratos: cs.length,
    totalCents: cs.reduce((n, c) => n + c.precoCents, 0),
    porConvite: cs.filter((c) => c.porConvite).length,
    conviteUnico: cs.filter((c) => c.porConvite && c.convidados === 1).length,
  };
}
