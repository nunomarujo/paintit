import { describe, expect, it } from 'vitest';
import { budgetIssues, describeItem, isComplete, linesFromItems, parseWorkItems, suggestedQuantity, workDef, type WorkItem, type Zone } from './works';

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
});
