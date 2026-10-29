#!/usr/bin/env node
/**
 * Gera todos os ficheiros da marca a partir dos mestres de `docs/marca/`.
 *
 * Correr com `npm run marca`. É idempotente: se os mestres não mudarem, os ficheiros gerados saem
 * iguais. Nenhum dos ficheiros que este programa escreve se edita à mão — se algum precisar de ser
 * diferente, muda-se aqui e volta a correr.
 *
 * **Os mestres são três, e a divisão é deliberada.** O recorte do «Q» e a sua versão invertida
 * envolvem decisões de desenho: onde acaba o «Q» e começa o «u», que cor fica branca quando o fundo
 * é escuro. Isso fez-se uma vez, está revisto à vista e vive em ficheiro. O que este programa faz é
 * só a parte mecânica — redimensionar, compor e comprimir —, que é a que se repete.
 *
 * Ver `docs/marca/README.md` para o que é cada ficheiro.
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const mestre = (n) => join(raiz, 'docs', 'marca', n);
const saida = (...p) => join(raiz, ...p);

/** A cor do selo. É a `tinta-900` do `tailwind.config.ts`; se lá mudar, muda aqui. */
const TINTA = '#12302a';
/** O fundo da imagem de partilha. É a `tinta-50`. */
const TINTA_CLARA = { r: 238, g: 243, b: 237, alpha: 1 };

/**
 * A versão a uma cor, para fotocópia e impressão a preto e branco.
 *
 * Fotocopiado, o logótipo a cores vira cinzentos parecidos uns com os outros e perde-se. Esta
 * versão tira os traços de tinta e fica o desenho de linha: contorno na cor da marca, interior
 * branco. Para guardar o gesto da tinta em vez de o tirar, trocar `BRANCO` por um cinzento claro
 * (por exemplo `[214, 219, 214]`) — mas tem de ser claro, senão fecha as contracurvas das letras.
 */
const BRANCO = [255, 255, 255];
async function monocromatico(largura) {
  const { data, info } = await sharp(mestre('logotipo.png'))
    .resize({ width: largura })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const tinta = [0x12, 0x30, 0x2a];
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 40) continue;
    const escuro = r < 90 && g < 100 && b < 105;
    const claro = r > 200 && g > 200 && b > 200;
    const cor = escuro ? tinta : claro ? BRANCO : BRANCO;
    [data[i], data[i + 1], data[i + 2], data[i + 3]] = [...cor, 255];
  }
  return sharp(data, { raw: info }).png({ palette: true, colours: 8, compressionLevel: 9 }).toBuffer();
}

/** Um quadrado de cantos redondos, para o selo dos ícones. */
const selo = (px) =>
  Buffer.from(
    `<svg width="${px}" height="${px}"><rect width="${px}" height="${px}" rx="${Math.round(px * 0.22)}" fill="${TINTA}"/></svg>`,
  );

/**
 * O «Q» centrado num selo. A margem é a que o iOS espera num ícone — o sistema arredonda-o outra
 * vez por cima, e um desenho encostado ao bordo fica cortado.
 */
async function icone(px, { fundo = true } = {}) {
  const marca = fundo ? 'marca-q-invertida.png' : 'marca-q.png';
  const interior = Math.round(px * (fundo ? 0.76 : 0.94));
  const q = await sharp(mestre(marca)).resize({ height: interior, fit: 'inside' }).toBuffer();
  const base = fundo
    ? sharp(selo(px))
    : sharp({ create: { width: px, height: px, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  return base.composite([{ input: q, gravity: 'center' }]).png({ compressionLevel: 9 }).toBuffer();
}

const trabalhos = [
  // O logótipo que a aplicação mostra.
  //
  // 600px de largura, e a conta é esta: o maior sítio onde aparece é a faixa do relatório, a 15mm
  // de altura, o que lhe dá 22mm de largura no papel. 600px por 22mm são 690 pontos por polegada —
  // mais do dobro dos 300 que uma gráfica pede. No ecrã nunca passa dos 115px de largura. Guardar
  // 1200px seria guardar o quádruplo dos pixéis para os deitar fora em todos os sítios onde o
  // ficheiro é usado.
  //
  // A paleta de 128 cores tira-lhe dois terços do peso — 251 kB para 79 — e num desenho de cores
  // chapadas não se vê a diferença.
  {
    nome: 'public/img/logotipo.png',
    faz: () =>
      sharp(mestre('logotipo.png'))
        .resize({ width: 600 })
        .png({ palette: true, colours: 128, compressionLevel: 9 })
        .toBuffer(),
  },
  // O separador do navegador. 256px: o mestre do «Q» tem 310px e ampliá-lo inventaria detalhe.
  { nome: 'src/app/icon.png', faz: () => icone(256) },
  // O ecrã do telemóvel. O iOS não mostra transparência, por isso este leva sempre o selo.
  { nome: 'src/app/apple-icon.png', faz: () => icone(180) },
  // Para fotocópia e impressão a preto e branco. Nada na aplicação o usa por agora — não há maneira
  // de saber se quem imprime tem tinta de cor. Existe para cartas, carimbos e o que mais precise de
  // uma cor só, e para que não seja preciso voltar a inventá-lo quando precisar.
  { nome: 'public/img/logotipo-mono.png', faz: () => monocromatico(600) },
  // A imagem que sai quando alguém partilha uma ligação. Composição própria: o logótipo inteiro,
  // com ar à volta, sobre o fundo claro da marca — e não um ícone esticado.
  {
    nome: 'src/app/opengraph-image.png',
    faz: async () => {
      const logo = await sharp(mestre('logotipo.png')).resize({ width: 720 }).toBuffer();
      return sharp({ create: { width: 1200, height: 630, channels: 4, background: TINTA_CLARA } })
        .composite([{ input: logo, gravity: 'center' }])
        .png({ palette: true, colours: 128, compressionLevel: 9 })
        .toBuffer();
    },
  },
];

for (const t of trabalhos) {
  const destino = saida(t.nome);
  await mkdir(dirname(destino), { recursive: true });
  const dados = await t.faz();
  await writeFile(destino, dados);
  const { width, height } = await sharp(dados).metadata();
  console.log(`${t.nome.padEnd(32)} ${String(width).padStart(4)}×${String(height).padEnd(4)} ${(dados.length / 1024).toFixed(1)} kB`);
}
