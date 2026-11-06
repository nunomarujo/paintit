-- Ofertas de lançamento concedidas (promotor, 06/11/2026): o registo de quem aderiu pelo QR de um flyer ou pelo link de um
-- email do CRM, e do que lhe foi concedido. Serve de prova (uma oferta por entidade) e de ligação entre a adesão e o
-- contacto do CRM que a trouxe. Só a plataforma escreve (chave de serviço); só a equipa lê.
--
-- A concessão em si, para pintores, é uma linha em `org_subscriptions` com `preco_versao = 'lancamento-2027-01-31'`,
-- estado «cancelada» (não renova e não ocupa o lugar de uma subscrição paga) e `valida_ate` na data da campanha.

create table public.ofertas_de_lancamento (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  origem_flyer text check (origem_flyer is null or origem_flyer ~ '^fl-[a-z]{2,4}-[0-9]$'),
  origem_contacto uuid references public.crm_contactos (id) on delete set null,
  concedida text check (concedida is null or concedida in ('pro')),
  valida_ate date,
  criado_em timestamptz not null default now()
);
create index ofertas_de_lancamento_contacto_idx on public.ofertas_de_lancamento (origem_contacto);

alter table public.ofertas_de_lancamento enable row level security;
create policy ofertas_de_lancamento_equipa on public.ofertas_de_lancamento for select to authenticated
  using ((select private.is_platform_admin()));
revoke all on public.ofertas_de_lancamento from anon, public, authenticated;
grant select on public.ofertas_de_lancamento to authenticated;
