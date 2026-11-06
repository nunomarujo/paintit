/**
 * Descoberta de contactos: transforma o que o OpenStreetMap devolve em candidatos a contactos do CRM.
 * Funções puras; quem vai buscar os dados é `src/lib/crmDescoberta.ts`.
 *
 * Fonte: OpenStreetMap (licença ODbL — a atribuição fica em `fonte`). Os dados são pessoais quando a
 * empresa é um empresário em nome individual, por isso a marca de «pessoa coletiva» só se dá quando o
 * nome traz uma forma societária; na dúvida fica `false` e a base recusa o envio.
 */

import type { TipoContacto } from './crm';

export interface ElementoOsm {
  tags?: Record<string, string>;
}

export interface Candidato {
  tipo: TipoContacto;
  nome: string;
  email: string | null;
  telefone: string | null;
  website: string | null;
  pessoaColetiva: boolean;
}

export const FONTE_OSM = 'OpenStreetMap (ODbL)';

// Formas societárias portuguesas, com as grafias correntes: Lda, Lda., L.da, Ld.ª, Limitada, Unipessoal, S.A., SA,
// Sociedade, SGPS, Cooperativa, CRL, Associação. O que vem antes e depois tem de ser separador, para «Cálda» não contar.
const FORMAS_SOCIETARIAS =
  /(^|[\s,(&-])(l\.?\s?da\.?|ld\.?\s?[ªa]\.?|lda\.?|limitada|unipessoal|unip\.?|soc\.?(iedade)?|s\.\s?a\.?|s\.?g\.?p\.?s\.?|c\.?r\.?l\.?|cooperativa|associa[cç][aã]o)($|[\s,).&-])/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** «SA» sem pontos só conta em maiúsculas: «Sa» é um apelido. */
const SA_MAIUSCULAS = /(^|[\s,(])SA($|[\s,).])/;

export const pareceEmpresa = (nome: string) => FORMAS_SOCIETARIAS.test(nome) || SA_MAIUSCULAS.test(nome);

/** O primeiro email válido de um campo que o OSM pode trazer com vários, separados por «;». */
export function primeiroEmail(valor: string | undefined): string | null {
  for (const parte of (valor ?? '').split(/[;,\s]+/)) {
    const e = parte.trim().toLowerCase();
    if (EMAIL.test(e)) return e;
  }
  return null;
}

export function tipoDoElemento(tags: Record<string, string>): TipoContacto | null {
  if (tags.craft === 'painter') return 'pintor';
  if (tags.shop === 'paint') return 'fornecedor';
  if (tags.office === 'property_management') return 'administradora';
  return null;
}

export function candidatosDeOsm(elementos: ElementoOsm[]): Candidato[] {
  const vistos = new Set<string>();
  const saida: Candidato[] = [];
  for (const el of elementos) {
    const t = el.tags ?? {};
    const tipo = tipoDoElemento(t);
    const nome = (t.name ?? '').trim();
    if (!tipo || !nome) continue;
    const email = primeiroEmail(t.email ?? t['contact:email']);
    const chave = email ?? `${tipo}|${nome.toLowerCase()}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push({
      tipo,
      nome,
      email,
      telefone: (t.phone ?? t['contact:phone'] ?? '').split(';')[0]?.trim() || null,
      website: (t.website ?? t['contact:website'] ?? '').trim() || null,
      pessoaColetiva: pareceEmpresa(nome),
    });
  }
  return saida;
}

/** O concelho entra numa consulta Overpass entre aspas: só letras, espaços, apóstrofos e hífenes. */
export const concelhoSeguro = (c: string) => /^[\p{L}][\p{L} '’-]*$/u.test(c.trim());

export function consultaOverpass(concelho: string): string {
  return `[out:json][timeout:60];
area["boundary"="administrative"]["admin_level"="7"]["name"="${concelho.trim()}"]->.a;
(nwr["craft"="painter"](area.a);nwr["shop"="paint"](area.a);nwr["office"="property_management"](area.a););
out tags;`;
}
