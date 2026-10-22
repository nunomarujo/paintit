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

/** Certificado do emissor indicado no próprio certificado (Authority Information Access), se a cadeia não vier no PDF. */
async function fetchIssuer(cert: pkijs.Certificate): Promise<pkijs.Certificate | null> {
  const url = aiaUrl(cert, CA_ISSUERS);
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return parseCert(new Uint8Array(await res.arrayBuffer()));
  } catch {
    return null;
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
    const respAsn = asn1js.fromBER(await res.arrayBuffer());
    if (respAsn.offset === -1) return null;
    const ocspResponse = new pkijs.OCSPResponse({ schema: respAsn.result });
    if (ocspResponse.responseStatus.valueBlock.valueDec !== 0 || !ocspResponse.responseBytes) return null;
    // O conteúdo (OCTET STRING) é uma vista sobre o ArrayBuffer completo da resposta: sem cortar ao seu próprio
    // intervalo, o BasicOCSPResponse lia bytes de fora de si — passava silenciosamente como "inconclusivo" em vez
    // de recusar, o que teria escondido qualquer resposta real (boa ou revogada) por detrás do mesmo resultado.
    const octet = ocspResponse.responseBytes.response.valueBlock.valueHexView;
    const basicAsn = asn1js.fromBER(octet.buffer.slice(octet.byteOffset, octet.byteOffset + octet.byteLength) as ArrayBuffer);
    if (basicAsn.offset === -1) return null;
    const basic = new pkijs.BasicOCSPResponse({ schema: basicAsn.result });
    const signedByAuthority = await basic.verify({ trustedCerts: anchors, issuerCerts: [issuer, ...pool, ...anchors] });
    if (!signedByAuthority) return null;
    const status = await basic.getCertificateStatus(cert, issuer);
    if (!status.isForCertificate) return null;
    return status.status === 1;
  } catch {
    return null;
  }
}

export async function validateChain(
  cert: pkijs.Certificate,
  included: pkijs.Certificate[],
  at?: Date,
  anchors: pkijs.Certificate[] = ANCHORS,
): Promise<{ trusted: boolean; reason?: string }> {
  const pool = [...included];
  // Completa a cadeia pelo AIA, no máximo três níveis.
  let current = cert;
  for (let i = 0; i < 4; i++) {
    if (anchors.some((c) => c.subject.isEqual(current.issuer))) break;
    const next = pool.find((c) => c.subject.isEqual(current.issuer)) ?? (await fetchIssuer(current));
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
    if (!r.result) return { trusted: false, reason: r.resultMessage || 'Cadeia de certificados não confiável.' };
    const issuer = [...pool, ...anchors].find((c) => c.subject.isEqual(cert.issuer));
    const revoked = await checkRevocation(cert, issuer, anchors, pool);
    return revoked ? { trusted: false, reason: 'Certificado revogado.' } : { trusted: true };
  } catch (err) {
    return { trusted: false, reason: err instanceof Error ? err.message : 'Cadeia de certificados não confiável.' };
  }
}
