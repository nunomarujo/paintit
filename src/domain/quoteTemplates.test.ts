import { describe, expect, it } from 'vitest';
import { WORKS } from './works';
import { QUOTE_TEMPLATES, lembretes, trabalhosDoModelo, trabalhosFora } from './quoteTemplates';

describe('modelos de orçamento', () => {
  it('todos os modelos só apontam para trabalhos que existem', () => {
    const codigos = new Set(WORKS.map((w) => w.code));
    for (const t of QUOTE_TEMPLATES) {
      for (const c of t.trabalhos) expect(codigos, `${t.code} → ${c}`).toContain(c);
    }
  });

  it('o modelo mais comum traz a fachada pela ordem de execução', () => {
    const l = trabalhosDoModelo('fachada_reboco').map((w) => w.code);
    expect(l.indexOf('lavagem')).toBeLessThan(l.indexOf('primario'));
    expect(l.indexOf('primario')).toBeLessThan(l.indexOf('pintura_final'));
  });

  it('nenhum modelo traz preços — os preços são do pintor', () => {
    for (const t of QUOTE_TEMPLATES) expect(JSON.stringify(t)).not.toMatch(/preco|price|cents/i);
  });

  it('deixa sempre acrescentar o que ficou de fora', () => {
    const dentro = trabalhosDoModelo('metais').map((w) => w.code);
    const fora = trabalhosFora('metais').map((w) => w.code);
    expect(dentro.length + fora.length).toBe(WORKS.length);
    expect(fora).toContain('acessos');
  });

  it('um modelo que não existe não rebenta nada', () => {
    expect(trabalhosDoModelo('inventado')).toEqual([]);
  });
});

describe('lembretes', () => {
  it('avisa quando faltam acessos e limpeza final, que é onde se perde dinheiro', () => {
    expect(lembretes(['pintura_final'])).toHaveLength(2);
    expect(lembretes(['pintura_final'])[0]).toContain('acessos');
  });

  it('cala-se quando estão previstos', () => {
    expect(lembretes(['acessos', 'conclusao'])).toEqual([]);
  });
});
