import { describe, expect, it } from 'vitest';
import type { IsoDate } from './deadline';
import type { EngagementStatus } from './engagement';
import { ordenarPorUrgencia, proximoPasso, type ProximoPasso } from './proximoPasso';

const TODOS: EngagementStatus[] = [
  'aguarda_deposito',
  'aguarda_adiantamento',
  'aguarda_assinatura_cliente',
  'aguarda_fee',
  'aguarda_assinatura_pintor',
  'assinado',
  'pintor_nao_pagou',
  'pintor_nao_assinou',
  'cliente_desistiu',
  'em_litigio',
  'litigio_culpa_cliente',
  'litigio_culpa_pintor',
  'litigio_repartido',
  'transitado',
  'encerrado_sem_contrato',
  'cancelado',
];

const de = (
  status: EngagementStatus,
  lado: 'cliente' | 'pintor',
  datas: { clientDue?: IsoDate; feeDue?: IsoDate; signDue?: IsoDate } = {},
) => proximoPasso({ status, ...datas }, lado)?.passo ?? null;

describe('proximoPasso: de quem é o passo, e qual', () => {
  it('o cliente: caução, adiantamento, assinatura, e decidir quando o pintor falha', () => {
    expect(de('aguarda_deposito', 'cliente')).toBe('pagar_caucao');
    expect(de('aguarda_adiantamento', 'cliente')).toBe('depositar_adiantamento');
    expect(de('aguarda_assinatura_cliente', 'cliente')).toBe('assinar');
    expect(de('pintor_nao_pagou', 'cliente')).toBe('decidir');
    expect(de('pintor_nao_assinou', 'cliente')).toBe('decidir');
  });

  it('o pintor: confirmar a obra e assinar', () => {
    expect(de('aguarda_fee', 'pintor')).toBe('confirmar_obra');
    expect(de('aguarda_assinatura_pintor', 'pintor')).toBe('assinar');
  });

  it('em cada estado o passo é de uma parte só, nunca das duas', () => {
    for (const s of TODOS) expect([de(s, 'cliente'), de(s, 'pintor')].filter(Boolean).length).toBeLessThanOrEqual(1);
  });

  it('esperar pela outra parte não é um passo — mesmo podendo desistir (o engano da lista até 05/11/2026)', () => {
    // O cliente pode desistir enquanto o pintor confirma, mas não tem nada para fazer.
    expect(de('aguarda_fee', 'cliente')).toBeNull();
    expect(de('aguarda_assinatura_pintor', 'cliente')).toBeNull();
    expect(de('aguarda_deposito', 'pintor')).toBeNull();
    expect(de('aguarda_assinatura_cliente', 'pintor')).toBeNull();
  });

  it('o que já fechou não pede nada a ninguém', () => {
    const fechados = TODOS.filter((s) => !s.startsWith('aguarda_') && s !== 'pintor_nao_pagou' && s !== 'pintor_nao_assinou');
    for (const s of fechados) {
      expect(de(s, 'cliente')).toBeNull();
      expect(de(s, 'pintor')).toBeNull();
    }
  });

  it('o prazo vem da regra do estado: o do cliente, o da comissão, o da assinatura do pintor', () => {
    const datas: { clientDue: IsoDate; feeDue: IsoDate; signDue: IsoDate } = {
      clientDue: '2026-11-10',
      feeDue: '2026-11-08',
      signDue: '2026-11-12',
    };
    expect(proximoPasso({ status: 'aguarda_assinatura_cliente', ...datas }, 'cliente')?.ate).toBe('2026-11-10');
    expect(proximoPasso({ status: 'aguarda_fee', ...datas }, 'pintor')?.ate).toBe('2026-11-08');
    expect(proximoPasso({ status: 'aguarda_assinatura_pintor', ...datas }, 'pintor')?.ate).toBe('2026-11-12');
    expect(proximoPasso({ status: 'aguarda_deposito', ...datas }, 'cliente')?.ate).toBeUndefined();
  });

  it('o texto do cliente não fala do que a plataforma cobra ao pintor (regra 15)', () => {
    for (const s of TODOS) {
      const p = proximoPasso({ status: s }, 'cliente');
      if (p) expect(`${p.titulo} ${p.texto}`).not.toMatch(/comiss|fee|%/i);
    }
  });

  it('a assinatura vem primeiro; depois o prazo mais curto', () => {
    const p = (passo: ProximoPasso['passo'], ate?: string) => ({ passo: { passo, titulo: '', texto: '', ...(ate ? { ate } : {}) } });
    const xs = [p('pagar_caucao'), p('confirmar_obra', '2026-11-20'), p('assinar', '2026-11-30'), p('confirmar_obra', '2026-11-09')];
    expect(ordenarPorUrgencia(xs).map((x) => `${x.passo.passo}${x.passo.ate ? `@${x.passo.ate}` : ''}`)).toEqual([
      'assinar@2026-11-30',
      'confirmar_obra@2026-11-09',
      'confirmar_obra@2026-11-20',
      'pagar_caucao',
    ]);
  });
});
