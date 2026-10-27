import { describe, expect, it } from 'vitest';
import { aceitacaoSimples } from './aceitacaoSimples';

describe('aceitacaoSimples', () => {
  it('em produção nunca, por muito que a variável diga que sim', () => {
    expect(aceitacaoSimples({ NODE_ENV: 'production', PERMITIR_ACEITACAO_SIMPLES: '1' })).toBe(false);
  });

  it('fora de produção, só com a variável a 1', () => {
    expect(aceitacaoSimples({ NODE_ENV: 'development', PERMITIR_ACEITACAO_SIMPLES: '1' })).toBe(true);
    expect(aceitacaoSimples({ NODE_ENV: 'development', PERMITIR_ACEITACAO_SIMPLES: '0' })).toBe(false);
    expect(aceitacaoSimples({ NODE_ENV: 'development' })).toBe(false);
  });

  it('sem ambiente nenhum declarado, fica desligada', () => {
    expect(aceitacaoSimples({})).toBe(false);
  });
});
