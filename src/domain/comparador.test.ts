import { describe, expect, it } from 'vitest';
import {
  coberturaEmPalavras,
  equivalenciaDeTrabalhos,
  mesmosProdutos,
  porEsclarecer,
  quantidadeEmPalavras,
  trabalhosDaProposta,
  type TrabalhoNaProposta,
} from './comparador';
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
      linha({ trabalho: 'lavagem' }),
      linha({ trabalho: 'fissuras', inclusao: 'nao_incluido' }),
    ]);
    expect(coberturaEmPalavras(t)).toBe('Inclui os trabalhos pedidos, mas exclui reparação de fissuras.');
  });

  it('com os incluídos em minoria, nomeiam-se eles — "inclui os trabalhos pedidos, mas…" seria enganador', () => {
    // Uma proposta que orçamentou um trabalho de quatro não "inclui os trabalhos pedidos".
    const t = trabalhosDaProposta(['lavagem', 'reparacao_fissuras', 'pintura', 'impermeabilizacao'], [linha({ trabalho: 'pintura_final' })]);
    expect(coberturaEmPalavras(t)).toBe(
      'Inclui apenas pintura final; não indica lavagem e limpeza, reparação de fissuras e impermeabilização.',
    );
  });

  it('metade incluída ainda conta como "inclui os trabalhos pedidos, mas…"', () => {
    const t = trabalhosDaProposta(['lavagem', 'pintura'], [linha({ trabalho: 'pintura_final' })]);
    expect(coberturaEmPalavras(t)).toBe('Inclui os trabalhos pedidos, mas não indica lavagem e limpeza.');
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
      'Inclui apenas pintura final; não indica lavagem e limpeza e reparação de fissuras; deixa impermeabilização como opcional.',
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

import { classificar, ordenar, ORDEM_LABELS, type Ordenavel, type SinaisDaProposta } from './comparador';

const sinais = (p: Partial<SinaisDaProposta> = {}): SinaisDaProposta => ({
  trabalhos: trabalhosDaProposta(['lavagem', 'pintura'], [
    linha({ trabalho: 'lavagem', produto: 'Alta pressão' }),
    linha({ trabalho: 'pintura_final', produto: 'CIN Vinylmatt', demaos: 2 }),
  ]),
  temCondicionados: false,
  zonasSemPreco: 0,
  precoGlobal: false,
  ...p,
});

describe('as três dimensões, sem pontuação nenhuma', () => {
  it('uma proposta sem reparos diz as três coisas em afirmativo', () => {
    const c = classificar(sinais());
    expect(c.cobertura.completa).toBe(true);
    expect(c.cobertura.reparos).toEqual([]);
    expect(c.definicao.definido).toBe(true);
    expect(c.definicao.frase).toBe('Total apresentado, com preço por trabalho.');
    expect(c.tecnica.confirmada).toBe(true);
    // Diz o que verificou. Não diz que a execução corresponde ao pedido: isso exigiria a preparação
    // do suporte, o sistema e o consumo, que a proposta não é obrigada a declarar.
    expect(c.tecnica.frase).toBe('Identifica produto e demãos em todos os trabalhos incluídos.');
  });

  it('a definição é sobre o preço, não sobre o âmbito: tudo incluído e metade por observar', () => {
    const c = classificar(sinais({ temCondicionados: true }));
    expect(c.cobertura.completa).toBe(true);
    expect(c.definicao.definido).toBe(false);
    expect(c.definicao.frase).toBe('Total apresentado, mas parte do preço só se fecha depois de observar.');
  });

  it('preço global não é falta de definição — é falta de repartição, e diz-se assim', () => {
    const c = classificar(sinais({ precoGlobal: true }));
    expect(c.definicao.definido).toBe(true);
    expect(c.definicao.frase).toBe('Total apresentado, a preço global: não se reparte por trabalho.');
  });

  it('zonas sem preço contam nas duas dimensões, porque são as duas coisas', () => {
    const c = classificar(sinais({ zonasSemPreco: 2 }));
    expect(c.cobertura.reparos).toContain('2 zonas sem preço');
    expect(c.definicao.definido).toBe(false);
  });

  it('com produtos pedidos pelo cliente, a leitura técnica é sobre eles', () => {
    const c = classificar(sinais({ produtosPedidos: { segue: 1, substitui: 1, semIndicacao: 0 } }));
    expect(c.tecnica.frase).toBe('Correspondência técnica por confirmar: substitui 1 produto pedido.');
    const ok = classificar(sinais({ produtosPedidos: { segue: 2, substitui: 0, semIndicacao: 0 } }));
    expect(ok.tecnica.frase).toBe('Segue os produtos pedidos e indica as demãos.');
  });

  it('sem produtos pedidos, repara-se no trabalho incluído que não diz o que aplica', () => {
    const c = classificar(sinais({
      trabalhos: trabalhosDaProposta(['lavagem', 'pintura'], [
        linha({ trabalho: 'lavagem' }),
        linha({ trabalho: 'pintura_final', produto: 'CIN Vinylmatt', demaos: 2 }),
      ]),
    }));
    expect(c.tecnica.frase).toBe('Correspondência técnica por confirmar: 1 trabalho incluído sem produto nomeado.');
  });

  it('as demãos em falta são um reparo técnico — nomear o produto não é corresponder ao pedido', () => {
    const c = classificar(sinais({
      trabalhos: trabalhosDaProposta(['lavagem', 'pintura'], [
        linha({ trabalho: 'lavagem', produto: 'Alta pressão' }),
        linha({ trabalho: 'pintura_final', produto: 'CIN Vinylmatt' }),
      ]),
    }));
    expect(c.tecnica.confirmada).toBe(false);
    expect(c.tecnica.frase).toBe('Correspondência técnica por confirmar: não indica as demãos em 1 trabalho que as leva.');
  });

  it('à lavagem não se exigem demãos: o reparo seria falso', () => {
    const c = classificar(sinais({
      trabalhos: trabalhosDaProposta(['lavagem'], [linha({ trabalho: 'lavagem', produto: 'Alta pressão' })]),
    }));
    expect(c.tecnica.reparos).toEqual([]);
  });
});

describe('âmbito e preço são perguntas diferentes', () => {
  it('um trabalho com preço por fechar está previsto: conta no preço, não como omissão', () => {
    const c = classificar(sinais({
      trabalhos: trabalhosDaProposta(['lavagem', 'pintura'], [
        linha({ trabalho: 'lavagem', produto: 'Alta pressão' }),
        linha({ trabalho: 'pintura_final', produto: 'CIN Vinylmatt', demaos: 2, inclusao: 'condicionado' }),
      ]),
    }));
    expect(c.cobertura.semPrecoFirme).toBe(1);
    expect(c.cobertura.reparos).toContain('1 trabalho com preço por fechar');
    expect(c.cobertura.reparos).not.toContain('1 trabalho não indicado');
  });

  it('um trabalho que a proposta nem refere é omissão de âmbito, e não um preço por fechar', () => {
    const c = classificar(sinais({
      trabalhos: trabalhosDaProposta(['lavagem', 'pintura', 'reparacao_fissuras'], [
        linha({ trabalho: 'lavagem', produto: 'Alta pressão' }),
        linha({ trabalho: 'pintura_final', produto: 'CIN Vinylmatt', demaos: 2 }),
      ]),
    }));
    expect(c.cobertura.semPrecoFirme).toBe(0);
    expect(c.cobertura.reparos).toContain('1 trabalho não indicado');
  });
});

const prop = (p: Partial<Ordenavel> & { id: string }): Ordenavel => ({
  totalComIva: 1000, completa: true, definido: true, porEsclarecer: 0, trabalhosIncluidos: 4,
  duracaoDias: 20, inicioPossivel: '2026-11-10', ...p,
});

describe('ordenar sem recomendar', () => {
  it('por omissão: as completas e firmes primeiro, por total; as outras a seguir', () => {
    const g = ordenar([
      prop({ id: 'cara', totalComIva: 2000 }),
      prop({ id: 'pendente', totalComIva: 500, completa: false }),
      prop({ id: 'barata', totalComIva: 1000 }),
    ], 'padrao');
    expect(g.map((x) => x.propostas.map((p) => p.id))).toEqual([['barata', 'cara'], ['pendente']]);
    expect(g[0]!.titulo).toBe('Incluem tudo o que pediu, com preço firme');
  });

  it('a mais barata não sobe por ser barata se lhe faltar trabalho', () => {
    // É o incentivo que interessa: omitir trabalho deixa de pagar.
    const g = ordenar([prop({ id: 'incompleta', totalComIva: 100, completa: false }), prop({ id: 'inteira', totalComIva: 9000 })], 'padrao');
    expect(g[0]!.propostas[0]!.id).toBe('inteira');
  });

  it('se nenhuma reunir as condições, diz-se — e nenhuma fica escondida', () => {
    const g = ordenar([prop({ id: 'a', completa: false }), prop({ id: 'b', definido: false })], 'padrao');
    expect(g).toHaveLength(1);
    expect(g[0]!.titulo).toBe('Todas as propostas');
    expect(g[0]!.nota).toContain('Nenhuma inclui todos os trabalhos pedidos');
    expect(g[0]!.propostas).toHaveLength(2);
  });

  it('um critério escolhido dá uma lista só, e diz que não é recomendação', () => {
    const g = ordenar([prop({ id: 'longa', duracaoDias: 40 }), prop({ id: 'curta', duracaoDias: 10 })], 'duracao');
    expect(g).toHaveLength(1);
    expect(g[0]!.propostas.map((p) => p.id)).toEqual(['curta', 'longa']);
    expect(g[0]!.nota).toContain('não é uma recomendação');
    expect(g[0]!.titulo).toBe(ORDEM_LABELS.duracao);
  });

  it('cobertura ordena por mais trabalhos incluídos; esclarecer, por menos pendências', () => {
    const ps = [prop({ id: 'pouca', trabalhosIncluidos: 1, porEsclarecer: 3 }), prop({ id: 'muita', trabalhosIncluidos: 6, porEsclarecer: 0 })];
    expect(ordenar(ps, 'cobertura')[0]!.propostas.map((p) => p.id)).toEqual(['muita', 'pouca']);
    expect(ordenar(ps, 'esclarecer')[0]!.propostas.map((p) => p.id)).toEqual(['muita', 'pouca']);
  });

  it('sem duração ou sem data de início, a proposta vai para o fim e não para o princípio', () => {
    const g = ordenar([prop({ id: 'sem', duracaoDias: null }), prop({ id: 'com', duracaoDias: 30 })], 'duracao');
    expect(g[0]!.propostas.map((p) => p.id)).toEqual(['com', 'sem']);
    const i = ordenar([prop({ id: 'sem', inicioPossivel: null }), prop({ id: 'com', inicioPossivel: '2027-01-05' })], 'inicio');
    expect(i[0]!.propostas.map((p) => p.id)).toEqual(['com', 'sem']);
  });

  it('empates resolvem-se pelo total, nunca ao acaso', () => {
    const g = ordenar([prop({ id: 'b', duracaoDias: 20, totalComIva: 5000 }), prop({ id: 'a', duracaoDias: 20, totalComIva: 1000 })], 'duracao');
    expect(g[0]!.propostas.map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('o que é um trabalho directamente comparável', () => {
  // A definição ficou fixada a 29/10/2026, pelo promotor: âmbito, quantidade e execução
  // suficientemente equivalentes, materiais incluídos. A razão é a validade das conclusões — uma
  // parcela em euros que apareça muitas vezes e esteja errada é pior do que uma que apareça poucas
  // e esteja certa.
  const t = (o: Partial<TrabalhoNaProposta> = {}): TrabalhoNaProposta => ({
    work: 'pintura',
    label: 'Pintura de acabamento',
    estado: 'incluido',
    quantidade: 24000,
    unidade: 'm2',
    demaos: 2,
    produtos: ['CIN Vinylmatt'],
    precoCents: 480000,
    ...o,
  });

  it('tudo igual: comparáveis, e sem nada a assinalar', () => {
    const e = equivalenciaDeTrabalhos(t(), t());
    expect(e.equivalentes).toBe(true);
    expect(e.motivos).toEqual([]);
    expect(e.execucaoEquivalente).toBe(true);
    expect(e.quantidadeComparavel).toBe(true);
  });

  it('só o preço diferente continua a ser comparável: é essa a única comparação que vale', () => {
    expect(equivalenciaDeTrabalhos(t(), t({ precoCents: 600000 })).equivalentes).toBe(true);
  });

  it('uma demão a mais quebra a equivalência, e a razão fica nomeada', () => {
    const e = equivalenciaDeTrabalhos(t(), t({ demaos: 1 }));
    expect(e.equivalentes).toBe(false);
    expect(e.motivos).toContain('demaos');
    expect(e.execucaoEquivalente).toBe(false);
  });

  it('produto diferente quebra a equivalência — os materiais contam, foi o que o promotor exigiu', () => {
    const e = equivalenciaDeTrabalhos(t(), t({ produtos: ['Robbialac Vinylsilk'] }));
    expect(e.motivos).toContain('produtos');
    expect(e.execucaoEquivalente).toBe(false);
  });

  it('o mesmo produto escrito de outra maneira não é um produto diferente', () => {
    expect(mesmosProdutos(['CIN Vinylmatt'], ['cin vinylmatt '])).toBe(true);
    expect(equivalenciaDeTrabalhos(t(), t({ produtos: ['  CIN VINYLMATT'] })).execucaoEquivalente).toBe(true);
  });

  it('nenhum dos dois indicar produto é um empate, e não uma diferença', () => {
    expect(equivalenciaDeTrabalhos(t({ produtos: [] }), t({ produtos: [] })).execucaoEquivalente).toBe(true);
  });

  it('quantidade diferente quebra a equivalência, mas a quantidade continua a poder medir-se', () => {
    const e = equivalenciaDeTrabalhos(t(), t({ quantidade: 31000 }));
    expect(e.equivalentes).toBe(false);
    expect(e.motivos).toContain('quantidade');
    // É esta distinção que deixa atribuir euros à quantidade quando tudo o resto é igual.
    expect(e.quantidadeComparavel).toBe(true);
    expect(e.execucaoEquivalente).toBe(true);
  });

  it('unidades diferentes não se comparam, e diz-se que é a unidade e não a quantidade', () => {
    const e = equivalenciaDeTrabalhos(t(), t({ unidade: 'ml', quantidade: 3200 }));
    expect(e.motivos).toContain('unidade');
    expect(e.motivos).not.toContain('quantidade');
    expect(e.quantidadeComparavel).toBe(false);
  });

  it('sem quantidade declarada não há preço unitário por onde multiplicar', () => {
    expect(equivalenciaDeTrabalhos(t(), t({ quantidade: null })).quantidadeComparavel).toBe(false);
    expect(equivalenciaDeTrabalhos(t({ quantidade: 0 }), t()).quantidadeComparavel).toBe(false);
  });

  it('um trabalho que só uma inclui é diferença de âmbito, e nada mais se compara nele', () => {
    const e = equivalenciaDeTrabalhos(t(), t({ estado: 'nao_indicado' }));
    expect(e.motivos).toEqual(['ambito']);
    expect(e.equivalentes).toBe(false);
  });

  it('o que nenhuma das duas inclui não produz diferença nenhuma', () => {
    const e = equivalenciaDeTrabalhos(t({ estado: 'nao_indicado' }), t({ estado: 'excluido' }));
    expect(e.motivos).toEqual([]);
  });
});
