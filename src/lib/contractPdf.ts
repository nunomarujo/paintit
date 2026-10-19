import { BRAND } from '@/config/brand';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Draft } from '@/domain/contracting';

// PDF do contrato. É determinístico: os mesmos dados dão sempre os mesmos bytes
// (datas fixadas na data da contratação, sem identificadores aleatórios). Assim
// a plataforma não precisa de guardar o original para provar o teor: volta a
// gerá-lo e confirma que o PDF assinado começa por esses bytes.

const PAGE = { w: 595.28, h: 841.89, margin: 56 };
const EXTRA_WINANSI = new Set([...'€—–‘’“”•…']);

/** Só caracteres que as fontes base do PDF (WinAnsi) conseguem desenhar. */
export function pdfSafe(text: string): string {
  return [...text.replace(/[   ]/g, ' ').replace(/[→]/g, '->').replace(/[−]/g, '-')]
    .map((c) => (c.charCodeAt(0) <= 0xff || EXTRA_WINANSI.has(c) ? c : '?'))
    .join('');
}

export async function contractPdf(draft: Draft, fixedDate: Date, reference: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(pdfSafe(draft.title));
  doc.setAuthor(BRAND.name);
  doc.setCreator(BRAND.name);
  doc.setProducer(BRAND.name);
  doc.setCreationDate(fixedDate);
  doc.setModificationDate(fixedDate);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const width = PAGE.w - 2 * PAGE.margin;

  let page = doc.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - PAGE.margin;
  const newPage = () => {
    page = doc.addPage([PAGE.w, PAGE.h]);
    y = PAGE.h - PAGE.margin;
  };
  const write = (text: string, font = regular, size = 10, gap = 4) => {
    const words = pdfSafe(text).split(/\s+/).filter(Boolean);
    let line = '';
    const flush = () => {
      if (y < PAGE.margin + 30) newPage();
      page.drawText(line, { x: PAGE.margin, y, size, font, color: rgb(0.09, 0.17, 0.21) });
      y -= size * 1.45;
      line = '';
    };
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) > width && line) flush();
      line = line ? `${line} ${w}` : w;
    }
    if (line) flush();
    y -= gap;
  };

  write(draft.title, bold, 15, 10);
  for (const s of draft.sections) {
    y -= 6;
    write(s.heading, bold, 11, 2);
    for (const p of s.paragraphs.filter(Boolean)) write(p);
  }
  y -= 18;
  write('Assinaturas eletrónicas qualificadas das partes, apostas a este documento.', regular, 9);

  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(pdfSafe(`Ref. ${reference} · documento gerado pela plataforma · página ${i + 1} de ${pages.length}`), {
      x: PAGE.margin,
      y: PAGE.margin / 2,
      size: 8,
      font: regular,
      color: rgb(0.38, 0.44, 0.42),
    });
  });
  return doc.save({ useObjectStreams: false });
}
