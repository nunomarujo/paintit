import { describe, expect, it } from 'vitest';

import { isCompanyNif, nameMatchesOfficial } from './nif';

describe('nome oficial e NIPC', () => {
  it('só pessoas coletivas', () => {
    expect(isCompanyNif('509 442 013')).toBe(true);
    expect(isCompanyNif('123456789')).toBe(false);
  });
  it('compara o nome com tolerância', () => {
    expect(nameMatchesOfficial('Pinturas Silva', 'PINTURAS SILVA, LDA')).toBe(true);
    expect(nameMatchesOfficial('Pinturas Silva & Filhos', 'Pinturas Silva e Filhos, Unipessoal Lda.')).toBe(true);
    expect(nameMatchesOfficial('Tintas Rápidas', 'Construções Almeida SA')).toBe(false);
    expect(nameMatchesOfficial('', 'Pinturas Silva Lda')).toBe(false);
  });
});
