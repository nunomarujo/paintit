import { describe, expect, it } from 'vitest';
import { euros } from './money';
import { hasLicenseFor, requiredLicense } from './license';

describe('habilitação pelo valor da obra', () => {
  it('segue os limites do parecer', () => {
    expect(requiredLicense(euros(40_000))).toEqual({ kind: 'certificado' });
    expect(requiredLicense(euros(40_000.01))).toEqual({ kind: 'alvara', classe: 1 });
    expect(requiredLicense(euros(200_000))).toEqual({ kind: 'alvara', classe: 1 });
    expect(requiredLicense(euros(400_000))).toEqual({ kind: 'alvara', classe: 2 });
    expect(requiredLicense(euros(800_000))).toEqual({ kind: 'alvara', classe: 3 });
    expect(requiredLicense(euros(900_000))).toEqual({ kind: 'alvara', classe: 4 });
  });

  it('confere o que o pintor tem validado', () => {
    expect(hasLicenseFor(euros(10_000), [])).toBe(false);
    expect(hasLicenseFor(euros(10_000), [{ kind: 'certificado', classe: null }])).toBe(true);
    expect(hasLicenseFor(euros(100_000), [{ kind: 'certificado', classe: null }])).toBe(false);
    expect(hasLicenseFor(euros(300_000), [{ kind: 'alvara', classe: 1 }])).toBe(false);
    expect(hasLicenseFor(euros(300_000), [{ kind: 'alvara', classe: 2 }])).toBe(true);
  });
});
