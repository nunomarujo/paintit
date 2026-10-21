import { describe, expect, it } from 'vitest';
import { isValidNif } from '@/domain/nif';
import { COMPANY } from './company';

describe('dados da empresa', () => {
  it('o NIF é válido', () => {
    expect(isValidNif(COMPANY.nif)).toBe(true);
  });
});
