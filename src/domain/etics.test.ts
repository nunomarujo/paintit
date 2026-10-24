import { describe, expect, it } from 'vitest';
import {
  ACABAMENTOS,
  ACABAMENTO_INFO,
  CAMADAS,
  ESPESSURAS_MM,
  ISOLANTES,
  ISOLANTE_INFO,
  cabecalhoTrabalho,
  camadasDe,
  capotoEmFalta,
  isAcabamento,
  isIsolante,
  isSituacao,
  resumoCapoto,
  type CapotoSpec,
} from './etics';

const novo: CapotoSpec = { situacao: 'novo', isolante: 'eps', espessuraMm: 60, acabamento: 'siloxano', demaos: 2 };

describe('materiais do capoto', () => {
  it('todos os isolantes e acabamentos têm descrição, vantagens e cuidados', () => {
    for (const i of ISOLANTES) {
      const info = ISOLANTE_INFO[i];
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.resumo.length).toBeGreaterThan(0);
      expect(info.vantagens.length).toBeGreaterThan(0);
      // Um orçamento honesto diz também o que o material não faz.
      expect(info.cuidados.length).toBeGreaterThan(0);
    }
    for (const a of ACABAMENTOS) {
      expect(ACABAMENTO_INFO[a].vantagens.length).toBeGreaterThan(0);
      expect(ACABAMENTO_INFO[a].cuidados.length).toBeGreaterThan(0);
    }
  });

  it('as condutibilidades são intervalos coerentes', () => {
    for (const i of ISOLANTES) {
      const [min, max] = ISOLANTE_INFO[i].lambda;
      expect(min).toBeLessThanOrEqual(max);
      expect(min).toBeGreaterThan(0.02);
      expect(max).toBeLessThan(0.06);
    }
  });

  it('o EPS grafitado isola mais por centímetro do que o EPS branco', () => {
    expect(ISOLANTE_INFO.eps_grafitado.lambda[1]).toBeLessThan(ISOLANTE_INFO.eps.lambda[0] + 0.006);
    expect(ISOLANTE_INFO.eps_grafitado.lambda[0]).toBeLessThan(ISOLANTE_INFO.eps.lambda[0]);
  });

  it('só a lã mineral não arde', () => {
    expect(ISOLANTE_INFO.la_mineral.fogo).toMatch(/não combustível/i);
    for (const i of ISOLANTES.filter((x) => x !== 'la_mineral')) {
      expect(ISOLANTE_INFO[i].fogo).not.toMatch(/não combustível/i);
    }
  });

  it('as espessuras correntes incluem as habituais em Portugal', () => {
    expect(ESPESSURAS_MM).toContain(60);
    expect(ESPESSURAS_MM).toContain(80);
  });

  it('recusa valores que não sejam da lista', () => {
    expect(isIsolante('eps')).toBe(true);
    expect(isIsolante('esferovite')).toBe(false);
    expect(isAcabamento('siloxano')).toBe(true);
    expect(isAcabamento('tinta')).toBe(false);
    expect(isSituacao('manutencao')).toBe(true);
    expect(isSituacao('qualquer')).toBe(false);
  });
});

describe('o que falta especificar', () => {
  it('um capoto novo precisa de isolante, espessura e acabamento', () => {
    expect(capotoEmFalta(novo)).toEqual([]);
    expect(capotoEmFalta({ ...novo, isolante: null, espessuraMm: null, acabamento: null })).toEqual([
      'isolante',
      'espessura',
      'acabamento',
    ]);
  });

  it('numa manutenção não se pergunta o isolante nem a espessura', () => {
    const manut: CapotoSpec = { situacao: 'manutencao', isolante: null, espessuraMm: null, acabamento: 'silicone', demaos: 2 };
    expect(capotoEmFalta(manut)).toEqual([]);
  });

  it('uma espessura absurda é recusada', () => {
    expect(capotoEmFalta({ ...novo, espessuraMm: 5 })).toContain('espessura válida');
    expect(capotoEmFalta({ ...novo, espessuraMm: 500 })).toContain('espessura válida');
  });
});

describe('camadas do sistema', () => {
  it('um capoto novo leva todas as camadas', () => {
    expect(camadasDe(novo)).toEqual(CAMADAS.map((c) => c.id));
  });

  it('uma manutenção só mexe no acabamento', () => {
    const camadas = camadasDe({ ...novo, situacao: 'manutencao' });
    expect(camadas).toEqual(['preparacao', 'primario', 'acabamento']);
    expect(camadas).not.toContain('isolante');
  });
});

describe('como se identifica no cabeçalho', () => {
  it('distingue pintura, capoto e os dois', () => {
    expect(cabecalhoTrabalho({ temPintura: true, temCapoto: false })).toBe('Pintura');
    expect(cabecalhoTrabalho({ temPintura: false, temCapoto: true })).toBe('Capoto');
    expect(cabecalhoTrabalho({ temPintura: true, temCapoto: true })).toBe('Pintura e capoto');
  });

  it('o resumo diz isolante, espessura e acabamento', () => {
    expect(resumoCapoto(novo)).toBe('Capoto novo: EPS (poliestireno expandido), 60 mm, acabamento siloxano');
  });

  it('o resumo de uma manutenção não inventa isolante nenhum', () => {
    const r = resumoCapoto({ situacao: 'manutencao', isolante: null, espessuraMm: null, acabamento: 'silicone', demaos: 2 });
    expect(r).toBe('Manutenção de capoto existente, acabamento silicone');
    expect(r).not.toMatch(/mm/);
  });

  it('o que falta aparece como "por definir", em vez de desaparecer', () => {
    expect(resumoCapoto({ ...novo, isolante: null })).toContain('isolante por definir');
  });
});

describe('ligação ao catálogo', () => {
  it('cada isolante tem um tipo de produto do catálogo, e todos são diferentes', async () => {
    const { TIPO_PRODUTO, TIPO_PRODUTO_COMPLEMENTOS } = await import('./etics');
    const { PRODUCT_TYPES } = await import('./catalog');
    const tipos = ISOLANTES.map((i) => TIPO_PRODUTO[i]);
    expect(new Set(tipos).size).toBe(ISOLANTES.length);
    for (const t of [...tipos, ...TIPO_PRODUTO_COMPLEMENTOS]) {
      expect(PRODUCT_TYPES).toContain(t);
    }
  });
});

describe('cor do acabamento', () => {
  it('entra no resumo quando foi indicada', () => {
    expect(resumoCapoto({ ...novo, cor: 'Branco sujo' })).toContain('cor Branco sujo');
  });

  it('não inventa cor nenhuma quando falta', () => {
    expect(resumoCapoto(novo)).not.toContain('cor ');
    expect(resumoCapoto({ ...novo, cor: '   ' })).not.toContain('cor ');
  });
});
