import { describe, expect, it } from 'vitest';
import { toEngagementRecord, type EngagementRowLike } from './engagementRecord';
import { replay } from './contracting';

const row: EngagementRowLike = {
  id: '589fab1c-a365-49bc-b50f-edc34590dce6',
  base_cents: 628_000,
  advance_cents: 0,
  rules_version: '2026-10-20',
  created_at: '2026-10-21T00:16:44.541664+00:00',
};

describe('toEngagementRecord', () => {
  it('usa 0 quando referral_discount_bp não vem na linha (coluna aditiva ainda por chegar à base real)', () => {
    const rec = toEngagementRecord({ ...row, referral_discount_bp: undefined });
    expect(rec.referralDiscountBp).toBe(0);
  });

  it('usa 0 também quando vem null', () => {
    const rec = toEngagementRecord({ ...row, referral_discount_bp: null });
    expect(rec.referralDiscountBp).toBe(0);
  });

  it('mantém o valor gravado quando a coluna existe', () => {
    const rec = toEngagementRecord({ ...row, referral_discount_bp: 125 });
    expect(rec.referralDiscountBp).toBe(125);
  });

  it('regressão: uma linha real sem a coluna já não derruba replay() com um MoneyError de NaN (23/10/2026)', () => {
    const rec = toEngagementRecord({ ...row, referral_discount_bp: undefined });
    expect(() => replay(rec, [], new Date('2026-10-23T12:00:00Z'))).not.toThrow();
  });
});
