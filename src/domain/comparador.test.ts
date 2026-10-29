import { describe, expect, it } from 'vitest';
import { coberturaEmPalavras, porEsclarecer, quantidadeEmPalavras, trabalhosDaProposta } from './comparador';
import type { ProposalLine } from './proposal';

// Os códigos são os do catálogo do orçamento guiado (src/domain/works.ts): o trabalho que o cliente
// pede como "pintura" gera linhas com o código `pintura_final`.
const linha = (p: Partial<ProposalLine>): ProposalLine => ({
  categoria: 'pintura',
  descricao: '',
  superficie: null,
  quantidade: 24000,
  unidade: 'm2',
  precoUnitario: 200,
  demaos: null,
  produto: null,
  inclusao: 'incluido',
  ...p,
});

const PEDIDOS = ['lavagem', 'pintura', 'reparacao_fissuras'] as const;

describe('o que cada proposta diz sobre cada trabalho pedido', () => {
  it('um trabalho de que a proposta não fala fica "não indicado", e não "excluído"', () => {
    // A diferença evita penalizar quem descreveu de menos tanto como quem recusou o trabalho.
    const t = trabalhosDaProposta(PEDIDOS, [linha({ trabalho: 'pintura_final' })]);
    expect(t.find((x) => x.work === 'lavagem')!.estado).toBe('nao_indicado');
    expect(t.find((x) => x.work === 'pintura')!.estado).toBe('incluido');
  });

  it('as demãos e o produto saem das linhas, que já os guardavam', () => {
    const t = trabalhosDaProposta(['pintura'], [linha({ trabalho: 'pintura_final', demaos: 2, produto: 'CIN Vinylmatt' })]);
    expect(t[0]).toMatchObject({ demaos: 2, produtos: ['CIN Vinylmatt'], precoCents: 48000 });
  });

  it('duas linhas do mesmo trabalho em desacordo sobre as demãos não dão média nenhuma', () => {
    // Uma média de demãos não existe em obra: ou são duas, ou são três.
    const t = trabalhosDaProposta(['pintura'], [
      linha({ trabalho: 'pintura_final', demaos: 2 }),
      linha({ trabalho: 'pintura_final', demaos: 3 }),
    ]);
    expect(t[0]!.demaos).toBeNull();
  });

  it('linhas de acordo mantêm as demãos, e os produtos juntam-se sem repetidos', () => {
    const t = trabalhosDaProposta(['pintura'], [
      linha({ trabalho: 'pintura_final', demaos: 2, produto: 'CIN Vinylmatt' }),
      linha({ trabalho: 'pintura_final', demaos: 2, produto: 'CIN Vinylmatt' }),
      linha({ trabalho: 'pintura_final', demaos: 2, produto: 'Barbot Acryl' }),
    ]);
    expect(t[0]!.demaos).toBe(2);
    expect(t[0]!.produtos).toEqual(['CIN Vinylmatt', 'Barbot Acryl']);
  });

  it('entre estados do mesmo trabalho prevalece o que mais compromete o pintor', () => {
    const t = trabalhosDaProposta(['pintura'], [
      linha({ trabalho: 'pintura_final', inclusao: 'opcional' }),
      linha({ trabalho: 'pintura_final', inclusao: 'incluido' }),
    ]);
    expect(t[0]!.estado).toBe('incluido');
  });

  it('só o que está incluído conta para o preço do trabalho', () => {
    const t = trabalhosDaProposta(['pintura'], [
      linha({ trabalho: 'pintura_final', inclusao: 'incluido', quantidade: 10000, precoUnitario: 200 }),
      linha({ trabalho: 'pintura_final', inclusao: 'opcional', quantidade: 10000, precoUnitario: 900 }),
    ]);
    expect(t[0]!.precoCents).toBe(20000);
  });

  it('unidades que não se somam não produzem quantidade nenhuma', () => {
    const t = trabalhosDaProposta(['pintura'], [
      linha({ trabalho: 'pintura_final', unidade: 'm2', quantidade: 24000 }),
      linha({ trabalho: 'pintura_final', unidade: 'ml', quantidade: 1200 }),
    ]);
    expect(t[0]!.quantidade).toBeNull();
    expect(quantidadeEmPalavras(t[0]!)).toBeNull();
  });

  it('a quantidade lê-se com a sua unidade; a verba global não tem número', () => {
    expect(quantidadeEmPalavras({ quantidade: 24000, unidade: 'm2' })).toBe('240 m²');
    expect(quantidadeEmPalavras({ quantidade: 1250, unidade: 'ml' })).toBe('12,5 m');
    expect(quantidadeEmPalavras({ quantidade: null, unidade: 'vg' })).toBe('verba global');
  });
});

describe('o que falta a cada proposta, em palavras', () => {
  const tudo = trabalhosDaProposta(PEDIDOS, [
    linha({ trabalho: 'lavagem' }),
    linha({ trabalho: 'pintura_final' }),
    linha({ trabalho: 'fissuras' }),
  ]);

  it('tudo incluído diz-se numa frase', () => {
    expect(coberturaEmPalavras(tudo)).toBe('Inclui todos os trabalhos pedidos.');
  });

  it('enumera o que falta, em vez de contar — dez em doze não diz nada', () => {
    const t = trabalhosDaProposta(PEDIDOS, [
      linha({ trabalho: 'pintura_final' }),
      linha({ trabalho: 'fissuras', inclusao: 'nao_incluido' }),
    ]);
    expect(coberturaEmPalavras(t)).toBe('Inclui os trabalhos pedidos, mas exclui reparação de fissuras; não indica lavagem e limpeza.');
  });

  it('sem nada incluído, a frase começa pela ressalva e leva maiúscula', () => {
    const t = trabalhosDaProposta(['lavagem', 'pintura'], [linha({ trabalho: 'pintura_final', inclusao: 'nao_incluido' })]);
    expect(coberturaEmPalavras(t)).toBe('Exclui pintura final; não indica lavagem e limpeza.');
  });

  it('as orações separam-se por ponto e vírgula; só os itens levam "e"', () => {
    // Com "e" nos dois sítios a frase enfiava quatro: ninguém a lia até ao fim.
    const t = trabalhosDaProposta(['lavagem', 'reparacao_fissuras', 'impermeabilizacao', 'pintura'], [
      linha({ trabalho: 'pintura_final' }),
      linha({ trabalho: 'impermeabilizacao', inclusao: 'opcional' }),
    ]);
    expect(coberturaEmPalavras(t)).toBe(
      'Inclui os trabalhos pedidos, mas não indica lavagem e limpeza e reparação de fissuras; deixa impermeabilização como opcional.',
    );
  });

  it('um pedido sem trabalhos enumerados não inventa cobertura', () => {
    expect(coberturaEmPalavras([])).toBe('O pedido não enumera trabalhos.');
  });
});

describe('o que deixa uma pergunta por fazer', () => {
  it('condicionado e não indicado pedem esclarecimento; os outros não', () => {
    expect(porEsclarecer('condicionado')).toBe(true);
    expect(porEsclarecer('nao_indicado')).toBe(true);
    expect(porEsclarecer('excluido')).toBe(false);
    expect(porEsclarecer('incluido')).toBe(false);
    expect(porEsclarecer('opcional')).toBe(false);
  });
});
