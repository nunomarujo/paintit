import { describe, expect, it } from 'vitest';
import { formatEuros } from './money';
import { DESEMPENHO_INICIAL, VALOR_DE_EXEMPLO_CENTS, percentagemEmPalavras, simularGanho } from './avaliador';

describe('o simulador de ganho do avaliador', () => {
  it('no início, com tudo por conhecer, fica a meio da banda: 45 000 € dão 832,50 € (1,85%)', () => {
    const s = simularGanho(VALOR_DE_EXEMPLO_CENTS, DESEMPENHO_INICIAL);
    expect(s.shareBp).toBe(185);
    expect(formatEuros(s.ganhoCents)).toBe(formatEuros(83_250));
    expect(formatEuros(s.minimoCents)).toBe(formatEuros(45_000));
    expect(formatEuros(s.maximoCents)).toBe(formatEuros(121_500));
  });

  it('com o melhor desempenho chega aos 2,7%; com o pior fica em 1%', () => {
    const melhor = simularGanho(VALOR_DE_EXEMPLO_CENTS, { qualificacaoGeral: 5, notaInformacao: 5, respostaAtempada: true, notaCliente: 5 });
    const pior = simularGanho(VALOR_DE_EXEMPLO_CENTS, { qualificacaoGeral: 1, notaInformacao: 1, respostaAtempada: false, notaCliente: 1 });
    expect(melhor.shareBp).toBe(270);
    expect(pior.shareBp).toBe(100);
    expect(melhor.ganhoCents).toBe(121_500);
    expect(pior.ganhoCents).toBe(45_000);
  });

  it('a percentagem diz-se em português: 2% e 2,7%', () => {
    expect(percentagemEmPalavras(200)).toBe('2%');
    expect(percentagemEmPalavras(270)).toBe('2,7%');
  });
});
