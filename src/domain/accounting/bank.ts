import type { Cents } from '../money';

// Importação do extrato bancário (EuroBic). Dois formatos: CAMT.053 (XML, norma ISO 20022) e CSV (separado por ; , ou tabulação, com
// cabeçalho). Funções puras e testadas; a leitura do ficheiro e a gravação estão em src/app/app/backoffice/contabilidade/bank-actions.ts.
// O extrato é da conta da empresa inteira: só se casam os movimentos da plataforma (transferências da Stripe e pagamentos de resgates);
// o resto classifica-se como «outro» e fica para o contabilista.

export interface BankLine {
  /** AAAA-MM-DD. */
  data: string;
  dataValor: string | null;
  descricao: string;
  /** Com sinal: positivo = entrou, negativo = saiu. */
  valorCents: Cents;
  saldoCents: Cents | null;
  /** Identificador estável do movimento (repetir uma importação não duplica). */
  chave: string;
}

export interface ParsedStatement {
  lines: BankLine[];
  iban: string | null;
  formato: 'camt053' | 'csv';
  errors: string[];
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Dá a cada movimento uma chave única: os iguais no mesmo ficheiro distinguem-se pela ordem em que aparecem. */
export function withKeys(lines: Omit<BankLine, 'chave'>[]): BankLine[] {
  const seen = new Map<string, number>();
  return lines.map((l) => {
    const base = `${l.data}|${l.valorCents}|${l.saldoCents ?? ''}|${norm(l.descricao).replace(/\s+/g, ' ')}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { ...l, chave: `${base}|${n}` };
  });
}

/** Número em formato português ou internacional → cêntimos. "1.234,56", "-1234.56", "1 234,56", "(12,00)". */
export function parseAmount(raw: string): Cents | null {
  let s = raw.replace(/\s| /g, '').replace(/[€A-Za-z]/g, '');
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith('+')) s = s.slice(1);
  if (s.endsWith('-')) {
    negative = !negative;
    s = s.slice(0, -1);
  }
  const commas = (s.match(/,/g) ?? []).length;
  const dots = (s.match(/\./g) ?? []).length;
  let decimalSep: ',' | '.' | null = null;
  if (commas && dots) decimalSep = s.lastIndexOf(',') > s.lastIndexOf('.') ? ',' : '.';
  else if (commas + dots === 1) {
    const sep = commas ? ',' : '.';
    // Um só separador com exactamente 3 algarismos depois (e 1 a 3 antes) é de milhares: 1.234 ou 1,234.
    decimalSep = /^\d{1,3}[.,]\d{3}$/.test(s) ? null : sep;
  }
  let intPart = s;
  let frac = '';
  if (decimalSep) {
    const i = s.lastIndexOf(decimalSep);
    intPart = s.slice(0, i);
    frac = s.slice(i + 1);
  }
  const digits = intPart.replace(/[.,]/g, '');
  if (!/^\d*$/.test(digits) || !/^\d{0,2}$/.test(frac) || (digits === '' && frac === '')) return null;
  const cents = Number(digits || '0') * 100 + Number((frac + '00').slice(0, 2));
  return negative ? -cents : cents;
}

/** Data AAAA-MM-DD a partir de DD-MM-AAAA, DD/MM/AAAA, DD.MM.AAAA, AAAA-MM-DD ou DD-MM-AA. */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/.exec(s);
  if (m) return `20${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  return null;
}

// ---------- CSV -------------------------------------------------------------------------------------------------------

function splitCsv(text: string): string[][] {
  const first = text.split(/\r?\n/).find((l) => l.trim()) ?? '';
  const delim = [';', '\t', ','].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0]![0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

interface Columns {
  data: number;
  dataValor: number | null;
  descricao: number;
  valor: number | null;
  debito: number | null;
  credito: number | null;
  saldo: number | null;
}

function findColumns(header: string[]): Columns | null {
  const h = header.map(norm);
  const idx = (re: RegExp, skip: number[] = []) => h.findIndex((c, i) => re.test(c) && !skip.includes(i));
  const dataValor = idx(/data.*valor|dt\.? ?valor|valor.*data/);
  const data = idx(/^(data|dt\.?)(?!.*valor)/, dataValor >= 0 ? [dataValor] : []);
  const descricao = idx(/descri|movimento|detalhe|narrativa|historico|referencia/, []);
  const debito = idx(/debito/);
  const credito = idx(/credito/);
  const saldo = idx(/saldo/);
  const valor = idx(/^(montante|valor|importancia|quantia)( \(?eur\)?)?$/);
  if (data < 0 || descricao < 0 || (valor < 0 && (debito < 0 || credito < 0))) return null;
  return { data, dataValor: dataValor >= 0 ? dataValor : null, descricao, valor: valor >= 0 ? valor : null, debito: debito >= 0 ? debito : null, credito: credito >= 0 ? credito : null, saldo: saldo >= 0 ? saldo : null };
}

export function parseBankCsv(text: string): ParsedStatement {
  const out: ParsedStatement = { lines: [], iban: null, formato: 'csv', errors: [] };
  const rows = splitCsv(text.replace(/^﻿/, ''));
  const ibanMatch = /PT50[\d ]{21,27}/i.exec(text);
  if (ibanMatch) out.iban = ibanMatch[0].replace(/\s/g, '').toUpperCase().slice(0, 25);
  let headerAt = -1;
  let cols: Columns | null = null;
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    cols = findColumns(rows[i]!);
    if (cols) {
      headerAt = i;
      break;
    }
  }
  if (!cols || headerAt < 0) {
    const sample = rows.slice(0, 8).map((r) => r.join(' | ')).join(' // ');
    out.errors.push(`Não encontrei o cabeçalho (data, descrição e valor ou débito/crédito). Primeiras linhas: ${sample.slice(0, 300)}`);
    return out;
  }
  const raw: Omit<BankLine, 'chave'>[] = [];
  for (const [n, r] of rows.slice(headerAt + 1).entries()) {
    const data = parseDate(r[cols.data] ?? '');
    if (!data) continue; // linhas de rodapé, totais, etc.
    let valor: Cents | null = null;
    if (cols.valor !== null) valor = parseAmount(r[cols.valor] ?? '');
    else {
      const d = parseAmount(r[cols.debito!] ?? '') ?? 0;
      const c = parseAmount(r[cols.credito!] ?? '') ?? 0;
      valor = c - Math.abs(d);
      if (d === 0 && c === 0) valor = null;
    }
    if (valor === null) {
      out.errors.push(`Linha ${headerAt + n + 2}: valor ilegível («${(r[cols.valor ?? cols.credito!] ?? '').slice(0, 30)}»).`);
      continue;
    }
    raw.push({
      data,
      dataValor: cols.dataValor !== null ? parseDate(r[cols.dataValor] ?? '') : null,
      descricao: (r[cols.descricao] ?? '').replace(/\s+/g, ' ').trim().slice(0, 300),
      valorCents: valor,
      saldoCents: cols.saldo !== null ? parseAmount(r[cols.saldo] ?? '') : null,
    });
  }
  if (raw.length === 0 && out.errors.length === 0) out.errors.push('O ficheiro não tem movimentos.');
  out.lines = withKeys(raw);
  return out;
}

// ---------- CAMT.053 --------------------------------------------------------------------------------------------------

const tag = (xml: string, name: string) => new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${name}>`, 'i').exec(xml)?.[1] ?? null;
const tags = (xml: string, name: string) => [...xml.matchAll(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${name}>`, 'gi'))].map((m) => m[1]!);
const text = (s: string | null) => (s ?? '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/\s+/g, ' ').trim();

export function parseCamt053(xml: string): ParsedStatement {
  const out: ParsedStatement = { lines: [], iban: null, formato: 'camt053', errors: [] };
  const iban = tag(xml, 'IBAN');
  out.iban = iban ? text(iban).replace(/\s/g, '').toUpperCase() : null;
  const raw: Omit<BankLine, 'chave'>[] = [];
  for (const stmt of tags(xml, 'Stmt')) {
    // Saldo final do extrato (CLBD), usado no último movimento.
    const closing = tags(stmt, 'Bal').find((b) => /<(?:\w+:)?Cd>\s*CLBD\s*</i.test(b));
    const closingAmt = closing ? parseAmount(text(tag(closing, 'Amt'))) : null;
    const closingSign = closing && /CRDT/i.test(tag(closing, 'CdtDbtInd') ?? '') ? 1 : -1;
    const entries = tags(stmt, 'Ntry');
    entries.forEach((e, i) => {
      const amt = parseAmount(text(tag(e, 'Amt')));
      const ind = text(tag(e, 'CdtDbtInd')).toUpperCase();
      const booking = tag(e, 'BookgDt');
      const value = tag(e, 'ValDt');
      const data = parseDate(text(tag(booking ?? '', 'Dt') ?? tag(booking ?? '', 'DtTm')) ?? '');
      if (amt === null || !data || (ind !== 'CRDT' && ind !== 'DBIT')) {
        out.errors.push(`Movimento ${i + 1}: dados incompletos.`);
        return;
      }
      const parts = [text(tag(e, 'AddtlNtryInf')), ...tags(e, 'Ustrd').map(text), ...tags(e, 'Nm').map(text)].filter(Boolean);
      raw.push({
        data,
        dataValor: value ? parseDate(text(tag(value, 'Dt') ?? tag(value, 'DtTm'))) : null,
        descricao: [...new Set(parts)].join(' · ').slice(0, 300) || 'Movimento sem descrição',
        valorCents: ind === 'CRDT' ? amt : -amt,
        saldoCents: i === entries.length - 1 && closingAmt !== null ? closingAmt * closingSign : null,
      });
    });
  }
  if (raw.length === 0 && out.errors.length === 0) out.errors.push('O ficheiro CAMT não tem movimentos.');
  out.lines = withKeys(raw);
  return out;
}

export function parseBankFile(content: string): ParsedStatement {
  return content.trimStart().startsWith('<') ? parseCamt053(content) : parseBankCsv(content);
}

// ---------- Casamento com a plataforma --------------------------------------------------------------------------------

export interface MatchCandidates {
  /** Transferências da Stripe já chegadas ao banco. */
  payouts: { id: string; amountCents: Cents; arrivalAt: string | null }[];
  /** Resgates pagos pela equipa. */
  redemptions: { id: string; liquidoCents: Cents; pagaEm: string | null; titular: string }[];
}

export interface Match {
  chave: string;
  tipo: 'stripe_payout' | 'resgate';
  ref: string;
}

const daysBetween = (a: string, b: string) => Math.abs(Math.round((Date.parse(a.slice(0, 10)) - Date.parse(b.slice(0, 10))) / 86_400_000));

/**
 * Casa automaticamente só o que é inequívoco: mesmo valor e data próxima, sem dois candidatos para a mesma linha.
 * Transferências da Stripe: entrada de igual valor até 5 dias depois da chegada indicada (ou 1 antes). Resgates: saída de igual valor até 10 dias do pagamento.
 */
export function autoMatch(lines: Pick<BankLine, 'chave' | 'data' | 'valorCents' | 'descricao'>[], c: MatchCandidates, already: { payouts: Set<string>; redemptions: Set<string> } = { payouts: new Set(), redemptions: new Set() }): Match[] {
  const out: Match[] = [];
  const usedLines = new Set<string>();
  const near = (l: { data: string }, at: string | null, before: number, after: number) => {
    if (!at) return false;
    const diff = (Date.parse(l.data) - Date.parse(at.slice(0, 10))) / 86_400_000;
    return diff >= -before && diff <= after;
  };
  for (const p of c.payouts) {
    if (already.payouts.has(p.id)) continue;
    const cands = lines.filter((l) => !usedLines.has(l.chave) && l.valorCents === p.amountCents && near(l, p.arrivalAt, 1, 5));
    if (cands.length === 1) {
      usedLines.add(cands[0]!.chave);
      out.push({ chave: cands[0]!.chave, tipo: 'stripe_payout', ref: p.id });
    } else if (cands.length > 1) {
      // Vários iguais: ficam por casar à mão, salvo se só um mencionar a Stripe.
      const named = cands.filter((l) => /stripe/i.test(l.descricao));
      if (named.length === 1) {
        usedLines.add(named[0]!.chave);
        out.push({ chave: named[0]!.chave, tipo: 'stripe_payout', ref: p.id });
      }
    }
  }
  for (const r of c.redemptions) {
    if (already.redemptions.has(r.id)) continue;
    const cands = lines.filter((l) => !usedLines.has(l.chave) && l.valorCents === -r.liquidoCents && r.pagaEm !== null && daysBetween(l.data, r.pagaEm) <= 10);
    if (cands.length === 1) {
      usedLines.add(cands[0]!.chave);
      out.push({ chave: cands[0]!.chave, tipo: 'resgate', ref: r.id });
    }
  }
  return out;
}
