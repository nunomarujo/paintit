import { describe, expect, it } from 'vitest';
import { DIA_NORMAL, conflitosDoDia, dayErrors, diaPorOmissao, formatHoras, presencasEfetivas, resumoDoDia, totalHoras } from './dayLog';

const equipa = [
  { id: 'a', nome: 'João Silva' },
  { id: 'b', nome: 'Rui Costa' },
  { id: 'c', nome: 'Ana Dias' },
];

describe('o dia vem pré-preenchido', () => {
  it('toda a gente com o dia normal — é isso que torna isto dois toques', () => {
    const dia = diaPorOmissao(equipa);
    expect(dia).toHaveLength(3);
    expect(dia.every((p) => p.horas === DIA_NORMAL)).toBe(true);
  });

  it('o dia normal são 8 horas', () => {
    expect(formatHoras(DIA_NORMAL)).toBe('8');
  });
});

describe('o que se guarda', () => {
  it('quem faltou não gera lançamento nenhum', () => {
    const dia = [{ memberId: 'a', horas: 800 }, { memberId: 'b', horas: 0 }];
    expect(presencasEfetivas(dia)).toHaveLength(1);
    expect(totalHoras(dia)).toBe(800);
  });

  it('um dia sem ninguém não é um dia', () => {
    expect(dayErrors([{ memberId: 'a', horas: 0 }], '2026-10-25')).toHaveProperty('horas');
  });

  it('ninguém faz mais de 24 horas', () => {
    expect(dayErrors([{ memberId: 'a', horas: 2500 }], '2026-10-25')).toHaveProperty('horas');
    expect(dayErrors([{ memberId: 'a', horas: 2400 }], '2026-10-25')).toEqual({});
  });

  it('recusa data mal formada', () => {
    expect(dayErrors([{ memberId: 'a', horas: 800 }], '25/10/2026')).toHaveProperty('data');
  });
});

describe('o resumo que ele confirma', () => {
  it('diz o caso normal como ele o diria', () => {
    expect(resumoDoDia(diaPorOmissao(equipa))).toBe('3 pessoas, 8 horas cada.');
  });

  it('uma pessoa só aparece pelo nome', () => {
    expect(resumoDoDia(diaPorOmissao([equipa[0]!]))).toBe('João Silva, 8 horas cada.');
  });

  it('com horas diferentes dá o total, e conta as faltas', () => {
    const dia = [
      { memberId: 'a', nome: 'João Silva', horas: 800 },
      { memberId: 'b', nome: 'Rui Costa', horas: 400 },
      { memberId: 'c', nome: 'Ana Dias', horas: 0 },
    ];
    expect(resumoDoDia(dia)).toBe('2 pessoas, 12 horas no total, 1 falta.');
  });

  it('um dia sem ninguém di-lo', () => {
    expect(resumoDoDia([{ memberId: 'a', nome: 'João', horas: 0 }])).toBe('Ninguém na obra.');
  });
});

describe('o dia de uma pessoa somado em todas as obras', () => {
  const presenca = (horas: number) => [{ memberId: 'f1', pessoaId: 'rui', nome: 'Rui', horas }];

  it('deixa passar um dia repartido, que é legítimo', () => {
    const r = conflitosDoDia(presenca(400), [{ pessoaId: 'rui', obra: 'Obra do Mercado', horas: 400 }]);
    expect(r).toEqual([]);
  });

  it('recusa um dia impossível, dizendo onde estão as outras horas', () => {
    const r = conflitosDoDia(presenca(1_600), [{ pessoaId: 'rui', obra: 'Obra do Mercado', horas: 1_000 }]);
    expect(r[0]!.erro).toContain('26 horas');
    expect(r[0]!.erro).toContain('Obra do Mercado');
  });

  it('avisa de um dia longo sem o impedir', () => {
    const r = conflitosDoDia(presenca(800), [{ pessoaId: 'rui', obra: 'Obra do Mercado', horas: 800 }]);
    expect(r[0]!.aviso).toBeDefined();
    expect(r[0]!.erro).toBeUndefined();
  });

  it('soma as obras todas e nomeia-as', () => {
    const r = conflitosDoDia(presenca(1_000), [
      { pessoaId: 'rui', obra: 'Obra A', horas: 800 },
      { pessoaId: 'rui', obra: 'Obra B', horas: 800 },
    ]);
    expect(r[0]!.erro).toContain('Obra A e Obra B');
  });

  it('vinte e quatro horas certas ainda passam: é o máximo, não o excesso', () => {
    const r = conflitosDoDia(presenca(800), [
      { pessoaId: 'rui', obra: 'Obra A', horas: 800 },
      { pessoaId: 'rui', obra: 'Obra B', horas: 800 },
    ]);
    expect(r[0]!.erro).toBeUndefined();
    expect(r[0]!.aviso).toBeDefined();
  });

  it('não se mete com quem faltou nem com quem não tem pessoa ligada', () => {
    expect(conflitosDoDia(presenca(0), [{ pessoaId: 'rui', obra: 'X', horas: 2_000 }])).toEqual([]);
    expect(conflitosDoDia([{ memberId: 'f1', pessoaId: null, nome: 'Sem ficha', horas: 800 }], [])).toEqual([]);
  });

  it('ignora as horas de outra pessoa', () => {
    expect(conflitosDoDia(presenca(800), [{ pessoaId: 'joao', obra: 'X', horas: 2_000 }])).toEqual([]);
  });
});
