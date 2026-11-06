import { describe, expect, it } from 'vitest';
import {
  TRAVESSIA,
  disporChamadas,
  travessiaPermitida,
  problemasDasLigacoes,
  segmentoTocaCaixa,
  segmentosCruzam,
  travessiasDaLigacao,
  type Chamada,
  type EntradaDasChamadas,
  type Ponto,
} from './chamadas';
import { entradaDoVolume, pranchetaLarga, type ZonaParaDesenho } from './prancheta';
import { buildingVolume, type Forma } from './volume';

/**
 * A regra do juiz (05/11/2026): as ligações das chamadas nunca cruzam cotas nem cortam as faces do
 * prédio na diagonal. O ecrã só desenha chamadas que `disporChamadas` aceite; estes testes garantem
 * que ela não aceita as que a maqueta B desenhava.
 */

const base = (o: Partial<EntradaDasChamadas> = {}): EntradaDasChamadas => ({
  largura: 1000,
  altura: 400,
  coluna: 260,
  corredor: 32,
  centroX: 500,
  pinos: [],
  alturas: {},
  obstaculos: { segmentos: [], caixas: [] },
  ...o,
});

/** Todos os troços de todas as ligações são horizontais ou verticais. */
const ortogonais = (cs: readonly Chamada[]) =>
  cs.every((c) => c.pontos.slice(1).every((p, i) => p[0] === c.pontos[i]![0] || p[1] === c.pontos[i]![1]));

describe('geometria de base', () => {
  it('dois segmentos que se cruzam, que se tocam e que não se tocam', () => {
    expect(segmentosCruzam([0, 0], [10, 10], [0, 10], [10, 0])).toBe(true);
    expect(segmentosCruzam([0, 0], [10, 0], [10, 0], [10, 10])).toBe(true); // tocam-se na ponta
    expect(segmentosCruzam([0, 0], [10, 0], [0, 1], [10, 1])).toBe(false); // paralelos
    expect(segmentosCruzam([0, 0], [4, 0], [5, -5], [5, 5])).toBe(false); // não chega
  });

  it('um segmento que atravessa, entra ou passa ao lado de um retângulo', () => {
    const k = { x: 10, y: 10, w: 20, h: 10 };
    expect(segmentoTocaCaixa([0, 15], [40, 15], k)).toBe(true);
    expect(segmentoTocaCaixa([0, 15], [12, 15], k)).toBe(true);
    expect(segmentoTocaCaixa([0, 5], [40, 5], k)).toBe(false);
  });
});

describe('o que a regra recusa', () => {
  it('uma ligação em diagonal, como as da maqueta B', () => {
    const e = base({ pinos: [{ id: 'z3', p: [480, 140] }], alturas: { z3: 80 } });
    const diagonal: Chamada = {
      id: 'z3',
      lado: 'esq',
      topo: 200,
      pontos: [
        [260, 222],
        [274, 222],
        [480, 140],
      ],
    };
    expect(problemasDasLigacoes([diagonal], e)).toContain('z3: troço na diagonal');
  });

  it('uma ligação que atravessa a cota da altura', () => {
    // A cota da altura à esquerda do prédio, de alto a baixo — onde a maqueta B a tinha.
    const cota: [Ponto, Ponto] = [
      [330, 60],
      [330, 360],
    ];
    const e = base({ pinos: [{ id: 'z1', p: [400, 150] }], alturas: { z1: 80 }, obstaculos: { segmentos: [cota], caixas: [] } });
    const reta: Chamada = {
      id: 'z1',
      lado: 'esq',
      topo: 128,
      pontos: [
        [260, 150],
        [400, 150],
      ],
    };
    expect(problemasDasLigacoes([reta], e)).toContain('z1: cruza uma cota');
  });

  it('uma ligação que passa pelo texto de uma cota ou por cima de outro número', () => {
    const e = base({
      pinos: [
        { id: 'z1', p: [450, 150] },
        { id: 'z2', p: [400, 150] },
      ],
      alturas: { z1: 80, z2: 80 },
      obstaculos: { segmentos: [], caixas: [{ x: 300, y: 140, w: 40, h: 20 }] },
    });
    const c: Chamada = {
      id: 'z1',
      lado: 'esq',
      topo: 128,
      pontos: [
        [260, 150],
        [450, 150],
      ],
    };
    const p = problemasDasLigacoes([c], e);
    expect(p).toContain('z1: passa pelo texto de uma cota');
    expect(p).toContain('z1: passa pelo número de z2');
  });

  it('com a cota a fechar os dois lados, não há chamadas: fica o modo lista', () => {
    const e = base({
      pinos: [
        { id: 'z1', p: [420, 150] },
        { id: 'z2', p: [580, 250] },
      ],
      alturas: { z1: 80, z2: 80 },
      obstaculos: {
        segmentos: [
          [
            [320, 0],
            [320, 400],
          ],
          [
            [680, 0],
            [680, 400],
          ],
        ],
        caixas: [],
      },
    });
    expect(disporChamadas(e)).toBeNull();
  });

  it('mais de seis zonas, nunca: o desenho deixa de se ler', () => {
    const pinos = Array.from({ length: 7 }, (_, i) => ({ id: `z${i}`, p: [400 + i * 20, 60 + i * 40] as Ponto }));
    expect(disporChamadas(base({ pinos, alturas: Object.fromEntries(pinos.map((p) => [p.id, 40])) }))).toBeNull();
  });
});

describe('a zona de outro número (cético, 05/11/2026)', () => {
  // A fachada (z1) ocupa o meio da prancheta, de 400 a 600; a empena (z2) está à direita dela.
  const faces = [
    {
      zona: 'z1',
      pontos: [
        [400, 100],
        [600, 100],
        [600, 300],
        [400, 300],
      ] as Ponto[],
    },
    {
      zona: 'z2',
      pontos: [
        [600, 100],
        [680, 60],
        [680, 260],
        [600, 300],
      ] as Ponto[],
    },
    {
      zona: 'z3',
      pontos: [
        [440, 190],
        [560, 190],
        [560, 210],
        [440, 210],
      ] as Ponto[],
    }, // uma laje, por cima da fachada
  ];
  const e = base({
    pinos: [
      { id: 'z2', p: [640, 200] },
      { id: 'z3', p: [452, 200] },
    ],
    alturas: { z2: 80, z3: 80 },
    faces,
  });

  it('uma ligação que corre por cima da fachada inteira até ao número da empena é recusada', () => {
    const pelaEsquerda: Chamada = {
      id: 'z2',
      lado: 'esq',
      topo: 160,
      pontos: [
        [260, 200],
        [640, 200],
      ],
    };
    // 80 px de fachada à vista (os outros 120 estão debaixo da laje das varandas, que também não é dela).
    const problemas = problemasDasLigacoes([pelaEsquerda], e);
    expect(problemas).toContain('z2: atravessa a zona z1 (80 px)');
    expect(problemas).toContain('z2: atravessa a zona z3 (120 px)');
  });

  it('o bocado curto que leva às varandas, por cima da fachada onde assentam, passa', () => {
    const varandas: Chamada = {
      id: 'z3',
      lado: 'esq',
      topo: 160,
      pontos: [
        [260, 200],
        [452, 200],
      ],
    };
    // Da esquina da fachada (400) à laje (440): 40 px, menos o bocado debaixo do próprio número.
    const t = travessiasDaLigacao(varandas, faces, 13);
    expect(Object.keys(t)).toEqual(['z1']);
    expect(t.z1).toBeGreaterThan(35);
    expect(t.z1).toBeLessThan(TRAVESSIA);
    expect(problemasDasLigacoes([varandas], e)).toEqual([]);
    const pelaDireita: Chamada = {
      id: 'z2',
      lado: 'dir',
      topo: 160,
      pontos: [
        [740, 200],
        [640, 200],
      ],
    };
    expect(problemasDasLigacoes([pelaDireita], e)).toEqual([]);
  });

  it('sem saída que não atravesse outra zona, não há chamadas: fica o modo lista', () => {
    // A empena tapada pela direita por uma face do muro: só se chega a ela por cima da fachada ou do muro.
    const tapada = {
      ...e,
      faces: [
        ...faces,
        {
          zona: 'z4',
          pontos: [
            [680, 0],
            [740, 0],
            [740, 400],
            [680, 400],
          ] as Ponto[],
        },
      ],
      pinos: [e.pinos[0]!],
    };
    expect(disporChamadas(tapada)).toBeNull();
  });

  it('a travessia permitida é no máximo um terço da zona atravessada', () => {
    expect(travessiaPermitida('z1', faces)).toBe(Math.min(TRAVESSIA, 200 / 3));
    expect(travessiaPermitida('z3', faces)).toBe(40);
    expect(travessiaPermitida('nenhuma', faces)).toBe(TRAVESSIA);
  });
});

describe('o que a regra aceita', () => {
  it('números perto uns dos outros: os cartões não se tocam, e o degrau fica no corredor', () => {
    const e = base({
      pinos: [
        { id: 'a', p: [420, 150] },
        { id: 'b', p: [440, 180] },
      ],
      alturas: { a: 90, b: 90 },
    });
    const d = disporChamadas(e)!;
    expect(d).not.toBeNull();
    const [a, b] = ['a', 'b'].map((id) => d.chamadas.find((c) => c.id === id)!);
    expect(b!.topo).toBeGreaterThanOrEqual(a!.topo + 90 + 12);
    expect(b!.pontos).toHaveLength(4);
    expect(b!.pontos[1]![0]).toBeGreaterThan(260);
    expect(b!.pontos[1]![0]).toBeLessThan(260 + 32);
    expect(ortogonais(d.chamadas)).toBe(true);
    expect(problemasDasLigacoes(d.chamadas, e)).toEqual([]);
  });

  it('um número que não tem saída pelo seu lado vai pelo outro', () => {
    // Uma cota à esquerda, de alto a baixo: o número da esquerda tem de ser chamado pela direita.
    const e = base({
      pinos: [{ id: 'z1', p: [420, 150] }],
      alturas: { z1: 80 },
      obstaculos: {
        segmentos: [
          [
            [320, 0],
            [320, 400],
          ],
        ],
        caixas: [],
      },
    });
    const d = disporChamadas(e)!;
    expect(d.chamadas[0]!.lado).toBe('dir');
  });
});

describe('o prédio das maquetas: 4 pisos, 2 fachadas, varandas e muro, 12 × 10 m, pé-direito 2,8', () => {
  const zonas: ZonaParaDesenho[] = [
    { id: 'z1', kind: 'fachada', participacao: 'incluida' },
    { id: 'z2', kind: 'empena', participacao: 'incluida' },
    { id: 'z3', kind: 'varandas', participacao: 'por_decidir' },
    { id: 'z4', kind: 'muro', participacao: 'excluida' },
  ];
  const predio = { pisos: 4, fachadas: 2, temVarandas: true, moradia: false, forma: null, janelas: { frente: 4, esquerda: 0, direita: 0, tras: 4 } };
  // Uma fachada e uma empena: dois alçados, por isso já há planta (a banda, enquanto ninguém escolhe).
  const volume = buildingVolume(entradaDoVolume(predio, zonas, { larguraM: 12, profundidadeM: 10, peDireitoM: 2.8 }));
  const textos = { frente: '≈ 12 m', fundo: '≈ 10 m', altura: '≈ 11,2 m' };
  const alturas = { z1: 90, z2: 90, z3: 156, z4: 112 };

  for (const largura of [1016, 1040, 1052, 1200, 1352]) {
    it(`a ${largura} px há chamadas, e nenhuma ligação cruza uma cota nem corta uma face na diagonal`, () => {
      const p = pranchetaLarga(volume, zonas, textos, { largura, alturas, alturaMaxima: 340 });
      expect(p.disposicao).not.toBeNull();
      const cs = p.disposicao!.chamadas;
      // O muro está fora do pedido: fica com o número no desenho e o cartão em «Fora do pedido».
      expect(cs.map((c) => c.id).sort()).toEqual(['z1', 'z2', 'z3']);
      expect(ortogonais(cs)).toBe(true);
      // A fachada e as varandas chamam-se pela esquerda; a empena pela direita.
      expect(Object.fromEntries(cs.map((c) => [c.id, c.lado]))).toEqual({ z1: 'esq', z3: 'esq', z2: 'dir' });
      // Os cartões cabem na altura do desenho: a prancheta não estica e não fica um vazio por cima de um cartão.
      expect(p.disposicao!.altura).toBeCloseTo(p.alturaDoDesenho, 5);
    });
  }

  it('o bloco «Fora do pedido» vai para o fundo da coluna que tem lugar, sem esticar a prancheta', () => {
    const p = pranchetaLarga(volume, zonas, textos, { largura: 1100, alturas, alturaMaxima: 340, rodape: 150 });
    const d = p.disposicao!;
    expect(d.rodape).not.toBeNull();
    const col = d.chamadas.filter((c) => c.lado === d.rodape!.lado);
    for (const c of col) expect(d.rodape!.topo).toBeGreaterThanOrEqual(c.topo + alturas[c.id as keyof typeof alturas] + 12);
    expect(d.rodape!.topo + 150).toBeLessThanOrEqual(d.altura);
    expect(d.altura).toBeCloseTo(p.alturaDoDesenho, 5);
    // Alto demais para caber: vai para debaixo da prancheta.
    expect(pranchetaLarga(volume, zonas, textos, { largura: 1100, alturas, alturaMaxima: 340, rodape: 400 }).disposicao!.rodape).toBeNull();
  });

  it('as chamadas desenham a frente e o fundo; a altura fica na linha do prédio', () => {
    const p = pranchetaLarga(volume, zonas, textos, { largura: 1052, alturas });
    expect(p.desenho.cotas.map((c) => c.eixo)).toEqual(['frente', 'fundo']);
  });

  it('com as cotas onde a maqueta B as tinha (a altura à esquerda), a fachada não se chama pela esquerda', () => {
    const p = pranchetaLarga(volume, zonas, textos, { largura: 1052, alturas });
    const fachada = p.desenho.pinos.find((x) => x.id === 'z1')!.p;
    const px: Ponto = [fachada[0] * p.escala + p.dx, fachada[1] * p.escala + p.dy];
    // Uma cota vertical entre a coluna da esquerda e a fachada, da altura do prédio.
    const cotaB: [Ponto, Ponto] = [
      [px[0] - 30, px[1] - 200],
      [px[0] - 30, px[1] + 200],
    ];
    const reta: Chamada = { id: 'z1', lado: 'esq', topo: px[1] - 23, pontos: [[p.coluna, px[1]], px] };
    expect(
      problemasDasLigacoes(
        [reta],
        base({ largura: 1052, coluna: p.coluna, pinos: [{ id: 'z1', p: px }], alturas, obstaculos: { segmentos: [cotaB], caixas: [] } }),
      ),
    ).toContain('z1: cruza uma cota');
  });
});

describe('prédios em L, em U, em T e altos (o cético só tinha visto o prédio em I)', () => {
  const zonas: ZonaParaDesenho[] = [
    { id: 'z1', kind: 'fachada', participacao: 'incluida' },
    { id: 'z2', kind: 'empena', participacao: 'incluida' },
    { id: 'z3', kind: 'varandas', participacao: 'por_decidir' },
    { id: 'z4', kind: 'muro', participacao: 'excluida' },
  ];
  const alturas = { z1: 90, z2: 90, z3: 140, z4: 130 };
  const textos = { frente: '≈ 12 m', fundo: '≈ 10 m', altura: '≈ 11,2 m' };

  for (const forma of [null, 'quadrado', 'L', 'U', 'T'] as (Forma | null)[]) {
    for (const pisos of [2, 4, 12, 20]) {
      it(`${forma ?? 'I'}, ${pisos} pisos: nenhuma ligação atravessa outra zona`, () => {
        const predio = { pisos, fachadas: 2, temVarandas: true, moradia: false, forma, janelas: { frente: 4, tras: 4 } };
        const v = buildingVolume(entradaDoVolume(predio, zonas, { larguraM: 12, profundidadeM: 10, peDireitoM: 2.8 }));
        const p = pranchetaLarga(v, zonas, textos, { largura: 1100, alturas, alturaMaxima: 340 });
        expect(p.disposicao).not.toBeNull();
        for (const c of p.disposicao!.chamadas) {
          for (const [z, px] of Object.entries(travessiasDaLigacao(c, p.faces, 13))) {
            expect(px).toBeLessThanOrEqual(travessiaPermitida(z, p.faces));
            expect(px).toBeLessThanOrEqual(TRAVESSIA);
          }
        }
        // A empena chama-se sempre pela direita: pela esquerda, a ligação atravessava a fachada inteira.
        expect(p.disposicao!.chamadas.find((c) => c.id === 'z2')!.lado).toBe('dir');
      });
    }
  }

  it('em L com 12 pisos, a ligação da empena pela esquerda — a que o cético viu — é recusada', () => {
    const predio = { pisos: 12, fachadas: 2, temVarandas: true, moradia: false, forma: 'L' as const, janelas: { frente: 4, tras: 4 } };
    const v = buildingVolume(entradaDoVolume(predio, zonas, { larguraM: 12, profundidadeM: 10, peDireitoM: 2.8 }));
    const p = pranchetaLarga(v, zonas, textos, { largura: 1100, alturas, alturaMaxima: 340 });
    const pino = p.desenho.pinos.find((x) => x.id === 'z2')!.p;
    const px: Ponto = [pino[0] * p.escala + p.dx, pino[1] * p.escala + p.dy];
    const pelaEsquerda: Chamada = { id: 'z2', lado: 'esq', topo: px[1] - 45, pontos: [[p.coluna, px[1]], px] };
    const problemas = problemasDasLigacoes(
      [pelaEsquerda],
      base({ largura: 1100, coluna: p.coluna, pinos: [{ id: 'z2', p: px }], alturas, faces: p.faces }),
    );
    expect(
      problemas.some((x) => x.startsWith('z2: atravessa a zona z1')),
      problemas.join(' | '),
    ).toBe(true);
  });
});

describe('as chamadas por ângulo (06/11/2026): o prédio roda, as ligações refazem-se', () => {
  const zonas: ZonaParaDesenho[] = [
    { id: 'z1', kind: 'fachada', participacao: 'incluida' },
    { id: 'z2', kind: 'empena', participacao: 'incluida' },
    { id: 'z3', kind: 'varandas', participacao: 'por_decidir' },
    { id: 'z4', kind: 'muro', participacao: 'excluida' },
  ];
  const alturas = { z1: 90, z2: 90, z3: 140, z4: 130 };
  const textos = { frente: '≈ 12 m', fundo: '≈ 10 m', altura: '≈ 11,2 m' };

  for (const forma of [null, 'quadrado', 'L', 'U', 'T'] as (Forma | null)[]) {
    it(`${forma ?? 'I'}: a qualquer ângulo, ou há ligações que cumprem a regra toda, ou fica o modo lista — nunca uma ligação má`, () => {
      let comChamadas = 0;
      let total = 0;
      for (let angulo = 0; angulo < 360; angulo += 5) {
        const predio = { pisos: 4, fachadas: 2, temVarandas: true, moradia: false, forma, janelas: { frente: 4, tras: 4 } };
        const v = buildingVolume(entradaDoVolume(predio, zonas, { larguraM: 12, profundidadeM: 10, peDireitoM: 2.8 }, angulo));
        const p = pranchetaLarga(v, zonas, textos, { largura: 1100, alturas, alturaMaxima: 340 });
        total++;
        if (!p.disposicao) continue;
        comChamadas++;
        const onde = `${forma ?? 'I'} ${angulo}°`;
        // Só as zonas do pedido que se veem nesta vista têm ligação, e todas têm.
        const visiveis = p.desenho.pinos.map((x) => x.id).filter((id) => id !== 'z4');
        expect(p.disposicao.chamadas.map((c) => c.id).sort(), onde).toEqual(visiveis.sort());
        expect(ortogonais(p.disposicao.chamadas), onde).toBe(true);
        expect(problemasDasLigacoes(p.disposicao.chamadas, p.entrada), onde).toEqual([]);
      }
      // Não é uma garantia vazia: há vistas, e muitas, em que as chamadas existem.
      expect(comChamadas, `${forma ?? 'I'}: ${comChamadas} de ${total}`).toBeGreaterThan(total / 2);
    });
  }

  it('uma zona escondida nesta vista não tem ligação: o número só se liga ao cartão quando se vê', () => {
    const predio = { pisos: 4, fachadas: 2, temVarandas: true, moradia: false, forma: 'quadrado' as Forma, janelas: { frente: 4, tras: 4 } };
    // De costas (205°), a frente e a lateral direita ficam atrás: a fachada (frente) e a empena (direita) não se veem.
    const v = buildingVolume(entradaDoVolume(predio, zonas, { larguraM: 12, profundidadeM: 10, peDireitoM: 2.8 }, 205));
    const p = pranchetaLarga(v, zonas, textos, { largura: 1100, alturas, alturaMaxima: 340 });
    expect(p.desenho.pinos.map((x) => x.id)).not.toContain('z1');
    expect(p.desenho.pinos.map((x) => x.id)).not.toContain('z2');
    expect(p.disposicao?.chamadas.map((c) => c.id) ?? []).not.toContain('z1');
  });
});
