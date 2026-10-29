import { describe, expect, it } from 'vitest';
import { trabalhosDaProposta } from './comparador';
import { emPalavras, perguntas, quadroEconomico, reconciliar, type LadoDaReconciliacao, diferencaEmPalavras } from './reconciliacao';
import { formatEuros } from './money';
import type { LineCategory, ProposalLine } from './proposal';

const linha = (p: Partial<ProposalLine>): ProposalLine => ({
  categoria: 'pintura', descricao: '', superficie: null, quantidade: 24000, unidade: 'm2',
  precoUnitario: 200, demaos: null, produto: null, inclusao: 'incluido', ...p,
});

const PEDIDOS = ['lavagem', 'pintura', 'impermeabilizacao'] as const;
const SEM_CATEGORIAS = Object.fromEntries(
  (['preparacao', 'reparacao', 'pintura', 'acessos', 'licencas', 'outro'] as LineCategory[]).map((c) => [c, null]),
) as Record<LineCategory, number | null>;

const lado = (alias: string, linhas: ProposalLine[], extra: Partial<LadoDaReconciliacao> = {}): LadoDaReconciliacao => {
  const trabalhos = trabalhosDaProposta(PEDIDOS, linhas);
  const base = linhas.filter((l) => l.inclusao === 'incluido').reduce((n, l) => n + Math.round((l.quantidade * l.precoUnitario) / 100), 0);
  return { id: alias.toLowerCase(), alias, base, trabalhos, categorias: SEM_CATEGORIAS, precoGlobal: false, ...extra };
};

/** A invariante: as parcelas com euros, mais a não decomposta, dão exactamente a diferença. */
const fecha = (a: LadoDaReconciliacao, b: LadoDaReconciliacao) => {
  const r = reconciliar(a, b);
  const soma = r.parcelas.reduce((n, p) => n + (p.valorCents ?? 0), 0) + r.naoDecompostaCents;
  expect(soma).toBe(r.diferencaCents);
  return r;
};

describe('a conta fecha sempre', () => {
  it('propostas iguais não produzem parcela nenhuma', () => {
    const l = [linha({ trabalho: 'pintura_final', demaos: 2, produto: 'CIN' })];
    const r = fecha(lado('A', l), lado('B', l));
    expect(r.diferencaCents).toBe(0);
    expect(r.parcelas).toEqual([]);
    expect(r.naoDecompostaCents).toBe(0);
  });

  it('só o preço unitário difere, com tudo o resto igual: é preço, e é o desconto verdadeiro', () => {
    const a = lado('A', [linha({ trabalho: 'pintura_final', precoUnitario: 200, demaos: 2, produto: 'CIN' })]);
    const b = lado('B', [linha({ trabalho: 'pintura_final', precoUnitario: 220, demaos: 2, produto: 'CIN' })]);
    const r = fecha(a, b);
    expect(r.parcelas).toHaveLength(1);
    expect(r.parcelas[0]!.causa).toBe('preco');
    expect(r.parcelas[0]!.valorCents).toBe(4800);
    expect(r.naoDecompostaCents).toBe(0);
  });

  it('um trabalho que só uma inclui é âmbito, ao preço de quem o inclui', () => {
    const a = lado('A', [linha({ trabalho: 'pintura_final' })]);
    const b = lado('B', [linha({ trabalho: 'pintura_final' }), linha({ trabalho: 'impermeabilizacao', unidade: 'ml', quantidade: 3200, precoUnitario: 3400 })]);
    const r = fecha(a, b);
    expect(r.parcelas).toHaveLength(1);
    expect(r.parcelas[0]).toMatchObject({ causa: 'ambito', valorCents: 108800 });
    expect(r.parcelas[0]!.descricao).toBe('B inclui impermeabilização, A não');
  });

  it('mais área declarada é quantidade, medida ao preço de quem está à esquerda', () => {
    // (310 − 240) m² × 2,00 €/m² = 140 €. A convenção está escrita no ficheiro, e é por isso auditável.
    const a = lado('A', [linha({ trabalho: 'pintura_final', quantidade: 24000, precoUnitario: 200, demaos: 2, produto: 'CIN' })]);
    const b = lado('B', [linha({ trabalho: 'pintura_final', quantidade: 31000, precoUnitario: 200, demaos: 2, produto: 'CIN' })]);
    const r = fecha(a, b);
    expect(r.parcelas[0]).toMatchObject({ causa: 'quantidade', valorCents: 14000 });
    expect(r.parcelas[0]!.descricao).toBe('Pintura final: B declara 310 m² onde A declara 240 m²');
    expect(r.naoDecompostaCents).toBe(0);
  });

  it('demãos diferentes descrevem-se sem euros, e o resto vai para a não decomposta', () => {
    // É a correcção do promotor: atribuir 600 € "às demãos" seria inventar uma precisão que não temos.
    const a = lado('A', [linha({ trabalho: 'pintura_final', precoUnitario: 200, demaos: 2, produto: 'CIN' })]);
    const b = lado('B', [linha({ trabalho: 'pintura_final', precoUnitario: 240, demaos: 1, produto: 'Barbot' })]);
    const r = fecha(a, b);
    expect(r.parcelas.filter((p) => p.causa === 'preco')).toEqual([]);
    expect(r.naoDecompostaCents).toBe(9600);
    expect(r.notasTecnicas[0]).toBe('pintura final: A 2 demãos com CIN; B 1 demão com Barbot');
  });

  it('a frase só nomeia o que difere: demãos iguais não se repetem', () => {
    // Visto no relatório impresso: "A 2 demãos com CIN; B 2 demãos com Robbialac" obriga o leitor a
    // procurar a diferença dentro da frase que devia apontá-la.
    const a = lado('A', [linha({ trabalho: 'pintura_final', demaos: 2, produto: 'CIN' })]);
    const b = lado('B', [linha({ trabalho: 'pintura_final', demaos: 2, produto: 'Robbialac' })]);
    expect(reconciliar(a, b).notasTecnicas[0]).toBe('pintura final: A CIN; B Robbialac');
  });

  it('produto igual e demãos diferentes nomeia só as demãos', () => {
    const a = lado('A', [linha({ trabalho: 'pintura_final', demaos: 2, produto: 'CIN' })]);
    const b = lado('B', [linha({ trabalho: 'pintura_final', demaos: 1, produto: 'CIN' })]);
    expect(reconciliar(a, b).notasTecnicas[0]).toBe('pintura final: A 2 demãos; B 1 demão');
  });

  it('execução diferente trava também a parcela de quantidade: não se valorizam metros que não são iguais', () => {
    // Decisão do promotor, 29/10/2026. Antes saía uma parcela de 140,00 € de «quantidade»,
    // valorizando os 70 m² a mais ao preço unitário de A — que é o preço de A com **duas** demãos.
    // B dá uma. Multiplicar um pelo outro é comparar preços de coisas diferentes.
    const a = lado('A', [linha({ trabalho: 'pintura_final', quantidade: 24000, precoUnitario: 200, demaos: 2 })]);
    const b = lado('B', [linha({ trabalho: 'pintura_final', quantidade: 31000, precoUnitario: 240, demaos: 1 })]);
    const r = fecha(a, b);
    expect(r.parcelas).toEqual([]);
    expect(r.naoDecompostaCents).toBe(r.diferencaCents);
    // E a diferença não desaparece: diz-se, com as quantidades e as demãos das duas.
    expect(r.notasTecnicas).toHaveLength(1);
    expect(r.notasTecnicas[0]).toContain('240 m²');
    expect(r.notasTecnicas[0]).toContain('310 m²');
    expect(r.notasTecnicas[0]).toContain('2 demãos');
    expect(r.notasTecnicas[0]).toContain('1 demão');
  });

  it('acessos só numa é âmbito; nas duas com valores diferentes é condição de obra', () => {
    const base = [linha({ trabalho: 'pintura_final' })];
    const so = fecha(lado('A', base), lado('B', base, { categorias: { ...SEM_CATEGORIAS, acessos: 90000 }, base: 48000 + 90000 }));
    expect(so.parcelas[0]).toMatchObject({ causa: 'ambito', valorCents: 90000 });

    const ambas = fecha(
      lado('A', base, { categorias: { ...SEM_CATEGORIAS, acessos: 60000 }, base: 48000 + 60000 }),
      lado('B', base, { categorias: { ...SEM_CATEGORIAS, acessos: 90000 }, base: 48000 + 90000 }),
    );
    expect(ambas.parcelas[0]).toMatchObject({ causa: 'condicoes', valorCents: 30000 });
  });

  it('preço global numa das duas: só se compara o total, e diz-se', () => {
    const a = lado('A', [linha({ trabalho: 'pintura_final' })], { precoGlobal: true });
    const b = lado('B', [linha({ trabalho: 'pintura_final', precoUnitario: 300 })]);
    const r = fecha(a, b);
    expect(r.indecomponivel).toBe(true);
    expect(r.parcelas).toEqual([]);
    expect(r.naoDecompostaCents).toBe(r.diferencaCents);
  });

  it('unidades que não se comparam não produzem parcela inventada', () => {
    const a = lado('A', [linha({ trabalho: 'pintura_final', unidade: 'm2', quantidade: 24000, precoUnitario: 200 })]);
    const b = lado('B', [linha({ trabalho: 'pintura_final', unidade: 'vg', quantidade: 100, precoUnitario: 60000 })]);
    const r = fecha(a, b);
    expect(r.parcelas).toEqual([]);
    expect(r.naoDecompostaCents).toBe(r.diferencaCents);
  });

  it('a invariante aguenta um caso com tudo ao mesmo tempo', () => {
    const a = lado('A', [
      linha({ trabalho: 'lavagem', precoUnitario: 120, produto: 'Alta pressão' }),
      linha({ trabalho: 'pintura_final', quantidade: 24000, precoUnitario: 200, demaos: 2, produto: 'CIN' }),
      linha({ trabalho: 'impermeabilizacao', unidade: 'ml', quantidade: 3200, precoUnitario: 3400 }),
    ], { categorias: { ...SEM_CATEGORIAS, acessos: 60000 } });
    const b = lado('B', [
      linha({ trabalho: 'lavagem', precoUnitario: 95, produto: 'Alta pressão' }),
      linha({ trabalho: 'pintura_final', quantidade: 31000, precoUnitario: 240, demaos: 1, produto: 'Barbot' }),
    ], { categorias: { ...SEM_CATEGORIAS, acessos: 90000 } });
    const r = fecha(a, b);
    // Pela ordem da cascata, não pela ordem do cálculo nem por ordem alfabética.
    // A pintura final tem demãos e produtos diferentes: fica inteira por decompor, sem parcela de
    // quantidade nem de preço. Sobra o âmbito (a impermeabilização que só A inclui), a condição de
    // obra (os acessos) e o preço da lavagem, que essa é mesmo comparável — mesmo produto, mesma
    // quantidade, preço diferente.
    expect(r.parcelas.map((p) => p.causa)).toEqual(['ambito', 'condicoes', 'preco']);
    expect(r.notasTecnicas).toHaveLength(1);
  });
});

describe('a frase que o cliente lê', () => {
  it('diz quem é mais cara, por quanto, e onde está cada parcela', () => {
    const a = lado('A', [linha({ trabalho: 'pintura_final', precoUnitario: 200, demaos: 2, produto: 'CIN' })]);
    const b = lado('B', [
      linha({ trabalho: 'pintura_final', precoUnitario: 200, demaos: 2, produto: 'CIN' }),
      linha({ trabalho: 'impermeabilizacao', unidade: 'ml', quantidade: 3200, precoUnitario: 3400 }),
    ]);
    const d = diferencaEmPalavras('A', 'B', reconciliar(a, b), formatEuros);
    // O valor escreve-se com a própria função: o euro leva espaço não-quebrável, que não se
    // distingue a olho de um espaço normal num literal de teste.
    expect(d.abertura).toBe(`B custa mais ${formatEuros(108800)}, sem IVA.`);
    // O preço da impermeabilização está escrito na proposta de B: é prova, não simulação, e sai no
    // bloco que o diz. Sem convenção pelo meio, portanto sem nota.
    expect(d.blocos.map((b) => b.id)).toEqual(['declarado']);
    expect(d.blocos[0]!.linhas).toEqual([`${formatEuros(108800)}: B inclui impermeabilização, A não.`]);
    expect(d.blocos[0]!.nota).toBeNull();
  });

  it('separa o que está escrito na proposta do que é conta nossa, e diz a convenção ao lado', () => {
    const a = lado('A', [linha({ trabalho: 'pintura_final', quantidade: 24000, precoUnitario: 200, demaos: 2, produto: 'CIN' })]);
    const b = lado('B', [linha({ trabalho: 'pintura_final', quantidade: 31000, precoUnitario: 200, demaos: 2, produto: 'CIN' })]);
    const d = diferencaEmPalavras('A', 'B', reconciliar(a, b), formatEuros);
    // Os 70 m² a mais valorizados ao preço unitário de A não estão escritos em lado nenhum: é uma
    // repartição nossa, e tem de o dizer antes dos números.
    expect(d.blocos.map((b) => b.id)).toEqual(['calculado']);
    expect(d.blocos[0]!.titulo).toBe('Efeito calculado a partir das quantidades declaradas');
    expect(d.blocos[0]!.nota).toContain('preço unitário de A');
    expect(d.blocos[0]!.nota).toContain('não estão escritos nas propostas');
  });

  it('com as quantidades iguais, a diferença de preço é declarada: não há repartição pelo meio', () => {
    const a = lado('A', [linha({ trabalho: 'pintura_final', quantidade: 24000, precoUnitario: 200, demaos: 2, produto: 'CIN' })]);
    const b = lado('B', [linha({ trabalho: 'pintura_final', quantidade: 24000, precoUnitario: 260, demaos: 2, produto: 'CIN' })]);
    const r = reconciliar(a, b);
    expect(r.parcelas.map((p) => [p.causa, p.proveniencia])).toEqual([['preco', 'declarado']]);
  });

  it('o mesmo preço diz-se, em vez de se calar', () => {
    const l = [linha({ trabalho: 'pintura_final' })];
    expect(emPalavras('A', 'B', reconciliar(lado('A', l), lado('B', l)), formatEuros)).toEqual(['A e B apresentam o mesmo preço sem IVA.']);
  });

  it('nunca escreve a palavra margem', () => {
    const a = lado('A', [linha({ trabalho: 'pintura_final', precoUnitario: 200, demaos: 2 })]);
    const b = lado('B', [linha({ trabalho: 'pintura_final', precoUnitario: 260, demaos: 1 })]);
    const texto = emPalavras('A', 'B', reconciliar(a, b), formatEuros).join(' ');
    expect(texto.toLowerCase()).not.toContain('margem');
    expect(texto).toContain('não podem ser decompostos');
  });
});

describe('as perguntas que ficam por fazer', () => {
  it('uma divergência de medição gera a pergunta sobre o critério, não uma acusação', () => {
    const a = lado('A', [linha({ trabalho: 'pintura_final', quantidade: 24000, demaos: 2 })]);
    const b = lado('B', [linha({ trabalho: 'pintura_final', quantidade: 31000, demaos: 2 })]);
    const qs = perguntas(a, b, reconciliar(a, b));
    // Pergunta-se aos dois: com duas propostas não há forma de saber qual mediu outra coisa, e
    // perguntar só a um é tratá-lo como suspeito. (As outras perguntas da lista são dos trabalhos
    // que nenhuma das duas indicou.)
    const medicao = qs.filter((q) => q.texto.includes('qual foi o critério'));
    expect(medicao.map((q) => q.alias)).toEqual(['A', 'B']);
    expect(medicao[0]!.texto).toContain('indica 240 m²');
    expect(medicao[1]!.texto).toContain('indica 310 m²');
    expect(qs.map((q) => q.texto).join(' ').toLowerCase()).not.toContain('erro');
    expect(qs.map((q) => q.texto).join(' ').toLowerCase()).not.toContain('mediu mal');
  });

  it('o que está por esclarecer em qualquer das duas vira pergunta', () => {
    const a = lado('A', [linha({ trabalho: 'pintura_final' })]);
    const b = lado('B', [linha({ trabalho: 'pintura_final' }), linha({ trabalho: 'lavagem', inclusao: 'condicionado' })]);
    const qs = perguntas(a, b, reconciliar(a, b));
    // O texto vai na primeira pessoa, como o cliente o enviaria, e cada um sabe a quem se dirige.
    const paraA = qs.find((q) => q.alias === 'A' && q.texto.includes('lavagem'));
    const paraB = qs.find((q) => q.alias === 'B' && q.texto.includes('lavagem'));
    expect(paraA!.texto).toContain('A proposta não refere lavagem e limpeza');
    expect(paraB!.texto).toContain('fica sujeito a observação');
    expect(paraA!.propostaId).toBe('a');
  });
});

describe('o quadro económico: uma linha por proposta, em vez de um bloco por par', () => {
  const ref = lado('Pintor A', [linha({ trabalho: 'pintura_final', demaos: 2, produto: 'CIN' })]);

  it('a conta de cada linha fecha: identificada mais por decompor dá a diferença', () => {
    const b = lado('Pintor B', [linha({ trabalho: 'pintura_final', demaos: 2, produto: 'CIN', precoUnitario: 260 })]);
    const c = lado('Pintor C', [linha({ trabalho: 'pintura_final', demaos: 3, produto: 'Outra', precoUnitario: 240 })]);
    for (const l of quadroEconomico(ref, [b, c], formatEuros)) {
      expect((l.identificadaCents ?? 0) + l.porDecomporCents).toBe(l.diferencaCents);
    }
  });

  it('uma linha por proposta comparada, pela ordem recebida, e a referência não se compara consigo', () => {
    const b = lado('Pintor B', [linha({ trabalho: 'pintura_final', precoUnitario: 260 })]);
    const c = lado('Pintor C', [linha({ trabalho: 'pintura_final', precoUnitario: 240 })]);
    expect(quadroEconomico(ref, [b, c], formatEuros).map((l) => l.alias)).toEqual(['Pintor B', 'Pintor C']);
  });

  it('preço global: nada se decompõe, e diz-se — a identificada fica nula, não a zero', () => {
    const g = lado('Pintor G', [linha({ trabalho: 'pintura_final', precoUnitario: 260 })], { precoGlobal: true });
    const [l] = quadroEconomico(ref, [g], formatEuros);
    expect(l!.indecomponivel).toBe(true);
    expect(l!.identificadaCents).toBeNull();
    expect(l!.porDecomporCents).toBe(l!.diferencaCents);
    expect(l!.detalhe).toEqual([]);
  });

  it('o detalhe traz o sinal e a causa, e só as parcelas que têm euros', () => {
    const b = lado('Pintor B', [linha({ trabalho: 'pintura_final', precoUnitario: 260 })]);
    const [l] = quadroEconomico(ref, [b], formatEuros);
    for (const d of l!.detalhe) expect(d).toMatch(/[+\u2212]\d/);
  });
});
