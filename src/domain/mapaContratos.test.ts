import { describe, expect, it } from 'vitest';
import {
  chaveDe,
  convidadosDoMapa,
  entidadesDoMapa,
  presencaDaEmpresa,
  resumoDoMapa,
  type LinhaDoMapa,
} from './mapaContratos';

const base: LinhaDoMapa = {
  idContrato: '1',
  ano: 2026,
  objecto: 'Pintura de fachada',
  entidadeNif: '500051062',
  entidadeNome: 'Município de Sintra',
  porConvite: true,
  precoCents: 10_000_00,
  distrito: 'Lisboa',
  concelho: 'Sintra',
  dataCelebracao: '2026-03-01',
  adjudicatarioNif: '501111111',
  adjudicatarioNome: 'Pintores A, Lda',
  convidados: [{ nif: '501111111', nome: 'Pintores A, Lda' }],
};

const linha = (p: Partial<LinhaDoMapa>): LinhaDoMapa => ({ ...base, ...p });

describe('entidadesDoMapa', () => {
  it('ordena por frequência, não por valor', () => {
    // Uma junta com uma obra grande não vale mais, ao pintor, do que uma câmara que contrata sempre.
    const r = entidadesDoMapa([
      linha({ idContrato: 'a', entidadeNif: '1', entidadeNome: 'Junta', precoCents: 500_000_00 }),
      linha({ idContrato: 'b', entidadeNif: '2', entidadeNome: 'Câmara', precoCents: 10_000_00 }),
      linha({ idContrato: 'c', entidadeNif: '2', entidadeNome: 'Câmara', precoCents: 20_000_00 }),
    ]);
    expect(r.map((e) => e.nome)).toEqual(['Câmara', 'Junta']);
  });

  it('a mediana diz o que a entidade costuma pagar, a média não', () => {
    const r = entidadesDoMapa([
      linha({ idContrato: 'a', precoCents: 5_000_00 }),
      linha({ idContrato: 'b', precoCents: 6_000_00 }),
      linha({ idContrato: 'c', precoCents: 900_000_00 }),
    ]);
    expect(r[0]!.medianaCents).toBe(6_000_00);
    expect(r[0]!.totalCents).toBe(911_000_00);
  });

  it('com número par de contratos a mediana é o meio dos dois do meio', () => {
    const r = entidadesDoMapa([
      linha({ idContrato: 'a', precoCents: 1_000_00 }),
      linha({ idContrato: 'b', precoCents: 2_000_00 }),
      linha({ idContrato: 'c', precoCents: 3_000_00 }),
      linha({ idContrato: 'd', precoCents: 6_000_00 }),
    ]);
    expect(r[0]!.medianaCents).toBe(2_500_00);
  });

  it('separa o convite sem lista publicada do convite a várias empresas', () => {
    // Sem esta distinção, um `conviteUnico` baixo lê-se como abertura da entidade quando pode ser
    // apenas falta de dados: em 2026 faltava a lista em 113 dos 326 convites.
    const r = entidadesDoMapa([
      linha({ idContrato: 'a', convidados: [{ nif: '1', nome: 'A' }] }),
      linha({ idContrato: 'b', convidados: [] }),
      linha({ idContrato: 'c', convidados: [{ nif: '1', nome: 'A' }, { nif: '2', nome: 'B' }] }),
    ]);
    expect(r[0]).toMatchObject({ porConvite: 3, conviteUnico: 1, semLista: 1 });
  });

  it('agrupa pelo nome quando a entidade vem sem NIF', () => {
    const r = entidadesDoMapa([
      linha({ idContrato: 'a', entidadeNif: null, entidadeNome: 'Misericórdia de Elvas' }),
      linha({ idContrato: 'b', entidadeNif: null, entidadeNome: 'misericórdia de elvas ' }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]!.contratos).toBe(2);
  });

  it('guarda a data do contrato mais recente e os concelhos sem repetir', () => {
    const r = entidadesDoMapa([
      linha({ idContrato: 'a', dataCelebracao: '2026-01-10', concelho: 'Sintra' }),
      linha({ idContrato: 'b', dataCelebracao: '2026-07-02', concelho: 'Sintra' }),
      linha({ idContrato: 'c', dataCelebracao: null, concelho: 'Mafra' }),
    ]);
    expect(r[0]!.ultimo).toBe('2026-07-02');
    expect(r[0]!.concelhos).toEqual(['Mafra', 'Sintra']);
  });
});

describe('convidadosDoMapa', () => {
  it('conta convites e, desses, os que ganhou', () => {
    const r = convidadosDoMapa([
      linha({
        idContrato: 'a',
        adjudicatarioNif: '501111111',
        adjudicatarioNome: 'Pintores A, Lda',
        convidados: [
          { nif: '501111111', nome: 'Pintores A, Lda' },
          { nif: '502222222', nome: 'Pintores B, Lda' },
        ],
      }),
      linha({
        idContrato: 'b',
        adjudicatarioNif: '502222222',
        adjudicatarioNome: 'Pintores B, Lda',
        convidados: [
          { nif: '501111111', nome: 'Pintores A, Lda' },
          { nif: '502222222', nome: 'Pintores B, Lda' },
        ],
      }),
    ]);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ convites: 2, ganhos: 1 });
    expect(r[1]).toMatchObject({ convites: 2, ganhos: 1 });
  });

  it('não conta como ganho quem não foi o adjudicatário', () => {
    const r = convidadosDoMapa([
      linha({
        idContrato: 'a',
        adjudicatarioNif: '509999999',
        adjudicatarioNome: 'Outra, Lda',
        convidados: [{ nif: '501111111', nome: 'Pintores A, Lda' }],
      }),
    ]);
    expect(r[0]).toMatchObject({ convites: 1, ganhos: 0 });
  });

  it('ignora convidados sem nome nem NIF', () => {
    const r = convidadosDoMapa([linha({ idContrato: 'a', convidados: [{ nif: null, nome: '  ' }] })]);
    expect(r).toHaveLength(0);
  });
});

describe('presencaDaEmpresa', () => {
  const linhas = [
    linha({
      idContrato: 'a',
      entidadeNome: 'Município de Sintra',
      adjudicatarioNif: '501111111',
      convidados: [{ nif: '501111111', nome: 'Eu, Lda' }, { nif: '502222222', nome: 'Outro' }],
    }),
    linha({
      idContrato: 'b',
      entidadeNome: 'Junta de Agualva',
      adjudicatarioNif: '502222222',
      convidados: [{ nif: '501111111', nome: 'Eu, Lda' }],
    }),
    linha({ idContrato: 'c', convidados: [{ nif: '502222222', nome: 'Outro' }] }),
  ];

  it('conta os convites recebidos e as obras ganhas, e diz quem convidou', () => {
    expect(presencaDaEmpresa(linhas, '501111111')).toEqual({
      convites: 2,
      ganhos: 1,
      entidades: ['Junta de Agualva', 'Município de Sintra'],
    });
  });

  it('sem NIF não procura: comparar nomes de empresa daria falsos positivos', () => {
    expect(presencaDaEmpresa(linhas, null)).toEqual({ convites: 0, ganhos: 0, entidades: [] });
  });
});

describe('resumoDoMapa', () => {
  it('conta entidades distintas e os convites sem lista', () => {
    expect(
      resumoDoMapa([
        linha({ idContrato: 'a', ano: 2025, convidados: [] }),
        linha({ idContrato: 'b', ano: 2026, entidadeNif: '2', entidadeNome: 'Outra' }),
        linha({ idContrato: 'c', ano: 2026, porConvite: false, convidados: [] }),
      ]),
    ).toEqual({ contratos: 3, totalCents: 30_000_00, entidades: 2, porConvite: 2, semLista: 1, anos: [2025, 2026] });
  });

  it('não rebenta com nenhuma linha', () => {
    expect(resumoDoMapa([])).toMatchObject({ contratos: 0, totalCents: 0, entidades: 0, anos: [] });
  });
});

describe('chaveDe', () => {
  it('prefere o NIF e, sem ele, normaliza o nome', () => {
    expect(chaveDe('500051062', 'Município de Sintra')).toBe('500051062');
    expect(chaveDe(null, '  Município de Sintra ')).toBe('município de sintra');
  });
});
