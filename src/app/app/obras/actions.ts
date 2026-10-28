'use server';

import { revalidatePath } from 'next/cache';
import { ehEmail } from '@/domain/toques';
import type { FormState } from '@/app/app/actions';
import { randomUUID } from 'node:crypto';
import { addendaErrors } from '@/domain/addenda';
import { cleanPhoto } from '@/domain/photo';
import { diaryErrors } from '@/domain/worksiteDiary';
import { conflitosDoDia, dayErrors, presencasEfetivas, type PresencaInput } from '@/domain/dayLog';
import type { TipoDia } from '@/domain/overtime';
import { UNIDADES, worksiteErrors } from '@/domain/worksites';
import { painterOrgs } from '@/lib/queries';
import { COST_CATEGORIES, MEMBER_ROLES, PAYMENT_METHODS, PHASE_STATES } from '@/domain/worksite';
import { parseHundredths } from '@/domain/request';
import { notifyNewOrder, notifyNewSupplierReview, notifyOrderState } from '@/lib/notify';
import { getUser } from '@/lib/supabase/server';

const path = (id: string) => `/app/obras/${id}`;
const path_ = path;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const fail = (field: string, message: string): FormState => ({ errors: { [field]: message } });
const texto = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max);
const done = (id: string, message: string): FormState => {
  revalidatePath(path(id));
  return { errors: {}, ok: true, message };
};
const date = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  return s && DATE.test(s) ? s : null;
};

export async function addMember(worksiteId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const nome = String(form.get('nome') ?? '').trim();
  const funcao = String(form.get('funcao') ?? '');
  if (!nome) return fail('nome', 'Indique o nome.');
  if (!(MEMBER_ROLES as readonly string[]).includes(funcao)) return fail('funcao', 'Escolha a função.');
  const custo = parseHundredths(form.get('custoHora'));
  if (Number.isNaN(custo)) return fail('custoHora', 'Valor em euros.');
  const { supabase } = await getUser();
  const { error } = await supabase.from('worksite_members').insert({
    worksite_id: worksiteId,
    nome: nome.slice(0, 120),
    funcao,
    telefone: String(form.get('telefone') ?? '').trim().slice(0, 30) || null,
    custo_hora_cents: custo,
  });
  return error ? { errors: {}, message: 'Não foi possível guardar.' } : done(worksiteId, 'Pessoa acrescentada.');
}

export async function addPhase(worksiteId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const nome = String(form.get('nome') ?? '').trim();
  if (!nome) return fail('nome', 'Indique a fase.');
  const inicio = date(form.get('inicio'));
  const fim = date(form.get('fim'));
  if (inicio && fim && fim < inicio) return fail('fim', 'O fim tem de ser depois do início.');
  const { supabase } = await getUser();
  const { error } = await supabase.from('worksite_phases').insert({ worksite_id: worksiteId, nome: nome.slice(0, 120), inicio, fim });
  return error ? { errors: {}, message: 'Não foi possível guardar.' } : done(worksiteId, 'Fase acrescentada.');
}

export async function setPhaseState(worksiteId: string, phaseId: string, estado: string) {
  if (!(PHASE_STATES as readonly string[]).includes(estado)) return;
  const { supabase } = await getUser();
  await supabase.from('worksite_phases').update({ estado }).eq('id', phaseId);
  revalidatePath(path(worksiteId));
}

export async function addEntry(worksiteId: string, tipo: 'custo' | 'tranche' | 'horas', _prev: FormState, form: FormData): Promise<FormState> {
  if (!['custo', 'tranche', 'horas'].includes(tipo)) return { errors: {}, message: 'Tipo inválido.' };
  const descricao = String(form.get('descricao') ?? '').trim().slice(0, 500);
  const data = date(form.get('data')) ?? new Date().toISOString().slice(0, 10);
  const { supabase } = await getUser();
  if (tipo === 'horas') {
    const horas = parseHundredths(form.get('horas'));
    if (horas === null || Number.isNaN(horas) || horas <= 0) return fail('horas', 'Horas, ex.: 7,5.');
    // Cada lançamento é um dia de uma pessoa, nunca um acumulado de vários dias — é o que permite
    // distinguir as horas normais das suplementares (src/domain/overtime.ts).
    if (horas > 2400) return fail('horas', 'Um lançamento é um dia de uma pessoa: no máximo 24 horas.');
    const memberId = String(form.get('member') ?? '') || null;
    const { error } = await supabase.from('worksite_entries').insert({ worksite_id: worksiteId, tipo, data, descricao, horas, member_id: memberId });
    return error ? { errors: {}, message: 'Não foi possível guardar.' } : done(worksiteId, 'Horas registadas.');
  }
  const valor = parseHundredths(form.get('valor'));
  if (valor === null || Number.isNaN(valor) || valor <= 0) return fail('valor', 'Valor em euros.');
  if (tipo === 'custo') {
    const categoria = String(form.get('categoria') ?? '');
    if (!(COST_CATEGORIES as readonly string[]).includes(categoria)) return fail('categoria', 'Escolha a categoria.');
    const { error } = await supabase.from('worksite_entries').insert({ worksite_id: worksiteId, tipo, data, descricao, valor_cents: valor, categoria });
    return error ? { errors: {}, message: 'Não foi possível guardar.' } : done(worksiteId, 'Custo registado.');
  }
  const meio = String(form.get('meio') ?? '');
  const { error } = await supabase.from('worksite_entries').insert({
    worksite_id: worksiteId,
    tipo,
    data,
    descricao,
    valor_cents: valor,
    prevista: date(form.get('prevista')),
    meio: (PAYMENT_METHODS as readonly string[]).includes(meio) ? meio : null,
  });
  return error ? { errors: {}, message: 'Não foi possível guardar.' } : done(worksiteId, 'Tranche acrescentada.');
}

/**
 * O consentimento do pintor para a plataforma lembrar o cliente desta obra, e o email para onde.
 *
 * Guarda-se no mesmo passo porque são a mesma decisão: autorizar sem dizer para onde escrever não
 * autoriza nada, e o campo é livre — tanto leva um email como um número de telefone.
 */
export async function setCobranca(worksiteId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const contacto = String(form.get('clienteContacto') ?? '').trim() || null;
  const ligar = form.get('cobranca') === 'on';
  if (ligar && !ehEmail(contacto)) return { errors: { clienteContacto: 'Indique um email do cliente para onde escrever.' } };

  // A obra é do pintor: as políticas RLS garantem que só ele a altera.
  const { supabase } = await getUser();
  const { error } = await supabase.from('worksites').update({ cobranca: ligar, cliente_contacto: contacto }).eq('id', worksiteId);
  if (error) return { errors: {}, message: 'A cobrança ainda não está disponível nesta instalação.' };
  revalidatePath(`/app/obras/${worksiteId}`);
  return { errors: {}, ok: true, message: ligar ? 'A Quem Pinta passa a lembrar o cliente.' : 'Deixámos de lembrar.' };
}

export async function markTrancheReceived(worksiteId: string, entryId: string) {
  const { supabase } = await getUser();
  await supabase.from('worksite_entries').update({ recebida_em: new Date().toISOString().slice(0, 10) }).eq('id', entryId);
  revalidatePath(path(worksiteId));
}

const WORKSITE_TABLES = ['worksite_members', 'worksite_phases', 'worksite_entries'] as const;

export async function deleteWorksiteRow(worksiteId: string, table: (typeof WORKSITE_TABLES)[number], id: string) {
  // Os argumentos ligados (.bind) vêm do navegador: confirmar a tabela no servidor.
  if (!(WORKSITE_TABLES as readonly string[]).includes(table)) return;
  const { supabase } = await getUser();
  await supabase.from(table).delete().eq('id', id);
  revalidatePath(path(worksiteId));
}

// --- Encomendas com confirmação e avaliações de fornecedores ------------------------------

export async function orderMaterial(worksiteId: string, productId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const n = Number(form.get('embalagens'));
  if (!Number.isInteger(n) || n < 1) return fail('embalagens', 'Número de embalagens.');
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };
  // Encomendar a um fornecedor da plataforma exige contrato assinado, logo exige contratação: numa
  // obra própria do pintor não há a quem encomendar por aqui.
  const { data: obra } = await supabase.from('worksites').select('engagement_id').eq('id', worksiteId).maybeSingle();
  if (!obra?.engagement_id) return { errors: {}, message: 'Só se encomenda pela plataforma em obras contratadas aqui.' };
  const { data, error } = await supabase
    .from('material_orders')
    .insert({
      engagement_id: obra.engagement_id,
      product_id: productId,
      embalagens: n,
      nota: String(form.get('nota') ?? '').trim().slice(0, 1000) || null,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (error || !data) return { errors: {}, message: 'Não foi possível encomendar (o contrato tem de estar assinado).' };
  await notifyNewOrder(data.id).catch(() => undefined);
  return done(worksiteId, 'Encomenda enviada ao fornecedor.');
}

export async function setOrderState(orderId: string, estado: 'confirmada' | 'entregue' | 'cancelada', back: string) {
  if (!['confirmada', 'entregue', 'cancelada'].includes(estado) || !back.startsWith('/app/')) return;
  const { supabase } = await getUser();
  await supabase.from('material_orders').update({ estado }).eq('id', orderId);
  await notifyOrderState(orderId, estado).catch(() => undefined);
  revalidatePath(back);
}

export async function reviewSupplier(worksiteId: string, supplierId: string, painterId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const n = (k: string) => {
    const v = Number(form.get(k));
    return Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;
  };
  const produto = n('produto');
  const entrega = n('entrega');
  const atendimento = n('atendimento');
  if (!produto || !entrega || !atendimento) return { errors: {}, message: 'Dê uma nota de 1 a 5 a cada critério.' };
  const comentario = String(form.get('comentario') ?? '').trim().slice(0, 2000);
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };
  const { data: existing } = await supabase
    .from('supplier_reviews')
    .select('id')
    .eq('supplier_org_id', supplierId)
    .eq('painter_org_id', painterId)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from('supplier_reviews').update({ produto, entrega, atendimento, comentario }).eq('id', existing.id)
    : await supabase
        .from('supplier_reviews')
        .insert({ supplier_org_id: supplierId, painter_org_id: painterId, produto, entrega, atendimento, comentario, created_by: user.id });
  if (error) return { errors: {}, message: 'Só pode avaliar depois de o fornecedor confirmar uma encomenda.' };
  if (!existing) await notifyNewSupplierReview(supplierId).catch(() => undefined);
  return done(worksiteId, 'Avaliação guardada.');
}

/** O fornecedor responde a uma avaliação de um pintor (paridade com reviews.resposta). */
export async function answerSupplierReview(reviewId: string, supplierOrgId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const resposta = String(form.get('resposta') ?? '').trim().slice(0, 2000);
  if (!resposta) return fail('resposta', 'Escreva a resposta.');
  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou. Entre de novo.' };
  const { error } = await supabase.from('supplier_reviews').update({ resposta }).eq('id', reviewId);
  if (error) return { errors: {}, message: 'Não foi possível guardar a resposta.' };
  revalidatePath(`/app/organizacoes/${supplierOrgId}`);
  return { errors: {}, ok: true, message: 'Resposta guardada.' };
}

/**
 * Trabalho a mais proposto ao cliente. Fica sempre em 'proposta': quem aceita é o cliente, do seu
 * lado, e as políticas da base de dados recusam que o pintor o marque como aceite (regra 10).
 *
 * Excepção: a **oferta** (28/10/2026). Trabalho que o pintor fez e decide não cobrar nasce em
 * 'oferecido' e não espera resposta nenhuma — não há preço para o cliente aceitar. Continua a ser
 * mostrado ao cliente, que é o ponto: é a única forma de "fiz isto a mais e nem lhe cobro" deixar
 * rasto. Não acresce ao valor da obra, e entra no relatório de entrega.
 */
export async function proposeAddenda(worksiteId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const descricao = String(form.get('descricao') ?? '').trim();
  const oferta = form.get('oferta') === 'on' || form.get('oferta') === 'sim';
  const bruto = parseHundredths(form.get('valor'));
  // Numa oferta o preço é opcional: em branco vale zero, escrito fica a dizer quanto se ofereceu.
  const valorCents = bruto === null || Number.isNaN(bruto) ? (oferta ? 0 : null) : bruto;
  if (valorCents === null) return fail('valor', 'Indique o preço do trabalho a mais, sem IVA.');
  const errors = addendaErrors({ descricao, valorCents, oferta });
  if (Object.keys(errors).length > 0) {
    const [campo, mensagem] = Object.entries(errors)[0]!;
    return fail(campo, mensagem);
  }
  const { supabase } = await getUser();
  const { error } = await supabase.from('worksite_addenda').insert({
    worksite_id: worksiteId,
    descricao,
    valor_cents: valorCents,
    ...(oferta ? { estado: 'oferecido' as const } : {}),
  });
  if (error) return { errors: {}, message: 'Não foi possível guardar.' };
  return done(worksiteId, oferta ? 'Trabalho registado como oferecido. O cliente vê-o, sem nada a pagar.' : 'Trabalho a mais enviado ao cliente.');
}

/** Retirar um trabalho a mais que ainda não foi respondido. */
export async function withdrawAddenda(worksiteId: string, addendaId: string, _prev: FormState, _form: FormData): Promise<FormState> {
  const { supabase } = await getUser();
  const { error } = await supabase.from('worksite_addenda').update({ estado: 'retirada' }).eq('id', addendaId).eq('estado', 'proposta');
  return error ? { errors: {}, message: 'Não foi possível retirar.' } : done(worksiteId, 'Trabalho a mais retirado.');
}

// --- Obras próprias e consumíveis ---------------------------------------------------------------

/**
 * Criar uma obra que não veio da plataforma. É o que destrava as ferramentas para quem ainda não
 * ganhou nenhuma obra aqui: a gente, os custos e os consumíveis são os mesmos.
 */
export async function createWorksite(_prev: FormState, form: FormData): Promise<FormState> {
  const nome = String(form.get('nome') ?? '').trim();
  const valorRaw = form.get('valor');
  const valorCents = String(valorRaw ?? '').trim() === '' ? null : parseHundredths(valorRaw);
  if (valorCents !== null && Number.isNaN(valorCents)) return fail('valor', 'Valor em euros, sem IVA.');
  const inicio = date(form.get('inicio'));
  const errors = worksiteErrors({
    nome,
    clienteNome: String(form.get('cliente') ?? '').trim() || null,
    local: String(form.get('local') ?? '').trim() || null,
    valorCents,
    inicio,
  });
  if (Object.keys(errors).length > 0) {
    const [campo, mensagem] = Object.entries(errors)[0]!;
    return fail(campo, mensagem);
  }

  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  const org = orgs[0];
  if (!org) return { errors: {}, message: 'Só uma empresa de pintura cria obras.' };

  const { error } = await supabase.from('worksites').insert({
    org_id: org.id,
    nome: nome.slice(0, 160),
    cliente_nome: String(form.get('cliente') ?? '').trim().slice(0, 160) || null,
    local: String(form.get('local') ?? '').trim().slice(0, 160) || null,
    valor_cents: valorCents,
    inicio,
  });
  if (error) return { errors: {}, message: 'Não foi possível criar a obra.' };
  revalidatePath('/app/obras');
  return { errors: {}, ok: true, message: 'Obra criada.' };
}

/** Acrescentar um consumível ao armazém da empresa. */
export async function addConsumable(_prev: FormState, form: FormData): Promise<FormState> {
  const nome = String(form.get('nome') ?? '').trim();
  if (nome.length < 2) return fail('nome', 'Nome do consumível.');
  const unidade = String(form.get('unidade') ?? 'un');
  if (!(UNIDADES as readonly string[]).includes(unidade)) return fail('unidade', 'Escolha a unidade.');
  const minimo = String(form.get('minimo') ?? '').trim() === '' ? 0 : parseHundredths(form.get('minimo'));
  if (minimo === null || Number.isNaN(minimo) || minimo < 0) return fail('minimo', 'Quantidade mínima.');

  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  const org = orgs[0];
  if (!org) return { errors: {}, message: 'Só uma empresa de pintura tem armazém.' };

  const { error } = await supabase.from('org_consumables').insert({
    org_id: org.id,
    nome: nome.slice(0, 120),
    unidade: unidade as 'un',
    minimo,
  });
  if (error) {
    return { errors: {}, message: error.code === '23505' ? 'Já existe um consumível com esse nome.' : 'Não foi possível guardar.' };
  }
  revalidatePath('/app/obras/consumiveis');
  return { errors: {}, ok: true, message: 'Consumível acrescentado.' };
}

/**
 * Entrada ou saída de consumível. Positivo entra (compra), negativo sai para uma obra — e é a soma
 * destes movimentos que dá o stock, que nunca se guarda em coluna nenhuma.
 */
export async function moveConsumable(consumableId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const quantidade = parseHundredths(form.get('quantidade'));
  if (quantidade === null || Number.isNaN(quantidade) || quantidade === 0) return fail('quantidade', 'Quantidade diferente de zero.');
  const sentido = String(form.get('sentido') ?? 'saida');
  const worksiteId = String(form.get('obra') ?? '').trim() || null;
  if (sentido === 'saida' && !worksiteId) return fail('obra', 'Diga de que obra saiu.');

  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  const org = orgs[0];
  if (!org) return { errors: {}, message: 'Sem empresa de pintura.' };

  const { error } = await supabase.from('consumable_moves').insert({
    consumable_id: consumableId,
    org_id: org.id,
    worksite_id: sentido === 'saida' ? worksiteId : null,
    quantidade: sentido === 'saida' ? -Math.abs(quantidade) : Math.abs(quantidade),
    nota: String(form.get('nota') ?? '').trim().slice(0, 300) || null,
  });
  if (error) return { errors: {}, message: 'Não foi possível registar o movimento.' };
  revalidatePath('/app/obras/consumiveis');
  return { errors: {}, ok: true, message: sentido === 'saida' ? 'Saída registada.' : 'Entrada registada.' };
}

/**
 * Registar o dia: as horas de toda a equipa de uma vez, numa só submissão.
 *
 * Quem faltou não gera lançamento nenhum — zero horas é ausência, não é uma linha de zero. É esta
 * ferramenta que torna possível saber a margem real de uma obra, e por isso o que decide se vive é o
 * atrito: o formulário chega aqui já preenchido com o dia normal e o pintor só corrige as excepções.
 */
export async function registerDay(worksiteId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const data = date(form.get('data')) ?? new Date().toISOString().slice(0, 10);
  // Num dia de descanso ou feriado não há horas normais: todas levam acréscimo (overtime.ts).
  const tipoDia: TipoDia = form.get('tipoDia') === 'descanso' ? 'descanso' : 'util';
  const presencas: PresencaInput[] = [];
  for (const [campo, valor] of form.entries()) {
    if (!campo.startsWith('horas:')) continue;
    const memberId = campo.slice('horas:'.length);
    const horas = parseHundredths(valor);
    if (horas === null || Number.isNaN(horas)) return fail('horas', 'Horas, ex.: 7,5.');
    presencas.push({ memberId, horas });
  }
  if (presencas.length === 0) return { errors: {}, message: 'Sem ninguém na equipa desta obra.' };

  const errors = dayErrors(presencas, data);
  if (Object.keys(errors).length > 0) {
    const [campo, mensagem] = Object.entries(errors)[0]!;
    return fail(campo, mensagem);
  }

  const { supabase } = await getUser();
  const efetivas = presencasEfetivas(presencas);

  // O dia de uma pessoa soma-se em todas as obras. Cada obra guardava as suas horas sem saber das
  // outras, e o limite de 24 horas era por linha — o que deixava a mesma pessoa com um dia inteiro
  // em dois sítios (25/10/2026). Um dia repartido é legítimo; um dia impossível não.
  const { data: fichas } = await supabase
    .from('worksite_members')
    .select('id, nome, person_id')
    .in('id', efetivas.map((p) => p.memberId));
  const pessoas = (fichas ?? []).map((f) => f.person_id).filter((x): x is string => Boolean(x));
  const { data: noutras } = pessoas.length
    ? await supabase
        .from('worksite_entries')
        .select('horas, worksite_id, member_id')
        .eq('tipo', 'horas')
        .eq('data', data)
        .neq('worksite_id', worksiteId)
    : { data: [] };
  const outrasFichas = (noutras ?? []).map((x) => x.member_id).filter((x): x is string => Boolean(x));
  const [{ data: fichasDasOutras }, { data: obras }] = await Promise.all([
    outrasFichas.length
      ? supabase.from('worksite_members').select('id, person_id').in('id', outrasFichas)
      : Promise.resolve({ data: [] }),
    outrasFichas.length
      ? supabase.from('worksites').select('id, nome').in('id', [...new Set((noutras ?? []).map((x) => x.worksite_id))])
      : Promise.resolve({ data: [] }),
  ]);
  const pessoaDaFicha = new Map((fichasDasOutras ?? []).map((f) => [f.id, f.person_id]));
  const nomeDaObra = new Map((obras ?? []).map((o) => [o.id, o.nome]));

  const conflitos = conflitosDoDia(
    efetivas.map((p) => {
      const f = (fichas ?? []).find((x) => x.id === p.memberId);
      return { memberId: p.memberId, pessoaId: f?.person_id ?? null, nome: f?.nome ?? 'Esta pessoa', horas: p.horas };
    }),
    (noutras ?? [])
      .map((x) => ({
        pessoaId: (x.member_id ? pessoaDaFicha.get(x.member_id) : null) ?? '',
        obra: nomeDaObra.get(x.worksite_id) ?? 'outra obra',
        horas: x.horas ?? 0,
      }))
      .filter((x) => x.pessoaId !== ''),
  );
  const impossivel = conflitos.find((c) => c.erro);
  if (impossivel) return fail('horas', impossivel.erro!);

  // Um dia registado duas vezes não soma: apaga-se o que lá estava para aquele dia e grava-se de novo.
  await supabase.from('worksite_entries').delete().eq('worksite_id', worksiteId).eq('tipo', 'horas').eq('data', data);

  const { error } = await supabase.from('worksite_entries').insert(
    efetivas.map((p) => ({
      worksite_id: worksiteId,
      tipo: 'horas' as const,
      data,
      tipo_dia: tipoDia,
      descricao: String(form.get('nota') ?? '').trim().slice(0, 500),
      horas: p.horas,
      member_id: p.memberId,
    })),
  );
  if (error) return { errors: {}, message: 'Não foi possível guardar o dia.' };

  // Um custo do dia (tinta comprada a caminho da obra, por exemplo) entra na mesma submissão.
  const custo = parseHundredths(form.get('custo'));
  if (custo !== null && !Number.isNaN(custo) && custo > 0) {
    await supabase.from('worksite_entries').insert({
      worksite_id: worksiteId,
      tipo: 'custo',
      data,
      descricao: String(form.get('custoDescricao') ?? '').trim().slice(0, 500) || 'Custo do dia',
      valor_cents: custo,
      categoria: 'material',
    });
  }

  const avisos = conflitos.filter((c) => c.aviso).map((c) => c.aviso!);
  return done(
    worksiteId,
    `Dia de ${data.split('-').reverse().join('/')} registado.${avisos.length > 0 ? ` ${avisos.join(' ')}` : ''}`,
  );
}

// --- Diário fotográfico -------------------------------------------------------------------------

/**
 * Juntar uma fotografia ao diário da obra.
 *
 * Os metadados da imagem são apagados antes de guardar — levam GPS e modelo do aparelho — e a data
 * que fica é a do servidor. A data da fotografia não serviria de prova: perde-se ao exportar, muda de
 * fuso e altera-se com facilidade.
 */
export async function addDiaryPhoto(worksiteId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const fase = form.get('fase');
  const legenda = texto(form.get('legenda'), 300);
  const zona = texto(form.get('zona'), 120);
  const produto = texto(form.get('produto'), 160);
  const errors = diaryErrors({ fase, legenda, zona, produto });
  if (Object.keys(errors).length > 0) {
    const [campo, mensagem] = Object.entries(errors)[0]!;
    return fail(campo, mensagem);
  }

  const file = form.get('ficheiro');
  if (!(file instanceof File)) return fail('ficheiro', 'Escolha uma fotografia.');
  const clean = cleanPhoto(new Uint8Array(await file.arrayBuffer()));
  if ('error' in clean) return fail('ficheiro', clean.error);

  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };

  const path = `${worksiteId}/${randomUUID()}.${clean.type === 'image/png' ? 'png' : 'jpg'}`;
  const upload = await supabase.storage.from('obra').upload(path, clean.bytes, { contentType: clean.type });
  if (upload.error) return { errors: {}, message: 'Não foi possível carregar a fotografia.' };

  const { error } = await supabase.from('worksite_photos').insert({
    worksite_id: worksiteId,
    storage_path: path,
    fase: fase as 'antes',
    zona: zona || null,
    produto: produto || null,
    legenda: legenda || null,
  });
  if (error) {
    await supabase.storage.from('obra').remove([path]);
    return { errors: {}, message: 'Não foi possível registar a fotografia.' };
  }
  revalidatePath(path_(worksiteId));
  return { errors: {}, ok: true, message: 'Fotografia juntada ao diário.' };
}

/** Apagar uma fotografia do diário. Alterar não se pode: uma etiqueta mudada depois do facto não prova nada. */
export async function removeDiaryPhoto(worksiteId: string, photoId: string, _prev: FormState, _form: FormData): Promise<FormState> {
  const { supabase } = await getUser();
  const { data: foto } = await supabase.from('worksite_photos').select('storage_path').eq('id', photoId).maybeSingle();
  const { error } = await supabase.from('worksite_photos').delete().eq('id', photoId).eq('worksite_id', worksiteId);
  if (error) return { errors: {}, message: 'Não foi possível apagar.' };
  if (foto) await supabase.storage.from('obra').remove([foto.storage_path]);
  revalidatePath(path_(worksiteId));
  return { errors: {}, ok: true };
}

/**
 * Lançar uma despesa: a fotografia do documento e o valor.
 *
 * Dois campos, não um formulário. A obra já se sabe, a data é hoje e pode mudar-se depois; o que
 * falta é quanto e de quê. A leitura automática do documento vem mais tarde — a utilização básica
 * não pode depender de a interpretação acertar (proposta de Gestão de Obra, 25/10/2026).
 *
 * O documento vai para o cofre `comprovativos` e não para o da obra: o da obra é legível pelo
 * cliente, e uma factura traz os preços a que o pintor compra.
 */
export async function addExpense(worksiteId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const valor = parseHundredths(form.get('valor'));
  if (valor === null || Number.isNaN(valor) || valor <= 0) return fail('valor', 'Quanto custou? Ex.: 48,30.');
  const descricao = texto(form.get('descricao'), 200);

  const { supabase, user } = await getUser();
  if (!user) return { errors: {}, message: 'A sessão expirou.' };

  let comprovativo: string | null = null;
  const file = form.get('comprovativo');
  if (file instanceof File && file.size > 0) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const tipo = file.type === 'application/pdf' ? 'application/pdf' : file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const extensao = tipo === 'application/pdf' ? 'pdf' : tipo === 'image/png' ? 'png' : 'jpg';
    const path = `${worksiteId}/${randomUUID()}.${extensao}`;
    const upload = await supabase.storage.from('comprovativos').upload(path, bytes, { contentType: tipo });
    if (upload.error) return { errors: {}, message: 'Não foi possível guardar o documento. O valor não foi lançado.' };
    comprovativo = path;
  }

  const { error } = await supabase.from('worksite_entries').insert({
    worksite_id: worksiteId,
    tipo: 'custo',
    data: date(form.get('data')) ?? new Date().toISOString().slice(0, 10),
    descricao: descricao || 'Despesa',
    valor_cents: valor,
    categoria: 'material',
    comprovativo_path: comprovativo,
  });
  if (error) {
    if (comprovativo) await supabase.storage.from('comprovativos').remove([comprovativo]);
    return { errors: {}, message: 'Não foi possível lançar a despesa.' };
  }
  return done(worksiteId, comprovativo ? 'Despesa lançada, com o documento guardado.' : 'Despesa lançada.');
}
