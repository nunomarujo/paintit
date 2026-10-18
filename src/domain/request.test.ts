import { describe, expect, it } from 'vitest';
import {
  formatArea,
  parseRequest,
  parseSurface,
  publishBlockers,
  revealingContent,
  surfaceArea,
  type SurfaceInput,
} from './request';

describe('formulário do pedido', () => {
  it('lê vários trabalhos e valida as datas de execução', () => {
    const f = new FormData();
    f.set('buildingId', 'b1');
    f.set('titulo', 'Fachadas 2027');
    f.set('tipoObra', 'fachadas');
    f.append('trabalhos', 'lavagem');
    f.append('trabalhos', 'pintura');
    f.set('execucaoDesde', '2027-05-01');
    f.set('execucaoAte', '2027-04-01');
    const r = parseRequest(f);
    expect(r.errors.execucaoAte).toBeDefined();
    f.set('execucaoAte', '2027-06-30');
    expect(parseRequest(f).value?.trabalhos).toEqual(['lavagem', 'pintura']);
  });
});

const base: SurfaceInput = {
  kind: 'fachada',
  descricao: null,
  areaDireta: null,
  larguraCm: null,
  alturaCm: null,
  vaosCm2: null,
  quantidade: 1,
  origem: 'estimativa',
};

describe('área das superfícies', () => {
  it('largura × altura − vãos', () => {
    // 12 m × 15,5 m = 186 m², menos 24,5 m² de janelas = 161,5 m².
    expect(surfaceArea({ ...base, larguraCm: 1200, alturaCm: 1550, vaosCm2: 2450 })).toBe(16150);
  });

  it('a área direta prevalece e multiplica pela quantidade', () => {
    expect(surfaceArea({ ...base, areaDireta: 350, larguraCm: 1000, alturaCm: 1000, quantidade: 8 })).toBe(2800);
  });

  it('nunca é negativa', () => {
    expect(surfaceArea({ ...base, larguraCm: 100, alturaCm: 100, vaosCm2: 99_999 })).toBe(0);
  });

  it('formata em m² à portuguesa', () => {
    expect(formatArea(16150)).toBe('161,5 m²');
  });
});

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

describe('formulário de superfície', () => {
  it('aceita vírgula decimal', () => {
    const r = parseSurface(form({ kind: 'fachada', largura: '12', altura: '15,5', vaos: '24,5' }));
    expect(r.errors).toEqual({});
    expect(surfaceArea(r.value!)).toBe(16150);
  });

  it('exige área ou dimensões', () => {
    expect(parseSurface(form({ kind: 'fachada' })).errors.area).toBeDefined();
  });

  it('recusa mais de duas casas decimais e quantidade zero', () => {
    const r = parseSurface(form({ kind: 'muro', area: '10,123', quantidade: '0' }));
    expect(Object.keys(r.errors).sort()).toEqual(['area', 'quantidade']);
  });
});

describe('anonimato do texto', () => {
  it.each([
    ['Ligue para 912 345 678', 'um número de telefone'],
    ['Contacto: admin@condominio.pt', 'um email'],
    ['Prédio na Rua das Flores', 'uma morada'],
    ['Código 1200-195', 'um código postal'],
    ['Ver www.exemplo.pt', 'um endereço web'],
    ['Lote 12, junto ao parque', 'um número de porta ou lote'],
  ])('deteta em "%s"', (text, reason) => {
    expect(revealingContent(text)).toContain(reason);
  });

  it('deixa passar uma descrição normal', () => {
    expect(
      revealingContent('Prédio de 6 pisos com fissuras na fachada norte e tinta a descascar nas varandas.'),
    ).toEqual([]);
  });
});

describe('publicação', () => {
  const ok = {
    descricao: 'Pintura das quatro fachadas e tetos das varandas; há fissuras na fachada norte.',
    prazoPropostas: '2026-11-01',
    surfacesArea: [16150],
    today: '2026-10-19',
  };

  it('um pedido completo pode ser publicado', () => {
    expect(publishBlockers(ok)).toEqual([]);
  });

  it('também verifica as descrições das superfícies', () => {
    expect(publishBlockers({ ...ok, otherTexts: ['Fachada virada para a Avenida da Liberdade'] })).toHaveLength(1);
  });

  it('exige área, descrição sem contactos e pelo menos 7 dias para propostas', () => {
    const r = publishBlockers({ ...ok, surfacesArea: [], descricao: 'Ligue 912345678 para visitar a obra hoje mesmo', prazoPropostas: '2026-10-22' });
    expect(r).toHaveLength(3);
  });
});
