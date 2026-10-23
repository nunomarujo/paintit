-- Bónus de adesão ao avaliador (ponto 4, pedido do promotor, 23/10/2026, docs/DECISOES.md): um
-- fornecedor que convida com sucesso um pintor a aderir (supplier_painter_invites) não ganha nenhuma
-- comissão nesse programa — só a carteira de clientes e os descontos que pode aplicar. Em vez de abrir
-- uma janela de aviso antecipado (a outra alternativa proposta, que exigiria também bloquear a reserva
-- dos outros avaliadores — mudança bem maior à regra "quem chega primeiro" do levantamento), este
-- convite aceite dá um crédito único de bónus na próxima obra em que o seu avaliador for pago
-- (surveyorShareBp + AVALIADOR_BONUS_BP, src/domain/survey.ts; gasto em settleSurveyPayout,
-- src/lib/surveys.ts). Só concedido/gasto se o fornecedor tiver telefone e autorização de alertas
-- registados — exigência do próprio promotor.

alter table public.organizations add column alertas_autorizados boolean not null default false;
comment on column public.organizations.alertas_autorizados is
  'Autoriza o envio de mensagens e alertas (telefone/email) — condição para gozar o bónus de adesão do avaliador.';

create table public.avaliador_bonus_credits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- Um convite de adesão só pode gerar um crédito (ligação unique): "por uma vez", como pedido.
  invite_id uuid not null unique references public.supplier_painter_invites (id) on delete cascade,
  estado text not null default 'disponivel' check (estado in ('disponivel', 'usado')),
  usado_em_payout uuid references public.survey_payouts (id) on delete set null,
  created_at timestamptz not null default now(),
  usado_em timestamptz
);
create index avaliador_bonus_credits_org_disponivel_idx on public.avaliador_bonus_credits (org_id) where estado = 'disponivel';

alter table public.avaliador_bonus_credits enable row level security;
revoke all on public.avaliador_bonus_credits from anon;
-- Só a plataforma (service role, src/lib/surveys.ts) concede e gasta créditos; o fornecedor só vê os seus.
revoke insert, update, delete on public.avaliador_bonus_credits from authenticated;
create policy avaliador_bonus_credits_select on public.avaliador_bonus_credits for select to authenticated
  using (private.can_access_org(org_id));

-- "create or replace" substitui a função toda (mesmo corpo de 20261023161107, só com o bloco do bónus
-- acrescentado ao fim, antes do "return"): ao ligar o convite com sucesso, concede um crédito único à
-- entidade do fornecedor que convidou. "on conflict (invite_id) do nothing" torna isto seguro a repetição.
create or replace function public.claim_supplier_invite(p_code text, p_org uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  c public.referral_codes;
  inv public.supplier_painter_invites;
begin
  if not private.can_manage_org(p_org) or not private.is_painter_org(p_org) then
    raise exception 'Entidade de pintura não encontrada.' using errcode = 'P0001';
  end if;
  select * into c from public.referral_codes where code = upper(btrim(p_code));
  if not found or not c.active then
    raise exception 'Convite inválido ou desativado.' using errcode = 'P0001';
  end if;
  if c.supplier_org_id = p_org then
    raise exception 'Uma empresa não pode usar o seu próprio código.' using errcode = 'P0001';
  end if;
  if c.painter_org_id is not null and c.painter_org_id <> p_org then
    raise exception 'Este convite já foi associado a outra empresa.' using errcode = 'P0001';
  end if;
  update public.referral_codes set painter_org_id = p_org where id = c.id and painter_org_id is null;
  select * into inv from public.supplier_painter_invites where referral_code_id = c.id;
  if found then
    insert into public.avaliador_bonus_credits (org_id, invite_id) values (inv.org_id, inv.id)
      on conflict (invite_id) do nothing;
  end if;
  return (select nome from public.organizations where id = c.supplier_org_id);
end $$;
revoke all on function public.claim_supplier_invite(text, uuid) from public, anon;
grant execute on function public.claim_supplier_invite(text, uuid) to authenticated;
