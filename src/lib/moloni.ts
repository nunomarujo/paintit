import 'server-only';
import { invoiceTotal, type InvoiceDraft } from '@/domain/invoicing';
import { idDoDocumentoCriado, recusaEmObjeto } from '@/domain/moloniResposta';
import { adminClient } from '@/lib/supabase/admin';

/**
 * Cliente da API da Moloni (faturação certificada). A conta real (22/10/2026) só autentica por OAuth 2.0 com login no
 * browser (authorization_code), não por password: um administrador liga-se uma vez em /api/moloni/connect, e a
 * aplicação guarda o refresh_token (válido 14 dias) para renovar sozinha. Se o refresh falhar (os 14 dias passaram
 * sem uso), é preciso ligar de novo pelo mesmo caminho. Ver docs/FATURACAO.md.
 *
 * ⚠ Nada aqui foi testado contra a API real: a conta da Quem Pinta ainda não tem o ambiente de demonstração
 * (pedido ao apoio@moloni.pt, 22/10/2026). Enquanto não existir, `emitDocument` não deve ser chamada — criaria um
 * documento fiscal real na série única da conta, que não se apaga.
 */

const BASE = 'https://api.moloni.pt/v1';
const AUTH_BASE = 'https://www.moloni.pt/ac/root/oauth/';

function env(name: string): string {
  return process.env[name] ?? '';
}

export const moloniConfigured = !!(env('MOLONI_CLIENT_ID') && env('MOLONI_CLIENT_SECRET') && env('MOLONI_REDIRECT_URI') && env('MOLONI_COMPANY_ID'));

/** Endereço para onde reencaminhar o administrador para iniciar sessão na Moloni e autorizar a aplicação. */
export function moloniAuthorizeUrl(): string {
  const params = new URLSearchParams({ response_type: 'code', client_id: env('MOLONI_CLIENT_ID'), redirect_uri: env('MOLONI_REDIRECT_URI') });
  return `${AUTH_BASE}?${params.toString()}`;
}

interface Token {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

async function grant(params: Record<string, string>): Promise<Token> {
  // GET com os parâmetros na própria URL (confirmado na documentação da conta real, 22/10/2026), não POST.
  const url = new URL(`${BASE}/grant/`);
  for (const [k, v] of Object.entries({ client_id: env('MOLONI_CLIENT_ID'), client_secret: env('MOLONI_CLIENT_SECRET'), ...params })) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  const text = await res.text();
  if (!res.ok) throw new Error(`Moloni (autenticação) recusou: ${text.slice(0, 400)}`);
  const j = JSON.parse(text) as { access_token: string; refresh_token: string; expires_in: number };
  return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: new Date(Date.now() + (j.expires_in - 60) * 1000).toISOString() };
}

/** Troca o código devolvido pelo login (em /api/moloni/callback) por um token, e guarda-o. */
export async function exchangeCodeForToken(code: string): Promise<void> {
  const db = adminClient();
  if (!db) throw new Error('Sem chave do Supabase.');
  const token = await grant({ grant_type: 'authorization_code', redirect_uri: env('MOLONI_REDIRECT_URI'), code });
  await db.from('moloni_token').upsert({ id: true, access_token: token.access_token, refresh_token: token.refresh_token, expires_at: token.expires_at, updated_at: new Date().toISOString() });
}

/** Token em cache na base de dados (serverless: sem memória entre pedidos); renova-se sozinho enquanto o refresh durar. */
async function getAccessToken(): Promise<string> {
  const db = adminClient();
  if (!db) throw new Error('Sem chave do Supabase.');
  const { data: row } = await db.from('moloni_token').select('*').eq('id', true).maybeSingle();
  if (!row) throw new Error('A Moloni ainda não está ligada: um administrador tem de entrar em /api/moloni/connect.');
  if (new Date(row.expires_at) > new Date()) return row.access_token;
  const token = await grant({ grant_type: 'refresh_token', refresh_token: row.refresh_token }).catch((e) => {
    throw new Error(`Falha ao renovar a ligação à Moloni (pode ter passado o prazo de 14 dias): ${e instanceof Error ? e.message : e}. É preciso ligar de novo em /api/moloni/connect.`);
  });
  await db.from('moloni_token').upsert({ id: true, access_token: token.access_token, refresh_token: token.refresh_token, expires_at: token.expires_at, updated_at: new Date().toISOString() });
  return token.access_token;
}

/** Transforma um objeto em pares "campo[índice][subcampo]=valor" (formato clássico da API da Moloni, confirmado 22/10/2026:
 * os pedidos vão como formulário, não como JSON). */
function toFormPairs(prefix: string, value: unknown, out: [string, string][]): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => toFormPairs(`${prefix}[${i}]`, v, out));
  } else if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) toFormPairs(`${prefix}[${k}]`, v, out);
  } else {
    out.push([prefix, String(value)]);
  }
}

/** Chamada genérica à API (POST, formulário). */
async function call<T>(path: string, body: Record<string, unknown>, opcoes: { semEmpresa?: boolean } = {}): Promise<T> {
  const token = await getAccessToken();
  const pairs: [string, string][] = [];
  for (const [k, v] of Object.entries({ ...(opcoes.semEmpresa ? {} : { company_id: Number(env('MOLONI_COMPANY_ID')) }), ...body })) toFormPairs(k, v, pairs);
  const res = await fetch(`${BASE}/${path}/?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(pairs).toString(),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Moloni (${path}): resposta inesperada (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok || (Array.isArray(json) && json[0] === false)) throw new Error(`Moloni (${path}) recusou: ${text.slice(0, 500)}`);
  // Uma recusa que chega com HTTP 200 (lista de «código campo» ou objeto com valid 0): explica-se o campo (06/11/2026).
  const recusa = recusaEmObjeto(json);
  if (recusa) throw new Error(`Moloni (${path}) recusou: ${recusa}`);
  return json as T;
}

/** Encontra o cliente pelo NIF, ou cria-o. Sem NIF (consumidor final), usa o cliente da conta (MOLONI_FINAL_CONSUMER_CUSTOMER_ID).
 * ◆ CONFIRMAR: o endpoint `customers/getByVat` (não confirmado contra a conta real) e se `country_id: 1` é Portugal. */
async function ensureCustomer(c: InvoiceDraft['customer']): Promise<number> {
  if (!c.nif) {
    const generic = env('MOLONI_FINAL_CONSUMER_CUSTOMER_ID');
    if (!generic) throw new Error('Falta configurar MOLONI_FINAL_CONSUMER_CUSTOMER_ID.');
    return Number(generic);
  }
  const found = await call<{ customer_id?: number }[] | { customer_id: number } | false>('customers/getByVat', { vat: c.nif }).catch(() => null);
  const existing = Array.isArray(found) ? found[0] : found || undefined;
  if (existing?.customer_id) return idPositivo(existing.customer_id, 'customer_id');
  const created = await call<{ customer_id: number }>('customers/insert', {
    vat: c.nif,
    number: c.nif,
    name: c.nome,
    language_id: 1,
    address: c.morada ?? '',
    zip_code: c.codigoPostal ?? '',
    city: c.localidade ?? '',
    country_id: 1,
  });
  return idPositivo(created.customer_id, 'customer_id');
}

/** Um identificador devolvido pela Moloni tem de ser um inteiro positivo; senão a emissão para aqui, com o motivo. */
function idPositivo(v: unknown, campo: string): number {
  const n = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isInteger(n) || n <= 0) throw new Error(`A Moloni não devolveu um ${campo} válido (recebido: ${JSON.stringify(v) ?? 'nada'}).`);
  return n;
}

/**
 * A empresa configurada tem de ser uma das desta ligação (token) à Moloni. Um `MOLONI_COMPANY_ID` errado dá, em todos os
 * campos, erros que parecem de outra coisa («5 document_set_id», «2 customer_id 1 0», 06/11/2026: no ramo de testes o
 * identificador estava marcado «por confirmar»). Diz-se logo qual é o erro e que empresas há.
 */
async function verificarEmpresa(): Promise<void> {
  const empresas = await call<{ company_id?: number | string; name?: string }[]>('companies/getAll', {}, { semEmpresa: true }).catch(() => null);
  if (!Array.isArray(empresas) || empresas.length === 0) return; // sem lista não se bloqueia
  const id = Number(env('MOLONI_COMPANY_ID'));
  if (empresas.some((e) => Number(e.company_id) === id)) return;
  throw new Error(
    `MOLONI_COMPANY_ID=${env('MOLONI_COMPANY_ID')} não é uma empresa desta ligação à Moloni. Empresas: ${empresas.map((e) => `${e.company_id} «${e.name ?? ''}»`).join(', ')}.`,
  );
}

/** A série configurada tem de existir NESTA empresa da Moloni (as séries são de cada empresa): se não, diz quais há. */
async function verificarSerie(documentSet: number): Promise<void> {
  const series = await call<{ document_set_id?: number | string; name?: string }[]>('documentSets/getAll', {}).catch(() => null);
  if (!Array.isArray(series) || series.length === 0) return; // sem lista não se bloqueia: a emissão dirá se a série não serve
  if (series.some((x) => Number(x.document_set_id) === documentSet)) return;
  throw new Error(
    `A série MOLONI_DOCUMENT_SET_ID=${documentSet} não existe na empresa ligada (MOLONI_COMPANY_ID=${env('MOLONI_COMPANY_ID')}). ` +
      `Séries desta empresa: ${series.map((x) => `${x.document_set_id} «${x.name ?? ''}»`).join(', ')}.`,
  );
}

const NOME_DO_SERVICO: Record<string, string> = {
  comissao: 'Comissão de sucesso',
  subscricao: 'Subscrição',
  caucao_retida: 'Garantia retida',
};

/**
 * Cada linha de uma fatura da Moloni tem de ter `product_id` (campo obrigatório na documentação: sem ele a resposta
 * é «1 products», 06/11/2026). Em vez de um artigo por linha, usa-se um artigo de serviço por tipo de fatura
 * («QP-COMISSAO»…), criado na primeira vez (categoria e unidade: as primeiras da empresa) e encontrado pela
 * referência nas seguintes; o texto de cada linha vai no `name` da linha, que sobrepõe o do artigo.
 * ◆ CONFIRMAR contra a conta real: `products/getByReference`, `productCategories/getAll`, `measurementUnits/getAll`.
 */
async function artigoDeServico(reason: string, taxId: number): Promise<number> {
  const reference = `QP-${reason}`.toUpperCase().slice(0, 30);
  const achados = await call<{ product_id?: number | string }[] | false>('products/getByReference', { reference, exact: 1 }).catch(() => null);
  const existente = Array.isArray(achados) ? achados[0] : undefined;
  if (existente?.product_id) return idPositivo(existente.product_id, 'product_id');

  // O artigo leva o IVA normal; um código de isenção não se inventa aqui (faturas isentas: quando existirem).
  if (!taxId) throw new Error('Falta configurar MOLONI_TAX_ID_NORMAL (o IVA do artigo de serviço que a plataforma cria na Moloni).');
  const categorias = await call<{ category_id?: number | string }[]>('productCategories/getAll', { parent_id: 0 }).catch(() => null);
  const categoria = Array.isArray(categorias) && categorias[0]?.category_id
    ? idPositivo(categorias[0].category_id, 'category_id')
    : idPositivo((await call<{ category_id: number }>('productCategories/insert', { parent_id: 0, name: 'Serviços', description: '', pos_enabled: 0 })).category_id, 'category_id');
  const unidades = await call<{ unit_id?: number | string }[]>('measurementUnits/getAll', {});
  if (!Array.isArray(unidades) || !unidades[0]?.unit_id) throw new Error('A Moloni não devolveu nenhuma unidade de medida para criar o artigo de serviço.');

  const criado = await call<{ product_id: number }>('products/insert', {
    category_id: categoria,
    type: 2,
    name: NOME_DO_SERVICO[reason] ?? 'Serviço',
    summary: '',
    reference,
    ean: '',
    price: 0,
    unit_id: idPositivo(unidades[0].unit_id, 'unit_id'),
    has_stock: 0,
    stock: 0,
    pos_favorite: 0,
    taxes: [{ tax_id: taxId, value: 0, order: 1, cumulative: 0 }],
  });
  return idPositivo(criado.product_id, 'product_id');
}

export interface EmittedDocument {
  providerDocumentId: string;
  numero: string | null;
  atcud: string | null;
  pdfBytes: Uint8Array | null;
}

/** Emite o documento (FT ou NC) na Moloni e tenta obter logo o PDF e o ATCUD.
 * ◆ CONFIRMAR: esta conta só tem uma série ("M"), partilhada por faturas e notas de crédito — não confirmado se a
 * Moloni aceita a mesma série para os dois tipos via API, ou se vai exigir uma série própria para NC.
 * ◆ CONFIRMAR: se a resposta de `invoices/insert`/`creditNotes/insert` já traz `number`/`atcud`, ou só `getOne` depois. */
export async function emitDocument(draft: InvoiceDraft): Promise<EmittedDocument> {
  if (!moloniConfigured) throw new Error('Moloni não está configurada.');
  const documentSet = Number(env('MOLONI_DOCUMENT_SET_ID'));
  const taxId = Number(env('MOLONI_TAX_ID_NORMAL'));
  if (!documentSet) throw new Error('Falta configurar MOLONI_DOCUMENT_SET_ID.');
  await verificarEmpresa();
  await verificarSerie(documentSet);
  const customerId = await ensureCustomer(draft.customer);
  const artigo = await artigoDeServico(draft.reason, taxId);
  const products = draft.lines.map((l) => ({
    product_id: artigo,
    name: l.descricao.slice(0, 100),
    qty: l.quantidade / 100,
    price: l.precoUnitario / 100,
    exemption_reason: l.isencao ?? undefined,
    taxes: l.isencao ? [] : taxId ? [{ tax_id: taxId }] : [],
  }));
  const endpoint = draft.tipo === 'FT' ? 'invoices/insert' : 'creditNotes/insert';
  const body: Record<string, unknown> = { customer_id: customerId, document_set_id: documentSet, date: draft.data, expiration_date: draft.data, products };
  if (draft.referencia) {
    // ◆ CONFIRMAR: ligar a NC ao documento original pode exigir um campo próprio (ex.: associated_documents), não uma nota de texto.
    body.notes = `Refere-se ao documento interno ${draft.referencia.originType}/${draft.referencia.originId}.`;
  }
  const created = await call<{ document_id: number; number?: string; atcud?: string }>(endpoint, body);
  // Sem identificador não há documento que se possa dar por emitido (06/11/2026: ficou «undefined» na base).
  const documentId = idDoDocumentoCriado(created);
  let numero = created.number ?? null;
  let atcud = created.atcud ?? null;
  try {
    const got = await call<{ number?: string; atcud?: string; document_id: number }>(draft.tipo === 'FT' ? 'invoices/getOne' : 'creditNotes/getOne', { document_id: documentId });
    numero = numero ?? got.number ?? null;
    atcud = atcud ?? got.atcud ?? null;
  } catch {
    // Sem leitura de confirmação: o id fica guardado e o número/ATCUD completam-se depois, à mão se preciso.
  }
  let pdfBytes: Uint8Array | null = null;
  try {
    const token = await getAccessToken();
    const pdfRes = await fetch(`${BASE}/${draft.tipo === 'FT' ? 'invoices' : 'creditNotes'}/getPDF/?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ company_id: env('MOLONI_COMPANY_ID'), document_id: String(documentId) }).toString(),
    });
    if (pdfRes.ok) pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
  } catch {
    // O PDF pode obter-se mais tarde; não bloqueia a emissão.
  }
  return { providerDocumentId: String(documentId), numero, atcud, pdfBytes };
}

export const draftTotal = invoiceTotal;
