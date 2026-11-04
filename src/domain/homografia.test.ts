import { describe, expect, it } from 'vitest';
import {
  aplicar,
  calibrar,
  camaraDaHomografia,
  corrigirParalaxe,
  distancia,
  homografia,
  inverter,
  pontoDeFuga,
  problemaDaReferencia,
  type Matriz3,
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

// ---------------------------------------------------------------------------------------------
// A câmara, o que sai da fachada e as horizontais
// ---------------------------------------------------------------------------------------------

const rad = (graus: number) => (graus * Math.PI) / 180;

interface Pose {
  distanciaM: number;
  azimuteGraus: number;
  /** Para cima, em graus: a câmara aponta para a fachada a esta inclinação. */
  inclinacaoGraus: number;
  fovVerticalGraus: number;
}

/**
 * Câmara sintética numa pose dada, com a verdade que a homografia tem de recuperar. A fachada é o
 * plano y = 0 do mundo; no referencial da fachada, x = X, y = Z (altura) e z = Y do mundo — a câmara
 * está do lado dos Y positivos, e um elemento saliente também.
 */
function pose({ distanciaM, azimuteGraus, inclinacaoGraus, fovVerticalGraus }: Pose) {
  const alturaOlhoM = 1.5;
  const camera = { distanciaM, alturaOlhoM, azimuteGraus, fovVerticalGraus };
  const base = baseDaCamera(camera, [0, 0, alturaOlhoM + distanciaM * Math.tan(rad(inclinacaoGraus))], { cx: 0, cy: 0 });
  const projetar = (X: number, Z: number, saliencia = 0): Ponto => {
    const p = projetarPonto([X, saliencia, Z], base, fovVerticalGraus, imagem);
    if (!p) throw new Error('ponto atrás da câmara');
    return { x: p[0], y: p[1] };
  };
  return {
    projetar,
    focalPx: imagem.altura / 2 / Math.tan(rad(fovVerticalGraus) / 2),
    centro: { x: distanciaM * Math.sin(rad(azimuteGraus)), y: alturaOlhoM, z: distanciaM * Math.cos(rad(azimuteGraus)) },
  };
}

const portaVista = (projetarP: (X: number, Z: number) => Ponto): ReferenciaRetangular['cantos'] => [
  projetarP(0, 0),
  projetarP(PORTA.largura, 0),
  projetarP(PORTA.largura, PORTA.altura),
  projetarP(0, PORTA.altura),
];

const camaraDe = (cantos: ReferenciaRetangular['cantos'], arestas: [Ponto, Ponto][] = []) =>
  camaraDaHomografia(
    calibrar({ cantos, larguraM: PORTA.largura, alturaM: PORTA.altura }, arestas).planoParaImagem,
    imagem.largura,
    imagem.altura,
  );

const distancia3 = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const mediana = (xs: number[]) => {
  const o = [...xs].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)]!;
};

const fovVertical = (focalPx: number) => (2 * Math.atan(imagem.altura / 2 / focalPx) * 180) / Math.PI;

const POSES: Pose[] = [];
for (const azimuteGraus of [0, 15, 30])
  for (const inclinacaoGraus of [10, 20, 30])
    for (const [distanciaM, fovVerticalGraus] of [
      [8, 75],
      [12, 65],
      [15, 55],
    ] as const)
      POSES.push({ distanciaM, azimuteGraus, inclinacaoGraus, fovVerticalGraus });

describe('camaraDaHomografia: a câmara tirada da porta (câmara sintética)', () => {
  it.each(POSES)(
    'sem ruído — azimute $azimuteGraus°, inclinação $inclinacaoGraus°, $distanciaM m, fov $fovVerticalGraus°: focal a ±3 % e centro a ±0,3 m',
    (p) => {
      const verdade = pose(p);
      const camara = camaraDe(portaVista(verdade.projetar));
      expect(camara).not.toBeNull();
      expect(Math.abs(camara!.focalPx / verdade.focalPx - 1)).toBeLessThan(0.03);
      expect(distancia3(camara!.centro, verdade.centro)).toBeLessThan(0.3);
    },
  );

  it('com ±1 px nos cantos da porta, a focal fica a ±15 % na mediana em todas as poses (a 12 m, fov 65°)', () => {
    const r = aleatorio(2026);
    for (const azimuteGraus of [0, 15, 30]) {
      for (const inclinacaoGraus of [10, 20, 30]) {
        const verdade = pose({ distanciaM: 12, azimuteGraus, inclinacaoGraus, fovVerticalGraus: 65 });
        const erros: number[] = [];
        for (let i = 0; i < 200; i++) {
          const cantos = portaVista(verdade.projetar).map((c) => ({
            x: c.x + (r() * 2 - 1),
            y: c.y + (r() * 2 - 1),
          })) as ReferenciaRetangular['cantos'];
          const camara = camaraDe(cantos);
          // Um null conta como falhado: a mediana não se pode fazer à custa de recusar.
          erros.push(camara ? Math.abs(camara.focalPx / verdade.focalPx - 1) : Infinity);
        }
        expect(mediana(erros), `azimute ${azimuteGraus}°, inclinação ${inclinacaoGraus}°`).toBeLessThan(0.15);
      }
    }
  });

  it('fotografia exatamente de frente: null (a focal não se pode tirar dela)', () => {
    for (const distanciaM of [6, 12, 20]) {
      const verdade = pose({ distanciaM, azimuteGraus: 0, inclinacaoGraus: 0, fovVerticalGraus: 65 });
      expect(camaraDe(portaVista(verdade.projetar))).toBeNull();
      // Mesmo com uma aresta vertical comprida (paralela às ombreiras: ponto de fuga no infinito).
      expect(camaraDe(portaVista(verdade.projetar), [[verdade.projetar(-5, 0), verdade.projetar(-5, 15)]])).toBeNull();
    }
  });

  it('de frente com ±1 px de ruído: o próprio ruído inventa perspetiva, e mesmo assim dá null quase sempre', () => {
    const r = aleatorio(9);
    const verdade = pose({ distanciaM: 12, azimuteGraus: 0, inclinacaoGraus: 0, fovVerticalGraus: 65 });
    let nulos = 0;
    for (let i = 0; i < 400; i++) {
      const cantos = portaVista(verdade.projetar).map((c) => ({
        x: c.x + (r() * 2 - 1),
        y: c.y + (r() * 2 - 1),
      })) as ReferenciaRetangular['cantos'];
      if (camaraDe(cantos) === null) nulos++;
    }
    expect(nulos / 400).toBeGreaterThan(0.95);
  });

  it('focal fora de [0,3; 3] × o lado maior da imagem: null', () => {
    // fov 150° (f ≈ 0,13 × 2000 px) e 8° (f ≈ 7,1 × 2000 px): nenhum telemóvel; sinal de cantos mal marcados.
    for (const fovVerticalGraus of [150, 8]) {
      const verdade = pose({ distanciaM: 12, azimuteGraus: 20, inclinacaoGraus: 20, fovVerticalGraus });
      expect(camaraDe(portaVista(verdade.projetar))).toBeNull();
    }
  });

  it('uma homografia que nenhuma câmara produz (1/f² negativo): null', () => {
    // Em coordenadas centradas e com o lado maior = 1: a direção x estica mais E foge mais do que a y.
    // A ortogonalidade fica 0 = 0 e a igualdade das normas pede 1/f² < 0.
    const s = 2000;
    const [cx, cy] = [750, 1000];
    const [a1, b1, c1, a2, b2, c2] = [1.2, 0, 0.3, 0, 1, 0];
    const h: Matriz3 = [a1 * s + cx * c1, a2 * s + cx * c2, cx, b1 * s + cy * c1, b2 * s + cy * c2, cy, c1, c2, 1];
    expect(camaraDaHomografia(h, 1500, 2000)).toBeNull();
  });
});

describe('corrigirParalaxe: a frente de uma marquise, 1,2 m à frente da fachada', () => {
  // A frente da marquise: 2 m de largura por 2,5 m de altura, por cima da porta, num plano paralelo
  // à fachada 1,2 m mais perto da câmara.
  const MARQUISE = { x0: 3, x1: 5, z0: 3, z1: 5.5, saliencia: 1.2 };

  it.each([
    { distanciaM: 12, azimuteGraus: 20, inclinacaoGraus: 20, fovVerticalGraus: 65 },
    { distanciaM: 8, azimuteGraus: 30, inclinacaoGraus: 25, fovVerticalGraus: 75 },
    { distanciaM: 15, azimuteGraus: 0, inclinacaoGraus: 15, fovVerticalGraus: 55 },
  ])('$distanciaM m, azimute $azimuteGraus°: largura e altura voltam a ±2 % (sem correção, saem maiores)', (p) => {
    const verdade = pose(p);
    const cantos = portaVista(verdade.projetar);
    const { planoParaImagem, imagemParaPlano } = calibrar({ cantos, larguraM: PORTA.largura, alturaM: PORTA.altura });
    const camara = camaraDaHomografia(planoParaImagem, imagem.largura, imagem.altura)!;
    expect(camara).not.toBeNull();
    const { x0, x1, z0, z1, saliencia } = MARQUISE;
    // Os quatro cantos da frente, na fotografia e depois na vista endireitada (que os põe em Z = 0).
    const naVista = [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ].map(([X, Z]) => aplicar(imagemParaPlano, verdade.projetar(X!, Z!, saliencia))!);
    const corrigidos = naVista.map((q) => corrigirParalaxe(q, camara.centro, saliencia));
    const medir = (q: Ponto[]) => ({ largura: distancia(q[0]!, q[1]!), altura: distancia(q[0]!, q[3]!) });
    const semCorrecao = medir(naVista);
    const comCorrecao = medir(corrigidos);
    expect(Math.abs(comCorrecao.largura / (x1 - x0) - 1)).toBeLessThan(0.02);
    expect(Math.abs(comCorrecao.altura / (z1 - z0) - 1)).toBeLessThan(0.02);
    // O erro que se corrige é o de 1,2 m em 8 a 15 m: mais de 5 %.
    expect(semCorrecao.largura / (x1 - x0) - 1).toBeGreaterThan(0.05);
    expect(semCorrecao.altura / (z1 - z0) - 1).toBeGreaterThan(0.05);
  });

  it('saliência ≤ 0 ou maior do que a distância à câmara: devolve o ponto sem mexer', () => {
    const centro = { x: 1, y: 1.5, z: 10 };
    const p = { x: 4, y: 6 };
    expect(corrigirParalaxe(p, centro, 0)).toEqual(p);
    expect(corrigirParalaxe(p, centro, -0.5)).toEqual(p);
    expect(corrigirParalaxe(p, centro, 10)).toEqual(p);
    expect(corrigirParalaxe(p, centro, 12)).toEqual(p);
    // E o pé da câmara não se mexe nunca.
    expect(corrigirParalaxe({ x: 1, y: 1.5 }, centro, 2)).toEqual({ x: 1, y: 1.5 });
  });
});

describe('arestas horizontais: corrigir a inclinação que a porta deixa', () => {
  // Fotografado de lado (azimute 20°), de baixo (15°), a 16 m: tudo o que se marca cabe na imagem.
  const verdade = pose({ distanciaM: 16, azimuteGraus: 20, inclinacaoGraus: 15, fovVerticalGraus: 70 });
  // O erro que roda o prédio endireitado: os dois cantos da direita da porta marcados 2 px acima. A
  // base e o topo inclinam ~0,8° (a porta tem ~150 px de largura na fotografia).
  const cantos = portaVista(verdade.projetar).map((c, i) =>
    i === 1 || i === 2 ? { x: c.x, y: c.y - 2 } : c,
  ) as ReferenciaRetangular['cantos'];
  const ref = { cantos, larguraM: PORTA.largura, alturaM: PORTA.altura };
  // A cimalha a 9 m, de 10 m à esquerda da porta até 6 m à direita; um friso a 3 m, do mesmo comprimento.
  const cimalha: [Ponto, Ponto] = [verdade.projetar(-10, 9), verdade.projetar(6, 9)];
  const friso: [Ponto, Ponto] = [verdade.projetar(-10, 3), verdade.projetar(6, 3)];
  const vertical: [Ponto, Ponto] = [verdade.projetar(-8, 0), verdade.projetar(-8, 18)];
  /** Erro de altura (m) de um ponto da fachada 10 m à esquerda da porta, à altura Z. */
  const erroAltura = (imagemParaPlano: Matriz3, Z: number) => Math.abs(aplicar(imagemParaPlano, verdade.projetar(-10, Z))!.y - Z);

  it('tudo o que se marca está dentro da fotografia', () => {
    for (const p of [...cantos, ...cimalha, ...friso, ...vertical, verdade.projetar(-10, 0)]) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(imagem.largura);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(imagem.altura);
    }
  });

  it('com a cimalha, um ponto a 10 m para o lado, à altura dela, cai a < 5 cm da altura certa', () => {
    const sem = erroAltura(calibrar(ref).imagemParaPlano, 9);
    const com = erroAltura(calibrar(ref, [], [cimalha]).imagemParaPlano, 9);
    console.log(
      `[horizontais] ponto a 10 m para o lado, a 9 m de altura — erro sem a cimalha: ${sem.toFixed(3)} m; com: ${com.toFixed(3)} m`,
    );
    expect(com).toBeLessThan(0.05);
    expect(sem).toBeGreaterThan(2 * com);
  });

  it('uma só horizontal não endireita a fachada toda; duas compridas a alturas diferentes sim (< 5 cm de 0 a 9 m)', () => {
    const alturas = [0, 4.5, 9];
    const sem = alturas.map((Z) => erroAltura(calibrar(ref).imagemParaPlano, Z));
    const uma = alturas.map((Z) => erroAltura(calibrar(ref, [], [cimalha]).imagemParaPlano, Z));
    const duas = alturas.map((Z) => erroAltura(calibrar(ref, [], [cimalha, friso]).imagemParaPlano, Z));
    const comVertical = alturas.map((Z) => erroAltura(calibrar(ref, [vertical], [cimalha, friso]).imagemParaPlano, Z));
    const fmt = (xs: number[]) => xs.map((x) => x.toFixed(3)).join(' / ');
    console.log(
      `[horizontais] erro de altura a 10 m para o lado, a ${alturas.join(' / ')} m — sem: ${fmt(sem)}; só a cimalha: ${fmt(uma)}; ` +
        `cimalha + friso: ${fmt(duas)}; cimalha + friso + aresta vertical: ${fmt(comVertical)}`,
    );
    // Ao nível do passeio, a cimalha sozinha quase não ajuda: o ponto de fuga desliza ao longo dela.
    expect(uma[0]!).toBeGreaterThan(0.05);
    for (const e of [...duas, ...comVertical]) expect(e).toBeLessThan(0.05);
  });

  it('pontos de fuga no infinito (fotografia de frente: cimalha e verticais paralelas na imagem) — continua exata', () => {
    const frente = pose({ distanciaM: 12, azimuteGraus: 0, inclinacaoGraus: 0, fovVerticalGraus: 65 });
    const cantosFrente = portaVista(frente.projetar);
    const cimalhaFrente: [Ponto, Ponto] = [frente.projetar(-6, 9), frente.projetar(7, 9)];
    const verticalFrente: [Ponto, Ponto] = [frente.projetar(-5, 0), frente.projetar(-5, 12)];
    // As três horizontais são mesmo paralelas na imagem: o ponto de fuga tem w ≈ 0.
    const pf = pontoDeFuga([[cantosFrente[0], cantosFrente[1]], [cantosFrente[3], cantosFrente[2]], cimalhaFrente]);
    expect(Math.abs(pf[2]) / Math.hypot(pf[0], pf[1])).toBeLessThan(1e-9);
    const { imagemParaPlano } = calibrar(
      { cantos: cantosFrente, larguraM: PORTA.largura, alturaM: PORTA.altura },
      [verticalFrente],
      [cimalhaFrente],
    );
    for (const [X, Z] of [
      [-6, 0],
      [3, 12],
      [8, 5],
    ] as const) {
      const p = aplicar(imagemParaPlano, frente.projetar(X, Z))!;
      expect(Math.abs(p.x - X)).toBeLessThan(1e-6);
      expect(Math.abs(p.y - Z)).toBeLessThan(1e-6);
    }
    // E diretamente: pontos de fuga dados com w = 0 exato.
    const plano = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 3 },
      { x: 0, y: 3 },
    ];
    const img = [
      { x: 100, y: 900 },
      { x: 300, y: 900 },
      { x: 300, y: 600 },
      { x: 100, y: 600 },
    ];
    const h = homografia(plano, img, { fugaHorizontal: [1, 0, 0], fugaVertical: [0, -1, 0] });
    expect(aplicar(h, { x: 10, y: 10 })!.x).toBeCloseTo(1100, 6);
    expect(aplicar(h, { x: 10, y: 10 })!.y).toBeCloseTo(-100, 6);
  });

  it('sem arestas horizontais, calibrar dá exatamente o mesmo que antes', () => {
    expect(calibrar(ref, [vertical], []).planoParaImagem).toEqual(calibrar(ref, [vertical]).planoParaImagem);
    expect(calibrar(ref, [], []).planoParaImagem).toEqual(calibrar(ref).planoParaImagem);
  });
});

describe('fotografia real do promotor: a câmara (03/11/2026, 1500×2000)', () => {
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
  const aresta: [Ponto, Ponto] = [
    { x: 1183, y: 1040 },
    { x: 1007, y: 317 },
  ];

  it.each([
    { nome: 'só a porta', arestas: [] as [Ponto, Ponto][] },
    { nome: 'porta + aresta vertical', arestas: [aresta] },
  ])('$nome: uma câmara plausível', ({ nome, arestas }) => {
    const camara = camaraDaHomografia(calibrar(porta, arestas).planoParaImagem, 1500, 2000);
    expect(camara).not.toBeNull();
    const { focalPx, centro } = camara!;
    const fov = fovVertical(focalPx);
    console.log(
      `[fotografia real, ${nome}] focal ${focalPx.toFixed(0)} px, fov vertical ${fov.toFixed(1)}°, ` +
        `centro x ${centro.x.toFixed(2)} m, y ${centro.y.toFixed(2)} m, z ${centro.z.toFixed(2)} m`,
    );
    // Sai ~102°: o campo de visão da grande angular (0,5×) de um telemóvel, 95 a 110° no lado maior
    // (a lente normal, 24–26 mm equivalentes, dá 67 a 72°) — por isso o limite de cima é 110° e não
    // 100°. Não é erro da função, e há uma verificação que não passa pelas medidas da porta: o ponto
    // de fuga das verticais (bem fixado pela aresta, ~1720 px acima do centro) põe o horizonte f²/1720
    // px abaixo do centro. Com a focal de uma lente normal (~1500 px), o horizonte cairia abaixo da
    // soleira da porta — o olho de quem fotografou estaria abaixo do chão; com ~810 px cai a ~1,7 m,
    // a altura de um olho, que é o centro.y que a função devolve.
    expect(fov).toBeGreaterThan(40);
    expect(fov).toBeLessThan(110);
    expect(centro.z).toBeGreaterThan(4);
    expect(centro.z).toBeLessThan(30);
    expect(centro.y).toBeGreaterThan(-1);
    expect(centro.y).toBeLessThan(4);
  });
});

describe('sem base de dados', () => {
  it('homografia.ts não importa cliente de base de dados', async () => {
    const fonte = await import('fs/promises').then((fs) => fs.readFile(new URL('./homografia.ts', import.meta.url), 'utf8'));
    expect(fonte).not.toMatch(/supabase/i);
  });
});
