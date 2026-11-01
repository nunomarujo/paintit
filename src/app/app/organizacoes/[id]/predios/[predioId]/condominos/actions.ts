'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'node:crypto';
import { getUser } from '@/lib/supabase/server';
import { assertPermilagem, VotacaoError } from '@/domain/votacao';

export type Estado = { errors: Record<string, string | undefined>; message?: string; ok?: boolean };

const NOT_SIGNED_IN: Estado = { errors: {}, message: 'A sessão expirou. Entre de novo.' };

// Código do prédio: 10 caracteres de [a-z0-9], ~52 bits. Não é segredo de estado — quem o tem só
// consegue registar-se como condómino e ficar à espera de o gestor o ver na lista — mas também não
// se adivinha.
function novoCodigo(): string {
  const alfabeto = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(randomBytes(10), (b) => alfabeto[b % alfabeto.length]!).join('');
}

function caminho(orgId: string, predioId: string) {
  return `/app/organizacoes/${orgId}/predios/${predioId}/condominos`;
}

/** Cria o código do prédio (ou substitui o anterior, que deixa de valer). */
export async function criarCodigo(orgId: string, predioId: string): Promise<void> {
  const { supabase, user } = await getUser();
  if (!user) return;
  const codigo = novoCodigo();
  const { data: existe } = await supabase.from('building_access_codes').select('building_id').eq('building_id', predioId).maybeSingle();
  if (existe) {
    await supabase.from('building_access_codes').update({ codigo, revoked_at: null }).eq('building_id', predioId);
  } else {
    await supabase.from('building_access_codes').insert({ building_id: predioId, org_id: orgId, codigo, created_by: user.id });
  }
  revalidatePath(caminho(orgId, predioId));
}

export async function desactivarCodigo(orgId: string, predioId: string): Promise<void> {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase.from('building_access_codes').update({ revoked_at: new Date().toISOString() }).eq('building_id', predioId);
  revalidatePath(caminho(orgId, predioId));
}

export async function registarCondomino(orgId: string, predioId: string, _prev: Estado, form: FormData): Promise<Estado> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const fracao = String(form.get('fracao') ?? '').trim();
  const andar = String(form.get('andar') ?? '').trim();
  const nome = String(form.get('nome') ?? '').trim();
  const permilagemRaw = String(form.get('permilagem') ?? '').trim();
  const errors: Estado['errors'] = {};
  if (!email.includes('@')) errors.email = 'Indique o email do condómino.';
  if (!fracao) errors.fracao = 'Indique a fração.';
  let permilagem: number | null = null;
  if (permilagemRaw) {
    try {
      permilagem = assertPermilagem(Number(permilagemRaw));
    } catch (e) {
      if (e instanceof VotacaoError) errors.permilagem = 'Número inteiro entre 1 e 1000.';
      else throw e;
    }
  }
  if (Object.keys(errors).length) return { errors };

  const { error } = await supabase
    .from('building_residents')
    .insert({ building_id: predioId, org_id: orgId, email, fracao, andar, nome, permilagem, created_by: user.id });
  if (error) {
    return {
      errors: {},
      message: error.code === '23505' ? 'Já existe um condómino com este email neste prédio.' : 'Não foi possível registar. Tente de novo.',
    };
  }
  revalidatePath(caminho(orgId, predioId));
  return { errors: {}, ok: true, message: `Registado. ${email} entra com este email, pelo link ou pelo código do prédio.` };
}

export async function alterarPermilagem(orgId: string, predioId: string, residentId: string, _prev: Estado, form: FormData): Promise<Estado> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const raw = String(form.get('permilagem') ?? '').trim();
  let permilagem: number | null = null;
  if (raw) {
    try {
      permilagem = assertPermilagem(Number(raw));
    } catch {
      return { errors: { permilagem: 'Número inteiro entre 1 e 1000.' } };
    }
  }
  await supabase.from('building_residents').update({ permilagem }).eq('id', residentId).eq('building_id', predioId);
  revalidatePath(caminho(orgId, predioId));
  return { errors: {}, ok: true };
}

export async function retirarAcesso(orgId: string, predioId: string, residentId: string): Promise<void> {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase
    .from('building_residents')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', residentId)
    .eq('building_id', predioId);
  revalidatePath(caminho(orgId, predioId));
}

export async function reporAcesso(orgId: string, predioId: string, residentId: string): Promise<void> {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase.from('building_residents').update({ revoked_at: null }).eq('id', residentId).eq('building_id', predioId);
  revalidatePath(caminho(orgId, predioId));
}
