import { describe, expect, it } from 'vitest';
import { candidatosDeOsm, concelhoSeguro, consultaOverpass, pareceEmpresa, primeiroEmail, type ElementoOsm } from './crmDescoberta';

describe('pareceEmpresa', () => {
  it.each(['Pinturas do Lima, Lda.', 'Tintas Norte S.A.', 'Cores Unipessoal Lda', 'Associação de Moradores'])('%s é pessoa coletiva', (n) => {
    expect(pareceEmpresa(n)).toBe(true);
  });
  it.each(['João Silva Pintor', 'Pinturas Silva', 'Fernanda Costa'])('%s fica por confirmar', (n) => {
    expect(pareceEmpresa(n)).toBe(false);
  });
});

describe('primeiroEmail', () => {
  it('apanha o primeiro válido', () => expect(primeiroEmail('nao-e-email; Geral@Empresa.pt;outro@x.pt')).toBe('geral@empresa.pt'));
  it('sem email válido, null', () => {
    expect(primeiroEmail(undefined)).toBeNull();
    expect(primeiroEmail('abc')).toBeNull();
  });
});

describe('candidatosDeOsm', () => {
  const el: ElementoOsm[] = [
    { tags: { craft: 'painter', name: 'Pinturas do Lima, Lda.', email: 'geral@lima.pt', phone: '+351 258 000 000;+351 910 000 000', website: 'https://lima.pt' } },
    { tags: { craft: 'painter', name: 'Pinturas do Lima, Lda.', email: 'GERAL@lima.pt' } },
    { tags: { shop: 'paint', name: 'Tintas Viana' } },
    { tags: { office: 'property_management', name: 'Condomínios Alto Minho Lda' } },
    { tags: { shop: 'bakery', name: 'Padaria' } },
    { tags: { craft: 'painter' } },
    {},
  ];
  const r = candidatosDeOsm(el);
  it('só tipos e nomes que interessam, sem repetidos', () => expect(r.map((c) => c.nome)).toEqual(['Pinturas do Lima, Lda.', 'Tintas Viana', 'Condomínios Alto Minho Lda']));
  it('tipos certos', () => expect(r.map((c) => c.tipo)).toEqual(['pintor', 'fornecedor', 'administradora']));
  it('normaliza email e telefone', () => {
    expect(r[0]).toMatchObject({ email: 'geral@lima.pt', telefone: '+351 258 000 000', website: 'https://lima.pt', pessoaColetiva: true });
    expect(r[1]).toMatchObject({ email: null, pessoaColetiva: false });
  });
});

describe('consulta Overpass', () => {
  it('aceita concelhos reais', () => ['Viana do Castelo', "Sant'Ana", 'Vila Nova de Cerveira'].forEach((c) => expect(concelhoSeguro(c)).toBe(true)));
  it('recusa o que poderia alterar a consulta', () => ['x"]; out;', 'a"b', '', '1abc'].forEach((c) => expect(concelhoSeguro(c)).toBe(false)));
  it('leva o concelho', () => expect(consultaOverpass('Viana do Castelo')).toContain('"name"="Viana do Castelo"'));
});
