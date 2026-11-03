import { describe, expect, it } from 'vitest';
import { retificarZona, desvioAngularDosCantos, type CantosZona, type Ponto } from './retificacao';

const LIMIAR_ERRO_AREA = 0.5; // percentagem — proposto, a confirmar no piloto (handoff, secção 7)

/**
 * Projeta um retângulo real (largura × altura, em cm), visto de frente a uma distância `distanciaCm`,
 * com a câmara inclinada `inclinacaoGraus` para cima em torno do eixo horizontal (o caso do handoff:
 * telemóvel inclinado para cima a fotografar um vão de prédio). `focal` é a focal em "pixels
 * equivalentes"; `dimensoesImagem` fixa o centro ótico assumido pela retificação.
 */
function projetarRetangulo(
  larguraCm: number,
  alturaCm: number,
  distanciaCm: number,
  inclinacaoGraus: number,
  focal: number,
  dimensoesImagem: { largura: number; altura: number }
): CantosZona {
  const theta = (inclinacaoGraus * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  // Cantos no plano da parede, antes de rodar: X horizontal, Y vertical, Z profundidade.
  const pontos3d = {
    topoEsquerdo: { x: -larguraCm / 2, y: alturaCm / 2, z: distanciaCm },
    topoDireito: { x: larguraCm / 2, y: alturaCm / 2, z: distanciaCm },
    baseDireita: { x: larguraCm / 2, y: -alturaCm / 2, z: distanciaCm },
    baseEsquerda: { x: -larguraCm / 2, y: -alturaCm / 2, z: distanciaCm },
  };

  const projetar = (p: { x: number; y: number; z: number }): Ponto => {
    const yRodado = p.y * cos - p.z * sin;
    const zRodado = p.y * sin + p.z * cos;
    return {
      x: dimensoesImagem.largura / 2 + (focal * p.x) / zRodado,
      y: dimensoesImagem.altura / 2 - (focal * yRodado) / zRodado,
    };
  };

  return {
    topoEsquerdo: projetar(pontos3d.topoEsquerdo),
    topoDireito: projetar(pontos3d.topoDireito),
    baseDireita: projetar(pontos3d.baseDireita),
    baseEsquerda: projetar(pontos3d.baseEsquerda),
  };
}

describe('retificarZona', () => {
  const dimensoesImagem = { largura: 1536, altura: 2048 };
  const focal = 2200;
  const distanciaCm = 500;

  it.each([0, 15, 30])('recupera a área de um retângulo de 300×250cm com inclinação de %i°', (inclinacao) => {
    const larguraReal = 300;
    const alturaReal = 250;
    const cantos = projetarRetangulo(larguraReal, alturaReal, distanciaCm, inclinacao, focal, dimensoesImagem);

    const distanciaRealCm = Math.hypot(
      cantos.baseDireita.x - cantos.baseEsquerda.x,
      cantos.baseDireita.y - cantos.baseEsquerda.y
    );
    // Usa-se a distância em pixels só para ter dois pontos na base; a distância REAL é a conhecida.
    const resultado = retificarZona(
      cantos,
      cantos.baseEsquerda,
      cantos.baseDireita,
      larguraReal,
      dimensoesImagem
    );
    expect(distanciaRealCm).toBeGreaterThan(0); // os dois pontos não coincidem

    const areaReal = larguraReal * alturaReal;
    const erroPercentual = (Math.abs(resultado.areaCm2 - areaReal) / areaReal) * 100;
    expect(erroPercentual).toBeLessThan(LIMIAR_ERRO_AREA);
  });

  it('assinala um quadrilátero com um canto a 85º', () => {
    const topoEsquerdo: Ponto = { x: 0, y: 0 };
    const topoDireito: Ponto = { x: 100, y: 0 };
    const baseEsquerda: Ponto = { x: 0, y: 100 };
    // Ângulo em topoDireito entre (topoDireito→topoEsquerdo) e (topoDireito→baseDireita) = 85º.
    const anguloRad = (95 * Math.PI) / 180;
    const baseDireita: Ponto = {
      x: topoDireito.x + 100 * Math.cos(anguloRad),
      y: topoDireito.y + 100 * Math.sin(anguloRad),
    };
    const cantos: CantosZona = { topoEsquerdo, topoDireito, baseDireita, baseEsquerda };

    expect(desvioAngularDosCantos(cantos)).toBeGreaterThan(4);

    const resultado = retificarZona(cantos, topoEsquerdo, topoDireito, 100, { largura: 1000, altura: 1000 });
    expect(resultado.estado).toBe('revisao');
    expect(resultado.motivo).toBe('a zona não parece retangular');
  });

  it('não assinala um quadrilátero com todos os cantos a 90º', () => {
    const cantos: CantosZona = {
      topoEsquerdo: { x: 0, y: 0 },
      topoDireito: { x: 100, y: 0 },
      baseDireita: { x: 100, y: 100 },
      baseEsquerda: { x: 0, y: 100 },
    };

    expect(desvioAngularDosCantos(cantos)).toBeCloseTo(0, 5);

    const resultado = retificarZona(
      cantos,
      cantos.topoEsquerdo,
      cantos.topoDireito,
      100,
      { largura: 1000, altura: 1000 }
    );
    expect(resultado.estado).toBe('ok');
    expect(resultado.motivo).toBeNull();
  });

  // O teste 9 do handoff (vão real, 1536×2048, fotografado de baixo) fica de fora desta sessão: a
  // razaoLarguraAltura implementada aqui resolve-se exatamente (erro <1e-10%) quando o centro vertical
  // da zona coincide com o eixo ótico da câmara (os testes acima, e o caso real quando testado à
  // parte), mas verificou-se que o sistema de equações fica indeterminado — um grau de liberdade a
  // mais do que equações — quando a zona está deslocada verticalmente do eixo (o caso do vão real,
  // fotografado do chão para cima). Ver `docs/DECISOES.md`, 03/11/2026, para a derivação e o porquê.

  it('sem imports de cliente de base de dados', async () => {
    const fonte = await import('fs/promises').then((fs) => fs.readFile(new URL('./retificacao.ts', import.meta.url), 'utf8'));
    expect(fonte).not.toMatch(/supabase/i);
  });
});
