import { describe, expect, it } from 'vitest';
import {
  PE_DIREITO_CORRENTE,
  alturaDoPredio,
  avisoDoRealce,
  cotasDoPredio,
  dimensao,
  facesDaZona,
  piorCerteza,
  porMedir,
  porqueNaoTemEscala,
  textoDaCota,
  type GeometriaDoPredio,
} from './geometria';

const g = (o: Partial<GeometriaDoPredio> = {}): GeometriaDoPredio => ({
  forma: 'I',
  pisos: 4,
  largura: dimensao(18),
  profundidade: dimensao(12),
  peDireito: dimensao(2.9),
  ...o,
});

describe('nunca inventar uma dimensão', () => {
  it('uma área, por maior que seja, não produz uma largura', () => {
    // A regra do promotor: «não inferir geometria a partir de áreas insuficientes». Não há nenhuma
    // função aqui que receba uma área — é essa a maneira de não a inferir.
    const semNada = g({ largura: porMedir, profundidade: porMedir });
    expect(cotasDoPredio(semNada).find((c) => c.eixo === 'largura')!.texto).toBe('Por medir');
  });

  it('um número impossível é tão desconhecido como nenhum número', () => {
    expect(dimensao(0)).toEqual(porMedir);
    expect(dimensao(-3)).toEqual(porMedir);
    expect(dimensao(Number.NaN)).toEqual(porMedir);
    expect(dimensao(null)).toEqual(porMedir);
  });

  it('sem pé-direito não se arbitra o pé-direito corrente', () => {
    expect(alturaDoPredio(g({ peDireito: porMedir }))).toEqual(porMedir);
    // O valor corrente existe para ser **oferecido**, e nunca aplicado às escondidas.
    expect(alturaDoPredio(g({ peDireito: dimensao(PE_DIREITO_CORRENTE, 'estimada') })).metros).toBe(11.2);
  });

  it('sem pisos também não', () => {
    expect(alturaDoPredio(g({ pisos: null }))).toEqual(porMedir);
    expect(alturaDoPredio(g({ pisos: 0 }))).toEqual(porMedir);
  });
});

describe('a altura', () => {
  it('é pisos vezes pé-direito', () => {
    expect(alturaDoPredio(g()).metros).toBe(11.6);
  });

  it('herda a pior certeza das parcelas', () => {
    expect(alturaDoPredio(g()).certeza).toBe('declarada');
    expect(alturaDoPredio(g({ peDireito: dimensao(2.8, 'estimada') })).certeza).toBe('estimada');
  });

  it('a pior certeza é a mais fraca de todas', () => {
    expect(piorCerteza('declarada', 'declarada')).toBe('declarada');
    expect(piorCerteza('declarada', 'estimada')).toBe('estimada');
    expect(piorCerteza('estimada', 'desconhecida')).toBe('desconhecida');
  });
});

describe('o que se escreve numa cota', () => {
  it('uma medida declarada é um número e mais nada', () => {
    expect(textoDaCota(dimensao(18))).toBe('18 m');
  });

  it('uma estimativa diz que é uma estimativa', () => {
    expect(textoDaCota(dimensao(18, 'estimada'))).toBe('18 m (estimada)');
  });

  it('o que falta diz que falta, e não desaparece da lista', () => {
    const cotas = cotasDoPredio(g({ profundidade: porMedir }));
    expect(cotas).toHaveLength(3);
    expect(cotas.find((c) => c.eixo === 'profundidade')!.texto).toBe('Por medir');
  });
});

describe('quando o desenho não está em escala', () => {
  it('com tudo medido, está', () => {
    expect(porqueNaoTemEscala(g())).toBeNull();
  });

  it('sem frente, diz que falta a frente', () => {
    expect(porqueNaoTemEscala(g({ largura: porMedir }))).toContain('a frente');
  });

  it('sem pisos, a altura que falta é dos pisos; com pisos, é do pé-direito', () => {
    expect(porqueNaoTemEscala(g({ pisos: null }))).toContain('os pisos');
    expect(porqueNaoTemEscala(g({ peDireito: porMedir }))).toContain('o pé-direito');
  });

  it('faltando as duas, nomeia as duas', () => {
    const m = porqueNaoTemEscala(g({ largura: porMedir, peDireito: porMedir }))!;
    expect(m).toContain('a frente');
    expect(m).toContain('o pé-direito');
  });
});

describe('que partes do desenho uma zona cobre', () => {
  it('um muro é o muro; uma varanda são as varandas', () => {
    expect(facesDaZona('muro')).toEqual(['muro']);
    expect(facesDaZona('varandas')).toEqual(['varanda']);
  });

  it('o que está dentro do prédio não aparece no volume, e diz-se', () => {
    expect(facesDaZona('paredes_interiores')).toEqual([]);
    expect(avisoDoRealce('tetos')).toMatch(/não aparece/);
  });

  it('uma fachada acende todas, porque o pedido não diz qual é', () => {
    expect(facesDaZona('fachada')).toEqual(['frente', 'lado']);
    expect(avisoDoRealce('fachada')).toMatch(/qual das fachadas/);
  });

  it('uma zona que o desenho aponta sem dúvidas não tem aviso nenhum', () => {
    expect(avisoDoRealce('muro')).toBeNull();
  });
});
