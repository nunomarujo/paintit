import { describe, expect, it } from 'vitest';
import { declaracaoDasCaleiras, metrosParaCm, parseCaleiras, SEM_CALEIRAS } from './caleiras';
import { WORK_TYPES, parseRequest, tipoPrincipal } from './request';

const getter = (o: Record<string, string>) => (k: string) => o[k] ?? '';

describe('caleiras', () => {
  it('é o último tipo de obra: não muda o principal de nenhum pedido existente', () => {
    expect(WORK_TYPES.at(-1)).toBe('caleiras');
    expect(tipoPrincipal(['caleiras', 'interior'])).toBe('interior');
    expect(tipoPrincipal(['caleiras'])).toBe('caleiras');
  });

  it('metros: vírgula ou ponto, até duas casas, positivos e com limite', () => {
    expect(metrosParaCm('12,5')).toBe(1250);
    expect(metrosParaCm(' 6.25 ')).toBe(625);
    expect(metrosParaCm('')).toBeUndefined();
    expect(metrosParaCm('0')).toBeNull();
    expect(metrosParaCm('-3')).toBeNull();
    expect(metrosParaCm('1,234')).toBeNull();
    expect(metrosParaCm('abc')).toBeNull();
    expect(metrosParaCm('5000')).toBeNull();
  });

  it('sem o tipo marcado, nada fica gravado, mesmo que o navegador mande valores', () => {
    const r = parseCaleiras(getter({ caleirasIntervencao: 'renovar', caleirasMetrosSubstituir: '3' }), false);
    expect(r.value).toEqual(SEM_CALEIRAS);
    expect(r.errors).toEqual({});
  });

  it('a intervenção é obrigatória; «Substituir partes» pede os metros', () => {
    expect(parseCaleiras(getter({}), true).errors.caleirasIntervencao).toBeDefined();
    expect(parseCaleiras(getter({ caleirasIntervencao: 'substituir_partes' }), true).errors.caleirasMetrosSubstituir).toBeDefined();
    const ok = parseCaleiras(getter({ caleirasIntervencao: 'substituir_partes', caleirasMetrosSubstituir: '6,5', caleirasEstado: 'ferrugem' }), true);
    expect(ok.errors).toEqual({});
    expect(ok.value).toEqual({ estado: 'ferrugem', intervencao: 'substituir_partes', metrosSubstituirCm: 650, comprimentoCm: null });
  });

  it('metros a substituir só com «Substituir partes»; nunca mais do que o total', () => {
    expect(parseCaleiras(getter({ caleirasIntervencao: 'apenas_limpar', caleirasMetrosSubstituir: '6' }), true).value.metrosSubstituirCm).toBeNull();
    const r = parseCaleiras(getter({ caleirasIntervencao: 'substituir_partes', caleirasMetrosSubstituir: '30', caleirasComprimento: '20' }), true);
    expect(r.errors.caleirasMetrosSubstituir).toMatch(/comprimento total/);
  });

  it('valores fora das listas são erros', () => {
    expect(parseCaleiras(getter({ caleirasIntervencao: 'pintar' }), true).errors.caleirasIntervencao).toBeDefined();
    expect(parseCaleiras(getter({ caleirasIntervencao: 'renovar', caleirasEstado: 'excelente' }), true).errors.caleirasEstado).toBeDefined();
  });

  it('a frase do contrato e do anúncio', () => {
    expect(declaracaoDasCaleiras(SEM_CALEIRAS)).toBeNull();
    expect(declaracaoDasCaleiras({ estado: 'ferrugem', intervencao: 'substituir_partes', metrosSubstituirCm: 650, comprimentoCm: 2400 })).toBe(
      'Caleiras — Substituir partes: 6,5 m; estado declarado: ferrugem; comprimento total declarado: 24 m.',
    );
    expect(declaracaoDasCaleiras({ estado: null, intervencao: 'apenas_limpar', metrosSubstituirCm: null, comprimentoCm: null })).toBe('Caleiras — Apenas limpar.');
  });

  it('o pedido lê as caleiras só com o tipo marcado', () => {
    const f = new FormData();
    for (const [k, v] of [['buildingId', 'b'], ['titulo', 't'], ['tipoObra', 'caleiras'], ['caleirasIntervencao', 'renovar']] as const) f.append(k, v);
    const r = parseRequest(f);
    expect(r.value?.caleiras.intervencao).toBe('renovar');
    expect(r.value?.tiposObra).toEqual(['caleiras']);
  });
});
