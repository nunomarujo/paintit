'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import {
  BUYER_PROFILES,
  PAYMENT_TERMS,
  PRODUCT_TYPES,
  parsePercent,
  parseProduct,
  type BuyerProfile,
  type PaymentTerms,
  type ProductType,
} from '@/domain/catalog';
import { sniffPdf } from '@/domain/fileSignature';
import { parseHundredths } from '@/domain/request';
import { getUser } from '@/lib/supabase/server';

const MAX_BYTES = 10 * 1024 * 1024;

export async function addProduct(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseProduct(form);
  if (!parsed.value) return { errors: parsed.errors };
  const file = form.get('ficha');
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile) {
    if (file.size > MAX_BYTES) return { errors: { ficha: 'A ficha tem mais de 10 MB.' } };
    const head = new Uint8Array(await (file as File).slice(0, 5).arrayBuffer());
    if (!sniffPdf(head)) return { errors: { ficha: 'A ficha técnica tem de ser um PDF.' } };
  }
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };

  let fichaPath: string | null = null;
  if (hasFile) {
    fichaPath = `${orgId}/${randomUUID()}.pdf`;
    const up = await supabase.storage.from('fichas').upload(fichaPath, file as File, { contentType: 'application/pdf' });
    if (up.error) return { errors: {}, message: 'Não foi possível carregar a ficha técnica.' };
  }
  const v = parsed.value;
  const { error } = await supabase.from('products').insert({
    org_id: orgId,
    nome: v.nome,
    marca: v.marca,
    referencia: v.referencia,
    tipo: v.tipo,
    rendimento: v.rendimento,
    embalagem_ml: v.embalagemMl,
    preco_referencia_cents: v.precoReferencia,
    preco_data: v.precoData,
    ficha_path: fichaPath,
    created_by: user.id,
    unidade: v.unidade ?? 'L',
    descricao: v.descricao ?? null,
    modos_aplicacao: v.modosAplicacao ?? [],
    acabamento: v.acabamento ?? null,
    uso: v.uso ?? null,
    base: v.base ?? null,
    secagem_horas: v.secagemHoras ?? null,
    diluicao: v.diluicao ?? null,
    demaos_recomendadas: v.demaosRecomendadas ?? null,
    preco_fornecedor_cents: v.precoFornecedor ?? null,
    reference_product_id: /^[0-9a-f-]{36}$/i.test(String(form.get('referenceProductId') ?? '')) ? String(form.get('referenceProductId')) : null,
  });
  if (error) return { errors: {}, message: 'Não foi possível guardar o produto. Só gestores de um fornecedor o podem fazer.' };
  revalidatePath(`/app/organizacoes/${orgId}/produtos`);
  return { errors: {}, ok: true, message: 'Produto acrescentado ao catálogo.' };
}

export async function setProductActive(orgId: string, productId: string, ativo: boolean) {
  const { supabase } = await getUser();
  await supabase.from('products').update({ ativo }).eq('id', productId);
  revalidatePath(`/app/organizacoes/${orgId}/produtos`);
}

export async function addDiscount(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const get = (k: string) => String(form.get(k) ?? '').trim();
  const bps = parsePercent(form.get('desconto'));
  if (bps === null || Number.isNaN(bps) || bps <= 0) return { errors: { desconto: 'Percentagem entre 0 e 100.' } };
  const min = parseHundredths(form.get('minArea'));
  const max = parseHundredths(form.get('maxArea'));
  if (Number.isNaN(min) || Number.isNaN(max)) return { errors: { minArea: 'Áreas em m².' } };
  if (min !== null && max !== null && max < min) return { errors: { maxArea: 'O máximo tem de ser maior que o mínimo.' } };
  const tipo = get('tipo') || null;
  if (tipo && !(PRODUCT_TYPES as readonly string[]).includes(tipo)) return { errors: { tipo: 'Tipo inválido.' } };
  // Um ou vários artigos concretos, escolhidos por checkbox (substitui o antigo seletor de um só) — vazio
  // e sem tipo: todo o catálogo. Com artigos escolhidos, uma linha por artigo, todas com o mesmo desconto.
  const produtos = form.getAll('produtos').map(String).filter(Boolean);
  if (get('modo') === 'produtos' && produtos.length === 0) return { errors: { produtos: 'Escolha pelo menos um artigo.' } };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };
  const pagamento = get('pagamento') || null;
  if (pagamento && !(PAYMENT_TERMS as readonly string[]).includes(pagamento)) return { errors: { pagamento: 'Forma de pagamento inválida.' } };
  const perfil = get('perfil') || null;
  if (perfil && !(BUYER_PROFILES as readonly string[]).includes(perfil)) return { errors: { perfil: 'Perfil inválido.' } };
  const qRaw = get('minQuantidade');
  const minQuantidade = qRaw ? Number(qRaw) : null;
  if (minQuantidade !== null && !(Number.isInteger(minQuantidade) && minQuantidade > 0)) return { errors: { minQuantidade: 'Número inteiro de embalagens.' } };
  // Cliente específico (carteira de clientes do fornecedor) — vazio: vale para todos os pintores.
  const cliente = /^[0-9a-f-]{36}$/i.test(get('cliente')) ? get('cliente') : null;
  const base = {
    pagamento: pagamento as PaymentTerms | null,
    perfil: perfil as BuyerProfile | null,
    min_quantidade: minQuantidade,
    org_id: orgId,
    min_area_cm2: min,
    max_area_cm2: max,
    desconto_bps: bps,
    valido_ate: get('validoAte') || null,
    painter_org_id: cliente,
    created_by: user.id,
  };
  const rows: (typeof base & { product_id: string | null; tipo: ProductType | null })[] =
    produtos.length > 0
      ? produtos.map((productId) => ({ ...base, product_id: productId, tipo: null }))
      : [{ ...base, product_id: null, tipo: tipo as ProductType | null }];
  const { error } = await supabase.from('supplier_discounts').insert(rows);
  if (error) return { errors: {}, message: 'Não foi possível guardar o desconto. Os descontos precisam do plano de catálogo ativo.' };
  revalidatePath(`/app/organizacoes/${orgId}/produtos`);
  revalidatePath(`/app/organizacoes/${orgId}/clientes`);
  if (cliente) revalidatePath(`/app/organizacoes/${orgId}/clientes/${cliente}`);
  return { errors: {}, ok: true, message: rows.length > 1 ? `Desconto criado para ${rows.length} artigos.` : 'Desconto criado.' };
}

export async function deleteDiscount(orgId: string, id: string) {
  const { supabase } = await getUser();
  await supabase.from('supplier_discounts').delete().eq('id', id);
  revalidatePath(`/app/organizacoes/${orgId}/produtos`);
}

export async function addDelivery(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const concelhos = form.getAll('concelhos').map((c) => String(c).trim()).filter(Boolean);
  const custo = parseHundredths(form.get('custo'));
  const minimo = parseHundredths(form.get('minimo'));
  if (Number.isNaN(custo) || Number.isNaN(minimo)) return { errors: { custo: 'Valores em euros.' } };
  const incluida = form.get('incluida') === 'sim';
  const { supabase } = await getUser();
  const { error } = await supabase.from('supplier_delivery').insert({
    org_id: orgId,
    concelhos,
    incluida,
    custo_cents: incluida ? null : custo,
    minimo_cents: minimo,
    condicoes: String(form.get('condicoes') ?? '').trim().slice(0, 500),
  });
  if (error) return { errors: {}, message: 'Não foi possível guardar a condição de entrega.' };
  revalidatePath(`/app/organizacoes/${orgId}/produtos`);
  return { errors: {}, ok: true, message: 'Condição de entrega criada.' };
}

export async function deleteDelivery(orgId: string, id: string) {
  const { supabase } = await getUser();
  await supabase.from('supplier_delivery').delete().eq('id', id);
  revalidatePath(`/app/organizacoes/${orgId}/produtos`);
}
