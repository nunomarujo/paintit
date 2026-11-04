import { describe, expect, it } from 'vitest';
import { aplicar, calibrar, type Calibracao, type Ponto, type ReferenciaRetangular } from './homografia';
import { DESVIOS_NA_MARGEM, margemCombinada, margemDaArea, type MargemDaArea } from './margemDaArea';

// A câmara virtual da comparação de motores (04/11/2026): f = 800 px, imagem de 1000 × 1500, de lado
// e de baixo — em [−4; 1,7; 12] a olhar para [3; 7; 0]. A fachada é o plano Z = 0 (X para a direita,
// Y para cima) e a referência tem o canto inferior esquerdo na origem.
type V = [number, number, number];
const IMAGEM = { largura: 1000, altura: 1500 };
function camaraVirtual(centro: V, alvo: V, focal: number) {
  const menos = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const escalar = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const unitario = (a: V): V => {
    const n = Math.hypot(...a);
    return [a[0] / n, a[1] / n, a[2] / n];
  };
  const vetorial = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const frente = unitario(menos(alvo, centro));
  const direita = unitario(vetorial(frente, [0, 1, 0]));
  const cima = vetorial(direita, frente);
  return (X: number, Y: number): Ponto => {
    const d = menos([X, Y, 0], centro);
    const z = escalar(d, frente);
    return { x: IMAGEM.largura / 2 + (focal * escalar(d, direita)) / z, y: IMAGEM.altura / 2 - (focal * escalar(d, cima)) / z };
  };
}
const projetar = camaraVirtual([-4, 1.7, 12], [3, 7, 0], 800);

const PORTA_PEQUENA = { larguraM: 0.9, alturaM: 2.1 };
const PORTA_GRANDE = { larguraM: 1.65, alturaM: 3.77 };
type Porta = typeof PORTA_PEQUENA;

/** O contorno de 6 × 12 m da comparação, ao lado da porta: a área verdadeira é 72 m². */
const CONTORNO: [number, number][] = [
  [2, 1],
  [8, 1],
  [8, 13],
  [2, 13],
];
const AREA_VERDADEIRA_M2 = 72;
const contornoNaImagem = CONTORNO.map(([X, Y]) => projetar(X, Y));

/** A área do contorno com uma calibração: os quatro cantos dele na fotografia, levados ao plano. */
function areaDoContorno(cal: Calibracao): number | null {
  const q = contornoNaImagem.map((c) => aplicar(cal.imagemParaPlano, c));
  if (q.some((p) => !p)) return null;
  const ps = q as Ponto[];
  return Math.abs(ps.reduce((s, p, i) => s + p.x * ps[(i + 1) % 4]!.y - ps[(i + 1) % 4]!.x * p.y, 0)) / 2;
}

/** Ruído gaussiano com semente (Box–Muller sobre um gerador congruente): os testes dão sempre o mesmo. */
function gaussiano(semente: number) {
  let s = semente >>> 0;
  const u = () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return (s + 0.5) / 2 ** 32;
  };
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}

/**
 * O que se toca: os cantos da porta e, com `arestas`, a vertical comprida (o canto do prédio, X = 10,
 * de 0 a 16 m) e duas horizontais a alturas diferentes (o passeio e a cimalha, de X = 0 a 10) — cada
 * coordenada com o seu erro, `ruido()` píxeis.
 */
function toques(porta: Porta, arestas: 'nenhuma' | 'vertical' | 'vertical e duas horizontais', ruido: () => number = () => 0) {
  const tocar = (X: number, Y: number): Ponto => {
    const p = projetar(X, Y);
    return { x: p.x + ruido(), y: p.y + ruido() };
  };
  const { larguraM: l, alturaM: a } = porta;
  const ref: ReferenciaRetangular = { cantos: [tocar(0, 0), tocar(l, 0), tocar(l, a), tocar(0, a)], larguraM: l, alturaM: a };
  const verticais: [Ponto, Ponto][] = arestas === 'nenhuma' ? [] : [[tocar(10, 0), tocar(10, 16)]];
  const horizontais: [Ponto, Ponto][] =
    arestas === 'vertical e duas horizontais'
      ? [
          [tocar(0, 0), tocar(10, 0)],
          [tocar(0, 16), tocar(10, 16)],
        ]
      : [];
  return { ref, verticais, horizontais };
}

const margemSemRuido = (porta: Porta, arestas: Parameters<typeof toques>[1]) => {
  const t = toques(porta, arestas);
  return margemDaArea(t.ref, t.verticais, t.horizontais, areaDoContorno)!;
};

describe('margemDaArea: a câmara virtual da comparação', () => {
  it('tudo o que se toca está dentro da fotografia', () => {
    const t = toques(PORTA_GRANDE, 'vertical e duas horizontais');
    for (const p of [...t.ref.cantos, ...t.verticais.flat(), ...t.horizontais.flat(), ...contornoNaImagem]) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(IMAGEM.largura);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(IMAGEM.altura);
    }
  });

  it('sem erro de toque, a área é a verdadeira e a margem é a que o desvio-padrão diz', () => {
    const m = margemSemRuido(PORTA_GRANDE, 'nenhuma');
    expect(m.areaM2).toBeCloseTo(AREA_VERDADEIRA_M2, 6);
    expect(m.margemM2).toBeCloseTo(DESVIOS_NA_MARGEM * m.desvioM2, 12);
    expect(m.relativa).toBeCloseTo(m.margemM2 / m.areaM2, 12);
  });

  it.each([
    { porta: PORTA_PEQUENA, nome: 'porta 0,90 × 2,10' },
    { porta: PORTA_GRANDE, nome: 'porta 1,65 × 3,77' },
  ])('$nome: a margem desce com a vertical e mais ainda com as duas horizontais', ({ porta }) => {
    const so = margemSemRuido(porta, 'nenhuma').relativa;
    const comVertical = margemSemRuido(porta, 'vertical').relativa;
    const comArestas = margemSemRuido(porta, 'vertical e duas horizontais').relativa;
    expect(comVertical).toBeLessThan(so);
    // A comparação: de ~27 % para ~2 % (porta pequena) e de ~2 % para ~0,3 % (porta grande, ±1 px).
    expect(comArestas).toBeLessThan(so / 4);
  });

  it('uma referência maior dá uma margem menor', () => {
    for (const arestas of ['nenhuma', 'vertical', 'vertical e duas horizontais'] as const) {
      expect(margemSemRuido(PORTA_GRANDE, arestas).relativa).toBeLessThan(margemSemRuido(PORTA_PEQUENA, arestas).relativa);
    }
  });

  it.each([
    { porta: PORTA_PEQUENA, arestas: 'nenhuma', semente: 11 },
    { porta: PORTA_PEQUENA, arestas: 'vertical e duas horizontais', semente: 12 },
    { porta: PORTA_GRANDE, arestas: 'nenhuma', semente: 13 },
    { porta: PORTA_GRANDE, arestas: 'vertical e duas horizontais', semente: 14 },
  ] as const)(
    'com σ = 1 px em todas as coordenadas tocadas, o erro real fica dentro da margem em ≥ 85 % dos ensaios ($porta.larguraM m, $arestas)',
    ({ porta, arestas, semente }) => {
      const ruido = gaussiano(semente);
      const ENSAIOS = 120;
      const margens: MargemDaArea[] = [];
      let dentro = 0;
      for (let k = 0; k < ENSAIOS; k++) {
        const t = toques(porta, arestas, ruido);
        const m = margemDaArea(t.ref, t.verticais, t.horizontais, areaDoContorno);
        // Com um píxel de erro, nenhuma destas referências chega ao limite: há sempre margem.
        expect(m).not.toBeNull();
        margens.push(m!);
        if (Math.abs(m!.areaM2 - AREA_VERDADEIRA_M2) <= m!.margemM2) dentro++;
      }
      expect(margens.every((m) => [m.areaM2, m.desvioM2, m.margemM2, m.relativa].every(Number.isFinite))).toBe(true);
      expect(dentro / ENSAIOS).toBeGreaterThanOrEqual(0.85);
    },
  );
});

describe('margemDaArea: sem calibração, sem margem — e nunca NaN', () => {
  const certa = toques(PORTA_GRANDE, 'vertical e duas horizontais');

  it('cantos pela ordem errada: null', () => {
    const [a, b, c, d] = certa.ref.cantos;
    expect(margemDaArea({ ...certa.ref, cantos: [a, c, b, d] }, [], [], areaDoContorno)).toBeNull();
    expect(margemDaArea({ ...certa.ref, cantos: [b, c, d, a] }, [], [], areaDoContorno)).toBeNull();
  });

  it('cantos em linha ou medidas em falta: null', () => {
    const p = { x: 100, y: 100 };
    expect(margemDaArea({ cantos: [p, p, p, p], larguraM: 1, alturaM: 2 }, [], [], areaDoContorno)).toBeNull();
    expect(margemDaArea({ ...certa.ref, larguraM: 0 }, [], [], areaDoContorno)).toBeNull();
    expect(margemDaArea({ ...certa.ref, alturaM: Number.NaN }, [], [], areaDoContorno)).toBeNull();
  });

  it('uma referência que se desfaz com um píxel de diferença: null, e não uma margem tirada só de um lado', () => {
    // O lado esquerdo sobe 100 px e anda 99,5 px para a direita: ainda é «mais vertical do que
    // horizontal», mas com o canto superior esquerdo 1 px mais à direita deixa de ser.
    const ref: ReferenciaRetangular = {
      cantos: [
        { x: 0, y: 100 },
        { x: 150, y: 100 },
        { x: 250, y: 0 },
        { x: 99.5, y: 0 },
      ],
      larguraM: 1,
      alturaM: 1,
    };
    expect(() => calibrar(ref)).not.toThrow();
    const area = (cal: Calibracao) => medirQuadrado(cal);
    expect(margemDaArea(ref, [], [], area)).toBeNull();
  });

  it('a função da área devolve nulo, NaN ou infinito, ou rebenta: null', () => {
    const { ref, verticais, horizontais } = certa;
    expect(margemDaArea(ref, verticais, horizontais, () => null)).toBeNull();
    expect(margemDaArea(ref, verticais, horizontais, () => Number.NaN)).toBeNull();
    expect(margemDaArea(ref, verticais, horizontais, () => Infinity)).toBeNull();
    expect(
      margemDaArea(ref, verticais, horizontais, () => {
        throw new Error('zona para lá do horizonte');
      }),
    ).toBeNull();
    // Falha só numa das calibrações mexidas (o primeiro canto 1 px para a direita): também null. Sem
    // arestas, a homografia passa exatamente pelos cantos e reconhece-se a calibração mexida.
    const x0 = ref.cantos[0].x;
    const soNoMexido = (cal: Calibracao) => (Math.abs(aplicar(cal.planoParaImagem, { x: 0, y: 0 })!.x - (x0 + 1)) < 1e-6 ? null : 1);
    expect(margemDaArea(ref, [], [], () => 1)).not.toBeNull();
    expect(margemDaArea(ref, [], [], soNoMexido)).toBeNull();
  });

  it('sem área (nada a pintar), a margem é zero e a relativa também, sem dividir por zero', () => {
    const m = margemDaArea(certa.ref, certa.verticais, certa.horizontais, () => 0);
    expect(m).toEqual({ areaM2: 0, desvioM2: 0, margemM2: 0, relativa: 0 });
  });
});

/** A área de um quadrado de 1 m × 1 m na origem, para a referência no limite. */
function medirQuadrado(cal: Calibracao): number | null {
  const q = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ].map((p) => aplicar(cal.planoParaImagem, p));
  return q.every(Boolean) ? 1 : null;
}

describe('margemCombinada: o subtotal do prédio', () => {
  it('fachadas independentes combinam-se em quadratura, não por soma', () => {
    expect(margemCombinada([3, 4])).toBeCloseTo(5, 12);
    expect(margemCombinada([2])).toBe(2);
    expect(margemCombinada([])).toBe(0);
  });

  it('uma fachada sem margem deixa o prédio sem margem — nunca uma margem mais pequena do que a verdadeira', () => {
    expect(margemCombinada([3, null, 4])).toBeNull();
    expect(margemCombinada([3, Number.NaN])).toBeNull();
  });
});
