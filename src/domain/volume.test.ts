import { describe, expect, it } from 'vitest';
import { buildingVolume, FACHADAS, JANELAS_POR_OMISSAO } from './volume';

// Em três quartos (30°), cada caixa mostra três faces: é o ângulo em que se contam os pormenores.
const base = { pisos: 5, fachadas: 4, temVarandas: false, moradia: false, angulo: 30 };
const count = (v: ReturnType<typeof buildingVolume>, kind: string) => v.faces.filter((f) => f.kind === kind).length;
/** Só as faces da caixa do prédio, sem vãos nem pormenores. */
const corpo = (v: ReturnType<typeof buildingVolume>) =>
  v.faces.filter((f) => ['frente', 'lado', 'empena', 'topo'].includes(f.kind)).length;

describe('volume do prédio', () => {
  it('é igual para prédios com os mesmos dados (não identifica o prédio)', () => {
    expect(buildingVolume(base)).toEqual(buildingVolume({ ...base }));
  });

  it('cresce com o número de pisos', () => {
    const low = buildingVolume({ ...base, pisos: 2 });
    const high = buildingVolume({ ...base, pisos: 8 });
    expect(high.viewBox[3]).toBeGreaterThan(low.viewBox[3]);
    expect(high.pisosDesenhados).toBe(8);
  });

  it('limita o desenho a 20 pisos e usa valores por omissão', () => {
    expect(buildingVolume({ ...base, pisos: 40 }).pisosDesenhados).toBe(20);
    expect(buildingVolume({ ...base, pisos: null }).pisosDesenhados).toBe(4);
    expect(buildingVolume({ ...base, pisos: null, moradia: true }).pisosDesenhados).toBe(2);
    expect(buildingVolume({ ...base, pisos: 0 }).pisosDesenhados).toBe(1);
  });

  it('desenha uma varanda por piso acima do rés-do-chão', () => {
    expect(count(buildingVolume({ ...base, temVarandas: true }), 'varanda')).toBe(4 * 3);
    expect(count(buildingVolume(base), 'varanda')).toBe(0);
  });

  it('mostra vizinhos encostados em prédios em banda', () => {
    expect(count(buildingVolume(base), 'vizinho')).toBe(0);
    expect(count(buildingVolume({ ...base, fachadas: 2 }), 'vizinho')).toBe(6);
    expect(count(buildingVolume({ ...base, fachadas: 1 }), 'vizinho')).toBe(6);
    expect(count(buildingVolume({ ...base, fachadas: 3 }), 'vizinho')).toBe(3);
  });

  // Pormenores caracterizados (24/10/2026).
  it('desenha o número de janelas declarado para cada fachada', () => {
    // De frente vê-se só a fachada principal: 5 pisos × 4 janelas, menos o vão do rés-do-chão que
    // é a entrada.
    const v = buildingVolume({ ...base, angulo: 0, janelas: { frente: 4 } });
    expect(count(v, 'janela')).toBe(5 * 4 - 1);
    expect(count(v, 'porta')).toBe(1);
  });

  it('uma fachada declarada sem janelas desenha-se cega', () => {
    const v = buildingVolume({ ...base, angulo: 180, janelas: { tras: 0 } });
    expect(count(v, 'janela')).toBe(0);
  });

  it('sem declaração nenhuma, cada fachada leva o número por omissão', () => {
    const v = buildingVolume({ ...base, angulo: 90 });
    expect(count(v, 'janela')).toBe(5 * JANELAS_POR_OMISSAO);
  });

  it('o número de janelas tem tecto: não se desenham cem numa fachada', () => {
    const v = buildingVolume({ ...base, angulo: 0, janelas: { frente: 100 } });
    expect(count(v, 'janela')).toBeLessThanOrEqual(5 * 8);
  });

  it('a entrada é uma só, no rés-do-chão da fachada principal', () => {
    for (const angulo of [0, 30, 90, 180, 270]) {
      expect(count(buildingVolume({ ...base, angulo }), 'porta')).toBeLessThanOrEqual(1);
    }
    expect(count(buildingVolume({ ...base, angulo: 180 }), 'porta')).toBe(0);
  });

  it('toda a varanda leva guarda: uma por piso com varanda, nenhuma sem varandas', () => {
    expect(count(buildingVolume({ ...base, temVarandas: true }), 'grade')).toBe(4);
    expect(count(buildingVolume(base), 'grade')).toBe(0);
  });

  it('só desenha muro, beirais e palas quando foram caracterizados', () => {
    expect(count(buildingVolume(base), 'muro')).toBe(0);
    expect(count(buildingVolume(base), 'beiral')).toBe(0);
    expect(count(buildingVolume(base), 'pala')).toBe(0);
    expect(count(buildingVolume({ ...base, elementos: { muro: true } }), 'muro')).toBe(3);
    expect(count(buildingVolume({ ...base, elementos: { beirais: true } }), 'beiral')).toBe(3);
    // Uma pala por janela da fachada principal — nunca sobre a entrada — e cada pala é uma caixa,
    // de que se veem três faces em três quartos.
    expect(count(buildingVolume({ ...base, elementos: { palas: true } }), 'pala')).toBe((5 * 2 - 1) * 3);
  });

  it('os pormenores não quebram o anonimato: as mesmas declarações dão o mesmo desenho', () => {
    const declaracoes = { ...base, temVarandas: true, elementos: { muro: true, beirais: true, palas: true, metalicos: true } };
    expect(buildingVolume(declaracoes)).toEqual(buildingVolume({ ...declaracoes, elementos: { ...declaracoes.elementos } }));
  });

  it('o desenho cresce com o que foi caracterizado, nunca encolhe', () => {
    const semNada = buildingVolume(base).faces.length;
    const comTudo = buildingVolume({ ...base, temVarandas: true, elementos: { muro: true, beirais: true, palas: true } }).faces.length;
    expect(comTudo).toBeGreaterThan(semNada);
  });
});

// Rodar o volume (PIN-06, MOD-06, ECR-C04) e forma de implantação (24/10/2026).
describe('rodar o volume', () => {
  it('o ângulo muda o desenho', () => {
    expect(buildingVolume({ ...base, angulo: 40 }).faces).not.toEqual(buildingVolume(base).faces);
  });

  it('o mesmo ângulo dá sempre o mesmo desenho (continua anónimo)', () => {
    expect(buildingVolume({ ...base, angulo: 40 })).toEqual(buildingVolume({ ...base, angulo: 40 }));
  });

  it('normaliza o ângulo a [0,360): uma volta completa volta ao início', () => {
    expect(buildingVolume({ ...base, angulo: 400 }).angulo).toBe(40);
    expect(buildingVolume({ ...base, angulo: -40 }).angulo).toBe(320);
    expect(buildingVolume({ ...base, angulo: 390 }).faces).toEqual(buildingVolume(base).faces);
  });

  it('nunca desenha faces escondidas: no máximo três das seis da caixa, em qualquer ângulo', () => {
    for (const angulo of [0, 25, 90, 155, 180, 275, 340]) {
      // Rés-do-chão só: um corpo, sem vãos nem varandas.
      const v = buildingVolume({ ...base, pisos: 1, fachadas: 4, angulo });
      expect(corpo(v)).toBeGreaterThanOrEqual(2);
      expect(corpo(v)).toBeLessThanOrEqual(3);
    }
  });

  it('em três quartos vê-se duas fachadas e a cobertura; de frente, só a fachada e a cobertura', () => {
    expect(corpo(buildingVolume({ ...base, pisos: 1, fachadas: 4, angulo: 30 }))).toBe(3);
    expect(corpo(buildingVolume({ ...base, pisos: 1, fachadas: 4, angulo: 0 }))).toBe(2);
  });

  it('as janelas não desaparecem ao rodar: um prédio tem janelas de todos os lados', () => {
    // Era isto que parecia avaria (28/10/2026): os vãos só existiam na fachada da frente, e ao
    // rodar mudavam de número e de sítio até se esgotarem.
    for (const angulo of [0, 30, 90, 155, 180, 270, 340]) {
      expect(count(buildingVolume({ ...base, angulo }), 'janela')).toBeGreaterThan(0);
    }
  });

  it('cada fachada mostra as suas janelas, e só as suas', () => {
    // Uma fachada de cada vez, com um número diferente em cada: o que se vê de cada ângulo é o
    // número daquela fachada, nunca o da vizinha.
    const janelas = { frente: 1, direita: 2, tras: 3, esquerda: 4 };
    const deFrente = buildingVolume({ ...base, angulo: 0, janelas });
    // A única janela do rés-do-chão da frente é a entrada.
    expect(count(deFrente, 'janela')).toBe(5 * 1 - 1);
    expect(count(buildingVolume({ ...base, angulo: 90, janelas }), 'janela')).toBe(5 * 2);
    expect(count(buildingVolume({ ...base, angulo: 180, janelas }), 'janela')).toBe(5 * 3);
    expect(count(buildingVolume({ ...base, angulo: 270, janelas }), 'janela')).toBe(5 * 4);
  });

  it('as quatro fachadas têm nome', () => {
    expect(FACHADAS).toHaveLength(4);
  });
});

describe('forma de implantação', () => {
  it('cada forma dá um desenho diferente', () => {
    const faces = (forma: 'quadrado' | 'I' | 'L' | 'U' | 'T') => JSON.stringify(buildingVolume({ ...base, forma }).faces);
    const todas = (['quadrado', 'I', 'L', 'U', 'T'] as const).map(faces);
    expect(new Set(todas).size).toBe(5);
  });

  it('as formas compostas desenham mais corpos do que a barra', () => {
    const barra = buildingVolume({ ...base, forma: 'I' }).faces.length;
    expect(buildingVolume({ ...base, forma: 'L' }).faces.length).toBeGreaterThan(barra);
    expect(buildingVolume({ ...base, forma: 'U' }).faces.length).toBeGreaterThan(barra);
  });

  it('sem forma declarada desenha a barra, como antes', () => {
    expect(buildingVolume(base).faces).toEqual(buildingVolume({ ...base, forma: 'I' }).faces);
  });

  it('a forma não quebra o anonimato: as mesmas declarações dão o mesmo desenho', () => {
    expect(buildingVolume({ ...base, forma: 'U', angulo: 60 })).toEqual(buildingVolume({ ...base, forma: 'U', angulo: 60 }));
  });
});

describe('prédios encostados', () => {
  it('o vizinho traz a direção do esbatimento, da empena para fora; o prédio da obra não', () => {
    const v = buildingVolume({ ...base, fachadas: 2 });
    const vizinhos = v.faces.filter((f) => f.kind === 'vizinho');
    expect(vizinhos.length).toBeGreaterThan(0);
    expect(vizinhos.every((f) => f.fade)).toBe(true);
    expect(v.faces.filter((f) => f.kind !== 'vizinho').every((f) => f.fade === undefined)).toBe(true);
  });

  it('o esbatimento começa num ponto e acaba noutro (tem direção)', () => {
    const f = buildingVolume({ ...base, fachadas: 2 }).faces.find((x) => x.kind === 'vizinho');
    expect(f?.fade?.de).not.toEqual(f?.fade?.ate);
  });

  it('sem vizinhos não há esbatimento nenhum', () => {
    expect(buildingVolume({ ...base, fachadas: 4 }).faces.some((f) => f.fade)).toBe(false);
  });
});

describe('empenas', () => {
  it('só há empena onde há prédio encostado', () => {
    const tem = (fachadas: number) => buildingVolume({ ...base, fachadas, angulo: 30 }).faces.some((f) => f.kind === 'empena');
    expect(tem(4)).toBe(false);
    expect(tem(2)).toBe(true);
  });

  it('a empena é do prédio da obra, não do vizinho: não se desvanece', () => {
    const empenas = buildingVolume({ ...base, fachadas: 2, angulo: 210 }).faces.filter((f) => f.kind === 'empena');
    expect(empenas.length).toBeGreaterThan(0);
    expect(empenas.every((f) => f.fade === undefined)).toBe(true);
  });
});

describe('o volume à escala do prédio', () => {
  // «A alteração de largura, profundidade ou altura deve atualizar o modelo» (promotor, 30/10/2026).
  const base = { pisos: 4, fachadas: 4, temVarandas: false, moradia: false, forma: 'I' as const, angulo: 0 };

  const larguraDesenhada = (v: ReturnType<typeof buildingVolume>) => {
    const [a, b] = v.cotas.largura;
    return Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 100) / 100;
  };

  it('a frente medida é a frente desenhada', () => {
    const v = buildingVolume({ ...base, escala: { larguraM: 18, profundidadeM: 9, peDireitoM: 2.9 } });
    expect(larguraDesenhada(v)).toBeCloseTo(18, 1);
  });

  it('mudar a medida muda o desenho', () => {
    const estreito = buildingVolume({ ...base, escala: { larguraM: 9, profundidadeM: 9, peDireitoM: 2.9 } });
    const largo = buildingVolume({ ...base, escala: { larguraM: 27, profundidadeM: 9, peDireitoM: 2.9 } });
    expect(larguraDesenhada(largo) / larguraDesenhada(estreito)).toBeCloseTo(3, 1);
  });

  it('o pé-direito manda na altura, e a altura no desenho', () => {
    const baixo = buildingVolume({ ...base, escala: { larguraM: 18, profundidadeM: 9, peDireitoM: 2.5 } });
    const alto = buildingVolume({ ...base, escala: { larguraM: 18, profundidadeM: 9, peDireitoM: 3.5 } });
    expect(baixo.alturaDesenhada).toBe(10);
    expect(alto.alturaDesenhada).toBe(14);
  });

  it('sem fundo medido, o fundo acompanha a largura e não se inventa uma medida', () => {
    const v = buildingVolume({ ...base, escala: { larguraM: 18, profundidadeM: null, peDireitoM: 2.9 } });
    const semEscala = buildingVolume(base);
    const razao = (x: ReturnType<typeof buildingVolume>) => {
      const [a, b] = x.cotas.profundidade;
      const [c, d] = x.cotas.largura;
      return Math.hypot(b[0] - a[0], b[1] - a[1]) / Math.hypot(d[0] - c[0], d[1] - c[1]);
    };
    // A proporção entre fundo e frente é a canónica: o desenho não afirma nada sobre o fundo.
    expect(razao(v)).toBeCloseTo(razao(semEscala), 2);
  });

  it('sem escala nenhuma, o desenho é o de sempre', () => {
    const antes = buildingVolume(base);
    expect(antes.alturaDesenhada).toBe(12);
    expect(antes.faces.length).toBeGreaterThan(0);
  });
});
