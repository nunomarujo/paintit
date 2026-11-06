import { describe, expect, it } from 'vitest';
import {
  ANGULO_DO_DESENHO,
  LEGIBILIDADE_DO_NUMERO,
  LEGIBILIDADE_PARA_VER,
  atribuirFaces,
  caixaDaVolta,
  caixaDoRotulo,
  cotasDoDesenho,
  desenharZonas,
  entradaDoVolume,
  ladoPeloNome,
  lugaresDasZonas,
  numeracaoDoPedido,
  numerarZonas,
  plantaDoDesenho,
  sitiosParaAcrescentar,
  vistaParaVer,
  type ZonaParaDesenho,
} from './prancheta';
import { dentroDoPoligono } from './chamadas';
import { FORMAS, ladosDaPlanta, vistaDoLado, buildingVolume, type Forma } from './volume';

const PREDIO = {
  pisos: 4,
  fachadas: 2,
  temVarandas: true,
  moradia: false,
  forma: null as Forma | null,
  janelas: { frente: 4, esquerda: 0, direita: 0, tras: 4 },
};
const ESCALA = { larguraM: 12, profundidadeM: 10, peDireitoM: 2.8 };

const z = (
  id: string,
  kind: ZonaParaDesenho['kind'],
  participacao: ZonaParaDesenho['participacao'] = 'incluida',
  face: string | null = null,
): ZonaParaDesenho => ({ id, kind, participacao, face });

/** O desenho do passo 2 para estas zonas, a um ângulo. */
const desenho = (zonas: ZonaParaDesenho[], o: { forma?: Forma | null; angulo?: number; pisos?: number } = {}) =>
  buildingVolume(entradaDoVolume({ ...PREDIO, forma: o.forma ?? null, pisos: o.pisos ?? PREDIO.pisos }, zonas, ESCALA, o.angulo));

const MAQUETA = [z('z1', 'fachada'), z('z2', 'empena'), z('z3', 'varandas', 'por_decidir'), z('z4', 'muro', 'excluida')];

describe('os lados da planta', () => {
  it('um quadrado e uma banda têm quatro lados, um por direção', () => {
    for (const f of ['quadrado', 'I'] as const) expect(ladosDaPlanta(f).map((l) => l.id)).toEqual(['frente', 'esquerda', 'direita', 'tras']);
  });

  it('o L, o U e o T têm os lados das asas, com nomes que se leem', () => {
    expect(ladosDaPlanta('L').map((l) => l.id)).toEqual(['frente', 'esquerda', 'direita', 'direita-2', 'tras', 'tras-2']);
    expect(ladosDaPlanta('U')).toHaveLength(8);
    expect(ladosDaPlanta('T')).toHaveLength(8);
    const u = ladosDaPlanta('U');
    // As duas asas de trás estão no mesmo plano: nenhuma é «o» tardoz, e dizem qual é.
    expect(u.filter((l) => l.id.startsWith('tras')).map((l) => l.label)).toEqual([
      'Tardoz (ala esquerda)',
      'Tardoz (ala direita)',
      'Tardoz (ao centro)',
    ]);
    expect(ladosDaPlanta('L').find((l) => l.id === 'direita-2')!.label).toBe('Lateral direita (ala de trás)');
  });

  it('os lados fecham o contorno: a soma dos comprimentos é o perímetro da planta', () => {
    const perimetro = (f: Forma) => ladosDaPlanta(f).reduce((n, l) => n + (l.ate - l.de), 0);
    expect(perimetro('quadrado')).toBe(40);
    expect(perimetro('I')).toBe(2 * (14 + 7));
    expect(perimetro('L')).toBe(2 * (14 + 13));
    // O pátio do U (4 de largura por 6 de fundo) acrescenta dois lados de 6 e um de 4, e tira um de 4.
    expect(perimetro('U')).toBe(2 * (14 + 13) + 2 * 6);
  });

  it('com as medidas reais os lados são os mesmos, pela mesma ordem (os ids guardam-se no pedido)', () => {
    for (const forma of FORMAS) {
      const v = buildingVolume({ ...entradaDoVolume({ ...PREDIO, forma }, [z('a', 'fachada'), z('b', 'fachada')], ESCALA) });
      expect(v.lados.map((l) => l.id)).toEqual(ladosDaPlanta(forma).map((l) => l.id));
    }
  });
});

describe('a laje: sem planta até ao segundo alçado', () => {
  it('com nenhum ou um alçado, o prédio é um painel fino: a frente larga, o fundo de pouca profundidade', () => {
    for (const zonas of [[], [z('a', 'fachada')], [z('a', 'fachada'), z('v', 'varandas')]]) {
      const v = desenho(zonas, { forma: 'U' });
      expect(v.laje).toBe(true);
      const frente = v.lados.find((l) => l.id === 'frente')!;
      const lateral = v.lados.find((l) => l.id === 'direita')!;
      expect(lateral.ate - lateral.de).toBeLessThan((frente.ate - frente.de) / 4);
    }
  });

  it('a forma do prédio é ignorada na laje e a planta só aparece com o segundo alçado', () => {
    expect(plantaDoDesenho('L', [z('a', 'fachada')]).laje).toBe(true);
    const p = plantaDoDesenho('L', [z('a', 'fachada'), z('b', 'empena')]);
    expect(p.laje).toBe(false);
    expect(p.forma).toBe('L');
    expect(p.porEscolher).toBe(false);
  });

  it('com dois alçados e sem planta no prédio, presume-se a banda e pergunta-se a planta', () => {
    const p = plantaDoDesenho(null, [z('a', 'fachada'), z('b', 'fachada')]);
    expect(p.forma).toBe('I');
    expect(p.porEscolher).toBe(true);
    expect(plantaDoDesenho(null, [z('a', 'fachada')]).porEscolher).toBe(false);
  });

  it('as zonas que não são alçados não contam para a planta', () => {
    expect(plantaDoDesenho(null, [z('a', 'fachada'), z('v', 'varandas'), z('m', 'muro')]).laje).toBe(true);
  });

  it('só o alçado entregue tem vãos: a laje tem janelas na frente e nada nas outras faces', () => {
    const v = desenho([z('a', 'fachada')], { angulo: 25 });
    expect(v.faces.some((f) => f.kind === 'janela')).toBe(true);
    expect(v.faces.filter((f) => f.kind === 'janela').every((f) => f.face === 'frente')).toBe(true);
  });
});

describe('cada alçado, o seu lado', () => {
  it('sem lado guardado, atribui-se pela ordem: a frente, a direita, a esquerda, o tardoz', () => {
    const l = ladosDaPlanta('I');
    const r = atribuirFaces([z('a', 'fachada'), z('b', 'fachada'), z('c', 'fachada'), z('d', 'fachada')], l, false);
    expect(r).toEqual({ a: 'frente', b: 'direita', c: 'esquerda', d: 'tras' });
  });

  it('a empena prefere as laterais', () => {
    expect(atribuirFaces([z('a', 'fachada'), z('e', 'empena')], ladosDaPlanta('I'), false)).toEqual({ a: 'frente', e: 'direita' });
  });

  it('o lado guardado vale; um lado já tomado, ou que a planta não tem, volta à ordem', () => {
    const r = atribuirFaces([z('a', 'fachada', 'incluida', 'tras'), z('b', 'fachada', 'incluida', 'tras'), z('c', 'fachada', 'incluida', 'tras-3')], ladosDaPlanta('I'), false);
    expect(r).toEqual({ a: 'tras', b: 'frente', c: 'direita' });
  });

  it('num U há oito lugares: o nono alçado fica sem lado («Fora do desenho»)', () => {
    const nove = Array.from({ length: 9 }, (_, i) => z(`f${i}`, 'fachada'));
    const r = atribuirFaces(nove, ladosDaPlanta('U'), false);
    expect(Object.values(r).filter((x) => x === null)).toHaveLength(1);
    expect(new Set(Object.values(r).filter(Boolean)).size).toBe(8);
  });

  it('dois alçados nunca partilham um lado', () => {
    for (const forma of FORMAS) {
      const zonas = Array.from({ length: 6 }, (_, i) => z(`f${i}`, i % 2 ? 'empena' : 'fachada', 'incluida', i === 2 ? 'frente' : null));
      const r = Object.values(atribuirFaces(zonas, ladosDaPlanta(forma), false)).filter(Boolean);
      expect(new Set(r).size).toBe(r.length);
    }
  });

  it('o alçado entregue ocupa o seu lado na planta: o L com a fachada na asa de trás desenha-a lá', () => {
    const zonas = [z('a', 'fachada'), z('b', 'fachada', 'incluida', 'tras-2')];
    const v = desenho(zonas, { forma: 'L', angulo: 160 });
    const lugares = lugaresDasZonas(v, zonas);
    const lado = v.faces[lugares.b!.faces[0]!]!;
    expect(lado.face).toBe('tras-2');
    // A janela só existe nos lados entregues.
    const comJanelas = new Set(v.faces.filter((f) => f.kind === 'janela').map((f) => f.face));
    expect([...comJanelas].every((f) => f === 'frente' || f === 'tras-2')).toBe(true);
  });

  it('os lados por entregar ficam só a traço, sem janelas nem enchimento de parede', () => {
    const zonas = [z('a', 'fachada'), z('b', 'fachada')];
    const v = desenho(zonas, { forma: 'quadrado', angulo: 200 });
    expect(v.faces.filter((f) => f.kind === 'por_entregar').length).toBeGreaterThan(0);
    expect(v.faces.filter((f) => f.kind === 'janela').every((f) => f.face === 'frente' || f.face === 'direita')).toBe(true);
  });
});

describe('o lado que o nome diz', () => {
  it('«Tardoz», «Lateral esquerda», «Fachada principal»: um lado só', () => {
    expect(ladoPeloNome('Tardoz')).toBe('tras');
    expect(ladoPeloNome('Tardoz do pátio')).toBe('tras');
    expect(ladoPeloNome('Traseiras, com fissuras')).toBe('tras');
    expect(ladoPeloNome('Lateral esquerda')).toBe('esquerda');
    expect(ladoPeloNome('Empena direita')).toBe('direita');
    expect(ladoPeloNome('Fachada principal')).toBe('frente');
    expect(ladoPeloNome('Fachada da frente virada para a rua')).toBe('frente');
    expect(ladoPeloNome('FACHADA TRÁS')).toBe('tras');
  });

  it('um nome que diz dois lados, ou nenhum, não diz lado nenhum', () => {
    for (const nome of ['Lateral esquerda e direita', 'Empena lado norte', 'Fachada', '', null, undefined, 'Fachada principal e tardoz']) {
      expect(ladoPeloNome(nome)).toBeNull();
    }
  });

  it('o lado guardado manda; depois o nome, se estiver livre; depois a ordem', () => {
    const l = ladosDaPlanta('I');
    const nomeada = (id: string, kind: ZonaParaDesenho['kind'], descricao: string, face: string | null = null): ZonaParaDesenho => ({
      id,
      kind,
      participacao: 'incluida',
      descricao,
      face,
    });
    expect(
      atribuirFaces([nomeada('a', 'fachada', 'Fachada principal'), nomeada('b', 'fachada', 'Tardoz'), nomeada('c', 'empena', 'Lateral esquerda')], l, false),
    ).toEqual({ a: 'frente', b: 'tras', c: 'esquerda' });
    // O guardado ganha ao nome: o «Tardoz» que o cliente pôs à direita fica à direita.
    expect(atribuirFaces([nomeada('a', 'fachada', 'Fachada principal'), nomeada('b', 'fachada', 'Tardoz', 'direita')], l, false)).toEqual({
      a: 'frente',
      b: 'direita',
    });
    // Dois «Tardoz»: o primeiro fica com o tardoz, o segundo com o primeiro lado livre.
    expect(atribuirFaces([nomeada('a', 'fachada', 'Tardoz'), nomeada('b', 'fachada', 'Tardoz norte')], l, false)).toEqual({ a: 'tras', b: 'frente' });
  });
});

describe('o que está de costas não se vê: o prédio tapa-o', () => {
  const zonas = [z('a', 'fachada'), z('b', 'fachada', 'incluida', 'tras'), z('v', 'varandas'), z('m', 'muro')];
  it('visto por trás, as varandas, os vãos e o muro da frente não aparecem por cima da cobertura', () => {
    const v = desenho(zonas, { forma: 'quadrado', angulo: 180 });
    const daFrente = v.faces.filter((f) => f.face === 'frente');
    expect(daFrente).toEqual([]);
    // O tardoz, que está de frente, mantém os seus vãos.
    expect(v.faces.some((f) => f.kind === 'janela' && f.face === 'tras')).toBe(true);
  });

  it('visto de frente, tudo isso aparece', () => {
    const v = desenho(zonas, { forma: 'quadrado', angulo: 0 });
    for (const kind of ['varanda', 'janela', 'muro'] as const) expect(v.faces.some((f) => f.kind === kind), kind).toBe(true);
  });

  it('a zona das varandas fica sem número quando o lado delas está de costas, e tem sítio na mesma', () => {
    const v = desenho(zonas, { forma: 'quadrado', angulo: 180 });
    const l = lugaresDasZonas(v, zonas);
    expect(l.v).toMatchObject({ temSitio: true, pino: null });
    expect(l.m).toMatchObject({ temSitio: true, pino: null });
    expect(l.b!.pino).not.toBeNull();
  });
});

describe('o sítio de cada zona no desenho', () => {
  const v = desenho(MAQUETA);
  const lugares = lugaresDasZonas(v, MAQUETA);

  it('as quatro zonas das maquetas têm sítio, cada uma nas suas faces', () => {
    const tipos = (id: string) => [...new Set(lugares[id]!.faces.map((i) => v.faces[i]!.kind))].sort();
    expect(tipos('z1')).toEqual(['frente']);
    expect(tipos('z2')).toEqual(['empena']);
    // As varandas levam os tetos e as guardas: é o nome da zona.
    expect(tipos('z3')).toEqual(['grade', 'varanda']);
    expect(tipos('z4')).toEqual(['muro']);
    for (const id of ['z1', 'z2', 'z3', 'z4']) expect(lugares[id]!.pino).not.toBeNull();
  });

  it('uma segunda fachada já tem onde ficar: o seu lado da planta', () => {
    const zonas = [z('a', 'fachada'), z('b', 'fachada')];
    const vv = desenho(zonas);
    const l = lugaresDasZonas(vv, zonas);
    expect(l.a!.temSitio && l.b!.temSitio).toBe(true);
    expect(vv.faces[l.a!.faces[0]!]!.face).toBe('frente');
    expect(vv.faces[l.b!.faces[0]!]!.face).toBe('direita');
  });

  it('o que o volume não tem fica sem sítio: escadas e átrio, interiores, tetos, outra superfície', () => {
    const zonas = [z('e', 'escadas_atrio'), z('p', 'paredes_interiores'), z('t', 'tetos'), z('o', 'outro')];
    const l = lugaresDasZonas(desenho(zonas), zonas);
    for (const id of ['e', 'p', 't', 'o']) expect(l[id]).toMatchObject({ pino: null, temSitio: false });
  });

  it('com uma zona de elementos metálicos, as guardas são dela e não das varandas', () => {
    const zonas = [z('v', 'varandas'), z('m', 'elementos_metalicos')];
    const vv = desenho(zonas);
    const l = lugaresDasZonas(vv, zonas);
    expect(l.v!.faces.every((i) => vv.faces[i]!.kind === 'varanda')).toBe(true);
    expect(l.m!.faces.every((i) => vv.faces[i]!.kind === 'grade')).toBe(true);
    expect(l.m!.pino).not.toBeNull();
  });

  it('as varandas assentam no lado que guardaram, e sem ele no da primeira fachada', () => {
    const zonas = [z('a', 'fachada', 'incluida', 'direita'), z('b', 'fachada'), z('v', 'varandas')];
    const vv = desenho(zonas, { forma: 'quadrado' });
    const l = lugaresDasZonas(vv, zonas);
    expect(new Set(l.v!.faces.map((i) => vv.faces[i]!.face))).toEqual(new Set(['direita']));
    const zonas2 = [z('a', 'fachada'), z('b', 'fachada'), z('v', 'varandas', 'incluida', 'esquerda')];
    const v2 = desenho(zonas2, { forma: 'quadrado', angulo: 300 });
    expect(new Set(lugaresDasZonas(v2, zonas2).v!.faces.map((i) => v2.faces[i]!.face))).toEqual(new Set(['esquerda']));
  });
});

describe('o pedido vazio: acrescentar tocando no prédio', () => {
  it('a fachada e as varandas, cada uma dentro da face que pintaria; a empena só tem lista (a laje não lhe dá lado)', () => {
    const vazio = buildingVolume(entradaDoVolume({ ...PREDIO }, [], ESCALA));
    const sitios = sitiosParaAcrescentar(vazio);
    expect(sitios.map((x) => x.tipo)).toEqual(['fachada', 'varandas']);
    const dentro = (tipo: string, kind: string) =>
      vazio.faces.some((f) => f.kind === kind && dentroDoPoligono(sitios.find((x) => x.tipo === tipo)!.p, f.points));
    expect(dentro('fachada', 'frente')).toBe(true);
    expect(dentro('varandas', 'varanda')).toBe(true);
  });

  it('sem varandas, só a fachada', () => {
    const vazio = buildingVolume(entradaDoVolume({ ...PREDIO, temVarandas: false, fachadas: 4 }, [], ESCALA));
    expect(sitiosParaAcrescentar(vazio).map((x) => x.tipo)).toEqual(['fachada']);
  });
});

describe('a ordem e os números', () => {
  it('primeiro as do desenho, depois as que ele não mostra, no fim as excluídas — numeradas quando têm sítio', () => {
    const zonas = [z('muro', 'muro', 'excluida'), z('escadas', 'escadas_atrio'), z('fachada', 'fachada'), z('empena', 'empena'), z('tardoz', 'fachada')];
    const n = numerarZonas(zonas, lugaresDasZonas(desenho(zonas), zonas));
    expect(n).toEqual([
      { id: 'fachada', grupo: 'no_desenho', n: 1 },
      { id: 'empena', grupo: 'no_desenho', n: 2 },
      { id: 'tardoz', grupo: 'no_desenho', n: 3 },
      { id: 'escadas', grupo: 'fora_do_desenho', n: null },
      { id: 'muro', grupo: 'fora_do_pedido', n: 4 },
    ]);
  });

  it('a numeração não muda ao rodar: o mesmo número, a mesma zona, em qualquer ângulo', () => {
    const zonas = [...MAQUETA, z('t', 'fachada'), z('e', 'escadas_atrio')];
    const base = JSON.stringify(numerarZonas(zonas, lugaresDasZonas(desenho(zonas, { forma: 'L' }), zonas)));
    for (let a = 0; a < 360; a += 15) {
      expect(JSON.stringify(numerarZonas(zonas, lugaresDasZonas(desenho(zonas, { forma: 'L', angulo: a }), zonas))), `${a}°`).toBe(base);
    }
  });

  it('o servidor (fotografias) dá os mesmos números que o desenho', () => {
    const zonas = [...MAQUETA, z('t', 'fachada')];
    const esperado = numerarZonas(zonas, lugaresDasZonas(desenho(zonas), zonas));
    expect(numeracaoDoPedido(PREDIO, zonas)).toEqual(esperado);
  });
});

describe('o número segue o ângulo', () => {
  const casos: { nome: string; forma: Forma | null; zonas: ZonaParaDesenho[] }[] = [
    { nome: 'banda com as quatro fachadas', forma: 'I', zonas: [z('a', 'fachada'), z('b', 'fachada'), z('c', 'fachada'), z('d', 'fachada'), z('v', 'varandas'), z('m', 'muro')] },
    { nome: 'L', forma: 'L', zonas: [z('a', 'fachada'), z('b', 'fachada'), z('c', 'empena'), z('d', 'fachada', 'incluida', 'tras-2'), z('v', 'varandas')] },
    { nome: 'U', forma: 'U', zonas: [z('a', 'fachada'), z('b', 'fachada', 'incluida', 'tras-3'), z('c', 'fachada', 'incluida', 'esquerda-2'), z('d', 'empena'), z('v', 'varandas')] },
    { nome: 'T', forma: 'T', zonas: [z('a', 'fachada'), z('b', 'fachada', 'incluida', 'tras'), z('c', 'fachada', 'incluida', 'direita-2'), z('v', 'varandas'), z('m', 'muro')] },
  ];

  for (const { nome, forma, zonas } of casos) {
    it(`${nome}: o número está numa face da zona, que se vê e se lê, e não está tapado`, () => {
      for (let angulo = 0; angulo < 360; angulo += 5) {
        const v = desenho(zonas, { forma, angulo });
        const lugares = lugaresDasZonas(v, zonas);
        for (const zona of zonas) {
          const l = lugares[zona.id]!;
          if (!l.pino) continue;
          const onde = `${nome} ${angulo}° ${zona.id}`;
          // Está dentro de uma das faces da zona…
          const dentro = l.faces.filter((i) => dentroDoPoligono(l.pino!, v.faces[i]!.points));
          expect(dentro.length, onde).toBeGreaterThan(0);
          const i = dentro[0]!;
          // …que se lê (as paredes) …
          expect(v.faces[i]!.vista ?? 1, onde).toBeGreaterThanOrEqual(LEGIBILIDADE_DO_NUMERO);
          expect(l.vista ?? 1, onde).toBeGreaterThanOrEqual(LEGIBILIDADE_DO_NUMERO);
          // …e nenhuma face desenhada depois (que não seja da zona, nem uma janela ou a porta) lhe passa por cima.
          for (let j = i + 1; j < v.faces.length; j++) {
            const f = v.faces[j]!;
            if (f.fade || ['janela', 'porta'].includes(f.kind) || l.faces.includes(j)) continue;
            expect(dentroDoPoligono(l.pino, f.points), `${onde} tapado por ${f.kind} ${f.face ?? ''}`).toBe(false);
          }
        }
      }
    });

    it(`${nome}: uma zona com sítio sem número nesta vista está atrás — e há uma vista mais próxima onde se vê`, () => {
      let escondidas = 0;
      for (let angulo = 0; angulo < 360; angulo += 15) {
        const v = desenho(zonas, { forma, angulo });
        const lugares = lugaresDasZonas(v, zonas);
        for (const zona of zonas) {
          const l = lugares[zona.id]!;
          if (!l.temSitio || l.pino) continue;
          escondidas++;
          const alvo = vistaParaVer((a) => desenho(zonas, { forma, angulo: a }), zonas, zona.id, angulo);
          expect(alvo, `${nome} ${angulo}° ${zona.id}`).not.toBeNull();
          const nova = lugaresDasZonas(desenho(zonas, { forma, angulo: alvo! }), zonas)[zona.id]!;
          expect(nova.pino).not.toBeNull();
          expect(nova.vista ?? 1).toBeGreaterThanOrEqual(LEGIBILIDADE_PARA_VER);
        }
      }
      // Em quatro lados, a qualquer ângulo há pelo menos um que não se vê: o teste tem de ter apanhado casos.
      if (zonas.filter((x) => x.kind === 'fachada').length >= 3) expect(escondidas).toBeGreaterThan(0);
    });
  }

  it('a vista mais próxima é a mais próxima: a zona já visível devolve o ângulo atual, e nunca se roda mais de 180°', () => {
    const zonas = [z('a', 'fachada'), z('b', 'fachada', 'incluida', 'tras')];
    const volumeEm = (a: number) => desenho(zonas, { forma: 'quadrado', angulo: a });
    // A frente está de frente a 0°, perto do ângulo inicial.
    expect(vistaParaVer(volumeEm, zonas, 'a', 0)).toBe(0);
    // O tardoz vê-se de frente a 180°: de 0°, roda-se 180° (ou, com margem, ~135°, onde já está a ≥ 0,7).
    const alvo = vistaParaVer(volumeEm, zonas, 'b', 0)!;
    expect(Math.min(alvo, 360 - alvo)).toBeLessThanOrEqual(180);
    expect(vistaDoLado([0, -1, 0], alvo)).toBeGreaterThanOrEqual(LEGIBILIDADE_PARA_VER - 0.01);
    // Parte-se do lado mais perto: de 200° (quase de costas para a frente), o tardoz é o mais próximo.
    expect(Math.abs(vistaParaVer(volumeEm, zonas, 'b', 200)! - 200)).toBeLessThanOrEqual(65);
  });

  it('cada lado de cada planta tem uma vista onde o número está de frente, de qualquer ângulo de partida', () => {
    // «Ver no desenho» nunca fica sem resposta: com todos os lados entregues (o pior caso: as asas tapam-se umas às
    // outras), há sempre um ângulo onde o número do lado se vê de frente, e está a no máximo 180° do atual.
    for (const forma of FORMAS) {
      const lados = ladosDaPlanta(forma);
      const todas = lados.map((l) => z(l.id, 'fachada', 'incluida', l.id));
      const volumeEm = (a: number) => desenho(todas, { forma, angulo: a });
      for (const l of lados) {
        for (const atual of [25, 130, 245]) {
          const alvo = vistaParaVer(volumeEm, todas, l.id, atual);
          expect(alvo, `${forma} ${l.id} desde ${atual}°`).not.toBeNull();
          const lugar = lugaresDasZonas(volumeEm(alvo!), todas)[l.id]!;
          expect(lugar.pino).not.toBeNull();
          expect(lugar.vista ?? 1).toBeGreaterThanOrEqual(LEGIBILIDADE_PARA_VER);
        }
      }
    }
  });

  it('as zonas sem sítio no volume não têm vista nenhuma', () => {
    const zonas = [z('a', 'fachada'), z('e', 'escadas_atrio')];
    expect(vistaParaVer((a) => desenho(zonas, { angulo: a }), zonas, 'e', 25)).toBeNull();
  });
});

describe('rodar para a esquerda é aumentar o ângulo', () => {
  it('aumentando o ângulo, a frente vai para a esquerda e a lateral direita aproxima-se', () => {
    const zonas = [z('a', 'fachada'), z('b', 'fachada')];
    const x = (angulo: number, face: string) => {
      const v = desenho(zonas, { forma: 'quadrado', angulo });
      const l = lugaresDasZonas(v, zonas);
      void l;
      const f = v.faces.find((q) => q.kind === 'frente' && q.face === face)!;
      return f.points.reduce((n, p) => n + p[0], 0) / f.points.length;
    };
    expect(x(40, 'frente')).toBeLessThan(x(10, 'frente'));
    expect(vistaDoLado([1, 0, 0], 60)).toBeGreaterThan(vistaDoLado([1, 0, 0], 25));
    expect(ANGULO_DO_DESENHO).toBe(25);
  });
});

describe('as cotas', () => {
  const v = desenho(MAQUETA);
  const silhueta = v.faces.filter((f) => !f.fade).flatMap((f) => f.points);
  const minY = Math.min(...silhueta.map((p) => p[1]));
  const maxX = Math.max(...silhueta.map((p) => p[0]));

  it('só se desenha a cota de um eixo com medida', () => {
    expect(cotasDoDesenho(v, { frente: '12 m' }, { afastamento: 1, letra: 1 }).map((c) => c.eixo)).toEqual(['frente']);
    expect(cotasDoDesenho(v, {}, { afastamento: 1, letra: 1 })).toEqual([]);
  });

  it('ficam por cima e atrás do prédio, onde as ligações das zonas não precisam de ir', () => {
    const [frente, fundo, altura] = cotasDoDesenho(v, { frente: '12 m', fundo: '10 m', altura: '11,2 m' }, { afastamento: 1, letra: 1 });
    // A frente por cima do telhado: parte do canto mais alto do desenho (o de trás, à esquerda) e sobe.
    expect(frente!.chamadas[0]![0][1]).toBeCloseTo(minY, 5);
    for (const [aresta, linha] of frente!.chamadas) expect(linha[1]).toBeLessThan(aresta[1]);
    // A altura à direita de tudo.
    expect(Math.min(altura!.linha[0][0], altura!.linha[1][0])).toBeGreaterThan(maxX);
    // O fundo à esquerda da esquina da frente, no alto: acaba acima do alto da frente.
    expect(Math.min(fundo!.linha[0][0], fundo!.linha[1][0])).toBeLessThan(v.cotas.largura[0][0]);
    expect(Math.max(fundo!.linha[0][1], fundo!.linha[1][1])).toBeLessThan(v.cotas.altura[1][1]);
    // E os textos crescem para longe do prédio.
    expect([frente!.alinhar, fundo!.alinhar, altura!.alinhar]).toEqual(['centro', 'direita', 'esquerda']);
  });

  it('seguem o ângulo: a qualquer vista, a largura está na aresta do telhado mais alta, o fundo na mais à esquerda, a altura na esquina mais à direita', () => {
    const igual = (p: [number, number], q: [number, number]) => Math.abs(p[0] - q[0]) < 0.02 && Math.abs(p[1] - q[1]) < 0.02;
    for (const forma of [null, 'quadrado'] as (Forma | null)[]) {
      for (let angulo = 0; angulo < 360; angulo += 5) {
        const vv = desenho(MAQUETA, { forma, angulo });
        const c = vv.cotasDaPrancheta;
        // O telhado do corpo (uma só face de cima): os quatro cantos já projetados, pela ordem y0·x0, y0·x1, y1·x1, y1·x0.
        const t = vv.faces.find((f) => f.kind === 'topo')!.points as [number, number][];
        const [p00, p10, p11, p01] = t as [[number, number], [number, number], [number, number], [number, number]];
        const media = (a: [number, number], b: [number, number], i: 0 | 1) => (a[i] + b[i]) / 2;
        // Largura: das duas arestas paralelas a x (y0 e y1), a de menor y no ecrã.
        const maisAlta = media(p00, p10, 1) <= media(p01, p11, 1) ? [p00, p10] : [p01, p11];
        expect(igual(c.largura[0], maisAlta[0]!) && igual(c.largura[1], maisAlta[1]!), `largura ${forma} ${angulo}°`).toBe(true);
        // Fundo: das duas arestas paralelas a y (x0 e x1), a de menor x no ecrã.
        const maisEsq = media(p00, p01, 0) <= media(p10, p11, 0) ? [p00, p01] : [p10, p11];
        const fundo = [c.fundo[0], c.fundo[1]];
        expect(fundo.every((q) => maisEsq.some((r) => igual(q, r))), `fundo ${forma} ${angulo}°`).toBe(true);
        // Do mais perto (em baixo no ecrã) para o mais longe.
        expect(c.fundo[1][1]).toBeLessThanOrEqual(c.fundo[0][1] + 1e-9);
        // A altura: na esquina de x máximo no ecrã, e sobe.
        const xMax = Math.max(...t.map((q) => q[0]));
        expect(Math.abs(c.altura[0][0] - xMax), `altura ${forma} ${angulo}°`).toBeLessThan(0.02);
        expect(c.altura[1][1]).toBeLessThan(c.altura[0][1]);
        // O «para fora» do fundo vai para a esquerda do ecrã.
        expect(c.foraDoFundo[0]).toBeLessThanOrEqual(1e-9);
      }
    }
  });

  it('a 180° (o prédio de costas) a frente mede-se na aresta da frente, que passou para o fundo do desenho', () => {
    const a = desenho(MAQUETA, { angulo: 25 }).cotasDaPrancheta.largura;
    const b = desenho(MAQUETA, { angulo: 205 }).cotasDaPrancheta.largura;
    // Os mesmos dois cantos do prédio, vistos do lado oposto: trocam de lugar no ecrã.
    expect(Math.abs(a[0][1] - b[0][1])).toBeGreaterThan(0);
  });

  it('a caixa do desenho inclui as cotas e os seus textos', () => {
    const d = desenharZonas(v, [], { frente: '12 m', altura: '11,2 m' }, 20);
    const [x, y, w, h] = d.caixa;
    for (const c of d.cotas) {
      for (const p of c.linha) {
        expect(p[0]).toBeGreaterThanOrEqual(x);
        expect(p[0]).toBeLessThanOrEqual(x + w);
        expect(p[1]).toBeGreaterThanOrEqual(y);
        expect(p[1]).toBeLessThanOrEqual(y + h);
      }
    }
  });

  it('em qualquer ângulo, nenhuma cota nem o seu texto assenta no prédio (L, U, T, banda)', () => {
    for (const forma of ['I', 'L', 'U', 'T'] as Forma[]) {
      for (let angulo = 0; angulo < 360; angulo += 30) {
        const zonas = [z('a', 'fachada'), z('b', 'fachada')];
        const vf = desenho(zonas, { forma, angulo });
        const letra = 1;
        const caracter = 0.37;
        const cotas = cotasDoDesenho(vf, { frente: '≈ 12 m', fundo: '≈ 10 m' }, { afastamento: 1, letra, caracter });
        for (const c of cotas) {
          const k = caixaDoRotulo(c, { letra, caracter });
          const cantos: [number, number][] = [
            [k.x, k.y],
            [k.x + k.w, k.y],
            [k.x + k.w, k.y + k.h],
            [k.x, k.y + k.h],
          ];
          for (const f of vf.faces.filter((x) => !x.fade && x.kind !== 'por_entregar')) {
            for (const p of cantos) expect(dentroDoPoligono(p, f.points), `${forma} ${angulo}°: ${c.eixo}`).toBe(false);
          }
        }
      }
    }
  });
});

describe('a moldura não mexe ao rodar', () => {
  it('a caixa de todas as vistas serve a qualquer ângulo, e quase nunca precisa de mais de 5% de área', () => {
    for (const forma of [null, 'L', 'U', 'T'] as (Forma | null)[]) {
      const zonas = [z('a', 'fachada'), z('b', 'empena')];
      const em = (a: number) => desenho(zonas, { forma, angulo: a });
      const textos = { frente: '≈ 12 m', fundo: '≈ 10 m', altura: '≈ 11 m' };
      const caixa = caixaDaVolta(em, textos);
      for (let a = 0; a < 360; a += 5) {
        const c = desenharZonas(em(a), zonas, textos, 16, caixa).caixa;
        // Nunca mais pequena do que a caixa fixa (o desenho não encolhe)…
        expect(c[0]).toBeLessThanOrEqual(caixa[0] + 1e-9);
        expect(c[1]).toBeLessThanOrEqual(caixa[1] + 1e-9);
        expect(c[0] + c[2]).toBeGreaterThanOrEqual(caixa[0] + caixa[2] - 1e-9);
        expect(c[1] + c[3]).toBeGreaterThanOrEqual(caixa[1] + caixa[3] - 1e-9);
        // …e quase nunca maior.
        expect((c[2] * c[3]) / (caixa[2] * caixa[3]), `${forma} ${a}°`).toBeLessThan(1.05);
      }
    }
  });
});
