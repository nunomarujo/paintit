/**
 * Confirma pelos primeiros bytes do ficheiro, nunca pelo tipo ou pela extensão que o navegador diz — ver
 * CLAUDE.md regra 10 (o que vem do navegador valida-se no servidor) e o requisito SEG-05 do documento de
 * requisitos: "o nome da extensão não é suficiente para confiar num documento". As fotografias já tinham isto
 * (`sniffImage`, src/domain/photo.ts); isto é o mesmo princípio para PDF.
 */
export function sniffPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}
