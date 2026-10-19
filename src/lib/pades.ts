import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { findSignatures, hexToBytes, signedBytes } from '@/domain/signature';

// Verificação criptográfica da última assinatura de um PDF: a assinatura CMS é
// válida para os bytes cobertos e identifica o signatário pelo certificado.
// A validação da cadeia de confiança (certificado emitido pelo Estado português
// e não revogado) fica para o serviço de validação europeu (DSS) — ver
// docs/PAGAMENTOS_E_ASSINATURA.md.

export interface SignerInfo {
  valid: boolean;
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
  const sigs = findSignatures(pdf);
  const sig = sigs[sigs.length - 1];
  if (!sig) return { valid: false, name: null, serialNumber: null, issuer: null, signedAt: null, reason: 'Sem assinatura.' };
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
    return {
      valid: result.signatureVerified === true,
      name: cert ? attr(cert.subject, OID.CN) : null,
      serialNumber: cert ? attr(cert.subject, OID.SERIAL) : null,
      issuer: cert ? attr(cert.issuer, OID.CN) : null,
      signedAt: time?.toDate ? time.toDate().toISOString() : null,
    };
  } catch (err) {
    return {
      valid: false,
      name: null,
      serialNumber: null,
      issuer: null,
      signedAt: null,
      reason: err instanceof Error ? err.message : 'Assinatura ilegível.',
    };
  }
}
