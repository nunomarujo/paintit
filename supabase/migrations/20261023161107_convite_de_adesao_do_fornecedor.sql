-- Convite de adesão enviado diretamente pelo fornecedor a um pintor que ainda não está na plataforma
-- (decisão de 23/10/2026, docs/DECISOES.md): em vez de depender do pintor descobrir por fora um código
-- de adesão já existente, o fornecedor preenche o nome e o email de quem conhece e a plataforma envia
-- um convite por email. Reaproveita por inteiro o mecanismo de códigos de adesão já em produção
-- (referral_codes, 20261021070000) — só acrescenta uma segunda forma de o ligar a uma entidade de
-- pintura, fora de uma proposta (no próprio registo do pintor, ou a abrir o link do convite com uma
-- entidade já criada), e uma tabela leve para o fornecedor ver a quem já convidou. Um código ligado
-- desta forma funciona depois exatamente como um código aplicado numa proposta — aparece de imediato
-- no seletor "fornecedores já ligados" do pintor (ReferralField.tsx/linkedSupplierCodes).

create table public.supplier_painter_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  referral_code_id uuid not null unique references public.referral_codes (id) on delete cascade,
  nome text not null check (length(nome) between 1 and 120),
  email text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index supplier_painter_invites_org_idx on public.supplier_painter_invites (org_id);

alter table public.supplier_painter_invites enable row level security;
revoke all on public.supplier_painter_invites from anon;
revoke update, delete on public.supplier_painter_invites from authenticated;
-- Contactos do próprio fornecedor: nunca visíveis a mais ninguém, nem a quem foi convidado (o email
-- já convida; não precisa de ver esta linha para se registar).
create policy supplier_painter_invites_select on public.supplier_painter_invites for select to authenticated
  using (private.can_access_org(org_id));
create policy supplier_painter_invites_insert on public.supplier_painter_invites for insert to authenticated
  with check (private.can_manage_org(org_id) and private.is_supplier_org(org_id) and created_by = (select auth.uid()));

-- Liga o código a uma entidade de pintura fora de uma proposta — mesma validação de
-- apply_referral_code (código ativo, sem auto-referência, sem reatribuir um código já associado a
-- outra empresa), sem a exigência de rascunho, porque aqui não há nenhuma proposta envolvida. Chamado
-- no próprio registo do pintor (createOrganization) e na página /convite-fornecedor/[code].
create function public.claim_supplier_invite(p_code text, p_org uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  c public.referral_codes;
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
  return (select nome from public.organizations where id = c.supplier_org_id);
end $$;
revoke all on function public.claim_supplier_invite(text, uuid) from public, anon;
grant execute on function public.claim_supplier_invite(text, uuid) to authenticated;

-- Pré-visualização segura do convite, antes de aceitar: só o nome do fornecedor e se já foi aceite —
-- nunca o nome/email que o fornecedor escreveu (mesmo padrão de request_invite_info).
create function public.supplier_invite_info(p_code text) returns table (fornecedor text, ja_aceite boolean)
language sql stable security definer set search_path = '' as $$
  select o.nome, (c.painter_org_id is not null)
  from public.referral_codes c
  join public.organizations o on o.id = c.supplier_org_id
  where c.code = upper(btrim(p_code)) and c.active;
$$;
revoke all on function public.supplier_invite_info(text) from public, anon;
grant execute on function public.supplier_invite_info(text) to authenticated;
