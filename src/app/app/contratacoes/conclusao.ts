'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import { EXTENSAO, limparFicheiroDeProva } from '@/domain/ficheiroDeProva';
import {
  PASSO_LABELS,
  calcularGarantia,
  estadoDaConclusao,
  inicioDaGarantia,
  passosPossiveis,
  type Lado,
  type PassoDaConclusao,
  type PassoRegistado,
} from '@/domain/garantia';
import { canManage, myRole } from '@/lib/access';
import { recipients, sendEmail } from '@/lib/notify';
import { adminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';

// Conclusão da obra e garantia (06/11/2026; `src/domain/garantia.ts`). A plataforma regista cada passo e
// a prova que as partes juntam; não decide quem tem razão. Escreve só o servidor, depois de confirmar que
// quem pede gere o seu lado; a base recusa o que for antes do contrato celebrado ou que tente reescrever.

const PASSOS: readonly PassoDaConclusao[] = ['declarou', 'confirmou', 'discordou', 'juntou_prova'];

export async function registarPassoDaConclusao(engagementId: string, lado: Lado, passo: PassoDaConclusao, _prev: FormState, form: FormData): Promise<FormState> {
  if ((lado !== 'cliente' && lado !== 'pintor') || !PASSOS.includes(passo)) return { errors: {}, message: 'Pedido inválido.' };
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou. Entre de novo.' };
  const { data: row } = await supabase.from('engagements').select('*').eq('id', engagementId).maybeSingle();
  if (!row) return { errors: {}, message: 'Contratação não encontrada.' };
  const orgId = lado === 'cliente' ? row.client_org_id : row.painter_org_id;
  const { data: entidade } = await supabase.from('organizations').select('id, gerida_por').eq('id', orgId).maybeSingle();
  if (!entidade || !canManage(await myRole(supabase, user.id, entidade))) return { errors: {}, message: 'Só um proprietário ou gestor da entidade regista este passo.' };

  const { data: anteriores } = await supabase.from('conclusao_da_obra').select('lado, passo, data_conclusao, criado_em').eq('engagement_id', row.id);
  const historico: PassoRegistado[] = (anteriores ?? []).map((p) => ({ lado: p.lado as Lado, passo: p.passo as PassoDaConclusao, dataConclusao: p.data_conclusao, criadoEm: p.criado_em }));
  const agora = new Date();
  if (!passosPossiveis(estadoDaConclusao(historico, agora), lado).includes(passo)) return { errors: {}, message: 'Este passo não está disponível agora.' };

  const errors: Record<string, string> = {};
  const hoje = agora.toLocaleDateString('sv-SE', { timeZone: 'Europe/Lisbon' });
  const data = String(form.get('dataConclusao') ?? '');
  if (passo === 'declarou' && (!/^\d{4}-\d{2}-\d{2}$/.test(data) || data > hoje)) errors.dataConclusao = 'Indique a data em que a obra ficou concluída (até hoje).';
  const razao = String(form.get('razao') ?? '').trim();
  if (passo === 'discordou' && razao.length < 10) errors.razao = 'Escreva a razão (pelo menos 10 caracteres). Fica registada tal como está.';
  if (razao.length > 2000) errors.razao = 'A razão tem um máximo de 2000 caracteres.';
  const file = form.get('ficheiro');
  let ficheiro: { type: keyof typeof EXTENSAO; bytes: Uint8Array } | null = null;
  if (file instanceof File && file.size > 0) {
    const limpo = limparFicheiroDeProva(new Uint8Array(await file.arrayBuffer()));
    if ('error' in limpo) errors.ficheiro = limpo.error;
    else ficheiro = limpo;
  }
  if (passo === 'juntou_prova' && !ficheiro && !errors.ficheiro) errors.ficheiro = 'Junte a fotografia ou o PDF.';
  if (Object.keys(errors).length > 0) return { errors };

  const db = adminClient();
  if (!db) return { errors: {}, message: 'Não foi possível registar agora. Tente de novo dentro de momentos.' };
  let path: string | null = null;
  let sha: string | null = null;
  if (ficheiro) {
    sha = createHash('sha256').update(ficheiro.bytes).digest('hex');
    path = `${row.id}/${sha}.${EXTENSAO[ficheiro.type]}`;
    const up = await db.storage.from('provas-da-obra').upload(path, ficheiro.bytes, { contentType: ficheiro.type, upsert: false });
    if (up.error && !/exists|duplicate/i.test(up.error.message)) return { errors: {}, message: 'Não foi possível guardar o ficheiro.' };
  }
  const { data: novo, error } = await db
    .from('conclusao_da_obra')
    .insert({
      engagement_id: row.id,
      lado,
      passo,
      data_conclusao: passo === 'declarou' ? data : null,
      razao: razao || null,
      ficheiro_path: path,
      ficheiro_sha256: sha,
      ficheiro_tipo: ficheiro?.type ?? null,
      criado_por: user.id,
    })
    .select('lado, passo, data_conclusao, criado_em')
    .single();
  if (error || !novo) return { errors: {}, message: error?.message.includes('assinado') ? error.message : 'Não foi possível registar.' };

  // Confirmada pelas duas partes: calcula-se o fim da garantia e o da conservação, e guardam-se com a data do cálculo.
  const estado = estadoDaConclusao([...historico, { lado, passo, dataConclusao: novo.data_conclusao, criadoEm: novo.criado_em }], new Date());
  // Contratações anteriores à minuta nova não guardaram o número: vem da proposta escolhida, que já não muda.
  const anos =
    row.garantia_anos ?? (await supabase.from('proposals').select('garantia_anos').eq('id', row.proposal_id).maybeSingle()).data?.garantia_anos ?? null;
  const garantia = calcularGarantia(inicioDaGarantia(estado), anos);
  if (passo === 'confirmou' && garantia) {
    await db.from('garantias_calculadas').insert({
      engagement_id: row.id,
      inicio: garantia.inicio,
      anos: garantia.anos,
      fim_garantia: garantia.fimDaGarantia,
      fim_conservacao: garantia.fimDaConservacao,
    });
  }

  const outra = lado === 'cliente' ? row.painter_org_id : row.client_org_id;
  const quem = lado === 'cliente' ? 'O dono da obra' : 'O empreiteiro';
  await sendEmail(
    await recipients(outra),
    `Conclusão da obra: ${PASSO_LABELS[passo]}`,
    [
      `${quem} ${PASSO_LABELS[passo]}${passo === 'declarou' ? ` (data indicada: ${data.split('-').reverse().join('/')})` : ''}.`,
      passo === 'declarou'
        ? 'Na página do contrato é possível confirmar, discordar com uma razão escrita, ou juntar prova. A plataforma regista e não decide.'
        : 'Fica no registo da obra, com a data. A plataforma regista e não decide.',
    ],
    `/app/contratacoes/${row.id}#conclusao`,
    { cta: 'Ver o contrato' },
  ).catch(() => false);
  revalidatePath(`/app/contratacoes/${row.id}`);
  return { errors: {}, ok: true, message: 'Registado, com a data de hoje.' };
}
