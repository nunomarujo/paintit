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

export interface SignerTrust {
  trusted: boolean;
  /** `true` só quando a cadeia ficou indeterminada por uma falha de rede a obter um certificado do emissor
   * (AIA), nunca quando foi mesmo avaliada e recusada (ver `src/lib/pades.ts`, `validateChain`). */
  indeterminate?: boolean;
}

/**
 * Recusar logo uma assinatura com certificado não confiável, ou aceitá-la para revisão manual da equipa
 * (decisão de 24/10/2026, item 12 do `docs/DECISOES.md`, a pedido do promotor): recusa-se só quando a
 * cadeia foi mesmo avaliada e recusada para pelo menos uma assinatura — nunca só por a avaliação ter
 * ficado indeterminada por uma falha de rede transitória a obter um certificado do emissor, para não
 * recusar assinaturas legítimas do Cartão de Cidadão/Chave Móvel Digital por esse motivo.
 */
export function shouldRejectUntrustedSignature(signers: SignerTrust[]): boolean {
  return signers.some((s) => !s.trusted && !s.indeterminate);
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

export type SignatureCheck =
  | { ok: true; /** Assinaturas acrescentadas (ex.: dois gerentes que obrigam a sociedade). */ newSignatures: number }
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
  if (!coversWholeFile(after[after.length - 1]!, signed.length)) {
    return { ok: false, reason: 'A assinatura não cobre o documento inteiro.' };
  }
  const increment = checkIncrement(expected, signed);
  if (!increment.ok) return increment;
  return { ok: true, newSignatures: added };
}

// --- O que a assinatura acrescentou ----------------------------------------------
// Uma atualização incremental pode, além da assinatura, mudar o que o PDF mostra
// (outro conteúdo de página, anotações, campos de formulário, JavaScript). O
// acrescento só é aceite se contiver o que uma assinatura precisa: o dicionário
// de assinatura, o campo e o widget da assinatura, a aparência do widget, o
// catálogo/AcroForm atualizados, dados de validação (DSS) e as tabelas xref.

interface PdfObject {
  id: string; // "12 0"
  body: string;
}

function objects(text: string): PdfObject[] {
  const out: PdfObject[] = [];
  const re = /(\d+)\s+(\d+)\s+obj\b([\s\S]*?)\bendobj/g;
  for (let m = re.exec(text); m; m = re.exec(text)) out.push({ id: `${m[1]} ${m[2]}`, body: m[3]! });
  return out;
}

/** Última definição de cada objeto (as atualizações incrementais redefinem objetos). */
function latest(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const o of objects(text)) map.set(o.id, o.body);
  return map;
}

const dictOnly = (body: string) => body.split(/\bstream\b/)[0]!;
const contentsRef = (body: string) => /\/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)/.exec(dictOnly(body))?.[1]?.replace(/\s+/g, ' ') ?? null;
const pagesRef = (body: string) => /\/Pages\s+(\d+\s+\d+\s+R)/.exec(dictOnly(body))?.[1] ?? null;

export function checkIncrement(original: Uint8Array, signed: Uint8Array): { ok: true } | { ok: false; reason: string } {
  const before = latest(latin1(original));
  const added = objects(latin1(signed.subarray(original.length)));
  for (const o of added) {
    const d = dictOnly(o.body);
    const prev = before.get(o.id);
    if (/\/Type\s*\/ObjStm\b/.test(d)) {
      // Objetos comprimidos não se conseguem inspecionar aqui: recusar até haver um caso real a validar.
      return { ok: false, reason: 'O PDF assinado usa objetos comprimidos que não conseguimos verificar. Contacte a equipa da plataforma.' };
    }
    if (/\/(JavaScript|JS|OpenAction|AA|Launch|EmbeddedFile)\b/.test(d)) {
      return { ok: false, reason: 'O PDF assinado acrescenta ações ou ficheiros que não são permitidos.' };
    }
    if (/\/Type\s*\/Page\b/.test(d)) {
      if (!prev) return { ok: false, reason: 'O PDF assinado acrescenta páginas ao contrato.' };
      if (contentsRef(d) !== contentsRef(prev)) return { ok: false, reason: 'O PDF assinado altera o conteúdo de uma página.' };
      continue;
    }
    if (/\/Type\s*\/Catalog\b/.test(d) && prev && pagesRef(d) !== pagesRef(prev)) {
      return { ok: false, reason: 'O PDF assinado altera a estrutura de páginas.' };
    }
    if (/\/Type\s*\/Pages\b/.test(d) && prev && d.replace(/\s+/g, ' ') !== dictOnly(prev).replace(/\s+/g, ' ')) {
      return { ok: false, reason: 'O PDF assinado altera a estrutura de páginas.' };
    }
    if (/\/Subtype\s*\/(?!Widget\b|Form\b|Image\b)\w+/.test(d) && /\/Type\s*\/Annot\b|\/Annots|\/Rect/.test(d) && !/\/FT\s*\/Sig\b/.test(d)) {
      return { ok: false, reason: 'O PDF assinado acrescenta anotações ao contrato.' };
    }
    if (/\/FT\s*\/(Tx|Ch|Btn)\b/.test(d)) {
      return { ok: false, reason: 'O PDF assinado acrescenta campos de formulário.' };
    }
  }
  return { ok: true };
}
