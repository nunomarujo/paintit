import { describe, expect, it } from 'vitest';
import { obrigacaoEmCurso, type TentativaParaLista } from './levantamentoNaLista';

const base: TentativaParaLista = {
  estado: 'ativa',
  prazo_contacto: '2026-11-02T10:25:00Z',
  prazo_conclusao: '2026-11-04T10:25:00Z',
  adiado_para: null,
  contacto_registado_em: null,
  agendado_para: null,
  resposta_cliente: null,
};

describe('obrigacaoEmCurso', () => {
  it('sem chamada registada, o prazo é o da primeira hora útil', () => {
    const o = obrigacaoEmCurso(base);
    expect(o.estado).toBe('por_contactar');
    expect(o.prazo).toBe(base.prazo_contacto);
    expect(o.prazoUtil).toBe(true);
  });

  it('contactado e sem resposta da cliente, o prazo das 48 horas continua a correr', () => {
    const o = obrigacaoEmCurso({ ...base, contacto_registado_em: '2026-11-02T09:40:00Z' });
    expect(o.estado).toBe('aguarda_cliente');
    expect(o.prazo).toBe(base.prazo_conclusao);
    expect(o.prazoUtil).toBe(false);
  });

  it('confirmado pela cliente, mostra o prazo e a visita', () => {
    const o = obrigacaoEmCurso({
      ...base,
      contacto_registado_em: '2026-11-02T09:40:00Z',
      resposta_cliente: 'agendado_48h',
      agendado_para: '2026-11-03T14:00:00Z',
    });
    expect(o.estado).toBe('agendado');
    expect(o.agendadoPara).toBe('2026-11-03T14:00:00Z');
  });

  it('adiado, o prazo que vale é a nova data e não as 48 horas originais', () => {
    const o = obrigacaoEmCurso({
      ...base,
      contacto_registado_em: '2026-11-02T09:40:00Z',
      resposta_cliente: 'adiado',
      adiado_para: '2026-11-10T10:25:00Z',
    });
    expect(o.prazo).toBe('2026-11-10T10:25:00Z');
  });

  it('«não fui contactada» não é confirmação: continua a aguardar e o prazo corre', () => {
    const o = obrigacaoEmCurso({
      ...base,
      contacto_registado_em: '2026-11-02T09:40:00Z',
      resposta_cliente: 'nao_contactado',
    });
    expect(o.estado).toBe('aguarda_cliente');
    expect(o.prazo).toBe(base.prazo_conclusao);
  });

  it('terminados não têm prazo a correr', () => {
    for (const estado of ['concluida', 'em_revisao'] as const) {
      expect(obrigacaoEmCurso({ ...base, estado }).prazo).toBeNull();
    }
  });
});
