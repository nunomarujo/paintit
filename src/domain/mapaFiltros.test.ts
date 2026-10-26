import { describe, expect, it } from 'vitest';
import type { EntidadeDoMapa } from './mapaContratos';
import { combina, filtrar, normalizar, ordenar, sugestoes, tipoDaEntidade } from './mapaFiltros';

const e = (p: Partial<EntidadeDoMapa>): EntidadeDoMapa => ({
  chave: p.nome ?? 'x',
  nif: null,
  nome: 'Município de Sintra',
  contratos: 10,
  totalCents: 100_000_00,
  medianaCents: 10_000_00,
  porConvite: 0,
  conviteUnico: 0,
  semLista: 0,
  ultimo: '2026-01-01',
  concelhos: ['Sintra'],
  ...p,
});

describe('tipoDaEntidade', () => {
  it('reconhece as espécies pelo nome, que é o único campo que o portal dá', () => {
    expect(tipoDaEntidade('Município de Sintra')).toBe('municipio');
    expect(tipoDaEntidade('Câmara Municipal de Vila Franca de Xira')).toBe('municipio');
    expect(tipoDaEntidade('Freguesia de Colares')).toBe('freguesia');
    expect(tipoDaEntidade('Santa Casa da Misericórdia de Elvas')).toBe('social');
    expect(tipoDaEntidade('Universidade de Aveiro')).toBe('ensino');
    expect(tipoDaEntidade('Instituto Nacional de Emergência Médica, I. P.')).toBe('saude');
    expect(tipoDaEntidade('Gebalis - Gestão do Arrendamento da Habitação Municipal de Lisboa')).toBe('habitacao');
    expect(tipoDaEntidade('Estado Maior da Força Aérea')).toBe('estado');
    expect(tipoDaEntidade('ESTAMO - Participações Imobiliárias, SA')).toBe('outra');
  });

  it('a ordem das regras decide os casos que podiam cair em duas', () => {
    // "Serviços Sociais da Guarda Nacional Republicana" tem "sociais" mas é do Estado.
    expect(tipoDaEntidade('Serviços Sociais da Guarda Nacional Republicana')).toBe('estado');
    // Um hospital de misericórdia é saúde antes de ser IPSS.
    expect(tipoDaEntidade('Hospital da Misericórdia de Vila Verde')).toBe('saude');
  });
});

describe('combina', () => {
  const vazio = { termo: '', tipos: [], concelhos: [] };

  it('sem termo nem filtros passa tudo', () => {
    expect(combina(e({}), vazio)).toBe(true);
  });

  it('encontra sem acentos e com as palavras por qualquer ordem', () => {
    const gaia = e({ nome: 'Câmara Municipal de Vila Nova de Gaia', concelhos: ['Vila Nova de Gaia'] });
    expect(combina(gaia, { ...vazio, termo: 'camara gaia' })).toBe(true);
    expect(combina(gaia, { ...vazio, termo: 'GAIA camara' })).toBe(true);
    expect(combina(gaia, { ...vazio, termo: 'camara porto' })).toBe(false);
  });

  it('procura também no concelho, não só no nome', () => {
    expect(combina(e({ nome: 'Estado Maior da Força Aérea', concelhos: ['Sintra'] }), { ...vazio, termo: 'sintra' })).toBe(true);
  });

  it('filtra por tipo e por concelho', () => {
    const junta = e({ nome: 'Freguesia de Colares', concelhos: ['Sintra'] });
    expect(combina(junta, { ...vazio, tipos: ['freguesia'] })).toBe(true);
    expect(combina(junta, { ...vazio, tipos: ['municipio'] })).toBe(false);
    expect(combina(junta, { ...vazio, concelhos: ['Sintra'] })).toBe(true);
    expect(combina(junta, { ...vazio, concelhos: ['Porto'] })).toBe(false);
    // O concelho compara-se sem acentos: quem escolhe "Évora" não pode falhar "Evora".
    expect(combina(e({ concelhos: ['Évora'] }), { ...vazio, concelhos: ['Evora'] })).toBe(true);
  });

  it('os crivos somam-se: tem de passar em todos', () => {
    const junta = e({ nome: 'Freguesia de Colares', concelhos: ['Sintra'] });
    expect(combina(junta, { termo: 'colares', tipos: ['freguesia'], concelhos: ['Sintra'] })).toBe(true);
    expect(combina(junta, { termo: 'colares', tipos: ['municipio'], concelhos: ['Sintra'] })).toBe(false);
  });
});

describe('ordenar', () => {
  const lista = [
    e({ nome: 'Beja', contratos: 2, totalCents: 900_00, ultimo: '2026-05-01' }),
    e({ nome: 'Aveiro', contratos: 9, totalCents: 100_00, ultimo: '2024-01-01' }),
    e({ nome: 'Coimbra', contratos: 2, totalCents: 500_00, ultimo: '2026-09-01' }),
  ];

  it('por frequência, por nome, por valor e por recência', () => {
    expect(ordenar(lista, 'frequencia').map((x) => x.nome)).toEqual(['Aveiro', 'Beja', 'Coimbra']);
    expect(ordenar(lista, 'nome').map((x) => x.nome)).toEqual(['Aveiro', 'Beja', 'Coimbra']);
    expect(ordenar(lista, 'valor').map((x) => x.nome)).toEqual(['Beja', 'Coimbra', 'Aveiro']);
    expect(ordenar(lista, 'recente').map((x) => x.nome)).toEqual(['Coimbra', 'Beja', 'Aveiro']);
  });

  it('quem não tem data vai para o fim, não para o princípio', () => {
    const r = ordenar([e({ nome: 'Sem data', ultimo: null }), e({ nome: 'Com data', ultimo: '2020-01-01' })], 'recente');
    expect(r.map((x) => x.nome)).toEqual(['Com data', 'Sem data']);
  });

  it('não mexe na lista que recebe', () => {
    const original = [...lista];
    ordenar(lista, 'nome');
    expect(lista).toEqual(original);
  });
});

describe('sugestoes', () => {
  const lista = [
    e({ nome: 'Câmara Municipal de Vila Nova de Gaia', contratos: 32, concelhos: ['Vila Nova de Gaia'] }),
    e({ nome: 'Associação de Gaiatos do Porto', contratos: 2, concelhos: ['Porto'] }),
    e({ nome: 'Município de Sintra', contratos: 79, concelhos: ['Sintra'] }),
  ];

  it('não sugere nada com menos de duas letras', () => {
    expect(sugestoes('g', lista)).toEqual([]);
  });

  it('sugere só o que existe mesmo nos dados', () => {
    const r = sugestoes('gaia', lista).map((s) => s.valor);
    expect(r).toContain('Vila Nova de Gaia');
    expect(r.every((v) => lista.some((x) => x.nome === v || x.concelhos.includes(v)))).toBe(true);
  });

  it('quem começa a palavra vem antes de quem a tem a meio', () => {
    // "Gaia" (concelho, começo de palavra) antes de "Associação de Gaiatos".
    const r = sugestoes('gaia', lista).map((s) => s.valor);
    expect(r.indexOf('Vila Nova de Gaia')).toBeLessThan(r.indexOf('Associação de Gaiatos do Porto'));
  });

  it('distingue entidade de concelho, para o ecrã o poder dizer', () => {
    const r = sugestoes('sintra', lista);
    expect(r.some((s) => s.gentio === 'concelho' && s.valor === 'Sintra')).toBe(true);
    expect(r.some((s) => s.gentio === 'entidade' && s.valor === 'Município de Sintra')).toBe(true);
  });

  it('ignora acentos nos dois sentidos', () => {
    expect(sugestoes('associacao', lista).map((s) => s.valor)).toContain('Associação de Gaiatos do Porto');
  });
});

describe('filtrar e normalizar', () => {
  it('normalizar tira acentos e maiúsculas', () => {
    expect(normalizar('  Câmara MUNICIPAL  ')).toBe('camara municipal');
  });

  it('filtrar devolve só os que combinam', () => {
    const lista = [e({ nome: 'Município de Sintra' }), e({ nome: 'Freguesia de Colares' })];
    expect(filtrar(lista, { termo: '', tipos: ['freguesia'], concelhos: [] }).map((x) => x.nome)).toEqual(['Freguesia de Colares']);
  });
});

describe('equivalências do portal', () => {
  const vazio = { termo: '', tipos: [], concelhos: [] };

  it('"camara gaia" encontra o município, que é como o portal o grava', () => {
    const gaia = e({ nome: 'Município de Vila Nova de Gaia', concelhos: ['Vila Nova de Gaia'] });
    expect(combina(gaia, { ...vazio, termo: 'camara gaia' })).toBe(true);
    expect(combina(gaia, { ...vazio, termo: 'câmara municipal de gaia' })).toBe(true);
  });

  it('e ao contrário: "municipio" encontra a câmara municipal', () => {
    const vfx = e({ nome: 'Câmara Municipal de Vila Franca de Xira', concelhos: ['Vila Franca de Xira'] });
    expect(combina(vfx, { ...vazio, termo: 'municipio xira' })).toBe(true);
  });

  it('"junta" encontra freguesias e "misericordia" encontra a santa casa', () => {
    expect(combina(e({ nome: 'Freguesia de Colares' }), { ...vazio, termo: 'junta colares' })).toBe(true);
    expect(combina(e({ nome: 'Santa Casa da Misericórdia de Elvas' }), { ...vazio, termo: 'misericordia elvas' })).toBe(true);
  });

  it('a equivalência não alarga o crivo a quem não tem nada a ver', () => {
    const gaia = e({ nome: 'Município de Vila Nova de Gaia', concelhos: ['Vila Nova de Gaia'] });
    expect(combina(gaia, { ...vazio, termo: 'camara porto' })).toBe(false);
  });

  it('sugere a entidade equivalente, mas depois dos acertos directos', () => {
    const lista = [
      e({ nome: 'Município de Vila Nova de Gaia', contratos: 40 }),
      e({ nome: 'Câmara Municipal de Oeiras', contratos: 5, concelhos: ['Oeiras'] }),
    ];
    const r = sugestoes('camara', lista).map((s) => s.valor);
    // "Câmara Municipal de Oeiras" tem a palavra escrita; o Município de Gaia entra por equivalência,
    // apesar de ter oito vezes mais contratos.
    expect(r[0]).toBe('Câmara Municipal de Oeiras');
    expect(r).toContain('Município de Vila Nova de Gaia');
  });
});
