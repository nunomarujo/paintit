import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

/**
 * O endereço do logótipo de uma empresa, ou nada.
 *
 * ## Consulta própria, como as outras colunas recém-nascidas
 *
 * `logotipo_path` entrou a 30/10/2026 e o código chega sempre à produção antes da migração — são
 * dois lançamentos independentes. Pedir a coluna dentro da consulta que traz o nome e o NIF faria
 * o PostgREST recusar a consulta inteira, e o cabeçalho do orçamento ficava sem nome nenhum. É o
 * mesmo erro que em 28/10/2026 pôs todos os pedidos a dar «Não encontrado» por causa das janelas
 * por fachada. Aqui falha sozinha, e o que se perde é o logótipo — ficam as iniciais.
 *
 * ## Endereço público, e de propósito
 *
 * O cofre `logotipos` é público (ver a migração). Um link assinado de 60 segundos serve para abrir
 * uma fotografia no ecrã, não para ficar dentro de um PDF que alguém guarda e reabre daqui a um
 * ano. O anonimato defende-se noutro sítio: antes da apresentação, o documento não mostra marca
 * nenhuma do pintor.
 */
export async function logotipoDaEmpresa(
  supabase: SupabaseClient<Database>,
  orgId: string | null | undefined,
): Promise<string | null> {
  if (!orgId) return null;
  const { data, error } = await supabase
    .from('organizations')
    .select('logotipo_path')
    .eq('id', orgId)
    .maybeSingle();
  if (error || !data?.logotipo_path) return null;
  return supabase.storage.from('logotipos').getPublicUrl(data.logotipo_path).data.publicUrl;
}
