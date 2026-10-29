import { create as createQrMatrix } from 'qrcode';

/**
 * SVG do código QR de um convite, construída a partir do link no momento em que a página é pedida — nunca
 * guardada como ficheiro. A proteção contra distribuição em massa vive no código por trás (amarrado a uma só
 * obra e, depois de resgatado, a uma só empresa — ver supabase/migrations/20261023143445), não nesta imagem:
 * é só a representação visual do mesmo link de sempre.
 */
export function qrCodeSvg(text: string, rotulo = 'Código QR do convite'): string {
  const qr = createQrMatrix(text, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const quietZone = 2;
  const dim = size + quietZone * 2;
  let path = '';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.modules.get(row, col)) path += `M${col + quietZone} ${row + quietZone}h1v1h-1z`;
    }
  }
  return `<svg viewBox="0 0 ${dim} ${dim}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${rotulo}"><rect width="${dim}" height="${dim}" fill="#fff"/><path d="${path}" fill="#0f172a"/></svg>`;
}
