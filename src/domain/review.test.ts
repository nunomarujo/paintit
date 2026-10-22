import { describe, expect, it } from 'vitest';
import { DOCUMENT_REJECTION_REASONS, OTHER_REASON, PHOTO_REJECTION_REASONS } from './review';

describe('motivos pré-aprovados de rejeição', () => {
  it('não têm motivos repetidos nem vazios, e nenhum coincide com "Outro"', () => {
    for (const list of [PHOTO_REJECTION_REASONS, DOCUMENT_REJECTION_REASONS]) {
      expect(new Set(list).size).toBe(list.length);
      for (const r of list) {
        expect(r.trim().length).toBeGreaterThan(0);
        expect(r).not.toBe(OTHER_REASON);
      }
    }
  });
});
