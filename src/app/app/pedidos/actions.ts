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
  primeiraMedicao,
  publishBlockers,
  SURFACE_KINDS,
  surfaceArea,
  type Participacao,
  type SurfaceInput,
  type SurfaceKind,
} from '@/domain/request';
import { paraZona } from '@/lib/requests';
import { colunasDasCaleiras } from '@/domain/caleiras';
import {
  CONFIRMADA_NAO_SE_TROCA,
  NAO_SE_MEDE_NA_FOTOGRAFIA,
  aceitaMedicaoDaFotografia,
  margemEmTexto,
  medeSeNaFotografia,
  zonaDaMedicao,
  type MedicaoDaFotografia,
} from '@/domain/medicaoDaFotografia';
import { preferencesFromForm } from '@/domain/reference';
import { newReferralCode } from '@/domain/referral';
import { CURRENT_RULES } from '@/domain/rules';
import { isPlatformAdmin } from '@/lib/access';
import { guardContact } from '@/lib/strikes';
import { getUser } from '@/lib/supabase/server';
import { isForma, lerFaceDoPredio } from '@/domain/volume';

const NOT_SIGNED_IN: FormState = { errors: {}, message: 'A sessão expirou. Entre de novo.' };

/**
 * Redesenhar o pedido **e** os levantamentos.
 *
 * As zonas e as fotografias de um pedido vêem-se em dois sítios: a página do pedido, do lado do
 * cliente, e a página do levantamento, do lado de quem está no prédio. As duas mostram as mesmas
 * linhas, e as duas são estáticas até alguém as mandar refazer. Revalidar só a do pedido deixava o
 * vendedor a acrescentar uma zona e a não a ver aparecer — e a acrescentá-la outra vez.
 */
function revalidarPedido(requestId: string) {
  revalidatePath(`/app/pedidos/${requestId}`);
  revalidatePath('/app/levantamentos', 'layout');
}

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
    // As colunas das caleiras (migração `caleiras`) só vão quando há caleiras agora ou havia antes
    // (campo escondido do formulário): um pedido sem caleiras grava-se igual com ou sem a migração
    // aplicada, e desmarcar o tipo limpa o que lá estava.
    ...(v.tiposObra.includes('caleiras') || form.get('caleirasAntes') === '1' ? colunasDasCaleiras(v.caleiras) : {}),
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
  const { data, error } = await supabase
    .from('request_surfaces')
    .insert({
      request_id: requestId,
      ...colunasDaZona(v),
      // Zona nova: a medição é sempre de quem a está a criar.
      registado_por: user.id,
      registado_em: new Date().toISOString(),
    })
    .select('id');
  if (error) return { errors: {}, message: 'Não foi possível acrescentar. O pedido tem de estar em rascunho.' };
  const face = faceDoFormulario(form, v.kind);
  if (face !== undefined && data?.[0]) await gravarFaceDaZona(supabase, requestId, data[0].id, face);
  revalidarPedido(requestId);
  return { errors: {}, ok: true };
}

/** Os tipos de zona que ocupam um lado da planta do prédio: os alçados e as varandas. */
const TIPOS_COM_LADO: readonly SurfaceKind[] = ['fachada', 'empena', 'varandas'];

/**
 * O lado do prédio que o editor enviou. `undefined`: o formulário não traz o campo (não se mexe); nulo: o desenho
 * atribui. Um tipo de zona que não ocupa um lado fica sempre sem ele. O valor vem do navegador (regra 10): só passa
 * o que é um identificador de lado (`lerFaceDoPredio`), e a base repete a verificação.
 */
function faceDoFormulario(form: FormData, kind: SurfaceKind): string | null | undefined {
  if (!TIPOS_COM_LADO.includes(kind)) return form.has('face') ? null : undefined;
  return form.has('face') ? lerFaceDoPredio(form.get('face')) : undefined;
}

/**
 * Grava o lado de uma zona, à parte do resto da linha: a coluna é de 06/11/2026 (migração
 * `face_do_predio`) e pode ainda não estar aplicada. Sem ela, a zona fica gravada na mesma e o desenho atribui o
 * lado pela ordem — o que não se pode é a página, ou a gravação da zona, rebentar por causa de uma coluna.
 */
async function gravarFaceDaZona(
  supabase: Awaited<ReturnType<typeof getUser>>['supabase'],
  requestId: string,
  surfaceId: string,
  face: string | null,
): Promise<boolean> {
  const { error } = await supabase.from('request_surfaces').update({ face_do_predio: face }).eq('id', surfaceId).eq('request_id', requestId);
  return !error;
}

/**
 * As colunas de uma zona, a partir do que o editor enviou. Uma só função para acrescentar e para
 * alterar: eram duas listas de campos a ter de andar a par, e andar a par é coisa que não acontece.
 *
 * Não inclui `registado_por`/`registado_em`: quem chama decide-os (ver `addSurface` e
 * `updateSurface`), porque o critério depende de se a zona já tinha ou não uma medição — ver
 * `primeiraMedicao` em `src/domain/request.ts`.
 */
function colunasDaZona(v: SurfaceInput) {
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
  };
}

/**
 * Alterar uma zona que já existe. Era o que faltava para o botão «Editar» ter o que fazer.
 *
 * `registado_por`/`registado_em` só se escrevem quando a zona ainda não tinha nenhuma medição
 * (`origem_quantidade` anterior nulo): nesse caso esta edição É a primeira medição, e fica
 * legitimamente atribuída a quem a fez. Quando a zona já tinha origem, estas colunas ficam como
 * estavam — o promotor pediu-o de propósito («o registo deve conservar quem fez cada medição e
 * quando»), para que a correcção de uma zona pelo cliente não apague o registo de que foi um
 * avaliador quem a mediu (CLAUDE.md; `docs/DECISOES.md`, 30/10/2026).
 */
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
  const { data: zonaActual } = await supabase
    .from('request_surfaces')
    .select('origem_quantidade, area_cm2')
    .eq('id', surfaceId)
    .eq('request_id', requestId)
    .maybeSingle();
  // Uma zona medida pelo cliente na fotografia (06/11/2026). O editor não a deixa escolher à mão — vem só
  // da ferramenta, com a margem. Editada sem mexer na área (o nome, os trabalhos), continua a ser a mesma
  // medição: mantém a origem e a margem. Com a área mudada à mão, deixa de o ser: passa à origem que o
  // editor enviou e perde a margem — a base exige que só a medição da fotografia tenha margem.
  const eraDaFotografia = zonaActual?.origem_quantidade === 'medida_pelo_cliente';
  const pedeManter = eraDaFotografia && form.get('origemQuantidade') === 'manter';
  const manter = pedeManter && surfaceArea(v) === zonaActual?.area_cm2;
  // Pediu para manter a medição, mas a área mudou: já não é a medição da fotografia. Em vez de a passar a
  // «estimativa» em silêncio (e dizer «Guardado»), pergunta-se de onde vem o número novo.
  if (pedeManter && !manter) {
    return { errors: { origemQuantidade: 'A área mudou, por isso deixou de ser a medição da fotografia: indique de onde vem o número novo.' } };
  }
  const { error } = await supabase
    .from('request_surfaces')
    .update({
      ...colunasDaZona(v),
      ...(manter
        ? { origem_quantidade: 'medida_pelo_cliente' as const, confirmacao: 'por_confirmar' as const }
        : eraDaFotografia
          ? { margem_bps: null }
          : {}),
      ...(primeiraMedicao(zonaActual?.origem_quantidade ?? null)
        ? { registado_por: user.id, registado_em: new Date().toISOString() }
        : {}),
    })
    .eq('id', surfaceId)
    .eq('request_id', requestId);
  if (error) return { errors: {}, message: 'Não foi possível guardar. O pedido tem de estar em rascunho.' };
  const face = faceDoFormulario(form, v.kind);
  const faceGravada = face === undefined ? true : await gravarFaceDaZona(supabase, requestId, surfaceId, face);
  revalidarPedido(requestId);
  return {
    errors: {},
    ok: true,
    message: faceGravada ? 'Guardado.' : 'Guardado, mas o lado do prédio ainda não se guarda: o desenho usa a ordem das zonas.',
  };
}

/**
 * Grava no pedido a medição de uma fachada feita na ferramenta de fotografia (06/11/2026).
 *
 * A zona fica «medida pelo cliente», com a margem de erro, e por confirmar (decisão do promotor de
 * 05/11/2026; a base garante-o, migração 20261106083508). Vai a área a pintar e a margem — nunca a
 * fotografia nem o desenho sobre ela (regra 6). As regras da conversão estão em `zonaDaMedicao`.
 *
 * Tudo isto chega do navegador (regra 10): o pedido e a zona ligados, a medição no corpo. A medição é
 * do aparelho de quem a fez, por natureza — o que se garante aqui é que é plausível, que vai rotulada
 * como o que é, com a margem que a acompanha. Quem pode gravar decide-o a base (gerir a entidade do
 * pedido, ou ser o avaliador dele, e o pedido em rascunho); a zona tem de ser deste pedido. Uma
 * gravação que a base recusou em silêncio (nenhuma linha) não diz «Guardado».
 *
 * A autoria passa a ser de quem mediu: é um número novo, desta pessoa — ao contrário da edição manual,
 * que conserva quem mediu antes (`primeiraMedicao`).
 */
export async function gravarMedicaoDaFotografia(
  requestId: string,
  zona: { id: string } | { nova: { kind: string; descricao: string | null } },
  medicao: MedicaoDaFotografia,
): Promise<FormState & { zonaId?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  const z = zonaDaMedicao({
    temContorno: medicao?.temContorno === true,
    pintavelM2: Number(medicao?.pintavelM2),
    porMedir: Array.isArray(medicao?.porMedir) ? medicao.porMedir.map(String).slice(0, 20) : ['a medição chegou incompleta'],
    porDecidir: Array.isArray(medicao?.porDecidir) ? medicao.porDecidir.map(String).slice(0, 20) : [],
    margemRelativa: typeof medicao?.margemRelativa === 'number' ? medicao.margemRelativa : null,
  });
  if (!z.ok) return { errors: {}, message: z.motivo };

  const colunas = {
    area_direta_cm2: z.areaDiretaCm2,
    largura_cm: null,
    altura_cm: null,
    vaos_cm2: null,
    // A ferramenta mede uma fachada: a área a pintar é a desta zona, uma vez. Numa zona que tinha quantidade
    // 3 (três fachadas iguais, escritas à mão), manter o 3 triplicava a área medida sem ninguém o dizer.
    quantidade: 1,
    origem_quantidade: 'medida_pelo_cliente' as const,
    confirmacao: 'por_confirmar' as const,
    margem_bps: z.margemBps,
    registado_por: user.id,
    registado_em: new Date().toISOString(),
  };
  const naoGravou: FormState = {
    errors: {},
    message: 'Não foi possível gravar a medição. O pedido tem de estar em rascunho, e só quem o gere o pode alterar.',
  };
  // Antes da migração 20261106083508 a coluna da margem não existe e a origem nova é recusada: a culpa não é
  // de quem grava, e dizer-lhe «o pedido tem de estar em rascunho» mandava-o procurar o erro errado.
  const recusou = (error: { code?: string; message?: string }): FormState => {
    if (['42703', 'PGRST204', '23514'].includes(error.code ?? '')) {
      console.error('gravarMedicaoDaFotografia: a base ainda não aceita a medição do cliente', error.code, error.message);
      return { errors: {}, message: 'A gravação pela fotografia ainda não está disponível. A medição continua na ferramenta.' };
    }
    return naoGravou;
  };

  let zonaId: string;
  if ('id' in zona) {
    if (typeof zona.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(zona.id)) return { errors: {}, message: 'Zona inválida.' };
    // A janela não oferece uma zona confirmada no local, mas a zona chega do navegador (regra 10): pergunta-se
    // aqui outra vez, à base, antes de trocar a medida de quem lá foi por uma da fotografia.
    const { data: actual } = await supabase
      .from('request_surfaces')
      .select('confirmacao, kind')
      .eq('id', zona.id)
      .eq('request_id', requestId)
      .maybeSingle();
    if (!actual) return naoGravou;
    if (!aceitaMedicaoDaFotografia(actual.confirmacao)) return { errors: {}, message: CONFIRMADA_NAO_SE_TROCA };
    if (!medeSeNaFotografia(actual.kind)) return { errors: {}, message: NAO_SE_MEDE_NA_FOTOGRAFIA };
    const { data, error } = await supabase
      .from('request_surfaces')
      .update(colunas)
      .eq('id', zona.id)
      .eq('request_id', requestId)
      // E no próprio update: se a zona for confirmada entre a leitura e a escrita, não se toca nela.
      .neq('confirmacao', 'confirmada')
      .select('id');
    if (error) return recusou(error);
    if (!data?.length) return naoGravou;
    zonaId = zona.id;
  } else {
    const kind = String(zona?.nova?.kind ?? '');
    if (!(SURFACE_KINDS as readonly string[]).includes(kind)) return { errors: {}, message: 'Escolha o tipo da zona.' };
    if (!medeSeNaFotografia(kind as SurfaceKind)) return { errors: {}, message: NAO_SE_MEDE_NA_FOTOGRAFIA };
    const descricao = String(zona.nova.descricao ?? '').trim().slice(0, 200) || null;
    const refused = await guardContact(supabase, user.id, 'zona do pedido', { descricao });
    if (refused) return refused;
    const { data, error } = await supabase
      .from('request_surfaces')
      .insert({ request_id: requestId, kind: kind as SurfaceKind, descricao, origem: 'estimativa', ...colunas })
      .select('id');
    if (error) return recusou(error);
    if (!data?.[0]) return naoGravou;
    zonaId = data[0].id;
  }
  revalidarPedido(requestId);
  const foraDaArea = medicao?.porDecidir?.length ? ' Não inclui as faces de dentro das varandas, que ficam à parte.' : '';
  return {
    errors: {},
    ok: true,
    zonaId,
    message: `Gravado: ${(z.areaDiretaCm2 / 100).toLocaleString('pt-PT')} m², medida pelo cliente ${margemEmTexto(z.margemBps)}, por confirmar no local.${foraDaArea}`,
  };
}

export async function deleteSurface(requestId: string, surfaceId: string) {
  const { supabase } = await getUser();
  await supabase.from('request_surfaces').delete().eq('id', surfaceId).eq('request_id', requestId);
  revalidarPedido(requestId);
}

/**
 * Recomeçar o desenho: remove todas as zonas do pedido, com as medidas delas. As fotografias ficam (só
 * perdem a ligação à zona, `on delete set null`), tal como as medidas do prédio. Pede-se confirmação no
 * ecrã; aqui a RLS decide quem pode apagar — as mesmas regras de `deleteSurface`.
 */
export async function apagarTodasAsZonas(requestId: string) {
  const { supabase } = await getUser();
  await supabase.from('request_surfaces').delete().eq('request_id', requestId);
  revalidarPedido(requestId);
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
  revalidarPedido(requestId);
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
  revalidarPedido(requestId);
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
  revalidarPedido(requestId);
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

/**
 * A planta do prédio (quadrado, I, L, U, T), escolhida no passo 2 quando entra o segundo alçado (06/11/2026).
 *
 * É a mesma forma que o cadastro do prédio guarda (`buildings.forma_implantacao`, a que a ficha do prédio chega
 * por `saveBuildingCharacteristic`): vive no prédio e não no pedido, porque é do prédio. O valor vem do navegador
 * (regra 10): só uma das cinco formas passa, e a base repete a restrição. Quem pode alterar o prédio decide-o a
 * política da tabela; uma gravação que a base recusou em silêncio (nenhuma linha) não diz «Guardado».
 */
export async function guardarFormaDoPredio(buildingId: string, requestId: string, forma: string): Promise<FormState> {
  if (!isForma(forma)) return { errors: {}, message: 'Planta desconhecida.' };
  const { supabase, user } = await getUser();
  if (!user) return NOT_SIGNED_IN;
  // O prédio vem do navegador (regra 10): tem de ser o do pedido, e não outro prédio da mesma organização.
  const { data: pedido } = await supabase.from('work_requests').select('building_id').eq('id', requestId).maybeSingle();
  if (!pedido || pedido.building_id !== buildingId) return { errors: {}, message: 'Este prédio não é o do pedido.' };
  const { data, error } = await supabase.from('buildings').update({ forma_implantacao: forma }).eq('id', buildingId).select('id');
  if (error || !data || data.length === 0) {
    return { errors: {}, message: 'Não foi possível guardar a planta. Só quem gere o prédio a pode alterar.' };
  }
  revalidatePath(`/app/pedidos/${requestId}`);
  return { errors: {}, ok: true, message: 'Guardado.' };
}
