import { describe, expect, it } from 'vitest';
import { cobre, lerCobertura, resumoDaCobertura, zonasDefinidas } from './coberturaDaEmpresa';

describe('cobertura da empresa (06/11/2026: concelhos obrigatórios, «todo o país» explícito)', () => {
  it('sem zona gravada, ou com a lista vazia, não cobre nada', () => {
    expect(zonasDefinidas(null)).toBe(false);
    expect(zonasDefinidas({ todoOPais: false, concelhos: [] })).toBe(false);
    expect(cobre(null, 'Lisboa')).toBe(false);
    expect(cobre({ todoOPais: false, concelhos: [] }, 'Lisboa')).toBe(false);
    expect(resumoDaCobertura(null)).toBe('sem concelhos escolhidos');
  });

  it('uma lista cobre só os seus concelhos', () => {
    const c = { todoOPais: false, concelhos: ['Lisboa', 'Oeiras'] };
    expect(zonasDefinidas(c)).toBe(true);
    expect(cobre(c, 'Oeiras')).toBe(true);
    expect(cobre(c, 'Porto')).toBe(false);
    expect(resumoDaCobertura(c)).toBe('2 concelhos cobertos');
    expect(resumoDaCobertura({ todoOPais: false, concelhos: ['Lisboa'] })).toBe('1 concelho coberto');
  });

  it('«todo o país» só quando marcado', () => {
    const c = { todoOPais: true, concelhos: [] };
    expect(zonasDefinidas(c)).toBe(true);
    expect(cobre(c, 'Porto')).toBe(true);
    expect(resumoDaCobertura(c)).toBe('todo o país');
  });

  it('o formulário: nada escolhido é um erro, não «todo o país»', () => {
    expect(lerCobertura(false, [])).toEqual({ erro: expect.stringMatching(/pelo menos um concelho/) });
    expect(lerCobertura(false, ['  '])).toEqual({ erro: expect.stringMatching(/pelo menos um concelho/) });
  });

  it('o formulário: só concelhos conhecidos, sem repetidos; «todo o país» ignora a lista', () => {
    expect(lerCobertura(false, ['Lisboa', 'Lisboa', ' Oeiras '])).toEqual({ value: { todoOPais: false, concelhos: ['Lisboa', 'Oeiras'] } });
    expect(lerCobertura(false, ['Lisboa', 'Atlântida'])).toEqual({ erro: expect.stringMatching(/Atlântida/) });
    expect(lerCobertura(true, ['Lisboa'])).toEqual({ value: { todoOPais: true, concelhos: [] } });
  });
});
