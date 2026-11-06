/**
 * Leitura das respostas da Moloni. Vive aqui, e não em `src/lib/moloni.ts`, para ter testes.
 *
 * O caso que obrigou a escrevê-la (06/11/2026): a primeira emissão a sério acabou na base como «emitido», com
 * `provider_document_id = "undefined"`, sem número, sem PDF e sem ATCUD. O código lia `created.document_id` sem ver
 * se existia, e só tratava como recusa uma resposta em forma de lista com `false` na primeira posição. Uma recusa em
 * forma de objeto (`{ valid: 0, … }`, com HTTP 200) passava por sucesso — e um documento fiscal que nunca existiu
 * ficava registado como emitido.
 */

/** Uma recusa em forma de objeto: `valid` a 0/false, ou erros declarados. Devolve o texto para mostrar, ou null. */
export function recusaEmObjeto(json: unknown): string | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  const invalida = o.valid === 0 || o.valid === false || o.valid === '0';
  const temErros = o.errors !== undefined && o.errors !== null && o.errors !== '' && !(Array.isArray(o.errors) && o.errors.length === 0);
  return invalida || temErros ? JSON.stringify(o).slice(0, 500) : null;
}

/** O identificador do documento criado: um inteiro positivo, ou erro com a resposta tal como veio. */
export function idDoDocumentoCriado(json: unknown): number {
  const bruto = json && typeof json === 'object' && !Array.isArray(json) ? (json as Record<string, unknown>).document_id : undefined;
  const id = typeof bruto === 'string' && /^\d+$/.test(bruto) ? Number(bruto) : bruto;
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    throw new Error(
      `A Moloni não devolveu o identificador do documento — não se sabe se foi criado. Resposta: ${JSON.stringify(json)?.slice(0, 400) ?? 'vazia'}`,
    );
  }
  return id;
}
