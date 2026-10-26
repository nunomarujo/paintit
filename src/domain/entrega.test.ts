import { describe, expect, it } from 'vitest';
import { DIAS_DE_ESCLARECIMENTO, estadoDaEntrega } from './entrega';

describe('estadoDaEntrega', () => {
  it('no último dia do prazo ainda não abriram: o pintor tem o dia todo para entregar', () => {
    const e = estadoDaEntrega('2026-11-10', '2026-11-10');
    expect(e.entregues).toBe(false);
    expect(e.abremEm).toBe('2026-11-11');
    expect(e.faltamDias).toBe(1);
  });

  it('no dia seguinte abrem todas, e começa a janela de perguntas', () => {
    const e = estadoDaEntrega('2026-11-10', '2026-11-11');
    expect(e.entregues).toBe(true);
    expect(e.emEsclarecimentos).toBe(true);
    expect(e.esclarecimentosAte).toBe('2026-11-13');
  });

  it('a janela dura três dias e fecha no fim do terceiro', () => {
    expect(DIAS_DE_ESCLARECIMENTO).toBe(3);
    expect(estadoDaEntrega('2026-11-10', '2026-11-13').emEsclarecimentos).toBe(true);
    expect(estadoDaEntrega('2026-11-10', '2026-11-14').emEsclarecimentos).toBe(false);
    // Fechada a janela, as propostas continuam entregues: o cliente escolhe quando quiser.
    expect(estadoDaEntrega('2026-11-10', '2026-12-01').entregues).toBe(true);
  });

  it('o anúncio encerrado entrega o que houver, mesmo antes do prazo', () => {
    const e = estadoDaEntrega('2026-11-10', '2026-11-01', false);
    expect(e.entregues).toBe(true);
    expect(e.abremEm).toBeNull();
  });

  it('sem prazo não há nada para entregar', () => {
    expect(estadoDaEntrega(null, '2026-11-01')).toMatchObject({ entregues: false, abremEm: null, faltamDias: null });
  });

  it('faltam os dias certos, vários dias antes', () => {
    expect(estadoDaEntrega('2026-11-10', '2026-11-04').faltamDias).toBe(7);
  });
});
