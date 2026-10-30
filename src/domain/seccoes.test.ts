import { describe, expect, it } from 'vitest';
import {
  SECCOES,
  estadosDasSeccoes,
  primeiraPendencia,
  seccaoDoBloqueio,
  type EntradaDasSeccoes,
} from './seccoes';
import { bloqueiosDaPublicacao } from './request';

const e = (o: Partial<EntradaDasSeccoes> = {}): EntradaDasSeccoes => ({
  descricao: 'Pintar as quatro fachadas, com reparação de fissuras.',
  trabalhos: ['pintura'],
  zonas: { total: 2, prontas: 2, pendentes: 0 },
  fotografias: 3,
  prazoPropostas: '2026-11-30',
  bloqueios: [],
  ...e_vazio(o),
});
const e_vazio = (o: Partial<EntradaDasSeccoes>) => o;

describe('as secções do pedido', () => {
  it('são as seis que o promotor listou, por esta ordem', () => {
    expect(SECCOES.map((s) => s.nome)).toEqual([
      'Resumo',
      'O que pretende',
      'Zonas e medidas',
      'Fotografias',
      'Preferências e prazos',
      'Rever e publicar',
    ]);
  });

  it('tudo preenchido e sem bloqueios: tudo revisto', () => {
    const r = estadosDasSeccoes(e());
    expect(Object.values(r).every((x) => x === 'revisto')).toBe(true);
  });

  it('uma secção vazia está por preencher, não em falta', () => {
    expect(estadosDasSeccoes(e({ descricao: '', trabalhos: [] })).pretende).toBe('por_preencher');
    expect(estadosDasSeccoes(e({ zonas: { total: 0, prontas: 0, pendentes: 0 } })).zonas).toBe('por_preencher');
  });

  it('com conteúdo e um bloqueio seu, está em preparação', () => {
    const bloqueios = bloqueiosDaPublicacao({
      descricao: 'Pintar tudo',
      trabalhos: ['pintura'],
      prazoPropostas: '2026-11-30',
      today: '2026-10-30',
      zonas: [],
    });
    const r = estadosDasSeccoes(e({ bloqueios }));
    expect(r.zonas).toBe('em_preparacao');
    // E o bloqueio das zonas não contamina a secção do que se pretende.
    expect(r.pretende).toBe('revisto');
  });

  it('as fotografias nunca são uma falha: sem nenhuma é um convite', () => {
    // «Não apresentar um campo opcional vazio como uma falha» (promotor, 30/10/2026).
    const r = estadosDasSeccoes(e({ fotografias: 0 }));
    expect(r.fotografias).toBe('por_preencher');
    expect(r.fotografias).not.toBe('em_preparacao');
  });

  it('o resumo não se preenche: lê-se', () => {
    expect(estadosDasSeccoes(e({ descricao: '', trabalhos: [], fotografias: 0 })).resumo).toBe('revisto');
  });

  it('«Rever e publicar» fica revisto exactamente quando não falta nada', () => {
    expect(estadosDasSeccoes(e()).publicar).toBe('revisto');
    const bloqueios = bloqueiosDaPublicacao({
      descricao: '',
      trabalhos: [],
      prazoPropostas: null,
      today: '2026-10-30',
      zonas: [],
    });
    expect(estadosDasSeccoes(e({ bloqueios })).publicar).toBe('em_preparacao');
  });
});

describe('cada coisa que falta sabe a que secção pertence', () => {
  // É o que deixa pôr um «Completar» ao lado de cada ponto e levar o cliente ao sítio certo, em vez
  // de o deixar à procura (promotor, 30/10/2026).
  const bloqueios = bloqueiosDaPublicacao({
    descricao: '',
    trabalhos: [],
    prazoPropostas: null,
    today: '2026-10-30',
    zonas: [{ areaCm2: 100, participacao: 'por_decidir', origemDaQuantidade: 'estimativa', confirmacao: 'por_confirmar' }],
  });

  it('as medidas pertencem às zonas', () => {
    const b = bloqueios.find((x) => x.texto.includes('superfície'))!;
    expect(seccaoDoBloqueio(b)).toBe('zonas');
  });

  it('uma zona por decidir também', () => {
    const b = bloqueios.find((x) => x.texto.includes('por decidir'))!;
    expect(seccaoDoBloqueio(b)).toBe('zonas');
  });

  it('o prazo pertence às preferências', () => {
    const b = bloqueios.find((x) => x.texto.includes('aceita propostas'))!;
    expect(seccaoDoBloqueio(b)).toBe('preferencias');
  });

  it('dizer o que se pretende pertence ao que se pretende', () => {
    const b = bloqueios.find((x) => x.texto.includes('Diga o que pretende'))!;
    expect(seccaoDoBloqueio(b)).toBe('pretende');
  });

  it('todos os bloqueios caem numa secção que existe', () => {
    for (const b of bloqueios) {
      expect(SECCOES.map((s) => s.id)).toContain(seccaoDoBloqueio(b));
    }
  });
});

describe('a primeira pendência', () => {
  it('é a primeira secção que não está revista, pela ordem do percurso', () => {
    const estados = estadosDasSeccoes(e({ descricao: '', trabalhos: [], zonas: { total: 0, prontas: 0, pendentes: 0 } }));
    expect(primeiraPendencia(estados)).toBe('pretende');
  });

  it('com tudo revisto, não há para onde mandar ninguém', () => {
    expect(primeiraPendencia(estadosDasSeccoes(e()))).toBeNull();
  });

  it('as fotografias são a última a chamar, por serem opcionais', () => {
    const estados = estadosDasSeccoes(e({ fotografias: 0 }));
    expect(primeiraPendencia(estados)).toBe('fotografias');
  });
});
