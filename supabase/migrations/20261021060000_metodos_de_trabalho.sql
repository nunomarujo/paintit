-- Métodos de trabalho do pintor (decisão de 21/10/2026): trabalhos, preços e condições habituais, guardados por entidade
-- para começar um orçamento novo a partir deles. Só a equipa da entidade os vê. Cada instrução numa linha.
create table public.work_templates (id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations (id) on delete cascade, nome text not null check (length(nome) between 1 and 60), dados jsonb not null default '{}'::jsonb, created_by uuid default auth.uid() references auth.users (id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (org_id, nome));
create index work_templates_org_idx on public.work_templates (org_id);
create index work_templates_created_by_idx on public.work_templates (created_by);
alter table public.work_templates enable row level security;
revoke all on public.work_templates from anon;
create policy work_templates_select on public.work_templates for select to authenticated using (private.can_access_org(org_id));
create policy work_templates_insert on public.work_templates for insert to authenticated with check (private.can_manage_org(org_id));
create policy work_templates_update on public.work_templates for update to authenticated using (private.can_manage_org(org_id)) with check (private.can_manage_org(org_id));
create policy work_templates_delete on public.work_templates for delete to authenticated using (private.can_manage_org(org_id));
