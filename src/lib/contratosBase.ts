import 'server-only';
import { PassThrough } from 'node:stream';
import { Unzip, UnzipInflate } from 'fflate';
import parserStream from 'stream-json';
import streamArray from 'stream-json/streamers/stream-array.js';
import {
  classificarContrato,
  entidade,
  lugar,
  pareceEmpresa,
  porConvite,
  type Classificacao,
  type ViaDeDeteccao,
} from '@/domain/contratosPublicos';

/**
 * Carregamento dos contratos públicos do portal BASE, via dados.gov.pt.
 *
 * O ficheiro de um ano tem 350 MB de JSON dentro de um zip de 46 MB. Nunca é segurado inteiro: o zip
 * é descomprimido à medida que chega e o JSON é lido objecto a objecto, pelo que a memória fica nas
 * dezenas de MB e não nas centenas. Dos 199 701 contratos de 2026, ficam 482.
 *
 * A fonte é um conjunto de dados em domínio público, actualizado semanalmente, publicado para ser
 * descarregado por máquinas. O portal BASE em si não se lê por meios automáticos — o robots.txt
 * proíbe-o (decisão de 25/10/2026, docs/DECISOES.md).
 */

const CONJUNTO = 'contratos-publicos-portal-base-impic-contratos-de-2012-a-2026';
const API = `https://dados.gov.pt/api/1/datasets/${CONJUNTO}/`;

export interface LinhaDeContrato {
  id_contrato: string;
  ano: number;
  objecto: string;
  entidade_nif: string | null;
  entidade_nome: string;
  procedimento: string;
  por_convite: boolean;
  preco_cents: number;
  distrito: string | null;
  concelho: string | null;
  data_celebracao: string | null;
  adjudicatario_nif: string | null;
  adjudicatario_nome: string | null;
  convidados: { nif: string | null; nome: string }[];
  n_convidados: number;
  cpv: string[];
  via: ViaDeDeteccao;
  confianca: NonNullable<Classificacao['confianca']>;
}

/** O endereço do ficheiro zip de um ano, tal como o portal o publica hoje. Muda a cada actualização. */
export async function ficheiroDoAno(ano: number): Promise<string | null> {
  const r = await fetch(API, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!r.ok) return null;
  const d = (await r.json()) as { resources?: { title?: string; format?: string; url?: string }[] };
  const alvo = (d.resources ?? []).find((x) => x.format === 'zip' && x.title === `contratos${ano}.zip`);
  return alvo?.url ?? null;
}

/** "23/02/2026" → "2026-02-23". O ficheiro traz as datas à portuguesa. */
function dataIso(v: unknown): string | null {
  const m = String(v ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** "506349527-Arnaldo Amador &amp; Filhos, Lda" → NIF e nome. O NIF nem sempre lá está. */
function convidado(bruto: string): { nif: string | null; nome: string } {
  const texto = String(bruto).replace(/&amp;/g, '&');
  const m = texto.match(/^(\d{9})\s*-\s*(.*)$/);
  return m ? { nif: m[1]!, nome: m[2]!.trim() } : { nif: null, nome: texto.replace(/^-+/, '').trim() };
}

export function linhaDe(c: Record<string, unknown>, ano: number): LinhaDeContrato | null {
  const r = classificarContrato({
    tipoContrato: (c.tipoContrato as string[]) ?? [],
    objectoContrato: (c.objectoContrato as string) ?? '',
    cpv: (c.cpv as string[]) ?? [],
    tipoprocedimento: (c.tipoprocedimento as string) ?? '',
  });
  if (!r.pintura || !c.idcontrato) return null;

  const ent = entidade((c.adjudicante as string[])?.[0]);
  const adj = entidade((c.adjudicatarios as string[])?.[0]);
  const { distrito, concelho } = lugar((c.localExecucao as string[])?.[0]);
  const convidados = (Array.isArray(c.concorrentes) ? (c.concorrentes as string[]) : [])
    .map(convidado)
    .filter((x) => pareceEmpresa(x.nome));
  const procedimento = (c.tipoprocedimento as string) ?? '';

  return {
    id_contrato: String(c.idcontrato),
    ano,
    objecto: ((c.objectoContrato as string) ?? '').slice(0, 600),
    entidade_nif: ent.nif,
    entidade_nome: ent.nome || 'Entidade não identificada',
    procedimento,
    por_convite: porConvite(procedimento),
    preco_cents: Math.round(Number(c.precoContratual ?? 0) * 100),
    distrito,
    concelho,
    data_celebracao: dataIso(c.dataCelebracaoContrato),
    adjudicatario_nif: adj.nif,
    adjudicatario_nome: adj.nome || null,
    convidados,
    n_convidados: convidados.length,
    cpv: ((c.cpv as string[]) ?? []).map((x) => String(x).split(' - ')[0]!),
    via: r.via!,
    confianca: r.confianca!,
  };
}

/**
 * Lê o zip de um ano e devolve só as linhas de pintura.
 *
 * `aoLote` é chamado a cada 200 linhas, para quem chama as ir gravando em vez de as acumular todas.
 */
export async function lerAno(url: string, ano: number, aoLote: (linhas: LinhaDeContrato[]) => Promise<void>): Promise<number> {
  const resposta = await fetch(url, { cache: 'no-store' });
  if (!resposta.ok || !resposta.body) throw new Error(`O ficheiro de ${ano} não veio (HTTP ${resposta.status}).`);

  const json = new PassThrough();
  const descompactador = new Unzip((ficheiro) => {
    if (!ficheiro.name.toLowerCase().endsWith('.json')) return;
    ficheiro.ondata = (erro, pedaco, fim) => {
      if (erro) json.destroy(erro);
      else {
        json.write(Buffer.from(pedaco));
        if (fim) json.end();
      }
    };
    ficheiro.start();
  });
  descompactador.register(UnzipInflate);

  const corrido = (async () => {
    const leitor = resposta.body!.getReader();
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      descompactador.push(value, false);
    }
    descompactador.push(new Uint8Array(0), true);
  })();

  let total = 0;
  let lote: LinhaDeContrato[] = [];
  const fluxo = json.pipe(parserStream()).pipe(streamArray.asStream());
  for await (const { value } of fluxo as AsyncIterable<{ value: Record<string, unknown> }>) {
    const linha = linhaDe(value, ano);
    if (!linha) continue;
    lote.push(linha);
    total++;
    if (lote.length >= 200) {
      await aoLote(lote);
      lote = [];
    }
  }
  if (lote.length > 0) await aoLote(lote);
  await corrido;
  return total;
}
