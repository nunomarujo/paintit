import { describe, expect, it } from 'vitest';
import { surfaceArea, type SurfaceInput } from './request';
import {
  contaDaZona,
  fraseDoQueFalta,
  nomeNaFrase,
  nomeSemArtigo,
  respostaDasZonas,
  textoDaFrase,
  tituloDaResposta,
  tituloNumaFrase,
  type ZonaParaResposta,
} from './respostaDasZonas';

// As zonas das maquetas de 05/11/2026: 118 m² medidos e confirmados, 98 m² estimados, seis varandas
// de 1 m² por decidir, e um muro por levantar que ficou fora do pedido.
const ZONAS: ZonaParaResposta[] = [
  {
    id: 'z1',
    kind: 'fachada',
    descricao: 'Fachada principal',
    areaCm2: 11_800,
    participacao: 'incluida',
    origemDaQuantidade: 'medicao',
    confirmacao: 'confirmada',
  },
  {
    id: 'z2',
    kind: 'empena',
    descricao: 'Empena lado norte',
    areaCm2: 9_800,
    participacao: 'incluida',
    origemDaQuantidade: 'estimativa',
    confirmacao: 'por_confirmar',
  },
  {
    id: 'z3',
    kind: 'varandas',
    descricao: null,
    areaCm2: 600,
    participacao: 'por_decidir',
    origemDaQuantidade: 'estimativa',
    confirmacao: 'por_confirmar',
  },
  {
    id: 'z4',
    kind: 'muro',
    descricao: 'Muro da entrada',
    areaCm2: 0,
    participacao: 'excluida',
    origemDaQuantidade: null,
    confirmacao: 'por_confirmar',
  },
];

describe('a resposta do passo 2', () => {
  const r = respostaDasZonas(ZONAS);

  it('o total é das incluídas, e a barra divide-o em medido e por confirmar', () => {
    expect(r.totalCm2).toBe(21_600);
    expect(r.medidaCm2).toBe(11_800);
    expect(r.porConfirmarCm2).toBe(9_800);
    expect(r.medidaCm2 + r.porConfirmarCm2).toBe(r.totalCm2);
    expect(r.soEstimativas).toBe(true);
  });

  it('«em 2 das 4 zonas», porque há zonas que não contam', () => {
    expect(tituloDaResposta(r)).toEqual({ destaque: '216 m²', numero: true, frase: 'a pintar, em 2 das 4 zonas' });
    expect(tituloDaResposta(respostaDasZonas(ZONAS.slice(0, 2))).frase).toBe('a pintar, em 2 zonas');
    expect(tituloDaResposta(respostaDasZonas(ZONAS.slice(0, 1))).frase).toBe('a pintar, em 1 zona');
  });

  it('o que falta: confirmar a empena e decidir as varandas — o muro excluído não falta', () => {
    expect(r.falta).toEqual([
      { tipo: 'confirmar', areaCm2: 9_800, zonas: [{ id: 'z2', nome: 'empena lado norte' }] },
      { tipo: 'decidir', areaCm2: 0, zonas: [{ id: 'z3', nome: 'as varandas' }] },
    ]);
    expect(textoDaFrase(fraseDoQueFalta(r.falta))).toBe('Falta confirmar 98 m² (empena lado norte) e decidir as varandas.');
  });

  it('cada nome do que falta é um pedaço à parte, para o ecrã o fazer botão', () => {
    const zonas = fraseDoQueFalta(r.falta).filter((p) => p.tipo === 'zona');
    expect(zonas).toEqual([
      { tipo: 'zona', id: 'z2', texto: 'empena lado norte', falta: 'confirmar' },
      { tipo: 'zona', id: 'z3', texto: 'as varandas', falta: 'decidir' },
    ]);
    expect(fraseDoQueFalta([])).toEqual([]);
  });

  it('uma zona incluída sem medidas falta levantar; e nunca se diz «nenhuma»', () => {
    const r2 = respostaDasZonas([{ ...ZONAS[3]!, participacao: 'incluida' }]);
    expect(r2.falta).toEqual([{ tipo: 'levantar', areaCm2: 0, zonas: [{ id: 'z4', nome: 'o muro da entrada' }] }]);
    expect(respostaDasZonas([ZONAS[0]!]).falta).toEqual([]);
  });

  it('um documento por confirmar não é uma estimativa', () => {
    expect(respostaDasZonas([{ ...ZONAS[1]!, origemDaQuantidade: 'documento' }]).soEstimativas).toBe(false);
  });

  it('o nome dentro de uma frase leva o artigo certo, ou «a zona «…»» quando não se sabe o género', () => {
    expect(nomeNaFrase({ kind: 'empena', descricao: 'Empena lado norte' })).toBe('a empena lado norte');
    expect(nomeNaFrase({ kind: 'fachada', descricao: 'Tardoz' })).toBe('o tardoz');
    expect(nomeNaFrase({ kind: 'fachada', descricao: 'Traseiras do bloco B' })).toBe('as traseiras do bloco B');
    expect(nomeNaFrase({ kind: 'fachada', descricao: 'A fachada da rua' })).toBe('a fachada da rua');
    expect(nomeNaFrase({ kind: 'outro', descricao: 'Cozinha' })).toBe('a zona «Cozinha»');
    expect(nomeNaFrase({ kind: 'varandas', descricao: null })).toBe('as varandas');
    expect(nomeNaFrase({ kind: 'muro', descricao: '  ' })).toBe('o muro');
    expect(nomeNaFrase({ kind: 'escadas_atrio', descricao: null })).toBe('as escadas e o átrio');
  });

  it('dentro de parênteses, nenhum artigo — nem a meio de um tipo («escadas e átrio»)', () => {
    expect(nomeSemArtigo({ kind: 'empena', descricao: 'Empena lado norte' })).toBe('empena lado norte');
    expect(nomeSemArtigo({ kind: 'escadas_atrio', descricao: null })).toBe('escadas e átrio');
    expect(nomeSemArtigo({ kind: 'fachada', descricao: 'A fachada da rua' })).toBe('fachada da rua');
  });
});

/** Uma zona de ensaio: incluída e confirmada, salvo o que se disser. */
const zona = (id: string, o: Partial<ZonaParaResposta>): ZonaParaResposta => ({
  id,
  kind: 'fachada',
  descricao: null,
  areaCm2: 10_000,
  participacao: 'incluida',
  origemDaQuantidade: 'medicao',
  confirmacao: 'confirmada',
  ...o,
});

describe('o título e o que falta, nos casos-limite (cético, 05/11/2026)', () => {
  it('uma só zona, por levantar: nem «Por levantar a pintar», nem um número inventado', () => {
    const r = respostaDasZonas([zona('a', { kind: 'empena', descricao: 'Empena lado norte', areaCm2: 0, origemDaQuantidade: null })]);
    expect(tituloDaResposta(r)).toEqual({ destaque: 'Por levantar', numero: false, frase: '1 zona a pintar, ainda sem medidas' });
    expect(tituloNumaFrase(r)).toBe('1 zona a pintar, ainda sem medidas');
    expect(textoDaFrase(fraseDoQueFalta(r.falta))).toBe('Falta levantar a empena lado norte.');
  });

  it('uma só zona, por decidir: «0 m² a pintar: 1 zona por decidir», nunca «em 0 das 1 zona»', () => {
    const r = respostaDasZonas([zona('a', { kind: 'varandas', participacao: 'por_decidir' })]);
    expect(tituloDaResposta(r)).toEqual({ destaque: '0 m²', numero: true, frase: 'a pintar: 1 zona por decidir' });
    expect(tituloNumaFrase(r)).toBe('0 m² a pintar: 1 zona por decidir');
  });

  it('tudo fora do pedido: diz-se que está fora', () => {
    const r = respostaDasZonas([zona('a', { participacao: 'excluida' }), zona('b', { kind: 'muro', participacao: 'excluida' })]);
    expect(tituloDaResposta(r).frase).toBe('a pintar: as 2 zonas estão fora do pedido');
    expect(tituloDaResposta(respostaDasZonas([zona('a', { participacao: 'excluida' })])).frase).toBe(
      'a pintar: a zona está fora do pedido',
    );
    const misto = respostaDasZonas([zona('a', { participacao: 'por_decidir' }), zona('b', { participacao: 'excluida' })]);
    expect(tituloDaResposta(misto).frase).toBe('a pintar: 1 zona por decidir e 1 fora do pedido');
  });

  it('com zonas por levantar, a contagem diz quantas somam: «em 1 das 3 zonas», e não «em 3 zonas»', () => {
    const r = respostaDasZonas([
      zona('a', { descricao: 'Fachada principal', areaCm2: 11_800 }),
      zona('b', { kind: 'empena', descricao: 'Empena lado norte', areaCm2: 0, origemDaQuantidade: null }),
      zona('c', { descricao: 'Tardoz', areaCm2: 0, origemDaQuantidade: null }),
    ]);
    expect(tituloDaResposta(r)).toEqual({ destaque: '118 m²', numero: true, frase: 'a pintar, em 1 das 3 zonas' });
    expect(r.porLevantar).toBe(2);
    expect(r.medidaCm2).toBe(11_800);
    expect(textoDaFrase(fraseDoQueFalta(r.falta))).toBe('Falta levantar a empena lado norte e o tardoz.');
  });

  it('só por levantar, entre outras: «2 das 3 zonas a pintar, ainda sem medidas»', () => {
    const r = respostaDasZonas([
      zona('a', { areaCm2: 0 }),
      zona('b', { kind: 'muro', areaCm2: 0 }),
      zona('c', { kind: 'varandas', participacao: 'por_decidir' }),
    ]);
    expect(tituloDaResposta(r).frase).toBe('2 das 3 zonas a pintar, ainda sem medidas');
  });

  it('um tipo com «e» por dentro separa-se com ponto e vírgula, nunca com dois «e» seguidos', () => {
    const r = respostaDasZonas([
      zona('a', {
        kind: 'empena',
        descricao: 'Empena lado norte',
        areaCm2: 9_800,
        origemDaQuantidade: 'estimativa',
        confirmacao: 'por_confirmar',
      }),
      zona('b', { kind: 'escadas_atrio', areaCm2: 4_200, origemDaQuantidade: 'documento', confirmacao: 'por_confirmar' }),
      zona('c', { descricao: 'Tardoz', areaCm2: 0 }),
      zona('d', { kind: 'varandas', participacao: 'por_decidir' }),
    ]);
    const frase = textoDaFrase(fraseDoQueFalta(r.falta));
    expect(frase).toBe('Falta confirmar 140 m² (empena lado norte; escadas e átrio), levantar o tardoz e decidir as varandas.');
    const cinco = respostaDasZonas([
      zona('a', { kind: 'empena', descricao: 'Empena lado norte', origemDaQuantidade: 'estimativa', confirmacao: 'por_confirmar' }),
      zona('b', { kind: 'beirais_cobertura', origemDaQuantidade: 'estimativa', confirmacao: 'por_confirmar' }),
    ]);
    expect(textoDaFrase(fraseDoQueFalta(cinco.falta))).toBe('Falta confirmar 200 m² (empena lado norte; beirais e cobertura).');
    const levantar = respostaDasZonas([zona('a', { kind: 'muro', areaCm2: 0 }), zona('b', { kind: 'escadas_atrio', areaCm2: 0 })]);
    expect(textoDaFrase(fraseDoQueFalta(levantar.falta))).toBe('Falta levantar o muro; as escadas e o átrio.');
  });

  it('três zonas simples: «a, b e c»', () => {
    const r = respostaDasZonas([
      zona('a', { kind: 'muro', areaCm2: 0 }),
      zona('b', { descricao: 'Tardoz', areaCm2: 0 }),
      zona('c', { kind: 'varandas', areaCm2: 0 }),
    ]);
    expect(textoDaFrase(fraseDoQueFalta(r.falta))).toBe('Falta levantar o muro, o tardoz e as varandas.');
  });

  it('em todas as combinações de tipos, nunca dois «e» seguidos', () => {
    // A regra que o cético apanhou, como propriedade: em todas as combinações de tipos, o separador
    // da lista nunca encosta um «e» a outro.
    const tipos = ['fachada', 'empena', 'escadas_atrio', 'beirais_cobertura', 'elementos_metalicos', 'muro'] as const;
    for (const a of tipos)
      for (const b of tipos) {
        if (a === b) continue;
        const r = respostaDasZonas([zona('a', { kind: a, areaCm2: 0 }), zona('b', { kind: b, areaCm2: 0 })]);
        const t = textoDaFrase(fraseDoQueFalta(r.falta));
        expect(t, t).not.toMatch(/ e (o|a|os|as) \S+ e /);
      }
  });
});

describe('a conta de uma zona, igual à de surfaceArea', () => {
  const m = (o: Partial<SurfaceInput>) => ({ areaDireta: null, larguraCm: null, alturaCm: null, vaosCm2: null, quantidade: 1, ...o });

  it('a empena: 10 × 11,2 − 14 = 98 m²', () => {
    expect(contaDaZona(m({ larguraCm: 1000, alturaCm: 1120, vaosCm2: 1400 }))).toEqual({
      expressao: '10 × 11,2 − 14',
      resultadoCm2: 9_800,
    });
    expect(contaDaZona(m({ larguraCm: 1200, alturaCm: 1150, vaosCm2: 2000 }), { unidades: true })!.expressao).toBe('12 × 11,5 m − 20 m²');
  });

  it('as varandas: 6 × 1 m², seis iguais de 1 m² cada', () => {
    expect(contaDaZona(m({ areaDireta: 100, quantidade: 6 }), { unidades: true })).toEqual({ expressao: '6 × 1 m²', resultadoCm2: 600 });
    expect(contaDaZona(m({ areaDireta: 100, quantidade: 6 }))!.expressao).toBe('6 × 1');
  });

  it('uma área sozinha não tem conta para mostrar no editor; sem medidas, não há conta nenhuma', () => {
    expect(contaDaZona(m({ areaDireta: 9_800 }))).toEqual({ expressao: null, resultadoCm2: 9_800 });
    expect(contaDaZona(m({ areaDireta: 9_800 }), { unidades: true })!.expressao).toBeNull();
    expect(contaDaZona(m({}))).toBeNull();
  });

  it('várias iguais por dimensões: a quantidade multiplica a conta toda', () => {
    expect(contaDaZona(m({ larguraCm: 1000, alturaCm: 1120, vaosCm2: 1400, quantidade: 2 }))).toEqual({
      expressao: '2 × (10 × 11,2 − 14)',
      resultadoCm2: 19_600,
    });
  });

  it('para qualquer zona, o resultado é o de surfaceArea', () => {
    const casos: Partial<SurfaceInput>[] = [
      { larguraCm: 1234, alturaCm: 567, vaosCm2: 0 },
      { larguraCm: 1234, alturaCm: 567, vaosCm2: 99_999 }, // vãos a mais: zero, como em surfaceArea
      { larguraCm: 333, alturaCm: 333, quantidade: 7 },
      { areaDireta: 12_345, quantidade: 3 },
    ];
    for (const c of casos) {
      const s: SurfaceInput = { kind: 'fachada', descricao: null, origem: 'estimativa', origemQuantidade: null, trabalhos: null, ...m(c) };
      expect(contaDaZona(m(c))!.resultadoCm2).toBe(surfaceArea(s));
    }
  });
});
