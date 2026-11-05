import { describe, expect, it } from 'vitest';
import {
  aplicar,
  calibrar,
  camaraDaHomografia,
  type Calibracao,
  type Matriz3,
  type Ponto,
  type ReferenciaRetangular,
} from '@/domain/homografia';
import { areasDaFachada, corrigirSaliencias, type OpcoesFachada, type TipoZona, type Zona } from '@/domain/fachadaMedida';
import { calibracoesMexidas, margemDaArea, margemNasCalibracoes } from '@/domain/margemDaArea';
import { levarZonas, type OrigensDasZonas } from './endireitar';
import {
  centroNaCalibracao,
  comoReduzirAMargem,
  contornoNaCalibracao,
  pintavelNaCalibracao,
  textoDaMargem,
  zonasNaCalibracao,
} from './margem';

// A câmara virtual da comparação de motores (a mesma de `margemDaArea.test.ts`): f = 800 px, imagem de
// 1000 × 1500, em [−4; 1,7; 12] a olhar para [3; 7; 0]; a fachada é o plano Z = 0.
type V = [number, number, number];
const FOTO = { largura: 1000, altura: 1500 };
const projetar = (() => {
  const menos = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const escalar = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const unitario = (a: V): V => {
    const n = Math.hypot(...a);
    return [a[0] / n, a[1] / n, a[2] / n];
  };
  const vetorial = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const centro: V = [-4, 1.7, 12];
  const frente = unitario(menos([3, 7, 0], centro));
  const direita = unitario(vetorial(frente, [0, 1, 0]));
  const cima = vetorial(direita, frente);
  return (X: number, Y: number): Ponto => {
    const d = menos([X, Y, 0], centro);
    const z = escalar(d, frente);
    return { x: FOTO.largura / 2 + (800 * escalar(d, direita)) / z, y: FOTO.altura / 2 - (800 * escalar(d, cima)) / z };
  };
})();

function gaussiano(semente: number) {
  let s = semente >>> 0;
  const u = () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return (s + 0.5) / 2 ** 32;
  };
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}

/** Os toques do passo 2 e dos acertos: a porta do R/C (1,65 × 3,77), a vertical do canto do prédio e duas horizontais. */
function toques(arestas: boolean, ruido: () => number = () => 0) {
  const tocar = (X: number, Y: number): Ponto => {
    const p = projetar(X, Y);
    return { x: p.x + ruido(), y: p.y + ruido() };
  };
  const ref: ReferenciaRetangular = {
    cantos: [tocar(0, 0), tocar(1.65, 0), tocar(1.65, 3.77), tocar(0, 3.77)],
    larguraM: 1.65,
    alturaM: 3.77,
  };
  const verticais: [Ponto, Ponto][] = arestas ? [[tocar(10, 0), tocar(10, 16)]] : [];
  const horizontais: [Ponto, Ponto][] = arestas
    ? [
        [tocar(0, 0), tocar(10, 0)],
        [tocar(0, 16), tocar(10, 16)],
      ]
    : [];
  return { ref, verticais, horizontais };
}

/**
 * O retângulo que quem desenha põe por cima de um retângulo verdadeiro da fachada, na vista
 * endireitada com a calibração `cal`: com erro, as arestas do prédio já não saem bem direitas, e a
 * mão fica a meio delas.
 */
function desenhar(id: string, tipo: TipoZona, [x0, y0, x1, y1]: [number, number, number, number], cal: Calibracao): Zona {
  const [a, b, c, d] = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ].map(([X, Y]) => aplicar(cal.imagemParaPlano, projetar(X!, Y!))!) as [Ponto, Ponto, Ponto, Ponto];
  const esquerda = (a.x + d.x) / 2;
  const baixo = (a.y + b.y) / 2;
  return { id, tipo, x: esquerda, y: baixo, largura: (b.x + c.x) / 2 - esquerda, altura: (c.y + d.y) / 2 - baixo };
}

/** A área a pintar pelo caminho do ecrã, com as zonas escritas na calibração `base`. */
function pintavelDe(
  zonas: Zona[],
  base: Matriz3,
  referencia: ReferenciaRetangular,
  saliencias: { marquise: number | null; varanda: number | null } = { marquise: null, varanda: null },
  opcoes: OpcoesFachada = {},
) {
  return pintavelNaCalibracao({ zonas: zonasNaCalibracao(zonas, base), centro: centroNaCalibracao(FOTO, referencia), saliencias, opcoes });
}
const arred = (n: number) => Math.round(n * 100) / 100;

describe('a área da margem é a área do ecrã', () => {
  const t = toques(true);
  const cal = calibrar(t.ref, t.verticais, t.horizontais);
  // Uma fachada com tudo: contorno, R/C, janelas, uma coluna de marquises com os vidros, varandas.
  const zonas: Zona[] = [
    desenhar('c', 'fachada', [-1, 0, 9, 15], cal),
    desenhar('rc', 'rc', [-1, 0, 9, 3.8], cal),
    desenhar('j1', 'vao', [2.5, 5, 3.7, 6.5], cal),
    desenhar('j2', 'vao', [2.5, 8, 3.7, 9.5], cal),
    desenhar('m', 'marquise', [5, 4, 7.5, 13], cal),
    desenhar('mv', 'vao', [5.3, 5, 7.2, 6.4], cal),
    desenhar('v', 'varanda', [0, 4, 1.8, 13], cal),
  ];
  const saliencias = { marquise: 1.2, varanda: 1 };

  it.each([
    { incluirRC: true, salienciaMarquisesM: 1.2, vidrosLateraisMarquisesM2: 2 },
    { incluirRC: false, salienciaMarquisesM: 1.2 },
    { incluirRC: true },
  ])('com a calibração das zonas, dá o número do passo 4 (%o)', (opcoes) => {
    const camara = camaraDaHomografia(cal.planoParaImagem, FOTO.largura, FOTO.altura, t.ref);
    // A câmara existe: a correção das frentes salientes entra mesmo nas contas.
    expect(camara).not.toBeNull();
    const sal = opcoes.salienciaMarquisesM ? saliencias : { marquise: null, varanda: null };
    const doEcra = areasDaFachada(corrigirSaliencias(zonas, camara?.centro ?? null, sal), opcoes).pintavelM2;
    // Uma calibração refeita dos mesmos toques (a que `margemDaArea` faz) e não o mesmo objeto. A da
    // margem não vem arredondada: arredondada, é a do ecrã.
    const daMargem = pintavelDe(zonas, cal.planoParaImagem, t.ref, sal, opcoes)(calibrar(t.ref, t.verticais, t.horizontais));
    expect(arred(daMargem)).toBe(doEcra);
    expect(Math.abs(daMargem - doEcra)).toBeLessThanOrEqual(0.005);
  });

  it('e a do contorno, a do passo 3', () => {
    const daMargem = contornoNaCalibracao(
      zonasNaCalibracao(
        zonas.filter((z) => z.tipo === 'fachada'),
        cal.planoParaImagem,
      ),
    )(calibrar(t.ref, t.verticais, t.horizontais));
    expect(arred(daMargem)).toBe(areasDaFachada(zonas).contornoM2);
  });

  it('com outra calibração, as zonas seguem pela fotografia: a margem sai do mesmo tamanho que pelos cantos do contorno', () => {
    const contornos = zonas.filter((z) => z.tipo === 'fachada');
    const pelaFotografia = margemDaArea(t.ref, t.verticais, t.horizontais, pintavelDe(contornos, cal.planoParaImagem, t.ref))!;
    const cantos = [projetar(-1, 0), projetar(9, 0), projetar(9, 15), projetar(-1, 15)];
    const pelosCantos = margemDaArea(t.ref, t.verticais, t.horizontais, (c) => {
      const q = cantos.map((p) => aplicar(c.imagemParaPlano, p)!);
      return Math.abs(q.reduce((s, p, i) => s + p.x * q[(i + 1) % 4]!.y - q[(i + 1) % 4]!.x * p.y, 0)) / 2;
    })!;
    expect(pelaFotografia.margemM2 / pelosCantos.margemM2).toBeGreaterThan(0.9);
    expect(pelaFotografia.margemM2 / pelosCantos.margemM2).toBeLessThan(1.1);
  });
});

describe('pelo caminho do ecrã, a margem cobre o erro real', () => {
  it.each([
    { arestas: false, semente: 21 },
    { arestas: true, semente: 22 },
  ])('σ = 1 px em todos os toques, contorno e janela desenhados na vista com erro: ≥ 85 % (arestas: $arestas)', ({ arestas, semente }) => {
    const ruido = gaussiano(semente);
    const ENSAIOS = 80;
    // Contorno de 6 × 12 m com uma janela de 1,2 × 1,5 m: 72 − 1,8 = 70,2 m² a pintar.
    const VERDADE_M2 = 70.2;
    let dentro = 0;
    for (let k = 0; k < ENSAIOS; k++) {
      const t = toques(arestas, ruido);
      const cal = calibrar(t.ref, t.verticais, t.horizontais);
      const zonas = [desenhar('c', 'fachada', [2, 1, 8, 13], cal), desenhar('j', 'vao', [3, 5, 4.2, 6.5], cal)];
      const m = margemDaArea(t.ref, t.verticais, t.horizontais, pintavelDe(zonas, cal.planoParaImagem, t.ref));
      expect(m).not.toBeNull();
      expect(arred(m!.areaM2)).toBe(areasDaFachada(zonas).pintavelM2);
      if (Math.abs(m!.areaM2 - VERDADE_M2) <= m!.margemM2) dentro++;
    }
    expect(dentro / ENSAIOS).toBeGreaterThanOrEqual(0.85);
  });
});

/**
 * Os toques com uma porta à escolha: a referência, a vertical comprida (o canto do prédio, X = 10, de
 * 0 a 16 m) e as duas horizontais (o passeio e a cimalha) — cada coordenada com o seu erro.
 */
function toquesDaPorta([l, a]: readonly [number, number], ruido: () => number = () => 0) {
  const tocar = (X: number, Y: number): Ponto => {
    const p = projetar(X, Y);
    return { x: p.x + ruido(), y: p.y + ruido() };
  };
  const ref: ReferenciaRetangular = { cantos: [tocar(0, 0), tocar(l, 0), tocar(l, a), tocar(0, a)], larguraM: l, alturaM: a };
  const vertical: [Ponto, Ponto] = [tocar(10, 0), tocar(10, 16)];
  const horizontais: [Ponto, Ponto][] = [
    [tocar(0, 0), tocar(10, 0)],
    [tocar(0, 16), tocar(10, 16)],
  ];
  return { ref, vertical, horizontais };
}
const PORTA_PEQUENA = [0.9, 2.1] as const;
const PORTA_GRANDE = [1.65, 3.77] as const;
/** O contorno de 6 × 12 m da comparação: 72 m². */
const CONTORNO: [number, number, number, number] = [2, 1, 8, 13];

/**
 * O caminho do ecrã quando se desenha antes de acertar: o contorno desenhado na vista da calibração
 * do passo 2 (só a porta, ou a porta e a vertical) e depois os acertos, um a um, cada um a levar as
 * zonas para a calibração nova (`levarZonas`, como o `useLayoutEffect` de `MedirFachada`). No fim, a
 * margem do contorno, como a do passo 3.
 */
function desenharAntesDeAcertar(t: ReturnType<typeof toquesDaPorta>, verticalNoPasso2: boolean) {
  const passo2 = verticalNoPasso2 ? [t.vertical] : [];
  let cal = calibrar(t.ref, passo2);
  let zonas = [desenhar('c', 'fachada', CONTORNO, cal)];
  const desenhadoEm = cal;
  const antes = areasDaFachada(zonas).contornoM2;
  const origens: OrigensDasZonas = new WeakMap();
  const [h1, h2] = t.horizontais as [[Ponto, Ponto], [Ponto, Ponto]];
  const acertos: [[Ponto, Ponto][], [Ponto, Ponto][]][] = [
    ...(verticalNoPasso2 ? [] : ([[[t.vertical], []]] as [[Ponto, Ponto][], [Ponto, Ponto][]][])),
    [[t.vertical], [h1]],
    [[t.vertical], [h1, h2]],
  ];
  for (const [v, h] of acertos) {
    const nova = calibrar(t.ref, v, h);
    zonas = levarZonas(zonas, cal.planoParaImagem, nova, origens);
    cal = nova;
  }
  const margem = margemDaArea(t.ref, [t.vertical], t.horizontais, contornoNaCalibracao(zonasNaCalibracao(zonas, cal.planoParaImagem)))!;
  return { antes, margem, zonas, cal, desenhadoEm };
}
const areaDoQuadrilatero = (q: Ponto[]) =>
  Math.abs(q.reduce((s, p, i) => s + p.x * q[(i + 1) % q.length]!.y - q[(i + 1) % q.length]!.x * p.y, 0)) / 2;

describe('desenhar antes de acertar: a zona levada não cresce, e a margem cobre o resultado', () => {
  it('o caso do cético: porta pequena com um canto 1 px ao lado, contorno desenhado só com ela, depois os três acertos', () => {
    let k = 0;
    // O canto superior esquerdo da porta (o 4.º) tocado 1 px à direita; tudo o resto exato.
    const t = toquesDaPorta(PORTA_PEQUENA, () => (k++ === 6 ? 1 : 0));
    const r = desenharAntesDeAcertar(t, false);
    expect(r.antes).toBeCloseTo(84.74, 1);
    // A região que se desenhou (os quatro cantos dela, levados pela fotografia à calibração final): a
    // zona tem de ter a área dela. Com a caixa, 79,07 m² contra 73,40 — +5,7 m² sem ninguém lhe tocar.
    const desenhada = desenhar('c', 'fachada', CONTORNO, r.desenhadoEm);
    const daRegiao = areaDoQuadrilatero(
      [
        [desenhada.x, desenhada.y],
        [desenhada.x + desenhada.largura, desenhada.y],
        [desenhada.x + desenhada.largura, desenhada.y + desenhada.altura],
        [desenhada.x, desenhada.y + desenhada.altura],
      ].map(([X, Y]) => aplicar(r.cal.imagemParaPlano, aplicar(r.desenhadoEm.planoParaImagem, { x: X!, y: Y! })!)!),
    );
    expect(Math.abs(r.margem.areaM2 / daRegiao - 1)).toBeLessThan(0.002);
    // E a verdade (72 m²) fica dentro da margem: 73,40 ± 3,57. Com a caixa, 79,07 ± 3,86 não a cobria.
    expect(Math.abs(r.margem.areaM2 - 72)).toBeLessThanOrEqual(r.margem.margemM2);
  });

  it.each([
    { porta: PORTA_PEQUENA, verticalNoPasso2: false, semente: 41, minimo: 0.8 },
    { porta: PORTA_PEQUENA, verticalNoPasso2: true, semente: 42, minimo: 0.85 },
    { porta: PORTA_GRANDE, verticalNoPasso2: false, semente: 43, minimo: 0.85 },
  ])(
    'σ = 1 px em todos os toques: a margem final cobre o erro do contorno ($porta.0 m, vertical no passo 2: $verticalNoPasso2)',
    ({ porta, verticalNoPasso2, semente, minimo }) => {
      // Com a caixa de antes: 7 %, 52 % e 30 % (300 ensaios). A porta pequena sozinha é o caso difícil:
      // o desenho traz o erro de uma vista com ±68 % de margem, e cobre 87 % (1000 ensaios; os outros
      // dois, 95 % e 94 %); daí o mínimo mais baixo nesse caso.
      const ruido = gaussiano(semente);
      const ENSAIOS = 80;
      let dentro = 0;
      for (let k = 0; k < ENSAIOS; k++) {
        const { margem } = desenharAntesDeAcertar(toquesDaPorta(porta, ruido), verticalNoPasso2);
        if (Math.abs(margem.areaM2 - 72) <= margem.margemM2) dentro++;
      }
      expect(dentro / ENSAIOS).toBeGreaterThanOrEqual(minimo);
    },
  );
});

describe('levarZonas: as zonas vão sempre a partir de como foram desenhadas', () => {
  const t = toquesDaPorta(PORTA_PEQUENA);
  const A = calibrar({
    ...t.ref,
    cantos: [t.ref.cantos[0], t.ref.cantos[1], t.ref.cantos[2], { ...t.ref.cantos[3], x: t.ref.cantos[3].x + 1 }],
  });
  const B = calibrar(t.ref, [t.vertical], t.horizontais);
  const C = calibrar(t.ref, [t.vertical], []);
  const zonas: Zona[] = [desenhar('c', 'fachada', CONTORNO, A), desenhar('j', 'vao', [3, 5, 4.2, 6.5], A)];

  it('ir e voltar à mesma calibração devolve as zonas exatamente como estavam — sem crescer a cada volta', () => {
    const origens: OrigensDasZonas = new WeakMap();
    let zs = zonas;
    for (let volta = 0; volta < 5; volta++) {
      zs = levarZonas(zs, A.planoParaImagem, B, origens);
      zs = levarZonas(zs, B.planoParaImagem, A, origens);
      expect(zs[0]).toBe(zonas[0]);
      expect(zs[1]).toBe(zonas[1]);
    }
  });

  it('uma série de acertos leva cada zona uma vez só, da calibração em que foi desenhada', () => {
    const origens: OrigensDasZonas = new WeakMap();
    const porC = levarZonas(levarZonas(zonas, A.planoParaImagem, B, origens), B.planoParaImagem, C, origens);
    const direto = levarZonas(zonas, A.planoParaImagem, C, new WeakMap());
    expect(porC).toEqual(direto);
  });

  it('uma zona mexida à mão passa a ser a sua própria origem', () => {
    const origens: OrigensDasZonas = new WeakMap();
    const emB = levarZonas(zonas, A.planoParaImagem, B, origens);
    const mexida = { ...emB[1]!, x: emB[1]!.x + 0.5 };
    const voltaA = levarZonas([emB[0]!, mexida], B.planoParaImagem, A, origens);
    expect(voltaA[0]).toBe(zonas[0]);
    expect(voltaA[1]).not.toBe(zonas[1]);
    expect(voltaA[1]!.x).toBeGreaterThan(zonas[1]!.x + 0.3);
  });
});

describe('um contorno pequeno: a margem não se perde no arredondamento', () => {
  it.each([0.3, 0.6, 1])('contorno quadrado de %s m de lado: a margem é a dos cantos, e não zero', (lado) => {
    const t = toquesDaPorta(PORTA_GRANDE);
    const cal = calibrar(t.ref, [t.vertical], t.horizontais);
    const quadro: [number, number, number, number] = [4, 6, 4 + lado, 6 + lado];
    const contornos = [desenhar('c', 'fachada', quadro, cal)];
    const peloEcra = margemDaArea(
      t.ref,
      [t.vertical],
      t.horizontais,
      contornoNaCalibracao(zonasNaCalibracao(contornos, cal.planoParaImagem)),
    )!;
    const cantos = [
      projetar(quadro[0], quadro[1]),
      projetar(quadro[2], quadro[1]),
      projetar(quadro[2], quadro[3]),
      projetar(quadro[0], quadro[3]),
    ];
    const pelosCantos = margemDaArea(t.ref, [t.vertical], t.horizontais, (c) =>
      areaDoQuadrilatero(cantos.map((p) => aplicar(c.imagemParaPlano, p)!)),
    )!;
    // Arredondadas ao centésimo, as áreas de 0,3 × 0,3 e 0,6 × 0,6 m davam margem zero.
    expect(peloEcra.margemM2).toBeGreaterThan(0);
    expect(peloEcra.relativa / pelosCantos.relativa).toBeGreaterThan(0.9);
    expect(peloEcra.relativa / pelosCantos.relativa).toBeLessThan(1.1);
  });
});

describe('o que se guarda entre teclas', () => {
  const t = toquesDaPorta(PORTA_GRANDE);
  const cal = calibrar(t.ref, [t.vertical], t.horizontais);
  const zonas = [
    desenhar('c', 'fachada', [-1, 0, 9, 15], cal),
    desenhar('m', 'marquise', [5, 4, 7.5, 13], cal),
    desenhar('j', 'vao', [2.5, 5, 3.7, 6.5], cal),
  ];
  const mexidas = calibracoesMexidas(t.ref, [t.vertical], t.horizontais)!;

  it('as zonas levadas e a câmara de cada calibração calculam-se uma vez', () => {
    const zonasEm = zonasNaCalibracao(zonas, cal.planoParaImagem);
    const centroEm = centroNaCalibracao(FOTO, t.ref);
    const [mais] = mexidas.pares[0]!;
    expect(zonasEm(mais)).toBe(zonasEm(mais));
    expect(centroEm(mais)).not.toBeNull();
    expect(centroEm(mais)).toBe(centroEm(mais));
  });

  it('mudar uma opção do passo 4 só refaz as contas: com as mesmas calibrações, dá o mesmo que de raiz', () => {
    const zonasEm = zonasNaCalibracao(zonas, cal.planoParaImagem);
    const centroEm = centroNaCalibracao(FOTO, t.ref);
    const saliencias = { marquise: 1.2, varanda: null };
    for (const opcoes of [
      { incluirRC: true, salienciaMarquisesM: 1.2, vidrosLateraisMarquisesM2: 2 },
      { incluirRC: false, salienciaMarquisesM: 1.2, vidrosLateraisMarquisesM2: 3 },
    ]) {
      const guardado = margemNasCalibracoes(mexidas, pintavelNaCalibracao({ zonas: zonasEm, centro: centroEm, saliencias, opcoes }))!;
      const deRaiz = margemDaArea(t.ref, [t.vertical], t.horizontais, pintavelDe(zonas, cal.planoParaImagem, t.ref, saliencias, opcoes))!;
      expect(guardado.margemM2).toBeCloseTo(deRaiz.margemM2, 9);
      expect(guardado.areaM2).toBeCloseTo(deRaiz.areaM2, 9);
    }
  });
});

describe('o texto da margem', () => {
  it('sem nada a pintar, a margem é nula e escreve-se «—», e não «± 0,1 %» nem uma percentagem do resto', () => {
    expect(textoDaMargem({ margemM2: 0, areaM2: 0 })).toBeNull();
    // Um vão do tamanho do contorno (a fachada toda envidraçada): o que sobra é um resto de vírgula
    // flutuante, que o ecrã mostra como «0,00 m²»; no ecrã, a margem saía «± 17,3 % (± 0,01 m²)».
    const t = toquesDaPorta(PORTA_GRANDE);
    const cal = calibrar(t.ref, [t.vertical], t.horizontais);
    const contorno = desenhar('c', 'fachada', [2, 1, 8, 13], cal);
    const zonas = [contorno, { ...contorno, id: 'v', tipo: 'vao' as const }];
    const m = margemDaArea(t.ref, [t.vertical], t.horizontais, pintavelDe(zonas, cal.planoParaImagem, t.ref))!;
    expect(Math.abs(m.areaM2)).toBeLessThan(0.005);
    expect(textoDaMargem(m)).toBeNull();
    expect(textoDaMargem({ margemM2: 1e-5, areaM2: 6e-5 })).toBeNull();
  });

  it('percentagem com uma casa; m² com uma casa, ou duas abaixo de 0,1', () => {
    expect(textoDaMargem({ margemM2: 4.63, areaM2: 216.4 })).toEqual({ percentagem: '± 2,1 %', m2: '± 4,6 m²' });
    // Um contorno de 0,3 × 0,3 m: «± 0,1 m²» seria mais do que a área.
    expect(textoDaMargem({ margemM2: 0.002, areaM2: 0.09 })).toEqual({ percentagem: '± 2,2 %', m2: '± 0,01 m²' });
    expect(textoDaMargem({ margemM2: 0.047, areaM2: 470 })).toEqual({ percentagem: '± 0,1 %', m2: '± 0,05 m²' });
    // Sem área à vista mas com margem: só os m².
    expect(textoDaMargem({ margemM2: 1, areaM2: 0 })).toEqual({ percentagem: null, m2: '± 1,0 m²' });
  });
});

describe('comoReduzirAMargem: só se aconselha o que faz descer o número', () => {
  const semArestas = { duasVerticais: false, duasHorizontais: false };
  const comArestas = { duasVerticais: true, duasHorizontais: true };

  const com = (relativa: number) => ({ margemM2: relativa * 200, areaM2: 200 });

  it('decide-se pelo número que se vê: «± 5,0 %» não tem aviso, «± 5,1 %» tem; sem área à vista, nunca', () => {
    expect(comoReduzirAMargem(com(0.0504), semArestas, 3)).toBeNull();
    expect(comoReduzirAMargem(com(0.0506), semArestas, 3)).not.toBeNull();
    expect(comoReduzirAMargem({ margemM2: 1, areaM2: 0 }, semArestas, 4)).toBeNull();
    expect(comoReduzirAMargem({ margemM2: 1e-5, areaM2: 6e-5 }, semArestas, 4)).toBeNull();
    expect(comoReduzirAMargem({ margemM2: Number.NaN, areaM2: 200 }, semArestas, 4)).toBeNull();
  });

  it('sem as arestas: as arestas e a referência maior, sem dizer qual reduz mais', () => {
    const t3 = comoReduzirAMargem(com(0.16), semArestas, 3)!;
    expect(t3).toContain('duas verticais compridas, longe uma da outra, e duas horizontais');
    expect(t3).toContain('«Propor as arestas»');
    expect(t3).toContain('referência maior');
    expect(t3).not.toMatch(/o que mais/);
    expect(comoReduzirAMargem(com(0.16), semArestas, 4)).toContain('voltar ao passo 3');
  });

  it('com uma vertical e duas horizontais ainda falta a segunda vertical: não diz que só a referência maior reduz', () => {
    // Avaliação de 04/11/2026: «Propor as arestas», logo por baixo da sugestão, levava a margem de ± 7,3 %
    // a ± 2,4 % com a segunda vertical, e a sugestão dizia que só uma referência maior a reduzia.
    for (const passo of [3, 4] as const) {
      const t = comoReduzirAMargem(com(0.073), { duasVerticais: false, duasHorizontais: true }, passo)!;
      expect(t).toContain('duas verticais compridas');
      expect(t).not.toMatch(/mesmo com/);
    }
  });

  it('com duas verticais e duas horizontais: a referência maior, e não rever os cantos — que muda a área, não a margem', () => {
    for (const passo of [3, 4] as const) {
      const t = comoReduzirAMargem(com(0.075), comArestas, passo)!;
      expect(t).toContain('referência maior');
      expect(t).not.toMatch(/rever os cantos/i);
    }
  });
});
