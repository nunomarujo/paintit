import { describe, expect, it } from 'vitest';
import { productSuggestions, type CatalogueProduct, budgetIssues, describeItem, isComplete, linesFromItems, parseWorkItems, requestedCoverage, suggestedQuantity, workDef, type WorkItem, type Zone, budgetPendings } from './works';

const zones: Zone[] = [
  { id: 'a', label: 'Fachada principal (420 m²)', area: 42000 },
  { id: 'b', label: 'Tardoz (580 m²)', area: 58000 },
];
const item = (over: Partial<WorkItem> = {}): WorkItem => ({
  key: 'pintura_final',
  code: 'pintura_final',
  estado: 'base',
  zonas: 'todas',
  campos: { produto: 'Barbot Acryl Plus VG (1279)', demaos: '2', acabamento: 'Mate' },
  quantidade: '1000',
  notas: '',
  ...over,
});

describe('orçamento guiado', () => {
  it('sugere a área das zonas escolhidas e só para trabalhos em m²', () => {
    expect(suggestedQuantity(workDef('pintura_final')!, 'todas', zones)).toBe('1000');
    expect(suggestedQuantity(workDef('pintura_final')!, ['b'], zones)).toBe('580');
    expect(suggestedQuantity(workDef('fissuras')!, 'todas', zones)).toBe('');
    expect(suggestedQuantity(workDef('acessos')!, 'todas', zones)).toBe('');
  });

  it('está completo com os campos obrigatórios, a quantidade e as zonas', () => {
    expect(isComplete(item(), zones)).toBe(true);
    expect(isComplete(item({ campos: { produto: 'X' } }), zones)).toBe(false); // faltam demãos
    expect(isComplete(item({ quantidade: '' }), zones)).toBe(false);
    expect(isComplete(item({ zonas: [] }), zones)).toBe(false);
    expect(isComplete(item({ estado: 'confirmar' }), zones)).toBe(false); // diz o que falta confirmar
    expect(isComplete(item({ estado: 'confirmar', notas: 'Depende de visita' }), zones)).toBe(true);
  });

  it('gera a descrição para o cliente a partir dos campos', () => {
    expect(describeItem(item(), zones)).toBe('Pintura final · Todas as fachadas · 1000 m² · Barbot Acryl Plus VG (1279) · Mate · 2 demãos');
    expect(describeItem(item({ zonas: ['a'] }), zones)).toContain('Fachada principal');
  });

  it('valida os dados que vêm do navegador', () => {
    const ok = parseWorkItems([{ key: 'pintura_final', code: 'pintura_final', estado: 'base', zonas: ['a'], campos: { produto: 'X', demaos: '2' }, quantidade: '420', notas: '' }], zones);
    expect(ok.items).toHaveLength(1);
    expect(parseWorkItems([{ key: 'x', code: 'x' }], zones).errors.length).toBeGreaterThan(0);
    expect(parseWorkItems([{ key: 'primario', code: 'primario', estado: 'base', zonas: ['zzz'], campos: {}, quantidade: '1' }], zones).errors.join()).toMatch(/zona/);
    expect(parseWorkItems([{ key: 'primario', code: 'primario', estado: 'base', zonas: 'todas', campos: { demaos: '9' }, quantidade: '1' }], zones).errors.join()).toMatch(/demãos/);
    expect(parseWorkItems([{ key: 'primario#2', code: 'pintura_final', estado: 'base', zonas: 'todas' }], zones).errors.length).toBeGreaterThan(0);
  });

  it('gera linhas: preços por unidade, global a zero, não incluído sem preço', () => {
    const items = [item(), item({ key: 'pintura_final#2', estado: 'nao_incluido', notas: 'Cliente trata' })];
    const lines = linesFromItems(items, { pintura_final: 850, 'pintura_final#2': 999 }, zones, false);
    expect(lines[0]).toMatchObject({ trabalho: 'pintura_final', categoria: 'pintura', quantidade: 100000, unidade: 'm2', precoUnitario: 850, inclusao: 'incluido', zonas: ['a', 'b'], demaos: 2 });
    expect(lines[1]).toMatchObject({ precoUnitario: 0, inclusao: 'nao_incluido' });
    expect(linesFromItems(items, { pintura_final: 850 }, zones, true)[0]!.precoUnitario).toBe(0);
    const vg = linesFromItems([{ key: 'acessos', code: 'acessos', estado: 'base', zonas: 'todas', campos: { meio: 'Andaimes' }, quantidade: '', notas: '' }], { acessos: 250000 }, zones, false)[0]!;
    expect(vg).toMatchObject({ quantidade: 100, unidade: 'vg', precoUnitario: 250000, zonas: [] });
  });

  it('assinala pendências: dados, preços e trabalhos pedidos sem estado ou sem justificação', () => {
    const pend = budgetIssues({ items: [item()], prices: {}, globalMode: false, zones, requested: ['pintura', 'lavagem', 'impermeabilizacao'] });
    expect(pend.join(' ')).toMatch(/falta o preço/);
    expect(pend.join(' ')).toMatch(/Lavagem e limpeza: o cliente pediu/);
    expect(pend.join(' ')).toMatch(/Impermeabilização: o cliente pediu/);
    const ok = budgetIssues({ items: [item()], prices: { pintura_final: 850 }, globalMode: false, zones, requested: ['pintura'] });
    expect(ok).toEqual([]);
    const unjustified = budgetIssues({ items: [item({ code: 'lavagem', key: 'lavagem', estado: 'nao_incluido' })], prices: {}, globalMode: true, zones, requested: ['lavagem'] });
    expect(unjustified.join(' ')).toMatch(/justificar/);
    expect(budgetIssues({ items: [item()], prices: {}, globalMode: true, zones, requested: [] })).toEqual([]);
  });

  it('comparador: cobertura dos trabalhos pedidos, um por um, na mesma ordem e tamanho do pedido', () => {
    const lines = [
      { trabalho: 'pintura_final', inclusao: 'incluido' as const },
      { trabalho: 'acessos', inclusao: 'opcional' as const },
    ];
    expect(requestedCoverage(['pintura', 'lavagem'], lines)).toEqual([
      { work: 'pintura', label: 'Pintura final', state: 'base' },
      { work: 'lavagem', label: 'Lavagem e limpeza', state: null }, // pedido, mas a proposta não tem essa linha
    ]);
    expect(requestedCoverage([], lines)).toEqual([]);
  });

  it('com várias zonas para o mesmo trabalho, conta o melhor estado, não a primeira linha', () => {
    const lines = [
      { trabalho: 'pintura_final', inclusao: 'nao_incluido' as const }, // zona A: cliente trata
      { trabalho: 'pintura_final', inclusao: 'incluido' as const }, // zona B: incluída
    ];
    expect(requestedCoverage(['pintura'], lines)).toEqual([{ work: 'pintura', label: 'Pintura final', state: 'base' }]);
    expect(requestedCoverage(['pintura'], [lines[0]!])).toEqual([{ work: 'pintura', label: 'Pintura final', state: 'nao_incluido' }]);
  });
});

describe('sugestões do catálogo por trabalho', () => {
  const p = (nome: string, tipo: string, uso: string | null, descricao = ''): CatalogueProduct => ({
    id: nome, marca: 'M', nome, tipo, uso, descricao, acabamento: null, rendimento_m2_l: null, preco_referencia_cents: null, preco_embalagem_l: null,
  });
  const cat = [
    p('Novaqua', 'tinta_exterior', 'exterior'),
    p('Vinylmatt', 'tinta_interior', 'ambos'),
    p('Viplad', 'tinta_interior', 'interior'),
    p('Primário X', 'primario', 'ambos'),
    p('Primário Metal', 'primario', 'ambos', 'para metais ferrosos'),
    p('Imperflex', 'impermeabilizante', 'exterior'),
    p('Sintecin', 'esmalte', 'ambos'),
    p('Argamassa Tapa Fissuras', 'outro', 'exterior', 'argamassa para reparação de fissuras'),
    p('Artibiose', 'outro', 'ambos', 'inibe fungos e algas'),
  ];
  const names = (code: string, field: string, obra: string | null) => productSuggestions(code, field, obra, cat).map((x) => x.nome);
  it('impermeabilização só sugere impermeabilizantes', () => {
    expect(names('impermeabilizacao', 'produto', 'fachadas')).toEqual(['Imperflex']);
  });
  it('pintura final respeita interior e exterior do pedido', () => {
    expect(names('pintura_final', 'produto', 'fachadas')).toEqual(['Novaqua', 'Vinylmatt']);
    expect(names('pintura_final', 'produto', 'interior')).toEqual(['Vinylmatt', 'Viplad']);
  });
  it('primário, metais, fissuras e lavagem', () => {
    expect(names('primario', 'produto', 'fachadas')).toEqual(['Primário X', 'Primário Metal']);
    expect(names('metais_madeiras', 'produto', 'fachadas')).toEqual(['Primário Metal', 'Sintecin']);
    expect(names('fissuras', 'produto', 'fachadas')).toEqual(['Argamassa Tapa Fissuras']);
    expect(names('lavagem', 'produto', 'fachadas')).toEqual(['Artibiose']);
  });
  it('campos sem catálogo não têm sugestões', () => {
    expect(names('selagem_remates', 'material', 'fachadas')).toEqual([]);
    expect(names('rede_barramento', 'rede', 'fachadas')).toEqual([]);
    expect(names('acessos', 'meio', 'fachadas')).toEqual([]);
  });
});

// Barra de pendências que leva ao campo (24/10/2026).
describe('pendências com destino', () => {
  const zonas = [{ id: 'z1', label: 'Fachada', area: 100_00 }];
  const base = { prices: {}, globalMode: false, zones: zonas, requested: [] as never[] };

  it('o mesmo texto de sempre, agora com o passo e o trabalho', () => {
    const items = parseWorkItems([{ key: 'lavagem', code: 'lavagem', estado: 'base', zonas: [], campos: {}, notas: '' }], zonas).items ?? [];
    const pend = budgetPendings({ ...base, items });
    const texto = budgetIssues({ ...base, items });
    expect(pend.map((x) => x.texto)).toEqual(texto);
    expect(pend[0]?.passo).toBe('trabalhos');
    expect(pend[0]?.key).toBe('lavagem');
  });

  it('cada pendência tem identificador próprio, para se poder andar entre elas', () => {
    const items =
      parseWorkItems(
        [
          { key: 'lavagem', code: 'lavagem', estado: 'base', zonas: [], campos: {}, notas: '' },
          { key: 'primario', code: 'primario', estado: 'base', zonas: [], campos: {}, notas: '' },
        ],
        zonas,
      ).items ?? [];
    const ids = budgetPendings({ ...base, items }).map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sem pendências, a lista é vazia', () => {
    expect(budgetPendings({ ...base, items: [] })).toEqual([]);
  });
});
