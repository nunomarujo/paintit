import { describe, expect, it } from 'vitest';
import {
  arestasPerto,
  areaDaZona,
  areasDaFachada,
  contagemSugerida,
  corrigirSaliencias,
  deslocarArestas,
  leituraDeAlturas,
  moverArestas,
  verticesDaZona,
  zonaDeDoisCantos,
  zonaContem,
  zonasEmSerie,
  type CantoReto,
  type TipoZona,
  type Zona,
} from './fachadaMedida';

let n = 0;
const z = (tipo: TipoZona, x: number, y: number, largura: number, altura: number): Zona => ({
  id: String(n++),
  tipo,
  x,
  y,
  largura,
  altura,
});
const contorno = z('fachada', 0, 0, 10, 20); // 200 m²

describe('areasDaFachada', () => {
  it('sem contorno, não há área — e diz o que falta', () => {
    const r = areasDaFachada([z('vao', 1, 1, 2, 2)]);
    expect(r.temContorno).toBe(false);
    expect(r.pintavelM2).toBe(0);
    expect(r.avisos.join(' ')).toMatch(/contorno/);
  });

  it('só o contorno: tudo pintável, e a frente/altura são as do contorno', () => {
    const r = areasDaFachada([contorno]);
    expect(r.contornoM2).toBe(200);
    expect(r.pintavelM2).toBe(200);
    expect(r.frenteM).toBe(10);
    expect(r.alturaM).toBe(20);
  });

  it('vãos (handoff, teste 4): 0,99 m² não desconta, 1,01 m² desconta exatamente 1,01 m²', () => {
    const pequeno = z('vao', 1, 1, 0.99, 1);
    const grande = z('vao', 4, 1, 1.01, 1);
    const r = areasDaFachada([contorno, pequeno, grande]);
    expect(r.pintavelM2).toBeCloseTo(200 - 1.01, 6);
    expect(r.vaosDescontados).toBe(1);
    expect(r.vaosPequenos).toBe(1);
  });

  it('um vão de exatamente 1 m² não desconta («igual ou inferior»)', () => {
    expect(areasDaFachada([contorno, z('vao', 1, 1, 1, 1)]).pintavelM2).toBe(200);
  });

  it('marquises (promotor, 04/11/2026): a frente pinta-se e só os vidros, desenhados como vãos, descontam', () => {
    const marquise = z('marquise', 2, 5, 3, 2);
    expect(areasDaFachada([contorno, marquise]).pintavelM2).toBe(200);
    expect(areasDaFachada([contorno, marquise, z('vao', 2.3, 5.9, 2.4, 1)]).pintavelM2).toBeCloseTo(197.6, 9);
  });

  it('marquises: laterais (altura × saliência), tecto e cobertura (largura × saliência); sem saliência, por medir', () => {
    const marquise = z('marquise', 2, 5, 3, 2);
    const semMedida = areasDaFachada([contorno, marquise]);
    const acrescentos = semMedida.linhas.filter((l) => l.efeito === 'acrescenta');
    expect(acrescentos.map((l) => l.rotulo)).toEqual([
      'Marquises — paredes laterais',
      'Marquises — tecto da mais baixa',
      'Marquises — cobertura da mais alta',
    ]);
    expect(acrescentos.every((l) => l.porMedir && l.areaM2 === 0)).toBe(true);
    expect(semMedida.coberturasSalientes).toEqual({ existem: true, areaM2: null });
    const comMedida = areasDaFachada([contorno, marquise], { salienciaMarquisesM: 1.2 });
    // laterais 2 × 2 m × 1,2 = 4,8; tecto 3 × 1,2 = 3,6; cobertura 3,6
    expect(comMedida.pintavelM2).toBeCloseTo(200 + 4.8 + 3.6 + 3.6, 9);
    expect(comMedida.coberturasSalientes).toEqual({ existem: true, areaM2: 3.6 });
  });

  it('marquises lado a lado partilham a parede do meio; empilhadas são uma coluna (tecto só em baixo, cobertura só em cima)', () => {
    const ladoALado = areasDaFachada([contorno, z('marquise', 1, 5, 2, 2), z('marquise', 3, 5, 2, 2)], { salienciaMarquisesM: 1 });
    expect(ladoALado.pintavelM2).toBe(200 + 4 + 4 + 4); // 2 lados de fora × 2 m; tecto e cobertura das duas (2 + 2)
    const empilhadas = areasDaFachada([contorno, z('marquise', 1, 5, 2, 2), z('marquise', 1, 8, 2, 2)], { salienciaMarquisesM: 1 });
    expect(empilhadas.pintavelM2).toBe(200 + 10 + 2 + 2); // laterais de 5 a 10 m (o intervalo é parede da coluna)
  });

  it('revisão de 04/11: laterais, tecto e cobertura só contam dentro do contorno e fora de um R/C excluído', () => {
    const s1 = { salienciaMarquisesM: 1 };
    expect(areasDaFachada([contorno, z('marquise', 12, 5, 2, 2)], s1).pintavelM2).toBe(200); // fora do contorno
    expect(areasDaFachada([contorno, z('marquise', 2, 18, 2, 4)], s1).pintavelM2).toBe(200 + 4 + 2); // sobe 2 m acima: 2 lados × 2 m + tecto
    const rcFora = areasDaFachada([contorno, z('rc', 0, 0, 10, 4), z('marquise', 2, 1, 2, 2)], { ...s1, incluirRC: false });
    expect(rcFora.pintavelM2).toBe(160);
  });

  it('revisão de 04/11: marquise triangular tem um só lado vertical; o lado inclinado é cobertura', () => {
    const r = areasDaFachada([contorno, tri('marquise', 'inf-dir', 2, 5, 3, 2)], { salienciaMarquisesM: 1 });
    expect(r.pintavelM2).toBeCloseTo(200 + 2 + 3 + Math.hypot(3, 2), 2);
  });

  it('revisão de 04/11: uma marquise desenhada duas vezes, ou à mão com 10 cm de folga ou sobreposição, não duplica a parede', () => {
    const s1 = { salienciaMarquisesM: 1 };
    const uma = areasDaFachada([contorno, z('marquise', 2, 5, 3, 2)], s1).pintavelM2;
    expect(areasDaFachada([contorno, z('marquise', 2, 5, 3, 2), z('marquise', 2, 5, 3, 2)], s1).pintavelM2).toBe(uma);
    const folga = areasDaFachada([contorno, z('marquise', 1, 5, 2, 2), z('marquise', 3.1, 5, 2, 2)], s1);
    expect(folga.linhas.find((l) => l.rotulo === 'Marquises — paredes laterais')!.areaM2).toBe(4);
    const sobreposta = areasDaFachada([contorno, z('marquise', 1, 5, 2.1, 2), z('marquise', 3, 5, 2, 2)], s1);
    expect(sobreposta.linhas.find((l) => l.rotulo === 'Marquises — paredes laterais')!.areaM2).toBe(4);
  });

  it('vidros nas paredes laterais (medidos no local) descontam das laterais', () => {
    const r = areasDaFachada([contorno, z('marquise', 2, 5, 3, 2)], { salienciaMarquisesM: 1, vidrosLateraisMarquisesM2: 1.5 });
    expect(r.linhas.find((l) => l.rotulo === 'Marquises — paredes laterais')!.areaM2).toBe(2.5);
  });

  it('R/C pinta-se por omissão (promotor, 04/11/2026) e pode excluir-se', () => {
    const rc = z('rc', 0, 0, 10, 4);
    expect(areasDaFachada([contorno, rc]).pintavelM2).toBe(200);
    expect(areasDaFachada([contorno, rc], { incluirRC: false }).pintavelM2).toBe(160);
  });

  it('as montras do R/C descontam-se como vãos quando o R/C se pinta', () => {
    expect(areasDaFachada([contorno, z('rc', 0, 0, 10, 4), z('vao', 1, 0.5, 3, 2)]).pintavelM2).toBe(194);
  });

  it('um vão dentro de um R/C excluído não se desconta duas vezes', () => {
    const r = areasDaFachada([contorno, z('rc', 0, 0, 10, 4), z('vao', 3, 0, 2, 2)], { incluirRC: false });
    expect(r.pintavelM2).toBe(160);
    expect(r.linhas.find((l) => l.tipo === 'vao')!.areaM2).toBe(0);
  });

  it('as linhas somam exatamente o pintável (contorno − R/C excluído − vãos + laterais das marquises)', () => {
    const zonas = [contorno, z('rc', 0, 0, 10, 4), z('marquise', 1, 3, 3, 3), z('vao', 6, 2, 2, 4), z('vao', 6, 10, 1.5, 1.2)];
    for (const opcoes of [{}, { incluirRC: false }, { incluirRC: false, salienciaMarquisesM: 1.3 }]) {
      const r = areasDaFachada(zonas, opcoes);
      const soma = (e: string) => r.linhas.filter((l) => l.efeito === e).reduce((s, l) => s + l.areaM2, 0);
      expect(r.contornoM2 - soma('desconta') - soma('fora') + soma('acrescenta')).toBeCloseTo(r.pintavelM2, 6);
    }
  });

  it('varandas abertas não descontam — a frente faz parte da fachada pintada', () => {
    const r = areasDaFachada([contorno, z('varanda', 0, 4, 3, 16)]);
    expect(r.pintavelM2).toBe(200);
    expect(r.linhas.find((l) => l.tipo === 'varanda')!.areaM2).toBe(48);
  });

  it('dois contornos sobrepostos (prédio com recuo) contam a união, não a soma', () => {
    const r = areasDaFachada([z('fachada', 0, 0, 10, 20), z('fachada', 8, 0, 6, 15)]);
    expect(r.contornoM2).toBe(200 + 4 * 15); // os 2 m de sobreposição (8 → 10) não contam duas vezes
    expect(r.frenteM).toBe(14);
  });

  it('só conta o que está dentro do contorno, e avisa do resto', () => {
    const r = areasDaFachada([contorno, z('vao', 8, 5, 4, 2)]); // metade fora
    expect(r.pintavelM2).toBe(196);
    expect(r.avisos.join(' ')).toMatch(/fora do contorno/);
  });

  it('zonaDeDoisCantos aceita os cantos por qualquer ordem', () => {
    const a = zonaDeDoisCantos('x', 'vao', { x: 5, y: 1 }, { x: 2, y: 4 });
    expect(a).toMatchObject({ x: 2, y: 1, largura: 3, altura: 3 });
  });
});

describe('zonasEmSerie', () => {
  it('uma coluna: primeiro e último desenhados, os do meio igualmente espaçados', () => {
    const r = zonasEmSerie(z('vao', 2, 4, 1.4, 1.2), z('vao', 2, 16, 1.4, 1.2), 5, (i) => `s${i}`);
    expect(r.map((q) => q.y)).toEqual([4, 7, 10, 13, 16]);
    expect(r.every((q) => q.x === 2 && q.largura === 1.4 && q.altura === 1.2 && q.tipo === 'vao')).toBe(true);
    expect(new Set(r.map((q) => q.id)).size).toBe(5);
  });

  it('o primeiro e o último ficam exatamente como foram desenhados; a diferença de tamanho reparte-se', () => {
    const r = zonasEmSerie(z('marquise', 0, 0, 2, 1.8), z('marquise', 0.4, 12, 2.2, 2.2), 3, String);
    expect(r[0]).toMatchObject({ x: 0, y: 0, largura: 2, altura: 1.8 });
    expect(r[2]).toMatchObject({ x: 0.4, y: 12, largura: 2.2, altura: 2.2 });
    expect(r[1]!.largura).toBeCloseTo(2.1, 9);
    expect(r[1]!.altura).toBeCloseTo(2.0, 9);
  });

  it('nunca menos de dois (o primeiro e o último)', () => {
    expect(zonasEmSerie(z('vao', 0, 0, 1, 1), z('vao', 0, 9, 1, 1), 0, String)).toHaveLength(2);
  });
});

describe('contagemSugerida', () => {
  it('numa coluna sugere um por piso (pé-direito de 2,9 m)', () => {
    expect(contagemSugerida(z('vao', 0, 3, 1.4, 1.2), z('vao', 0, 17.5, 1.4, 1.2))).toBe(6);
  });
  it('numa linha sugere um por cada duas larguras', () => {
    expect(contagemSugerida(z('vao', 0, 3, 1.5, 1.2), z('vao', 9, 3, 1.5, 1.2))).toBe(4);
  });
});

describe('acertar uma zona pela aresta', () => {
  const q = z('vao', 2, 4, 2, 1);
  it('encontra a aresta a que se tocou, e duas num canto', () => {
    expect(arestasPerto(q, { x: 2.05, y: 4.5 }, 0.1)).toEqual(['esquerda']);
    expect(arestasPerto(q, { x: 3, y: 5.08 }, 0.1)).toEqual(['cima']);
    expect(arestasPerto(q, { x: 4.02, y: 3.97 }, 0.1)).toEqual(['direita', 'baixo']);
    expect(arestasPerto(q, { x: 3, y: 4.5 }, 0.1)).toEqual([]); // no meio: desenha uma zona nova
    expect(arestasPerto(q, { x: 2, y: 9 }, 0.1)).toEqual([]); // no prolongamento da aresta, longe da zona
  });
  it('revisão de 04/11 (telemóvel): no meio da aresta de cima de uma janela pequena agarra só essa aresta', () => {
    const janela = z('vao', 2, 5, 1.2, 1.4);
    expect(arestasPerto(janela, { x: 2.6, y: 6.4 }, 0.8)).toEqual(['cima']);
    expect(arestasPerto(janela, { x: 2.02, y: 6.38 }, 0.8)).toEqual(['esquerda', 'cima']);
    expect(arestasPerto(janela, { x: 3.15, y: 5.7 }, 0.8)).toEqual(['direita']);
  });

  it('acertar por deslocamento: a aresta anda o que o dedo andou, não salta para o dedo', () => {
    expect(deslocarArestas(q, ['cima'], { x: 9, y: 0.5 })).toMatchObject({ x: 2, y: 4, largura: 2, altura: 1.5 });
    const esq = deslocarArestas(q, ['esquerda'], { x: -0.3, y: 0 });
    expect(esq.x).toBeCloseTo(1.7, 9);
    expect(esq.largura).toBeCloseTo(2.3, 9);
  });

  it('move só a aresta escolhida, e nunca deixa a zona virar do avesso', () => {
    expect(moverArestas(q, ['cima'], { x: 99, y: 6 })).toMatchObject({ x: 2, y: 4, largura: 2, altura: 2 });
    const encolhida = moverArestas(q, ['esquerda'], { x: 7, y: 0 });
    expect(encolhida.x).toBeCloseTo(3.8, 9);
    expect(encolhida.largura).toBeCloseTo(0.2, 9);
  });
});

const tri = (tipo: TipoZona, canto: CantoReto, x: number, y: number, largura: number, altura: number): Zona => ({
  ...z(tipo, x, y, largura, altura),
  triangulo: canto,
});

describe('zonas triangulares', () => {
  it('um triângulo é metade do retângulo, com o ângulo reto no canto escolhido', () => {
    const t = tri('fachada', 'sup-dir', 0, 0, 4, 3);
    expect(areaDaZona(t)).toBe(6);
    const v = verticesDaZona(t);
    expect(v).toHaveLength(3);
    expect(v).toContainEqual({ x: 4, y: 3 }); // o ângulo reto
    expect(v).not.toContainEqual({ x: 0, y: 0 }); // o canto cortado
  });

  it('parede por cima do telhado do vizinho: contorno retangular + triângulo por cima', () => {
    const r = areasDaFachada([z('fachada', 0, 0, 10, 20), tri('fachada', 'sup-esq', 0, 20, 10, 4)]);
    expect(r.contornoM2).toBe(220);
    expect(r.alturaM).toBe(24);
  });

  it('triângulo meio sobreposto ao contorno: conta a união exata, não a soma', () => {
    // Triângulo de 5 a 15 m, com o ângulo reto em baixo à direita: a parte de 5 a 10 m (12,5 m²) já estava no contorno.
    const r = areasDaFachada([z('fachada', 0, 0, 10, 10), tri('fachada', 'inf-dir', 5, 0, 10, 10)]);
    expect(r.contornoM2).toBe(137.5);
  });

  it('diagonais que se cruzam: dois triângulos no mesmo retângulo, em espelho', () => {
    // União = abaixo do maior de y = x e y = 10 − x → 75 m²; o cruzamento a meio (x = 5) tem de ser um corte.
    const r = areasDaFachada([tri('fachada', 'inf-esq', 0, 0, 10, 10), tri('fachada', 'inf-dir', 0, 0, 10, 10)]);
    expect(r.contornoM2).toBe(75);
  });

  it('um vão triangular segue a regra do 1 m² pela sua área (metade do retângulo)', () => {
    expect(areasDaFachada([contorno, tri('vao', 'inf-esq', 1, 1, 2, 1)]).pintavelM2).toBe(200); // 1 m²: não desconta
    expect(areasDaFachada([contorno, tri('vao', 'inf-esq', 1, 1, 2, 1.2)]).pintavelM2).toBeCloseTo(198.8, 9);
  });

  it('as contas exatas batem com uma amostragem fina, em formas misturadas e sobrepostas', () => {
    const zonas = [
      z('fachada', 0, 0, 9, 12),
      tri('fachada', 'sup-dir', 3, 12, 6, 3.5),
      tri('fachada', 'inf-esq', 9, 0, 4, 7),
      z('rc', 0, 0, 13, 3),
      tri('vao', 'sup-esq', 1, 5, 3, 2),
      z('vao', 2.5, 5.5, 2, 1.5),
      tri('marquise', 'inf-dir', 6, 8, 2.5, 5),
    ];
    const r = areasDaFachada(zonas, { incluirRC: false });
    // Amostragem: o mesmo pintável, contado ponto a ponto numa grelha de 2 cm (ponto-em-polígono).
    const dentroDe = (q: Zona, x: number, y: number) => {
      const v = verticesDaZona(q);
      let dentro = false;
      for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
        const [a, b] = [v[i]!, v[j]!];
        if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
      }
      return dentro;
    };
    const h = 0.02;
    let amostrado = 0;
    for (let x = h / 2; x < 14; x += h) {
      for (let y = h / 2; y < 16; y += h) {
        const em = (t: TipoZona) => zonas.some((q) => q.tipo === t && dentroDe(q, x, y));
        const vaoGrande = zonas.some((q) => q.tipo === 'vao' && areaDaZona(q) > 1 && dentroDe(q, x, y));
        if (em('fachada') && !em('rc') && !vaoGrande) amostrado += h * h;
      }
    }
    expect(Math.abs(r.pintavelM2 - amostrado) / amostrado).toBeLessThan(0.003);
  });

  it('tocar dentro de um triângulo escolhe-o; no canto cortado, não', () => {
    const t = tri('vao', 'sup-dir', 0, 0, 4, 4);
    expect(zonaContem(t, { x: 3.5, y: 3.5 })).toBe(true);
    expect(zonaContem(t, { x: 0.5, y: 0.5 })).toBe(false);
    expect(zonaContem(z('vao', 0, 0, 4, 4), { x: 0.5, y: 0.5 })).toBe(true);
  });

  it('a série e o acertar de arestas guardam a forma triangular', () => {
    const s = zonasEmSerie(tri('vao', 'sup-dir', 0, 0, 2, 2), tri('vao', 'sup-dir', 0, 9, 2, 2), 4, String);
    expect(s.every((q) => q.triangulo === 'sup-dir')).toBe(true);
    expect(moverArestas(tri('vao', 'inf-esq', 0, 0, 2, 2), ['cima'], { x: 0, y: 3 }).triangulo).toBe('inf-esq');
    expect(zonaDeDoisCantos('t', 'fachada', { x: 0, y: 0 }, { x: 1, y: 1 }, 'inf-dir').triangulo).toBe('inf-dir');
    expect('triangulo' in zonaDeDoisCantos('r', 'fachada', { x: 0, y: 0 }, { x: 1, y: 1 })).toBe(false);
  });
});

describe('leituraDeAlturas', () => {
  it('altura entre pisos pela distância entre janelas da mesma coluna; R/C pelo desenho', () => {
    const zonas = [
      z('fachada', 0, 0, 10, 20),
      z('rc', 0, 0, 10, 4),
      ...[0, 1, 2, 3, 4].map((i) => z('vao', 1, 5 + 3 * i, 1.4, 1.2)),
      ...[0, 1, 2, 3, 4].map((i) => z('vao', 6, 5.1 + 3 * i, 1.8, 1.3)),
    ];
    const l = leituraDeAlturas(zonas)!;
    expect(l.entrePisosM).toBe(3);
    expect(l.medicoes).toBe(8);
    expect(l.pisos).toBe(5);
    expect(l.rcM).toBe(4);
  });

  it('revisão de 04/11: a porta e as montras do R/C (desenhadas como vãos) não entram nas colunas', () => {
    const base = [z('fachada', 0, 0, 10, 12), z('rc', 0, 0, 10, 3.2), z('vao', 1, 4.1, 1.4, 1.2), z('vao', 1, 7.1, 1.4, 1.2)];
    const comPorta = leituraDeAlturas([...base, z('vao', 1, 0, 1.4, 2.4)])!;
    expect(comPorta).toMatchObject({ entrePisosM: 3, medicoes: 1, pisos: 2 });
    const alto = [
      z('fachada', 0, 0, 10, 22.5),
      z('rc', 0, 0, 10, 4),
      z('vao', 1, 0, 1.65, 3.77),
      ...[0, 1, 2, 3, 4].map((i) => z('vao', 1, 5 + 3 * i, 1.4, 1.2)),
    ];
    expect(leituraDeAlturas(alto)).toMatchObject({ entrePisosM: 3, pisos: 5 });
    const montraLarga = [
      z('fachada', 0, 0, 10, 20),
      z('rc', 0, 0, 10, 4),
      z('vao', 0.5, 0.5, 5.5, 3),
      ...[0, 1, 2, 3, 4].map((i) => z('vao', 1, 5 + 3 * i, 1.4, 1.2)),
      ...[0, 1, 2, 3, 4].map((i) => z('vao', 4, 5.1 + 3 * i, 1.4, 1.2)),
    ];
    expect(leituraDeAlturas(montraLarga)).toMatchObject({ entrePisosM: 3, medicoes: 8, pisos: 5 });
  });

  it('sem R/C desenhado, o que nasce no chão (a porta) também fica de fora', () => {
    const zonas = [z('fachada', 0, 0, 10, 20), z('vao', 1, 0, 1.4, 2.4), ...[0, 1, 2].map((i) => z('vao', 1, 5 + 3 * i, 1.4, 1.2))];
    expect(leituraDeAlturas(zonas)).toMatchObject({ entrePisosM: 3, pisos: 3 });
  });

  it('sem elementos repetidos na vertical, não há leitura (não se inventa)', () => {
    expect(leituraDeAlturas([contorno, z('vao', 1, 5, 1, 1), z('vao', 5, 5, 1, 1)])).toBeNull();
  });

  it('uma varanda desenhada de alto a baixo, de uma vez, não conta como pisos', () => {
    expect(leituraDeAlturas([contorno, z('varanda', 1, 4, 3, 15)])).toBeNull();
  });
});

describe('corrigirSaliencias', () => {
  const centro = { x: 5, y: 1.5, z: 10 };
  it('marquises e os vidros nelas encolhem para o tamanho verdadeiro (fator (z − s)/z, em torno do pé da câmara)', () => {
    const marquise = z('marquise', 1, 5, 3, 2.5);
    const vidro = z('vao', 1.5, 5.5, 2, 1.2);
    const janela = z('vao', 6, 5, 1.4, 1.2); // na parede, fora da marquise
    const [m, v, j] = corrigirSaliencias([marquise, vidro, janela], centro, { marquise: 1 });
    expect(m!.largura).toBeCloseTo(3 * 0.9, 9);
    expect(m!.altura).toBeCloseTo(2.5 * 0.9, 9);
    expect(m!.x).toBeCloseTo(5 + (1 - 5) * 0.9, 9);
    expect(v!.largura).toBeCloseTo(2 * 0.9, 9);
    expect(j).toBe(janela);
  });
  it('sem câmara ou sem saliência, nada muda', () => {
    const zonas = [z('marquise', 1, 5, 3, 2.5)];
    expect(corrigirSaliencias(zonas, null, { marquise: 1 })).toBe(zonas);
    expect(corrigirSaliencias(zonas, centro, {})).toBe(zonas);
  });
  it('varandas com a sua própria saliência; as portas de varanda (na parede) não mudam', () => {
    const varanda = z('varanda', 1, 4, 3, 9);
    const porta = z('vao', 1.5, 4.2, 0.9, 2.1); // dentro da coluna de varandas, mas na parede
    const marquise = z('marquise', 6, 4, 2, 9);
    const [v, p, m] = corrigirSaliencias([varanda, porta, marquise], centro, { varanda: 2 });
    expect(v!.largura).toBeCloseTo(3 * 0.8, 9);
    expect(p).toBe(porta);
    expect(m).toBe(marquise); // sem saliência das marquises, a marquise fica como desenhada
  });
});

describe('o que falta medir (subtotal honesto)', () => {
  it('só o contorno: nada falta', () => {
    expect(areasDaFachada([contorno]).porMedir).toEqual([]);
  });
  it('marquises sem saliência: falta a saliência; com ela, já não', () => {
    const zonas = [contorno, z('marquise', 2, 5, 3, 2)];
    expect(areasDaFachada(zonas).porMedir).toEqual(['saliência das marquises (paredes laterais, tecto e cobertura)']);
    expect(areasDaFachada(zonas, { salienciaMarquisesM: 1.2 }).porMedir).toEqual([]);
  });
  it('varandas: as faces de dentro ficam por decidir (8.2)', () => {
    expect(areasDaFachada([contorno, z('varanda', 1, 4, 3, 9)]).porMedir).toEqual([
      'faces de dentro das varandas (por decidir — decisão 8.2)',
    ]);
  });
  it('sem contorno, falta o contorno', () => {
    expect(areasDaFachada([z('vao', 1, 1, 2, 2)]).porMedir).toEqual(['contorno da fachada']);
  });
});

describe('sem base de dados', () => {
  it('fachadaMedida.ts não importa cliente de base de dados', async () => {
    const fonte = await import('fs/promises').then((fs) => fs.readFile(new URL('./fachadaMedida.ts', import.meta.url), 'utf8'));
    expect(fonte).not.toMatch(/supabase/i);
  });
});
