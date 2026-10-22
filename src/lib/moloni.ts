import 'server-only';
import { invoiceTotal, type InvoiceDraft } from '@/domain/invoicing';
import { adminClient } from '@/lib/supabase/admin';

/**
 * Cliente da API da Moloni (faturação certificada). Escrito a partir da documentação pública conhecida em 22/10/2026
 * (OAuth 2.0, https://api.moloni.pt), **sem acesso a uma conta real para testar**: os pontos assinalados com "◆ CONFIRMAR"
 * são os que só se confirmam com a conta de sandbox (pedida à Moloni) e corrigem-se então. Até lá, `moloniConfigured`
 * é falso e nada se tenta emitir. Ver docs/FATURACAO.md.
 */

const BASE = 'https://api.moloni.pt/v1';

function env(name: string): string {
  return process.env[name] ?? '';
}

export const moloniConfigured = !!(env('MOLONI_CLIENT_ID') && env('MOLONI_CLIENT_SECRET') && env('MOLONI_USERNAME') && env('MOLONI_PASSWORD') && env('MOLONI_COMPANY_ID'));

interface Token {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

/** Pede um token novo por password grant. ◆ CONFIRMAR: o endpoint e os nomes dos campos contra a sandbox real. */
async function requestToken(): Promise<Token> {
  const res = await fetch(`${BASE}/grant/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: env('MOLONI_CLIENT_ID'),
      client_secret: env('MOLONI_CLIENT_SECRET'),
      username: env('MOLONI_USERNAME'),
      password: env('MOLONI_PASSWORD'),
    }),
  });
  if (!res.ok) throw new Error(`Moloni recusou a autenticação (${res.status}): ${await res.text().catch(() => '')}`);
  const j = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
  return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: new Date(Date.now() + (j.expires_in - 60) * 1000).toISOString() };
}

async function refreshToken(refresh: string): Promise<Token> {
  const res = await fetch(`${BASE}/grant/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: env('MOLONI_CLIENT_ID'), client_secret: env('MOLONI_CLIENT_SECRET'), refresh_token: refresh }),
  });
  if (!res.ok) return requestToken(); // o refresh pode ter expirado (14 dias): pede-se um novo por password.
  const j = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
  return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: new Date(Date.now() + (j.expires_in - 60) * 1000).toISOString() };
}

/** Token em cache na base de dados (serverless: sem memória entre pedidos). */
async function getAccessToken(): Promise<string> {
  const db = adminClient();
  if (!db) throw new Error('Sem chave do Supabase.');
  const { data: row } = await db.from('moloni_token').select('*').eq('id', true).maybeSingle();
  if (row && new Date(row.expires_at) > new Date()) return row.access_token;
  const token = row ? await refreshToken(row.refresh_token) : await requestToken();
  await db.from('moloni_token').upsert({ id: true, access_token: token.access_token, refresh_token: token.refresh_token, expires_at: token.expires_at, updated_at: new Date().toISOString() });
  return token.access_token;
}

/** Chamada genérica à API (POST, JSON). ◆ CONFIRMAR: alguns endpoints da Moloni esperam o corpo como form-urlencoded; se
 * falhar com 400, é o primeiro ponto a mudar. */
async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}/${path}/?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: Number(env('MOLONI_COMPANY_ID')), ...body }),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Moloni (${path}): resposta inesperada (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok || (Array.isArray(json) && json[0] === false)) throw new Error(`Moloni (${path}) recusou: ${text.slice(0, 500)}`);
  return json as T;
}

/** Encontra o cliente pelo NIF, ou cria-o. Sem NIF (consumidor final), usa o cliente genérico da conta. ◆ CONFIRMAR:
 * o endpoint `customers/getByVat` e os campos de `customers/insert` (country_id de Portugal = 1 na Moloni, a confirmar). */
async function ensureCustomer(c: InvoiceDraft['customer']): Promise<number> {
  if (!c.nif) {
    const generic = env('MOLONI_FINAL_CONSUMER_CUSTOMER_ID');
    if (!generic) throw new Error('Falta configurar MOLONI_FINAL_CONSUMER_CUSTOMER_ID (cliente "Consumidor final" da conta Moloni).');
    return Number(generic);
  }
  const found = await call<{ customer_id?: number }[] | { customer_id: number }>('customers/getByVat', { vat: c.nif }).catch(() => null);
  const existing = Array.isArray(found) ? found[0] : found;
  if (existing?.customer_id) return existing.customer_id;
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
  return created.customer_id;
}

export interface EmittedDocument {
  providerDocumentId: string;
  numero: string | null;
  atcud: string | null;
  pdfBytes: Uint8Array | null;
}

/** Emite o documento (FT ou NC) na Moloni e tenta obter logo o PDF e o ATCUD. ◆ CONFIRMAR: `document_set_id` é
 * específico da conta (a série configurada); `tax_id` é o id interno da taxa de 23% nessa conta. Ambos vêm de
 * MOLONI_DOCUMENT_SET_FT / _NC e MOLONI_TAX_ID_NORMAL — só se conhecem depois de criar a conta e consultar
 * `taxes/getAll` e `documentSets/getAll`. */
export async function emitDocument(draft: InvoiceDraft): Promise<EmittedDocument> {
  if (!moloniConfigured) throw new Error('Moloni não está configurada.');
  const documentSet = Number(env(draft.tipo === 'FT' ? 'MOLONI_DOCUMENT_SET_FT' : 'MOLONI_DOCUMENT_SET_NC'));
  const taxId = Number(env('MOLONI_TAX_ID_NORMAL'));
  if (!documentSet) throw new Error(`Falta configurar a série (MOLONI_DOCUMENT_SET_${draft.tipo}).`);
  const customerId = await ensureCustomer(draft.customer);
  const products = draft.lines.map((l) => ({
    name: l.descricao.slice(0, 100),
    qty: l.quantidade / 100,
    price: l.precoUnitario / 100,
    exemption_reason: l.isencao ?? undefined,
    taxes: l.isencao ? [] : taxId ? [{ tax_id: taxId }] : [],
  }));
  const endpoint = draft.tipo === 'FT' ? 'invoices/insert' : 'creditNotes/insert';
  const body: Record<string, unknown> = { customer_id: customerId, document_set_id: documentSet, date: draft.data, products };
  if (draft.referencia) {
    // ◆ CONFIRMAR: para ligar a NC ao documento original, a Moloni pode exigir `associated_documents` com o id dela, não o nosso.
    body.notes = `Refere-se ao documento interno ${draft.referencia.originType}/${draft.referencia.originId}.`;
  }
  const created = await call<{ document_id: number; number?: string; atcud?: string }>(endpoint, body);
  // A resposta de criação pode não trazer PDF/ATCUD (ver nota no relatório de pesquisa): confirma-se com uma leitura.
  let numero = created.number ?? null;
  let atcud = created.atcud ?? null;
  let pdfBytes: Uint8Array | null = null;
  try {
    const got = await call<{ number?: string; atcud?: string; document_id: number }>(draft.tipo === 'FT' ? 'invoices/getOne' : 'creditNotes/getOne', { document_id: created.document_id });
    numero = numero ?? got.number ?? null;
    atcud = atcud ?? got.atcud ?? null;
  } catch {
    // Sem leitura de confirmação: o id fica guardado e o número/ATCUD completam-se depois, à mão se preciso.
  }
  try {
    const pdfRes = await fetch(`${BASE}/${draft.tipo === 'FT' ? 'invoices' : 'creditNotes'}/getPDF/?access_token=${encodeURIComponent(await getAccessToken())}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: Number(env('MOLONI_COMPANY_ID')), document_id: created.document_id }),
    });
    if (pdfRes.ok) pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
  } catch {
    // O PDF pode obter-se mais tarde; não bloqueia a emissão.
  }
  return { providerDocumentId: String(created.document_id), numero, atcud, pdfBytes };
}

export const draftTotal = invoiceTotal;
