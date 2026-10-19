// Assinaturas PAdES (PDF assinado com Chave Móvel Digital ou Cartão de Cidadão
// na aplicação Autenticação.gov). A assinatura acrescenta-se ao fim do PDF sem
// alterar os bytes anteriores (atualização incremental). Por isso:
// - o teor assinado é exatamente o que a plataforma gerou se o PDF assinado
//   começar pelos bytes do PDF gerado;
// - a assinatura cobre o ficheiro inteiro se o seu /ByteRange for [0 a b c] com
//   b + c a acabar no fim do ficheiro (só fica de fora o próprio valor da assinatura).
// A verificação criptográfica (CMS) está em src/lib/pades.ts.

export interface SignatureField {
  byteRange: [number, number, number, number];
  /** Assinatura CMS (DER) em hexadecimal, tal como está em /Contents. */
  contentsHex: string;
}

/** O PDF assinado contém, no início e sem alterações, o documento original. */
export function startsWith(signed: Uint8Array, original: Uint8Array): boolean {
  if (signed.length <= original.length) return false;
  for (let i = 0; i < original.length; i++) if (signed[i] !== original[i]) return false;
  return true;
}

const latin1 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return s;
};

/** Campos de assinatura do PDF, pela ordem em que aparecem no ficheiro. */
export function findSignatures(pdf: Uint8Array): SignatureField[] {
  const text = latin1(pdf);
  const out: SignatureField[] = [];
  const re = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const br = m.slice(1, 5).map(Number) as [number, number, number, number];
    // /Contents <hex> é exatamente o intervalo excluído pelo ByteRange.
    const gapStart = br[0] + br[1];
    const gapEnd = br[2];
    const gap = text.slice(gapStart, gapEnd);
    const hex = /^<([0-9A-Fa-f]*)>$/.exec(gap.trim());
    if (!hex) continue;
    out.push({ byteRange: br, contentsHex: hex[1]!.replace(/(00)+$/, '') });
  }
  return out;
}

/** A assinatura cobre todo o ficheiro (exceto o próprio valor da assinatura). */
export function coversWholeFile(f: SignatureField, length: number): boolean {
  const [a, b, c, d] = f.byteRange;
  return a === 0 && b > 0 && c > b && c + d === length;
}

/** Os bytes efetivamente assinados (as duas partes do ByteRange). */
export function signedBytes(pdf: Uint8Array, f: SignatureField): Uint8Array {
  const [a, b, c, d] = f.byteRange;
  const out = new Uint8Array(b + d);
  out.set(pdf.subarray(a, a + b), 0);
  out.set(pdf.subarray(c, c + d), b);
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

export type SignatureCheck =
  | { ok: true; newSignatures: number }
  | { ok: false; reason: string };

/**
 * Verificações estruturais de um PDF carregado depois de assinado: tem de
 * conter o documento esperado sem alterações e acrescentar exatamente uma
 * assinatura nova que cubra o ficheiro inteiro.
 */
export function checkSignedPdf(signed: Uint8Array, expected: Uint8Array): SignatureCheck {
  if (!startsWith(signed, expected)) {
    return { ok: false, reason: 'O PDF carregado não é o contrato gerado pela plataforma, ou foi alterado antes de ser assinado.' };
  }
  const before = findSignatures(expected).length;
  const after = findSignatures(signed);
  const added = after.length - before;
  if (added < 1) return { ok: false, reason: 'O PDF não tem uma assinatura nova. Assine-o na aplicação Autenticação.gov.' };
  if (added > 1) return { ok: false, reason: 'O PDF tem mais do que uma assinatura nova.' };
  if (!coversWholeFile(after[after.length - 1]!, signed.length)) {
    return { ok: false, reason: 'A assinatura não cobre o documento inteiro.' };
  }
  return { ok: true, newSignatures: added };
}
