import { BRAND } from '@/config/brand';

/**
 * O logótipo da marca, em ficheiro — o desenho entregue pelo promotor a 29/10/2026.
 *
 * **Uma só fonte.** O ficheiro vive em `public/img/logotipo.png` e é referido daqui, e só daqui:
 * quando a marca mudar, muda um ficheiro e uma linha, e não doze ecrãs. O mesmo vale para os ícones
 * do separador do navegador (`src/app/icon.png`) e do telemóvel (`src/app/apple-icon.png`), gerados
 * do mesmo desenho.
 *
 * **Porquê um PNG e não um SVG.** O original veio em imagem, não em vectores. O ficheiro foi
 * recortado à caixa do desenho — vinha com uma tela quadrada e uma sombra muito ténue à volta, que
 * obrigavam a centrá-lo à mão em cada sítio — e reduzido a 128 cores, o que o deixa em 43 kB sem
 * diferença visível. A 1200px de largura, impresso a 40mm, dá mais de 700 pontos por polegada.
 *
 * **Altura, nunca largura.** O logótipo tem duas linhas de texto; é a altura que decide se se lê.
 * Abaixo de uns 30px cada linha fica com menos de 12px e deixa de se distinguir — por isso os
 * tamanhos abaixo começam onde começam, e não na escala dos 20px que a marca desenhada usava.
 */

/** As dimensões do ficheiro. Ficam aqui para o navegador reservar o espaço antes de o carregar. */
export const LOGOTIPO = { src: '/img/logotipo.png', largura: 1200, altura: 816 } as const;

/** Altura por tamanho, em píxeis de ecrã. */
const ALTURAS = { sm: 34, md: 44, lg: 60 } as const;

export function Logotipo({
  tamanho = 'md',
  altura,
  decorativo = false,
  className,
}: {
  tamanho?: keyof typeof ALTURAS;
  /**
   * Uma altura explícita, em qualquer unidade de CSS. É assim que a folha A4 pede milímetros:
   * o papel não se mede em píxeis (CLAUDE.md, regra 14).
   */
  altura?: string;
  /**
   * Verdadeiro quando o nome da marca já está escrito ao lado. Um leitor de ecrã que ouça
   * «Quem Pinta, Quem Pinta» não fica a saber mais por isso.
   */
  decorativo?: boolean;
  className?: string;
}) {
  return (
    // O documento A4 é impresso pelo navegador: o optimizador do Next serviria WebP e um `srcset`,
    // e o que sai na impressão deixaria de ser previsível. Um ficheiro de 43 kB, com as dimensões
    // declaradas, não precisa de optimização.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGOTIPO.src}
      width={LOGOTIPO.largura}
      height={LOGOTIPO.altura}
      alt={decorativo ? '' : BRAND.name}
      className={className}
      style={{ height: altura ?? `${ALTURAS[tamanho]}px`, width: 'auto' }}
    />
  );
}
