import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkIncrement, checkSignedPdf, findSignatures, shouldRejectUntrustedSignature } from '@/domain/signature';
import { validateChain, verifyLastSignature, verifySignature } from './pades';
import { PT_CC_ANCHORS } from './trust/anchors';
import { EC_ASSINATURA_0019, EC_RAIZ_ESTADO_002 } from './trust/cadeiasOficiais.fixture';

// Constrói um PDF "assinado" como a Autenticação.gov faz: acrescenta ao fim um
// dicionário de assinatura com /ByteRange e /Contents, e põe em /Contents uma
// assinatura CMS dos bytes cobertos. Certificado de teste autoassinado.

const enc = new TextEncoder();
// O `fetch` simulado num teste nunca passa para o seguinte, mesmo quando esse teste falha a meio.
afterEach(() => vi.restoreAllMocks());
const crypto = globalThis.crypto;

async function testCertificate(name: string, notAfter = '2030-01-01') {
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
  cert.notAfter.value = new Date(notAfter);
  const bc = new pkijs.BasicConstraints({ cA: true });
  cert.extensions = [new pkijs.Extension({ extnID: '2.5.29.19', critical: true, extnValue: bc.toSchema().toBER(false), parsedValue: bc })];
  await cert.subjectPublicKeyInfo.importKey(keys.publicKey);
  await cert.sign(keys.privateKey, 'SHA-256');
  return { cert, key: keys.privateKey };
}

async function cms(data: Uint8Array, signer: Awaited<ReturnType<typeof testCertificate>>, extra: pkijs.Certificate[] = [], quando = new Date('2026-10-19T10:00:00Z')) {
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
            new pkijs.Attribute({ type: '1.2.840.113549.1.9.5', values: [new asn1js.UTCTime({ valueDate: quando })] }),
          ],
        }),
      }),
    ],
    certificates: [signer.cert, ...extra],
  });
  await signed.sign(signer.key, 0, 'SHA-256', data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
  const info = new pkijs.ContentInfo({ contentType: '1.2.840.113549.1.7.2', content: signed.toSchema(true) });
  return new Uint8Array(info.toSchema().toBER(false));
}

const SLOT = 8192; // espaço reservado para a assinatura, em dígitos hexadecimais

async function signPdf(original: Uint8Array, signer: Awaited<ReturnType<typeof testCertificate>>, extra: pkijs.Certificate[] = [], slot = SLOT, quando?: Date) {
  const pad = (n: number) => String(n).padStart(10, '0');
  const head = `\n9 0 obj\n<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /ETSI.CAdES.detached /ByteRange [${pad(0)} ${pad(0)} ${pad(0)} ${pad(0)}] /Contents `;
  const tail = ` >>\nendobj\n%%EOF\n`;
  const total = original.length + head.length + slot + 2 + tail.length;
  const gapStart = original.length + head.length;
  const gapEnd = gapStart + slot + 2;
  const realHead = head.replace(
    `[${pad(0)} ${pad(0)} ${pad(0)} ${pad(0)}]`,
    `[${pad(0)} ${pad(gapStart)} ${pad(gapEnd)} ${pad(total - gapEnd)}]`,
  );
  const bytes = new Uint8Array(total);
  bytes.set(original, 0);
  bytes.set(enc.encode(realHead), original.length);
  bytes.set(enc.encode('<' + '0'.repeat(slot) + '>'), gapStart);
  bytes.set(enc.encode(tail), gapEnd);
  const covered = new Uint8Array(gapStart + (total - gapEnd));
  covered.set(bytes.subarray(0, gapStart), 0);
  covered.set(bytes.subarray(gapEnd), gapStart);
  const der = await cms(covered, signer, extra, quando);
  const hex = Array.from(der, (b) => b.toString(16).padStart(2, '0')).join('').padEnd(slot, '0');
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

  it('um certificado autoassinado com o nome de outra pessoa e a cadeia oficial no PDF não é de confiança', async () => {
    // Revisão de 05/11/2026: o signatário ia em primeiro na lista do pkijs, que valida o último; com a EC
    // 0019 pública (e a 008 e a raiz) no PDF, validava-se a 0019 e a assinatura forjada passava por «de
    // confiança», com o nome e o n.º de identificação escolhidos por quem a forjou.
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('sem rede no teste'));
    const der = (b64: string) => {
      const b = Buffer.from(b64, 'base64');
      return new pkijs.Certificate({
        schema: asn1js.fromBER(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer).result,
      });
    };
    const a008 = der(PT_CC_ANCHORS.find((a) => a.name === 'Cartão de Cidadão 008')!.der);
    const raiz = der(EC_RAIZ_ESTADO_002);
    const atacante = await testCertificate('ANA PEREIRA');
    // Só a EC 0019 — a forma que passava (com a raiz em último, o pkijs recusava por acaso) — e a cadeia inteira.
    for (const cadeia of [[der(EC_ASSINATURA_0019)], [der(EC_ASSINATURA_0019), a008, raiz]]) {
      const v = await verifyLastSignature(await signPdf(ORIGINAL, atacante, cadeia, 16384));
      expect(v.valid).toBe(true); // a assinatura CMS é válida para a chave de quem a fez...
      expect(v.name).toBe('ANA PEREIRA');
      expect(v.trusted).toBe(false); // ...mas o certificado não é do Estado
      expect(v.indeterminate).toBeUndefined();
    }
  }, 30_000);

  it('valida o certificado na data de hoje, e não na hora que a própria assinatura declara', async () => {
    // Revisão de 05/11/2026: a cadeia validava-se no `signingTime`, que escreve quem assina. Um certificado
    // caducado passava declarando uma hora em que ainda valia.
    const ca = await testCertificate('EC DATAS TESTE', '2049-12-01');
    const emitido = async (nome: string, ate: string) => {
      const k = (await crypto.subtle.generateKey(
        { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
        true,
        ['sign', 'verify'],
      )) as CryptoKeyPair;
      const c = new pkijs.Certificate();
      c.version = 2;
      c.serialNumber = new asn1js.Integer({ value: 31 });
      c.issuer = ca.cert.subject;
      c.subject.typesAndValues.push(new pkijs.AttributeTypeAndValue({ type: '2.5.4.3', value: new asn1js.Utf8String({ value: nome }) }));
      c.notBefore.value = new Date('2026-01-01');
      c.notAfter.value = new Date(ate);
      await c.subjectPublicKeyInfo.importKey(k.publicKey);
      await c.sign(ca.key, 'SHA-256');
      return { cert: c, key: k.privateKey };
    };
    const declarada = new Date('2026-02-01T10:00:00Z');
    const caducado = await emitido('RUI CADUCADO', '2026-03-01');
    const v = await verifySignature(await signPdf(ORIGINAL, caducado, [], SLOT, declarada), 0, [ca.cert]);
    expect(v.valid).toBe(true);
    expect(v.signedAt).toBe(declarada.toISOString());
    expect(v.trusted).toBe(false);
    expect(v.trustReason).toMatch(/expired/);
    // Controlo: o mesmo, com um certificado que ainda vale, fica de confiança (datas até 2049: o X.509 escreve-as
    // em UTCTime, com o ano em dois dígitos).
    const valido = await emitido('RUI VALIDO', '2049-01-01');
    expect((await verifySignature(await signPdf(ORIGINAL, valido, [], SLOT, declarada), 0, [ca.cert])).trusted).toBe(true);
  }, 30_000);

  it('aceita a segunda assinatura sobre o PDF já assinado', async () => {
    const first = await signPdf(ORIGINAL, await testCertificate('MARIA SILVA'));
    const second = await signPdf(first, await testCertificate('JOAO PINTOR'));
    expect(checkSignedPdf(second, first)).toEqual({ ok: true, newSignatures: 1 });
    expect(findSignatures(second)).toHaveLength(2);
    // Comparar o objecto todo, e não só o nome: quando esta verificacao falha, o `reason` do
    // catch de verifySignature diz porque falhou. A assercao antiga dizia so "esperava null".
    expect(await verifyLastSignature(second)).toMatchObject({ valid: true, name: 'JOAO PINTOR', serialNumber: 'BI12345678' });
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
    const semAncora = await validateChain(leaf, [], at);
    expect(semAncora.trusted).toBe(false);
    // Sem extensão AIA nenhuma no certificado, nunca se tentou rede nenhuma — recusada mesmo, não indeterminada.
    expect(semAncora.indeterminate).toBeUndefined();
    expect((await validateChain(leaf, [], new Date('2031-01-01'), [ca.cert])).trusted).toBe(false);
  }, 30_000);
});

describe('cadeia completada por AIA (certificado do emissor não incluído no PDF)', () => {
  async function intermediateSignedBy(root: Awaited<ReturnType<typeof testCertificate>>) {
    const keys = (await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair;
    const inter = new pkijs.Certificate();
    inter.version = 2;
    inter.serialNumber = new asn1js.Integer({ value: 20 });
    inter.issuer = root.cert.subject;
    inter.subject.typesAndValues.push(new pkijs.AttributeTypeAndValue({ type: '2.5.4.3', value: new asn1js.Utf8String({ value: 'EC INTERMEDIA TESTE' }) }));
    inter.notBefore.value = new Date('2026-01-01');
    inter.notAfter.value = new Date('2030-01-01');
    const bc = new pkijs.BasicConstraints({ cA: true });
    inter.extensions = [new pkijs.Extension({ extnID: '2.5.29.19', critical: true, extnValue: bc.toSchema().toBER(false), parsedValue: bc })];
    await inter.subjectPublicKeyInfo.importKey(keys.publicKey);
    await inter.sign(root.key, 'SHA-256');
    return { cert: inter, key: keys.privateKey };
  }

  async function leafViaAia(inter: Awaited<ReturnType<typeof intermediateSignedBy>>, aiaUrl: string) {
    const leafKeys = (await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair;
    const leaf = new pkijs.Certificate();
    leaf.version = 2;
    leaf.serialNumber = new asn1js.Integer({ value: 21 });
    leaf.issuer = inter.cert.subject;
    leaf.subject.typesAndValues.push(new pkijs.AttributeTypeAndValue({ type: '2.5.4.3', value: new asn1js.Utf8String({ value: 'RUI' }) }));
    leaf.notBefore.value = new Date('2026-01-01');
    leaf.notAfter.value = new Date('2029-01-01');
    const infoAccess = new pkijs.InfoAccess({
      accessDescriptions: [
        new pkijs.AccessDescription({ accessMethod: '1.3.6.1.5.5.7.48.2', accessLocation: new pkijs.GeneralName({ type: 6, value: aiaUrl }) }),
      ],
    });
    leaf.extensions = [new pkijs.Extension({ extnID: '1.3.6.1.5.5.7.1.1', critical: false, extnValue: infoAccess.toSchema().toBER(false), parsedValue: infoAccess })];
    await leaf.subjectPublicKeyInfo.importKey(leafKeys.publicKey);
    await leaf.sign(inter.key, 'SHA-256');
    return leaf;
  }

  async function withAiaServer(cert: pkijs.Certificate, run: (url: string) => Promise<void>) {
    const http = await import('node:http');
    const der = Buffer.from(cert.toSchema().toBER(false));
    const server = http.createServer((_req, res) => res.end(der));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as { port: number }).port;
    try {
      await run(`http://127.0.0.1:${port}/ec.cer`);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  it('vai buscar o certificado intermédio por AIA e confia na cadeia completa', async () => {
    const root = await testCertificate('EC RAIZ TESTE');
    const inter = await intermediateSignedBy(root);
    await withAiaServer(inter.cert, async (url) => {
      const leaf = await leafViaAia(inter, url);
      const result = await validateChain(leaf, [], new Date('2026-10-19'), [root.cert]);
      expect(result).toEqual({ trusted: true });
    });
  }, 30_000);

  it('com a raiz no PDF, a cadeia fecha na âncora intermédia, e não é recusada por a raiz não ser âncora', async () => {
    // 05/11/2026: as âncoras são entidades intermédias («Cartão de Cidadão 00N»), e o PDF pode trazer a
    // cadeia inteira, raiz incluída. Com a raiz em último na lista, o pkijs tomava-a pelo signatário (valida
    // o último certificado que recebe) e recusava («No valid certificate paths found»).
    const root = await testCertificate('EC RAIZ TESTE 3');
    const inter = await intermediateSignedBy(root);
    // O AIA nunca se segue: o emissor do signatário já é uma âncora.
    const leaf = await leafViaAia(inter, 'http://127.0.0.1:1/ec.cer');
    const at = new Date('2026-10-19');
    expect(await validateChain(leaf, [inter.cert, root.cert], at, [inter.cert])).toEqual({ trusted: true });
    expect(await validateChain(leaf, [root.cert], at, [inter.cert])).toEqual({ trusted: true });
    // Sem a âncora, a raiz no PDF não dá confiança nenhuma.
    const outraRaiz = await testCertificate('EC RAIZ TESTE 4');
    const r = await validateChain(leaf, [inter.cert, root.cert], at, [outraRaiz.cert]);
    expect(r.trusted).toBe(false);
    expect(r.indeterminate).toBeUndefined();
  }, 30_000);

  it('um autoassinado do atacante com a EC verdadeira no PDF não fica de confiança (a EC não é o signatário)', async () => {
    // Revisão de 05/11/2026: já acontecia antes da 008 — o pkijs validava a EC (último da lista) em vez do
    // certificado do signatário.
    const root = await testCertificate('EC RAIZ TESTE 5');
    const inter = await intermediateSignedBy(root);
    const atacante = await testCertificate('MARIA SILVA');
    const at = new Date('2026-10-19');
    for (const noPdf of [[atacante.cert, inter.cert], [atacante.cert, inter.cert, root.cert], [inter.cert]]) {
      const r = await validateChain(atacante.cert, noPdf, at, [root.cert]);
      expect(r.trusted).toBe(false);
      expect(r.indeterminate).toBeUndefined();
    }
    // Controlo: um certificado emitido de facto pela EC fica de confiança com o mesmo PDF.
    const leaf = await leafViaAia(inter, 'http://127.0.0.1:1/ec.cer');
    expect(await validateChain(leaf, [leaf, inter.cert, root.cert], at, [root.cert])).toEqual({ trusted: true });
    // O middleware oficial mete o signatário duas vezes no PDF (sign-pkcs7.cpp, linhas 508 e 414): uma cópia
    // com os mesmos bytes, noutro objeto. O pkijs funde as cópias e fica com a primeira — que não pode ser a
    // que se valida no lugar do signatário.
    const copia = (c: pkijs.Certificate) => new pkijs.Certificate({ schema: asn1js.fromBER(c.toSchema().toBER(false)).result });
    expect(await validateChain(leaf, [copia(leaf), leaf, inter.cert, root.cert], at, [root.cert])).toEqual({ trusted: true });
    const duplicado = await validateChain(atacante.cert, [copia(atacante.cert), atacante.cert, inter.cert], at, [root.cert]);
    expect(duplicado.trusted).toBe(false);
  }, 30_000);

  // 30/10/2026: este ficheiro estava apontado como de falha intermitente. Corri-o oito vezes
  // seguidas, verde todas; e fui ver os dois mecanismos plausíveis, que estão os dois já
  // protegidos — o `testTimeout` são 30 s e o teste mais lento leva 200 ms, e a ida à rede do AIA
  // tem `AbortSignal.timeout(5000)` em `pades.ts`, por isso uma ligação pendurada aborta muito
  // antes de o teste expirar. Não mexi em nada: mudar código por palpite é pior do que deixar a
  // suspeita escrita. Se voltar a falhar, vale a pena guardar o output — é o que falta aqui.
  it('sem conseguir ir buscar o emissor por falha de rede, fica indeterminada — nunca recusada por omissão', async () => {
    const root = await testCertificate('EC RAIZ TESTE 2');
    const inter = await intermediateSignedBy(root);
    const leaf = await leafViaAia(inter, 'http://127.0.0.1:1/ec.cer');
    const result = await validateChain(leaf, [], new Date('2026-10-19'), [root.cert]);
    expect(result.trusted).toBe(false);
    expect(result.indeterminate).toBe(true);
  }, 30_000);
});

describe('shouldRejectUntrustedSignature (recusar logo ou aceitar para revisão manual)', () => {
  it('não recusa quando todas as assinaturas são de confiança', () => {
    expect(shouldRejectUntrustedSignature([{ trusted: true }, { trusted: true }])).toBe(false);
  });

  it('não recusa quando a falta de confiança ficou indeterminada por falha de rede', () => {
    expect(shouldRejectUntrustedSignature([{ trusted: false, indeterminate: true }])).toBe(false);
    expect(shouldRejectUntrustedSignature([{ trusted: true }, { trusted: false, indeterminate: true }])).toBe(false);
  });

  it('recusa quando a cadeia foi mesmo avaliada e recusada para pelo menos uma assinatura', () => {
    expect(shouldRejectUntrustedSignature([{ trusted: false }])).toBe(true);
    expect(shouldRejectUntrustedSignature([{ trusted: true }, { trusted: false }])).toBe(true);
    // Mesmo com outra indeterminada ao lado, uma recusa mesmo avaliada basta para recusar logo.
    expect(shouldRejectUntrustedSignature([{ trusted: false, indeterminate: true }, { trusted: false }])).toBe(true);
  });
});

describe('revogação por OCSP', () => {
  // Uma CA que também responde por OCSP (o caso mais simples de autorização: o emissor direto não precisa de
  // um certificado delegado com id-kp-OCSPSigning — ver BasicOCSPResponseVerifyParams em pkijs).
  async function leafSignedByCa(ca: Awaited<ReturnType<typeof testCertificate>>, ocspUrl: string) {
    const leafKeys = (await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair;
    const leaf = new pkijs.Certificate();
    leaf.version = 2;
    leaf.serialNumber = new asn1js.Integer({ value: 3 });
    leaf.issuer = ca.cert.subject;
    leaf.subject.typesAndValues.push(new pkijs.AttributeTypeAndValue({ type: '2.5.4.3', value: new asn1js.Utf8String({ value: 'ANA' }) }));
    leaf.notBefore.value = new Date('2026-01-01');
    leaf.notAfter.value = new Date('2029-01-01');
    const infoAccess = new pkijs.InfoAccess({
      accessDescriptions: [
        new pkijs.AccessDescription({ accessMethod: '1.3.6.1.5.5.7.48.1', accessLocation: new pkijs.GeneralName({ type: 6, value: ocspUrl }) }),
      ],
    });
    leaf.extensions = [new pkijs.Extension({ extnID: '1.3.6.1.5.5.7.1.1', critical: false, extnValue: infoAccess.toSchema().toBER(false), parsedValue: infoAccess })];
    await leaf.subjectPublicKeyInfo.importKey(leafKeys.publicKey);
    await leaf.sign(ca.key, 'SHA-256');
    return leaf;
  }

  // Constrói uma BasicOCSPResponse assinada pela própria CA, do jeito documentado pelo pkijs (ver o comentário
  // de exemplo em OCSPResponse), para o teste bater à porta real do nosso código (pedido → HTTP → resposta
  // assinada → verificação) em vez de confiar só em que o tipo compila.
  async function ocspResponseBytes(
    ca: Awaited<ReturnType<typeof testCertificate>>,
    leaf: pkijs.Certificate,
    status: 'boa' | 'revogado',
    embedCerts = true,
  ) {
    const basic = new pkijs.BasicOCSPResponse();
    basic.tbsResponseData.responderID = ca.cert.subject;
    basic.tbsResponseData.producedAt = new Date();
    const certID = new pkijs.CertID();
    await certID.createForCertificate(leaf, { hashAlgorithm: 'SHA-256', issuerCertificate: ca.cert });
    const single = new pkijs.SingleResponse({ certID });
    single.certStatus =
      status === 'boa'
        ? new asn1js.Primitive({ idBlock: { tagClass: 3, tagNumber: 0 } })
        : new asn1js.Constructed({ idBlock: { tagClass: 3, tagNumber: 1 }, value: [new asn1js.GeneralizedTime({ valueDate: new Date('2026-09-01') })] });
    single.thisUpdate = new Date();
    basic.tbsResponseData.responses.push(single);
    // A RFC 6960 permite ao responder omitir o seu próprio certificado (o cliente já o conhece); testado abaixo.
    if (embedCerts) basic.certs = [ca.cert];
    await basic.sign(ca.key, 'SHA-256');
    const response = new pkijs.OCSPResponse({
      responseStatus: new asn1js.Enumerated({ value: 0 }),
      responseBytes: new pkijs.ResponseBytes({ responseType: pkijs.id_PKIX_OCSP_Basic, response: new asn1js.OctetString({ valueHex: basic.toSchema().toBER(false) }) }),
    });
    return new Uint8Array(response.toSchema().toBER(false));
  }

  async function withOcspServer(respond: (body: Uint8Array) => Promise<Uint8Array>, run: (url: string) => Promise<void>) {
    const http = await import('node:http');
    const server = http.createServer((req, res) => {
      const chunks: Uint8Array[] = [];
      req.on('data', (c: Uint8Array) => chunks.push(c));
      req.on('end', () => {
        respond(Buffer.concat(chunks)).then((out) => res.end(Buffer.from(out)));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as { port: number }).port;
    try {
      await run(`http://127.0.0.1:${port}/ocsp`);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  it('um certificado com resposta OCSP "revogado" deixa de ser de confiança, mesmo com a cadeia válida', async () => {
    const ca = await testCertificate('EC OCSP TESTE 2');
    let leaf!: pkijs.Certificate;
    await withOcspServer(
      async () => ocspResponseBytes(ca, leaf, 'revogado'),
      async (url) => {
        leaf = await leafSignedByCa(ca, url);
        const result = await validateChain(leaf, [], new Date('2026-10-19'), [ca.cert]);
        expect(result).toEqual({ trusted: false, reason: 'Certificado revogado.' });
      },
    );
  }, 30_000);

  it('uma EC falsa com o nome da verdadeira, posta no PDF, não desvia o OCSP: o revogado continua revogado', async () => {
    // Revisão de 05/11/2026: o emissor para o OCSP era o primeiro do PDF com o mesmo NOME, e a pergunta saía
    // com a chave da falsa — a resposta não batia e ficava «inconclusiva», que não bloqueia. Agora é o
    // emissor do caminho validado.
    const ca = await testCertificate('EC OCSP TESTE F');
    const falsa = await testCertificate('EC OCSP TESTE F');
    let leaf!: pkijs.Certificate;
    await withOcspServer(
      async () => ocspResponseBytes(ca, leaf, 'revogado'),
      async (url) => {
        leaf = await leafSignedByCa(ca, url);
        const result = await validateChain(leaf, [falsa.cert, ca.cert], new Date('2026-10-19'), [ca.cert]);
        expect(result).toEqual({ trusted: false, reason: 'Certificado revogado.' });
      },
    );
  }, 30_000);

  it('deteta "revogado" mesmo quando a resposta não inclui o certificado do responder (RFC 6960 permite omiti-lo)', async () => {
    const ca = await testCertificate('EC OCSP TESTE 5');
    let leaf!: pkijs.Certificate;
    await withOcspServer(
      async () => ocspResponseBytes(ca, leaf, 'revogado', false),
      async (url) => {
        leaf = await leafSignedByCa(ca, url);
        const result = await validateChain(leaf, [], new Date('2026-10-19'), [ca.cert]);
        expect(result).toEqual({ trusted: false, reason: 'Certificado revogado.' });
      },
    );
  }, 30_000);

  it('uma resposta "boa" confirma a confiança já dada pela cadeia', async () => {
    const ca = await testCertificate('EC OCSP TESTE 3');
    let leaf!: pkijs.Certificate;
    await withOcspServer(
      async () => ocspResponseBytes(ca, leaf, 'boa'),
      async (url) => {
        leaf = await leafSignedByCa(ca, url);
        const result = await validateChain(leaf, [], new Date('2026-10-19'), [ca.cert]);
        expect(result).toEqual({ trusted: true });
      },
    );
  }, 30_000);

  it('sem responder acessível, não bloqueia (falha aberta, como o resto desta verificação)', async () => {
    const ca = await testCertificate('EC OCSP TESTE 4');
    const leaf = await leafSignedByCa(ca, 'http://127.0.0.1:1/ocsp');
    const result = await validateChain(leaf, [], new Date('2026-10-19'), [ca.cert]);
    expect(result).toEqual({ trusted: true });
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
