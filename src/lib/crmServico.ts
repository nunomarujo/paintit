import type { SupabaseClient } from '@supabase/supabase-js';
import { FONTE_OSM, type Candidato } from '@/domain/crmDescoberta';
import type { Database } from '@/lib/database.types';

/** Guarda os candidatos que ainda não estão na zona (por nome ou email). Devolve quantos entraram. */
export async function guardarCandidatos(
  db: SupabaseClient<Database>,
  zonaId: string,
  candidatos: Candidato[],
): Promise<{ novos: number; contactaveis: number; erro?: string }> {
  const { data: existentes } = await db.from('crm_contactos').select('nome, email').eq('zona_id', zonaId);
  const nomes = new Set((existentes ?? []).map((c) => c.nome.toLowerCase()));
  const emails = new Set((existentes ?? []).flatMap((c) => (c.email ? [c.email.toLowerCase()] : [])));
  const novos = candidatos.filter((c) => !nomes.has(c.nome.toLowerCase()) && !(c.email && emails.has(c.email)));
  if (novos.length === 0) return { novos: 0, contactaveis: 0 };
  const { error } = await db.from('crm_contactos').insert(
    novos.map((c) => ({
      zona_id: zonaId,
      tipo: c.tipo,
      nome: c.nome,
      email: c.email,
      telefone: c.telefone,
      website: c.website,
      fonte: FONTE_OSM,
      pessoa_coletiva: c.pessoaColetiva,
    })),
  );
  if (error) return { novos: 0, contactaveis: 0, erro: error.message };
  return { novos: novos.length, contactaveis: novos.filter((c) => c.email && c.pessoaColetiva).length };
}

/** Respeita um pedido para sair: o contacto fica marcado, o que ainda não saiu deixa de sair, e conta como desistência. */
export async function registarDesistencia(db: SupabaseClient<Database>, contactoId: string): Promise<void> {
  const { data: c } = await db.from('crm_contactos').select('desistiu_em').eq('id', contactoId).maybeSingle();
  if (!c || c.desistiu_em) return;
  await db.from('crm_contactos').update({ desistiu_em: new Date().toISOString(), estado: 'desistiu' }).eq('id', contactoId);
  await db.from('crm_eventos').insert({ contacto_id: contactoId, tipo: 'desistencia' });
  await db.from('crm_envios').update({ estado: 'rejeitado' }).eq('contacto_id', contactoId).in('estado', ['proposto', 'aprovado']);
}
