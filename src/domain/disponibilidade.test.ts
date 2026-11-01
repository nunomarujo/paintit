import { describe, expect, it } from 'vitest';
import { diaDeLisboa, faltaParaVoltar, suspensaoEmCurso } from './disponibilidade';

describe('a suspensão de presença', () => {
  const agora = new Date(Date.UTC(2026, 10, 2, 10, 0)); // 2 de novembro, 10h00 em Lisboa

  it('sem data, a pessoa está disponível', () => {
    expect(suspensaoEmCurso(agora, null)).toBeNull();
    expect(suspensaoEmCurso(agora, '')).toBeNull();
  });

  it('uma data passada já não suspende', () => {
    expect(suspensaoEmCurso(agora, '2026-11-01')).toBeNull();
  });

  it('o último dia ainda conta: termina hoje, e amanhã já não', () => {
    expect(suspensaoEmCurso(agora, '2026-11-02')?.diasRestantes).toBe(0);
    expect(suspensaoEmCurso(new Date(Date.UTC(2026, 10, 3, 0, 5)), '2026-11-02')).toBeNull();
  });

  it('conta os dias que faltam', () => {
    const s = suspensaoEmCurso(agora, '2026-11-06');
    expect(s?.diasRestantes).toBe(4);
    expect(s?.ateEmPalavras).toBe('6 de novembro');
  });

  it('a mudança de hora não desfaz a conta', () => {
    // 24 de outubro de 2026 às 23h30 em Lisboa (UTC+1) até 26 de outubro (já UTC+0): são 2 dias.
    const s = suspensaoEmCurso(new Date(Date.UTC(2026, 9, 24, 22, 30)), '2026-10-26');
    expect(s?.diasRestantes).toBe(2);
  });

  it('o dia é o de Lisboa, não o de Greenwich, no verão', () => {
    // 00h30 de 1 de julho em Lisboa é 23h30 de 30 de junho em UTC.
    expect(diaDeLisboa(new Date(Date.UTC(2026, 5, 30, 23, 30)))).toBe('2026-07-01');
  });

  it('o texto concorda no singular e no plural', () => {
    expect(faltaParaVoltar({ ate: '', ateEmPalavras: '', diasRestantes: 0 })).toBe('Termina hoje');
    expect(faltaParaVoltar({ ate: '', ateEmPalavras: '', diasRestantes: 1 })).toBe('Falta 1 dia');
    expect(faltaParaVoltar({ ate: '', ateEmPalavras: '', diasRestantes: 4 })).toBe('Faltam 4 dias');
  });
});
