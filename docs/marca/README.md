# A marca Quem Pinta

O logótipo foi entregue pelo promotor a 29/10/2026, em imagem. Esta pasta guarda os **mestres**; os
ficheiros que a aplicação usa são **gerados** a partir deles por `npm run marca`
(`scripts/marca.mjs`) e não se editam à mão.

## Os mestres

| Ficheiro | O que é |
| --- | --- |
| `logotipo-original.png` | Exactamente como foi entregue, 1254×1254, sem lhe tocar. Não é usado por nada: existe para se poder voltar atrás e para quem precisar da arte em bruto. |
| `logotipo.png` | O mesmo, aparado à caixa do desenho (1208×821), sem redução de cores. É daqui que sai o logótipo da aplicação e a imagem de partilha. |
| `marca-q.png` | Só o «Q» com o seu traço de tinta, recortado do logótipo. Para ícones pequenos. |
| `marca-q-invertida.png` | O mesmo «Q» para fundo escuro: contorno a branco, interior a `tinta-900`, o traço turquesa na mesma. |

O recorte do «Q» e a sua inversão envolvem decisões de desenho — onde acaba o «Q» e começa o «u»,
que cor fica branca sobre fundo escuro. Fizeram-se uma vez, estão revistas à vista e vivem em
ficheiro. O programa só faz a parte mecânica, que é a que se repete: redimensionar, compor,
comprimir.

## O que é gerado

| Ficheiro | Para quê |
| --- | --- |
| `public/img/logotipo.png` | O logótipo na aplicação, nos documentos A4 e nos emails. 600px de largura. |
| `public/img/logotipo-mono.png` | Uma cor só, para fotocópia e impressão a preto e branco. Nada o usa por agora: não há maneira de saber se quem imprime tem tinta de cor. Existe para cartas, carimbos, e para não ser preciso inventá-lo outra vez. |
| `src/app/icon.png` | Separador do navegador. |
| `src/app/apple-icon.png` | Ecrã do telemóvel (iOS). |
| `src/app/opengraph-image.png` | A imagem que aparece quando alguém partilha uma ligação. |

Cada um tem a sua composição. O ícone **não** é o logótipo inteiro encolhido: a 16px as duas linhas
de texto e as janelas do prédio tornam-se uma nódoa. Mediu-se — ver abaixo — e o que sobrevive a 16px
é o «Q» sozinho.

## O que se mediu, a 29/10/2026

- **O logótipo inteiro a 16, 32 e 48px:** ilegível nos três. As duas linhas de texto são o problema.
- **«Q» + prédio:** o prédio desfaz-se abaixo de 32px, com ou sem as janelas. Tirar as janelas não
  resolve e deixa o prédio com ar de inacabado nos tamanhos em que se vê.
- **Só o «Q», com o traço de tinta:** lê-se aos 16px e é nítido aos 32. É o que está em uso.
- **Selo escuro com o «Q» a branco:** lê-se melhor do que o «Q» claro num separador de navegador,
  porque uma forma cheia ganha sempre a um contorno nesses tamanhos. É o que está em uso.

O promotor escolheu o selo escuro a 29/10/2026, depois de ver os quatro lado a lado. A alternativa —
o «Q» com as cores do logótipo, sem selo — fica feita e troca-se numa linha de `scripts/marca.mjs`:
`icone(256)` passa a `icone(256, { fundo: false })`.

## Os 600px não são um limite

`public/img/logotipo.png` tem 600px de largura porque é o que os sítios de hoje precisam — o maior é
a faixa do relatório, a 22mm no papel. **Isso não limita usos futuros:** o mestre tem a resolução
toda, e qualquer tamanho se gera dele mudando um número em `scripts/marca.mjs`. Um cartaz, uma lona
ou uma montra pedem outra coisa, e a conta faz-se nessa altura: pontos por polegada são o tamanho a
que se imprime dividido pelos pixéis que se tem, não uma propriedade do ficheiro.

## O que falta, e não se inventa aqui

- **Não há versão vectorial.** O original é uma imagem. Sem vectores, o logótipo não se pode compor
  em tamanhos muito grandes nem recolorir com rigor; se houver ficheiro de desenho (AI, SVG, Figma),
  é o que deve substituir estes mestres.
- **A versão monocromática está feita** (29/10/2026), mas ninguém a usa automaticamente: o navegador
  não diz se quem imprime tem tinta de cor. Quem precisar dela vai buscá-la.
