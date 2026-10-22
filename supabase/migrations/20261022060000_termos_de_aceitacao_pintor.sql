-- Decisão de 22/10/2026 (docs/DECISOES.md): antes de ver a ficha completa de uma obra (fotografias, superfícies
-- e descrição), uma entidade de pintura aceita termos que incluem não revelar a comissão da plataforma ao
-- cliente. Uma aceitação por entidade, com a versão do texto — uma alteração ao texto (CURRENT_PAINTER_TERMS_VERSION,
-- src/domain/painterTerms.ts) pede aceitação de novo. Não é o contrato cliente-pintor (esse nunca fala da comissão):
-- é um registo de aceitação de termos de utilização, por isso não precisa de PDF nem de Chave Móvel Digital.

create table public.painter_terms_acceptances (
  painter_org_id uuid not null references public.organizations (id),
  version text not null check (length(version) between 1 and 20),
  accepted_at timestamptz not null default now(),
  accepted_by uuid not null default auth.uid() references auth.users (id),
  primary key (painter_org_id, version)
);
alter table public.painter_terms_acceptances enable row level security;
revoke all on public.painter_terms_acceptances from anon;
revoke update, delete on public.painter_terms_acceptances from authenticated;
create policy painter_terms_acceptances_select on public.painter_terms_acceptances for select to authenticated
  using (private.can_access_org(painter_org_id) or (select private.is_platform_admin()));
create policy painter_terms_acceptances_insert on public.painter_terms_acceptances for insert to authenticated
  with check (
    private.can_manage_org(painter_org_id)
    and exists (select 1 from public.organizations o where o.id = painter_org_id and o.kind = 'pintor')
  );
