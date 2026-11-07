/**
 * Rodar o desenho do prédio (passo 2 do pedido, 06/11/2026). Contas puras, sem nada de ecrã: o ângulo é o
 * azimute da câmara de `buildingVolume` (`volume.ts`), em graus.
 *
 * ## O sentido
 *
 * **Aumentar o ângulo roda o prédio para a esquerda**: a frente vai para a esquerda do ecrã e a lateral direita
 * aproxima-se (`prancheta.test.ts`, «rodar para a esquerda é aumentar o ângulo»). Arrastar para a direita faz
 * o contrário, como quem agarra o prédio e o puxa — a frente vai para a direita, e o ângulo diminui. Os botões
 * «Rodar à esquerda» e «Rodar à direita» seguem a mesma regra e andam de passo em passo.
 *
 * ## Os passos
 *
 * Os botões param em múltiplos de 45° a partir da vista inicial (25°): as faces do prédio ficam de frente, ou
 * quase, em oito paragens. Depois de um arrasto livre, o botão vai à paragem seguinte, e não a `atual ± 45`.
 */

/** O que cada botão roda. Oito paragens à volta do prédio. */
export const PASSO_DA_ROTACAO = 45;

/** Quantos graus roda cada píxel arrastado: uma largura de ~400 px dá meia volta. */
export const GRAUS_POR_PX = 0.45;

/** Quanto, em píxeis, o ponteiro tem de andar para o toque virar arrasto (e já não abrir uma zona). */
export const LIMIAR_DO_ARRASTO = 6;

/** Quanto demora uma rotação animada (os botões, «Ver no desenho»), em milissegundos. */
export const DURACAO_DA_ROTACAO = 320;

export const normalizarAngulo = (a: number) => ((a % 360) + 360) % 360;

/** O ângulo a que se chega indo de `de` para `para` pelo caminho mais curto (sem normalizar: contínuo). */
export function peloCaminhoMaisCurto(de: number, para: number): number {
  return de + ((((para - de) % 360) + 540) % 360) - 180;
}

/**
 * A paragem seguinte: o múltiplo de `passo` (contado a partir de `inicial`) logo a seguir (esquerda) ou logo
 * antes (direita) do ângulo atual. Já numa paragem, a seguinte; entre duas, a mais próxima nesse sentido.
 */
export function rodarUmPasso(atual: number, sentido: 'esquerda' | 'direita', inicial: number, passo = PASSO_DA_ROTACAO): number {
  const k = (atual - inicial) / passo;
  const folga = 1e-6;
  const alvo = sentido === 'esquerda' ? Math.floor(k + folga) + 1 : Math.ceil(k - folga) - 1;
  return inicial + alvo * passo;
}

/** O ângulo de um arrasto: `dx` px para a direita desde o início diminuem o ângulo. */
export const anguloDoArrasto = (inicio: number, dx: number) => inicio - dx * GRAUS_POR_PX;

/** Suaviza o princípio e o fim de uma rotação animada: `t` de 0 a 1. */
export const suavizar = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
