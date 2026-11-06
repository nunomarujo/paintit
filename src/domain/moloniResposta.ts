/**
 * Leitura das respostas da Moloni. Vive aqui, e não em `src/lib/moloni.ts`, para ter testes.
 *
 * O caso que obrigou a escrevê-la (06/11/2026): a primeira emissão a sério acabou na base como «emitido», com
 * `provider_document_id = "undefined"`, sem número, sem PDF e sem ATCUD. O código lia `created.document_id` sem ver
 * se existia, e só tratava como recusa uma resposta em forma de lista com `false` na primeira posição. Uma recusa em
 * forma de objeto (`{ valid: 0, … }`, com HTTP 200) passava por sucesso — e um documento fiscal que nunca existiu
 * ficava registado como emitido.
 */

/**
 * Os erros de validação da Moloni chegam, com HTTP 200, como uma lista de textos «código campo [parâmetros]»
 * (confirmado a 06/11/2026: `["5 document_set_id []","2 customer_id 1 0","1 products"]`), e não como um objeto.
 * Códigos (documentação, «Controlo de erros»): 1 campo obrigatório; 2 o campo é numérico (1 = inteiro, 2 = maior
 * que, 3 = menor que…); 3 email inválido; 4 campo único; 5 valor não aceite; 10 associação de documento inválida;
 * 14 e 15 regras de IVA num artigo; 16 cliente sem identificação válida; 17 limite do campo.
 */
const ERRO_EM_TEXTO = /^\d{1,2} [A-Za-z_][\w.\[\]]*(?: .*)?$/;
const SIGNIFICADO: Record<string, string> = {
  '1': 'campo obrigatório em falta',
  '2': 'valor numérico inválido',
  '3': 'email inválido',
  '4': 'valor repetido (campo único)',
  '5': 'valor não aceite',
  '10': 'associação de documento inválida',
  '14': 'regra de IVA do artigo',
  '15': 'regra de IVA do artigo',
  '16': 'cliente sem identificação válida',
  '17': 'limite do campo excedido',
};

/** Uma lista só de textos «código campo…»: é um erro de validação da Moloni, não dados. */
export function errosDeValidacao(json: unknown): string[] | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  return json.every((x) => typeof x === 'string' && ERRO_EM_TEXTO.test(x)) ? (json as string[]) : null;
}

/** Os erros escritos para quem os lê: «products: campo obrigatório em falta; customer_id: valor numérico inválido (1 0)». */
export function explicarErrosDeValidacao(erros: string[]): string {
  return erros
    .map((e) => {
      const [codigo, campo, ...resto] = e.split(' ');
      const parametros = resto.join(' ').trim();
      return `${campo}: ${SIGNIFICADO[codigo!] ?? `erro ${codigo}`}${parametros && parametros !== '[]' ? ` (${parametros})` : ''}`;
    })
    .join('; ');
}

/** Uma recusa: em objeto (`valid` a 0, `errors`) ou em lista de textos de validação. Devolve o texto para mostrar, ou null. */
export function recusaEmObjeto(json: unknown): string | null {
  const erros = errosDeValidacao(json);
  if (erros) return explicarErrosDeValidacao(erros);
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
