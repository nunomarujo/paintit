// Como se chega à forma de implantação sem pedir a ninguém que compare cinco desenhos.
//
// Decisão de 24/10/2026: escolher entre miniaturas é a parte difícil — obriga a imaginar o prédio de
// cima. Em vez disso: (1) a aplicação propõe a forma mais provável a partir do que já sabe; (2) se
// estiver errada, pergunta-se uma coisa que se responde a andar à volta do prédio — quantos cantos
// tem; (3) quem preferir desenha a planta numa grelha. O desenho do volume serve de confirmação do
// que foi respondido, nunca de pergunta.

import { footprintPlan, type Forma } from './volume';

/** Resposta à pergunta dos cantos. "outros" manda para a grelha. */
export type Cantos = 4 | 6 | 8 | 'outros';
/** Só se pergunta com oito cantos: o recorte ao meio é um pátio aberto ou um corpo que avança? */
export type Recorte = 'patio' | 'avanco';

/**
 * Forma mais provável, do que já está declarado no prédio. É o que aparece já escolhido: na maior
 * parte dos casos o avaliador só confirma e não escolhe nada.
 */
export function formaProvavel(fachadasLivres: number | null, moradia: boolean): Forma {
  if (fachadasLivres !== null && fachadasLivres <= 2) return 'I';
  return moradia ? 'quadrado' : 'I';
}

/**
 * Forma a partir do número de cantos contados no local. Devolve `null` quando ainda falta responder
 * ao recorte (oito cantos) ou quando a contagem não corresponde a nenhuma forma da lista.
 */
export function formaPorCantos(cantos: Cantos, opcoes: { fachadasLivres: number | null; recorte?: Recorte }): Forma | null {
  if (cantos === 4) return (opcoes.fachadasLivres ?? 4) <= 2 ? 'I' : 'quadrado';
  if (cantos === 6) return 'L';
  if (cantos === 8) return opcoes.recorte === 'patio' ? 'U' : opcoes.recorte === 'avanco' ? 'T' : null;
  return null;
}

type Grelha = boolean[][];

const cheio = (g: Grelha) => g.every((linha) => linha.every(Boolean));

/** Recorta a grelha ao que está preenchido. Devolve `null` se não houver nada. */
export function recortar(g: Grelha): Grelha | null {
  const linhas = g.length;
  const colunas = g[0]?.length ?? 0;
  let l0 = linhas;
  let l1 = -1;
  let c0 = colunas;
  let c1 = -1;
  for (let l = 0; l < linhas; l++)
    for (let c = 0; c < colunas; c++)
      if (g[l]?.[c]) {
        l0 = Math.min(l0, l);
        l1 = Math.max(l1, l);
        c0 = Math.min(c0, c);
        c1 = Math.max(c1, c);
      }
  if (l1 < 0) return null;
  const out: Grelha = [];
  for (let l = l0; l <= l1; l++) {
    const linha: boolean[] = [];
    for (let c = c0; c <= c1; c++) linha.push(g[l]?.[c] ?? false);
    out.push(linha);
  }
  return out;
}

/** Desenha uma forma canónica numa grelha de `linhas` × `colunas`, para poder ser comparada. */
export function grelhaDaForma(forma: Forma, linhas: number, colunas: number): Grelha {
  const rects = footprintPlan(forma);
  const x0 = Math.min(...rects.map((r) => r[0]));
  const x1 = Math.max(...rects.map((r) => r[2]));
  const y0 = Math.min(...rects.map((r) => r[1]));
  const y1 = Math.max(...rects.map((r) => r[3]));
  const g: Grelha = [];
  for (let l = 0; l < linhas; l++) {
    const linha: boolean[] = [];
    // A linha 0 é a da frente (y máximo), como se vê o prédio da rua.
    const y = y1 - ((l + 0.5) / linhas) * (y1 - y0);
    for (let c = 0; c < colunas; c++) {
      const x = x0 + ((c + 0.5) / colunas) * (x1 - x0);
      linha.push(rects.some(([a, b, cc, d]) => x >= a && x <= cc && y >= b && y <= d));
    }
    g.push(linha);
  }
  return g;
}

const espelhar = (g: Grelha): Grelha => g.map((linha) => [...linha].reverse());
const semelhanca = (a: Grelha, b: Grelha) => {
  let iguais = 0;
  let total = 0;
  for (let l = 0; l < a.length; l++)
    for (let c = 0; c < (a[l]?.length ?? 0); c++) {
      total++;
      if ((a[l]?.[c] ?? false) === (b[l]?.[c] ?? false)) iguais++;
    }
  return total === 0 ? 0 : iguais / total;
};

/**
 * Forma correspondente a uma planta desenhada numa grelha. Compara com as formas canónicas, de frente
 * e espelhadas (um L virado ao contrário continua a ser um L). Um retângulo cheio é barra ou quadrado
 * conforme as proporções.
 */
export function formaDaGrelha(g: Grelha): Forma | null {
  const r = recortar(g);
  if (!r) return null;
  const linhas = r.length;
  const colunas = r[0]?.length ?? 0;
  if (cheio(r)) return colunas / linhas >= 1.6 ? 'I' : 'quadrado';
  let melhor: Forma | null = null;
  let melhorScore = 0;
  for (const forma of ['L', 'U', 'T'] as const) {
    const canonica = grelhaDaForma(forma, linhas, colunas);
    for (const candidata of [canonica, espelhar(canonica)]) {
      const s = semelhanca(r, candidata);
      if (s > melhorScore) {
        melhorScore = s;
        melhor = forma;
      }
    }
  }
  // Abaixo de três quartos de coincidência o desenho não é nenhuma destas formas.
  return melhorScore >= 0.75 ? melhor : null;
}
