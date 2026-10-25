import { describe, expect, it } from 'vitest';
import { LIMIAR_ANUAL, avisoAnual, custoDoDia, suplementaresDe } from './overtime';

// 10 €/hora, para as contas se lerem de cabeça.
const HORA = 1_000;

describe('dia útil sem horas a mais', () => {
  it('oito horas custam oito horas', () => {
    const c = custoDoDia({ horas: 800, tipoDia: 'util' }, HORA, 0);
    expect(c).toEqual({ normais: 800, suplementares: 0, custoNormal: 8_000, custoAcrescimo: 0, custoTotal: 8_000 });
  });

  it('meio dia custa meio dia', () => {
    expect(custoDoDia({ horas: 400, tipoDia: 'util' }, HORA, 0).custoTotal).toBe(4_000);
  });
});

describe('horas a mais em dia útil', () => {
  it('a primeira hora leva 25% e as seguintes 37,5%', () => {
    // 8 normais + 2 suplementares: 1.ª a +25% (2,50 €), 2.ª a +37,5% (3,75 €).
    const c = custoDoDia({ horas: 1_000, tipoDia: 'util' }, HORA, 0);
    expect(c.suplementares).toBe(200);
    expect(c.custoNormal).toBe(8_000);
    expect(c.custoAcrescimo).toBe(250 + 375);
    // As duas horas pagam-se, mais o acréscimo.
    expect(c.custoTotal).toBe(8_000 + 2_000 + 625);
  });

  it('meia hora a mais é só meia hora a 25%', () => {
    const c = custoDoDia({ horas: 850, tipoDia: 'util' }, HORA, 0);
    expect(c.suplementares).toBe(50);
    expect(c.custoAcrescimo).toBe(125);
  });
});

describe('acima das 100 horas anuais os acréscimos duplicam', () => {
  it('quem já passou o limiar paga 50% na primeira e 75% nas seguintes', () => {
    const c = custoDoDia({ horas: 1_000, tipoDia: 'util' }, HORA, LIMIAR_ANUAL);
    expect(c.custoAcrescimo).toBe(500 + 750);
  });

  it('o limiar atravessa-se a meio do dia, hora a hora e não o dia inteiro', () => {
    // Faltava 1 hora para as 100: a 1.ª suplementar ainda vai a 25%, a 2.ª já a 75%.
    const c = custoDoDia({ horas: 1_000, tipoDia: 'util' }, HORA, LIMIAR_ANUAL - 100);
    expect(c.custoAcrescimo).toBe(250 + 750);
  });
});

describe('dia de descanso ou feriado', () => {
  it('não há horas normais: tudo é suplementar, a 50%', () => {
    const c = custoDoDia({ horas: 800, tipoDia: 'descanso' }, HORA, 0);
    expect(c.normais).toBe(0);
    expect(c.suplementares).toBe(800);
    expect(c.custoNormal).toBe(0);
    expect(c.custoAcrescimo).toBe(4_000);
    expect(c.custoTotal).toBe(8_000 + 4_000);
  });

  it('acima do limiar anual, o acréscimo do descanso é de 100%', () => {
    const c = custoDoDia({ horas: 800, tipoDia: 'descanso' }, HORA, LIMIAR_ANUAL);
    expect(c.custoAcrescimo).toBe(8_000);
    expect(c.custoTotal).toBe(16_000);
  });
});

describe('contagem e avisos', () => {
  it('conta as horas a mais de cada dia', () => {
    expect(suplementaresDe({ horas: 950, tipoDia: 'util' })).toBe(150);
    expect(suplementaresDe({ horas: 600, tipoDia: 'util' })).toBe(0);
    expect(suplementaresDe({ horas: 600, tipoDia: 'descanso' })).toBe(600);
  });

  it('avisa antes das 100 horas e depois delas', () => {
    expect(avisoAnual(0)).toBeNull();
    expect(avisoAnual(8_500)).toContain('Faltam 15 horas');
    expect(avisoAnual(LIMIAR_ANUAL)).toContain('o dobro');
  });
});
