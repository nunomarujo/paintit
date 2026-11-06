import { describe, expect, it } from 'vitest';
import { chaveDaJanelaDePronto, listaDoAvaliador, prontoParaLevantamentos, RECOMENDACAO_WHATSAPP } from './prontidaoDoAvaliador';

const base = { inscrito: false, zonasDefinidas: false, responsavel: true, whatsappLigado: false };

describe('prontidão do avaliador', () => {
  it('pronto só com a inscrição e as zonas', () => {
    expect(prontoParaLevantamentos(base)).toBe(false);
    expect(prontoParaLevantamentos({ ...base, inscrito: true })).toBe(false);
    expect(prontoParaLevantamentos({ ...base, zonasDefinidas: true })).toBe(false);
    expect(prontoParaLevantamentos({ ...base, inscrito: true, zonasDefinidas: true })).toBe(true);
  });

  it('o WhatsApp é recomendado e nunca impede', () => {
    expect(prontoParaLevantamentos({ ...base, inscrito: true, zonasDefinidas: true, whatsappLigado: false })).toBe(true);
    const w = listaDoAvaliador(base).find((i) => i.passo === 'whatsapp')!;
    expect(w.obrigatorio).toBe(false);
    expect(w.nota).toBe(RECOMENDACAO_WHATSAPP);
  });

  it('a lista vem pela ordem inscrição, zonas, WhatsApp, com o estado de cada um', () => {
    const l = listaDoAvaliador({ ...base, inscrito: true, whatsappLigado: true });
    expect(l.map((i) => [i.passo, i.feito, i.obrigatorio])).toEqual([
      ['inscricao', true, true],
      ['zonas', false, true],
      ['whatsapp', true, false],
    ]);
  });

  it('as zonas não têm botão para quem não é responsável', () => {
    const z = (r: boolean) => listaDoAvaliador({ ...base, responsavel: r }).find((i) => i.passo === 'zonas')!;
    expect(z(true).acao).not.toBeNull();
    expect(z(false).acao).toBeNull();
    expect(z(false).nota).toMatch(/responsável/);
  });

  it('o texto é impessoal (regra 12)', () => {
    for (const i of listaDoAvaliador(base)) expect(`${i.titulo} ${i.nota} ${i.acao ?? ''}`).not.toMatch(/\b(tu|você)\b/i);
  });

  it('a janela é lembrada por pessoa', () => {
    expect(chaveDaJanelaDePronto('a')).not.toBe(chaveDaJanelaDePronto('b'));
  });
});
