'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { PRODUCT_TYPES, parsePercent, parseProduct, type ProductType } from '@/domain/catalog';
import { parseHundredths } from '@/domain/request';
import { getUser } from '@/lib/supabase/server';

const MAX_BYTES = 10 * 1024 * 1024;

export async function addProduct(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseProduct(form);
  if (!parsed.value) return { errors: parsed.errors };
  const file = form.get('ficha');
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile) {
    const head = new Uint8Array(await (file as File).slice(0, 5).arrayBuffer());
    if (file.size > MAX_BYTES) return { errors: { ficha: 'A ficha tem mais de 10 MB.' } };
    if (String.fromCharCode(...head) !== '%PDF-') return { errors: { ficha: 'A ficha técnica tem de ser um PDF.' } };
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
  const alvo = get('alvo'); // "", "tipo:<t>" ou "produto:<id>"
  const tipo = alvo.startsWith('tipo:') ? alvo.slice(5) : null;
  if (tipo && !(PRODUCT_TYPES as readonly string[]).includes(tipo)) return { errors: { alvo: 'Tipo inválido.' } };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };
  const { error } = await supabase.from('supplier_discounts').insert({
    org_id: orgId,
    product_id: alvo.startsWith('produto:') ? alvo.slice(8) : null,
    tipo: tipo as ProductType | null,
    min_area_cm2: min,
    max_area_cm2: max,
    desconto_bps: bps,
    valido_ate: get('validoAte') || null,
    created_by: user.id,
  });
  if (error) return { errors: {}, message: 'Não foi possível guardar o desconto.' };
  revalidatePath(`/app/organizacoes/${orgId}/produtos`);
  return { errors: {}, ok: true, message: 'Desconto criado.' };
}

export async function deleteDiscount(orgId: string, id: string) {
  const { supabase } = await getUser();
  await supabase.from('supplier_discounts').delete().eq('id', id);
  revalidatePath(`/app/organizacoes/${orgId}/produtos`);
}

export async function addDelivery(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const concelhos = String(form.get('concelhos') ?? '')
    .split(/[,;\n]/)
    .map((c) => c.trim())
    .filter(Boolean);
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
