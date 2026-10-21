-- Pedido de revisão do segundo aviso por contactos (decisão de 21/10/2026): uma vez, só no 2.º aviso.
-- Aceite: o 2.º aviso é anulado (a conta volta a 1 aviso). Recusado: mantém-se o último aviso. Cada instrução numa linha.
create table public.strike_appeals (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users (id) on delete cascade, violation_id uuid not null unique references public.contact_violations (id) on delete cascade, texto text not null check (length(texto) between 20 and 1000), estado text not null default 'pendente' check (estado in ('pendente', 'aceite', 'recusada')), decisao text check (decisao is null or length(decisao) <= 1000), decided_by uuid references auth.users (id), decided_at timestamptz, created_at timestamptz not null default now());
create index strike_appeals_user_idx on public.strike_appeals (user_id);
alter table public.strike_appeals enable row level security;
revoke all on public.strike_appeals from anon;
revoke insert, update, delete on public.strike_appeals from authenticated;
create policy strike_appeals_select on public.strike_appeals for select to authenticated using (user_id = (select auth.uid()) or (select private.is_platform_admin()));
