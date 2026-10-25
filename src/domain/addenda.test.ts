import { describe, expect, it } from 'vitest';
import { addendaErrors, addendaPendings, diasAEsperar, totalAceite, totalProposto, type Addenda } from './addenda';

const a = (over: Partial<Addenda> = {}): Addenda => ({
  id: 'a1', descricao: 'Pintura da caixa de escadas, três pisos', valorCents: 32_000,
  estado: 'proposta', criadaEm: '2026-10-10T09:00:00Z', respondidaEm: null, temFotografia: true, ...over,
});

describe('adendas de trabalhos a mais', () => {
  it('exige descrição e preço — é o que o cliente aceita', () => {
    expect(addendaErrors({ descricao: 'escada', valorCents: 1000 })).toHaveProperty('descricao');
    expect(addendaErrors({ descricao: 'Pintura da caixa de escadas', valorCents: 0 })).toHaveProperty('valor');
    expect(addendaErrors({ descricao: 'Pintura da caixa de escadas', valorCents: 32_000 })).toEqual({});
  });

  it('só o que o cliente aceitou acresce ao valor da obra', () => {
    const lista = [a(), a({ id: 'a2', estado: 'aceite', valorCents: 50_000 }), a({ id: 'a3', estado: 'recusada', valorCents: 90_000 })];
    expect(totalAceite(lista)).toBe(50_000);
    expect(totalProposto(lista)).toBe(32_000);
  });

  it('conta os dias à espera do cliente', () => {
    expect(diasAEsperar(a(), '2026-10-17')).toBe(7);
  });

  it('ao fim de uma semana sem resposta, passa a valer a pena relembrar', () => {
    const [seis] = addendaPendings([a()], '2026-10-16');
    expect(seis!.aLembrar).toBe(false);
    const [sete] = addendaPendings([a()], '2026-10-17');
    expect(sete!.aLembrar).toBe(true);
    // A hora do dia não conta: o que conta são dias de calendário.
    expect(addendaPendings([a({ criadaEm: '2026-10-10T23:50:00Z' })], '2026-10-17')[0]!.aLembrar).toBe(true);
  });

  it('as pendências vêm da mais antiga para a mais recente, e só as que esperam resposta', () => {
    const lista = [
      a({ id: 'novo', criadaEm: '2026-10-20T09:00:00Z' }),
      a({ id: 'velho', criadaEm: '2026-10-01T09:00:00Z' }),
      a({ id: 'aceite', estado: 'aceite' }),
    ];
    expect(addendaPendings(lista, '2026-10-25').map((p) => p.id)).toEqual(['velho', 'novo']);
  });
});
