-- Movimentos da Stripe que a equipa reviu e deixou fora do livro (por exemplo, resíduos de testes). Fica a nota e quem decidiu. Uma instrução por linha.
create table public.stripe_bt_review (bt_id text primary key references public.stripe_bt (id) on delete cascade, nota text not null check (length(nota) between 3 and 300), por uuid default auth.uid() references auth.users (id) on delete set null, em timestamptz not null default now());
create index stripe_bt_review_por_idx on public.stripe_bt_review (por);
alter table public.stripe_bt_review enable row level security;
revoke all on public.stripe_bt_review from anon;
revoke update, truncate on public.stripe_bt_review from authenticated;
create policy stripe_bt_review_select on public.stripe_bt_review for select to authenticated using ((select private.is_platform_admin()));
create policy stripe_bt_review_insert on public.stripe_bt_review for insert to authenticated with check ((select private.is_platform_admin()));
create policy stripe_bt_review_delete on public.stripe_bt_review for delete to authenticated using ((select private.is_platform_admin()));
