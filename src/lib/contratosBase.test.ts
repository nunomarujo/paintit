import { describe, expect, it } from 'vitest';
import { semRepetidos } from '@/lib/contratosBase';
import type { LinhaDeContrato } from '@/lib/contratosBase';

const linha = (id: string, preco: number): LinhaDeContrato => ({
  id_contrato: id,
  ano: 2026,
  objecto: 'Pintura',
  entidade_nif: '500051062',
  entidade_nome: 'Município',
  procedimento: 'Ajuste Direto Regime Geral',
  por_convite: true,
  preco_cents: preco,
  distrito: 'Lisboa',
  concelho: 'Sintra',
  data_celebracao: '2026-03-01',
  adjudicatario_nif: null,
  adjudicatario_nome: null,
  convidados: [],
  n_convidados: 0,
  cpv: [],
  via: 'objecto',
  confianca: 'alta',
});

describe('semRepetidos', () => {
  it('fica com a última versão de um contrato repetido', () => {
    // Quatro dos 482 contratos de 2026 vinham duas vezes no ficheiro do portal, e no mesmo lote: a
    // gravação inteira era recusada, e o ano ficava a zero.
    const r = semRepetidos([linha('14609686', 100), linha('99999999', 200), linha('14609686', 300)]);
    expect(r).toHaveLength(2);
    expect(r.find((l) => l.id_contrato === '14609686')!.preco_cents).toBe(300);
  });

  it('não mexe num lote sem repetições', () => {
    const lote = [linha('a', 1), linha('b', 2), linha('c', 3)];
    expect(semRepetidos(lote).map((l) => l.id_contrato)).toEqual(['a', 'b', 'c']);
  });

  it('aguenta um lote vazio', () => {
    expect(semRepetidos([])).toEqual([]);
  });
});
