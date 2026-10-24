import { describe, expect, it } from 'vitest';
import type { CapotoSpec } from './etics';
import type { ProposalLine, ProposalTerms } from './proposal';
import { linesForZone, proposalIntro } from './proposalDocument';

const terms = (over: Partial<ProposalTerms> = {}): ProposalTerms => ({
  ivaBps: 2300,
  validade: null,
  inicioPossivel: null,
  duracaoDias: null,
  adiantamentoBps: 0,
  precoAjusteM2: null,
  garantiaAnos: null,
  exclusoes: '',
  notas: '',
  fases: [],
  confirmaMaoObra: false,
  seguroRc: null,
  seguroAt: null,
  ...over,
});

const line = (over: Partial<ProposalLine> & { id?: string } = {}): ProposalLine & { id: string } => ({
  id: over.id ?? 'l1',
  categoria: 'pintura',
  descricao: 'Pintura de fachada',
  superficie: null,
  quantidade: 1000,
  unidade: 'm2',
  precoUnitario: 500,
  demaos: 2,
  produto: null,
  inclusao: 'incluido',
  zonas: [],
  ...over,
});

const capoto: CapotoSpec = { situacao: 'novo', isolante: 'eps', espessuraMm: 60, acabamento: 'siloxano', demaos: 2 };

describe('proposalIntro', () => {
  it('nunca inventa factos: sem capoto, duração ou garantia, fica só com as categorias da proposta', () => {
    const texto = proposalIntro(terms(), [line()], null);
    expect(texto).toBe('Proposta de pintura.');
  });

  it('usa o resumo do capoto em vez das categorias quando a proposta tem capoto', () => {
    const texto = proposalIntro(terms(), [line({ categoria: 'preparacao' })], capoto);
    expect(texto.startsWith('Proposta de pintura.')).toBe(false);
    expect(texto.length).toBeGreaterThan(0);
  });

  it('acrescenta mão-de-obra, duração e garantia só quando a proposta os declara', () => {
    const texto = proposalIntro(terms({ confirmaMaoObra: true, duracaoDias: 5, garantiaAnos: 3 }), [line()], null);
    expect(texto).toContain('mão-de-obra qualificada');
    expect(texto).toContain('5 dias úteis.');
    expect(texto).toContain('Garantia adicional de 3 anos');
  });

  it('usa o singular em 1 dia e 1 ano', () => {
    const texto = proposalIntro(terms({ duracaoDias: 1, garantiaAnos: 1 }), [line()], null);
    expect(texto).toContain('1 dia útil.');
    expect(texto).toContain('1 ano,');
  });

  it('ignora linhas não incluídas (opcionais, condicionadas) ao escolher as categorias', () => {
    const texto = proposalIntro(terms(), [line({ categoria: 'licencas', inclusao: 'opcional' })], null);
    expect(texto).toBe('Proposta de pintura.');
  });
});

describe('linesForZone', () => {
  it('inclui linhas sem zonas (aplicam-se à obra toda) e as que mencionam a zona pedida', () => {
    const geral = line({ id: 'geral', zonas: [] });
    const fachadaNorte = line({ id: 'norte', zonas: ['z1'] });
    const fachadaSul = line({ id: 'sul', zonas: ['z2'] });
    const resultado = linesForZone([geral, fachadaNorte, fachadaSul], 'z1');
    expect(resultado.map((l) => l.id)).toEqual(['geral', 'norte']);
  });

  it('exclui linhas não incluídas mesmo que mencionem a zona', () => {
    const naoIncluida = line({ id: 'x', zonas: ['z1'], inclusao: 'nao_incluido' });
    expect(linesForZone([naoIncluida], 'z1')).toEqual([]);
  });
});
