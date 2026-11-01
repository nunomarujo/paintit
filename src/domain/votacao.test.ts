import { describe, expect, it } from 'vitest';
import { assertPermilagem, contarVotos, resumoDaContagem, VotacaoError } from './votacao';

describe('contarVotos', () => {
  it('conta por proposta e aponta a mais votada', () => {
    const c = contarVotos(
      [
        { fracao: 'A', proposalId: 'p1', permilagem: null },
        { fracao: 'B', proposalId: 'p1', permilagem: null },
        { fracao: 'C', proposalId: 'p2', permilagem: null },
      ],
      ['p1', 'p2', 'p3'],
    );
    expect(c.totalVotos).toBe(3);
    expect(c.porProposta.map((l) => l.votos)).toEqual([2, 1, 0]);
    expect(c.maisVotada).toBe('p1');
    expect(c.maisPermilagem).toBeNull(); // ninguém tem permilagem registada
    expect(c.votantesSemPermilagem).toBe(3);
  });

  it('a permilagem pode inverter o número de votos', () => {
    const c = contarVotos(
      [
        { fracao: 'A', proposalId: 'p1', permilagem: 100 },
        { fracao: 'B', proposalId: 'p1', permilagem: 100 },
        { fracao: 'C', proposalId: 'p2', permilagem: 450 },
      ],
      ['p1', 'p2'],
    );
    expect(c.maisVotada).toBe('p1');
    expect(c.maisPermilagem).toBe('p2');
    expect(c.permilagemVotante).toBe(650);
  });

  it('empate dá null nas duas medidas', () => {
    const c = contarVotos(
      [
        { fracao: 'A', proposalId: 'p1', permilagem: 200 },
        { fracao: 'B', proposalId: 'p2', permilagem: 200 },
      ],
      ['p1', 'p2'],
    );
    expect(c.maisVotada).toBeNull();
    expect(c.maisPermilagem).toBeNull();
  });

  it('sem votos não há vencedor', () => {
    const c = contarVotos([], ['p1']);
    expect(c.maisVotada).toBeNull();
    expect(c.totalVotos).toBe(0);
  });

  it('permilagem parcial fica assinalada por proposta', () => {
    const c = contarVotos(
      [
        { fracao: 'A', proposalId: 'p1', permilagem: 300 },
        { fracao: 'B', proposalId: 'p1', permilagem: null },
      ],
      ['p1'],
    );
    expect(c.porProposta[0]).toMatchObject({ votos: 2, permilagem: 300, semPermilagem: 1 });
    expect(resumoDaContagem(c.porProposta[0]!, true)).toBe('2 votos · 300‰ (1 sem permilagem)');
    expect(resumoDaContagem(c.porProposta[0]!, false)).toBe('2 votos');
  });

  it('recusa a mesma fração duas vezes', () => {
    expect(() =>
      contarVotos(
        [
          { fracao: 'A', proposalId: 'p1', permilagem: null },
          { fracao: 'A', proposalId: 'p2', permilagem: null },
        ],
        ['p1', 'p2'],
      ),
    ).toThrow(VotacaoError);
  });

  it('permilagem é inteiro entre 1 e 1000', () => {
    expect(assertPermilagem(1000)).toBe(1000);
    expect(() => assertPermilagem(0)).toThrow(VotacaoError);
    expect(() => assertPermilagem(12.5)).toThrow(VotacaoError);
    expect(() => assertPermilagem(1001)).toThrow(VotacaoError);
  });
});
