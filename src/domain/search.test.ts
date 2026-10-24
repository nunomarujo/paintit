import { describe, expect, it } from 'vitest';
import { matchesSearch, normalizeText, wordMatches } from './search';

describe('normalizeText', () => {
  it('remove acentos e põe em minúsculas', () => {
    expect(normalizeText('Isolamento Térmico')).toBe('isolamento termico');
  });
});

describe('wordMatches', () => {
  it('aceita a palavra igual', () => {
    expect(wordMatches('capoto', 'capoto')).toBe(true);
  });
  it('aceita prefixo (plural, flexão)', () => {
    expect(wordMatches('isolamento', 'isolamentos')).toBe(true);
  });
  it('aceita um pequeno erro de escrita em palavra longa', () => {
    expect(wordMatches('izolamento', 'isolamento')).toBe(true);
  });
  it('não aceita palavras muito diferentes', () => {
    expect(wordMatches('capoto', 'tinta')).toBe(false);
  });
  it('não tolera erros em palavras muito curtas', () => {
    expect(wordMatches('eps', 'xps')).toBe(false);
  });
});

describe('matchesSearch', () => {
  const epsBoard = { tipo: 'isolamento_eps' as const, texto: 'Sika SikaTherm EPS Placa de poliestireno expandido' };
  const rebocoCapoto = { tipo: 'reboco_capoto' as const, texto: 'Weber weberTherm Reboco delgado para ETICS' };
  const tintaExterior = { tipo: 'tinta_exterior' as const, texto: 'CIN Vinylsilk Tinta de exterior acetinada' };

  it('pesquisa vazia encontra tudo', () => {
    expect(matchesSearch('', epsBoard)).toBe(true);
  });

  it('"capoto" encontra isolamento mesmo sem a palavra na ficha (o caso reportado pelo Nuno)', () => {
    expect(matchesSearch('capoto', epsBoard)).toBe(true);
    expect(matchesSearch('capoto', rebocoCapoto)).toBe(true);
    expect(matchesSearch('capoto', tintaExterior)).toBe(false);
  });

  it('"esferovite" (gíria do EPS) encontra o tipo certo', () => {
    expect(matchesSearch('esferovite', epsBoard)).toBe(true);
    expect(matchesSearch('esferovite', rebocoCapoto)).toBe(false);
  });

  it('"reboco" encontra o reboco de capoto', () => {
    expect(matchesSearch('reboco', rebocoCapoto)).toBe(true);
  });

  it('tolera erro de escrita no próprio termo de gíria', () => {
    expect(matchesSearch('kapoto', epsBoard)).toBe(true);
  });

  it('pesquisa literal por marca/nome continua a funcionar', () => {
    expect(matchesSearch('weber', rebocoCapoto)).toBe(true);
    expect(matchesSearch('sika', epsBoard)).toBe(true);
    expect(matchesSearch('sika', rebocoCapoto)).toBe(false);
  });

  it('várias palavras exigem que todas encontrem algo', () => {
    expect(matchesSearch('tinta exterior', tintaExterior)).toBe(true);
    expect(matchesSearch('tinta capoto', tintaExterior)).toBe(false);
  });
});
