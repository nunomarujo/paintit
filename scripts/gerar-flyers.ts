/**
 * Gera os flyers de `src/domain/campanhas.ts`: um A5 ao alto por flyer, em PDF (para imprimir ou
 * enviar) e em JPG (pré-visualização no backoffice), em `public/campanhas/`.
 *
 *   npx tsx scripts/gerar-flyers.ts            # todos
 *   npx tsx scripts/gerar-flyers.ts pintor-1   # um só
 *
 * Desenho (direção de arte de 02/11/2026, depois de o promotor ter rejeitado a primeira versão):
 * três esquemas, para que os dois flyers de um perfil nunca se pareçam —
 *   A  fotografia à esquerda a sangrar até à faixa de ação, coluna de texto à direita;
 *   B  campo azul-pálido (ou marinho, «b-escuro») com o prédio isométrico à direita e as vantagens
 *      numa régua numerada; o título leva uma palavra marcada a lima;
 *   C  topo marinho e captura real da aplicação com três anotações numeradas.
 * Invariantes: o logótipo e «o que é» são as duas primeiras coisas que se leem; o lima aparece uma
 * única vez por flyer; nada abaixo de 8pt; o QR (28mm numa caixa branca de 32mm) é o único objeto da
 * zona de ação; sem caixas tintadas nem pontos — separação por filetes e por tom. Os textos vêm todos
 * do catálogo: nada se escreve aqui.
 *
 * Precisa do Playwright; por isso está fora do `tsc` do projeto (`tsconfig.json`, exclude) — o `npx tsx`
 * que o corre faz a sua própria verificação. Corre fora do build: os ficheiros são commitados, porque
 * mudar um flyer é uma decisão editorial e não uma consequência do código.
 */
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { BRAND } from '../src/config/brand';
import { CAMPANHA_DE_LANCAMENTO, FLYERS, PERFIL_LABELS, type Flyer } from '../src/domain/campanhas';
import { qrCodeSvg } from '../src/lib/qrcode';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const fonte = (f: string) => `file://${join(raiz, 'scripts', 'flyers', f)}`;
// Fotografias reduzidas (FLYER_IMG_DIR, .jpg a ~900px) deixam o PDF em poucas centenas de KB; sem a
// variável usa-se o original de public/img.
const pastaDasImagens = process.env.FLYER_IMG_DIR;
const original = (nome: string) => `file://${join(raiz, 'public', 'img', `${nome}.webp`)}`;
const fotografia = (nome: string) => (pastaDasImagens ? `file://${join(pastaDasImagens, `${nome}.jpg`)}` : original(nome));
// O prédio precisa de fundo transparente: reduzido fica em PNG.
const transparente = (nome: string) => (pastaDasImagens ? `file://${join(pastaDasImagens, `${nome}.png`)}` : original(nome));
const logoClaro = readFileSync(join(raiz, 'public', 'img', 'logotipo-escuro.svg'), 'utf8'); // para fundos escuros
const logoEscuro = readFileSync(join(raiz, 'public', 'img', 'logotipo.svg'), 'utf8'); // para fundos claros

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const realcar = (titulo: string, palavra?: string) => {
  if (!palavra || !titulo.includes(palavra)) return esc(titulo);
  const [antes, depois] = titulo.split(palavra, 2);
  return `${esc(antes)}<mark>${esc(palavra)}</mark>${esc(depois)}`;
};

const CSS = `
@font-face{font-family:Manrope;font-weight:200 900;src:url(${fonte('manrope-latin.woff2')}) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:Manrope;font-weight:200 900;src:url(${fonte('manrope-latin-ext.woff2')}) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@page{size:148mm 210mm;margin:0}
:root{--marinho:#14213D;--cobalto:#2D5BFF;--lima:#C6F432;--palido:#E8EDFF;--tinta:#0c1220;--cinza:#475467;--filete:rgba(20,33,61,.18);--filete-claro:rgba(255,255,255,.22)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:148mm;height:210mm}
body{font-family:Manrope,system-ui,sans-serif;color:var(--marinho);background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-feature-settings:"tnum"}
.pagina{position:relative;width:148mm;height:210mm;overflow:hidden}
mark{background:none;color:inherit;background-image:linear-gradient(var(--lima),var(--lima));background-repeat:no-repeat;background-size:100% 0.32em;background-position:0 88%}
.logo svg{height:8mm;width:auto;display:block}
.oquee{font-size:8.5pt;line-height:1.3;font-weight:600;letter-spacing:.01em}
.gancho{font-size:10pt;font-weight:600;line-height:1.25}
h1{font-weight:800;letter-spacing:-0.025em;line-height:1.02;text-wrap:balance}
.sub{font-size:9pt;line-height:1.38}
.vantagens{display:grid}
.vantagem{padding:2.2mm 0;border-top:0.25mm solid var(--filete)}
.vantagem b{display:block;font-size:9.5pt;font-weight:700;line-height:1.2}
.vantagem span{display:block;font-size:8.5pt;line-height:1.32;margin-top:0.6mm;color:var(--cinza)}
.passos{display:grid;gap:1.2mm}
.passo{display:grid;grid-template-columns:5mm 1fr;gap:1.5mm;font-size:8.5pt;line-height:1.3;align-items:baseline}
.passo i{font-style:normal;font-weight:800;font-size:9pt;color:var(--cobalto)}
.prova{font-size:8.5pt;line-height:1.35;padding-left:3mm;border-left:0.5mm solid var(--cobalto);font-style:italic}
.numeros{display:grid;grid-template-columns:repeat(3,1fr)}
.numero{padding:0 3mm;border-left:0.25mm solid var(--filete)}
.numero:first-child{padding-left:0;border-left:0}
.numero b{display:block;font-size:14pt;font-weight:700;letter-spacing:-0.02em;white-space:nowrap;line-height:1.1}
.numero span{display:block;font-size:8pt;line-height:1.25;margin-top:0.6mm;color:var(--cinza)}
.qr{width:32mm;height:32mm;background:#fff;padding:2mm;flex:none}
.qr svg{width:100%;height:100%;display:block}
.acao{position:absolute;left:0;right:0;bottom:0;display:grid;grid-template-columns:1fr 32mm;gap:6mm;align-items:center;padding:0 9mm}
.cta{font-size:13pt;font-weight:800;line-height:1.15;letter-spacing:-0.01em}
.campanha{font-size:8pt;line-height:1.3;margin-top:1.6mm}
.campanha b{font-weight:700}
.site{font-size:8pt;margin-top:1.4mm;letter-spacing:.02em}
.escuro{color:#fff}
.escuro .vantagem{border-top-color:var(--filete-claro)}
.escuro .vantagem span,.escuro .numero span,.escuro .campanha,.escuro .site,.escuro .sub{color:rgba(255,255,255,.82)}
.escuro .numero{border-left-color:var(--filete-claro)}
.escuro .passo i,.escuro .gancho{color:var(--lima)}
.escuro .prova{border-left-color:var(--lima)}

/* ---- A: fotografia à esquerda, coluna à direita, faixa de ação em baixo ---- */
.a .foto{position:absolute;left:0;top:0;width:60mm;height:164mm;overflow:hidden}
.a .foto img{width:100%;height:100%;object-fit:cover;display:block}
.a .foto::before{content:"";position:absolute;left:0;top:0;right:0;height:30mm;background:linear-gradient(180deg,rgba(10,16,32,.55),rgba(10,16,32,0))}
.a .foto::after{content:"";position:absolute;left:0;bottom:0;right:0;height:60mm;background:linear-gradient(0deg,rgba(10,16,32,.88),rgba(10,16,32,0))}
.a .foto .prova{position:absolute;left:8mm;right:6mm;bottom:7mm;z-index:2;color:#fff;border-left-color:var(--lima);font-size:8.5pt}
.a .logo{position:absolute;left:8mm;top:8mm;z-index:2}
.a .coluna{position:absolute;left:66mm;right:9mm;top:9mm;height:150mm;display:flex;flex-direction:column;gap:3mm}
.a .coluna .sub{font-size:8.5pt}
.a .oquee{color:var(--cobalto)}
.a .gancho{color:var(--cinza)}
.a h1{font-size:21pt}
.a .vantagens .vantagem:last-child{border-bottom:0.25mm solid var(--filete)}
.a .faixa{position:absolute;left:0;right:0;top:164mm;height:46mm;background:var(--marinho);color:#fff}
.a .acao{height:46mm}
.a .campanha,.a .site{color:rgba(255,255,255,.82)}

/* ---- B: campo pálido, prédio à direita, régua numerada ---- */
.b{background:var(--palido)}
.b .cabeca{position:absolute;left:9mm;right:9mm;top:9mm;display:flex;justify-content:space-between;align-items:flex-start;gap:8mm}
.b .cabeca .oquee{max-width:78mm;text-align:right;color:var(--cobalto)}
.b .gancho{position:absolute;left:9mm;top:22mm;color:var(--cinza)}
.b h1{position:absolute;left:9mm;right:9mm;top:28mm;font-size:27pt}
.b .sub{position:absolute;left:9mm;right:9mm;top:62mm}
.b .predio{position:absolute;right:-12mm;top:86mm;height:80mm;width:auto}
.b .regua{position:absolute;left:9mm;width:72mm;top:82mm;display:grid}
.b .regua .vantagem{display:grid;grid-template-columns:7mm 1fr;gap:1.5mm;padding:2mm 0}
.b .regua .vantagem i{font-style:normal;font-weight:800;font-size:12pt;line-height:1;color:var(--cobalto)}
.b .numeros{position:absolute;left:9mm;width:86mm;top:144mm}
.b .filete{position:absolute;left:9mm;right:9mm;top:170mm;height:0.25mm;background:var(--filete)}
.b .acao{height:40mm}
.b .campanha,.b .site{color:var(--cinza)}
.b.escuro{background:var(--marinho)}
.b.escuro .cabeca .oquee{color:var(--lima);}
.b.escuro .gancho{color:rgba(255,255,255,.82)}
.b.escuro .regua .vantagem i{color:#fff}
.b.escuro .filete{background:var(--filete-claro)}
.b.escuro .campanha,.b.escuro .site{color:rgba(255,255,255,.82)}
.b.escuro mark{background-size:100% 0.3em}

/* ---- C: topo marinho, captura da aplicação com anotações ---- */
.c .topo{position:absolute;left:0;right:0;top:0;height:64mm;background:var(--marinho);color:#fff;padding:8mm 9mm 0}
.c .topo .cabeca{display:flex;justify-content:space-between;align-items:flex-start;gap:8mm}
.c .topo .oquee{max-width:78mm;text-align:right;color:rgba(255,255,255,.82)}
.c .topo .gancho{margin-top:5mm;color:var(--lima)}
.c .topo h1{margin-top:2mm;font-size:21pt}
.c .topo .sub{margin-top:3mm;color:rgba(255,255,255,.82)}
.c .captura{position:absolute;left:9mm;right:9mm;top:68mm;height:48mm;overflow:hidden;border:0.25mm solid var(--filete);background:#fff}
.c .captura img{width:100%;height:auto;display:block}
.c .anot{position:absolute;left:9mm;right:9mm;top:119mm;display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}
.c .anot .vantagem{border:0;padding:0;display:grid;grid-template-columns:4.5mm 1fr;gap:1.4mm}
.c .anot .vantagem i{font-style:normal;display:inline-flex;width:4.5mm;height:4.5mm;align-items:center;justify-content:center;background:var(--marinho);color:#fff;font-size:8pt;font-weight:800;margin-top:0.3mm}
.c .anot .vantagem b{font-size:8.5pt}
.c .anot .vantagem span{font-size:8pt;line-height:1.28}
.c .prova{position:absolute;left:9mm;right:9mm;top:160mm}
.c .passos-cols{position:absolute;left:9mm;right:9mm;top:143mm;padding-top:2.5mm;border-top:0.25mm solid var(--filete);display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}
.c .passos-cols .passo{grid-template-columns:4.5mm 1fr;font-size:8.5pt}
.c .filete{position:absolute;left:9mm;right:9mm;top:170mm;height:0.25mm;background:var(--filete)}
.c .acao{height:40mm}
.c .campanha,.c .site{color:var(--cinza)}
`;

const pagina = (classe: string, corpo: string) =>
  `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="pagina ${classe}">${corpo}</div></body></html>`;

function html(f: Flyer): string {
  const c = f.conteudo;
  const qr = `<div class="qr">${qrCodeSvg(f.destino, `Código QR: ${f.destino}`)}</div>`;
  const oquee = `<p class="oquee">${esc(c.oQueE)}</p>`;
  const gancho = `<p class="gancho">${esc(c.gancho)}</p>`;
  const sub = `<p class="sub">${esc(c.sub)}</p>`;
  const vantagem = (v: { t: string; d: string }, i?: number) =>
    `<div class="vantagem">${i === undefined ? '' : `<i>${i}</i>`}<div><b>${esc(v.t)}</b><span>${esc(v.d)}</span></div></div>`;
  const passos = (cls: string) =>
    `<div class="${cls}">${c.comoFunciona.map((p, i) => `<div class="passo"><i>${i + 1}</i><span>${esc(p)}</span></div>`).join('')}</div>`;
  const prova = `<p class="prova">${esc(c.prova)}</p>`;
  const numeros = c.numeros ? `<div class="numeros">${c.numeros.map((n) => `<div class="numero"><b>${esc(n.v)}</b><span>${esc(n.l)}</span></div>`).join('')}</div>` : '';
  const acao = (cta: string) =>
    `<div class="acao"><div><p class="cta">${esc(cta)}</p><p class="campanha"><b>${esc(CAMPANHA_DE_LANCAMENTO.nome)} · até ${esc(CAMPANHA_DE_LANCAMENTO.ateEmPalavras)}.</b> ${esc(CAMPANHA_DE_LANCAMENTO.condicoes[f.perfil])}</p><p class="site">${BRAND.domain} · ${esc(PERFIL_LABELS[f.perfil])}</p></div>${qr}</div>`;

  if (c.desenho === 'a') {
    const foco = c.foco ? ` style="object-position:${c.foco}"` : '';
    // A marca lima única do esquema A vai na primeira palavra da chamada à ação.
    const [primeira, ...resto] = c.cta.split(' ');
    const ctaMarcado = `<mark>${esc(primeira)}</mark> ${esc(resto.join(' '))}`;
    return pagina(
      'a',
      `<div class="foto"><img src="${fotografia(c.imagem)}" alt=""${foco}>${prova}</div><div class="logo">${logoClaro}</div>
      <div class="coluna">${oquee}${gancho}<h1>${esc(c.titulo)}</h1>${sub}
        <div class="vantagens">${c.vantagens.map((v) => vantagem(v)).join('')}</div>
        ${c.numeros ? numeros : passos('passos')}</div>
      <div class="faixa"><div class="acao"><div><p class="cta">${ctaMarcado}</p><p class="campanha"><b>${esc(CAMPANHA_DE_LANCAMENTO.nome)} · até ${esc(CAMPANHA_DE_LANCAMENTO.ateEmPalavras)}.</b> ${esc(CAMPANHA_DE_LANCAMENTO.condicoes[f.perfil])}</p><p class="site">${BRAND.domain} · ${esc(PERFIL_LABELS[f.perfil])}</p></div>${qr}</div></div>`,
    );
  }

  if (c.desenho === 'b' || c.desenho === 'b-escuro') {
    const escuro = c.desenho === 'b-escuro';
    return pagina(
      `b${escuro ? ' escuro' : ''}`,
      `<div class="cabeca"><div class="logo">${escuro ? logoClaro : logoEscuro}</div>${oquee}</div>
      ${gancho}<h1>${realcar(c.titulo, c.realce)}</h1>${sub}
      <img class="predio" src="${transparente(c.imagem)}" alt="">
      <div class="regua">${c.vantagens.map((v, i) => vantagem(v, i + 1)).join('')}</div>
      ${numeros}<div class="filete"></div>${acao(c.cta)}`,
    );
  }

  return pagina(
    'c',
    `<div class="topo"><div class="cabeca"><div class="logo">${logoClaro}</div>${oquee}</div>${gancho}<h1>${esc(c.titulo)}</h1>${sub}</div>
    <div class="captura"><img src="${fotografia(c.imagem)}" alt=""></div>
    <div class="anot">${c.vantagens.map((v, i) => vantagem(v, i + 1)).join('')}</div>
    ${prova}${passos('passos-cols')}<div class="filete"></div>${acao(c.cta)}`,
  );
}

async function main() {
  const so = process.argv[2];
  const lista = so ? FLYERS.filter((f) => f.id === so) : FLYERS;
  if (lista.length === 0) throw new Error(`Flyer desconhecido: ${so}`);
  const pasta = join(raiz, 'public', 'campanhas');
  mkdirSync(pasta, { recursive: true });
  const browser = await chromium.launch();
  for (const f of lista) {
    const page = await browser.newPage({ viewport: { width: 559, height: 794 }, deviceScaleFactor: 2 });
    const ficheiro = join(pasta, `${f.id}.html`);
    writeFileSync(ficheiro, html(f));
    await page.goto(`file://${ficheiro}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // Vigilância: nada pode sair da página nem sobrepor a zona de ação.
    const problemas = await page.evaluate(() => {
      const mm = 96 / 25.4;
      const limite = 210 * mm;
      const acao = document.querySelector('.acao')!.getBoundingClientRect();
      const fora: string[] = [];
      document.querySelectorAll<HTMLElement>('.coluna, .coluna > *, .regua, .numeros, .sub, h1, .prova, .passos-cols, .anot').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom > limite + 1) fora.push(`${el.className || el.tagName} sai da página (${Math.round(r.bottom / mm)}mm)`);
        if (!el.closest('.acao') && !el.closest('.faixa') && r.bottom > acao.top + 1 && r.height > 0) fora.push(`${el.className || el.tagName} entra na zona de ação (${Math.round(r.bottom / mm)}mm > ${Math.round(acao.top / mm)}mm)`);
      });
      return fora;
    });
    if (problemas.length) console.warn(`  ! ${f.id}: ${[...new Set(problemas)].join('; ')}`);
    await page.pdf({ path: join(pasta, `${f.id}.pdf`), width: '148mm', height: '210mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    await page.screenshot({ path: join(pasta, `${f.id}.jpg`), type: 'jpeg', quality: 82, fullPage: false });
    await page.close();
    unlinkSync(ficheiro);
    console.log(`flyer ${f.id}: pdf + jpg`);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
