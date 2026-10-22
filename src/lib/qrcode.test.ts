import { describe, expect, it } from 'vitest';
import { qrCodeSvg } from './qrcode';

describe('código QR de um convite', () => {
  it('gera um SVG válido com módulos escuros', () => {
    const svg = qrCodeSvg('https://quempinta.pt/convite/ABCD1234');
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain('<path d="M');
  });

  it('é determinístico e muda com o texto', () => {
    const a = qrCodeSvg('https://quempinta.pt/convite/ABCD1234');
    const b = qrCodeSvg('https://quempinta.pt/convite/ABCD1234');
    const c = qrCodeSvg('https://quempinta.pt/convite/ZZZZ9999');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
