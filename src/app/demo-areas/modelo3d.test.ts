import { describe, expect, it } from 'vitest';
import type { TipoZona, Zona } from '@/domain/fachadaMedida';
import { enquadramento, montarModelo, VARANDA_DESENHO_M, type FaceMedida, type Poligono } from './modelo3d';

let n = 0;
const z = (tipo: TipoZona, x: number, y: number, largura: number, altura: number): Zona => ({
  id: String(n++),
  tipo,
  x,
  y,
  largura,
  altura,
});
const dim = { larguraM: 10, fundoM: 8, alturaM: 20 };
const frente: FaceMedida = { lado: 'frente', zonas: [z('fachada', 0, 0, 10, 20), z('vao', 2, 6, 2, 1.5), z('varanda', 6, 3.5, 3, 3)] };
const xs = (p: Poligono) => p.pontos.map((q) => q.x);
const ys = (p: Poligono) => p.pontos.map((q) => q.y);
/** De perfil (elevação 0) e rodado θ graus, um ponto da fachada da frente a `s` do canto e a `t` da parede cai em x = s·cos θ + t·sin θ. */
const xDeFrente = (azimute: number, s: number, t: number) =>
  s * Math.cos((azimute * Math.PI) / 180) + t * Math.sin((azimute * Math.PI) / 180);

describe('montarModelo', () => {
  it('de frente: a parede da frente à escala (10 m de largo, 20 m de alto no ecrã), sem paredes laterais', () => {
    const pols = montarModelo([frente], dim, { azimute: 0, elevacao: 0 });
    const parede = pols.find((p) => p.tipo === 'parede')!;
    expect(Math.max(...xs(parede)) - Math.min(...xs(parede))).toBeCloseTo(10, 9);
    expect(Math.max(...ys(parede)) - Math.min(...ys(parede))).toBeCloseTo(20, 9);
    expect(pols.filter((p) => p.tipo === 'parede-por-medir')).toHaveLength(0);
  });

  it('o vão fica no sítio medido da parede (2 m do canto, 6 m do chão)', () => {
    const pols = montarModelo([frente], dim, { azimute: 0, elevacao: 0 });
    const vao = pols.find((p) => p.tipo === 'vao')!;
    expect(Math.min(...xs(vao))).toBeCloseTo(2, 9);
    expect(Math.max(...ys(vao))).toBeCloseTo(-6, 9); // y do ecrã para baixo
  });

  // Até 04/11/2026 a varanda era uma caixa sólida; hoje são laje e guardas, todas do tipo 'varanda'.
  // A regra que este teste guarda é a mesma: nenhuma peça da varanda fica por baixo da parede.
  it('a varanda do 1.º andar (laje e guardas) desenha-se depois da parede onde está — não fica tapada', () => {
    const pols = montarModelo([frente], dim, { azimute: -30, elevacao: 18 });
    const parede = pols.findIndex((p) => p.tipo === 'parede');
    const varanda = pols.map((p, i) => (p.tipo === 'varanda' ? i : -1)).filter((i) => i >= 0);
    expect(varanda.length).toBeGreaterThan(0);
    for (const i of varanda) expect(i).toBeGreaterThan(parede);
  });

  it('rodado de lado, aparece a parede lateral — tracejada, porque não foi medida', () => {
    const pols = montarModelo([frente], dim, { azimute: -30, elevacao: 18 });
    expect(pols.filter((p) => p.tipo === 'parede-por-medir')).toHaveLength(1);
    expect(pols.filter((p) => p.tipo === 'topo')).toHaveLength(1);
  });

  it('uma lateral medida vai para a sua parede, com as suas zonas', () => {
    const lateral: FaceMedida = { lado: 'direita', zonas: [z('fachada', 3, 0, 8, 20), z('vao', 4, 2, 2, 2)] };
    const pols = montarModelo([frente, lateral], dim, { azimute: -30, elevacao: 18 });
    expect(pols.filter((p) => p.tipo === 'parede')).toHaveLength(2);
    expect(pols.filter((p) => p.tipo === 'vao')).toHaveLength(2);
  });

  it('de costas: a frente e o vão não se veem, e a varanda (laje e guardas) desenha-se antes do prédio que a tapa', () => {
    const pols = montarModelo([frente], dim, { azimute: 180, elevacao: 18 });
    expect(pols.some((p) => p.tipo === 'vao')).toBe(false);
    const primeiraParede = pols.findIndex((p) => p.tipo.startsWith('parede'));
    const varandas = pols.map((p, i) => (p.tipo === 'varanda' ? i : -1)).filter((i) => i >= 0);
    expect(varandas.length).toBeGreaterThan(0);
    for (const i of varandas) expect(i).toBeLessThan(primeiraParede);
  });

  it('um vão triangular desenha-se como triângulo na parede', () => {
    const comTriangulo: FaceMedida = {
      lado: 'frente',
      zonas: [z('fachada', 0, 0, 10, 20), { ...z('vao', 2, 6, 2, 2), triangulo: 'sup-dir' }],
    };
    const pols = montarModelo([comTriangulo], dim, { azimute: 0, elevacao: 0 });
    expect(pols.find((p) => p.tipo === 'vao')!.pontos).toHaveLength(3);
  });

  it('o enquadramento envolve tudo, com margem', () => {
    const pols = montarModelo([frente], dim, { azimute: 0, elevacao: 0 });
    const c = enquadramento(pols, 1);
    expect(c.largura).toBeCloseTo(12, 9);
    expect(c.altura).toBeCloseTo(22, 9);
  });
});

describe('montarModelo — varandas piso a piso', () => {
  const coluna = (altura: number, extra: Partial<FaceMedida> = {}): FaceMedida => ({
    lado: 'frente',
    zonas: [z('fachada', 0, 0, 10, 20), z('varanda', 6, 2, 3, altura)],
    ...extra,
  });
  /** As peças pela altura no ecrã, de baixo para cima (y do ecrã cresce para baixo). */
  const deBaixoParaCima = (pols: Poligono[]) => [...pols].sort((a, b) => Math.max(...ys(b)) - Math.max(...ys(a)));

  it('uma coluna de 3 × 9 m com 3 m entre pisos dá 3 lajes e 3 guardas frontais, cada uma à sua altura', () => {
    const pols = montarModelo([coluna(9, { entrePisosM: 3 })], dim, { azimute: 0, elevacao: 0 });
    // De frente só se veem as faces da frente: as guardas laterais estão de perfil e não se desenham.
    const lajes = deBaixoParaCima(pols.filter((p) => p.elemento === 'laje'));
    const guardas = deBaixoParaCima(pols.filter((p) => p.elemento === 'guarda'));
    expect(lajes).toHaveLength(3);
    expect(guardas).toHaveLength(3);
    lajes.forEach((l, i) => {
      const base = 2 + 3 * i;
      expect(Math.max(...ys(l))).toBeCloseTo(-base, 9);
      expect(Math.min(...ys(l))).toBeCloseTo(-(base + VARANDA_DESENHO_M.laje), 9);
      expect(Math.min(...xs(l))).toBeCloseTo(6, 9);
      expect(Math.max(...xs(l))).toBeCloseTo(9, 9);
    });
    guardas.forEach((g, i) => {
      const base = 2 + 3 * i + VARANDA_DESENHO_M.laje;
      expect(g.sombra).toBe(false);
      expect(Math.max(...ys(g))).toBeCloseTo(-base, 9);
      expect(Math.min(...ys(g))).toBeCloseTo(-(base + VARANDA_DESENHO_M.guarda), 9);
    });
    expect(pols.some((p) => p.tipo === 'varanda' && !p.elemento)).toBe(false); // já não há caixa sólida
  });

  // Até à revisão do cético (04/11/2026) este teste pedia 3 varandas a 10,2 m com 3 m entre pisos —
  // round(10,2 / 3). Mas 10,2 = 3 × 3 + 1,2 é uma coluna de 4 varandas desenhada tal como se vê (até
  // ao topo da última guarda): o teste guardava o defeito. A regra que fica é a mesma — sem leitura
  // vale 2,9 m, e uma leitura diferente muda a repartição.
  it('sem altura entre pisos lida, usa 2,9 m: 9,88 m (3 × 2,9 + laje + guarda) são 4 varandas; com 3,5 m lidos, 3 pisos inteiros', () => {
    const lajes = (f: FaceMedida) =>
      deBaixoParaCima(montarModelo([f], dim, { azimute: 0, elevacao: 0 }).filter((p) => p.elemento === 'laje'));
    const h = 3 * 2.9 + VARANDA_DESENHO_M.laje + VARANDA_DESENHO_M.guarda;
    const sem = lajes(coluna(h));
    expect(sem).toHaveLength(4);
    sem.forEach((l, i) => expect(Math.max(...ys(l))).toBeCloseTo(-(2 + 2.9 * i), 9));
    const lida = lajes(coluna(h, { entrePisosM: 3.5 }));
    expect(lida).toHaveLength(3);
    lida.forEach((l, i) => expect(Math.max(...ys(l))).toBeCloseTo(-(2 + (h / 3) * i), 9));
    // Uma leitura que não serve (zero, negativa) conta como não lida.
    expect(lajes(coluna(h, { entrePisosM: 0 }))).toHaveLength(4);
    expect(lajes(coluna(h, { entrePisosM: -3 }))).toHaveLength(4);
  });

  it('num troço baixo a guarda baixa e deixa 0,3 m livres até ao troço seguinte', () => {
    const pols = montarModelo([coluna(2.4, { entrePisosM: 1.2 })], dim, { azimute: 0, elevacao: 0 });
    const guardas = deBaixoParaCima(pols.filter((p) => p.elemento === 'guarda'));
    expect(guardas).toHaveLength(2);
    // Troço de 1,2 m: 0,18 de laje, 0,72 de guarda, 0,3 livres.
    expect(Math.min(...ys(guardas[0]!))).toBeCloseTo(-(2 + 1.2 - VARANDA_DESENHO_M.folgaAoPisoDeCima), 9);
  });

  it('vista de cima e de lado: cada varanda inteira (guarda do lado de lá, laje, guardas do lado de cá), de baixo para cima', () => {
    const pols = montarModelo([coluna(9, { entrePisosM: 3 })], dim, { azimute: -30, elevacao: 18 });
    const varanda = pols.filter((p) => p.tipo === 'varanda');
    // Rodada para a direita: da laje veem-se a frente, o lado direito e o tampo; das guardas, as três.
    expect(varanda).toHaveLength(18);
    const blocos = [0, 1, 2].map((i) => varanda.slice(6 * i, 6 * i + 6));
    const alturaMedia = (b: Poligono[]) => b.flatMap(ys).reduce((s, y) => s + y, 0) / b.flatMap(ys).length;
    for (const b of blocos) expect(b.map((p) => p.elemento)).toEqual(['guarda', 'laje', 'laje', 'laje', 'guarda', 'guarda']);
    expect(alturaMedia(blocos[1]!)).toBeLessThan(alturaMedia(blocos[0]!));
    expect(alturaMedia(blocos[2]!)).toBeLessThan(alturaMedia(blocos[1]!));
  });

  // O defeito que a ordenação pelo centro tinha: vista de cima, a varanda do último piso tem o centro
  // mais perto do que a marquise inteira ao lado, e a guarda dela passava por cima da frente da marquise.
  it('uma coluna de varandas à esquerda de uma coluna de marquises, vista da direita: as varandas todas antes da marquise', () => {
    const lado: FaceMedida = {
      lado: 'frente',
      entrePisosM: 3,
      zonas: [z('fachada', 0, 0, 10, 20), z('varanda', 2, 3, 3, 15), z('marquise', 5, 3, 3, 15)],
    };
    const pols = montarModelo([lado], dim, { azimute: -30, elevacao: 18 });
    const varandas = pols.map((p, i) => (p.tipo === 'varanda' ? i : -1)).filter((i) => i >= 0);
    const primeiraMarquise = pols.findIndex((p) => p.tipo === 'marquise');
    expect(varandas).toHaveLength(5 * 6);
    for (const i of varandas) expect(i).toBeLessThan(primeiraMarquise);
  });

  // Defeito encontrado por um cético (04/11/2026): o ecrã manda desenhar a coluna «de baixo a cima, tal
  // como se vê» — da base da primeira laje ao topo da última guarda, (n − 1) pisos mais laje e guarda.
  // Repartida por round(h / entrePisos), o topo (1,18 m, menos de meio piso) perdia-se: saía uma
  // varanda a menos, e as que ficavam espaçadas de h/n e não da altura entre pisos.
  it('uma coluna desenhada tal como se vê (até ao topo da última guarda) dá uma varanda por piso, de entrePisos em entrePisos', () => {
    const topo = VARANDA_DESENHO_M.laje + VARANDA_DESENHO_M.guarda;
    for (const e of [2.8, 2.9, 3.0]) {
      for (let quantas = 2; quantas <= 6; quantas++) {
        const h = (quantas - 1) * e + topo;
        const leituras: Partial<FaceMedida>[] = e === 2.9 ? [{ entrePisosM: e }, {}] : [{ entrePisosM: e }];
        for (const extra of leituras) {
          const lajes = deBaixoParaCima(
            montarModelo([coluna(h, extra)], dim, { azimute: 0, elevacao: 0 }).filter((p) => p.elemento === 'laje'),
          );
          expect(lajes, `${quantas} varandas, ${e} m entre pisos`).toHaveLength(quantas);
          lajes.forEach((l, i) => expect(Math.max(...ys(l))).toBeCloseTo(-(2 + i * e), 9));
          // A última guarda acaba no topo da coluna desenhada.
          const guardas = deBaixoParaCima(
            montarModelo([coluna(h, extra)], dim, { azimute: 0, elevacao: 0 }).filter((p) => p.elemento === 'guarda'),
          );
          expect(Math.min(...ys(guardas[guardas.length - 1]!))).toBeCloseTo(-(2 + h), 9);
        }
      }
    }
  });

  // Defeito encontrado por um cético (04/11/2026): a folga de 0,3 m é «até ao troço seguinte», e
  // descontava-se também no último troço (ou no único), onde não há troço seguinte.
  it('a guarda do último troço (ou de uma varanda sozinha) tem 1 m: não há troço acima a que deixar folga', () => {
    const sozinha = deBaixoParaCima(montarModelo([coluna(1.2)], dim, { azimute: 0, elevacao: 0 }).filter((p) => p.elemento === 'guarda'));
    expect(sozinha).toHaveLength(1);
    expect(Math.max(...ys(sozinha[0]!))).toBeCloseTo(-(2 + VARANDA_DESENHO_M.laje), 9);
    expect(Math.min(...ys(sozinha[0]!))).toBeCloseTo(-(2 + VARANDA_DESENHO_M.laje + VARANDA_DESENHO_M.guarda), 9);
    // Em série (FRASES.varanda: «a primeira varanda», «Quantas»): quatro varandas de 1,2 m, de 2,9 em 2,9 m.
    const serie: FaceMedida = {
      lado: 'frente',
      entrePisosM: 2.9,
      zonas: [z('fachada', 0, 0, 10, 20), ...[0, 1, 2, 3].map((i) => z('varanda', 6, 2 + 2.9 * i, 3, 1.2))],
    };
    const guardas = deBaixoParaCima(montarModelo([serie], dim, { azimute: 0, elevacao: 0 }).filter((p) => p.elemento === 'guarda'));
    expect(guardas).toHaveLength(4);
    for (const g of guardas) expect(Math.max(...ys(g)) - Math.min(...ys(g))).toBeCloseTo(VARANDA_DESENHO_M.guarda, 9);
  });

  // Defeito encontrado por um cético (04/11/2026): colunas desenhadas à mão sobrepõem-se uns
  // centímetros (o domínio conta com isso: FOLGA_ENCOSTADAS_M). Com 2 cm as caixas cruzam-se, não há
  // plano de separação, e a ordem voltava a ser a do centro — a guarda do último piso por cima da marquise.
  it('com as colunas sobrepostas 2 cm, a ordem é a das colunas encostadas: a mais perto de quem vê por cima', () => {
    const sobrepostas: FaceMedida = {
      lado: 'frente',
      entrePisosM: 3,
      zonas: [z('fachada', 0, 0, 10, 20), z('varanda', 2, 3, 3.02, 15), z('marquise', 5, 3, 3, 15)],
    };
    const indices = (pols: Poligono[], tipo: string) => pols.map((p, i) => (p.tipo === tipo ? i : -1)).filter((i) => i >= 0);
    // A sobreposição corta-se a meio (5,01 m), como se tivessem sido desenhadas encostadas.
    const deFrente = montarModelo([sobrepostas], dim, { azimute: 0, elevacao: 0 });
    expect(Math.max(...deFrente.filter((p) => p.elemento === 'laje').flatMap(xs))).toBeCloseTo(5.01, 9);
    expect(Math.min(...deFrente.filter((p) => p.tipo === 'marquise').flatMap(xs))).toBeCloseTo(5.01, 9);
    // Vista da direita: a marquise está mais perto, e as varandas todas antes dela.
    const daDireita = montarModelo([sobrepostas], dim, { azimute: -30, elevacao: 18 });
    expect(indices(daDireita, 'varanda')).toHaveLength(5 * 6);
    for (const i of indices(daDireita, 'varanda')) expect(i).toBeLessThan(Math.min(...indices(daDireita, 'marquise')));
    // Vista da esquerda (a frente ainda à vista, ou já de perfil): as varandas estão mais perto, e
    // cada peça que se sobrepõe à marquise no ecrã desenha-se depois dela.
    for (const azimute of [45, 60, 75, 90]) {
      const pols = montarModelo([sobrepostas], dim, { azimute, elevacao: 18 });
      const marquise = indices(pols, 'marquise');
      const caixa = (ps: Poligono[]) => ({
        x0: Math.min(...ps.flatMap(xs)),
        x1: Math.max(...ps.flatMap(xs)),
        y0: Math.min(...ps.flatMap(ys)),
        y1: Math.max(...ps.flatMap(ys)),
      });
      const m = caixa(marquise.map((i) => pols[i]!));
      const porCima = indices(pols, 'varanda').filter((i) => {
        const v = caixa([pols[i]!]);
        return Math.min(v.x1, m.x1) - Math.max(v.x0, m.x0) > 1e-6 && Math.min(v.y1, m.y1) - Math.max(v.y0, m.y0) > 1e-6;
      });
      expect(porCima.length, `azimute ${azimute}`).toBeGreaterThan(0);
      for (const i of porCima) expect(i, `azimute ${azimute}`).toBeGreaterThan(Math.max(...marquise));
    }
  });

  // O que sobra do mesmo defeito: uma sobreposição maior do que FOLGA_ENCOSTADAS_M não se corta (já
  // não é «quase encostada»), mas a ordem segue o eixo em que menos se cruzam, e não o centro — com o
  // centro, as peças do último piso saíam por cima da marquise.
  it('com as colunas sobrepostas 0,4 m (não se cortam), vista da direita: as varandas continuam antes da marquise', () => {
    const muito: FaceMedida = {
      lado: 'frente',
      entrePisosM: 3,
      zonas: [z('fachada', 0, 0, 10, 20), z('varanda', 2, 3, 3.4, 15), z('marquise', 5, 3, 3, 15)],
    };
    const pols = montarModelo([muito], dim, { azimute: -30, elevacao: 18 });
    const varandas = pols.map((p, i) => (p.tipo === 'varanda' ? i : -1)).filter((i) => i >= 0);
    expect(
      Math.max(
        ...montarModelo([muito], dim, { azimute: 0, elevacao: 0 })
          .filter((p) => p.elemento === 'laje')
          .flatMap(xs),
      ),
    ).toBeCloseTo(5.4, 9);
    expect(varandas).toHaveLength(5 * 6);
    for (const i of varandas) expect(i).toBeLessThan(pols.findIndex((p) => p.tipo === 'marquise'));
  });

  it('uma varanda triangular continua caixa (uma laje cortada na diagonal não é nada que se construa)', () => {
    const tri: FaceMedida = { lado: 'frente', zonas: [z('fachada', 0, 0, 10, 20), { ...z('varanda', 6, 2, 3, 9), triangulo: 'inf-esq' }] };
    const pols = montarModelo([tri], dim, { azimute: -30, elevacao: 18 });
    const varanda = pols.filter((p) => p.tipo === 'varanda');
    expect(varanda.length).toBeGreaterThan(0);
    expect(varanda.every((p) => p.elemento === undefined)).toBe(true);
  });
});

describe('montarModelo — vidros das marquises', () => {
  const comMarquise = (extra: Partial<FaceMedida> = {}): FaceMedida => ({
    lado: 'frente',
    zonas: [
      z('fachada', 0, 0, 10, 20),
      z('marquise', 1, 6, 3, 2.8),
      z('vao', 1.3, 6.9, 2.4, 1.5), // o vidro, desenhado por cima da frente da marquise
      z('vao', 6, 6, 2, 1.5), // uma janela na parede
    ],
    ...extra,
  });

  it('o vão dentro da marquise desenha-se depois da frente da marquise; o de fora fica na parede, antes dela', () => {
    const pols = montarModelo([comMarquise()], dim, { azimute: -30, elevacao: 18 });
    const vaos = pols.map((p, i) => (p.tipo === 'vao' ? i : -1)).filter((i) => i >= 0);
    const frenteDaMarquise = pols.findIndex((p) => p.tipo === 'marquise' && !p.sombra);
    const parede = pols.findIndex((p) => p.tipo === 'parede');
    const primeiraMarquise = pols.findIndex((p) => p.tipo === 'marquise');
    expect(vaos).toHaveLength(2);
    const [naParede, naMarquise] = vaos as [number, number];
    expect(naParede).toBeGreaterThan(parede);
    expect(naParede).toBeLessThan(primeiraMarquise);
    expect(naMarquise).toBeGreaterThan(frenteDaMarquise);
  });

  it('o vidro fica na frente da marquise (à distância da saliência) e a janela na parede', () => {
    const pols = montarModelo([comMarquise()], dim, { azimute: -30, elevacao: 0 });
    const [naParede, naMarquise] = pols.filter((p) => p.tipo === 'vao');
    expect(Math.min(...xs(naParede!))).toBeCloseTo(xDeFrente(-30, 6, 0), 9);
    expect(Math.min(...xs(naMarquise!))).toBeCloseTo(xDeFrente(-30, 1.3, 1.0), 9);
  });

  it('o vidro não aparece quando a frente da marquise está de costas ou de perfil', () => {
    for (const azimute of [180, -90, 90]) {
      const pols = montarModelo([comMarquise()], dim, { azimute, elevacao: 18 });
      expect(pols.some((p) => p.tipo === 'vao')).toBe(false);
      expect(pols.some((p) => p.tipo === 'marquise')).toBe(true);
    }
  });
});

describe('montarModelo — saliências medidas', () => {
  // De lado (azimute -90, elevação 0) a fachada da frente fica de perfil: a distância à parede vê-se
  // inteira no eixo x do ecrã (x = −t), e o ponto mais saliente de cada peça diz a profundidade.
  const maisSaliente = (pols: Poligono[], filtro: (p: Poligono) => boolean) => -Math.min(...pols.filter(filtro).flatMap(xs));
  const face = (extra: Partial<FaceMedida> = {}): FaceMedida => ({
    lado: 'frente',
    zonas: [z('fachada', 0, 0, 10, 20), z('marquise', 1, 6, 3, 2.8), z('varanda', 6, 2, 3, 9), z('vao', 1.3, 6.9, 2.4, 1.5)],
    entrePisosM: 3,
    ...extra,
  });
  const deLado = { azimute: -90, elevacao: 0 };

  it('sem medida, as ilustrativas: 1,0 m a marquise e 1,2 m a varanda', () => {
    const pols = montarModelo([face()], dim, deLado);
    expect(maisSaliente(pols, (p) => p.tipo === 'marquise')).toBeCloseTo(1.0, 9);
    expect(maisSaliente(pols, (p) => p.elemento === 'laje')).toBeCloseTo(1.2, 9);
    expect(maisSaliente(pols, (p) => p.elemento === 'guarda')).toBeCloseTo(1.2, 9);
  });

  it('com medida, manda a medida — a da marquise leva consigo os vidros', () => {
    const pols = montarModelo([face({ salienciaMarquiseM: 1.6, salienciaVarandaM: 1.9 })], dim, deLado);
    expect(maisSaliente(pols, (p) => p.tipo === 'marquise')).toBeCloseTo(1.6, 9);
    expect(maisSaliente(pols, (p) => p.elemento === 'laje')).toBeCloseTo(1.9, 9);
    expect(maisSaliente(pols, (p) => p.elemento === 'guarda')).toBeCloseTo(1.9, 9);
    const vidro = montarModelo([face({ salienciaMarquiseM: 1.6 })], dim, { azimute: -30, elevacao: 0 }).find((p) => p.tipo === 'vao')!;
    expect(Math.min(...xs(vidro))).toBeCloseTo(xDeFrente(-30, 1.3, 1.6), 9);
  });
});
