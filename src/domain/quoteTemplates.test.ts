import { describe, expect, it } from 'vitest';
import { WORKS } from './works';
import { QUOTE_TEMPLATES, lembretes, linhasQueHerdam, trabalhosDoModelo, trabalhosFora } from './quoteTemplates';

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

describe('a primeira área enche as linhas por preencher', () => {
  const linhas = [
    { id: 'a', unidade: 'm2', quantidade: 0 },
    { id: 'b', unidade: 'm2', quantidade: 0 },
    { id: 'c', unidade: 'm2', quantidade: 1_250 },
    { id: 'd', unidade: 'ml', quantidade: 0 },
    { id: 'e', unidade: 'vg', quantidade: 0 },
  ];

  it('passa a área às outras linhas em m² que estão a zero', () => {
    expect(linhasQueHerdam(linhas, { id: 'a', unidade: 'm2', quantidade: 3_000 })).toEqual(['b']);
  });

  it('nunca mexe numa quantidade já escrita', () => {
    const r = linhasQueHerdam(linhas, { id: 'a', unidade: 'm2', quantidade: 3_000 });
    expect(r).not.toContain('c');
  });

  it('não contamina metros lineares nem verbas globais', () => {
    const r = linhasQueHerdam(linhas, { id: 'a', unidade: 'm2', quantidade: 3_000 });
    expect(r).not.toContain('d');
    expect(r).not.toContain('e');
  });

  it('metros lineares não herdam: a fissura e o rodapé não têm o mesmo comprimento', () => {
    expect(linhasQueHerdam(linhas, { id: 'd', unidade: 'ml', quantidade: 500 })).toEqual([]);
  });

  it('apagar a quantidade não apaga as outras', () => {
    expect(linhasQueHerdam(linhas, { id: 'a', unidade: 'm2', quantidade: 0 })).toEqual([]);
  });
});
