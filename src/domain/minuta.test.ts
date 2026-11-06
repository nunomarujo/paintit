import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { contractDraft, draftText, type DraftInput } from './contracting';

// O texto da minuta é o que se assina: o PDF é gerado de novo a partir dele e os bytes têm de bater
// (`src/lib/contractPdf.ts`). Uma contratação começada antes da minuta de 06/11/2026 tem de dar
// exatamente o mesmo texto de sempre, ou a parte que assina a seguir assinaria outro documento.
// A impressão digital abaixo foi tirada do código de 05/11/2026 (commit 91d3075), antes de qualquer
// alteração desta versão.

const BASE: DraftInput = {
  ref: 'QP-0001',
  cliente: { nome: 'Condomínio Exemplo', nif: '900000000', morada: 'Rua A, 1, 4900-000 Viana do Castelo' },
  pintor: { nome: 'Pinturas Exemplo, Lda.', nif: '500000000', morada: 'Rua B, 2, 4900-001 Viana do Castelo' },
  obra: { morada: 'Rua A, 1, 4900-000 Viana do Castelo', concelho: 'Viana do Castelo', descricao: 'Pintura das fachadas.' },
  linhas: [{ descricao: 'Pintura de fachada', quantidade: '120 m²', total: '2 400,00 €', inclusao: '' }],
  precoSemIva: '2 400,00 €',
  iva: '552,00 €',
  totalComIva: '2 952,00 €',
  prazo: 'Duração estimada de 10 dias, sujeita às condições meteorológicas.',
  adiantamento: 'Sem adiantamento de adjudicação.',
  ajusteM2: '20,00 €',
  garantiaObra: 'O empreiteiro garante os trabalhos executados durante 2 anos a contar da receção da obra.',
  exclusoes: '',
};

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

describe('minuta: as contratações anteriores a 06/11/2026 não mudam', () => {
  it('sem versão de minuta, o texto é byte a byte o de 05/11/2026', () => {
    expect(sha(draftText(contractDraft(BASE)))).toBe('ba2c38f33b1cfaba777210a564afac7931ba7d4031acb3b807ba0c8adb266711');
  });
});

describe('minuta de 06/11/2026', () => {
  const nova = (extra: Partial<DraftInput> = {}) => draftText(contractDraft({ ...BASE, minuta: '2026-11-06', ...extra }));

  it('os campos novos não mudam o texto antigo, mesmo preenchidos', () => {
    const comTudo = contractDraft({
      ...BASE,
      declarado: ['Caleiras — Apenas limpar.'],
      elementos: { cliente: { iban: null, telefone: '912345678', email: 'a@b.pt' }, pintor: { iban: 'PT50000201231234567890154', telefone: null, email: null } },
    });
    expect(sha(draftText(comTudo))).toBe('ba2c38f33b1cfaba777210a564afac7931ba7d4031acb3b807ba0c8adb266711');
  });

  it('traz o declarado no pedido, os elementos das partes e a cláusula de alteração', () => {
    const t = nova({
      declarado: ['Caleiras — Substituir partes: 6,5 m; estado declarado: ferrugem.'],
      elementos: {
        cliente: { iban: null, telefone: '912345678', email: 'condominio@exemplo.pt' },
        pintor: { iban: 'PT50000201231234567890154', telefone: '934567890', email: null },
      },
    });
    expect(t).toContain('Declarado pelo dono da obra no pedido:');
    expect(t).toContain('Caleiras — Substituir partes: 6,5 m');
    expect(t).toContain('Elementos do dono da obra: telefone 912345678; email para correspondência condominio@exemplo.pt.');
    expect(t).toContain('Elementos do empreiteiro: IBAN PT50 0002 0123 1234 5678 9015 4; telefone 934567890.');
    expect(t).toContain('pagas diretamente ao empreiteiro, por transferência bancária ou depósito para o IBAN PT50 0002 0123 1234 5678 9015 4.');
    expect(t).toContain('4-A. Elementos das partes');
    expect(t).toContain('por adenda a este contrato, aceite por ambas as partes');
    expect(t).toContain('não intervém na alteração destes elementos nem na sua validação');
  });

  it('sem IBAN do cliente, o contrato não inventa um: diz só o do empreiteiro', () => {
    const t = nova({ elementos: { cliente: { iban: null, telefone: null, email: null }, pintor: { iban: 'PT50000201231234567890154', telefone: null, email: null } } });
    expect(t).not.toContain('Elementos do dono da obra');
  });

  it('não fala da comissão da plataforma em lado nenhum (regra 15)', () => {
    expect(nova()).not.toMatch(/comiss/i);
  });
});
