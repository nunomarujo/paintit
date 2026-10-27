import { describe, expect, it } from 'vitest';
import { WORKS } from './works';
import { QUOTE_TEMPLATES, lembretes, linhasQueHerdam, trabalhosDoModelo, trabalhosDosModelos, trabalhosFora } from './quoteTemplates';

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

describe('vários modelos na mesma obra', () => {
  it('junta a fachada com as zonas comuns sem repetir capítulos', () => {
    const l = trabalhosDosModelos(['fachada_reboco', 'zonas_comuns']).map((w) => w.code);
    expect(new Set(l).size).toBe(l.length);
    expect(l).toContain('rebocos');
    expect(l).toContain('metais_madeiras');
  });

  it('a limpeza final fica sempre no fim, mesmo quando o segundo modelo traz capítulos novos', () => {
    const l = trabalhosDosModelos(['fachada_reboco', 'zonas_comuns']).map((w) => w.code);
    expect(l[l.length - 1]).toBe('conclusao');
    expect(l.indexOf('metais_madeiras')).toBeLessThan(l.indexOf('acessos'));
  });

  it('a ordem de execução do primeiro modelo não se perde', () => {
    const l = trabalhosDosModelos(['fachada_degradada', 'muros']).map((w) => w.code);
    expect(l.indexOf('humidade')).toBeLessThan(l.indexOf('fissuras'));
    expect(l.indexOf('primario')).toBeLessThan(l.indexOf('pintura_final'));
  });

  it('escolher um modelo duas vezes é igual a escolhê-lo uma', () => {
    expect(trabalhosDosModelos(['muros', 'muros'])).toEqual(trabalhosDosModelos(['muros']));
  });

  it('juntar modelos nunca sai do catálogo de trabalhos', () => {
    const codigos = new Set(WORKS.map((w) => w.code));
    const l = trabalhosDosModelos(QUOTE_TEMPLATES.map((t) => t.code));
    for (const w of l) expect(codigos).toContain(w.code);
    expect(l.length).toBeLessThanOrEqual(WORKS.length);
  });

  it('o que fica de fora continua a fechar a conta com o que está dentro', () => {
    const escolha = ['zonas_comuns', 'muros'];
    const dentro = trabalhosDosModelos(escolha).map((w) => w.code);
    const fora = trabalhosFora(escolha).map((w) => w.code);
    expect(dentro.length + fora.length).toBe(WORKS.length);
  });

  it('sem modelo nenhum não inventa capítulos', () => {
    expect(trabalhosDosModelos([])).toEqual([]);
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
