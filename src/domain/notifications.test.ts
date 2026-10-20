import { describe, expect, it } from 'vitest';
import { NEW_PROPOSAL_NOTICE, engagementNotices } from './notifications';

describe('avisos por email', () => {
  it('sem mudança de estado não há aviso', () => {
    expect(engagementNotices('aguarda_fee', 'aguarda_fee', 8)).toEqual([]);
  });
  it('o pintor é avisado de que foi escolhido, com o prazo da comissão', () => {
    const n = engagementNotices('aguarda_deposito', 'aguarda_fee', 8);
    expect(n).toHaveLength(1);
    expect(n[0]!.to).toBe('pintor');
    expect(n[0]!.lines.join(' ')).toContain('8 dias');
  });
  it('a assinatura de cada parte avisa a outra', () => {
    expect(engagementNotices('aguarda_assinatura_cliente', 'aguarda_assinatura_pintor', 8).map((x) => x.to)).toEqual(['pintor']);
    expect(engagementNotices('aguarda_fee', 'aguarda_assinatura_cliente', 8).map((x) => x.to)).toEqual(['cliente']);
  });
  it('o fim do contrato avisa as duas partes', () => {
    expect(engagementNotices('aguarda_assinatura_pintor', 'assinado', 8).map((x) => x.to).sort()).toEqual(['cliente', 'pintor']);
  });
  it('os avisos não identificam a outra parte', () => {
    const all = (['aguarda_fee', 'aguarda_assinatura_pintor', 'cliente_desistiu', 'pintor_nao_pagou'] as const).flatMap((s) =>
      engagementNotices('aguarda_deposito', s, 8),
    );
    for (const n of all) expect(n.lines.join(' ')).not.toMatch(/@|\d{9}|rua /i);
  });
  it('nova proposta não identifica a empresa', () => {
    expect(NEW_PROPOSAL_NOTICE('Fachadas 2027').lines.join(' ')).toContain('Fachadas 2027');
  });
});
