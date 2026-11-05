import { beforeAll, describe, expect, it } from 'vitest';
import { aplicar, calibrar, type Calibracao, type Ponto, type ReferenciaRetangular } from '@/domain/homografia';
import type { Zona } from '@/domain/fachadaMedida';
import { calibracoesMexidas, margemNasCalibracoes } from '@/domain/margemDaArea';
import {
  concordancia,
  DESACERTO_VISIVEL_PX,
  fraseDaInclinacao,
  fraseDasArestas,
  NOTA_MINIMA,
  notaDaReta,
  oQueFalta,
  proporArestas,
  type ArestaProposta,
  type Concordancia,
  type Inclinacao,
} from './arestasPropostas';
import { remapearZona } from './endireitar';
import {
  aleatorio,
  ALTURA,
  CAMARA_DO_TESTE,
  fotografar,
  LARGURA,
  PORTA,
  type FotoSintetica,
  type OpcoesDaCena,
  type V,
} from './fachadaSintetica';
import { comoReduzirAMargem, contornoNaCalibracao, zonasNaCalibracao } from './margem';

/**
 * A fachada dos testes (`fachadaSintetica.ts`), com as armadilhas que a avaliação de 04/11/2026 encontrou:
 * um tubo de queda inclinado 0,5° (as arestas dele são compridas e nítidas, e falham o ponto de fuga
 * vertical em ~4,5 px nas pontas), o embasamento a acompanhar uma rua inclinada 0,5° e uma caleira com
 * 0,5° de pendente. Nenhuma delas serve para acertar o endireitamento.
 */
const ARMADILHAS = { tubo: { x: 9.3, graus: 0.5 }, rua: 0.5, caleira: 0.5 };

/** As fotografias sintéticas, uma vez por cena: cada uma leva uns 2 s a desenhar. */
const fotografadas = new Map<string, FotoSintetica>();
function fotoDe(opcoes: OpcoesDaCena = {}): FotoSintetica {
  const chave = JSON.stringify({ camara: CAMARA_DO_TESTE, ...opcoes });
  let foto = fotografadas.get(chave);
  if (!foto) fotografadas.set(chave, (foto = fotografar(opcoes)));
  return foto;
}

/** Um número com distribuição normal (Box-Muller), da sequência com semente. */
const normal = (rnd: () => number) => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());

/**
 * Um caso: a porta tocada com erro (uniforme de ±`erro` px, ou normal de desvio `erro`, em cada
 * coordenada; `topo` desloca os dois cantos de cima, um erro sistemático), a calibração com ela e com as
 * `verticais` do passo 2, e o contorno desenhado como quem desenha o faz na vista endireitada — a meio
 * dos cantos verdadeiros da fachada, que com a calibração errada já não fazem um retângulo.
 */
function caso(
  foto: FotoSintetica,
  rnd: () => number,
  { erro = 2, normalmente = false, topo = { x: 0, y: 0 }, verticais = [] as [Ponto, Ponto][] } = {},
) {
  const e = () => (normalmente ? normal(rnd) : rnd() * 2 - 1) * erro;
  const tocar = (x: number, y: number, mais = { x: 0, y: 0 }): Ponto => {
    const p = foto.projetar([x, y, 0]);
    return { x: p.x + e() + mais.x, y: p.y + e() + mais.y };
  };
  const ref: ReferenciaRetangular = {
    cantos: [tocar(PORTA.x0, 0), tocar(PORTA.x1, 0), tocar(PORTA.x1, PORTA.altura, topo), tocar(PORTA.x0, PORTA.altura, topo)],
    larguraM: PORTA.x1 - PORTA.x0,
    alturaM: PORTA.altura,
  };
  const cal = calibrar(ref, verticais);
  const [a, b, c, d] = [
    [0, 0],
    [12, 0],
    [12, 18],
    [0, 18],
  ].map(([x, y]) => aplicar(cal.imagemParaPlano, foto.projetar([x!, y!, 0]))!) as [Ponto, Ponto, Ponto, Ponto];
  const x = (a.x + d.x) / 2;
  const y = (a.y + b.y) / 2;
  const contorno: Zona = { id: 'c', tipo: 'fachada', x, y, largura: (b.x + c.x) / 2 - x, altura: (c.y + d.y) / 2 - y };
  return { ref, cal, contorno, verticais };
}
type Caso = ReturnType<typeof caso>;

/** A distância (px) de um ponto da fotografia à reta (infinita) que passa por a e b. */
const distancia = (p: Ponto, a: Ponto, b: Ponto) =>
  Math.abs((b.y - a.y) * (p.x - a.x) - (b.x - a.x) * (p.y - a.y)) / Math.hypot(b.x - a.x, b.y - a.y);

/** A reta verdadeira mais perto da proposta: o maior afastamento das duas pontas a ela (px). */
function maisPerto(foto: FotoSintetica, p: ArestaProposta) {
  const servem = p.tipo === 'vertical' ? foto.verticais : foto.horizontais;
  return [...servem.map((r) => ({ r, serve: true })), ...foto.naoServem.map((r) => ({ r, serve: false }))]
    .map(({ r, serve }) => {
      const [a, b] = [foto.projetar(r.a), foto.projetar(r.b)];
      return { reta: r, serve, desvio: Math.max(distancia(p.a, a, b), distancia(p.b, a, b)) };
    })
    .sort((x, y) => x.desvio - y.desvio)[0]!;
}

/** Cada proposta sobre uma reta que serve, a menos de 0,5 px dela, e a mais de 3 px de tudo o que não serve. */
function confirmarRetas(foto: FotoSintetica, propostas: ArestaProposta[]) {
  for (const p of propostas) {
    const perto = maisPerto(foto, p);
    expect(perto.serve, `${p.tipo} mais perto de «${perto.reta.nome}»`).toBe(true);
    expect(perto.desvio, `${p.tipo} sobre «${perto.reta.nome}»`).toBeLessThan(0.5);
    for (const r of foto.naoServem) {
      const [a, b] = [foto.projetar(r.a), foto.projetar(r.b)];
      expect(Math.max(distancia(p.a, a, b), distancia(p.b, a, b)), r.nome).toBeGreaterThan(3);
    }
  }
}

const separar = (ps: ArestaProposta[]) => ({
  verticais: ps.filter((p) => p.tipo === 'vertical').map((p): [Ponto, Ponto] => [p.a, p.b]),
  horizontais: ps.filter((p) => p.tipo === 'horizontal').map((p): [Ponto, Ponto] => [p.a, p.b]),
});
const mediana = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

/** Como no ecrã: a calibração com mais arestas juntas às que já entram nela. */
const calibrarComMais = (c: Caso, existentes: { v: [Ponto, Ponto][]; h: [Ponto, Ponto][] } = { v: [], h: [] }) => {
  return (vs: [Ponto, Ponto][], hs: [Ponto, Ponto][]): Calibracao | null => {
    try {
      return calibrar(c.ref, [...c.verticais, ...existentes.v, ...vs], [...existentes.h, ...hs]);
    } catch {
      return null;
    }
  };
};

/** Quanto uma aresta vertical verdadeira (X, de 0 a 18 m) sai do prumo na vista da calibração `cal`, em m. */
function foraDoPrumo(foto: FotoSintetica, cal: Calibracao, X: number): number {
  const a = aplicar(cal.imagemParaPlano, foto.projetar([X, 0, 0]))!;
  const b = aplicar(cal.imagemParaPlano, foto.projetar([X, 18, 0]))!;
  return b.x - a.x;
}

/** O X (m) da vertical verdadeira mais perto de cada vertical proposta, por ordem. */
const xsDasVerticais = (foto: FotoSintetica, ps: ArestaProposta[]) =>
  ps
    .filter((p) => p.tipo === 'vertical')
    .map((p) => maisPerto(foto, p).reta.a[0])
    .sort((a, b) => a - b);

/**
 * Distorção radial (barril), como a de uma grande angular sem correção: o píxel p_d da fotografia vem do
 * sítio p_u = c + (p_d − c)(1 + k1·r²) da fotografia sem distorção, com r em unidades da focal.
 */
function distorcer(px: { data: Uint8ClampedArray; width: number; height: number }, k1: number) {
  const { width: W, height: H, data } = px;
  const out = new Uint8ClampedArray(data.length);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const xd = (i + 0.5 - W / 2) / 1500;
      const yd = (j + 0.5 - H / 2) / 1500;
      const k = 1 + k1 * (xd * xd + yd * yd);
      const xu = W / 2 + xd * k * 1500 - 0.5;
      const yu = H / 2 + yd * k * 1500 - 0.5;
      const x0 = Math.floor(xu);
      const y0 = Math.floor(yu);
      const fx = xu - x0;
      const fy = yu - y0;
      for (let ch = 0; ch < 4; ch++) {
        const g = (x: number, y: number) => data[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 4 + ch]!;
        out[(j * W + i) * 4 + ch] =
          (1 - fy) * ((1 - fx) * g(x0, y0) + fx * g(x0 + 1, y0)) + fy * ((1 - fx) * g(x0, y0 + 1) + fx * g(x0 + 1, y0 + 1));
      }
    }
  return { data: out, width: W, height: H };
}

/** Onde um ponto do mundo cai na fotografia com a distorção de `distorcer` (Newton no raio). */
function projetorDistorcido(projetar: (P: V) => Ponto, k1: number) {
  return (P: V): Ponto => {
    const p = projetar(P);
    const xu = (p.x - LARGURA / 2) / 1500;
    const yu = (p.y - ALTURA / 2) / 1500;
    const ru = Math.hypot(xu, yu);
    if (ru === 0) return p;
    let r = ru;
    for (let i = 0; i < 40; i++) r -= (r * (1 + k1 * r * r) - ru) / (1 + 3 * k1 * r * r);
    return { x: LARGURA / 2 + (xu * r * 1500) / ru, y: ALTURA / 2 + (yu * r * 1500) / ru };
  };
}

/** Aceitar como no ecrã: a calibração nova, o contorno levado pela fotografia, o erro da área e a margem. */
function aceitar(c: Caso, cal: Calibracao, contorno: Zona, verticais: [Ponto, Ponto][], horizontais: [Ponto, Ponto][]) {
  const nova = calibrar(c.ref, [...c.verticais, ...verticais], horizontais);
  const levado = remapearZona(contorno, cal.planoParaImagem, nova.imagemParaPlano);
  const margem = margemNasCalibracoes(
    calibracoesMexidas(c.ref, [...c.verticais, ...verticais], horizontais)!,
    contornoNaCalibracao(zonasNaCalibracao([contorno], cal.planoParaImagem)),
  )!;
  return { nova, levado, erro: Math.abs((levado.largura * levado.altura) / 216 - 1), margem: margem.relativa };
}

describe('proporArestas — a fachada sintética, com as armadilhas', () => {
  let foto: FotoSintetica;
  const casos: (Caso & { propostas: ArestaProposta[] })[] = [];
  beforeAll(() => {
    foto = fotografar(ARMADILHAS);
    const rnd = aleatorio(3);
    for (let k = 0; k < 7; k++) {
      const c = caso(foto, rnd);
      casos.push({ ...c, propostas: proporArestas(foto.pixeis, c.cal, { contornos: [c.contorno] }).propostas });
    }
  });

  it('propõe as duas verticais e as duas horizontais, a menos de 0,5 px das verdadeiras, e nenhuma armadilha', () => {
    for (const { propostas } of casos) {
      // Sem nenhuma vertical marcada, as duas de uma vez, longe uma da outra (as duas esquinas, ou uma
      // esquina e uma coluna de janelas): uma só deixa o ponto de fuga livre ao longo dela.
      expect(propostas.map((p) => p.tipo).sort()).toEqual(['horizontal', 'horizontal', 'vertical', 'vertical']);
      const [x0, x1] = xsDasVerticais(foto, propostas) as [number, number];
      expect(x1 - x0).toBeGreaterThan(0.25 * 12);
      confirmarRetas(foto, propostas);
      for (const p of propostas) {
        expect(maisPerto(foto, p).desvio).toBeLessThan(0.1);
        expect(p.confianca).toBeGreaterThan(0.5);
        expect(p.segmentos).toBeGreaterThanOrEqual(10);
      }
      // Uma horizontal em baixo e outra em cima da fachada, compridas.
      const alturas = propostas
        .filter((p) => p.tipo === 'horizontal')
        .map((p) => maisPerto(foto, p).reta.a[1])
        .sort((a, b) => a - b);
      expect(alturas[0]!).toBeLessThan(0.4 * 18);
      expect(alturas[1]!).toBeGreaterThan(0.6 * 18);
      for (const p of propostas) expect(Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y)).toBeGreaterThan(p.tipo === 'vertical' ? 600 : 400);
    }
  });

  it('aceites, o erro da área do contorno desce em mediana, e a margem desce em todos os casos', () => {
    const erros = { antes: [] as number[], depois: [] as number[] };
    for (const c of casos) {
      const { verticais, horizontais } = separar(c.propostas);
      const a = aceitar(c, c.cal, c.contorno, verticais, horizontais);
      erros.antes.push(Math.abs((c.contorno.largura * c.contorno.altura) / 216 - 1));
      erros.depois.push(a.erro);
      const antes = aceitar(c, c.cal, c.contorno, [], []).margem;
      expect(a.margem).toBeLessThan(antes / 3);
      expect(a.margem).toBeLessThan(0.06);
    }
    // Só com a porta (±2 px em 98 × 230 px), a área do contorno erra em mediana mais de 10 % (13,4 % nestes
    // sete casos); com as arestas fica o erro de escala da porta, que as arestas não corrigem (0,9 %).
    expect(mediana(erros.antes)).toBeGreaterThan(0.1);
    expect(mediana(erros.depois)).toBeLessThan(0.04);
    expect(mediana(erros.depois)).toBeLessThan(mediana(erros.antes) / 3);
  });

  it('o tubo inclinado nunca é a vertical proposta, mesmo com a esquina à vista e a vertical do passo 2 na outra', () => {
    // A avaliação de 04/11/2026: com a vertical do passo 2 em X = 0, propunha-se o tubo (confiança 0,88) em
    // vez da esquina X = 12 (0,84), e aceitar piorava a área. O tubo falha o ponto de fuga das outras retas.
    const rnd = aleatorio(11);
    const passo2: [Ponto, Ponto] = [foto.projetar([0, 0.5, 0]), foto.projetar([0, 17.5, 0])];
    for (let k = 0; k < 3; k++) {
      const c = caso(foto, rnd, { erro: 1, normalmente: true, verticais: [passo2] });
      const r = proporArestas(foto.pixeis, c.cal, {
        contornos: [c.contorno],
        existentes: { verticais: [passo2], horizontais: [] },
        calibrarCom: calibrarComMais(c),
      });
      confirmarRetas(foto, r.propostas);
      const vertical = r.propostas.find((p) => p.tipo === 'vertical')!;
      expect(maisPerto(foto, vertical).reta.a[0]).toBe(12);
      const { verticais, horizontais } = separar(r.propostas);
      expect(aceitar(c, c.cal, c.contorno, verticais, horizontais).erro).toBeLessThan(0.025);
    }
  });

  it('conta o que já lá está: só propõe o que falta, e nada quando a calibração já concorda com a fotografia', () => {
    const { cal, contorno } = casos[0]!;
    const ponta = (x: number, y: number) => foto.projetar([x, y, 0]);
    const esquinaDireita: [Ponto, Ponto] = [ponta(12, 0.5), ponta(12, 17.5)];
    const esquinaEsquerda: [Ponto, Ponto] = [ponta(0, 0.5), ponta(0, 17.5)];
    const deBaixo: [Ponto, Ponto] = [ponta(0.5, 3.5), ponta(11.5, 3.5)];
    const deCima: [Ponto, Ponto] = [ponta(0.5, 17.4), ponta(11.5, 17.4)];
    const propor = (verticais: [Ponto, Ponto][], horizontais: [Ponto, Ponto][]) =>
      proporArestas(foto.pixeis, cal, { contornos: [contorno], existentes: { verticais, horizontais } });

    // Com uma só vertical comprida, o ponto de fuga fica livre ao longo dela: propõe-se outra, longe.
    const comUma = propor([esquinaDireita], []);
    expect(comUma.faltavam).toEqual({ vertical: true, baixo: true, cima: true });
    const outra = comUma.propostas.find((p) => p.tipo === 'vertical')!;
    expect(maisPerto(foto, outra).reta.a[0]).toBeLessThan(12 * (1 - 0.25));
    // Com as duas esquinas: só as duas horizontais.
    const comDuas = propor([esquinaDireita, esquinaEsquerda], []);
    expect(comDuas.faltavam).toEqual({ vertical: false, baixo: true, cima: true });
    expect(comDuas.propostas.map((p) => p.tipo)).toEqual(['horizontal', 'horizontal']);
    // Duas verticais quase no mesmo sítio não fixam o ponto de fuga: ainda falta uma.
    expect(propor([esquinaDireita, [ponta(11.6, 0.5), ponta(11.6, 17.5)]], []).faltavam.vertical).toBe(true);
    // Já com uma horizontal em baixo: só a de cima.
    const comBaixo = propor([esquinaDireita, esquinaEsquerda], [deBaixo]);
    expect(comBaixo.faltavam).toEqual({ vertical: false, baixo: false, cima: true });
    expect(comBaixo.propostas).toHaveLength(1);
    expect(maisPerto(foto, comBaixo.propostas[0]!).reta.a[1]).toBeGreaterThan(0.6 * 18);
    // Com tudo, e a calibração dessas arestas exatas: concorda com a fotografia, e não há nada a propor.
    const tudo = { verticais: [esquinaDireita, esquinaEsquerda], horizontais: [deBaixo, deCima] };
    const calTudo = calibrar(casos[0]!.ref, tudo.verticais, tudo.horizontais);
    const contornoTudo = remapearZona(contorno, cal.planoParaImagem, calTudo.imagemParaPlano);
    const comTudo = proporArestas(foto.pixeis, calTudo, { contornos: [contornoTudo], existentes: tudo });
    expect(comTudo.propostas).toEqual([]);
    expect(comTudo.faltavam).toEqual({ vertical: false, baixo: false, cima: false });
    expect(comTudo.desacerto.vertical!).toBeLessThan(1);
    expect(comTudo.desacerto.horizontal!).toBeLessThan(1);
  });

  it('é rápida: o melhor de 3 numa fotografia de 1500 × 2000, como no ecrã, fica abaixo de 300 ms', () => {
    const c = casos[0]!;
    let melhor = Infinity;
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      proporArestas(foto.pixeis, c.cal, { contornos: [c.contorno], calibrarCom: calibrarComMais(c) });
      melhor = Math.min(melhor, performance.now() - t0);
    }
    expect(melhor).toBeLessThan(300);
  });

  it('com a porta mal tocada (σ = 3 px), as duas horizontais aparecem na mesma — e certas', () => {
    // A avaliação de 04/11/2026: com σ = 3 px, em 7 de 20 casos não saía horizontal nenhuma — as dos pisos
    // de cima ficavam 13 a 43° fora da direção que a calibração errada dava, fora do cone de entrada.
    const rnd = aleatorio(130);
    for (let k = 0; k < 6; k++) {
      const c = caso(foto, rnd, { erro: 3, normalmente: true });
      const r = proporArestas(foto.pixeis, c.cal, { contornos: [c.contorno], calibrarCom: calibrarComMais(c) });
      expect(r.propostas.filter((p) => p.tipo === 'horizontal').length, `caso ${k}`).toBeGreaterThanOrEqual(2);
      confirmarRetas(foto, r.propostas);
      const { verticais, horizontais } = separar(r.propostas);
      const antes = Math.abs((c.contorno.largura * c.contorno.altura) / 216 - 1);
      expect(aceitar(c, c.cal, c.contorno, verticais, horizontais).erro).toBeLessThan(Math.max(0.03, antes));
    }
  });

  it('com as ombreiras da porta tortas: junta as verticais que faltam para a calibração concordar com a fotografia', () => {
    // A avaliação de 04/11/2026, na fotografia do promotor: depois de aceitar, «nada a propor» com a
    // esquina do prédio 1,3° inclinada — as ombreiras curtas e tortas pesavam tanto como as arestas
    // compridas. Aqui: os cantos de cima da porta 6 px para a direita (as ombreiras 1,5° tortas) e a
    // vertical do passo 2 com 2 px de erro em cima.
    const rnd = aleatorio(31);
    for (let k = 0; k < 3; k++) {
      const passo2: [Ponto, Ponto] = [foto.projetar([0, 0.5, 0]), foto.projetar([0, 17.5, 0])];
      passo2[1] = { x: passo2[1].x + 2, y: passo2[1].y };
      const c = caso(foto, rnd, { erro: 0.5, normalmente: true, topo: { x: 6, y: 0 }, verticais: [passo2] });
      const r = proporArestas(foto.pixeis, c.cal, {
        contornos: [c.contorno],
        existentes: { verticais: [passo2], horizontais: [] },
        calibrarCom: calibrarComMais(c),
      });
      expect(r.desacerto.vertical!).toBeGreaterThan(10);
      expect(r.desacertoDepois!.vertical!).toBeLessThan(2);
      confirmarRetas(foto, r.propostas);
      const { verticais, horizontais } = separar(r.propostas);
      expect(verticais.length).toBeGreaterThanOrEqual(1);
      const a = aceitar(c, c.cal, c.contorno, verticais, horizontais);
      expect(Math.abs((c.contorno.largura * c.contorno.altura) / 216 - 1)).toBeGreaterThan(0.08);
      expect(a.erro).toBeLessThan(0.015);
      // Outra vez, com as aceites: concorda, e o ecrã diz que não há nada a propor.
      const contorno = a.levado;
      const segunda = proporArestas(foto.pixeis, a.nova, {
        contornos: [contorno],
        existentes: { verticais: [passo2, ...verticais], horizontais },
        calibrarCom: calibrarComMais(c, { v: verticais, h: horizontais }),
      });
      expect(segunda.desacerto.vertical!).toBeLessThan(DESACERTO_VISIVEL_PX);
      if (segunda.propostas.length === 0)
        expect(fraseDasArestas({ ...segunda, encontradas: 0, ficam: 0 }).titulo).toBe('Já há duas verticais e duas horizontais');
    }
  });
});

describe('proporArestas — o tubo de queda numa empena, e noutra câmara (avaliação de 05/11/2026)', () => {
  // Uma empena (poucas verticais compridas: as duas esquinas e as ombreiras da porta) com um tubo de queda
  // de 10 cm inclinado 0,5°. As duas arestas do tubo, as retas mais compridas da fotografia, provavam-se
  // uma à outra e ganhavam às esquinas: o tubo era «a vertical» em 20 de 20 casos, a esquina ficava 19 a
  // 42 cm inclinada, e a segunda procura dizia «nada a propor».
  let empena: FotoSintetica;
  beforeAll(() => {
    empena = fotografar({ poucas: true, tubo: { x: 9.3, graus: 0.5 } });
  });

  it('sem a vertical do passo 2: as verticais propostas são as duas esquinas, a vista fica a prumo e a segunda procura não propõe nada', () => {
    const rnd = aleatorio(1);
    for (let k = 0; k < 3; k++) {
      const c = caso(empena, rnd, { erro: 1, normalmente: true });
      const r = proporArestas(empena.pixeis, c.cal, { contornos: [c.contorno], calibrarCom: calibrarComMais(c) });
      confirmarRetas(empena, r.propostas);
      expect(xsDasVerticais(empena, r.propostas)).toEqual([0, 12]);
      const { verticais, horizontais } = separar(r.propostas);
      const a = aceitar(c, c.cal, c.contorno, verticais, horizontais);
      expect(a.erro).toBeLessThan(0.025);
      for (const X of [0, 12]) expect(Math.abs(foraDoPrumo(empena, a.nova, X))).toBeLessThan(0.05);
      const segunda = proporArestas(empena.pixeis, a.nova, {
        contornos: [a.levado],
        existentes: { verticais, horizontais },
        calibrarCom: calibrarComMais(c, { v: verticais, h: horizontais }),
      });
      expect(segunda.propostas).toEqual([]);
      expect(fraseDasArestas({ ...segunda, encontradas: 0, ficam: 0 }).frase).toContain('nada a propor');
    }
  });

  it('com a vertical do passo 2 numa esquina: a outra esquina, nunca o tubo', () => {
    const rnd = aleatorio(2);
    const passo2: [Ponto, Ponto] = [empena.projetar([0, 0.5, 0]), empena.projetar([0, 17.5, 0])];
    for (let k = 0; k < 3; k++) {
      const c = caso(empena, rnd, { erro: 1, normalmente: true, verticais: [passo2] });
      const r = proporArestas(empena.pixeis, c.cal, {
        contornos: [c.contorno],
        existentes: { verticais: [passo2], horizontais: [] },
        calibrarCom: calibrarComMais(c),
      });
      confirmarRetas(empena, r.propostas);
      expect(xsDasVerticais(empena, r.propostas)).toEqual([12]);
    }
  });

  it('noutra câmara, oblíqua pela esquerda, com a vertical do passo 2: um tubo a 0,35° nunca é proposto — a esquina sim', () => {
    // A avaliação de 05/11/2026: o tubo a 1,85 px do ponto de fuga verdadeiro passava a prova de 2 px e
    // ganhava à esquina pelo comprimento, em 20 de 20 casos.
    const foto = fotografar({ camara: { centro: [-10, 1.6, 14], alvo: [6, 9, 0] }, tubo: { x: 9.3, graus: 0.35 } });
    const rnd = aleatorio(1234);
    const passo2: [Ponto, Ponto] = [foto.projetar([0, 0.5, 0]), foto.projetar([0, 17.5, 0])];
    for (let k = 0; k < 3; k++) {
      const c = caso(foto, rnd, { erro: 1.5, normalmente: true, verticais: [passo2] });
      const r = proporArestas(foto.pixeis, c.cal, {
        contornos: [c.contorno],
        existentes: { verticais: [passo2], horizontais: [] },
        calibrarCom: calibrarComMais(c),
      });
      confirmarRetas(foto, r.propostas);
      expect(xsDasVerticais(foto, r.propostas)[0]).toBe(12);
    }
  });
});

describe('proporArestas — o que a fotografia não deixa provar', () => {
  it('duas arestas quase na mesma reta (a esquina até meia altura, e 3,5 cm ao lado por cima) não se propõem como uma', () => {
    // O degrau entre os quartos da reta (`DEGRAU_MAXIMO_PX`): sem ele, a reta pelo meio das duas saía
    // proposta, a 2 px de cada (verificado com a regra desligada, 05/11/2026).
    const foto = fotografar({ poucas: true, esquinaEmDuas: 0.035 });
    const rnd = aleatorio(41);
    const passo2: [Ponto, Ponto] = [foto.projetar([0, 0.5, 0]), foto.projetar([0, 17.5, 0])];
    for (let k = 0; k < 3; k++) {
      const c = caso(foto, rnd, { erro: 1, normalmente: true, verticais: [passo2] });
      const r = proporArestas(foto.pixeis, c.cal, {
        contornos: [c.contorno],
        existentes: { verticais: [passo2], horizontais: [] },
        calibrarCom: calibrarComMais(c),
      });
      expect(r.propostas.filter((p) => p.tipo === 'vertical')).toEqual([]);
      confirmarRetas(foto, r.propostas);
    }
  });

  it('com a esquina da direita escondida: propõe a da esquerda e diz, ao propor, quanto a vista fica torta do lado direito', () => {
    // O defeito #6 da avaliação de 05/11/2026, na fotografia do promotor: a primeira procura já sabia que,
    // aceites as arestas, a vista ficava 15 cm torta em 12 m de um lado, e o ecrã não o dizia. Aqui do lado
    // direito não há aresta nenhuma (a parede continua igual), e a porta foi tocada com σ = 2 px.
    const foto = fotografar({ poucas: true, esquinaEscondida: true });
    const rnd = aleatorio(21);
    let avisadas = 0;
    for (let k = 0; k < 6; k++) {
      const c = caso(foto, rnd, { erro: 2, normalmente: true });
      const r = proporArestas(foto.pixeis, c.cal, { contornos: [c.contorno], calibrarCom: calibrarComMais(c) });
      confirmarRetas(foto, r.propostas);
      expect(xsDasVerticais(foto, r.propostas)).toEqual([0]);
      const { verticais, horizontais } = separar(r.propostas);
      const a = aceitar(c, c.cal, c.contorno, verticais, horizontais);
      const foraCm = Math.abs(foraDoPrumo(foto, a.nova, 12)) * 100;
      const torta = r.desacertoDepois!.torta;
      if (torta) {
        avisadas++;
        expect(torta).toMatchObject({ tipo: 'vertical', onde: 'direita' });
        expect(Math.abs(torta.desvioCm - foraCm)).toBeLessThan(0.15 * foraCm + 3);
      } else expect(foraCm).toBeLessThan(20);
      // O ecrã confere a calibração aceite com o que a procura viu (`concordancia`), e dá o mesmo.
      const depois = concordancia(r.fotografia, a.nova, [a.levado], foto.pixeis);
      // (o contorno levado à calibração nova não é exatamente o mesmo quadrilátero da fotografia)
      expect(Math.abs(depois.vertical! - r.desacertoDepois!.vertical!)).toBeLessThan(1);
      expect(depois.torta?.onde ?? null).toBe(torta?.onde ?? null);
    }
    expect(avisadas).toBeGreaterThanOrEqual(3);
  });

  it('com a calibração exata, em quatro câmaras e com triângulos: nada a propor, e concorda', () => {
    // A avaliação de 05/11/2026: com a calibração exata, a concordância tratava o ponto de fuga das retas
    // curtas da fotografia como verdade e propunha retas que não mudavam nada (câmara rasante, triângulo
    // em baixo à direita).
    const camaras: { centro: V; alvo: V }[] = [
      { centro: [-1.5, 1.6, 17], alvo: [6.5, 9, 0] },
      { centro: [5.2, 1.6, 26], alvo: [6.2, 9, 0] },
      { centro: [-10, 1.6, 14], alvo: [6, 9, 0] },
      { centro: [-14, 1.6, 5], alvo: [6, 9, 0] },
    ];
    for (const camara of camaras) {
      const foto = fotoDe({ camara });
      const p = (x: number, y: number) => foto.projetar([x, y, 0]);
      const verticais: [Ponto, Ponto][] = [
        [p(0, 0.5), p(0, 17.5)],
        [p(12, 0.5), p(12, 17.5)],
      ];
      const horizontais: [Ponto, Ponto][] = [
        [p(0.5, 0.45), p(11.5, 0.45)],
        [p(0.5, 17.4), p(11.5, 17.4)],
      ];
      const ref: ReferenciaRetangular = {
        cantos: [p(PORTA.x0, 0), p(PORTA.x1, 0), p(PORTA.x1, PORTA.altura), p(PORTA.x0, PORTA.altura)],
        larguraM: PORTA.x1 - PORTA.x0,
        alturaM: PORTA.altura,
      };
      const cal = calibrar(ref, verticais, horizontais);
      for (const triangulo of [undefined, 'inf-dir'] as const) {
        const [a, c] = [aplicar(cal.imagemParaPlano, p(0, 0))!, aplicar(cal.imagemParaPlano, p(12, 18))!];
        const contorno = { x: a.x, y: a.y, largura: c.x - a.x, altura: c.y - a.y, ...(triangulo ? { triangulo } : {}) };
        const r = proporArestas(foto.pixeis, cal, {
          contornos: [contorno],
          existentes: { verticais, horizontais },
          calibrarCom: (vs, hs) => calibrar(ref, [...verticais, ...vs], [...horizontais, ...hs]),
        });
        expect(r.propostas, `${camara.centro.join(',')} ${triangulo ?? ''}`).toEqual([]);
        expect(r.desacerto.torta).toBeNull();
        expect(Math.max(r.desacerto.vertical ?? 0, r.desacerto.horizontal ?? 0)).toBeLessThan(1.5);
        expect(fraseDasArestas({ ...r, encontradas: 0, ficam: 0 }).titulo).toBe('Já há duas verticais e duas horizontais');
      }
    }
    // Na rasante, com o triângulo de cima à esquerda, as verticais da fotografia são três pedaços curtos
    // depois de as compridas se excluírem: não chegam para conferir nada (`PESO_MINIMO_DA_FAMILIA`; sem
    // isso, a calibração exata «discordava» 12,7 px delas). As horizontais ficam como limite conhecido:
    // curtas e quase a apontar ao ponto de fuga, que fica dentro da fotografia, «discordam» ~4 px na
    // aresta de baixo, e o ecrã cala-o porque não muda a área mais do que a margem.
    const foto = fotoDe({ camara: camaras[3]! });
    const p = (x: number, y: number) => foto.projetar([x, y, 0]);
    const verticais: [Ponto, Ponto][] = [
      [p(0, 0.5), p(0, 17.5)],
      [p(12, 0.5), p(12, 17.5)],
    ];
    const horizontais: [Ponto, Ponto][] = [
      [p(0.5, 0.45), p(11.5, 0.45)],
      [p(0.5, 17.4), p(11.5, 17.4)],
    ];
    const ref: ReferenciaRetangular = {
      cantos: [p(PORTA.x0, 0), p(PORTA.x1, 0), p(PORTA.x1, PORTA.altura), p(PORTA.x0, PORTA.altura)],
      larguraM: PORTA.x1 - PORTA.x0,
      alturaM: PORTA.altura,
    };
    const cal = calibrar(ref, verticais, horizontais);
    const [a, c] = [aplicar(cal.imagemParaPlano, p(0, 0))!, aplicar(cal.imagemParaPlano, p(12, 18))!];
    const r = proporArestas(foto.pixeis, cal, {
      contornos: [{ x: a.x, y: a.y, largura: c.x - a.x, altura: c.y - a.y, triangulo: 'sup-esq' }],
      existentes: { verticais, horizontais },
    });
    expect(r.propostas).toEqual([]);
    expect(r.desacerto.vertical ?? 0).toBeLessThan(1.5);
    expect(r.desacerto.torta?.tipo ?? 'horizontal').toBe('horizontal');
  });

  it('com muitas verticais nítidas do mesmo lado: a esquina do outro lado refina-se na mesma', () => {
    // Refinam-se as que mais segmentos apoiam e, de cada terço da largura, as primeiras desse terço. Na
    // fotografia do promotor, a aresta direita da parede branca, partida em segmentos curtos, era a 53.ª e
    // ficava de fora: sem a vertical do passo 2, a vista ficava 15 cm torta desse lado (avaliação de
    // 05/11/2026). Aqui, 18 arestas de riscas junto à esquina da esquerda tapavam a da direita.
    const foto = fotografar({ poucas: true, riscas: 9 });
    const rnd = aleatorio(5);
    const passo2: [Ponto, Ponto] = [foto.projetar([0, 0.5, 0]), foto.projetar([0, 17.5, 0])];
    for (let k = 0; k < 2; k++) {
      const c = caso(foto, rnd, { erro: 1, normalmente: true, verticais: [passo2] });
      const r = proporArestas(foto.pixeis, c.cal, {
        contornos: [c.contorno],
        existentes: { verticais: [passo2], horizontais: [] },
        calibrarCom: calibrarComMais(c),
      });
      confirmarRetas(foto, r.propostas);
      expect(xsDasVerticais(foto, r.propostas)).toEqual([12]);
    }
  });

  it('com a distorção da lente (k1 = 0,04): só se juntam retas que fazem descer o desacerto', () => {
    // A avaliação de 05/11/2026: com a calibração exata, a concordância juntava retas que deixavam o desacerto
    // igual (2,0 a 2,8 px, antes e depois). Com a distorção, as retas compridas são cordas de curvas e
    // nenhuma o tira: sem a regra, juntavam-se seis em vez de três (verificado com ela desligada).
    const k1 = 0.04;
    const foto = fotoDe();
    const pixeis = distorcer(foto.pixeis, k1);
    const proj = projetorDistorcido(foto.projetar, k1);
    const rnd = aleatorio(1);
    const tocar = (P: V, e: number): Ponto => {
      const q = proj(P);
      return { x: q.x + normal(rnd) * e, y: q.y + normal(rnd) * e };
    };
    const ref: ReferenciaRetangular = {
      cantos: [
        tocar([PORTA.x0, 0, 0], 2),
        tocar([PORTA.x1, 0, 0], 2),
        tocar([PORTA.x1, PORTA.altura, 0], 2),
        tocar([PORTA.x0, PORTA.altura, 0], 2),
      ],
      larguraM: PORTA.x1 - PORTA.x0,
      alturaM: PORTA.altura,
    };
    const passo2: [Ponto, Ponto] = [tocar([0, 0, 0], 1), tocar([0, 18, 0], 1)];
    const cal = calibrar(ref, [passo2]);
    const [a, b, c, d] = [
      [0, 0],
      [12, 0],
      [12, 18],
      [0, 18],
    ].map(([x, y]) => aplicar(cal.imagemParaPlano, proj([x!, y!, 0]))!) as [Ponto, Ponto, Ponto, Ponto];
    const x = (a.x + d.x) / 2;
    const y = (a.y + b.y) / 2;
    const contorno = { x, y, largura: (b.x + c.x) / 2 - x, altura: (c.y + d.y) / 2 - y };
    const r = proporArestas(pixeis, cal, {
      contornos: [contorno],
      existentes: { verticais: [passo2], horizontais: [] },
      calibrarCom: (vs, hs) => calibrar(ref, [passo2, ...vs], hs),
    });
    expect(r.propostas.length).toBeGreaterThanOrEqual(3);
    expect(r.propostas.length).toBeLessThanOrEqual(4);
    expect(r.desacertoDepois!.vertical!).toBeLessThan(DESACERTO_VISIVEL_PX);
  });

  it('com a porta muito mal tocada (σ = 5 px, quase de frente): nenhuma aresta de laje sai como vertical', () => {
    // A avaliação de 05/11/2026 (sementes 7 e 10): à volta de um ponto de fuga achado perto da fotografia,
    // as direções rodavam até à horizontal; três arestas de laje saíram como «verticais», uma delas também
    // como horizontal, e aceitar levou a área de −67 % a +293 522 %.
    const foto = fotoDe({ camara: { centro: [5.2, 1.6, 26], alvo: [6.2, 9, 0] } });
    for (const semente of [7, 10]) {
      const c = caso(foto, aleatorio(semente), { erro: 5, normalmente: true });
      const r = proporArestas(foto.pixeis, c.cal, { contornos: [c.contorno], calibrarCom: calibrarComMais(c) });
      confirmarRetas(foto, r.propostas);
      for (const p of r.propostas) {
        const [dx, dy] = [Math.abs(p.b.x - p.a.x), Math.abs(p.b.y - p.a.y)];
        expect(p.tipo === 'vertical' ? dy > dx : dx > dy, `${p.tipo} (${p.a.x},${p.a.y})-(${p.b.x},${p.b.y})`).toBe(true);
      }
    }
  });
});

describe('notaDaReta — a nota mínima tira as retas perto do limite em várias provas', () => {
  // A verificação de 05/11/2026: com NOTA_MINIMA = 0, os 27 testes passavam todos.
  const melhor = { residuo: 0, cobertura: 1, concordam: 6, desvio: 0, limite: 1 };
  const noLimite = { residuo: 0.6, cobertura: 0.4, concordam: 0, desvio: 1, limite: 1 };
  it('a melhor reta tem nota 1; uma no limite de todas as provas, 1/16', () => {
    expect(notaDaReta(melhor)).toBeCloseTo(1, 9);
    expect(notaDaReta(noLimite)).toBeCloseTo(1 / 16, 9);
  });
  it('perto do limite numa prova ou em duas, propõe-se; em três, não', () => {
    const numa = { ...melhor, residuo: 0.6 };
    const duas = { ...melhor, residuo: 0.6, desvio: 1 };
    const tres = { ...melhor, residuo: 0.6, desvio: 1, cobertura: 0.4 };
    expect(notaDaReta(numa)).toBeGreaterThanOrEqual(NOTA_MINIMA);
    expect(notaDaReta(duas)).toBeGreaterThanOrEqual(NOTA_MINIMA);
    expect(notaDaReta(tres)).toBeLessThan(NOTA_MINIMA);
    expect(notaDaReta(noLimite)).toBeLessThan(NOTA_MINIMA);
  });
});

describe('oQueFalta — o que as arestas marcadas fixam (a sugestão da margem conta isto)', () => {
  // A avaliação de 05/11/2026: com duas verticais juntas, ou a segunda curta, a sugestão dizia «mesmo com
  // duas verticais e duas horizontais» e escondia «Propor as arestas», que levava a margem a menos de metade.
  const projetar = fotografar({}, { data: new Uint8ClampedArray(0), width: LARGURA, height: ALTURA }).projetar;
  const p = (x: number, y: number) => projetar([x, y, 0]);
  const ref: ReferenciaRetangular = {
    cantos: [p(PORTA.x0, 0), p(PORTA.x1, 0), p(PORTA.x1, PORTA.altura), p(PORTA.x0, PORTA.altura)],
    larguraM: PORTA.x1 - PORTA.x0,
    alturaM: PORTA.altura,
  };
  const cal = calibrar(ref);
  const [a, c] = [aplicar(cal.imagemParaPlano, p(0, 0))!, aplicar(cal.imagemParaPlano, p(12, 18))!];
  const contorno = { x: a.x, y: a.y, largura: c.x - a.x, altura: c.y - a.y };
  const horizontais: [Ponto, Ponto][] = [
    [p(0.5, 0.45), p(11.5, 0.45)],
    [p(0.5, 17.4), p(11.5, 17.4)],
  ];
  const falta = (verticais: [Ponto, Ponto][]) => oQueFalta(cal, [contorno], { verticais, horizontais }, { width: LARGURA, height: ALTURA });
  const juntas: [Ponto, Ponto][] = [
    [p(4.6, 0.5), p(4.6, 17.5)],
    [p(5.9, 0.5), p(5.9, 17.5)],
  ];
  const afastadas: [Ponto, Ponto][] = [
    [p(0, 0.5), p(0, 17.5)],
    [p(12, 0.5), p(12, 17.5)],
  ];

  it('duas verticais compridas mas juntas (as arestas de uma coluna de janelas, 1,3 m), ou uma curta: ainda falta uma', () => {
    expect(falta(juntas).vertical).toBe(true);
    expect(
      falta([
        [p(0, 0.5), p(0, 17.5)],
        [p(12, 2), p(12, 5)],
      ]).vertical,
    ).toBe(true);
    expect(falta(afastadas)).toEqual({ vertical: false, baixo: false, cima: false });
  });

  it('enquanto falta, a sugestão aponta as arestas; só com as duas afastadas diz que é a referência', () => {
    const margem = { margemM2: 0.07 * 216, areaM2: 216 };
    const comJuntas = falta(juntas);
    const t = comoReduzirAMargem(margem, { duasVerticais: !comJuntas.vertical, duasHorizontais: !comJuntas.baixo && !comJuntas.cima }, 3)!;
    expect(t).not.toMatch(/mesmo com/);
    expect(t).toContain('«Propor as arestas»');
    expect(comoReduzirAMargem(margem, { duasVerticais: !falta(afastadas).vertical, duasHorizontais: true }, 3)).toMatch(/mesmo com/);
  });
});

describe('proporArestas — sem retas fiáveis, nada', () => {
  it('numa parede lisa (só a porta), não propõe nada', () => {
    const foto = fotografar({ lisa: true });
    const rnd = aleatorio(5);
    for (let k = 0; k < 2; k++) {
      const { cal, contorno } = caso(foto, rnd);
      expect(proporArestas(foto.pixeis, cal, { contornos: [contorno] }).propostas).toEqual([]);
    }
  });

  it('numa fotografia só de ruído, não propõe nada', () => {
    const rnd = aleatorio(9);
    const data = new Uint8ClampedArray(LARGURA * ALTURA * 4);
    for (let i = 0; i < data.length; i++) data[i] = i % 4 === 3 ? 255 : 128 + (rnd() - 0.5) * 120;
    const ref: ReferenciaRetangular = {
      cantos: [
        { x: 600, y: 1500 },
        { x: 700, y: 1500 },
        { x: 700, y: 1300 },
        { x: 600, y: 1300 },
      ],
      larguraM: 1,
      alturaM: 2,
    };
    const r = proporArestas({ data, width: LARGURA, height: ALTURA }, calibrar(ref), {
      contornos: [{ x: -6, y: 0, largura: 12, altura: 15 }],
    });
    expect(r.propostas).toEqual([]);
    // Com duas verticais e duas horizontais traçadas à mão, tortas 5°: sem retas fiáveis para comparar, o
    // ecrã não diz que o endireitamento concorda (avaliação de 05/11/2026).
    const t = Math.tan((5 * Math.PI) / 180);
    const verticais: [Ponto, Ponto][] = [
      [
        { x: 300, y: 1800 },
        { x: 300 + 1400 * t, y: 400 },
      ],
      [
        { x: 1200, y: 1800 },
        { x: 1200 + 1400 * t, y: 400 },
      ],
    ];
    const horizontais: [Ponto, Ponto][] = [
      [
        { x: 300, y: 1700 },
        { x: 1200, y: 1700 - 900 * t },
      ],
      [
        { x: 300, y: 500 },
        { x: 1200, y: 500 - 900 * t },
      ],
    ];
    const cal = calibrar(ref, verticais, horizontais);
    const torta = proporArestas({ data, width: LARGURA, height: ALTURA }, cal, {
      contornos: [{ x: -6, y: 0, largura: 12, altura: 15 }],
      existentes: { verticais, horizontais },
    });
    expect(torta.propostas).toEqual([]);
    expect(torta.desacerto).toEqual({ vertical: null, horizontal: null, torta: null });
    const f = fraseDasArestas({ ...torta, encontradas: 0, ficam: 0 });
    expect(f.frase).toContain('Não se encontraram na fotografia arestas fiáveis para conferir o endireitamento');
    expect(f.frase).not.toMatch(/concorda/);
  });

  it('com píxeis que não chegam, não rebenta', () => {
    const ref: ReferenciaRetangular = {
      cantos: [
        { x: 10, y: 50 },
        { x: 30, y: 50 },
        { x: 30, y: 10 },
        { x: 10, y: 10 },
      ],
      larguraM: 1,
      alturaM: 2,
    };
    expect(proporArestas({ data: new Uint8ClampedArray(16), width: 2, height: 2 }, calibrar(ref)).propostas).toEqual([]);
  });
});

describe('fraseDasArestas — o que o ecrã diz', () => {
  const falta = { vertical: true, baixo: true, cima: true };
  const nada = { vertical: false, baixo: false, cima: false };
  const concorda: Concordancia = { vertical: 0.4, horizontal: 0.2, torta: null };
  const aDireita: Inclinacao = {
    tipo: 'vertical',
    onde: 'direita',
    desvioCm: 15,
    comprimentoM: 12.04,
    graus: -0.72,
    reta: { a: { x: 1183, y: 1040 }, b: { x: 1007, y: 317 } },
  };

  it('com propostas: no plural, ficam só as que assentarem; numa só, tirá-la se não assentar', () => {
    const tres = fraseDasArestas({ encontradas: 3, ficam: 3, faltavam: falta, desacerto: concorda });
    expect(tres.titulo).toBe('Confirmar as 3 arestas propostas');
    expect(tres.frase).toContain('ficam só as que assentarem numa aresta do prédio');
    const uma = fraseDasArestas({ encontradas: 3, ficam: 1, faltavam: falta, desacerto: concorda });
    expect(uma.titulo).toBe('Confirmar a aresta proposta');
    expect(uma.frase).toContain('se não assentar numa aresta do prédio');
  });

  it('com propostas que ainda deixam a vista torta: di-lo já ao propor, de que lado e quanto', () => {
    // A avaliação de 05/11/2026: a primeira procura já sabia o desacerto que ficava, e o ecrã só o dizia se
    // se voltasse a procurar.
    const f = fraseDasArestas({ encontradas: 4, ficam: 4, faltavam: falta, desacerto: concorda, tortaDepois: aDireita });
    expect(f.frase).toContain('Mesmo com elas, a vista fica torta do lado direito, uns 15 cm fora do prumo em 12 m (0,7°)');
    expect(f.frase).toContain('não se encontrou ali uma aresta fiável');
    expect(f.frase).toContain('«Acertar o endireitamento»');
    expect(fraseDasArestas({ encontradas: 4, ficam: 1, faltavam: falta, desacerto: concorda, tortaDepois: aDireita }).frase).toContain(
      'Mesmo com ela,',
    );
  });

  it('com retas tiradas por quem mede, não afirma que não se encontrou ali aresta: aponta «Propor as arestas» primeiro', () => {
    // A verificação de 05/11/2026: depois de tirar a aresta direita da parede branca, o ecrã dizia «não se
    // encontrou ali uma aresta fiável» e mandava traçá-la à mão, quando «Propor as arestas» a voltava a propor.
    const f = fraseDasArestas({ encontradas: 5, ficam: 4, faltavam: falta, desacerto: concorda, tortaDepois: aDireita });
    expect(f.frase).toContain('Mesmo com elas, a vista fica torta do lado direito');
    expect(f.frase).not.toMatch(/não se encontrou ali/i);
    expect(f.frase).toContain('«Propor as arestas» procura-a na fotografia; se não a propuser, traçar à mão');
    // Fora da procura (depois de aceitar, de traçar à mão, de desfazer), o aviso do ecrã também não o afirma.
    const fora = fraseDaInclinacao(aDireita);
    expect(fora).not.toMatch(/não se encontrou ali/i);
    expect(fora).toContain('Para a acertar: «Propor as arestas» procura-a na fotografia');
    expect(fraseDaInclinacao(aDireita, { procurada: true })).toContain('Não se encontrou ali uma aresta fiável');
  });

  it('tiradas todas com toques: diz isso, e não que não se encontraram', () => {
    // A avaliação de 04/11/2026: depois de tirar as três, o ecrã dizia «Não se encontraram arestas fiáveis».
    const f = fraseDasArestas({ encontradas: 3, ficam: 0, faltavam: falta, desacerto: concorda });
    expect(f.titulo).toBe('Todas as arestas propostas foram tiradas');
    expect(f.titulo + f.frase).not.toMatch(/não se encontraram/i);
  });

  it('sem nada encontrado: traçar à mão; com tudo e a concordar: nada a propor', () => {
    expect(fraseDasArestas({ encontradas: 0, ficam: 0, faltavam: falta, desacerto: concorda }).titulo).toBe(
      'Não se encontraram arestas fiáveis',
    );
    expect(fraseDasArestas({ encontradas: 0, ficam: 0, faltavam: nada, desacerto: concorda }).frase).toContain('nada a propor');
  });

  it('com tudo e a vista torta: de que lado, em cm, metros e graus, e sem píxeis; «não se encontrou», e não «não há»', () => {
    // A avaliação de 05/11/2026: «As verticais da fotografia afastam-se até 7,8 px dele, e não há outra
    // aresta fiável» — uma unidade que não se via em lado nenhum, e uma afirmação falsa nessa fotografia.
    const f = fraseDasArestas({ encontradas: 0, ficam: 0, faltavam: nada, desacerto: { vertical: 7.84, horizontal: 1, torta: aDireita } });
    expect(f.titulo).toBe('A vista ainda fica torta do lado direito');
    expect(f.frase).toMatch(/^Uma vertical do prédio sai uns 15 cm fora do prumo em 12 m \(0,7°\)/);
    expect(f.frase).toContain('Não se encontrou ali uma aresta fiável');
    expect(f.frase).toContain('uma vertical comprida desse lado');
    expect(f.titulo + f.frase).not.toMatch(/px|não há/);
    expect(fraseDaInclinacao(aDireita)).toMatch(/^A vista ainda fica torta do lado direito: uma vertical do prédio sai uns 15 cm/);
    const emBaixo = fraseDaInclinacao({ ...aDireita, tipo: 'horizontal', onde: 'baixo', desvioCm: 8, comprimentoM: 11.2, graus: -0.39 });
    expect(emBaixo).toContain('em baixo: uma horizontal do prédio sai uns 8 cm fora do nível em 11 m (0,4°)');
    expect(emBaixo).toContain('uma horizontal comprida a essa altura');
  });

  it('sem retas fiáveis para conferir, não diz que concorda; com a inclinação que não mexe na área, diz isso', () => {
    // A avaliação de 05/11/2026: sem retas para comparar, `desacerto` nulo passava a 0 e dava «concorda».
    const sem = fraseDasArestas({ encontradas: 0, ficam: 0, faltavam: nada, desacerto: { vertical: null, horizontal: null, torta: null } });
    expect(sem.frase).toContain('Não se encontraram na fotografia arestas fiáveis para conferir o endireitamento');
    const so = fraseDasArestas({ encontradas: 0, ficam: 0, faltavam: nada, desacerto: { vertical: 0.3, horizontal: null, torta: null } });
    expect(so.frase).toContain('As verticais concordam');
    expect(so.frase).toContain('para as horizontais não se encontraram arestas fiáveis');
    // A verificação de 05/11/2026: com uma família sem retas, a outra «concordava» com 4,06 px de desacerto.
    const longe = fraseDasArestas({
      encontradas: 0,
      ficam: 0,
      faltavam: nada,
      desacerto: { vertical: null, horizontal: 4.06, torta: null },
    });
    expect(longe.frase).not.toContain('concordam');
    expect(longe.frase).toContain('As horizontais da fotografia ainda se afastam um pouco do endireitamento');
    expect(longe.frase).toContain('para as verticais não se encontraram arestas fiáveis');
    // O ecrã tira a `torta` que não muda a área do contorno mais do que a margem.
    const pouco = fraseDasArestas({ encontradas: 0, ficam: 0, faltavam: nada, desacerto: { vertical: 4.3, horizontal: 0.5, torta: null } });
    expect(pouco.frase).toContain('não o bastante para mudar a área do contorno mais do que a margem');
  });
});
