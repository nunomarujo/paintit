import { describe, expect, it } from 'vitest';
import { addendaErrors, oferecidas, totalAceite, totalOferecido, totalProposto, type Addenda } from './addenda';

const a = (estado: Addenda['estado'], valorCents: number): Addenda => ({
  id: estado + valorCents,
  descricao: 'Pintura da caixa de escadas, três pisos',
  valorCents,
  estado,
  criadaEm: '2026-10-28',
  respondidaEm: null,
  temFotografia: false,
});

describe('trabalho a mais oferecido', () => {
  it('sem oferta, o preço é obrigatório e a mensagem diz o que fazer', () => {
    const e = addendaErrors({ descricao: 'Pintura da caixa de escadas', valorCents: 0 });
    expect(e.valor).toContain('ofereço');
  });

  it('com oferta, o preço pode ficar a zero', () => {
    expect(addendaErrors({ descricao: 'Pintura da caixa de escadas', valorCents: 0, oferta: true })).toEqual({});
  });

  it('com oferta, um valor escrito é aceite — fica a dizer quanto se ofereceu', () => {
    expect(addendaErrors({ descricao: 'Pintura da caixa de escadas', valorCents: 10_000, oferta: true })).toEqual({});
  });

  it('nem com oferta se aceita um valor negativo', () => {
    expect(addendaErrors({ descricao: 'Pintura da caixa de escadas', valorCents: -1, oferta: true }).valor).toBeTruthy();
  });

  it('a descrição continua a ser exigida numa oferta', () => {
    expect(addendaErrors({ descricao: 'curto', valorCents: 0, oferta: true }).descricao).toBeTruthy();
  });

  it('o que se ofereceu não acresce ao valor da obra', () => {
    const lista = [a('aceite', 10_000), a('oferecido', 5_000), a('proposta', 3_000)];
    expect(totalAceite(lista)).toBe(10_000);
    expect(totalProposto(lista)).toBe(3_000);
    expect(totalOferecido(lista)).toBe(5_000);
  });

  it('uma oferta não fica à espera de resposta do cliente', () => {
    const lista = [a('oferecido', 5_000)];
    expect(totalProposto(lista)).toBe(0);
    expect(oferecidas(lista)).toHaveLength(1);
  });
});
