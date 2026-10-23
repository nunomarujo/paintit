import { describe, expect, it } from 'vitest';
import { sniffPdf } from './fileSignature';

describe('assinatura do ficheiro (SEG-05: nunca confiar só na extensão)', () => {
  it('reconhece um PDF pelos primeiros bytes', () => {
    expect(sniffPdf(new TextEncoder().encode('%PDF-1.7\n...'))).toBe(true);
  });

  it('recusa um ficheiro só porque diz chamar-se ou ser PDF', () => {
    expect(sniffPdf(new TextEncoder().encode('<html><script>alert(1)</script></html>'))).toBe(false);
    expect(sniffPdf(new Uint8Array([0xff, 0xd8, 0xff]))).toBe(false); // é um JPEG
    expect(sniffPdf(new Uint8Array(0))).toBe(false);
    expect(sniffPdf(new Uint8Array([0x25, 0x50]))).toBe(false); // demasiado curto para confirmar
  });
});
