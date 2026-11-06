import { MAX_PHOTO_BYTES, cleanPhoto, sniffImage } from './photo';

// Um ficheiro que uma parte junta como prova (comprovativo de pagamento, prova da conclusão da obra).
// Os mesmos limites das fotografias (10 MB, o que o cofre aceita); as imagens perdem os metadados
// (localização, aparelho) antes de serem guardadas, como em `photo.ts`. Um PDF guarda-se tal como
// veio: é o documento que a parte quis juntar, e mexer-lhe mudava o que se prova.

export type TipoDeProva = 'image/jpeg' | 'image/png' | 'application/pdf';
export const EXTENSAO: Record<TipoDeProva, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };

const ehPdf = (b: Uint8Array) => b.length > 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d;

export function limparFicheiroDeProva(bytes: Uint8Array): { type: TipoDeProva; bytes: Uint8Array } | { error: string } {
  if (bytes.length === 0) return { error: 'O ficheiro está vazio.' };
  if (bytes.length > MAX_PHOTO_BYTES) return { error: 'O ficheiro tem mais de 10 MB.' };
  if (ehPdf(bytes)) return { type: 'application/pdf', bytes };
  const foto = cleanPhoto(bytes);
  if ('error' in foto) return { error: sniffImage(bytes) ? foto.error : 'Junte uma fotografia (JPEG ou PNG) ou um PDF.' };
  return foto;
}
