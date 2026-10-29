import { Logotipo } from '@/components/Logotipo';

/**
 * A marca, onde quer que ela apareça no ecrã.
 *
 * **Mudou a 29/10/2026**, quando o promotor entregou o logótipo. Até aí era um prédio desenhado à
 * mão em SVG com o nome ao lado, feito para servir enquanto não houvesse marca. Agora há: o desenho
 * traz o nome dentro dele, e por isso este componente deixou de escrever «Quem Pinta» a seguir à
 * imagem — fazê-lo punha o nome duas vezes na mesma linha.
 *
 * Os oito ecrãs que chamam isto não precisaram de mudar, que é a razão de a marca viver num
 * componente e não em cada cabeçalho.
 *
 * `tone` ficou sem efeito e mantém-se só para não obrigar a mexer em quem o passa: o logótipo tem
 * as suas cores e não as recebe do ecrã onde está.
 */
export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg'; tone?: 'tinta' | 'marca' }) {
  return (
    <span className="inline-flex items-center">
      <Logotipo tamanho={size} />
    </span>
  );
}
