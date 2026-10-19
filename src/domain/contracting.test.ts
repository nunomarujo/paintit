import { describe, expect, it } from 'vitest';
import { availableActions, contractDraft, draftText, isRevealed, replay, type EngagementEvent, type EngagementRecord } from './contracting';
import { held } from './engagement';
import { euros } from './money';

const rec: EngagementRecord = {
  id: 'E1',
  base: euros(100_000),
  advance: euros(10_000),
  rulesVersion: '2026-10-18',
  createdAt: '2026-10-19T09:00:00Z',
};
let n = 0;
const ev = (kind: EngagementEvent['kind'], at: string, amount: number | null = null, payload: EngagementEvent['payload'] = {}): EngagementEvent => ({
  id: String(n++),
  kind,
  amount,
  payload,
  at,
});

describe('contratação reconstruída a partir dos acontecimentos', () => {
  it('percurso completo: igual ao exemplo de docs/MODELO.md', () => {
    const events = [
      ev('deposito_confirmado', '2026-10-19T10:00:00Z', euros(13_000)),
      ev('cliente_assinou', '2026-10-20T10:00:00Z'),
      ev('fee_recebido', '2026-10-22T10:00:00Z', euros(3_690)),
      ev('pintor_assinou', '2026-10-23T10:00:00Z'),
    ];
    const r = replay(rec, events, new Date('2026-10-24T00:00:00Z'));
    expect(r.rejected).toEqual([]);
    expect(r.engagement.status).toBe('assinado');
    expect(held(r.engagement)).toEqual({ guarantee: 0, advance: 0, fee: 0 });
    expect(isRevealed(r.engagement)).toBe(true);
  });

  it('a ordem é a das datas, não a de chegada', () => {
    const r = replay(
      rec,
      [ev('cliente_assinou', '2026-10-20T10:00:00Z'), ev('deposito_confirmado', '2026-10-19T10:00:00Z', euros(13_000))],
      new Date('2026-10-20T12:00:00Z'),
    );
    expect(r.engagement.status).toBe('aguarda_fee');
  });

  it('um acontecimento fora de ordem é recusado sem estragar o resto', () => {
    const r = replay(
      rec,
      [ev('pintor_assinou', '2026-10-19T09:30:00Z'), ev('deposito_confirmado', '2026-10-19T10:00:00Z', euros(12_000))],
      new Date('2026-10-19T12:00:00Z'),
    );
    expect(r.rejected.map((x) => x.event.kind)).toEqual(['pintor_assinou', 'deposito_confirmado']);
    expect(r.engagement.status).toBe('aguarda_deposito');
  });

  it('aplica os prazos até agora: sem fee em 8 dias, o cliente pode passar à seguinte', () => {
    const events = [ev('deposito_confirmado', '2026-10-19T10:00:00Z', euros(13_000)), ev('cliente_assinou', '2026-10-20T10:00:00Z')];
    const r = replay(rec, events, new Date('2026-10-29T00:00:00Z'));
    expect(r.engagement.status).toBe('pintor_nao_pagou');
    expect(isRevealed(r.engagement)).toBe(false);
    expect(availableActions(r.engagement, 'cliente')).toEqual(['transitar', 'encerrar_sem_contrato']);
    const t = replay(rec, [...events, ev('transitar', '2026-10-29T10:00:00Z', null, { to: 'E2' })], new Date('2026-10-29T12:00:00Z'));
    expect(t.carriedOut).toEqual({ from: 'E1', guarantee: euros(3_000), advance: euros(10_000) });
    const next = replay({ ...rec, id: 'E2', base: euros(90_000), advance: 0, carried: t.carriedOut }, [], new Date('2026-10-29T12:00:00Z'));
    expect(next.engagement.status).toBe('aguarda_deposito');
  });

  it('ações por lado', () => {
    const r = replay(rec, [], new Date('2026-10-19T12:00:00Z'));
    expect(availableActions(r.engagement, 'plataforma')).toEqual(['deposito_confirmado']);
    expect(availableActions(r.engagement, 'cliente')).toEqual(['cliente_desistiu']);
    expect(availableActions(r.engagement, 'pintor')).toEqual([]);
  });

  it('a minuta não identifica as partes antes da apresentação', () => {
    const d = contractDraft({
      ref: 'AB12CD34',
      cliente: null,
      pintor: null,
      obra: { morada: null, concelho: 'Lisboa', descricao: 'Pintura das fachadas.' },
      linhas: [{ descricao: 'Pintura', quantidade: '161,5 m²', total: '1 372,75 €', inclusao: '' }],
      precoSemIva: '1 372,75 €',
      iva: '315,73 €',
      totalComIva: '1 688,48 €',
      prazo: '20 dias.',
      adiantamento: 'Sem adiantamento.',
      ajusteM2: '8,50 €',
      garantiaObra: '2 anos.',
      exclusoes: '',
    });
    const text = draftText(d);
    expect(text).toMatch(/concelho de Lisboa/);
    expect(text).toMatch(/revelados na apresentação/);
    expect(draftText(d)).toBe(text);
  });
});
