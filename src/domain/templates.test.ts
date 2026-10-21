import { describe, expect, it } from 'vitest';
import { buildTemplate, parseTemplate, templateToItems } from './templates';
import type { WorkItem } from './works';

const terms = { ivaBps: 2300, adiantamentoBps: 1000, garantiaAnos: 5, precoAjusteM2: null, exclusoes: 'Licenças', notas: '', fases: [{ nome: 'Ao concluir', bps: 9000 }], seguroRc: 'sim' as const, seguroAt: 'sim' as const, confirmaMaoObra: true };
const item = (key: string, code: string, extra: Partial<WorkItem> = {}): WorkItem => ({ key, code, estado: 'base', zonas: ['z1'], campos: {}, quantidade: '120', notas: '', ...extra });

describe('método de trabalho', () => {
  it('guarda um preço por tipo de trabalho e não leva zonas nem quantidades', () => {
    const t = buildTemplate([item('lavagem', 'lavagem'), item('lavagem#2', 'lavagem')], { lavagem: 150, 'lavagem#2': 300 }, terms);
    expect(t.prices).toEqual({ lavagem: 150 });
    expect(t.items).toHaveLength(1);
    expect(JSON.stringify(t)).not.toContain('z1');
  });

  it('lê o que guardou e ignora trabalhos desconhecidos', () => {
    const t = buildTemplate([item('lavagem', 'lavagem')], { lavagem: 150 }, terms);
    const back = parseTemplate(JSON.parse(JSON.stringify(t)));
    expect(back).toEqual(t);
    const odd = parseTemplate({ items: [{ code: 'inexistente' }, { code: 'lavagem', estado: 'xx' }], prices: { inexistente: 5 } });
    expect(odd.items.map((i) => i.code)).toEqual(['lavagem']);
    expect(odd.items[0]!.estado).toBe('base');
    expect(odd.prices).toEqual({});
    expect(parseTemplate(null).terms.ivaBps).toBe(2300);
  });

  it('aplica a todas as zonas, uma vez por trabalho', () => {
    const t = buildTemplate([item('lavagem', 'lavagem'), item('lavagem#2', 'lavagem')], {}, terms);
    t.items.push({ ...t.items[0]!, estado: 'opcional' });
    const items = templateToItems(t, [{ id: 'z1', label: 'A', area: 10_000 }]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ key: 'lavagem', zonas: 'todas' });
  });
});
