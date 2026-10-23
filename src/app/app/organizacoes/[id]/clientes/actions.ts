'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { getUser } from '@/lib/supabase/server';

export async function saveCustomerProfile(orgId: string, painterOrgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };
  const premium = form.get('premium') === 'on';
  const nota = String(form.get('nota') ?? '').trim().slice(0, 2000);
  const { error } = await supabase
    .from('supplier_customers')
    .upsert({ org_id: orgId, painter_org_id: painterOrgId, premium, nota, updated_by: user.id }, { onConflict: 'org_id,painter_org_id' });
  if (error) return { errors: {}, message: 'Não foi possível guardar. Só gestores do fornecedor o podem fazer.' };
  revalidatePath(`/app/organizacoes/${orgId}/clientes/${painterOrgId}`);
  revalidatePath(`/app/organizacoes/${orgId}/clientes`);
  return { errors: {}, ok: true, message: 'Guardado.' };
}
