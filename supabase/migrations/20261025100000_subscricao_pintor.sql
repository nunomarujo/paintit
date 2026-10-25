-- Subscrição das empresas de pintura (25/10/2026, decisão do promotor — docs/DECISOES.md).
--
-- Dois planos: gratuito (o que todas têm hoje, e que não precisa de linha nenhuma aqui) e Pro, que
-- desce 5 pontos percentuais na comissão e abre os separadores de obras públicas e ferramentas de
-- obra. Só existe linha para quem subscreveu: a ausência de linha é o plano gratuito.
--
-- O preço fica gravado em cada subscrição, como as regras comerciais: quem subscreve ao preço de
-- lançamento mantém-no enquanto não cancelar, mesmo depois de o preço de tabela entrar em vigor.

create table if not exists public.org_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  plano text not null check (plano in ('gratuito', 'pro')),
  periodicidade text not null check (periodicidade in ('mensal', 'anual')),
  estado text not null default 'por_pagar' check (estado in ('ativa', 'por_pagar', 'cancelada')),
  -- Versão da tabela de preços aplicada (src/domain/subscription.ts), para reconstruir o que foi cobrado.
  preco_versao text not null,
  preco_cents integer not null check (preco_cents >= 0),
  inicio date not null default (now() at time zone 'Europe/Lisbon')::date,
  -- Fim do período já pago: o desconto vale até aqui mesmo depois de cancelada.
  valida_ate date,
  cancelada_em timestamptz,
  created_at timestamptz not null default now()
);

-- Uma empresa não tem duas subscrições a correr ao mesmo tempo.
create unique index if not exists org_subscriptions_uma_ativa
  on public.org_subscriptions (org_id)
  where estado in ('ativa', 'por_pagar');

create index if not exists org_subscriptions_org_idx on public.org_subscriptions (org_id);

alter table public.org_subscriptions enable row level security;

-- Ver: só os membros da própria empresa. A subscrição de uma empresa não é informação de mais ninguém
-- — nem do cliente, nem de outras empresas de pintura (CLAUDE.md, regra 11: ver não é pertencer).
drop policy if exists org_subscriptions_select on public.org_subscriptions;
create policy org_subscriptions_select on public.org_subscriptions
  for select to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = org_subscriptions.org_id and m.user_id = auth.uid()));

-- Criar: um membro da empresa subscreve para a sua própria empresa, e nunca já no estado 'ativa' —
-- a activação é do lado do pagamento, não do navegador (CLAUDE.md, regra 10).
drop policy if exists org_subscriptions_insert on public.org_subscriptions;
create policy org_subscriptions_insert on public.org_subscriptions
  for insert to authenticated
  with check (
    estado = 'por_pagar'
    and exists (select 1 from public.org_members m where m.org_id = org_subscriptions.org_id and m.user_id = auth.uid())
  );

-- Alterar: o membro só pode cancelar a sua própria subscrição. Nem o estado 'ativa' nem o preço nem
-- as datas se mudam daqui — isso é do parceiro de pagamentos.
drop policy if exists org_subscriptions_update on public.org_subscriptions;
create policy org_subscriptions_update on public.org_subscriptions
  for update to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = org_subscriptions.org_id and m.user_id = auth.uid()))
  with check (
    estado = 'cancelada'
    and exists (select 1 from public.org_members m where m.org_id = org_subscriptions.org_id and m.user_id = auth.uid())
  );

comment on table public.org_subscriptions is
  'Subscrição Pro de uma empresa de pintura. Sem linha = plano gratuito. O desconto de comissão vive em src/domain/subscription.ts.';
