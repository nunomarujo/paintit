'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { parseProduct } from '@/domain/catalog';
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
