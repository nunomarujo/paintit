import { describe, expect, it } from 'vitest';
import { trabalhosDaProposta } from './comparador';
import { emPalavras, perguntas, reconciliar, type LadoDaReconciliacao } from './reconciliacao';
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
  return { alias, base, trabalhos, categorias: SEM_CATEGORIAS, precoGlobal: false, ...extra };
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

  it('quantidade e execução ao mesmo tempo: a quantidade sai com euros, o resto não', () => {
    const a = lado('A', [linha({ trabalho: 'pintura_final', quantidade: 24000, precoUnitario: 200, demaos: 2 })]);
    const b = lado('B', [linha({ trabalho: 'pintura_final', quantidade: 31000, precoUnitario: 240, demaos: 1 })]);
    const r = fecha(a, b);
    expect(r.parcelas.map((p) => p.causa)).toEqual(['quantidade']);
    expect(r.parcelas[0]!.valorCents).toBe(14000);
    expect(r.notasTecnicas).toHaveLength(1);
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
    expect(r.parcelas.map((p) => p.causa)).toEqual(['ambito', 'quantidade', 'condicoes', 'preco']);
  });
});

describe('a frase que o cliente lê', () => {
  it('diz quem é mais cara, por quanto, e onde está cada parcela', () => {
    const a = lado('A', [linha({ trabalho: 'pintura_final', precoUnitario: 200, demaos: 2, produto: 'CIN' })]);
    const b = lado('B', [
      linha({ trabalho: 'pintura_final', precoUnitario: 200, demaos: 2, produto: 'CIN' }),
      linha({ trabalho: 'impermeabilizacao', unidade: 'ml', quantidade: 3200, precoUnitario: 3400 }),
    ]);
    const f = emPalavras('A', 'B', reconciliar(a, b), formatEuros);
    // O valor escreve-se com a própria função: o euro leva espaço não-quebrável, que não se
    // distingue a olho de um espaço normal num literal de teste.
    expect(f[0]).toBe(`B custa mais ${formatEuros(108800)}, sem IVA.`);
    expect(f[1]).toBe(`${formatEuros(108800)}: B inclui impermeabilização, A não.`);
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
    expect(qs[0]).toContain('critério de desconto dos vãos');
    expect(qs.join(' ').toLowerCase()).not.toContain('erro');
  });

  it('o que está por esclarecer em qualquer das duas vira pergunta', () => {
    const a = lado('A', [linha({ trabalho: 'pintura_final' })]);
    const b = lado('B', [linha({ trabalho: 'pintura_final' }), linha({ trabalho: 'lavagem', inclusao: 'condicionado' })]);
    const qs = perguntas(a, b, reconciliar(a, b));
    expect(qs.some((q) => q.startsWith('A: lavagem e limpeza está "não indicado"'))).toBe(true);
    expect(qs.some((q) => q.startsWith('B: lavagem e limpeza está "só depois de observar"'))).toBe(true);
  });
});
