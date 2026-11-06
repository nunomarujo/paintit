-- Elementos do contrato (IBAN, telefone, email para correspondência) e comprovativos de pagamento
-- (06/11/2026; `src/domain/elementosDoContrato.ts`, `docs/DECISOES.md`).
--
-- Princípio do promotor: a plataforma recolhe e regista; não intervém no que as partes combinam.
--
-- 1. `elementos_do_contrato` — **histórico só de acrescentar.** Cada linha é um valor de um campo de uma
--    parte, desde aquele instante; o valor em vigor é a linha mais recente. Nada se reescreve nem se
--    apaga (gatilho que recusa `update` e `delete` a toda a gente, a chave de serviço incluída). Só se
--    acrescenta **depois da apresentação** (`fee_recebido`: as partes já se conhecem — regra 6) e
--    **antes da primeira assinatura** registada: depois dela, qualquer alteração é por adenda ao
--    contrato, entre as partes, fora da plataforma. Só nas contratações com a minuta de 06/11/2026.
--    Escreve só o servidor (chave de serviço), depois de confirmar que quem pede gere aquela parte,
--    de validar o IBAN (algarismo de controlo) e de confirmar o email por código.
-- 2. `codigos_de_email` — o código de 6 algarismos que confirma um email novo. Guarda-se só o resumo
--    SHA-256 do código, com validade e contagem de tentativas. Ninguém o lê pela API: só o servidor.
-- 3. `comprovativos_de_pagamento` — por tranche, o que o cliente diz ter pago (valor, data, nota
--    livre e o ficheiro). Só de acrescentar, como o histórico. Não marca a tranche como recebida: isso
--    continua a ser o pintor a confirmar. O ficheiro vai para um cofre privado próprio, pelo servidor,
--    que lhe tira os metadados e guarda o resumo SHA-256 do que guardou.

-- Pode alterar os elementos agora? Apresentada (`fee_recebido`), com a minuta nova, e ainda sem
-- assinatura nenhuma registada.
create or replace function private.elementos_alteraveis(p_engagement uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.engagements e where e.id = p_engagement and e.minuta_versao is not null)
     and exists (select 1 from public.engagement_events v where v.engagement_id = p_engagement and v.kind = 'fee_recebido')
     and not exists (
       select 1 from public.engagement_events v
       where v.engagement_id = p_engagement and v.kind in ('cliente_assinou', 'pintor_assinou')
     );
$$;
revoke all on function private.elementos_alteraveis(uuid) from public, anon;
grant execute on function private.elementos_alteraveis(uuid) to authenticated, service_role;

-- O utilizador é de uma das duas partes (qualquer papel com acesso), ou da equipa.
create or replace function private.parte_da_contratacao(p_engagement uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.can_access_org(private.engagement_client(p_engagement))
      or private.can_access_org(private.engagement_painter(p_engagement));
$$;
revoke all on function private.parte_da_contratacao(uuid) from public, anon;
grant execute on function private.parte_da_contratacao(uuid) to authenticated;

-- Só de acrescentar: um gatilho que recusa reescrever ou apagar, a quem quer que seja.
create or replace function private.so_de_acrescentar() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Registo só de acrescentar: % não se altera nem se apaga.', tg_table_name;
end $$;

create table if not exists public.elementos_do_contrato (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete restrict,
  lado text not null check (lado in ('cliente', 'pintor')),
  campo text not null check (campo in ('iban', 'telefone', 'email')),
  valor text not null check (length(valor) between 1 and 254),
  -- Como foi confirmado: o email por código ou por já ser o do início de sessão; o resto, sem validação.
  validacao text not null check (validacao in ('sem_validacao', 'codigo', 'inicio_de_sessao')),
  criado_por uuid not null references auth.users (id),
  criado_em timestamptz not null default now(),
  constraint elementos_iban check (campo <> 'iban' or valor ~ '^PT50[0-9]{21}$'),
  constraint elementos_telefone check (campo <> 'telefone' or valor ~ '^\+?[0-9]{9,15}$'),
  constraint elementos_email check (campo <> 'email' or (valor ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and validacao in ('codigo', 'inicio_de_sessao'))),
  constraint elementos_validacao check (campo = 'email' or validacao = 'sem_validacao')
);
create index if not exists elementos_do_contrato_engagement_idx on public.elementos_do_contrato (engagement_id, lado, campo, criado_em desc);
create index if not exists elementos_do_contrato_criado_por_idx on public.elementos_do_contrato (criado_por);

create or replace function private.elementos_so_no_prazo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.elementos_alteraveis(new.engagement_id) then
    raise exception 'Os elementos do contrato só se alteram depois da apresentação e antes da primeira assinatura. Depois, por adenda entre as partes.';
  end if;
  new.criado_em := now();
  return new;
end $$;

drop trigger if exists elementos_do_contrato_prazo on public.elementos_do_contrato;
create trigger elementos_do_contrato_prazo before insert on public.elementos_do_contrato
  for each row execute function private.elementos_so_no_prazo();
drop trigger if exists elementos_do_contrato_so_acrescentar on public.elementos_do_contrato;
create trigger elementos_do_contrato_so_acrescentar before update or delete on public.elementos_do_contrato
  for each row execute function private.so_de_acrescentar();

alter table public.elementos_do_contrato enable row level security;
revoke insert, update, delete, truncate on public.elementos_do_contrato from anon, authenticated;
drop policy if exists elementos_do_contrato_select on public.elementos_do_contrato;
create policy elementos_do_contrato_select on public.elementos_do_contrato for select to authenticated
  using (private.parte_da_contratacao(engagement_id) or private.is_platform_admin());

comment on table public.elementos_do_contrato is
  'Histórico só de acrescentar dos elementos de cada parte (IBAN, telefone, email para correspondência). O em vigor é o mais recente.';

create table if not exists public.codigos_de_email (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete restrict,
  lado text not null check (lado in ('cliente', 'pintor')),
  email text not null,
  codigo_sha256 text not null check (codigo_sha256 ~ '^[0-9a-f]{64}$'),
  criado_por uuid not null references auth.users (id),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  tentativas smallint not null default 0 check (tentativas between 0 and 10),
  usado_em timestamptz
);
create index if not exists codigos_de_email_engagement_idx on public.codigos_de_email (engagement_id, lado, criado_em desc);
create index if not exists codigos_de_email_criado_por_idx on public.codigos_de_email (criado_por);
alter table public.codigos_de_email enable row level security;
revoke all on public.codigos_de_email from anon, authenticated;
comment on table public.codigos_de_email is 'Códigos de confirmação do email para correspondência. Só o resumo SHA-256; só a chave de serviço lê e escreve.';

create table if not exists public.comprovativos_de_pagamento (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete restrict,
  -- A tranche a que se refere, como o contrato a descreve («Adiantamento», «Fase 2»…), ou «Outro».
  tranche text not null check (length(tranche) between 1 and 120),
  valor_cents bigint not null check (valor_cents > 0 and valor_cents <= 100000000000),
  pago_em date not null,
  nota text check (nota is null or length(nota) <= 1000),
  ficheiro_path text check (ficheiro_path is null or ficheiro_path like engagement_id::text || '/%'),
  ficheiro_sha256 text check (ficheiro_sha256 is null or ficheiro_sha256 ~ '^[0-9a-f]{64}$'),
  ficheiro_tipo text check (ficheiro_tipo is null or ficheiro_tipo in ('image/jpeg', 'image/png', 'application/pdf')),
  criado_por uuid not null references auth.users (id),
  criado_em timestamptz not null default now(),
  constraint comprovativos_ficheiro check ((ficheiro_path is null) = (ficheiro_sha256 is null))
);
create index if not exists comprovativos_de_pagamento_engagement_idx on public.comprovativos_de_pagamento (engagement_id, criado_em);
create index if not exists comprovativos_de_pagamento_criado_por_idx on public.comprovativos_de_pagamento (criado_por);

-- Só depois do contrato celebrado (as duas assinaturas), e com a data do servidor.
create or replace function private.comprovativo_no_prazo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.engagement_events v where v.engagement_id = new.engagement_id and v.kind = 'pintor_assinou') then
    raise exception 'Os comprovativos de pagamento registam-se depois de o contrato estar assinado pelas duas partes.';
  end if;
  new.criado_em := now();
  return new;
end $$;

drop trigger if exists comprovativos_de_pagamento_prazo on public.comprovativos_de_pagamento;
create trigger comprovativos_de_pagamento_prazo before insert on public.comprovativos_de_pagamento
  for each row execute function private.comprovativo_no_prazo();
drop trigger if exists comprovativos_de_pagamento_so_acrescentar on public.comprovativos_de_pagamento;
create trigger comprovativos_de_pagamento_so_acrescentar before update or delete on public.comprovativos_de_pagamento
  for each row execute function private.so_de_acrescentar();

alter table public.comprovativos_de_pagamento enable row level security;
revoke insert, update, delete, truncate on public.comprovativos_de_pagamento from anon, authenticated;
drop policy if exists comprovativos_de_pagamento_select on public.comprovativos_de_pagamento;
create policy comprovativos_de_pagamento_select on public.comprovativos_de_pagamento for select to authenticated
  using (private.parte_da_contratacao(engagement_id) or private.is_platform_admin());

comment on table public.comprovativos_de_pagamento is
  'O que o cliente diz ter pago, por tranche: só registo, só de acrescentar. Não marca a tranche como recebida.';

-- O cofre dos comprovativos: privado; caminho "<engagement_id>/<sha256>.<ext>". Lê quem é parte da
-- contratação e a equipa; escreve só o servidor. Ninguém apaga pela API.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovativos-de-pagamento', 'comprovativos-de-pagamento', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists comprovativos_de_pagamento_ler on storage.objects;
create policy comprovativos_de_pagamento_ler on storage.objects for select to authenticated
  using (
    bucket_id = 'comprovativos-de-pagamento'
    and (private.parte_da_contratacao(private.org_from_path(name)) or private.is_platform_admin())
  );

-- A chave de serviço (o servidor) escreve nas três; no Supabase já tem estes privilégios por omissão,
-- e declaram-se aqui para a base construída de raiz pelo repositório dizer o mesmo. O `update` e o
-- `delete` dos registos continuam recusados pelo gatilho `so_de_acrescentar`, também a ela.
grant select, insert, update, delete on public.elementos_do_contrato to service_role;
grant select, insert, update, delete on public.codigos_de_email to service_role;
grant select, insert, update, delete on public.comprovativos_de_pagamento to service_role;
