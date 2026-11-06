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

/** O promotor aprova uma campanha nova, ou pede uma correção. Só isto espera por ele: os envios de uma campanha aprovada seguem sozinhos. */
export async function decidirCampanhaCrm(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user || !(await isPlatformAdmin(supabase, user.id))) return { errors: {}, message: 'Sem acesso.' };
  const id = String(form.get('campanha') ?? '');
  const decisao = String(form.get('decisao') ?? '');
  const nota = String(form.get('nota') ?? '').trim();
  if (decisao !== 'aprovar' && decisao !== 'corrigir') return { errors: {}, message: 'Decisão inválida.' };
  if (decisao === 'corrigir' && nota.length < 3) return { errors: { nota: 'Diga o que corrigir.' } };
  const { data: c } = await supabase.from('crm_campanhas').select('id').eq('id', id).maybeSingle();
  if (!c) return { errors: {}, message: 'Campanha desconhecida.' };
  const { error } = await supabase
    .from('crm_campanhas')
    .update({
      estado: decisao === 'aprovar' ? 'aprovada' : 'correcao',
      nota: decisao === 'corrigir' ? nota : null,
      decidida_por: user.id,
      decidida_em: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { errors: {}, message: 'Não foi possível guardar a decisão.' };
  revalidatePath('/app/backoffice/crm');
  return { errors: {}, ok: true, message: decisao === 'aprovar' ? 'Campanha aprovada. Os envios seguem sozinhos.' : 'Correção pedida. A campanha pára até ser revista.' };
}
