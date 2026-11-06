'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { isPlatformAdmin } from '@/lib/access';
import { procurarNoOsm } from '@/lib/crmDescoberta';
import { guardarCandidatos } from '@/lib/crmServico';
import { getUser } from '@/lib/supabase/server';

/** Procura empresas da zona no OpenStreetMap e guarda as que ainda não estão no CRM. Não envia nada. */
export async function descobrirContactos(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user || !(await isPlatformAdmin(supabase, user.id))) return { errors: {}, message: 'Sem acesso.' };
  const zonaId = String(form.get('zona') ?? '');
  const { data: zona } = await supabase.from('crm_zonas').select('id, concelho').eq('id', zonaId).maybeSingle();
  if (!zona) return { errors: {}, message: 'Zona desconhecida.' };

  const r = await procurarNoOsm(zona.concelho);
  if (!r.ok) return { errors: {}, message: r.erro };
  const g = await guardarCandidatos(supabase, zona.id, r.candidatos);
  if (g.erro) return { errors: {}, message: 'Não foi possível guardar os contactos.' };
  await supabase.from('crm_zonas').update({ descoberta_em: new Date().toISOString() }).eq('id', zona.id);
  revalidatePath('/app/backoffice/crm');
  return {
    errors: {},
    ok: true,
    message: `${g.novos} contactos novos (${g.contactaveis} contactáveis por email); ${r.candidatos.length - g.novos} já existiam.`,
  };
}
