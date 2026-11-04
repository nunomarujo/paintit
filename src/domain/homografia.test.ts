import { describe, expect, it } from 'vitest';
import {
  aplicar,
  calibrar,
  homografia,
  inverter,
  pontoDeFuga,
  problemaDaReferencia,
  type Ponto,
  type ReferenciaRetangular,
} from './homografia';
import { baseDaCamera, projetarPonto, type ParametrosCamera } from './perspectiveCamera';

const imagem = { largura: 1500, altura: 2000 };

/** Câmara sintética a olhar para uma fachada no plano y = 0 (X para a direita, Z para cima). */
function camaraSintetica(camera: ParametrosCamera, alvoZ: number) {
  const base = baseDaCamera(camera, [0, 0, alvoZ], { cx: 0, cy: 0 });
  return (X: number, Z: number): Ponto => {
    const p = projetarPonto([X, 0, Z], base, camera.fovVerticalGraus, imagem);
    if (!p) throw new Error('ponto atrás da câmara');
    return { x: p[0], y: p[1] };
  };
}

// Fotografado de baixo, como a fotografia real do promotor: 12 m de distância, olho a 1,5 m, a apontar
// para os 8 m de altura, um pouco de lado.
const projetar = camaraSintetica({ distanciaM: 12, alturaOlhoM: 1.5, azimuteGraus: 10, fovVerticalGraus: 65 }, 8);

// A porta: canto inferior esquerdo em X = 0.
const PORTA = { largura: 1.65, altura: 3.77 };
const cantosDaPorta = (): ReferenciaRetangular['cantos'] => [
  projetar(0, 0),
  projetar(PORTA.largura, 0),
  projetar(PORTA.largura, PORTA.altura),
  projetar(0, PORTA.altura),
];

/** Gerador pseudo-aleatório com semente: o teste de ruído dá sempre o mesmo resultado. */
function aleatorio(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('homografia: álgebra', () => {
  it('inverter desfaz aplicar', () => {
    const plano: Ponto[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 3 },
      { x: 0, y: 3 },
    ];
    const img: Ponto[] = [
      { x: 100, y: 900 },
      { x: 400, y: 910 },
      { x: 380, y: 300 },
      { x: 120, y: 320 },
    ];
    const h = homografia(plano, img);
    const hi = inverter(h);
    for (const p of [
      { x: 0.3, y: 1.1 },
      { x: 5, y: -2 },
      { x: -1, y: 7 },
    ]) {
      const ida = aplicar(h, p)!;
      const volta = aplicar(hi, ida)!;
      expect(volta.x).toBeCloseTo(p.x, 9);
      expect(volta.y).toBeCloseTo(p.y, 9);
    }
  });

  it('com quatro pontos e sem ponto de fuga, a homografia passa exatamente pelos quatro', () => {
    const cantos = cantosDaPorta();
    const { planoParaImagem } = calibrar({ cantos, larguraM: PORTA.largura, alturaM: PORTA.altura });
    const plano = [
      { x: 0, y: 0 },
      { x: PORTA.largura, y: 0 },
      { x: PORTA.largura, y: PORTA.altura },
      { x: 0, y: PORTA.altura },
    ];
    plano.forEach((p, i) => {
      const q = aplicar(planoParaImagem, p)!;
      expect(q.x).toBeCloseTo(cantos[i]!.x, 6);
      expect(q.y).toBeCloseTo(cantos[i]!.y, 6);
    });
  });
});

describe('homografia: medir a fachada a partir só da porta (câmara sintética, verdade conhecida)', () => {
  it('qualquer ponto da fachada volta às suas coordenadas reais, mesmo a 20 m de altura', () => {
    const { imagemParaPlano } = calibrar({ cantos: cantosDaPorta(), larguraM: PORTA.largura, alturaM: PORTA.altura });
    for (const X of [-6, -2, 0.8, 4, 8]) {
      for (const Z of [0, 5, 12, 20]) {
        const p = aplicar(imagemParaPlano, projetar(X, Z))!;
        expect(Math.abs(p.x - X)).toBeLessThan(1e-6);
        expect(Math.abs(p.y - Z)).toBeLessThan(1e-6);
      }
    }
  });

  it('com arestas verticais a mais (sem ruído) continua exata — o ponto de fuga é coerente com a porta', () => {
    const arestas: [Ponto, Ponto][] = [
      [projetar(-5, 0), projetar(-5, 19)],
      [projetar(6, 2), projetar(6, 20)],
    ];
    const { imagemParaPlano } = calibrar({ cantos: cantosDaPorta(), larguraM: PORTA.largura, alturaM: PORTA.altura }, arestas);
    for (const [X, Z] of [
      [-6, 0],
      [3, 20],
      [7, 11],
    ] as const) {
      const p = aplicar(imagemParaPlano, projetar(X, Z))!;
      expect(Math.abs(p.x - X)).toBeLessThan(1e-4);
      expect(Math.abs(p.y - Z)).toBeLessThan(1e-4);
    }
  });

  it('o ponto de fuga das verticais é o sítio para onde vai um ponto muito alto da fachada', () => {
    const verticais: [Ponto, Ponto][] = [
      [projetar(-4, 0), projetar(-4, 15)],
      [projetar(0, 0), projetar(0, 18)],
      [projetar(5, 1), projetar(5, 19)],
    ];
    const pf = pontoDeFuga(verticais);
    const longe = projetar(0.5, 1e7);
    expect(pf[0] / pf[2]).toBeCloseTo(longe.x, 0);
    expect(pf[1] / pf[2]).toBeCloseTo(longe.y, 0);
  });

  it('com erro de toque (±2 px), uma aresta vertical comprida torna a altura do prédio muito mais estável', () => {
    const r = aleatorio(42);
    const ruido = (p: Ponto, e: number): Ponto => ({ x: p.x + (r() * 2 - 1) * e, y: p.y + (r() * 2 - 1) * e });
    const aresta: [Ponto, Ponto] = [projetar(6, 1), projetar(6, 20)];
    const topo = projetar(3, 20);
    const soPorta: number[] = [];
    const comAresta: number[] = [];
    for (let i = 0; i < 300; i++) {
      const cantos = cantosDaPorta().map((p) => ruido(p, 2)) as ReferenciaRetangular['cantos'];
      const a: [Ponto, Ponto] = [ruido(aresta[0], 2), ruido(aresta[1], 2)];
      const ref = { cantos, larguraM: PORTA.largura, alturaM: PORTA.altura };
      soPorta.push(aplicar(calibrar(ref).imagemParaPlano, topo)!.y);
      comAresta.push(aplicar(calibrar(ref, [a]).imagemParaPlano, topo)!.y);
    }
    const desvio = (xs: number[]) => {
      const m = xs.reduce((s, x) => s + x, 0) / xs.length;
      return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
    };
    expect(desvio(comAresta)).toBeLessThan(desvio(soPorta) * 0.5);
    expect(desvio(comAresta)).toBeLessThan(20 * 0.03); // < 3 % em 20 m
  });
});

describe('problemaDaReferencia', () => {
  const boa = cantosDaPorta();
  it('aceita a referência certa', () => {
    expect(problemaDaReferencia({ cantos: boa, larguraM: 1.65, alturaM: 3.77 })).toBeNull();
  });
  it('recusa medidas em falta', () => {
    expect(problemaDaReferencia({ cantos: boa, larguraM: 0, alturaM: 3.77 })).toMatch(/largura e a altura/);
  });
  it('recusa os cantos por outra ordem (quadrilátero cruzado)', () => {
    const [a, b, c, d] = boa;
    expect(problemaDaReferencia({ cantos: [a, c, b, d], larguraM: 1.65, alturaM: 3.77 })).not.toBeNull();
  });
  it('recusa a ordem certa mas a começar no canto errado', () => {
    const [a, b, c, d] = boa;
    expect(problemaDaReferencia({ cantos: [d, a, b, c], larguraM: 1.65, alturaM: 3.77 })).not.toBeNull();
  });
});

describe('fotografia real do promotor (03/11/2026, 1500×2000)', () => {
  // Cantos do vão de entrada no plano da parede, lidos com zoom de 8× (docs/DECISOES.md, 04/11/2026):
  // a porta mede 1,65 × 3,77 m (pavimento à padieira), medida com fita pelo promotor.
  const porta: ReferenciaRetangular = {
    cantos: [
      { x: 767, y: 1591 },
      { x: 955, y: 1592 },
      { x: 916, y: 1162 },
      { x: 763, y: 1168 },
    ],
    larguraM: 1.65,
    alturaM: 3.77,
  };
  // Aresta direita do corpo branco (fronteira com a torre vermelha), também lida com zoom.
  const aresta: [Ponto, Ponto] = [
    { x: 1183, y: 1040 },
    { x: 1007, y: 317 },
  ];

  it('só com a porta, uma aresta do prédio que o motor nunca viu sai vertical (< 15 cm em 14 m)', () => {
    const { imagemParaPlano } = calibrar(porta);
    const baixo = aplicar(imagemParaPlano, aresta[0])!;
    const cima = aplicar(imagemParaPlano, aresta[1])!;
    expect(cima.y - baixo.y).toBeGreaterThan(13);
    expect(Math.abs(cima.x - baixo.x)).toBeLessThan(0.15);
  });

  it('com a aresta como referência vertical, a porta continua a medir o que mede (± 5 cm)', () => {
    const { planoParaImagem, imagemParaPlano } = calibrar(porta, [aresta]);
    const plano = [
      { x: 0, y: 0 },
      { x: 1.65, y: 0 },
      { x: 1.65, y: 3.77 },
      { x: 0, y: 3.77 },
    ];
    porta.cantos.forEach((c, i) => {
      const p = aplicar(imagemParaPlano, c)!;
      expect(Math.abs(p.x - plano[i]!.x)).toBeLessThan(0.05);
      expect(Math.abs(p.y - plano[i]!.y)).toBeLessThan(0.05);
    });
    expect(aplicar(planoParaImagem, { x: 0, y: 0 })).not.toBeNull();
  });
});

describe('sem base de dados', () => {
  it('homografia.ts não importa cliente de base de dados', async () => {
    const fonte = await import('fs/promises').then((fs) => fs.readFile(new URL('./homografia.ts', import.meta.url), 'utf8'));
    expect(fonte).not.toMatch(/supabase/i);
  });
});
