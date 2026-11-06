import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { BRAND } from '@/config/brand';
import type { Draft } from '@/domain/contracting';
import { INTER_BOLD_BASE64, INTER_REGULAR_BASE64, INTER_SEMIBOLD_BASE64, SERIF_REGULAR_BASE64 } from './pdfFonts';

/*
 * Disposição nova do PDF do contrato (07/11/2026): cabeçalho com a marca e a referência, título em serifa,
 * secções com o número a cor, as partes lado a lado, o preço em caixa, rodapé com «Página n de N» e os
 * quadros das assinaturas. O texto é o da minuta, sem alterações: só muda a apresentação.
 *
 * Tem de ser determinística, como a antiga (`contractPdf.ts`): o PDF assinado confere-se regenerando-o. Por isso
 * as fontes vão embutidas por inteiro e com nome fixo (nada de sufixos aleatórios), as datas são as fixadas e
 * não há identificadores gerados. Só se usa nas contratações criadas com a minuta de 07/11/2026
 * (`minutaComLayoutNovo`); as anteriores continuam a gerar os bytes de sempre (`contractPdf.layout.test.ts`).
 */

const PAGE = { w: 595.28, h: 841.89, margin: 56 };
const W = PAGE.w - 2 * PAGE.margin;
const LIMITE_INFERIOR = 74; // acima do rodapé

const INK = rgb(0.09, 0.17, 0.21);
const MUTED = rgb(0.34, 0.4, 0.43);
const ACCENT = rgb(0.72, 0.34, 0.14);
const RULE = rgb(0.86, 0.88, 0.89);
const BOX = rgb(0.945, 0.955, 0.957);

const bytes = (b64: string) => Uint8Array.from(Buffer.from(b64, 'base64'));

interface Fonts {
  regular: PDFFont;
  semibold: PDFFont;
  bold: PDFFont;
  serif: PDFFont;
}
interface Palavra {
  texto: string;
  font: PDFFont;
}

const NUMERADA = /^(\d+(?:-[A-Z])?\.)\s+(.+)$/;
const PARTE = /^(Dono da obra|Empreiteiro):\s+([\s\S]+)$/;
const ENTRADA = /^([A-ZÀ-Ý][^:.—\d]{1,40}):\s+(\S[\s\S]*)$/;

export async function contractPdfV2(draft: Draft, fixedDate: Date, reference: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const embed = (b64: string, nome: string) => doc.embedFont(bytes(b64), { subset: false, customName: nome });
  const fonts: Fonts = {
    regular: await embed(INTER_REGULAR_BASE64, 'QuemPinta-Inter-Regular'),
    semibold: await embed(INTER_SEMIBOLD_BASE64, 'QuemPinta-Inter-SemiBold'),
    bold: await embed(INTER_BOLD_BASE64, 'QuemPinta-Inter-Bold'),
    serif: await embed(SERIF_REGULAR_BASE64, 'QuemPinta-NotoSerif-Regular'),
  };
  const permitidos = new Set(fonts.regular.getCharacterSet());
  /** Só caracteres que as fontes embutidas desenham; o resto vira «?» em vez de rebentar o PDF. */
  const seguro = (t: string) =>
    [...t.replace(/[   ]/g, ' ').replace(/→/g, '->').replace(/−/g, '-')].map((c) => (permitidos.has(c.codePointAt(0)!) ? c : '?')).join('');

  const [tituloPrincipal, ...restoDoTitulo] = draft.title.split(' — ');
  doc.setTitle(seguro(draft.title));
  doc.setAuthor(BRAND.name);
  doc.setCreator(BRAND.name);
  doc.setProducer(BRAND.name);
  doc.setCreationDate(fixedDate);
  doc.setModificationDate(fixedDate);

  let page!: PDFPage;
  let y = 0;

  const largura = (t: string, f: PDFFont, s: number) => f.widthOfTextAtSize(t, s);

  function cabecalho(p: PDFPage) {
    const baseline = PAGE.h - 56;
    p.drawText('QuemPinta', { x: PAGE.margin, y: baseline, size: 15, font: fonts.bold, color: INK });
    p.drawCircle({ x: PAGE.margin + largura('QuemPinta', fonts.bold, 15) + 3.2, y: baseline + 1.2, size: 2.3, color: ACCENT });
    const dir = seguro(`PEDIDO ${reference}`);
    p.drawText(dir, { x: PAGE.w - PAGE.margin - largura(dir, fonts.semibold, 8.5), y: baseline + 1, size: 8.5, font: fonts.semibold, color: MUTED });
    p.drawLine({ start: { x: PAGE.margin, y: PAGE.h - 74 }, end: { x: PAGE.w - PAGE.margin, y: PAGE.h - 74 }, thickness: 0.6, color: RULE });
  }
  function novaPagina() {
    page = doc.addPage([PAGE.w, PAGE.h]);
    cabecalho(page);
    y = PAGE.h - 74 - 34;
  }
  /** Garante `altura` pontos livres; senão, passa à página seguinte. */
  function garantir(altura: number) {
    if (y - altura < LIMITE_INFERIOR) novaPagina();
  }

  function palavras(partes: Palavra[]): Palavra[] {
    return partes.flatMap((p) => seguro(p.texto).split(/\s+/).filter(Boolean).map((texto) => ({ texto, font: p.font })));
  }
  function quebrar(partes: Palavra[], tamanho: number, max: number): Palavra[][] {
    const linhas: Palavra[][] = [];
    let atual: Palavra[] = [];
    let w = 0;
    for (const pal of palavras(partes)) {
      const pw = largura(pal.texto, pal.font, tamanho);
      const espaco = atual.length ? largura(' ', fonts.regular, tamanho) : 0;
      if (atual.length && w + espaco + pw > max) {
        linhas.push(atual);
        atual = [];
        w = 0;
      }
      w += (atual.length ? espaco : 0) + pw;
      atual.push(pal);
    }
    if (atual.length) linhas.push(atual);
    return linhas;
  }
  function desenharLinha(linha: Palavra[], x: number, baseline: number, tamanho: number) {
    let cx = x;
    for (const pal of linha) {
      page.drawText(pal.texto, { x: cx, y: baseline, size: tamanho, font: pal.font, color: INK });
      cx += largura(pal.texto, pal.font, tamanho) + largura(' ', fonts.regular, tamanho);
    }
  }
  /** Um parágrafo: se começa por «Rótulo:», o rótulo vai a negrito. */
  function corridas(texto: string): Palavra[] {
    const m = ENTRADA.exec(texto);
    return m ? [{ texto: `${m[1]}:`, font: fonts.semibold }, { texto: m[2]!, font: fonts.regular }] : [{ texto, font: fonts.regular }];
  }

  const CORPO = 10;
  const ENTRELINHA = 15;

  function paragrafo(texto: string) {
    const linhas = quebrar(corridas(texto), CORPO, W);
    // Evita uma linha órfã no fim ou no início de uma página.
    garantir(Math.min(linhas.length, 2) * ENTRELINHA + 4);
    for (const l of linhas) {
      garantir(ENTRELINHA);
      y -= ENTRELINHA;
      desenharLinha(l, PAGE.margin, y + 4, CORPO);
    }
    y -= 6;
  }

  function retanguloArredondado(x: number, topo: number, w: number, h: number, r: number, o: { fill?: ReturnType<typeof rgb>; borda?: ReturnType<typeof rgb> }) {
    const d = `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
    page.drawSvgPath(d, { x, y: topo, color: o.fill, borderColor: o.borda, borderWidth: o.borda ? 0.8 : 0 });
  }

  /** Caixa com fundo cinzento e texto; devolve quando acabou de desenhar. */
  function caixaDeTexto(partes: Palavra[][], x: number, w: number, altura: number, titulo?: string) {
    const topo = y;
    retanguloArredondado(x, topo, w, altura, 5, { fill: BOX });
    let cy = topo - 12;
    if (titulo) {
      cy -= 10;
      page.drawText(seguro(titulo), { x: x + 14, y: cy, size: CORPO, font: fonts.semibold, color: INK });
      cy -= 6;
    }
    for (const l of partes) {
      cy -= ENTRELINHA;
      desenharLinha(l, x + 14, cy + 4, CORPO);
    }
  }

  // ---------------------------------------------------------------- primeira página
  novaPagina();
  y -= 6;
  y -= 26;
  page.drawText(seguro(tituloPrincipal ?? draft.title), { x: PAGE.margin, y, size: 27, font: fonts.serif, color: INK });
  if (restoDoTitulo.length) {
    const sub = restoDoTitulo.join(' — ');
    y -= 24;
    page.drawText(seguro(sub.charAt(0).toUpperCase() + sub.slice(1)), { x: PAGE.margin, y, size: 10.5, font: fonts.regular, color: MUTED });
  }
  y -= 30;

  // ---------------------------------------------------------------- secções
  for (const s of draft.sections) {
    const numerada = NUMERADA.exec(s.heading);
    garantir(18 + 2 * ENTRELINHA + 14);
    y -= 14;
    y -= 14;
    if (numerada) {
      const numero = seguro(numerada[1]!);
      page.drawText(numero, { x: PAGE.margin, y, size: 12.5, font: fonts.semibold, color: ACCENT });
      page.drawText(seguro(numerada[2]!), { x: PAGE.margin + largura(`${numero} `, fonts.semibold, 12.5), y, size: 12.5, font: fonts.semibold, color: INK });
    } else {
      page.drawText(seguro(s.heading), { x: PAGE.margin, y, size: 12.5, font: fonts.semibold, color: INK });
    }
    y -= 8;

    let restantes = s.paragraphs.filter(Boolean);
    if (s.heading === 'Partes') {
      const dono = restantes.find((p) => PARTE.exec(p)?.[1] === 'Dono da obra');
      const emp = restantes.find((p) => PARTE.exec(p)?.[1] === 'Empreiteiro');
      if (dono && emp) {
        const gap = 16;
        const cw = (W - gap) / 2;
        const interno = cw - 28;
        const linhasDe = (p: string) => quebrar([{ texto: PARTE.exec(p)![2]!, font: fonts.regular }], CORPO, interno);
        const ld = linhasDe(dono);
        const le = linhasDe(emp);
        const altura = 12 + 10 + 6 + Math.max(ld.length, le.length) * ENTRELINHA + 10;
        y -= 8;
        garantir(altura);
        caixaDeTexto(ld, PAGE.margin, cw, altura, 'Dono da obra');
        caixaDeTexto(le, PAGE.margin + cw + gap, cw, altura, 'Empreiteiro');
        y -= altura + 8;
        restantes = restantes.filter((p) => p !== dono && p !== emp);
      }
    }

    for (const p of restantes) {
      const preco = /^Preço global:\s+([\s\S]+)$/.exec(p);
      if (preco) {
        const interno = W - 28;
        const linhas = quebrar([{ texto: 'Preço global:', font: fonts.semibold }, { texto: preco[1]!, font: fonts.regular }], CORPO, interno);
        const altura = 12 + linhas.length * ENTRELINHA + 8;
        y -= 4;
        garantir(altura);
        caixaDeTexto(linhas, PAGE.margin, W, altura);
        y -= altura + 8;
      } else {
        paragrafo(p);
      }
    }
  }

  // ---------------------------------------------------------------- assinaturas
  const alturaDoQuadro = 112;
  garantir(18 + ENTRELINHA + 14 + 18 + alturaDoQuadro);
  y -= 22;
  y -= 14;
  page.drawText('Assinaturas', { x: PAGE.margin, y, size: 12.5, font: fonts.semibold, color: INK });
  y -= 6;
  paragrafo('Assinaturas eletrónicas qualificadas das partes, apostas a este documento.');
  y -= 8;
  const gap = 18;
  const cw = (W - gap) / 2;
  for (const [i, nome] of ['Dono da obra', 'Empreiteiro'].entries()) {
    const x = PAGE.margin + i * (cw + gap);
    page.drawText(nome, { x, y: y - 8, size: CORPO, font: fonts.semibold, color: INK });
    const topo = y - 18;
    retanguloArredondado(x, topo, cw, alturaDoQuadro, 5, { borda: RULE });
  }
  y -= 18 + alturaDoQuadro;

  // ---------------------------------------------------------------- rodapé de todas as páginas
  const paginas = doc.getPages();
  paginas.forEach((p, i) => {
    p.drawLine({ start: { x: PAGE.margin, y: 50 }, end: { x: PAGE.w - PAGE.margin, y: 50 }, thickness: 0.6, color: RULE });
    p.drawText(seguro(`Ref. ${reference} · documento gerado pela plataforma`), { x: PAGE.margin, y: 36, size: 8, font: fonts.regular, color: MUTED });
    const dir = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(dir, { x: PAGE.w - PAGE.margin - largura(dir, fonts.regular, 8), y: 36, size: 8, font: fonts.regular, color: MUTED });
  });

  return doc.save({ useObjectStreams: false });
}
