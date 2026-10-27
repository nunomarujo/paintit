import { describe, expect, it } from 'vitest';
import { JANELA_ABRIU_NOTICE, JANELA_ACABA_NOTICE, NEW_PROPOSAL_NOTICE, NEW_REQUEST_NOTICE, engagementNotices } from './notifications';

describe('avisos por email', () => {
  it('sem mudança de estado não há aviso', () => {
    expect(engagementNotices('aguarda_fee', 'aguarda_fee', 8)).toEqual([]);
  });
  it('o pintor é avisado de que foi escolhido, com o prazo da comissão', () => {
    const n = engagementNotices('aguarda_deposito', 'aguarda_fee', 8);
    expect(n).toHaveLength(1);
    expect(n[0]!.to).toBe('pintor');
    expect(n[0]!.lines.join(' ')).toContain('8 dias');
  });
  it('a assinatura de cada parte avisa a outra', () => {
    expect(engagementNotices('aguarda_assinatura_cliente', 'aguarda_assinatura_pintor', 8).map((x) => x.to)).toEqual(['pintor']);
    expect(engagementNotices('aguarda_fee', 'aguarda_assinatura_cliente', 8).map((x) => x.to)).toEqual(['cliente']);
  });
  it('o fim do contrato avisa as duas partes', () => {
    expect(engagementNotices('aguarda_assinatura_pintor', 'assinado', 8).map((x) => x.to).sort()).toEqual(['cliente', 'pintor']);
  });
  it('os avisos não identificam a outra parte', () => {
    const all = (['aguarda_fee', 'aguarda_assinatura_pintor', 'cliente_desistiu', 'pintor_nao_pagou'] as const).flatMap((s) =>
      engagementNotices('aguarda_deposito', s, 8),
    );
    for (const n of all) expect(n.lines.join(' ')).not.toMatch(/@|\d{9}|rua /i);
  });
  it('o litígio resolvido avisa as duas partes, com o lado que ganha e o que perde', () => {
    const culpaCliente = engagementNotices('em_litigio', 'litigio_culpa_cliente', 8);
    expect(culpaCliente.map((n) => n.to).sort()).toEqual(['cliente', 'pintor']);
    expect(culpaCliente.find((n) => n.to === 'cliente')!.lines.join(' ')).toMatch(/retida/);
    expect(culpaCliente.find((n) => n.to === 'pintor')!.lines.join(' ')).toMatch(/devolvida/);
    const culpaPintor = engagementNotices('em_litigio', 'litigio_culpa_pintor', 8);
    expect(culpaPintor.find((n) => n.to === 'cliente')!.lines.join(' ')).toMatch(/devolvida/);
    expect(culpaPintor.find((n) => n.to === 'pintor')!.lines.join(' ')).toMatch(/retida/);
  });
  it('o litígio repartido avisa as duas partes, sem dizer quem "ganhou"', () => {
    const repartido = engagementNotices('em_litigio', 'litigio_repartido', 8);
    expect(repartido.map((n) => n.to).sort()).toEqual(['cliente', 'pintor']);
    expect(repartido.every((n) => /repartid/.test(n.lines.join(' ')))).toBe(true);
  });
  it('nova proposta não identifica a empresa', () => {
    expect(NEW_PROPOSAL_NOTICE('Fachadas 2027').lines.join(' ')).toContain('Fachadas 2027');
  });
});

describe('convite aos pintores', () => {
  const n = NEW_REQUEST_NOTICE({ concelho: 'Viana do Castelo', tipoObra: 'Fachadas e varandas', prazo: '28/10/2026' });
  it('tem o assunto pedido', () => {
    expect(n.subject).toBe('Pedido de Orçamento - pintura em Viana do Castelo');
  });
  it('só diz o que o anúncio anónimo mostra e nunca fala em comissão', () => {
    const text = n.lines.join(' ');
    expect(text).toMatch(/Viana do Castelo/);
    expect(text).toMatch(/28\/10\/2026/);
    expect(text).not.toMatch(/comiss|rua |nif/i);
  });
});

describe('avisos da janela de esclarecimentos', () => {
  it('fala em datas, nunca em "hoje" ou "amanhã"', () => {
    const avisos = [
      JANELA_ABRIU_NOTICE({ titulo: 'Rua A', ate: '13/11/2026', para: 'cliente' }),
      JANELA_ABRIU_NOTICE({ titulo: 'Rua A', ate: '13/11/2026', para: 'pintor' }),
      JANELA_ACABA_NOTICE({ titulo: 'Rua A', ate: '13/11/2026' }),
    ];
    for (const a of avisos) {
      const texto = [a.subject, ...a.lines].join(' ').toLowerCase();
      expect(texto).not.toMatch(/\bhoje\b|\bamanhã\b/);
      expect(texto).toContain('13/11/2026');
    }
  });

  it('ao cliente diz que pode perguntar; ao pintor diz que lhe podem perguntar', () => {
    expect(JANELA_ABRIU_NOTICE({ titulo: 'Rua A', ate: '13/11/2026', para: 'cliente' }).lines.join(' ')).toContain('pode perguntar');
    expect(JANELA_ABRIU_NOTICE({ titulo: 'Rua A', ate: '13/11/2026', para: 'pintor' }).lines.join(' ')).toContain('pode fazer perguntas');
  });

  it('nenhum aviso conta quantas propostas há', () => {
    const t = JANELA_ABRIU_NOTICE({ titulo: 'Rua A', ate: '13/11/2026', para: 'cliente' });
    expect([t.subject, ...t.lines].join(' ')).not.toMatch(/\d+ propostas/);
  });
});
