import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contractDraft, type DraftInput } from '@/domain/contracting';
import { contractPdf } from './contractPdf';

// O PDF de um contrato assinado confere-se regenerando-o: os mesmos dados têm de dar os mesmos bytes, para
// sempre. Por isso há duas disposições: a antiga (`v1`, texto simples), que as contratações já criadas continuam
// a usar byte a byte, e a nova (`v2`, desde 07/11/2026), só para as contratações criadas com a minuta de
// 07/11/2026. Mudar a antiga invalida a verificação das assinaturas já feitas.

const entrada: DraftInput = {
  ref: 'AB12CD34',
  cliente: null,
  pintor: null,
  obra: { morada: null, concelho: 'Viana do Castelo', descricao: 'Pintura das fachadas e varandas.' },
  linhas: [{ descricao: 'Pintura — 2 demãos', quantidade: '161,5 m²', total: '1 372,75 €', inclusao: '' }],
  precoSemIva: '1 372,75 €',
  iva: '315,73 €',
  totalComIva: '1 688,48 €',
  prazo: 'Duração de 20 dias.',
  adiantamento: 'Sem adiantamento.',
  ajusteM2: '8,50 €',
  garantiaObra: '2 anos.',
  exclusoes: '',
};
const quando = new Date('2026-10-19T09:00:00Z');
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

describe('PDF do contrato: disposição antiga (v1)', () => {
  it('não muda um byte: as assinaturas já feitas conferem-se contra estes bytes', async () => {
    const pdf = await contractPdf(contractDraft(entrada), quando, 'AB12CD34');
    expect(sha(pdf)).toBe('af664fbee4000ee9b58daaddea459ec6ffed90eb0a3d2b6892038598c0ae1009');
  });
});

describe('PDF do contrato: disposição nova (v2)', () => {
  const draft = () => contractDraft(entrada);

  it('é determinístico: os mesmos dados dão os mesmos bytes', async () => {
    const a = await contractPdf(draft(), quando, 'AB12CD34', 'v2');
    const b = await contractPdf(draft(), quando, 'AB12CD34', 'v2');
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    expect(new TextDecoder('latin1').decode(a.subarray(0, 5))).toBe('%PDF-');
  });

  it('não é a disposição antiga: um dado diferente, bytes diferentes', async () => {
    const v1 = await contractPdf(draft(), quando, 'AB12CD34', 'v1');
    const v2 = await contractPdf(draft(), quando, 'AB12CD34', 'v2');
    expect(sha(v1)).not.toBe(sha(v2));
    const outra = await contractPdf(draft(), quando, 'ZZ99ZZ99', 'v2');
    expect(sha(outra)).not.toBe(sha(v2));
  });

  it('sem layout indicado, usa a disposição antiga', async () => {
    const a = await contractPdf(draft(), quando, 'AB12CD34');
    expect(sha(a)).toBe('af664fbee4000ee9b58daaddea459ec6ffed90eb0a3d2b6892038598c0ae1009');
  });

  it('guarda o PDF para ver (só quando PDF_SAIDA está definida)', async () => {
    if (!process.env.PDF_SAIDA) return;
    const longa = contractDraft({
      ...entrada,
      cliente: { nome: 'Condomínio do Edifício Rua de Altamira, n.º 120', nif: '900000007', morada: 'Rua de Altamira, 120, 4900-000 Viana do Castelo' },
      pintor: { nome: 'Pintura & Acabamentos do Minho, Lda.', nif: '500000000', morada: 'Zona Industrial, Lote 7, 4900-100 Viana do Castelo' },
      linhas: Array.from({ length: 12 }, (_, i) => ({ descricao: `Fachada ${i + 1} — pintura com tinta acrílica, 2 demãos`, quantidade: `${100 + i} m²`, total: `${1000 + i * 37},00 €`, inclusao: i % 3 === 0 ? 'inclui andaimes' : '' })),
      exclusoes: 'Reparação de fissuras estruturais, substituição de caixilharia e limpeza de coberturas.',
    });
    writeFileSync(process.env.PDF_SAIDA, await contractPdf(longa, quando, 'AB12CD34', 'v2'));
    writeFileSync(`${process.env.PDF_SAIDA}.curta.pdf`, await contractPdf(draft(), quando, 'AB12CD34', 'v2'));
  });
});
