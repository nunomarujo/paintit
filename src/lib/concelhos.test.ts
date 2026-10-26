import { describe, expect, it } from 'vitest';
import { DISTRITOS, distritoDoConcelho } from './concelhos';

// Os 308 concelhos de Portugal (278 do continente + 19 dos Açores + 11 da Madeira), com os nomes
// exatos que `buildings.concelho` já guarda (fonte: docs/DECISOES.md, 23/10/2026).
describe('distritos e concelhos', () => {
  it('tem os 20 grupos (18 distritos do continente + Açores + Madeira) e 308 concelhos no total', () => {
    expect(DISTRITOS).toHaveLength(20);
    expect(DISTRITOS.reduce((n, d) => n + d.concelhos.length, 0)).toBe(308);
  });

  it('não repete nome de distrito nem concelho dentro do mesmo distrito', () => {
    const distritos = DISTRITOS.map((d) => d.distrito);
    expect(new Set(distritos).size).toBe(distritos.length);
    for (const d of DISTRITOS) expect(new Set(d.concelhos).size).toBe(d.concelhos.length);
  });

  it('desambigua os concelhos homónimos como os CTT (não dois concelhos iguais em distritos diferentes)', () => {
    const porNome = new Map<string, string[]>();
    for (const d of DISTRITOS) for (const c of d.concelhos) porNome.set(c, [...(porNome.get(c) ?? []), d.distrito]);
    for (const [concelho, distritos] of porNome) expect(distritos, `"${concelho}" aparece em mais de um distrito`).toHaveLength(1);
  });
});

describe('distritoDoConcelho', () => {
  it('encontra o distrito pelo nome do concelho, sem acentos e sem maiúsculas', () => {
    expect(distritoDoConcelho('Vila Nova de Gaia')).toBe('Porto');
    expect(distritoDoConcelho('sintra')).toBe('Lisboa');
    expect(distritoDoConcelho('EVORA')).toBe('Évora');
  });

  it('não escolhe por nós quando o nome é ambíguo', () => {
    // "Lagoa" existe no Algarve e em São Miguel: adivinhar seria pôr o pintor a ver obra a 1 200 km.
    expect(distritoDoConcelho('Lagoa')).toBeNull();
    expect(distritoDoConcelho('Lagoa (Algarve)')).toBe('Faro');
  });

  it('devolve null para o que não é concelho', () => {
    expect(distritoDoConcelho('Alvalade')).toBeNull();
    expect(distritoDoConcelho('')).toBeNull();
  });
});
