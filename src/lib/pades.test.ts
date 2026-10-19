import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { describe, expect, it } from 'vitest';
import { checkIncrement, checkSignedPdf, findSignatures } from '@/domain/signature';
import { validateChain, verifyLastSignature } from './pades';

// Constrói um PDF "assinado" como a Autenticação.gov faz: acrescenta ao fim um
// dicionário de assinatura com /ByteRange e /Contents, e põe em /Contents uma
// assinatura CMS dos bytes cobertos. Certificado de teste autoassinado.

const enc = new TextEncoder();
const crypto = globalThis.crypto;

async function testCertificate(name: string) {
  const keys = (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const cert = new pkijs.Certificate();
  cert.version = 2;
  cert.serialNumber = new asn1js.Integer({ value: 1 });
  for (const target of [cert.subject, cert.issuer]) {
    target.typesAndValues.push(new pkijs.AttributeTypeAndValue({ type: '2.5.4.3', value: new asn1js.Utf8String({ value: name }) }));
    target.typesAndValues.push(new pkijs.AttributeTypeAndValue({ type: '2.5.4.5', value: new asn1js.PrintableString({ value: 'BI12345678' }) }));
  }
  cert.notBefore.value = new Date('2026-01-01');
  cert.notAfter.value = new Date('2030-01-01');
  const bc = new pkijs.BasicConstraints({ cA: true });
  cert.extensions = [new pkijs.Extension({ extnID: '2.5.29.19', critical: true, extnValue: bc.toSchema().toBER(false), parsedValue: bc })];
  await cert.subjectPublicKeyInfo.importKey(keys.publicKey);
  await cert.sign(keys.privateKey, 'SHA-256');
  return { cert, key: keys.privateKey };
}

async function cms(data: Uint8Array, signer: Awaited<ReturnType<typeof testCertificate>>) {
  const digest = await crypto.subtle.digest('SHA-256', data as Uint8Array<ArrayBuffer>);
  const signed = new pkijs.SignedData({
    version: 1,
    encapContentInfo: new pkijs.EncapsulatedContentInfo({ eContentType: '1.2.840.113549.1.7.1' }),
    signerInfos: [
      new pkijs.SignerInfo({
        version: 1,
        sid: new pkijs.IssuerAndSerialNumber({ issuer: signer.cert.issuer, serialNumber: signer.cert.serialNumber }),
        signedAttrs: new pkijs.SignedAndUnsignedAttributes({
          type: 0,
          attributes: [
            new pkijs.Attribute({ type: '1.2.840.113549.1.9.3', values: [new asn1js.ObjectIdentifier({ value: '1.2.840.113549.1.7.1' })] }),
            new pkijs.Attribute({ type: '1.2.840.113549.1.9.4', values: [new asn1js.OctetString({ valueHex: digest })] }),
            new pkijs.Attribute({ type: '1.2.840.113549.1.9.5', values: [new asn1js.UTCTime({ valueDate: new Date('2026-10-19T10:00:00Z') })] }),
          ],
        }),
      }),
    ],
    certificates: [signer.cert],
  });
  await signed.sign(signer.key, 0, 'SHA-256', data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
  const info = new pkijs.ContentInfo({ contentType: '1.2.840.113549.1.7.2', content: signed.toSchema(true) });
  return new Uint8Array(info.toSchema().toBER(false));
}

const SLOT = 8192; // espaço reservado para a assinatura, em dígitos hexadecimais

async function signPdf(original: Uint8Array, signer: Awaited<ReturnType<typeof testCertificate>>) {
  const pad = (n: number) => String(n).padStart(10, '0');
  const head = `\n9 0 obj\n<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /ETSI.CAdES.detached /ByteRange [${pad(0)} ${pad(0)} ${pad(0)} ${pad(0)}] /Contents `;
  const tail = ` >>\nendobj\n%%EOF\n`;
  const total = original.length + head.length + SLOT + 2 + tail.length;
  const gapStart = original.length + head.length;
  const gapEnd = gapStart + SLOT + 2;
  const realHead = head.replace(
    `[${pad(0)} ${pad(0)} ${pad(0)} ${pad(0)}]`,
    `[${pad(0)} ${pad(gapStart)} ${pad(gapEnd)} ${pad(total - gapEnd)}]`,
  );
  const bytes = new Uint8Array(total);
  bytes.set(original, 0);
  bytes.set(enc.encode(realHead), original.length);
  bytes.set(enc.encode('<' + '0'.repeat(SLOT) + '>'), gapStart);
  bytes.set(enc.encode(tail), gapEnd);
  const covered = new Uint8Array(gapStart + (total - gapEnd));
  covered.set(bytes.subarray(0, gapStart), 0);
  covered.set(bytes.subarray(gapEnd), gapStart);
  const der = await cms(covered, signer);
  const hex = Array.from(der, (b) => b.toString(16).padStart(2, '0')).join('').padEnd(SLOT, '0');
  bytes.set(enc.encode(hex), gapStart + 1);
  return bytes;
}

const ORIGINAL = enc.encode('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');

describe('PDF assinado (PAdES)', () => {
  it('aceita o contrato gerado assinado e identifica o signatário', async () => {
    const client = await testCertificate('MARIA SILVA');
    const signed = await signPdf(ORIGINAL, client);
    expect(checkSignedPdf(signed, ORIGINAL)).toEqual({ ok: true, newSignatures: 1 });
    const two = await signPdf(signed, await testCertificate('JOSE GERENTE'));
    expect(checkSignedPdf(two, ORIGINAL)).toEqual({ ok: true, newSignatures: 2 });
    const v = await verifyLastSignature(signed);
    expect(v).toMatchObject({ valid: true, name: 'MARIA SILVA', serialNumber: 'BI12345678', signedAt: '2026-10-19T10:00:00.000Z' });
  }, 30_000);

  it('aceita a segunda assinatura sobre o PDF já assinado', async () => {
    const first = await signPdf(ORIGINAL, await testCertificate('MARIA SILVA'));
    const second = await signPdf(first, await testCertificate('JOAO PINTOR'));
    expect(checkSignedPdf(second, first)).toEqual({ ok: true, newSignatures: 1 });
    expect(findSignatures(second)).toHaveLength(2);
    expect((await verifyLastSignature(second)).name).toBe('JOAO PINTOR');
  }, 30_000);

  it('recusa um documento diferente do gerado, ou sem assinatura', async () => {
    const other = enc.encode('%PDF-1.7\nOUTRO CONTRATO\n%%EOF\n');
    const signedOther = await signPdf(other, await testCertificate('X'));
    expect(checkSignedPdf(signedOther, ORIGINAL).ok).toBe(false);
    const unsigned = new Uint8Array([...ORIGINAL, ...enc.encode('% comentário\n')]);
    expect(checkSignedPdf(unsigned, ORIGINAL)).toMatchObject({ ok: false });
  }, 30_000);

  it('deteta adulteração dos bytes assinados', async () => {
    const signed = await signPdf(ORIGINAL, await testCertificate('MARIA SILVA'));
    const tampered = signed.slice();
    tampered[20] = tampered[20]! ^ 1;
    expect((await verifyLastSignature(tampered)).valid).toBe(false);
  }, 30_000);
});

import { contractDraft } from '@/domain/contracting';
import { contractPdf, pdfSafe } from './contractPdf';

describe('PDF do contrato', () => {
  const draft = contractDraft({
    ref: 'AB12CD34',
    cliente: null,
    pintor: null,
    obra: { morada: null, concelho: 'Lisboa', descricao: 'Pintura das fachadas e varandas.' },
    linhas: [{ descricao: 'Pintura — 2 demãos', quantidade: '161,5 m²', total: '1 372,75 €', inclusao: '' }],
    precoSemIva: '1 372,75 €',
    iva: '315,73 €',
    totalComIva: '1 688,48 €',
    prazo: 'Duração de 20 dias.',
    adiantamento: 'Sem adiantamento.',
    ajusteM2: '8,50 €',
    garantiaObra: '2 anos.',
    exclusoes: '',
  });

  it('é determinístico: os mesmos dados dão os mesmos bytes', async () => {
    const at = new Date('2026-10-19T09:00:00Z');
    const a = await contractPdf(draft, at, 'E1');
    const b = await contractPdf(draft, at, 'E1');
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    expect(new TextDecoder('latin1').decode(a.subarray(0, 8))).toBe('%PDF-1.7');
  });

  it('substitui caracteres que o PDF não desenha', () => {
    expect(pdfSafe('1 372,75 € → ≥')).toBe('1 372,75 € -> ?');
  });
});

describe('cadeia de confiança', () => {
  it('confia num certificado emitido por uma âncora; não num autoassinado qualquer', async () => {
    const ca = await testCertificate('EC TESTE');
    const leafKeys = (await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair;
    const leaf = new pkijs.Certificate();
    leaf.version = 2;
    leaf.serialNumber = new asn1js.Integer({ value: 2 });
    leaf.issuer = ca.cert.subject;
    leaf.subject.typesAndValues.push(new pkijs.AttributeTypeAndValue({ type: '2.5.4.3', value: new asn1js.Utf8String({ value: 'MARIA' }) }));
    leaf.notBefore.value = new Date('2026-01-01');
    leaf.notAfter.value = new Date('2029-01-01');
    await leaf.subjectPublicKeyInfo.importKey(leafKeys.publicKey);
    await leaf.sign(ca.key, 'SHA-256');
    const at = new Date('2026-10-19');
    expect((await validateChain(leaf, [], at, [ca.cert])).trusted).toBe(true);
    expect((await validateChain(leaf, [], at)).trusted).toBe(false);
    expect((await validateChain(leaf, [], new Date('2031-01-01'), [ca.cert])).trusted).toBe(false);
  }, 30_000);
});

describe('o que a assinatura acrescenta ao PDF', () => {
  const page = '\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n';
  const base = enc.encode('%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj' + page + 'trailer\n%%EOF\n');
  const add = (s: string) => new Uint8Array([...base, ...enc.encode(s)]);

  it('aceita o widget e a aparência da assinatura', () => {
    const ok = add('\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R /Annots [10 0 R] >>\nendobj\n10 0 obj\n<< /Type /Annot /Subtype /Widget /FT /Sig /V 9 0 R /Rect [0 0 0 0] >>\nendobj\n11 0 obj\n<< /Type /XObject /Subtype /Form /Length 0 >>\nstream\n\nendstream\nendobj\n');
    expect(checkIncrement(base, ok)).toEqual({ ok: true });
  });

  it('recusa novo conteúdo de página, páginas novas, anotações, campos e JavaScript', () => {
    expect(checkIncrement(base, add('\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 12 0 R >>\nendobj\n')).ok).toBe(false);
    expect(checkIncrement(base, add('\n13 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n')).ok).toBe(false);
    expect(checkIncrement(base, add('\n14 0 obj\n<< /Type /Annot /Subtype /FreeText /Rect [0 0 9 9] /Contents (preço: 1 €) >>\nendobj\n')).ok).toBe(false);
    expect(checkIncrement(base, add('\n15 0 obj\n<< /FT /Tx /V (outro valor) /Rect [0 0 9 9] >>\nendobj\n')).ok).toBe(false);
    expect(checkIncrement(base, add('\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R /OpenAction << /S /JavaScript /JS (x) >> >>\nendobj\n')).ok).toBe(false);
    expect(checkIncrement(base, add('\n16 0 obj\n<< /Type /ObjStm /N 1 /First 4 >>\nstream\nx\nendstream\nendobj\n')).ok).toBe(false);
    expect(checkIncrement(base, add('\n2 0 obj\n<< /Type /Pages /Kids [3 0 R 13 0 R] /Count 2 >>\nendobj\n')).ok).toBe(false);
  });
});
