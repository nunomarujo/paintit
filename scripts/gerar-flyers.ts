/**
 * Gera os flyers de `src/domain/campanhas.ts`: um A5 ao alto por flyer, em PDF (para imprimir ou
 * enviar) e em PNG (pré-visualização no backoffice), em `public/campanhas/`.
 *
 *   npx tsx scripts/gerar-flyers.ts            # todos
 *   npx tsx scripts/gerar-flyers.ts pintor-1   # um só
 *
 * Desenho: dois esquemas que alternam — fotografia em cima com o título por cima dela, ou bloco de
 * cor (marinho) em cima e fotografia pequena em baixo. Paleta e tipografia da marca (Manrope, marinho
 * #14213D, cobalto #2D5BFF, lima #C6F432). O QR vem de `src/lib/qrcode.ts`, o mesmo dos convites. Os
 * textos vêm todos do catálogo: nada se escreve aqui.
 *
 * Precisa do Playwright (`npm i -g playwright` ou `npx playwright`); por isso está fora do `tsc` do projeto
 * (`tsconfig.json`, exclude) — o `npx tsx` que o corre faz a sua própria verificação.
 *
 * Corre fora do build (não é postbuild): os ficheiros são commitados, porque mudar um flyer é uma
 * decisão editorial e não uma consequência do código.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
const imagem = (f: string) => (pastaDasImagens ? `file://${join(pastaDasImagens, f.replace(/\.webp$/, '.jpg'))}` : `file://${join(raiz, 'public', 'img', f)}`);
const logotipo = readFileSync(join(raiz, 'public', 'img', 'logotipo-escuro.svg'), 'utf8');
const logotipoClaro = readFileSync(join(raiz, 'public', 'img', 'logotipo.svg'), 'utf8');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CSS = `
@font-face{font-family:Manrope;font-weight:200 900;src:url(${fonte('manrope-latin.woff2')}) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:Manrope;font-weight:200 900;src:url(${fonte('manrope-latin-ext.woff2')}) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
:root{--marinho:#14213D;--cobalto:#2D5BFF;--lima:#C6F432;--nevoa:#F1F4F7;--palido:#E8EDFF;--tinta:#0c1220;--cinza:#475467}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:148mm;height:210mm}
body{font-family:Manrope,system-ui,sans-serif;color:var(--marinho);background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pagina{position:relative;width:148mm;height:210mm;overflow:hidden;display:flex;flex-direction:column}
.topo{position:relative;flex:none;height:86mm;overflow:hidden;background:var(--marinho);color:#fff}
.topo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.topo::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,16,32,.15) 0%,rgba(10,16,32,0) 30%,rgba(10,16,32,.86) 100%)}
.topo .in{position:absolute;left:10mm;right:10mm;bottom:9mm;z-index:2}
.marca{position:absolute;left:10mm;top:8mm;z-index:3;height:9mm}
.marca svg{height:9mm;width:auto}
.gancho{font-size:11pt;font-weight:600;letter-spacing:-0.01em;color:var(--lima)}
.topo h1{margin-top:2.5mm;font-size:24pt;font-weight:500;line-height:1.02;letter-spacing:-0.03em;text-wrap:balance}
.corpo{flex:1;padding:7mm 10mm 0;display:flex;flex-direction:column;gap:4.5mm}
.sub{font-size:10pt;line-height:1.38;color:#1f2a44}
.vantagens{display:grid;gap:2mm}
.vantagem{display:grid;grid-template-columns:3mm 1fr;gap:3mm;align-items:start}
.vantagem i{display:block;width:3mm;height:3mm;border-radius:50%;background:var(--cobalto);margin-top:1.6mm}
.vantagem b{display:block;font-size:10pt;font-weight:700}
.vantagem span{display:block;font-size:9pt;line-height:1.32;color:var(--cinza)}
.numeros{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}
.numero{background:var(--nevoa);border-radius:4mm;padding:3mm 4mm}
.numero b{display:block;font-size:14pt;font-weight:600;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;color:var(--marinho);white-space:nowrap}
.numero span{display:block;font-size:8pt;line-height:1.25;color:var(--cinza);margin-top:0.8mm}
.rodape{margin-top:auto;flex:none;display:grid;grid-template-columns:1fr 28mm;gap:5mm;align-items:end;padding:4mm 10mm 7mm}
.campanha{background:var(--lima);border-radius:4mm;padding:3.5mm 4.5mm;color:var(--marinho)}
.campanha b{display:block;font-size:9pt;font-weight:800;text-transform:none}
.campanha p{font-size:8.5pt;line-height:1.3;margin-top:0.8mm}
.cta{margin-top:2mm;font-size:10pt;font-weight:700;color:var(--marinho)}
.site{font-size:8.5pt;color:var(--cinza);margin-top:1.5mm}
.qr{width:28mm;height:28mm;background:#fff;border-radius:3mm;padding:1.5mm;border:0.4mm solid var(--palido)}
.qr svg{width:100%;height:100%;display:block}
/* esquema «cor»: marinho em cima com o título, fotografia em baixo à direita */
.cor .topo{height:66mm;background:var(--marinho)}
.cor .topo img{display:none}
.cor .topo::after{display:none}
.cor .topo .in{bottom:9mm}
.cor .topo h1{font-size:24pt}
.cor .faixa{position:absolute;right:0;top:0;width:6mm;height:100%;background:var(--cobalto)}
.cor .corpo{display:flex;flex-direction:column;gap:4.5mm}
.cor .par{display:grid;grid-template-columns:1fr 44mm;gap:6mm;align-items:start}
.cor .corpo .texto{display:flex;flex-direction:column;gap:5mm}
.cor .corpo .foto{width:44mm;height:44mm;border-radius:4mm;overflow:hidden}
.cor .corpo .foto img{width:100%;height:100%;object-fit:cover;display:block}
.cor .numeros{grid-template-columns:repeat(3,1fr)}
`;

function html(f: Flyer): string {
  const c = f.conteudo;
  const qr = qrCodeSvg(f.destino, `Código QR: ${f.destino}`);
  const vantagens = c.vantagens
    .map((v) => `<div class="vantagem"><i></i><div><b>${esc(v.t)}</b><span>${esc(v.d)}</span></div></div>`)
    .join('');
  const numeros = c.numeros
    ? `<div class="numeros">${c.numeros.map((n) => `<div class="numero"><b>${esc(n.v)}</b><span>${esc(n.l)}</span></div>`).join('')}</div>`
    : '';
  const campanha = `<div class="campanha"><b>${esc(CAMPANHA_DE_LANCAMENTO.nome)} · até ${esc(CAMPANHA_DE_LANCAMENTO.ateEmPalavras)}</b><p>${esc(CAMPANHA_DE_LANCAMENTO.condicoes[f.perfil])}</p></div>`;
  const rodape = `<div class="rodape"><div>${campanha}<p class="cta">${esc(c.cta)}</p><p class="site">${BRAND.domain} · ${esc(PERFIL_LABELS[f.perfil])}</p></div><div class="qr">${qr}</div></div>`;

  if (c.desenho === 'foto') {
    return `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="pagina foto">
  <div class="topo"><img src="${imagem(c.foto + '.webp')}" alt=""><div class="marca">${logotipo}</div>
    <div class="in"><p class="gancho">${esc(c.gancho)}</p><h1>${esc(c.titulo)}</h1></div></div>
  <div class="corpo"><p class="sub">${esc(c.sub)}</p><div class="vantagens">${vantagens}</div>${numeros}</div>
  ${rodape}
</div></body></html>`;
  }
  return `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="pagina cor">
  <div class="topo"><div class="faixa"></div><div class="marca">${logotipo}</div>
    <div class="in"><p class="gancho">${esc(c.gancho)}</p><h1>${esc(c.titulo)}</h1></div></div>
  <div class="corpo"><div class="par"><div class="texto"><p class="sub">${esc(c.sub)}</p><div class="vantagens">${vantagens}</div></div>
    <div class="foto"><img src="${imagem(c.foto + '.webp')}" alt=""></div></div>${numeros}</div>
  ${rodape}
</div></body></html>`;
}

async function main() {
  const so = process.argv[2];
  const lista = so ? FLYERS.filter((f) => f.id === so) : FLYERS;
  if (lista.length === 0) throw new Error(`Flyer desconhecido: ${so}`);
  const pasta = join(raiz, 'public', 'campanhas');
  mkdirSync(pasta, { recursive: true });
  const browser = await chromium.launch();
  for (const f of lista) {
    const page = await browser.newPage({ viewport: { width: 559, height: 794 }, deviceScaleFactor: 1.5 });
    const ficheiro = join(pasta, `${f.id}.html`);
    writeFileSync(ficheiro, html(f));
    await page.goto(`file://${ficheiro}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: join(pasta, `${f.id}.pdf`), width: '148mm', height: '210mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    await page.screenshot({ path: join(pasta, `${f.id}.jpg`), type: 'jpeg', quality: 80, fullPage: false });
    await page.close();
    console.log(`flyer ${f.id}: pdf + jpg`);
  }
  await browser.close();
  void logotipoClaro;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
