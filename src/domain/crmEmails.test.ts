import { describe, expect, it } from 'vitest';
import { sequenciaDeCampanhas } from './crm';
import { TEXTOS_INICIAIS, renderizarEmail } from './crmEmails';

describe('textos das campanhas', () => {
  it('há texto para todas as campanhas de empresas, e nenhuma para particulares', () => {
    for (const t of ['pintor', 'fornecedor', 'administradora'] as const) {
      for (const id of sequenciaDeCampanhas(t)) expect(TEXTOS_INICIAIS[id], id).toBeDefined();
    }
    expect(TEXTOS_INICIAIS['cliente-1']).toBeUndefined();
  });
  it('nunca promete um número de propostas (decisão de 02/11/2026)', () => {
    for (const t of Object.values(TEXTOS_INICIAIS)) expect(`${t.assunto} ${t.corpo}`).not.toMatch(/\b(2|3|duas|três|dois)\s+propostas/i);
  });
  it('só pintores e fornecedores ouvem falar de comissão (regra 15)', () => {
    for (const [id, t] of Object.entries(TEXTOS_INICIAIS)) {
      const fala = /comiss/i.test(t.corpo);
      expect(fala, id).toBe(id.startsWith('pintor') || id.startsWith('fornecedor'));
    }
  });
  it('todos têm o código do contacto', () => {
    for (const t of Object.values(TEXTOS_INICIAIS)) expect(t.corpo).toContain('{codigo}');
  });
});

describe('renderizarEmail', () => {
  const r = renderizarEmail('pintor-1', TEXTOS_INICIAIS['pintor-1']!, { nome: 'Pinturas Lima, Lda.', codigo: 'AB12CD34' });
  it('substitui o nome e o código', () => {
    expect(r.texto).toContain('Bom dia, Pinturas Lima, Lda.');
    expect(r.texto).toContain('AB12CD34');
    expect(r.texto).not.toMatch(/\{(nome|codigo)\}/);
  });
  it('leva o link rastreado, a identificação da empresa e a saída', () => {
    expect(r.html).toContain('/api/crm/c/AB12CD34?e=pintor-1');
    expect(r.texto).toContain('517588676');
    expect(r.linkDeSaida).toBe('https://quempinta.pt/api/crm/sair/AB12CD34');
    expect(r.html).toContain('Não quero receber mais mensagens');
  });
  it('escapa o nome no HTML', () => {
    const x = renderizarEmail('pintor-1', TEXTOS_INICIAIS['pintor-1']!, { nome: '<b>X</b>', codigo: 'AB12CD34' });
    expect(x.html).not.toContain('<b>X</b>');
  });
});
