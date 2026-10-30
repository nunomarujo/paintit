'use server';

import { after } from 'next/server';
import { notifyNewRequest } from '@/lib/notify';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Json } from '@/lib/database.types';
import type { FormState } from '@/app/app/actions';
import { localDate } from '@/domain/deadline';
import { MAX_PHOTOS_PER_REQUEST, PHOTO_KINDS, cleanPhoto, type PhotoKind } from '@/domain/photo';
import {
  PARTICIPACOES,
  confirmacaoDaOrigem,
  parseRequest,
  parseSurface,
  publishBlockers,
  type Participacao,
  type SurfaceInput,
} from '@/domain/request';
import { paraZona } from '@/lib/requests';
import { preferencesFromForm } from '@/domain/reference';
import { newReferralCode } from '@/domain/referral';
import { CURRENT_RULES } from '@/domain/rules';
import { isPlatformAdmin } from '@/lib/access';
import { guardContact } from '@/lib/strikes';
import { getUser } from '@/lib/supabase/server';

const NOT_SIGNED_IN: FormState = { errors: {}, message: 'A sessão expirou. Entre de novo.' };

function requestColumns(v: NonNullable<ReturnType<typeof parseRequest>['value']>, form: FormData) {
  return {
    produtos_preferidos: preferencesFromForm(form).map((p) => ({ id: p.id, fixo: p.fixo })) as Json,
    building_id: v.buildingId,
    titulo: v.titulo,
    tipo_obra: v.tipoObra,
    tipos_obra: v.tiposObra,
    datas_flexiveis: v.datasFlexiveis,
    descricao: v.descricao,
    trabalhos: v.trabalhos,
    cor_acabamento: v.corAcabamento,
    prazo_propostas: v.prazoPropostas,
    execucao_desde: v.execucaoDesde,
    execucao_ate: v.execucaoAte,
    ocupacao_via_publica: v.ocupacaoViaPublica,
    trabalhos_modo: v.trabalhosModo,
  };
}

export async function createRequest(orgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseRequest(form);
  if (!parsed.value) return { errors: parsed.errors };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const refused = await guardContact(supabase, user.id, 'pedido', { descricao: parsed.value.descricao, corAcabamento: parsed.value.corAcabamento });
  if (refused) return refused;

  const { data, error } = await supabase
    .from('work_requests')
    .insert({ org_id: orgId, ...requestColumns(parsed.value, form), created_by: user.id })
    .select('id')
    .single();
  if (error || !data) return { errors: {}, message: 'Não foi possível criar o pedido. Só gestores da entidade o podem fazer.' };
  redirect(`/app/pedidos/${data.id}`);
}

/**
 * O motivo da escolha, nas palavras de quem decide.
 *
 * Fica separado da análise da plataforma de propósito: no relatório para a assembleia aparece numa
 * secção própria, dita de quem a escreveu. É a diferença entre um relatório que ajuda a decidir e
 * um que parece ter decidido.
 */
export async function guardarMotivoDaEscolha(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const texto = String(form.get('motivo') ?? '').trim().slice(0, 4000);
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { data, error } = await supabase
    .from('work_requests')
    .update({ motivo_escolha: texto || null, motivo_escolha_em: texto ? new Date().toISOString() : null })
    .eq('id', requestId)
    .select('id');
  // Sem a migração `motivo_da_escolha` isto falha, e o erro aparece: um formulário que não grava e
  // não se queixa parece um formulário partido.
  if (error || !data || data.length === 0) {
    return { errors: {}, message: 'Não foi possível guardar o motivo. Só gestores da entidade o podem escrever.' };
  }
  revalidatePath(`/app/pedidos/${requestId}/propostas/relatorio`);
  return { errors: {}, ok: true, message: texto ? 'Motivo guardado.' : 'Motivo apagado.' };
}

export async function updateRequest(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseRequest(form);
  if (!parsed.value) return { errors: parsed.errors };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const refused = await guardContact(supabase, user.id, 'pedido', { descricao: parsed.value.descricao, corAcabamento: parsed.value.corAcabamento });
  if (refused) return refused;

  const { data, error } = await supabase
    .from('work_requests')
    .update(requestColumns(parsed.value, form))
    .eq('id', requestId)
    .eq('status', 'rascunho')
    .select('id');
  if (error || !data || data.length === 0) {
    return { errors: {}, message: 'Não foi possível guardar. Um pedido publicado tem de voltar a rascunho para ser alterado.' };
  }
  revalidatePath(`/app/pedidos/${requestId}`);

  /*
   * O botão «Guardar e publicar» é um segundo `submit` deste mesmo formulário, e chega aqui no
   * campo `accao`. É a correcção do defeito que o promotor relatou a 30/10/2026: escrevia cem
   * caracteres na descrição, carregava em publicar, e o bloqueio continuava lá.
   *
   * A causa não era a validação: eram **dois formulários**. O texto novo vivia no formulário dos
   * dados; o botão de publicar vivia noutro, e ao ser carregado só enviava o seu. O servidor lia a
   * descrição **guardada** — a antiga — e recusava com razão. Do lado de cá, o botão parecia
   * avariado.
   *
   * Agora é um gesto só: grava-se o que está no ecrã e valida-se o que ficou gravado. Nunca se
   * valida uma versão que o cliente já não tem à frente.
   */
  if (String(form.get('accao') ?? '') === 'publicar') {
    const r = await publishRequest(requestId);
    return r.ok ? r : { ...r, message: r.message ?? 'Guardado, mas falta alguma coisa para publicar.' };
  }
  return { errors: {}, ok: true, message: 'Guardado.' };
}

export async function addSurface(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseSurface(form);
  if (!parsed.value) return { errors: parsed.errors };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  const v = parsed.value;
  const refused = await guardContact(supabase, user.id, 'zona do pedido', { descricao: v.descricao });
  if (refused) return refused;
  const { error } = await supabase.from('request_surfaces').insert({
    request_id: requestId,
    ...colunasDaZona(v, user.id),
  });
  if (error) return { errors: {}, message: 'Não foi possível acrescentar. O pedido tem de estar em rascunho.' };
  revalidatePath(`/app/pedidos/${requestId}`);
  return { errors: {}, ok: true };
}

/**
 * As colunas de uma zona, a partir do que o editor enviou. Uma só função para acrescentar e para
 * alterar: eram duas listas de campos a ter de andar a par, e andar a par é coisa que não acontece.
 *
 * `registado_por` e `registado_em` guardam-se sempre. O promotor pediu-o de propósito — «o registo
 * deve conservar quem fez cada medição e quando» —, para que a revisão pelo cliente não transforme
 * uma medida técnica em algo que se presume que ele verificou pessoalmente.
 */
function colunasDaZona(v: SurfaceInput, userId: string) {
  return {
    kind: v.kind,
    descricao: v.descricao,
    area_direta_cm2: v.areaDireta,
    largura_cm: v.areaDireta === null ? v.larguraCm : null,
    altura_cm: v.areaDireta === null ? v.alturaCm : null,
    vaos_cm2: v.areaDireta === null ? v.vaosCm2 : null,
    quantidade: v.quantidade,
    origem: v.origem,
    origem_quantidade: v.origemQuantidade,
    confirmacao: confirmacaoDaOrigem(v.origemQuantidade),
    trabalhos: v.trabalhos,
    registado_por: userId,
    registado_em: new Date().toISOString(),
  };
}

/** Alterar uma zona que já existe. Era o que faltava para o botão «Editar» ter o que fazer. */
export async function updateSurface(
  requestId: string,
  surfaceId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = parseSurface(form);
  if (!parsed.value) return { errors: parsed.errors };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  const v = parsed.value;
  const refused = await guardContact(supabase, user.id, 'zona do pedido', { descricao: v.descricao });
  if (refused) return refused;
  const { error } = await supabase
    .from('request_surfaces')
    .update(colunasDaZona(v, user.id))
    .eq('id', surfaceId)
    .eq('request_id', requestId);
  if (error) return { errors: {}, message: 'Não foi possível guardar. O pedido tem de estar em rascunho.' };
  revalidatePath(`/app/pedidos/${requestId}`);
  return { errors: {}, ok: true, message: 'Guardado.' };
}

export async function deleteSurface(requestId: string, surfaceId: string) {
  const { supabase } = await getUser();
  await supabase.from('request_surfaces').delete().eq('id', surfaceId).eq('request_id', requestId);
  revalidatePath(`/app/pedidos/${requestId}`);
}

/**
 * Põe uma zona dentro ou fora deste pedido.
 *
 * **Excluir não apaga.** É a diferença que o promotor fixou a 30/10/2026: uma zona excluída fica no
 * pedido, identificada, com os dados que já tivesse — para não restar dúvida de que foi considerada
 * e deixada de fora. Quem quiser mesmo que ela desapareça usa «Remover», que é outra coisa e está
 * ali ao lado.
 *
 * A participação chega do navegador e por isso valida-se aqui (CLAUDE.md, regra 10); o resto fica
 * às políticas RLS, que já só deixam mexer em zonas de pedidos da entidade de quem pede.
 */
export async function setParticipacaoDaZona(requestId: string, surfaceId: string, participacao: string) {
  if (!(PARTICIPACOES as readonly string[]).includes(participacao)) return;
  const { supabase } = await getUser();
  await supabase
    .from('request_surfaces')
    .update({ participacao: participacao as Participacao })
    .eq('id', surfaceId)
    .eq('request_id', requestId);
  revalidatePath(`/app/pedidos/${requestId}`);
}

export async function publishRequest(requestId: string): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;

  const [{ data: req }, { data: surfaces }] = await Promise.all([
    supabase.from('work_requests').select('descricao, prazo_propostas, cor_acabamento, status, trabalhos').eq('id', requestId).maybeSingle(),
    supabase
      .from('request_surfaces')
      .select('area_cm2, descricao, origem, participacao, origem_quantidade, confirmacao')
      .eq('request_id', requestId),
  ]);
  if (!req || req.status !== 'rascunho') return { errors: {}, message: 'Só um rascunho pode ser publicado.' };

  const blockers = publishBlockers({
    descricao: req.descricao,
    trabalhos: req.trabalhos ?? [],
    otherTexts: [req.cor_acabamento ?? '', ...(surfaces ?? []).map((s) => s.descricao ?? '')],
    prazoPropostas: req.prazo_propostas,
    zonas: (surfaces ?? []).map(paraZona),
    today: localDate(new Date(), CURRENT_RULES.timeZone),
  });
  if (blockers.length > 0) return { errors: {}, message: blockers.join(' ') };

  // A base de dados repete as verificações essenciais e cria o anúncio anónimo.
  const { error } = await supabase.from('work_requests').update({ status: 'publicado' }).eq('id', requestId);
  if (error) return { errors: {}, message: error.message };
  // Depois da resposta: convidar os pintores por email não atrasa nem faz falhar a publicação.
  after(() => notifyNewRequest(requestId).catch((e) => console.error('Convite aos pintores falhou:', e)));
  revalidatePath(`/app/pedidos/${requestId}`);
  return { errors: {}, ok: true, message: 'Publicado. Os pintores da zona já podem ver o anúncio.' };
}

export async function changeRequestStatus(requestId: string, status: 'rascunho' | 'encerrado' | 'cancelado') {
  // Os argumentos ligados vêm do navegador; publicar passa sempre por publishRequest.
  if (!['rascunho', 'encerrado', 'cancelado'].includes(status)) return;
  const { supabase } = await getUser();
  await supabase.from('work_requests').update({ status }).eq('id', requestId);
  revalidatePath(`/app/pedidos/${requestId}`);
}

/**
 * Adiar o fim do prazo de propostas.
 *
 * Quem decide se pode é a base de dados (`prolongar_prazo`): só antes da entrega, ou quando ainda não
 * chegou proposta nenhuma. Depois de o cliente ver uma proposta, prolongar dava-lhe vantagem sobre
 * quem entrasse a seguir — e é por isso que a verificação não pode viver aqui, onde o navegador
 * chega.
 */
export async function prolongarPrazo(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const prazo = String(form.get('prazo') ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prazo)) return { errors: { prazo: 'Indique uma data.' } };
  const { supabase } = await getUser();
  const { error } = await supabase.rpc('prolongar_prazo', { p_request: requestId, p_prazo: prazo });
  if (error) return { errors: { prazo: error.message } };
  revalidatePath(`/app/pedidos/${requestId}`);
  return { errors: {}, ok: true };
}

// --- Convite direto ("traga o seu pintor") ------------------------------------------

export async function createRequestInvite(requestId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const nota = String(form.get('nota') ?? '').trim().slice(0, 80) || null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newReferralCode();
    const { data, error } = await supabase.from('request_invites').insert({ request_id: requestId, code, nota }).select('code').maybeSingle();
    if (!error && data) {
      revalidatePath(`/app/pedidos/${requestId}`);
      return { errors: {}, ok: true, message: `Código ${data.code} criado. Partilhe-o com o seu pintor de confiança.` };
    }
    if (error?.code !== '23505') return { errors: {}, message: 'Não foi possível criar o código. Só gestores desta entidade o podem fazer, numa obra publicada.' };
  }
  return { errors: {}, message: 'Não foi possível gerar um código novo. Tente de novo.' };
}

export async function setRequestInviteActive(requestId: string, inviteId: string, active: boolean) {
  const { supabase } = await getUser();
  await supabase.from('request_invites').update({ active: active === true }).eq('id', inviteId).eq('request_id', requestId);
  revalidatePath(`/app/pedidos/${requestId}`);
}

// --- Fotografias -------------------------------------------------------------------

/**
 * O resultado de um envio, por fotografia. Não é `FormState` de propósito: quem chama isto é uma
 * fila no navegador, que precisa de saber se **esta** correu bem para passar à seguinte, e o texto
 * do erro fica ao lado da miniatura que falhou — não numa mensagem única no fim do formulário.
 */
export type ResultadoDoEnvio = { ok: true } | { ok: false; erro: string };

/**
 * Uma fotografia. Sem `revalidatePath`: a fila envia várias seguidas, e revalidar a página a cada
 * uma mandava o servidor redesenhar o ecrã oito vezes no meio do envio. Quem chama refresca uma vez
 * no fim.
 */
export async function enviarFotografia(requestId: string, form: FormData): Promise<ResultadoDoEnvio> {
  const kind = String(form.get('kind') ?? '');
  const legenda = String(form.get('legenda') ?? '').trim().slice(0, 200) || null;
  const zona = String(form.get('zona') ?? '').trim() || null;
  const file = form.get('ficheiro');
  if (!(PHOTO_KINDS as readonly string[]).includes(kind)) return { ok: false, erro: 'Escolha o tipo de fotografia.' };
  if (!(file instanceof File)) return { ok: false, erro: 'Escolha uma fotografia.' };

  // Valida pelos bytes e retira os metadados (GPS, aparelho, data) antes de guardar.
  const clean = cleanPhoto(new Uint8Array(await file.arrayBuffer()));
  if ('error' in clean) return { ok: false, erro: clean.error };

  const { supabase, user } = await getUser();
  if (!user) return { ok: false, erro: 'A sessão expirou. Entre de novo.' };
  const refusedPhoto = await guardContact(supabase, user.id, 'legenda de fotografia', { legenda });
  if (refusedPhoto) return { ok: false, erro: refusedPhoto.message ?? 'A legenda não pode ter contactos.' };
  const { count } = await supabase
    .from('request_photos')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', requestId);
  if ((count ?? 0) >= MAX_PHOTOS_PER_REQUEST) {
    return { ok: false, erro: `Cada pedido tem no máximo ${MAX_PHOTOS_PER_REQUEST} fotografias.` };
  }

  const path = `${requestId}/${randomUUID()}.${clean.type === 'image/png' ? 'png' : 'jpg'}`;
  const upload = await supabase.storage.from('fotos').upload(path, clean.bytes, { contentType: clean.type });
  if (upload.error) {
    return { ok: false, erro: 'Não foi possível carregar a fotografia. O pedido tem de estar em rascunho.' };
  }
  const { error } = await supabase.from('request_photos').insert({
    request_id: requestId,
    kind: kind as PhotoKind,
    storage_path: path,
    legenda,
    zona_id: zona,
    submitted_by: user.id,
  });
  if (error) {
    await supabase.storage.from('fotos').remove([path]);
    return { ok: false, erro: 'Não foi possível registar a fotografia. Tente de novo.' };
  }
  return { ok: true };
}

/**
 * Corrigir a legenda e a zona de uma fotografia já enviada.
 *
 * Porque é que isto existe em vez de se perguntar tudo antes do envio: quem escolhe oito
 * fotografias de uma vez não escreve oito legendas antes de as mandar, e a zona de cada uma
 * percebe-se melhor a olhar para a miniatura. A base de dados só deixa fazer isto a quem gere o
 * pedido, enquanto for rascunho, e nunca a quem revê (migração `fotografias_por_zona`).
 */
export async function corrigirFotografia(
  requestId: string,
  photoId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const legenda = String(form.get('legenda') ?? '').trim().slice(0, 200) || null;
  const zona = String(form.get('zona') ?? '').trim() || null;
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const refused = await guardContact(supabase, user.id, 'legenda de fotografia', { legenda });
  if (refused) return refused;
  const { error } = await supabase
    .from('request_photos')
    .update({ legenda, zona_id: zona })
    .eq('id', photoId)
    .eq('request_id', requestId);
  if (error) return { errors: {}, message: 'Não foi possível guardar. Tente de novo.' };
  revalidatePath(`/app/pedidos/${requestId}`);
  return { errors: {}, ok: true, message: 'Guardado.' };
}

export async function deletePhoto(requestId: string, photoId: string) {
  const { supabase } = await getUser();
  const { data } = await supabase
    .from('request_photos')
    .delete()
    .eq('id', photoId)
    .eq('request_id', requestId)
    .select('storage_path');
  if (data && data.length > 0) await supabase.storage.from('fotos').remove(data.map((p) => p.storage_path));
  revalidatePath(`/app/pedidos/${requestId}`);
}

export async function reviewPhoto(photoId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const decision = String(form.get('decision') ?? '');
  const notas = String(form.get('notas') ?? '').trim() || null;
  if (decision !== 'aprovada' && decision !== 'rejeitada') return { errors: {}, message: 'Decisão inválida.' };
  if (decision === 'rejeitada' && !notas) return { errors: { notas: 'Explique o motivo ao cliente.' } };

  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  if (!(await isPlatformAdmin(supabase, user.id))) return { errors: {}, message: 'Sem permissão.' };
  const { data, error } = await supabase
    .from('request_photos')
    .update({ revisao: decision, notas_revisao: notas, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', photoId)
    .select('id');
  if (error || !data || data.length === 0) return { errors: {}, message: 'Não foi possível registar a decisão.' };
  revalidatePath('/app/backoffice', 'layout');
  return { errors: {}, ok: true, message: decision === 'aprovada' ? 'Aprovada para o anúncio.' : 'Fica fora do anúncio.' };
}

/**
 * As medidas do prédio: frente, fundo e pé-direito.
 *
 * Vivem no prédio e não no pedido, porque são do prédio: dois pedidos para o mesmo prédio não têm
 * duas frentes diferentes. É a separação que o promotor pediu a 30/10/2026 — a geometria do
 * edifício de um lado, as superfícies a pintar do outro.
 *
 * Um campo deixado em branco grava **nulo**, e nulo quer dizer «por medir». Não se converte em zero
 * nem se estima a partir de nada: é a mesma regra de `src/domain/geometria.ts`.
 */
export async function guardarMedidasDoPredio(
  buildingId: string,
  requestId: string,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const cm = (nome: string): number | null => {
    const bruto = String(form.get(nome) ?? '').trim().replace(',', '.');
    if (bruto === '') return null;
    const metros = Number(bruto);
    if (!Number.isFinite(metros) || metros <= 0) return null;
    return Math.round(metros * 100);
  };
  const errors: Record<string, string> = {};
  const largura = cm('largura');
  const profundidade = cm('profundidade');
  const peDireito = cm('peDireito');
  if (largura !== null && largura > 50000) errors.largura = 'Frente a mais. Confirme o valor em metros.';
  if (profundidade !== null && profundidade > 50000) errors.profundidade = 'Fundo a mais. Confirme o valor em metros.';
  if (peDireito !== null && (peDireito < 180 || peDireito > 800)) {
    errors.peDireito = 'O pé-direito de um piso anda entre 1,8 e 8 metros.';
  }
  const origem = String(form.get('origem') ?? 'estimativa');
  if (!['estimativa', 'medicao', 'planta'].includes(origem)) errors.origem = 'Origem inválida.';
  if (Object.keys(errors).length > 0) return { errors };

  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const { data, error } = await supabase
    .from('buildings')
    .update({
      largura_cm: largura,
      profundidade_cm: profundidade,
      pe_direito_cm: peDireito,
      medidas_origem: origem,
    })
    .eq('id', buildingId)
    .select('id');
  if (error || !data || data.length === 0) {
    return { errors: {}, message: 'Não foi possível guardar as medidas do prédio.' };
  }
  revalidatePath(`/app/pedidos/${requestId}`);
  return { errors: {}, ok: true, message: 'Guardado.' };
}
