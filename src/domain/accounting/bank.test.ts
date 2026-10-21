import { describe, expect, it } from 'vitest';
import { autoMatch, parseAmount, parseBankCsv, parseBankFile, parseCamt053, parseDate, withKeys } from './bank';

describe('importação do extrato: números e datas', () => {
  it('lê valores em formato português e internacional', () => {
    const cases: [string, number | null][] = [
      ['1.234,56', 123_456],
      ['-1.234,56', -123_456],
      ['1234,5', 123_450],
      ['1 234,56 €', 123_456],
      ['1,234.56', 123_456],
      ['-1234.56', -123_456],
      ['(12,00)', -1_200],
      ['12,00-', -1_200],
      ['0,05', 5],
      ['1.234', 123_400],
      ['1.234.567,89', 123_456_789],
      ['12,345', 1_234_500],
      ['', null],
      ['abc', null],
      ['12,3456', null],
    ];
    for (const [raw, cents] of cases) expect(parseAmount(raw), raw).toBe(cents);
  });

  it('lê datas', () => {
    expect(parseDate('21-10-2026')).toBe('2026-10-21');
    expect(parseDate('21/10/2026')).toBe('2026-10-21');
    expect(parseDate('2026-10-21T10:00:00')).toBe('2026-10-21');
    expect(parseDate('1/2/2026')).toBe('2026-02-01');
    expect(parseDate('Total')).toBeNull();
  });
});

describe('importação do extrato: CSV', () => {
  const csv = `EuroBic;Extrato de movimentos
Conta;PT50 0079 0000 8902 4453 1019 7
Titular;RELEVANTEPLANETA UNIPESSOAL LDA

Data Mov.;Data Valor;Descrição;Débito;Crédito;Saldo
20-10-2026;20-10-2026;TRF STRIPE PAYMENTS EUROPE LTD;;100,00;1.100,00
21-10-2026;21-10-2026;PAG. SERVICOS DOMICILIADOS;"12,30";;1.087,70
21-10-2026;21-10-2026;PAG. SERVICOS DOMICILIADOS;"12,30";;1.075,40
Total;;;24,60;100,00;
`;
  it('encontra o cabeçalho e ignora o resto', () => {
    const r = parseBankCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.iban).toBe('PT50007900008902445310197');
    expect(r.lines.map((l) => [l.data, l.valorCents, l.saldoCents])).toEqual([
      ['2026-10-20', 10_000, 110_000],
      ['2026-10-21', -1_230, 108_770],
      ['2026-10-21', -1_230, 107_540],
    ]);
  });

  it('lê uma coluna única de valor, com sinal', () => {
    const r = parseBankCsv('Data;Descrição;Montante;Saldo\n2026-10-20;Entrada;1.000,00;1.000,00\n2026-10-21;Saída;-250,50;749,50\n');
    expect(r.lines.map((l) => l.valorCents)).toEqual([100_000, -25_050]);
  });

  it('movimentos iguais têm chaves diferentes; importar duas vezes dá as mesmas chaves', () => {
    const a = parseBankCsv('Data;Descrição;Valor\n21-10-2026;TAXA;-1,00\n21-10-2026;TAXA;-1,00\n');
    expect(new Set(a.lines.map((l) => l.chave)).size).toBe(2);
    const b = parseBankCsv('Data;Descrição;Valor\n21-10-2026;TAXA;-1,00\n21-10-2026;TAXA;-1,00\n');
    expect(b.lines.map((l) => l.chave)).toEqual(a.lines.map((l) => l.chave));
  });

  it('diz o que viu quando não percebe o ficheiro', () => {
    const r = parseBankCsv('foo;bar\n1;2\n');
    expect(r.lines).toEqual([]);
    expect(r.errors[0]).toMatch(/cabeçalho/);
    expect(r.errors[0]).toMatch(/foo/);
  });
});

describe('importação do extrato: CAMT.053', () => {
  const xml = `<?xml version="1.0"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02"><BkToCstmrStmt><Stmt>
<Acct><Id><IBAN>PT50007900008902445310197</IBAN></Id></Acct>
<Bal><Tp><CdOrPrtry><Cd>CLBD</Cd></CdOrPrtry></Tp><Amt Ccy="EUR">1075.40</Amt><CdtDbtInd>CRDT</CdtDbtInd></Bal>
<Ntry><Amt Ccy="EUR">100.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><BookgDt><Dt>2026-10-20</Dt></BookgDt><ValDt><Dt>2026-10-20</Dt></ValDt>
<AddtlNtryInf>TRF STRIPE PAYMENTS EUROPE LTD</AddtlNtryInf></Ntry>
<Ntry><Amt Ccy="EUR">24.60</Amt><CdtDbtInd>DBIT</CdtDbtInd><BookgDt><Dt>2026-10-21</Dt></BookgDt>
<NtryDtls><TxDtls><RltdPties><Cdtr><Nm>Tintas &amp; Cores Lda</Nm></Cdtr></RltdPties><RmtInf><Ustrd>FT 2026/1</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>
</Stmt></BkToCstmrStmt></Document>`;
  it('lê movimentos com sinal, descrição, IBAN e saldo final', () => {
    const r = parseBankFile(xml);
    expect(r.formato).toBe('camt053');
    expect(r.errors).toEqual([]);
    expect(r.iban).toBe('PT50007900008902445310197');
    expect(r.lines.map((l) => [l.data, l.valorCents])).toEqual([
      ['2026-10-20', 10_000],
      ['2026-10-21', -2_460],
    ]);
    expect(r.lines[1]!.descricao).toBe('FT 2026/1 · Tintas & Cores Lda');
    expect(r.lines[1]!.saldoCents).toBe(107_540);
    expect(parseCamt053('<Document></Document>').errors[0]).toMatch(/não tem movimentos/);
  });
});

describe('importação do extrato: casar com a plataforma', () => {
  const lines = withKeys([
    { data: '2026-10-21', dataValor: null, descricao: 'TRF STRIPE PAYMENTS EUROPE', valorCents: 10_000, saldoCents: null },
    { data: '2026-10-22', dataValor: null, descricao: 'TRF TINTAS LDA', valorCents: -33_600, saldoCents: null },
    { data: '2026-10-22', dataValor: null, descricao: 'OUTRA COISA', valorCents: -500, saldoCents: null },
  ]);
  const cands = {
    payouts: [{ id: 'po_1', amountCents: 10_000, arrivalAt: '2026-10-21T00:00:00Z' }],
    redemptions: [{ id: 'r1', liquidoCents: 33_600, pagaEm: '2026-10-22T09:00:00Z', titular: 'Tintas Lda' }],
  };

  it('casa valor igual e data próxima', () => {
    expect(autoMatch(lines, cands).map((m) => [m.tipo, m.ref])).toEqual([
      ['stripe_payout', 'po_1'],
      ['resgate', 'r1'],
    ]);
  });

  it('não casa se a data está longe, se já estava casado, ou se é ambíguo', () => {
    expect(autoMatch(lines, { ...cands, payouts: [{ id: 'po_1', amountCents: 10_000, arrivalAt: '2026-09-01T00:00:00Z' }] }).map((m) => m.tipo)).toEqual(['resgate']);
    expect(autoMatch(lines, cands, { payouts: new Set(['po_1']), redemptions: new Set(['r1']) })).toEqual([]);
    const twin = withKeys([
      { data: '2026-10-21', dataValor: null, descricao: 'A', valorCents: 10_000, saldoCents: null },
      { data: '2026-10-21', dataValor: null, descricao: 'B', valorCents: 10_000, saldoCents: null },
    ]);
    expect(autoMatch(twin, { payouts: cands.payouts, redemptions: [] })).toEqual([]);
    // Mas se só uma menciona a Stripe, é essa.
    twin[1] = { ...twin[1]!, descricao: 'TRF STRIPE' };
    expect(autoMatch(twin, { payouts: cands.payouts, redemptions: [] }).map((m) => m.chave)).toEqual([twin[1]!.chave]);
  });

  it('uma linha só casa uma vez', () => {
    const two = { payouts: [cands.payouts[0]!, { id: 'po_2', amountCents: 10_000, arrivalAt: '2026-10-21T00:00:00Z' }], redemptions: [] };
    expect(autoMatch(lines, two)).toHaveLength(1);
  });
});
