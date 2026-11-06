'use server';

import { createHash, randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import type { FormState } from '@/app/app/actions';
import {
  CAMPO_LABELS,
  CODIGO_MAX_ENVIOS_HORA,
  CODIGO_VALIDADE_MIN,
  ERRO_DO_CAMPO,
  codigoServe,
  isCampo,
  isLado,
  lerCodigo,
  mascararIban,
  mudaAlgo,
  normalizar,
  podeAlterar,
  type Campo,
  type Lado,
} from '@/domain/elementosDoContrato';
import { EXTENSAO, limparFicheiroDeProva } from '@/domain/ficheiroDeProva';
import { parseHundredths } from '@/domain/request';
import type { Database } from '@/lib/database.types';
import { canManage, myRole } from '@/lib/access';
import { elementosEmVigor, novoCodigo, resumoDoCodigo, resumosIguais } from '@/lib/elementosDoContrato';
import { recipients, sendEmail } from '@/lib/notify';
import { adminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/supabase/server';

// Elementos do contrato e comprovativos de pagamento (06/11/2026; `src/domain/elementosDoContrato.ts`).
//
// Tudo escreve pela chave de serviço, depois de confirmar aqui quem pede: a base não deixa nenhum
// utilizador escrever nestas tabelas diretamente, e volta a recusar o que estiver fora do prazo
// (gatilhos da migração `elementos_e_comprovativos`). O IBAN nunca vai para os registos do servidor.

type EngagementRow = Database['public']['Tables']['engagements']['Row'];
type Client = Awaited<ReturnType<typeof getUser>>['supabase'];

const SESSAO: FormState = { errors: {}, message: 'A sessão expirou. Entre de novo.' };
const SEM_SERVICO: FormState = { errors: {}, message: 'Não foi possível registar agora. Tente de novo dentro de momentos.' };
const NAO_E_DESTE_LADO: FormState = { errors: {}, message: 'Só um proprietário ou gestor da entidade altera os elementos deste lado.' };
const FECHADO: FormState = {
  errors: {},
  message: 'Já há uma assinatura registada: depois dela, qualquer alteração faz-se por adenda ao contrato, entre as partes.',
};

async function geresOLado(supabase: Client, userId: string, row: EngagementRow, lado: Lado) {
  const orgId = lado === 'cliente' ? row.client_org_id : row.painter_org_id;
  const { data: entidade } = await supabase.from('organizations').select('id, gerida_por').eq('id', orgId).maybeSingle();
  return !!entidade && canManage(await myRole(supabase, userId, entidade));
}

/** A contratação, se quem pede gere aquele lado; e se ainda se pode alterar. */
async function contexto(engagementId: string, lado: unknown) {
  if (!isLado(lado)) return { erro: { errors: {}, message: 'Pedido inválido.' } as FormState };
  const { supabase, user } = await getUser();
  if (!user) return { erro: SESSAO };
  const { data: row } = await supabase.from('engagements').select('*').eq('id', engagementId).maybeSingle();
  if (!row) return { erro: { errors: {}, message: 'Contratação não encontrada.' } as FormState };
  if (!(await geresOLado(supabase, user.id, row, lado))) return { erro: NAO_E_DESTE_LADO };
  const { data: eventos } = await supabase.from('engagement_events').select('kind').eq('engagement_id', row.id);
  const kinds = new Set((eventos ?? []).map((e) => e.kind));
  const aberto = podeAlterar({
    minuta: row.minuta_versao,
    apresentada: kinds.has('fee_recebido'),
    algumaAssinatura: kinds.has('cliente_assinou') || kinds.has('pintor_assinou'),
  });
  return { supabase, user, row, lado, aberto };
}

/** Avisa a outra parte de cada campo alterado. O IBAN vai mascarado; o email e o telefone, por inteiro. */
async function avisarOutraParte(row: EngagementRow, lado: Lado, campo: Campo, valor: string) {
  const outra = lado === 'cliente' ? row.painter_org_id : row.client_org_id;
  const quem = lado === 'cliente' ? 'O dono da obra' : 'O empreiteiro';
  const mostrado = campo === 'iban' ? mascararIban(valor) : valor;
  await sendEmail(
    await recipients(outra),
    `${CAMPO_LABELS[campo]} alterado no contrato`,
    [
      `${quem} alterou um elemento do contrato, antes da assinatura: ${CAMPO_LABELS[campo]} — ${mostrado}.`,
      'O contrato a assinar passa a indicar o valor novo. O valor anterior fica guardado no histórico do contrato.',
    ],
    `/app/contratacoes/${row.id}#elementos`,
    { cta: 'Ver o contrato' },
  ).catch(() => false);
}

async function gravar(
  row: EngagementRow,
  lado: Lado,
  campo: Campo,
  valor: string,
  validacao: 'sem_validacao' | 'codigo' | 'inicio_de_sessao',
  userId: string,
): Promise<FormState> {
  const db = adminClient();
  if (!db) return SEM_SERVICO;
  const { error } = await db.from('elementos_do_contrato').insert({ engagement_id: row.id, lado, campo, valor, validacao, criado_por: userId });
  // A razão da base vem em texto; não leva o valor (o gatilho só diz o prazo).
  if (error) return { errors: {}, message: /assinatura/.test(error.message) ? FECHADO.message : 'Não foi possível registar a alteração.' };
  await avisarOutraParte(row, lado, campo, valor);
  revalidatePath(`/app/contratacoes/${row.id}`);
  return { errors: {}, ok: true, message: `${CAMPO_LABELS[campo]} registado. A outra parte foi avisada.` };
}

/**
 * IBAN ou telefone (e o email, quando é o do início de sessão). O email diferente do da sessão segue
 * para `pedirCodigoDoEmail`.
 */
export async function registarElemento(engagementId: string, lado: Lado, campo: Campo, _prev: FormState, form: FormData): Promise<FormState> {
  if (!isCampo(campo)) return { errors: {}, message: 'Pedido inválido.' };
  const c = await contexto(engagementId, lado);
  if ('erro' in c) return c.erro!;
  if (!c.aberto) return FECHADO;
  const valor = normalizar(campo, String(form.get('valor') ?? ''));
  if (!valor) return { errors: { valor: ERRO_DO_CAMPO[campo] } };
  const atuais = (await elementosEmVigor(c.supabase, c.row.id))[c.lado];
  if (!mudaAlgo(atuais, campo, valor)) return { errors: {}, ok: true, message: 'É o valor que já está no contrato.' };
  if (campo === 'email') {
    // O mesmo do início de sessão de quem pede: já está confirmado, não se repete a validação.
    if ((c.user.email ?? '').toLowerCase() !== valor) return { errors: {}, message: 'Para um email diferente do da sessão, peça o código de confirmação.' };
    return gravar(c.row, c.lado, 'email', valor, 'inicio_de_sessao', c.user.id);
  }
  return gravar(c.row, c.lado, campo, valor, 'sem_validacao', c.user.id);
}

/** Envia um código de 6 algarismos para o email novo. Até o confirmar, vale o anterior. */
export async function pedirCodigoDoEmail(engagementId: string, lado: Lado, _prev: FormState, form: FormData): Promise<FormState & { pendente?: string }> {
  const c = await contexto(engagementId, lado);
  if ('erro' in c) return c.erro!;
  if (!c.aberto) return FECHADO;
  const email = normalizar('email', String(form.get('valor') ?? ''));
  if (!email) return { errors: { valor: ERRO_DO_CAMPO.email } };
  const atuais = (await elementosEmVigor(c.supabase, c.row.id))[c.lado];
  if (!mudaAlgo(atuais, 'email', email)) return { errors: {}, ok: true, message: 'É o email que já está no contrato.' };
  if ((c.user.email ?? '').toLowerCase() === email) return gravar(c.row, c.lado, 'email', email, 'inicio_de_sessao', c.user.id);

  const db = adminClient();
  if (!db) return SEM_SERVICO;
  const umaHora = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db
    .from('codigos_de_email')
    .select('id', { count: 'exact', head: true })
    .eq('engagement_id', c.row.id)
    .eq('lado', c.lado)
    .gte('criado_em', umaHora);
  if ((count ?? 0) >= CODIGO_MAX_ENVIOS_HORA) return { errors: {}, message: 'Foram pedidos vários códigos na última hora. Tente mais tarde.' };

  const id = randomUUID();
  const codigo = novoCodigo();
  const { error } = await db.from('codigos_de_email').insert({
    id,
    engagement_id: c.row.id,
    lado: c.lado,
    email,
    codigo_sha256: resumoDoCodigo(codigo, id),
    criado_por: c.user.id,
    expira_em: new Date(Date.now() + CODIGO_VALIDADE_MIN * 60_000).toISOString(),
  });
  if (error) return SEM_SERVICO;
  const enviado = await sendEmail(
    [email],
    'Código para confirmar o email do contrato',
    [
      `O código é ${codigo}. Vale ${CODIGO_VALIDADE_MIN} minutos.`,
      'Foi pedido para confirmar este endereço como email para correspondência num contrato de empreitada. Quem não fez o pedido pode ignorar esta mensagem: nada muda sem o código.',
    ],
    `/app/contratacoes/${c.row.id}#elementos`,
    { cta: 'Abrir o contrato' },
  );
  if (!enviado) return { errors: {}, message: 'Não foi possível enviar o código. Confirme o endereço e tente de novo.' };
  return { errors: {}, ok: true, pendente: email, message: `Código enviado para ${email}. Indique-o abaixo para a alteração passar a valer.` };
}

/** Confere o código do email pendente mais recente; certo, regista o email com «validado por código». */
export async function confirmarCodigoDoEmail(engagementId: string, lado: Lado, _prev: FormState, form: FormData): Promise<FormState> {
  const c = await contexto(engagementId, lado);
  if ('erro' in c) return c.erro!;
  if (!c.aberto) return FECHADO;
  const codigo = lerCodigo(String(form.get('codigo') ?? ''));
  if (!codigo) return { errors: { codigo: 'O código tem 6 algarismos.' } };
  const db = adminClient();
  if (!db) return SEM_SERVICO;
  const { data: pendente } = await db
    .from('codigos_de_email')
    .select('*')
    .eq('engagement_id', c.row.id)
    .eq('lado', c.lado)
    .is('usado_em', null)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!pendente || !codigoServe({ expiraEm: pendente.expira_em, tentativas: pendente.tentativas, usadoEm: pendente.usado_em }, new Date())) {
    return { errors: { codigo: 'O código expirou ou já não serve. Peça um novo.' } };
  }
  if (!resumosIguais(resumoDoCodigo(codigo, pendente.id), pendente.codigo_sha256)) {
    await db.from('codigos_de_email').update({ tentativas: pendente.tentativas + 1 }).eq('id', pendente.id);
    return { errors: { codigo: 'O código não está certo.' } };
  }
  await db.from('codigos_de_email').update({ usado_em: new Date().toISOString() }).eq('id', pendente.id);
  return gravar(c.row, c.lado, 'email', pendente.email, 'codigo', c.user.id);
}

/**
 * O cliente regista o que pagou numa tranche: valor, data, nota e o ficheiro. Só registo: não marca a
 * tranche como recebida (isso continua a ser o pintor a confirmar).
 */
export async function registarComprovativo(engagementId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return SESSAO;
  const { data: row } = await supabase.from('engagements').select('*').eq('id', engagementId).maybeSingle();
  if (!row) return { errors: {}, message: 'Contratação não encontrada.' };
  if (!(await geresOLado(supabase, user.id, row, 'cliente'))) return { errors: {}, message: 'Os comprovativos registam-se por quem gere a entidade cliente.' };

  const errors: Record<string, string> = {};
  const tranche = String(form.get('tranche') ?? '').trim().slice(0, 120);
  if (!tranche) errors.tranche = 'Indique a tranche.';
  const valor = parseHundredths(String(form.get('valor') ?? ''));
  if (valor === null || !Number.isFinite(valor) || valor <= 0) errors.valor = 'Indique o valor pago, em euros.';
  const pagoEm = String(form.get('pagoEm') ?? '');
  const hoje = new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pagoEm) || pagoEm > hoje) errors.pagoEm = 'Indique a data do pagamento (até hoje).';
  const nota = String(form.get('nota') ?? '').trim();
  if (nota.length > 1000) errors.nota = 'A nota tem um máximo de 1000 caracteres.';
  const file = form.get('ficheiro');
  let ficheiro: { type: keyof typeof EXTENSAO; bytes: Uint8Array } | null = null;
  if (file instanceof File && file.size > 0) {
    const limpo = limparFicheiroDeProva(new Uint8Array(await file.arrayBuffer()));
    if ('error' in limpo) errors.ficheiro = limpo.error;
    else ficheiro = limpo;
  }
  if (Object.keys(errors).length > 0) return { errors };

  const db = adminClient();
  if (!db) return SEM_SERVICO;
  let path: string | null = null;
  let sha: string | null = null;
  if (ficheiro) {
    // O nome é o resumo do que se guarda: o mesmo ficheiro não se duplica, e o resumo confere-se depois.
    sha = createHash('sha256').update(ficheiro.bytes).digest('hex');
    path = `${row.id}/${sha}.${EXTENSAO[ficheiro.type]}`;
    const up = await db.storage.from('comprovativos-de-pagamento').upload(path, ficheiro.bytes, { contentType: ficheiro.type, upsert: false });
    if (up.error && !/exists|duplicate/i.test(up.error.message)) return { errors: {}, message: 'Não foi possível guardar o ficheiro.' };
  }
  const { error } = await db.from('comprovativos_de_pagamento').insert({
    engagement_id: row.id,
    tranche,
    valor_cents: valor!,
    pago_em: pagoEm,
    nota: nota || null,
    ficheiro_path: path,
    ficheiro_sha256: sha,
    ficheiro_tipo: ficheiro?.type ?? null,
    criado_por: user.id,
  });
  if (error) return { errors: {}, message: /assinado/.test(error.message) ? error.message : 'Não foi possível registar o comprovativo.' };
  revalidatePath(`/app/contratacoes/${row.id}`);
  return { errors: {}, ok: true, message: 'Comprovativo registado. Fica guardado tal como foi enviado.' };
}
