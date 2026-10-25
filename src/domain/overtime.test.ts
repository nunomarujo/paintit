import { describe, expect, it } from 'vitest';
import { LIMIAR_ANUAL, avisoAnual, custoDasHoras, custoDoDia, custoHoraEm, suplementaresDe } from './overtime';

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

describe('o limiar anual atravessa obras', () => {
  const linha = (id: string, pessoaId: string, data: string, horas: number) => ({
    id,
    pessoaId,
    data,
    horas,
    custoHora: 1_200,
    tipoDia: 'util' as const,
  });

  it('as horas de outra obra contam para o limiar desta', () => {
    // 100 horas suplementares já feitas na obra A; o dia seguinte na obra B paga em dobro.
    const naObraA = Array.from({ length: 50 }, (_, i) => linha(`a${i}`, 'rui', `2026-03-${String(i + 1).padStart(2, '0')}`, 1_000));
    const naObraB = linha('b1', 'rui', '2026-06-01', 1_000);
    const custos = custoDasHoras([...naObraA, naObraB]);

    const sozinha = custoDasHoras([naObraB]).get('b1')!;
    const comHistorico = custos.get('b1')!;
    expect(comHistorico.custoAcrescimo).toBeGreaterThan(sozinha.custoAcrescimo);
  });

  it('conta pela ordem das datas, não pela ordem em que vêm', () => {
    const tarde = linha('tarde', 'rui', '2026-06-01', 1_000);
    const cedo = linha('cedo', 'rui', '2026-01-02', 1_000);
    const a = custoDasHoras([tarde, cedo]);
    const b = custoDasHoras([cedo, tarde]);
    expect(a.get('cedo')!.custoTotal).toBe(b.get('cedo')!.custoTotal);
    expect(a.get('tarde')!.custoTotal).toBe(b.get('tarde')!.custoTotal);
  });

  it('cada pessoa tem a sua contagem', () => {
    const muitas = Array.from({ length: 50 }, (_, i) => linha(`r${i}`, 'rui', `2026-03-${String(i + 1).padStart(2, '0')}`, 1_000));
    const doJoao = linha('j1', 'joao', '2026-06-01', 1_000);
    const custos = custoDasHoras([...muitas, doJoao]);
    expect(custos.get('j1')!.custoTotal).toBe(custoDasHoras([doJoao]).get('j1')!.custoTotal);
  });

  it('cada ano recomeça do zero', () => {
    const em2025 = Array.from({ length: 50 }, (_, i) => linha(`v${i}`, 'rui', `2025-03-${String(i + 1).padStart(2, '0')}`, 1_000));
    const em2026 = linha('n1', 'rui', '2026-01-05', 1_000);
    const custos = custoDasHoras([...em2025, em2026]);
    expect(custos.get('n1')!.custoTotal).toBe(custoDasHoras([em2026]).get('n1')!.custoTotal);
  });

  it('devolve um custo por cada linha que recebeu', () => {
    const custos = custoDasHoras([linha('x', 'rui', '2026-01-01', 800), linha('y', 'joao', '2026-01-01', 800)]);
    expect([...custos.keys()].sort()).toEqual(['x', 'y']);
  });
});

describe('custo por hora à data do trabalho', () => {
  const tabela = [
    { desde: '2025-01-01', custoHoraCents: 1_000 },
    { desde: '2026-04-01', custoHoraCents: 1_200 },
  ];

  it('um dia de 2025 paga-se ao preço de 2025, mesmo depois do aumento', () => {
    expect(custoHoraEm(tabela, '2025-06-10')).toBe(1_000);
  });

  it('um dia depois do aumento paga-se ao novo', () => {
    expect(custoHoraEm(tabela, '2026-05-02')).toBe(1_200);
  });

  it('no próprio dia do aumento já vale o novo', () => {
    expect(custoHoraEm(tabela, '2026-04-01')).toBe(1_200);
  });

  it('antes de haver qualquer custo devolve null, que não é zero', () => {
    expect(custoHoraEm(tabela, '2024-12-31')).toBeNull();
    expect(custoHoraEm([], '2026-01-01')).toBeNull();
    expect(custoHoraEm(tabela, null)).toBeNull();
  });

  it('não depende da ordem em que as datas vêm', () => {
    expect(custoHoraEm([...tabela].reverse(), '2026-05-02')).toBe(1_200);
  });
});
