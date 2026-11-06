import { describe, expect, it } from 'vitest';
import {
  aceitaMedicaoDaFotografia,
  estadoNaFerramenta,
  fraseDaGravacao,
  margemEmTexto,
  medeSeNaFotografia,
  origemEmTexto,
  origemParaOPintor,
  zonaDaMedicao,
  type MedicaoDaFotografia,
} from './medicaoDaFotografia';

const boa: MedicaoDaFotografia = { temContorno: true, pintavelM2: 133.18, porMedir: [], margemRelativa: 0.017 };

describe('zonaDaMedicao: a medição pela fotografia como zona do pedido (06/11/2026)', () => {
  it('área em centésimos de m² e margem em pontos-base (regra 1)', () => {
    expect(zonaDaMedicao(boa)).toEqual({ ok: true, areaDiretaCm2: 13318, margemBps: 170 });
  });

  it('a margem arredonda para cima, nunca para baixo', () => {
    expect(zonaDaMedicao({ ...boa, margemRelativa: 0.01701 })).toMatchObject({ margemBps: 171 });
    expect(zonaDaMedicao({ ...boa, margemRelativa: 0.0000001 })).toMatchObject({ margemBps: 1 });
    // Uma margem de zero não existe numa fotografia: fica 1 ponto-base.
    expect(zonaDaMedicao({ ...boa, margemRelativa: 0 })).toMatchObject({ margemBps: 1 });
  });

  it('não grava uma área incompleta, sem contorno, nula ou absurda', () => {
    expect(zonaDaMedicao({ ...boa, porMedir: ['saliência das marquises'] })).toEqual({
      ok: false,
      motivo: 'Falta medir: saliência das marquises.',
    });
    expect(zonaDaMedicao({ ...boa, temContorno: false }).ok).toBe(false);
    for (const a of [0, -3, Number.NaN, Number.POSITIVE_INFINITY, 0.004, 2_000_000])
      expect(zonaDaMedicao({ ...boa, pintavelM2: a }).ok).toBe(false);
  });

  it('sem margem conhecida não grava — a medição do cliente vai sempre com a sua margem', () => {
    for (const r of [null, Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1.0001])
      expect(zonaDaMedicao({ ...boa, margemRelativa: r }).ok).toBe(false);
    expect(zonaDaMedicao({ ...boa, margemRelativa: 1 })).toMatchObject({ ok: true, margemBps: 10_000 });
  });
});

describe('as faces de dentro das varandas não impedem gravar (revisão de 06/11/2026)', () => {
  it('uma fachada com varandas grava-se: essas faces esperam pela decisão 8.2, não pelo cliente', () => {
    const r = zonaDaMedicao({ ...boa, porMedir: [], porDecidir: ['faces de dentro das varandas (por decidir — decisão 8.2)'] });
    expect(r.ok).toBe(true);
  });
});

describe('margemEmTexto', () => {
  it('lê-se como na ferramenta: à décima, o mesmo número do passo 4', () => {
    expect(margemEmTexto(170)).toBe('±\u00a01,7\u00a0%');
    expect(margemEmTexto(171)).toBe('±\u00a01,7\u00a0%');
    expect(margemEmTexto(175)).toBe('±\u00a01,8\u00a0%');
    expect(margemEmTexto(600)).toBe('±\u00a06,0\u00a0%');
    expect(margemEmTexto(1250)).toBe('±\u00a012,5\u00a0%');
    expect(margemEmTexto(950)).toBe('±\u00a09,5\u00a0%');
    expect(margemEmTexto(1)).toBe('±\u00a00,1\u00a0%');
  });
});

describe('origemEmTexto', () => {
  it('a medição do cliente leva sempre a margem; as outras origens, só o rótulo', () => {
    expect(origemEmTexto('medida_pelo_cliente', 170)).toBe('Medida pelo cliente ±\u00a01,7\u00a0%');
    expect(origemEmTexto('estimativa', 170)).toBe('Estimativa');
    expect(origemEmTexto('medicao', null)).toBe('Medição');
  });

  it('sem margem (não devia acontecer), diz só a origem — nunca «± 0,0 %»', () => {
    expect(origemEmTexto('medida_pelo_cliente', null)).toBe('Medida pelo cliente');
    expect(origemEmTexto('medida_pelo_cliente', 0)).toBe('Medida pelo cliente');
  });
});

describe('aceitaMedicaoDaFotografia: uma zona confirmada no local não se troca pela fotografia', () => {
  it('por confirmar aceita (e uma zona nova, sem confirmação, também); confirmada não', () => {
    expect(aceitaMedicaoDaFotografia('por_confirmar')).toBe(true);
    expect(aceitaMedicaoDaFotografia(null)).toBe(true);
    expect(aceitaMedicaoDaFotografia('confirmada')).toBe(false);
  });
});

describe('medeSeNaFotografia: a ferramenta mede paredes exteriores planas', () => {
  it('fachada, empena e muro; varandas, tetos e escadas não', () => {
    expect(['fachada', 'empena', 'muro'].every((k) => medeSeNaFotografia(k as never))).toBe(true);
    expect(medeSeNaFotografia('varandas')).toBe(false);
    expect(medeSeNaFotografia('tetos')).toBe(false);
    expect(medeSeNaFotografia('escadas_atrio')).toBe(false);
  });
});

describe('estadoNaFerramenta: o que se diz de cada zona em «Para que zona»', () => {
  it('fora do pedido nunca se chama «por levantar» (revisão de 06/11/2026)', () => {
    expect(
      estadoNaFerramenta({
        confirmacao: 'por_confirmar',
        participacao: 'excluida',
        areaCm2: 0,
      }),
    ).toBe('fora do pedido, sem medidas');
    expect(
      estadoNaFerramenta({
        confirmacao: 'por_confirmar',
        participacao: 'por_decidir',
        areaCm2: 500,
      }),
    ).toBe('por decidir se entra');
    expect(
      estadoNaFerramenta({
        confirmacao: 'por_confirmar',
        participacao: 'incluida',
        areaCm2: 0,
      }),
    ).toBe('sem medidas');
    expect(
      estadoNaFerramenta({
        confirmacao: 'por_confirmar',
        participacao: 'incluida',
        areaCm2: 500,
      }),
    ).toBe('');
    expect(
      estadoNaFerramenta({
        confirmacao: 'confirmada',
        participacao: 'excluida',
        areaCm2: 500,
      }),
    ).toBe('confirmada no local');
  });
});

describe('fraseDaGravacao: o rodapé diz o que «Usar esta medição» faz', () => {
  const medida = { areaDiretaCm2: 22052, margemBps: 510 };
  const m = '220,52 m², medida pelo cliente ±\u00a05,1\u00a0%, por confirmar no local';
  it('numa zona que já tem número, diz que o substitui, e por qual', () => {
    expect(
      fraseDaGravacao(medida, {
        nome: 'Tardoz',
        areaCm2: 13318,
        quantidade: 1,
        origemDaQuantidade: 'medida_pelo_cliente',
        margemBps: 170,
      }),
    ).toBe(`Em Tardoz, substitui 133,18 m² (medida pelo cliente ±\u00a01,7\u00a0%) por ${m}.`);
  });
  it('quando a quantidade passa a 1, di-lo', () => {
    expect(
      fraseDaGravacao(medida, {
        nome: 'Varandas',
        areaCm2: 600,
        quantidade: 6,
        origemDaQuantidade: 'estimativa',
      }),
    ).toBe(`Em Varandas, substitui 6 m² (estimativa) por ${m}. A quantidade passa de 6 para 1: a medição é a desta fachada, uma vez.`);
  });
  it('numa zona sem medidas não há o que substituir', () => {
    expect(
      fraseDaGravacao(medida, {
        nome: 'Empena',
        areaCm2: 0,
        quantidade: 1,
        origemDaQuantidade: null,
      }),
    ).toBe(`Grava ${m}, em Empena.`);
  });
  it('numa zona nova: «numa», em português de Portugal, nunca «em uma»', () => {
    expect(fraseDaGravacao(medida, null)).toBe(`Grava ${m}, numa zona nova.`);
    expect(fraseDaGravacao(medida, null, '  Tardoz ')).toBe(`Grava ${m}, numa zona nova, «Tardoz».`);
    expect(fraseDaGravacao(medida, null)).not.toContain('em uma');
  });
});

describe('origemParaOPintor: todas as zonas levam a origem e o estado no anúncio', () => {
  it('a estimativa diz que é estimativa, e não aparece como número limpo', () => {
    expect(origemParaOPintor('estimativa', null, 'por_confirmar')).toBe('Estimativa · por confirmar');
    expect(origemParaOPintor('medida_pelo_cliente', 170, 'por_confirmar')).toBe('Medida pelo cliente ±\u00a01,7\u00a0% · por confirmar');
    expect(origemParaOPintor('medicao', null, 'confirmada')).toBe('Medição · confirmada');
  });
  it('uma zona antiga sem origem não diz nada', () => {
    expect(origemParaOPintor(null, null, 'por_confirmar')).toBeNull();
  });
});
