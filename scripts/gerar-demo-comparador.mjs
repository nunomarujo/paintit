#!/usr/bin/env node
/**
 * Gera os 6 estados estáticos do comparador para a secção `ComparadorDemo` da página inicial, a
 * partir dos componentes reais (`SinteseDasPropostas`, `ComparacaoEmBlocos`, `Reconciliacao`,
 * `MatrizDasPropostas`) e de dados fictícios (`src/app/demo-comparador/fixtures.ts`).
 *
 * Corre como `postbuild` (`npm run build` chama `next build` e, a seguir, este script): só depois
 * de `next build` terminar é que o Next já escreveu o HTML pré-renderizado dessas 6 páginas em
 * `.next/server/app/demo-comparador/**.html` — com o CSS Tailwind real já compilado. Nunca corre
 * em runtime de produção; o resultado fica em `public/demo-comparador/estado-N.html`, ficheiros
 * estáticos que `ComparadorDemo.tsx` serve como `src` de um `<iframe sandbox>` sem scripts.
 *
 * O que faz a cada ficheiro, por esta ordem:
 *   1. Lê o HTML pré-renderizado da rota correspondente.
 *   2. Tira o corpo (`<body>`) e a folha de estilo real referida no `<head>`, e embebe essa folha
 *      inline (`<style>`) — autossuficiente, sem precisar de pedir mais nada à aplicação, excepto
 *      os ficheiros estáticos já públicos (tipo de letra, `/img/...`) que o CSS referencia por
 *      caminho absoluto e que continuam a resolver-se, por o ficheiro final ser servido pelo mesmo
 *      site.
 *   3. Tira todos os `<script>` (hydration do Next, RSC) — o ficheiro final não corre nenhum
 *      JavaScript, por desenho (vive num iframe `sandbox` sem `allow-scripts`).
 *   4. Nos estados 4 e 5 (`PerguntasASeguir`, dentro de `Reconciliacao`): as caixas de verificação
 *      e o botão de envio são elementos nativamente interactivos que, sem JavaScript, não
 *      respondem — ficam `disabled`, com estilo visualmente inerte, texto inalterado (achado 2.2
 *      do resumo de alterações v4).
 *   5. Confirma, por inspecção do HTML gerado, que não ficou nenhuma chamada de rede (fetch, XHR,
 *      domínio Supabase).
 *
 * Reconstruir manualmente: `node scripts/gerar-demo-comparador.mjs` depois de `next build`.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const next = (...p) => join(raiz, '.next', ...p);
const publico = (...p) => join(raiz, 'public', 'demo-comparador', ...p);

const ESTADOS = [
  { rota: 'estado-1-sintese', ficheiro: 'estado-1-sintese.html' },
  { rota: 'estado-2-detalhe', ficheiro: 'estado-2-detalhe.html' },
  { rota: 'estado-3-diferencas', ficheiro: 'estado-3-diferencas.html' },
  { rota: 'estado-4-reconciliacao', ficheiro: 'estado-4-reconciliacao.html', perguntas: true },
  { rota: 'estado-5-nao-decomposta', ficheiro: 'estado-5-nao-decomposta.html', perguntas: true },
  { rota: 'estado-6-relatorio', ficheiro: 'estado-6-relatorio.html' },
];

function lerFicheiroDaRota(rota) {
  // Para uma rota aninhada, o Next escreve o HTML estático em server/app/<segmentos>/<último>.html
  // (confirmado contra .next/server/app/metodologia/1.0.html, já gerado pelo build principal).
  const caminho = next('server', 'app', 'demo-comparador', `${rota}.html`);
  if (existsSync(caminho)) return readFileSync(caminho, 'utf8');
  throw new Error(
    `Não encontrei o HTML pré-renderizado de "${rota}" em ${caminho} — ` +
      `correu "next build" antes deste script (é o que "npm run build" faz via postbuild)?`,
  );
}

/** A folha de estilo real que o Next compilou para esta rota (Tailwind + globals.css), para embeber inline. */
function lerFolhaDeEstilo(html) {
  const m = html.match(/<link rel="stylesheet" href="(\/_next\/[^"]+\.css)"[^>]*>/);
  if (!m) throw new Error('Não encontrei a folha de estilo (<link rel="stylesheet">) no HTML pré-renderizado.');
  const caminhoCss = next(m[1].replace(/^\/_next\//, ''));
  if (!existsSync(caminhoCss)) throw new Error(`A folha de estilo referida não existe em disco: ${caminhoCss}`);
  return readFileSync(caminhoCss, 'utf8');
}

function extrairAtributosHtml(html) {
  const m = html.match(/<html([^>]*)>/);
  return m ? m[1] : ' lang="pt-PT"';
}

function extrairCorpo(html) {
  const inicio = html.indexOf('<body');
  const fimAbertura = html.indexOf('>', inicio);
  const fim = html.lastIndexOf('</body>');
  if (inicio === -1 || fim === -1) throw new Error('Não encontrei <body>...</body> no HTML pré-renderizado.');
  let corpo = html.slice(fimAbertura + 1, fim);
  // Scripts de hidratação/RSC do Next: este ficheiro nunca corre JavaScript.
  corpo = corpo.replace(/<script[\s\S]*?<\/script>/g, '');
  // Marcadores de Suspense/hidratação (comentários) e o div vazio que sobra depois de os tirar.
  corpo = corpo.replace(/<!--\$-->|<!--\/\$-->|<!--[-\w]+-->/g, '');
  corpo = corpo.replace(/<div hidden="">\s*<\/div>/g, '');
  return corpo.trim();
}

/**
 * Achado 2.2 do resumo v4: dentro do iframe sandbox (sem allow-scripts), as caixas de verificação
 * e o botão "Enviar as N perguntas" de `PerguntasASeguir` não têm JavaScript a responder-lhes.
 * Ficam `disabled`, com uma classe de estilo inerte acrescentada (opacidade reduzida, sem
 * hover/focagem) — nunca escondidos, nunca com o texto alterado.
 */
function desativarPerguntasASeguir(corpo, rota) {
  const INERTE = 'opacity-60 cursor-default pointer-events-none';

  let encontrouCheckbox = 0;
  corpo = corpo.replace(/<input type="checkbox" class="([^"]*)"([^>]*)>/g, (m, classes, resto) => {
    encontrouCheckbox += 1;
    return `<input type="checkbox" disabled class="${classes} ${INERTE}"${resto}>`;
  });

  let encontrouBotao = 0;
  corpo = corpo.replace(/<button type="button" class="btn-secondary">/g, () => {
    encontrouBotao += 1;
    return `<button type="button" disabled class="btn-secondary ${INERTE}">`;
  });

  if (encontrouCheckbox === 0 || encontrouBotao !== 1) {
    throw new Error(
      `"${rota}": esperava encontrar as caixas de "PerguntasASeguir" e exactamente 1 botão de envio para as ` +
        `desativar, e encontrei ${encontrouCheckbox} caixa(s) e ${encontrouBotao} botão(ões) — o componente ` +
        `mudou de forma inesperada; rever este script antes de publicar.`,
    );
  }
  return corpo;
}

/** Nenhuma chamada de rede pode sobreviver no ficheiro final (achado a confirmar por inspecção, não só por desenho). */
function confirmarSemRede(html, rota) {
  const proibidos = [/fetch\s*\(/i, /XMLHttpRequest/i, /supabase/i, /\.supabase\.co/i, /WebSocket/i];
  for (const padrao of proibidos) {
    if (padrao.test(html)) {
      throw new Error(`"${rota}": o HTML gerado contém "${padrao}" — não devia haver nenhuma chamada de rede.`);
    }
  }
}

function gerar() {
  mkdirSync(publico(), { recursive: true });

  for (const estado of ESTADOS) {
    const htmlOriginal = lerFicheiroDaRota(estado.rota);
    const css = lerFolhaDeEstilo(htmlOriginal);
    const atributosHtml = extrairAtributosHtml(htmlOriginal);
    let corpo = extrairCorpo(htmlOriginal);

    if (estado.perguntas) corpo = desativarPerguntasASeguir(corpo, estado.rota);

    const final =
      '<!doctype html>\n' +
      `<html${atributosHtml}>\n` +
      '<head>\n' +
      '<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      `<style>${css}</style>\n` +
      '</head>\n' +
      `<body>${corpo}</body>\n` +
      '</html>\n';

    confirmarSemRede(final, estado.rota);

    writeFileSync(publico(estado.ficheiro), final, 'utf8');
    console.log(`demo-comparador: public/demo-comparador/${estado.ficheiro} (${(final.length / 1024).toFixed(0)} kB)`);
  }
}

gerar();
