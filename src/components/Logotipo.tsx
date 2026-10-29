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
 * obrigavam a centrá-lo à mão em cada sítio — e reduzido a 128 cores.
 *
 * Os pontos por polegada **não são uma propriedade do ficheiro**: dependem do tamanho a que se
 * imprime (correcção do promotor, 29/10/2026). O que se pode dizer é que os 600px de largura deste
 * ficheiro dão cerca de 690 ppp aos 22mm a que o logótipo sai na faixa do relatório, que é o maior
 * sítio onde aparece — mais do dobro dos 300 que uma gráfica pede.
 *
 * O original tal como foi entregue, e os mestres de que este ficheiro é gerado, ficam em
 * `docs/marca/`. `npm run marca` regenera tudo.
 *
 * **Altura, nunca largura.** O logótipo tem duas linhas de texto; é a altura que decide se se lê.
 * Abaixo de uns 30px cada linha fica com menos de 12px e deixa de se distinguir — por isso os
 * tamanhos abaixo começam onde começam, e não na escala dos 20px que a marca desenhada usava.
 */

/** As dimensões do ficheiro. Ficam aqui para o navegador reservar o espaço antes de o carregar. */
export const LOGOTIPO = { src: '/img/logotipo.png', largura: 600, altura: 408 } as const;

/**
 * Altura por tamanho, em píxeis de ecrã.
 *
 * Subiu de 34/44/60 a 29/10/2026: «ficou demasiadamente pequeno o logo na landing page» (promotor).
 * A barra de topo tinha 56px e o logótipo 34px — sobrava-lhe espaço de cada lado e a marca lia-se
 * como um selo. A barra passou a 68px e o logótipo a 46px, as medidas que o promotor indicou, que
 * lhe deixam 11px de folga acima e abaixo.
 */
const ALTURAS = { sm: 46, md: 58, lg: 78 } as const;

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
