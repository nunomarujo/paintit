import { describe, expect, it } from 'vitest';
import { DIA_NORMAL, dayErrors, diaPorOmissao, formatHoras, presencasEfetivas, resumoDoDia, totalHoras } from './dayLog';

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
