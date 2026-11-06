'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { FONTE_OSM } from '@/domain/crmDescoberta';
import { isPlatformAdmin } from '@/lib/access';
import { procurarNoOsm } from '@/lib/crmDescoberta';
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

  const { data: existentes } = await supabase.from('crm_contactos').select('nome, email').eq('zona_id', zona.id);
  const nomes = new Set((existentes ?? []).map((c) => c.nome.toLowerCase()));
  const emails = new Set((existentes ?? []).flatMap((c) => (c.email ? [c.email.toLowerCase()] : [])));
  const novos = r.candidatos.filter((c) => !nomes.has(c.nome.toLowerCase()) && !(c.email && emails.has(c.email)));
  if (novos.length > 0) {
    const { error } = await supabase.from('crm_contactos').insert(
      novos.map((c) => ({
        zona_id: zona.id,
        tipo: c.tipo,
        nome: c.nome,
        email: c.email,
        telefone: c.telefone,
        website: c.website,
        fonte: FONTE_OSM,
        pessoa_coletiva: c.pessoaColetiva,
      })),
    );
    if (error) return { errors: {}, message: 'Não foi possível guardar os contactos.' };
  }
  revalidatePath('/app/backoffice/crm');
  const comEmail = novos.filter((c) => c.email && c.pessoaColetiva).length;
  return {
    errors: {},
    ok: true,
    message: `${novos.length} contactos novos (${comEmail} contactáveis por email); ${r.candidatos.length - novos.length} já existiam.`,
  };
}
