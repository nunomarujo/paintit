import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { findSignatures, hexToBytes, signedBytes } from '@/domain/signature';
import { PT_CC_ANCHORS } from './trust/anchors';

// Verificação criptográfica da última assinatura de um PDF: a assinatura CMS é
// válida para os bytes cobertos, identifica o signatário pelo certificado e
// confirma que o certificado encadeia numa entidade "Cartão de Cidadão" do
// Estado (src/lib/trust/anchors.ts). A revogação é consultada por OCSP (abaixo);
// sem resposta confiável (responder em baixo, sem rede, sem URL no certificado)
// falha aberto — como o resto desta verificação (ver `fetchIssuer`) — porque um
// responder indisponível não é prova de nada; só uma resposta "revogado",
// assinada por quem tem autoridade para a dar, bloqueia a confiança.

export interface SignerInfo {
  valid: boolean;
  /** O certificado do signatário encadeia numa entidade "Cartão de Cidadão" do Estado (CC ou CMD). */
  trusted: boolean;
  trustReason?: string;
  /** `true` só quando `trusted: false` ficou por uma falha de rede a completar a cadeia, nunca quando foi
   * mesmo avaliada e recusada — ver `validateChain` e `shouldRejectUntrustedSignature`
   * (`src/domain/signature.ts`). */
  indeterminate?: boolean;
  /** Nome do titular (CN do certificado). */
  name: string | null;
  /** Número de série do titular (no Cartão de Cidadão / CMD: identificação civil). */
  serialNumber: string | null;
  issuer: string | null;
  signedAt: string | null;
  reason?: string;
}

const OID = { CN: '2.5.4.3', SERIAL: '2.5.4.5', SIGNING_TIME: '1.2.840.113549.1.9.5' };

const attr = (name: pkijs.RelativeDistinguishedNames, oid: string) =>
  (name.typesAndValues.find((t) => t.type === oid)?.value.valueBlock as { value?: string } | undefined)?.value ?? null;

export async function verifyLastSignature(pdf: Uint8Array): Promise<SignerInfo> {
  return verifySignature(pdf, findSignatures(pdf).length - 1);
}

/** Verifica a assinatura n.º `index` (pela ordem no ficheiro). */
export async function verifySignature(pdf: Uint8Array, index: number): Promise<SignerInfo> {
  const sigs = findSignatures(pdf);
  const sig = sigs[index];
  if (!sig) return { valid: false, trusted: false, name: null, serialNumber: null, issuer: null, signedAt: null, reason: 'Sem assinatura.' };
  try {
    const der = hexToBytes(sig.contentsHex);
    const asn = asn1js.fromBER(der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength) as ArrayBuffer);
    if (asn.offset === -1) throw new Error('CMS inválido');
    const content = new pkijs.ContentInfo({ schema: asn.result });
    const signed = new pkijs.SignedData({ schema: content.content });
    const data = signedBytes(pdf, sig);
    const result = await signed.verify({
      signer: 0,
      data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
      extendedMode: true,
      checkChain: false,
    });
    const cert = result.signerCertificate;
    const time = signed.signerInfos[0]?.signedAttrs?.attributes.find((a) => a.type === OID.SIGNING_TIME)?.values[0] as
      | { toDate?: () => Date }
      | undefined;
    const chain = cert ? await validateChain(cert, (signed.certificates ?? []).filter((c): c is pkijs.Certificate => c instanceof pkijs.Certificate), time?.toDate?.()) : { trusted: false, reason: 'Sem certificado.' };
    return {
      valid: result.signatureVerified === true,
      trusted: chain.trusted,
      trustReason: chain.reason,
      indeterminate: chain.indeterminate,
      name: cert ? attr(cert.subject, OID.CN) : null,
      serialNumber: cert ? attr(cert.subject, OID.SERIAL) : null,
      issuer: cert ? attr(cert.issuer, OID.CN) : null,
      signedAt: time?.toDate ? time.toDate().toISOString() : null,
    };
  } catch (err) {
    return {
      valid: false,
      trusted: false,
      name: null,
      serialNumber: null,
      issuer: null,
      signedAt: null,
      reason: err instanceof Error ? err.message : 'Assinatura ilegível.',
    };
  }
}

const parseCert = (der: Uint8Array) => {
  const asn = asn1js.fromBER(der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength) as ArrayBuffer);
  return new pkijs.Certificate({ schema: asn.result });
};
const ANCHORS = PT_CC_ANCHORS.map((a) => parseCert(Uint8Array.from(Buffer.from(a.der, 'base64'))));
const AIA = '1.3.6.1.5.5.7.1.1';
const CA_ISSUERS = '1.3.6.1.5.5.7.48.2';
const OCSP_METHOD = '1.3.6.1.5.5.7.48.1';

const aiaUrl = (cert: pkijs.Certificate, accessMethod: string): string | undefined => {
  const ext = cert.extensions?.find((e) => e.extnID === AIA)?.parsedValue as pkijs.InfoAccess | undefined;
  const url = ext?.accessDescriptions.find((d) => d.accessMethod === accessMethod)?.accessLocation.value as string | undefined;
  return url && /^https?:\/\//.test(url) ? url : undefined;
};

/** Certificado do emissor indicado no próprio certificado (Authority Information Access), se a cadeia não
 * vier no PDF. `networkError: true` distingue uma falha a obter esse certificado (sem rede, sem resposta a
 * tempo, resposta malformada) de simplesmente não haver nenhum AIA a seguir — só a primeira deixa a cadeia
 * "indeterminada" em vez de recusada (ver `validateChain` e a decisão de 24/10/2026 sobre "recusar logo",
 * item 12 do `docs/DECISOES.md`): sem esta distinção, uma falha de rede transitória a buscar este
 * certificado ficava indistinguível de a cadeia ser mesmo inválida. */
async function fetchIssuer(cert: pkijs.Certificate): Promise<{ cert: pkijs.Certificate | null; networkError: boolean }> {
  const url = aiaUrl(cert, CA_ISSUERS);
  if (!url) return { cert: null, networkError: false };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { cert: null, networkError: true };
    return { cert: parseCert(new Uint8Array(await res.arrayBuffer())), networkError: false };
  } catch {
    return { cert: null, networkError: true };
  }
}

/**
 * Estado de revogação pelo OCSP (RFC 6960): `true` só quando um responder com autoridade confirma, com
 * assinatura válida, que o certificado está revogado. `null` sempre que a pergunta não pôde ser feita ou
 * confirmada (sem URL no certificado, sem rede, resposta malformada ou assinada por quem não tem autoridade) —
 * nunca `false` por omissão nesses casos, para nunca ler "sem resposta" como "confirmado como válido".
 */
async function checkRevocation(
  cert: pkijs.Certificate,
  issuer: pkijs.Certificate | undefined,
  anchors: pkijs.Certificate[],
  pool: pkijs.Certificate[],
): Promise<boolean | null> {
  const url = aiaUrl(cert, OCSP_METHOD);
  if (!url || !issuer) return null;
  try {
    const request = new pkijs.OCSPRequest();
    await request.createForCertificate(cert, { issuerCertificate: issuer, hashAlgorithm: 'SHA-1' });
    const body = request.toSchema(true).toBER(false);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/ocsp-request' },
      body: new Uint8Array(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    // `fromBER` (herdado de PkiObject) aceita a vista (Uint8Array) tal como vem, sem o corte manual ao próprio
    // intervalo que uma conversão para ArrayBuffer por `.buffer` exigiria (e que, feito mal, lia bytes de fora
    // de si — passava sempre como "inconclusivo" em vez de recusar, escondendo qualquer resposta real).
    const ocspResponse = pkijs.OCSPResponse.fromBER(new Uint8Array(await res.arrayBuffer()));
    if (ocspResponse.responseStatus.valueBlock.valueDec !== 0 || !ocspResponse.responseBytes) return null;
    const basic = pkijs.BasicOCSPResponse.fromBER(new Uint8Array(ocspResponse.responseBytes.response.valueBlock.valueHexView));
    // Um responder pode legitimamente não incluir o seu próprio certificado na resposta (RFC 6960), contando
    // com o cliente já o conhecer — sem isto, `verify()` recusa-se já à partida ("No certificates attached"),
    // antes de chegar a examinar quem assinou, tratando esse caso como sempre inconclusivo.
    if (!basic.certs || basic.certs.length === 0) basic.certs = [issuer, ...anchors];
    const signedByAuthority = await basic.verify({ trustedCerts: anchors, issuerCerts: [issuer, ...pool, ...anchors] });
    if (!signedByAuthority) return null;
    const status = await basic.getCertificateStatus(cert, issuer);
    if (!status.isForCertificate) return null;
    return status.status === 1;
  } catch {
    return null;
  }
}

/**
 * `indeterminate: true` (decisão de 24/10/2026, item 12 do `docs/DECISOES.md`): a cadeia não chegou a ser
 * avaliada e recusada de facto — ficou por completar só porque uma falha de rede impediu obter um
 * certificado do emissor por AIA (`fetchIssuer`). Quem chama decide o que fazer com isto
 * (`shouldRejectUntrustedSignature`, `src/domain/signature.ts`): nunca se recusa uma assinatura só por
 * `indeterminate`, porque a cadeia podia muito bem ser válida — só se recusa quando a cadeia foi mesmo
 * avaliada e recusada (`indeterminate` ausente/`false`).
 */
export async function validateChain(
  cert: pkijs.Certificate,
  included: pkijs.Certificate[],
  at?: Date,
  anchors: pkijs.Certificate[] = ANCHORS,
): Promise<{ trusted: boolean; reason?: string; indeterminate?: boolean }> {
  const pool = [...included];
  let indeterminate = false;
  // Completa a cadeia pelo AIA, no máximo três níveis.
  let current = cert;
  for (let i = 0; i < 4; i++) {
    if (anchors.some((c) => c.subject.isEqual(current.issuer))) break;
    const found = pool.find((c) => c.subject.isEqual(current.issuer));
    if (found) {
      current = found;
      continue;
    }
    const { cert: next, networkError } = await fetchIssuer(current);
    if (networkError) indeterminate = true;
    if (!next) break;
    if (!pool.includes(next)) pool.push(next);
    current = next;
  }
  try {
    const engine = new pkijs.CertificateChainValidationEngine({
      trustedCerts: anchors,
      certs: [cert, ...pool.filter((c) => c !== cert)],
      checkDate: at ?? new Date(),
    });
    const r = await engine.verify();
    if (!r.result) {
      return { trusted: false, reason: r.resultMessage || 'Cadeia de certificados não confiável.', indeterminate: indeterminate || undefined };
    }
    const issuer = [...pool, ...anchors].find((c) => c.subject.isEqual(cert.issuer));
    const revoked = await checkRevocation(cert, issuer, anchors, pool);
    return revoked ? { trusted: false, reason: 'Certificado revogado.' } : { trusted: true };
  } catch (err) {
    return {
      trusted: false,
      reason: err instanceof Error ? err.message : 'Cadeia de certificados não confiável.',
      indeterminate: indeterminate || undefined,
    };
  }
}
