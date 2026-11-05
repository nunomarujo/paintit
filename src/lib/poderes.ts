import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { diaDeLisboa } from '@/domain/disponibilidade';
import { missingDocs, type DocKind, type OrgKind } from '@/domain/organization';
import {
  estadoDaLeitura,
  poderesDaAssinatura,
  regimeDosPoderes,
  type EstadoDaLeitura,
  type LeituraDosPoderes,
  type PoderesDaAssinatura,
} from '@/domain/poderes';
import type { Database } from '@/lib/database.types';

// Leituras da base para os poderes de representação (regras em src/domain/poderes.ts). Correm com a sessão de
// quem pede: a entidade lê a sua própria leitura (quem a gere), a equipa lê todas, e mais ninguém (RLS).
//
// Tudo ou nada. Enquanto a migração `20261105230000_poderes_de_representacao` não estiver aplicada, as tabelas
// não existem e a leitura devolve `undefined`: nesse caso nada muda para ninguém — a assinatura não grava
// resultado nenhum, em NENHUM regime (nem no do titular, que não precisa destas tabelas), e a página da entidade
// não passa a pedir a certidão ao pintor sociedade. Publicar o código antes da migração não liga metade da
// funcionalidade; aplicá-la liga tudo de uma vez.

type Client = SupabaseClient<Database>;
type Estado = Database['public']['Tables']['poderes_de_representacao']['Row'];

export interface LeituraDaEntidade {
  estado: Estado | null;
  membros: { nome: string; cargo: string }[];
  /** A leitura feita e completa, na forma que o domínio usa; `null` se ainda não houver. */
  leitura: LeituraDosPoderes | null;
  codigoEntregue: boolean;
}

/**
 * A leitura de uma entidade. `undefined` quando não foi possível ler (uma tabela que ainda não existe na base,
 * por exemplo, enquanto a migração não for aplicada): quem chama não conclui nada a partir disso.
 */
export async function leituraDaEntidade(supabase: Client, orgId: string): Promise<LeituraDaEntidade | undefined> {
  const [estado, membros] = await Promise.all([
    supabase.from('poderes_de_representacao').select('*').eq('org_id', orgId).maybeSingle(),
    supabase.from('poderes_membros').select('nome, cargo, ordem').eq('org_id', orgId).order('ordem'),
  ]);
  if (estado.error || membros.error) return undefined;
  const e = estado.data;
  const lista = (membros.data ?? []).map((m) => ({ nome: m.nome, cargo: m.cargo }));
  const leitura: LeituraDosPoderes | null =
    e?.lida_em && e.valida_ate
      ? {
          fonte: e.fonte,
          membros: lista,
          assinaturasExigidas: e.assinaturas_exigidas === 1 || e.assinaturas_exigidas === 2 ? e.assinaturas_exigidas : null,
          validaAte: e.valida_ate,
        }
      : null;
  return { estado: e, membros: lista, leitura, codigoEntregue: Boolean(e?.codigo_entregue_em) };
}

/** Os nomes dos proprietários da entidade: o titular da conta, para particulares e empresários em nome individual. */
async function titulares(supabase: Client, orgId: string): Promise<string[] | undefined> {
  const { data: donos, error } = await supabase.from('org_members').select('user_id').eq('org_id', orgId).eq('role', 'proprietario');
  if (error) return undefined;
  const ids = (donos ?? []).map((d) => d.user_id);
  if (ids.length === 0) return [];
  const { data: perfis, error: e2 } = await supabase.from('profiles').select('nome').in('user_id', ids);
  if (e2) return undefined;
  return (perfis ?? []).map((p) => p.nome);
}

/**
 * O resultado dos poderes para o lado que assina, a partir dos nomes dos certificados. `null` quando não foi
 * possível ler o que é preciso: nesse caso não se grava resultado nenhum — antes nenhum do que um falso.
 * Nunca recusa a assinatura; quem chama decide só o que mostra.
 */
export async function poderesDoLado(
  supabase: Client,
  orgId: string,
  signatarios: (string | null)[],
  agora: Date = new Date(),
): Promise<PoderesDaAssinatura | null> {
  const { data: org, error } = await supabase.from('organizations').select('kind, nif').eq('id', orgId).maybeSingle();
  if (error || !org) return null;
  // Lê-se sempre, mesmo quando o regime não a usa: sem as tabelas (a migração por aplicar) não há resultado
  // para ninguém — tudo ou nada (cabeçalho deste ficheiro).
  const l = await leituraDaEntidade(supabase, orgId);
  if (!l) return null;
  const regime = regimeDosPoderes(org.kind, org.nif);
  let leitura: LeituraDosPoderes | null = null;
  let codigoEntregue = false;
  let nomes: string[] = [];
  if (regime === 'certidao' || regime === 'ata') {
    leitura = l.leitura;
    codigoEntregue = l.codigoEntregue;
  } else if (regime === 'titular') {
    const t = await titulares(supabase, orgId);
    if (!t) return null;
    nomes = t;
  }
  return poderesDaAssinatura({
    tipo: org.kind,
    nif: org.nif,
    leitura,
    codigoEntregue,
    signatarios,
    titulares: nomes,
    hoje: diaDeLisboa(agora),
  });
}

/**
 * O estado do código da certidão e os documentos em falta, para a página da entidade. Tudo ou nada, como na
 * assinatura: sem `poderes` (a migração por aplicar, ou uma leitura que falhou) a lista é a de antes de
 * 05/11/2026 — o pintor sociedade não passa a ver a certidão em falta sem poder entregar o código no lugar dela.
 * Com `poderes`, a certidão é pedida também ao pintor sociedade, e um código guardado (por ler ou lido) vale
 * por ela (Portaria 285/2012, art. 6.º, n.º 2).
 */
export function faltasDaEntidade(
  org: { kind: OrgKind; nif: string | null },
  docs: { kind: DocKind; status: string }[],
  poderes: LeituraDaEntidade | undefined,
  hoje: string,
): { leitura: { estado: EstadoDaLeitura; texto: string }; faltas: DocKind[][] } {
  const e = poderes?.estado;
  const leitura = estadoDaLeitura(e ? { codigoEntregueEm: e.codigo_entregue_em, lidaEm: e.lida_em, validaAte: e.valida_ate } : null, hoje);
  const faltas = poderes
    ? missingDocs(org.kind, docs, { nif: org.nif, codigoCertidao: leitura.estado === 'por_ler' || leitura.estado === 'lida' })
    : missingDocs(org.kind, docs);
  return { leitura, faltas };
}
