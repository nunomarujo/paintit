import { createHash } from 'node:crypto';
import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { shouldRejectUntrustedSignature } from '@/domain/signature';
import { validateChain } from '../pades';
import { PT_CC_ANCHORS } from './anchors';
import { EC_ASSINATURA_0019, EC_ASSINATURA_0020, EC_CMD_00007, EC_RAIZ_ESTADO_002 } from './cadeiasOficiais.fixture';

const sha256 = (b64: string) => createHash('sha256').update(Buffer.from(b64, 'base64')).digest('hex');
const certificado = (b64: string) => {
  const der = Buffer.from(b64, 'base64');
  const asn = asn1js.fromBER(der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength) as ArrayBuffer);
  return new pkijs.Certificate({ schema: asn.result });
};
const ancora = (nome: string) => PT_CC_ANCHORS.find((a) => a.name === nome);
const CN = (c: pkijs.Certificate, onde: 'subject' | 'issuer') =>
  (c[onde].typesAndValues.find((t) => t.type === '2.5.4.3')?.value.valueBlock as { value?: string } | undefined)?.value;

afterEach(() => vi.restoreAllMocks());

describe('âncoras de confiança: as entidades «Cartão de Cidadão» do Estado', () => {
  it('a 008 está na lista, e é o certificado oficial (a impressão do middleware e do site da PKI)', () => {
    const a = ancora('Cartão de Cidadão 008');
    expect(a).toBeDefined();
    expect(sha256(a!.der)).toBe('e290db26ae4511a596da70d0ba2d1113fde6fa2c53ffce12e2b129f4ad33f7b5');
    const c = certificado(a!.der);
    expect(CN(c, 'subject')).toBe('Cartão de Cidadão 008');
    expect(CN(c, 'issuer')).toBe('ECRaizEstado 002');
  });

  it('as da 003 à 007 batem com as impressões do middleware oficial', () => {
    // `certs.json` do middleware (commit 0900b28, 29/10/2026).
    const doMiddleware: Record<string, string> = {
      'Cartão de Cidadão 003': '24a3f102f0c88e454801ce05ca86a5c0fb528c5452ff0f4cc859b6dfa987f77c',
      'Cartão de Cidadão 004': '28cad66d2c81d77b177a021561f0e34d7899f4331d61336f435107ca220d0aa7',
      'Cartão de Cidadão 005': 'ef9b3db22fe3cfd40f3a0533036a0953e868f1735455acc3b8119833edb7b2f1',
      'Cartão de Cidadão 006': 'ebefabdc96639a5feb3af145afe538d5f146a0cad2c8ec0684dd96b2b3f369e5',
      'Cartão de Cidadão 007': '80d9dd6f17a670902e46b35ebad5c4206a523420b55b99be16ba381f947c1e41',
    };
    for (const [nome, impressao] of Object.entries(doMiddleware)) expect(sha256(ancora(nome)!.der), nome).toBe(impressao);
  });

  it('os certificados de teste são os oficiais', () => {
    expect(sha256(EC_ASSINATURA_0019)).toBe('73a0d6bfaad017084090ee16443266050431b274830c4615819a342c59d28cd7');
    expect(sha256(EC_ASSINATURA_0020)).toBe('7828a5b906759a627d31cb628bef8477dd3c7f144e095c263b22ba1283268133');
    expect(sha256(EC_CMD_00007)).toBe('9c0bd10392d1bca3867440373316a862b962abbffba5b98f8a8f5209383f0ab2');
    expect(sha256(EC_RAIZ_ESTADO_002)).toBe('3932e8a2a6f9e422594291c14dd87667bfd0a72e607dfdd2872beab0e4d21a10');
  });
});

describe('as assinaturas dos cartões emitidos desde 2024 e da Chave Móvel Digital desde 2025 (sob a 008)', () => {
  // A cadeia tal como um PDF assinado a pode trazer: a entidade de assinatura, a 008 e a raiz. Sem rede: o
  // OCSP falha, e isso nunca recusa (`checkRevocation` dá «inconclusivo»).
  const semRede = () => vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('sem rede no teste'));
  const em = new Date('2026-11-05');
  const a008 = certificado(ancora('Cartão de Cidadão 008')!.der);
  const raiz = certificado(EC_RAIZ_ESTADO_002);

  it.each([
    ['de assinatura do cartão 0019', EC_ASSINATURA_0019],
    ['de assinatura do cartão 0020', EC_ASSINATURA_0020],
    ['da Chave Móvel Digital 00007', EC_CMD_00007],
  ])('a entidade %s encadeia na âncora «Cartão de Cidadão 008» (ECDSA P-521)', async (_n, b64) => {
    semRede();
    const ec = certificado(b64);
    expect(CN(ec, 'issuer')).toBe('Cartão de Cidadão 008');
    // Com a cadeia inteira no PDF, raiz incluída, por qualquer ordem; e sem nada além da própria entidade.
    expect(await validateChain(ec, [a008, raiz], em)).toEqual({ trusted: true });
    expect(await validateChain(ec, [raiz, a008], em)).toEqual({ trusted: true });
    expect(await validateChain(ec, [ec, raiz], em)).toEqual({ trusted: true });
    expect(await validateChain(ec, [], em)).toEqual({ trusted: true });
  });

  it('sem a 008 nas âncoras (a lista até 05/11/2026), a cadeia era avaliada e recusada logo, não «por confirmar»', async () => {
    // Como em produção: o AIA da 008 (http://trust.ecee.gov.pt/ecraiz002.crt) devolve a raiz do Estado,
    // que não é âncora; o OCSP não responde.
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      String(url).endsWith('/ecraiz002.crt')
        ? new Response(Buffer.from(EC_RAIZ_ESTADO_002, 'base64'))
        : Promise.reject(new Error('sem rede')),
    );
    const ate007 = PT_CC_ANCHORS.filter((a) => a.name !== 'Cartão de Cidadão 008').map((a) => certificado(a.der));
    for (const ec of [EC_ASSINATURA_0019, EC_CMD_00007]) {
      const r = await validateChain(certificado(ec), [a008], em, ate007);
      expect(r.trusted).toBe(false);
      expect(r.indeterminate).toBeUndefined();
      expect(shouldRejectUntrustedSignature([r])).toBe(true);
    }
  });

  it('as âncoras são só as entidades «Cartão de Cidadão», e nenhuma raiz', () => {
    // A ECRaizEstado 002 emite também entidades que não são do Cartão de Cidadão: a âncora intermédia é que
    // delimita a confiança à hierarquia dele.
    for (const a of PT_CC_ANCHORS) {
      const c = certificado(a.der);
      expect(CN(c, 'subject')).toMatch(/^Cartão de Cidadão 00\d$/);
      expect(c.subject.isEqual(c.issuer)).toBe(false);
    }
    expect(PT_CC_ANCHORS.some((a) => sha256(a.der) === sha256(EC_RAIZ_ESTADO_002))).toBe(false);
  });
});

describe('um certificado do signatário forjado, com a cadeia oficial verdadeira no PDF (revisão de 05/11/2026)', () => {
  // O pkijs valida o ÚLTIMO certificado que recebe; o signatário ia em primeiro, e com outros no PDF
  // validava-se um deles. Um certificado do atacante, com o nome e o n.º de identificação de outra pessoa,
  // mais a EC 0019 pública, dava «de confiança».
  const semRede = () => vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('sem rede no teste'));
  const em = new Date('2026-11-05');
  const a008 = certificado(ancora('Cartão de Cidadão 008')!.der);
  const raiz = certificado(EC_RAIZ_ESTADO_002);
  const ec0019 = certificado(EC_ASSINATURA_0019);

  async function doAtacante(emissor?: pkijs.RelativeDistinguishedNames) {
    const k = (await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair;
    const c = new pkijs.Certificate();
    c.version = 2;
    c.serialNumber = new asn1js.Integer({ value: 77 });
    c.subject.typesAndValues.push(
      new pkijs.AttributeTypeAndValue({ type: '2.5.4.3', value: new asn1js.Utf8String({ value: 'ANA PEREIRA' }) }),
    );
    c.subject.typesAndValues.push(
      new pkijs.AttributeTypeAndValue({ type: '2.5.4.5', value: new asn1js.PrintableString({ value: 'BI99999999' }) }),
    );
    // Autoassinado, ou a dizer que vem da EC 0019 sem ter a assinatura dela.
    c.issuer = emissor ?? c.subject;
    c.notBefore.value = new Date('2026-01-01');
    c.notAfter.value = new Date('2030-01-01');
    await c.subjectPublicKeyInfo.importKey(k.publicKey);
    await c.sign(k.privateKey, 'SHA-256');
    return c;
  }

  it.each([
    ['só a EC 0019', () => [ec0019]],
    ['a cadeia inteira (0019, 008, raiz)', () => [ec0019, a008, raiz]],
    ['a cadeia por outra ordem', () => [raiz, ec0019, a008]],
  ])('autoassinado + %s no PDF: recusada logo', async (_n, cadeia) => {
    semRede();
    const atacante = await doAtacante();
    const r = await validateChain(atacante, [atacante, ...cadeia()], em);
    expect(r.trusted).toBe(false);
    expect(shouldRejectUntrustedSignature([r])).toBe(true);
  });

  it('a dizer que vem da EC 0019, sem a assinatura dela, com a cadeia inteira: recusada logo', async () => {
    semRede();
    const forjado = await doAtacante(ec0019.subject);
    const r = await validateChain(forjado, [forjado, ec0019, a008, raiz], em);
    expect(r.trusted).toBe(false);
    expect(shouldRejectUntrustedSignature([r])).toBe(true);
  });
});
