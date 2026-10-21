import { describe, expect, it } from 'vitest';
import {
  alias,
  compareProposals,
  lineTotal,
  parseLine,
  parseTerms,
  phasesProblem,
  proposalTotals,
  sortRows,
  submitBlockers,
  type ProposalLine,
  type ProposalTerms,
} from './proposal';

const line = (over: Partial<ProposalLine> = {}): ProposalLine => ({
  categoria: 'pintura',
  descricao: 'Pintura com tinta acrílica',
  superficie: 'fachada',
  quantidade: 16150, // 161,50 m²
  unidade: 'm2',
  precoUnitario: 850, // 8,50 €
  demaos: 2,
  produto: null,
  inclusao: 'incluido',
  ...over,
});

const terms: ProposalTerms = {
  ivaBps: 2300,
  validade: '2026-12-31',
  inicioPossivel: null,
  duracaoDias: 20,
  adiantamentoBps: 1000,
  precoAjusteM2: 850,
  garantiaAnos: 2,
  exclusoes: '',
  notas: '',
  fases: [
    { nome: 'Ao iniciar', bps: 3000 },
    { nome: 'No fim', bps: 6000 },
  ],
  confirmaMaoObra: true,
  seguroRc: 'sim',
  seguroAt: 'sim',
};

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

describe('propostas', () => {
  it('total da linha ao cêntimo', () => {
    expect(lineTotal(line())).toBe(137275); // 161,5 × 8,50 = 1 372,75 €
    expect(lineTotal({ quantidade: 333, precoUnitario: 333 })).toBe(1109); // 3,33 × 3,33 = 11,0889
  });

  it('a base só soma o incluído; opcionais e condicionados ficam à parte', () => {
    const t = proposalTotals(
      [line(), line({ inclusao: 'opcional', precoUnitario: 100 }), line({ inclusao: 'condicionado', quantidade: 100, precoUnitario: 5000 })],
      2300,
    );
    expect(t.base).toBe(137275);
    expect(t.opcionais).toBe(16150);
    expect(t.condicionados).toBe(5000);
    expect(t.iva).toBe(31573);
    expect(t.totalComIva).toBe(137275 + 31573);
  });

  it('não submete sem preço, validade, duração, nem com contactos', () => {
    expect(submitBlockers({ terms, lines: [line()], today: '2026-10-19', requestOpen: true })).toEqual([]);
    const b = submitBlockers({
      terms: { ...terms, validade: '2026-10-01', duracaoDias: null, adiantamentoBps: 4000, notas: 'Ligue 912 345 678' },
      lines: [line({ inclusao: 'opcional' })],
      today: '2026-10-19',
      requestOpen: false,
    });
    expect(b).toHaveLength(7);
    expect(b.join(' ')).toMatch(/telefone/);
  });

  it('compara sem identificar e mostra o que falta', () => {
    const rows = compareProposals(
      [
        { id: 'x', lines: [line()], ivaBps: 2300, duracaoDias: 30, inicioPossivel: null, adiantamentoBps: 0 },
        {
          id: 'y',
          lines: [line({ precoUnitario: 900 }), line({ superficie: 'varandas', categoria: 'reparacao', quantidade: 100, precoUnitario: 20000 })],
          ivaBps: 2300,
          duracaoDias: 20,
          inicioPossivel: null,
          adiantamentoBps: 0,
        },
      ],
      { areaTotal: 16150, superficies: ['fachada', 'varandas'] },
    );
    expect(rows.map((r) => r.alias)).toEqual(['Pintor A', 'Pintor B']);
    expect(rows[0]!.superficiesEmFalta).toEqual(['varandas']);
    expect(rows[1]!.superficiesEmFalta).toEqual([]);
    expect(rows[0]!.precoM2).toBe(850);
    expect(rows[0]!.categorias.reparacao).toBeNull();
    expect(rows[1]!.categorias.reparacao).toBe(20000);
    expect(rows[0]!.materiaisCertificados).toBe(0);
    expect(sortRows(rows, 'preco', {}).map((r) => r.id)).toEqual(['x', 'y']);
    expect(sortRows(rows, 'prazo', { x: 30, y: 20 }).map((r) => r.id)).toEqual(['y', 'x']);
    expect(sortRows(rows, 'completude', {}).map((r) => r.id)).toEqual(['y', 'x']);
    expect(alias(26)).toBe('Pintor 27');
  });

  it('lê linhas e condições dos formulários', () => {
    const l = parseLine(form({ categoria: 'pintura', descricao: 'Fachada', quantidade: '161,5', preco: '8,50', superficie: 'fachada' }));
    expect(l.value).toMatchObject({ quantidade: 16150, precoUnitario: 850, unidade: 'm2', inclusao: 'incluido' });
    expect(parseLine(form({ categoria: 'x', quantidade: '0', preco: 'abc' })).errors).toMatchObject({
      categoria: expect.any(String),
      quantidade: expect.any(String),
      preco: expect.any(String),
      descricao: expect.any(String),
    });
    const t = parseTerms(form({ ivaBps: '600', validade: '2026-12-31', duracaoDias: '20', adiantamento: '10,5' }));
    expect(t.value).toMatchObject({ ivaBps: 600, adiantamentoBps: 1050, duracaoDias: 20 });
    expect(parseTerms(form({ ivaBps: '1000', duracaoDias: '0' })).errors).toMatchObject({ ivaBps: expect.any(String), duracaoDias: expect.any(String) });
  });

  it('o orçamento exige mão-de-obra qualificada, seguros declarados e pagamentos a 100%', () => {
    const base = { lines: [line()], today: '2026-10-19', requestOpen: true };
    expect(submitBlockers({ ...base, terms: { ...terms, confirmaMaoObra: false } }).join(' ')).toMatch(/mão-de-obra qualificada/);
    expect(submitBlockers({ ...base, terms: { ...terms, seguroRc: null } }).join(' ')).toMatch(/seguros/);
    expect(submitBlockers({ ...base, terms: { ...terms, fases: [] } }).join(' ')).toMatch(/plano de pagamentos/);
    expect(submitBlockers({ ...base, terms: { ...terms, fases: [{ nome: 'Tudo', bps: 5000 }] } }).join(' ')).toMatch(/soma/);
    expect(phasesProblem(1000, [{ nome: 'a', bps: 3000 }, { nome: 'b', bps: 6000 }])).toBeNull();
  });

  it('lê as fases do formulário, ignora linhas em branco e recusa percentagens inválidas', () => {
    const f = form({ ivaBps: '2300', duracaoDias: '10', adiantamento: '10' });
    f.append('faseNome', 'Início'); f.append('fasePct', '30');
    f.append('faseNome', ''); f.append('fasePct', '');
    f.append('faseNome', 'Fim'); f.append('fasePct', '60');
    f.set('confirmaMaoObra', 'sim'); f.set('seguroRc', 'sim'); f.set('seguroAt', 'nao');
    expect(parseTerms(f).value).toMatchObject({
      fases: [{ nome: 'Início', bps: 3000 }, { nome: 'Fim', bps: 6000 }],
      confirmaMaoObra: true,
      seguroRc: 'sim',
      seguroAt: 'nao',
    });
    const bad = form({ ivaBps: '2300' });
    bad.append('faseNome', 'X'); bad.append('fasePct', '0');
    expect(parseTerms(bad).errors.fases).toBeDefined();
  });
});
