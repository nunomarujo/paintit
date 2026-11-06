import { describe, expect, it } from 'vitest';
import { campanhaSeguinte, decidirCampanha, escolherVariante, podeContactarPorEmail, sequenciaDeCampanhas } from './crm';

describe('podeContactarPorEmail', () => {
  it('aceita uma pessoa coletiva com email', () => {
    expect(podeContactarPorEmail({ email: 'a@b.pt', pessoaColetiva: true, desistiuEm: null })).toEqual({ ok: true });
  });
  it('recusa pessoa singular, desistência e falta de email', () => {
    expect(podeContactarPorEmail({ email: 'a@b.pt', pessoaColetiva: false, desistiuEm: null }).ok).toBe(false);
    expect(podeContactarPorEmail({ email: 'a@b.pt', pessoaColetiva: true, desistiuEm: '2026-11-01' }).ok).toBe(false);
    expect(podeContactarPorEmail({ email: null, pessoaColetiva: true, desistiuEm: null }).ok).toBe(false);
  });
});

describe('sequência de campanhas', () => {
  it('cada tipo tem a sua, a começar na 1', () => {
    expect(sequenciaDeCampanhas('pintor')).toEqual(['pintor-1', 'pintor-2']);
    expect(sequenciaDeCampanhas('administradora')).toEqual(['condominio-1', 'condominio-2']);
  });
  it('avança e acaba', () => {
    const s = sequenciaDeCampanhas('fornecedor');
    expect(campanhaSeguinte(s, 'fornecedor-1')).toBe('fornecedor-2');
    expect(campanhaSeguinte(s, 'fornecedor-2')).toBeNull();
    expect(campanhaSeguinte(s, 'desconhecida')).toBeNull();
  });
});

describe('decidirCampanha', () => {
  const base = { enviados: 40, respostas: 4, adesoes: 0, desistencias: 0 };
  it('continua quando resulta', () => expect(decidirCampanha(base, 10).acao).toBe('continuar'));
  it('continua com amostra curta, mesmo sem respostas', () => {
    expect(decidirCampanha({ enviados: 10, respostas: 0, adesoes: 0, desistencias: 0 }, 5).acao).toBe('continuar');
  });
  it('avança quando não resulta', () => {
    expect(decidirCampanha({ ...base, respostas: 0 }, 10).acao).toBe('avancar');
  });
  it('avança quando a zona está esgotada', () => expect(decidirCampanha(base, 0).acao).toBe('avancar'));
  it('pára com desistências acima de 5%, e isso vence tudo', () => {
    expect(decidirCampanha({ ...base, desistencias: 3 }, 0).acao).toBe('parar');
    expect(decidirCampanha({ ...base, desistencias: 2 }, 10).acao).toBe('continuar');
  });
});

describe('escolherVariante', () => {
  it('sem variantes não há escolha', () => expect(escolherVariante([])).toBeNull());
  it('experimenta primeiro a que nunca saiu', () => {
    expect(escolherVariante([{ id: 'a', tentativas: 50, sucessos: 20 }, { id: 'b', tentativas: 0, sucessos: 0 }])).toBe('b');
  });
  it('depois favorece a que rende mais', () => {
    expect(escolherVariante([{ id: 'a', tentativas: 100, sucessos: 2 }, { id: 'b', tentativas: 100, sucessos: 20 }])).toBe('b');
  });
  it('mas dá outra hipótese à pouco testada', () => {
    expect(escolherVariante([{ id: 'a', tentativas: 1000, sucessos: 100 }, { id: 'b', tentativas: 5, sucessos: 0 }])).toBe('b');
  });
});
