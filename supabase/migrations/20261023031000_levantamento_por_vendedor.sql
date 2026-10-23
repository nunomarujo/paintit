-- Levantamento da obra feito por um vendedor de um fornecedor (bónus "esforço" do documento "Quem
-- Pinta — a oferta", trazido pelo promotor; decisão de 23/10/2026, docs/DECISOES.md). Em vez de o
-- cliente fotografar e medir a obra sozinho, pode pedir que um vendedor com catálogo ativo na sua zona
-- vá visitar e registar o levantamento — sem custo para o cliente. Primeiro a reservar, avança; se
-- ninguém reservar a tempo, o preenchimento pelo próprio cliente continua sempre disponível (rede de
-- segurança, nunca uma obrigação). Compensação: uma fração da comissão que a PLATAFORMA recebe (nunca
-- do valor da obra, nunca um custo extra ao cliente), paga só quando essa comissão entra, seja qual for
-- o pintor escolhido — ver src/domain/survey.ts para a razão de desenho.

-- O vendedor passa a poder aceder à sua entidade (ver o que lhe foi atribuído), mas não a gerir
-- produtos, descontos nem a equipa — isso continua só para proprietário e gestor (can_manage_org).
create or replace function private.can_access_org(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_role(p_org, array['proprietario', 'gestor', 'financeiro', 'leitor', 'vendedor']::public.member_role[])
      or private.is_platform_admin();
$$;

-- Zonas (concelhos) em que o fornecedor tem vendedores disponíveis para ir à obra. Sem linha, ou lista
-- vazia: cobre todo o país (mesma convenção de supplier_delivery, já em produção).
create table public.supplier_survey_coverage (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  concelhos text[] not null default '{}',
  updated_at timestamptz not null default now()
);
create trigger supplier_survey_coverage_touch before update on public.supplier_survey_coverage
  for each row execute function private.touch_updated_at();

create function private.supplier_covers(p_org uuid, p_concelho text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select c.concelhos = '{}' or p_concelho = any (c.concelhos) from public.supplier_survey_coverage c where c.org_id = p_org),
    true
  );
$$;

create function private.request_concelho(p_request uuid) returns text
language sql stable security definer set search_path = '' as $$
  select b.concelho from public.work_requests wr join public.buildings b on b.id = wr.building_id where wr.id = p_request;
$$;

-- Pedido de ajuda de um profissional para o levantamento de uma obra. Uma linha por pedido (um só
-- levantamento por obra, mesmo que a vaga mude de vendedor). O prazo e a repartição vivem só na
-- aplicação (src/domain/survey.ts); aqui só se guarda o estado e quem fez o quê.
create table public.request_surveys (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.work_requests (id) on delete cascade,
  status text not null default 'aberto' check (status in ('aberto', 'reservado', 'concluido', 'expirado', 'cancelado')),
  vendedor_org_id uuid references public.organizations (id),
  vendedor_user_id uuid references auth.users (id),
  reserved_at timestamptz,
  reserve_deadline timestamptz,
  contact_notes text not null default '' check (length(contact_notes) <= 2000),
  scheduled_at timestamptz,
  concluded_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  constraint request_surveys_reserved check (status <> 'reservado' or (vendedor_org_id is not null and reserved_at is not null))
);
create index request_surveys_vendedor_idx on public.request_surveys (vendedor_org_id);
create index request_surveys_open_idx on public.request_surveys (status) where status = 'aberto';

-- O vendedor que reservou, ou um gestor da sua entidade, vê e regista o levantamento desta obra em
-- particular — exatamente enquanto a reserva estiver ativa, nunca antes nem depois.
create function private.can_access_as_surveyor(p_request uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.request_surveys s
    where s.request_id = p_request
      and s.status = 'reservado'
      and private.has_role(s.vendedor_org_id, array['proprietario', 'gestor', 'vendedor']::public.member_role[])
  );
$$;

alter table public.request_surveys enable row level security;
revoke all on public.request_surveys from anon;
revoke update, delete on public.request_surveys from authenticated;
-- A mesma condição é repetida em survey_preview (pré-visualização de um pedido ainda aberto, sem morada
-- nem título) — tentei extrair isto para uma função só, partilhada pelas duas, mas uma função que
-- volta a interrogar request_surveys pelo próprio id, dentro da política de leitura desta mesma tabela,
-- tira o INSERT ... RETURNING do sítio (a linha ainda não está visível a essa nova consulta). Mais
-- simples e correto: repetir a condição, sabendo que as duas têm de mudar juntas.
create policy request_surveys_select on public.request_surveys for select to authenticated
  using (
    private.can_access_org(private.request_org(request_id))
    or (vendedor_org_id is not null and private.has_role(vendedor_org_id, array['proprietario', 'gestor', 'vendedor', 'financeiro']::public.member_role[]))
    or (
      status = 'aberto'
      and exists (
        select 1 from public.org_members m join public.organizations o on o.id = m.org_id
        where m.user_id = (select auth.uid())
          and o.kind = 'fornecedor'
          and m.role in ('proprietario', 'gestor', 'vendedor')
          and private.supplier_covers(m.org_id, private.request_concelho(request_surveys.request_id))
      )
    )
  );
create policy request_surveys_insert on public.request_surveys for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.can_manage_org(private.request_org(request_id))
    and private.request_is_draft(request_id)
    and status = 'aberto'
    and vendedor_org_id is null
  );
grant update (contact_notes, scheduled_at) on public.request_surveys to authenticated;
create policy request_surveys_log on public.request_surveys for update to authenticated
  using (status = 'reservado' and private.has_role(vendedor_org_id, array['proprietario', 'gestor', 'vendedor']::public.member_role[]))
  with check (status = 'reservado' and private.has_role(vendedor_org_id, array['proprietario', 'gestor', 'vendedor']::public.member_role[]));

alter table public.supplier_survey_coverage enable row level security;
revoke all on public.supplier_survey_coverage from anon;
create policy supplier_survey_coverage_select on public.supplier_survey_coverage for select to authenticated using (true);
create policy supplier_survey_coverage_upsert on public.supplier_survey_coverage for insert to authenticated
  with check (private.can_manage_org(org_id));
create policy supplier_survey_coverage_update on public.supplier_survey_coverage for update to authenticated
  using (private.can_manage_org(org_id)) with check (private.can_manage_org(org_id));

-- Reserva: o primeiro vendedor elegível a reservar avança; qualquer outro chega tarde (verificação
-- atómica no "where", não uma leitura seguida de escrita separada).
create function public.reserve_survey(p_survey_id uuid, p_org uuid) returns public.request_surveys
language plpgsql security definer set search_path = '' as $$
declare
  r public.request_surveys;
begin
  if not exists (select 1 from public.organizations where id = p_org and kind = 'fornecedor') then
    raise exception 'Só um fornecedor pode reservar um levantamento.' using errcode = 'P0001';
  end if;
  if not private.has_role(p_org, array['proprietario', 'gestor', 'vendedor']::public.member_role[]) then
    raise exception 'Sem permissão para reservar por esta entidade.' using errcode = 'P0001';
  end if;
  update public.request_surveys s
    set status = 'reservado', vendedor_org_id = p_org, vendedor_user_id = (select auth.uid()),
        reserved_at = now(), reserve_deadline = now() + interval '48 hours'
    where s.id = p_survey_id and s.status = 'aberto' and private.supplier_covers(p_org, private.request_concelho(s.request_id))
    returning * into r;
  if r.id is null then
    raise exception 'Este levantamento já não está disponível (reservado por outro fornecedor, ou fora da sua zona).' using errcode = 'P0001';
  end if;
  return r;
end $$;
revoke all on function public.reserve_survey(uuid, uuid) from public, anon;
grant execute on function public.reserve_survey(uuid, uuid) to authenticated;

create function public.conclude_survey(p_survey_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.request_surveys s
    set status = 'concluido', concluded_at = now()
    where s.id = p_survey_id and s.status = 'reservado'
      and private.has_role(s.vendedor_org_id, array['proprietario', 'gestor', 'vendedor']::public.member_role[]);
  if not found then
    raise exception 'Não foi possível concluir: confirme que reservou este levantamento.' using errcode = 'P0001';
  end if;
end $$;
revoke all on function public.conclude_survey(uuid) from public, anon;
grant execute on function public.conclude_survey(uuid) to authenticated;

create function public.cancel_survey(p_survey_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.request_surveys s
    set status = 'cancelado'
    where s.id = p_survey_id and s.status = 'aberto' and private.can_manage_org(private.request_org(s.request_id));
  if not found then
    raise exception 'Não foi possível cancelar.' using errcode = 'P0001';
  end if;
end $$;
revoke all on function public.cancel_survey(uuid) from public, anon;
grant execute on function public.cancel_survey(uuid) to authenticated;

-- Pré-visualização segura de um pedido aberto, antes de reservar: só o concelho e o tipo de obra, nunca
-- o título (pode conter a morada, como o resto do pedido) nem a descrição. Mesma condição de
-- request_surveys_select, repetida de propósito (ver o comentário ali) — mudar uma exige mudar a outra.
create function public.survey_preview(p_survey_id uuid) returns table (concelho text, tipo_obra public.work_type)
language sql stable security definer set search_path = '' as $$
  select b.concelho, wr.tipo_obra
  from public.request_surveys s
  join public.work_requests wr on wr.id = s.request_id
  join public.buildings b on b.id = wr.building_id
  where s.id = p_survey_id
    and (
      private.can_access_org(wr.org_id)
      or (s.vendedor_org_id is not null and private.has_role(s.vendedor_org_id, array['proprietario', 'gestor', 'vendedor', 'financeiro']::public.member_role[]))
      or (
        s.status = 'aberto'
        and exists (
          select 1 from public.org_members m join public.organizations o on o.id = m.org_id
          where m.user_id = (select auth.uid())
            and o.kind = 'fornecedor'
            and m.role in ('proprietario', 'gestor', 'vendedor')
            and private.supplier_covers(m.org_id, b.concelho)
        )
      )
    );
$$;
revoke all on function public.survey_preview(uuid) from public, anon;
grant execute on function public.survey_preview(uuid) to authenticated;

-- O vendedor que reservou passa a poder ver a morada exata e a preencher a mesma ficha que o cliente
-- preencheria sozinho — superfícies e fotografias — exatamente enquanto a reserva estiver ativa.
-- Excepção nova e deliberada à regra do anonimato (CLAUDE.md, regra 6): sem a morada não há visita.
-- As quatro políticas abaixo já tinham sido alteradas uma vez (20261019001906_contratacao.sql, para a
-- apresentação por request_revealed_to_me) — o "using" tem de repetir essa condição inteira, nunca só
-- acrescentar a nova: um "alter policy" substitui a cláusula toda, não soma a ela.
alter policy buildings_select on public.buildings using (
  private.can_access_org(org_id)
  or exists (select 1 from public.work_requests r where r.building_id = buildings.id and private.request_revealed_to_me(r.id))
  or exists (select 1 from public.work_requests wr where wr.building_id = buildings.id and private.can_access_as_surveyor(wr.id))
);
alter policy work_requests_select on public.work_requests using (
  private.can_access_org(org_id) or private.request_revealed_to_me(id) or private.can_access_as_surveyor(id)
);
alter policy request_surfaces_select on public.request_surfaces using (
  private.can_access_org(private.request_org(request_id))
  or (
    private.is_painter()
    and exists (select 1 from public.request_listings l where l.request_id = request_surfaces.request_id and l.aberto)
  )
  or private.request_revealed_to_me(request_id)
  or private.can_access_as_surveyor(request_id)
);
alter policy request_surfaces_insert on public.request_surfaces with check (
  (private.can_manage_org(private.request_org(request_id)) or private.can_access_as_surveyor(request_id))
  and private.request_is_draft(request_id)
);
alter policy request_surfaces_update on public.request_surfaces
  using ((private.can_manage_org(private.request_org(request_id)) or private.can_access_as_surveyor(request_id)) and private.request_is_draft(request_id))
  with check ((private.can_manage_org(private.request_org(request_id)) or private.can_access_as_surveyor(request_id)) and private.request_is_draft(request_id));
alter policy request_surfaces_delete on public.request_surfaces using (
  (private.can_manage_org(private.request_org(request_id)) or private.can_access_as_surveyor(request_id)) and private.request_is_draft(request_id)
);
alter policy request_photos_select on public.request_photos using (
  private.can_access_org(private.request_org(request_id))
  or private.photo_visible_to_painter(storage_path)
  or private.request_revealed_to_me(request_id)
  or private.can_access_as_surveyor(request_id)
);
alter policy request_photos_insert on public.request_photos with check (
  (private.can_manage_org(private.request_org(request_id)) or private.can_access_as_surveyor(request_id))
  and private.request_is_draft(request_id)
  and submitted_by = (select auth.uid())
);
alter policy request_photos_delete on public.request_photos using (
  (private.can_manage_org(private.request_org(request_id)) or private.can_access_as_surveyor(request_id)) and private.request_is_draft(request_id)
);

-- Avaliação do vendedor (pessoa, não a empresa): o cliente avalia depois de concluído, de 1 a 5. Sem
-- limiar mínimo de obras para mostrar a média — ao contrário do comparador de pintores, aqui o promotor
-- pediu explicitamente o inverso: mostrar sempre, dizendo que é a primeira obra quando ainda não há
-- nenhuma (ver vendorRatingSummary em src/domain/survey.ts).
create table public.survey_reviews (
  id uuid primary key default gen_random_uuid(),
  request_survey_id uuid not null unique references public.request_surveys (id) on delete cascade,
  vendedor_user_id uuid not null references auth.users (id),
  nota smallint not null check (nota between 1 and 5),
  comentario text not null default '' check (length(comentario) <= 2000),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index survey_reviews_vendedor_idx on public.survey_reviews (vendedor_user_id);

create function private.survey_review_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  s public.request_surveys;
begin
  select * into s from public.request_surveys where id = new.request_survey_id;
  if not found or s.status <> 'concluido' or not private.can_manage_org(private.request_org(s.request_id)) then
    raise exception 'Só se avalia um levantamento já concluído, pelo cliente.' using errcode = 'P0001';
  end if;
  new.vendedor_user_id := s.vendedor_user_id;
  return new;
end $$;
create trigger survey_reviews_guard before insert on public.survey_reviews
  for each row execute function private.survey_review_guard();

alter table public.survey_reviews enable row level security;
revoke all on public.survey_reviews from anon;
revoke update, delete on public.survey_reviews from authenticated;
create policy survey_reviews_select on public.survey_reviews for select to authenticated using (true);
create policy survey_reviews_insert on public.survey_reviews for insert to authenticated
  with check (created_by = (select auth.uid()));

-- Média pública de um vendedor (pessoa), para mostrar ao cliente antes mesmo de pedir ajuda — como
-- painter_rating, sem identificar quem avaliou.
create function public.survey_vendor_rating(p_user uuid) returns table (n int, media numeric)
language sql stable security definer set search_path = '' as $$
  select count(*)::int, round(avg(nota), 1) from public.survey_reviews where vendedor_user_id = p_user;
$$;
revoke all on function public.survey_vendor_rating(uuid) from public, anon;
grant execute on function public.survey_vendor_rating(uuid) to authenticated;

-- Repartição da comissão com o fornecedor do vendedor: criada pela aplicação (src/lib/surveys.ts) no
-- preciso momento em que a plataforma confirma a comissão do pintor (fee_recebido), já com o valor
-- calculado a partir da comissão real desta obra (src/domain/survey.ts, percentagem ainda provisória) —
-- não há aqui gatilho de SQL a recalcular a comissão, para não duplicar as regras de commission.ts.
create table public.survey_payouts (
  id uuid primary key default gen_random_uuid(),
  request_survey_id uuid not null unique references public.request_surveys (id),
  supplier_org_id uuid not null references public.organizations (id),
  engagement_id uuid not null unique references public.engagements (id),
  amount_cents integer not null check (amount_cents >= 0),
  estado text not null default 'adjudicada' check (estado in ('adjudicada', 'paga', 'sem_efeito')),
  fee_recebido_em timestamptz not null,
  redemption_id uuid,
  motivo text check (motivo is null or length(motivo) <= 300),
  created_at timestamptz not null default now()
);
create index survey_payouts_supplier_idx on public.survey_payouts (supplier_org_id);
create index survey_payouts_redemption_idx on public.survey_payouts (redemption_id);

alter table public.survey_payouts enable row level security;
revoke all on public.survey_payouts from anon;
revoke insert, update, delete on public.survey_payouts from authenticated;
create policy survey_payouts_select on public.survey_payouts for select to authenticated
  using (private.can_access_org(supplier_org_id) or private.is_platform_admin());

create table public.survey_redemptions (
  id uuid primary key default gen_random_uuid(),
  supplier_org_id uuid not null references public.organizations (id),
  estado text not null default 'pedido' check (estado in ('pedido', 'fatura_recebida', 'paga', 'anulado')),
  comissao_cents integer not null check (comissao_cents > 0),
  iva_cents integer not null check (iva_cents >= 0),
  retencao_cents integer not null check (retencao_cents >= 0),
  liquido_cents integer not null check (liquido_cents >= 0),
  cobra_iva boolean not null,
  isencao_iva text,
  retencao_bps integer not null,
  iban text not null,
  titular text not null,
  invoice_numero text check (invoice_numero is null or length(invoice_numero) <= 40),
  invoice_path text,
  invoice_em timestamptz,
  paga_em timestamptz,
  referencia_pagamento text check (referencia_pagamento is null or length(referencia_pagamento) <= 80),
  motivo text check (motivo is null or length(motivo) <= 300),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (comissao_cents + iva_cents = retencao_cents + liquido_cents)
);
create index survey_redemptions_supplier_idx on public.survey_redemptions (supplier_org_id);
alter table public.survey_payouts add constraint survey_payouts_redemption_fkey foreign key (redemption_id) references public.survey_redemptions (id);

alter table public.survey_redemptions enable row level security;
revoke all on public.survey_redemptions from anon;
revoke insert, update, delete on public.survey_redemptions from authenticated;
create policy survey_redemptions_select on public.survey_redemptions for select to authenticated
  using (private.can_access_org(supplier_org_id) or private.is_platform_admin());

-- Mesma fórmula de resgate que já existe para as comissões de adesão (referral_request_redemption):
-- reutiliza supplier_payout_details (IBAN, regime de IVA e retenção, já validados pela equipa).
create function public.survey_request_redemption(p_org uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  d public.supplier_payout_details;
  total integer;
  iva integer;
  ret integer;
  rid uuid;
begin
  if not private.can_manage_org(p_org) then
    raise exception 'Fornecedor não encontrado.' using errcode = 'P0001';
  end if;
  select * into d from public.supplier_payout_details where org_id = p_org;
  if not found or d.declaracao_retencao is null then
    raise exception 'Indique o IBAN e declare o regime de IVA e de retenção.' using errcode = 'P0001';
  end if;
  if not d.regime_validado then
    raise exception 'O regime declarado ainda não foi validado pela plataforma.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.survey_redemptions r where r.supplier_org_id = p_org and r.estado in ('pedido', 'fatura_recebida')) then
    raise exception 'Já tem um resgate em curso.' using errcode = 'P0001';
  end if;
  select coalesce(sum(amount_cents), 0) into total from public.survey_payouts where supplier_org_id = p_org and estado = 'adjudicada' and redemption_id is null;
  if total <= 0 then
    raise exception 'Não há saldo disponível para resgatar.' using errcode = 'P0001';
  end if;
  iva := case when d.cobra_iva then (total * 2300 + 5000) / 10000 else 0 end;
  ret := (total * d.retencao_bps + 5000) / 10000;
  insert into public.survey_redemptions (supplier_org_id, comissao_cents, iva_cents, retencao_cents, liquido_cents, cobra_iva, isencao_iva, retencao_bps, iban, titular)
    values (p_org, total, iva, ret, total + iva - ret, d.cobra_iva, d.isencao_iva, d.retencao_bps, d.iban, d.titular)
    returning id into rid;
  update public.survey_payouts set redemption_id = rid where supplier_org_id = p_org and estado = 'adjudicada' and redemption_id is null;
  return rid;
end $$;
revoke all on function public.survey_request_redemption(uuid) from public, anon;
grant execute on function public.survey_request_redemption(uuid) to authenticated;

create function public.survey_redemption_invoice(p_redemption uuid, p_numero text, p_path text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.survey_redemptions;
begin
  select * into r from public.survey_redemptions where id = p_redemption;
  if not found or not private.can_manage_org(r.supplier_org_id) then
    raise exception 'Resgate não encontrado.' using errcode = 'P0001';
  end if;
  if r.estado <> 'pedido' then
    raise exception 'Este resgate já tem fatura ou foi encerrado.' using errcode = 'P0001';
  end if;
  if p_numero is null or btrim(p_numero) = '' or length(p_numero) > 40 or split_part(coalesce(p_path, ''), '/', 1) <> r.supplier_org_id::text then
    raise exception 'Fatura inválida.' using errcode = 'P0001';
  end if;
  update public.survey_redemptions set estado = 'fatura_recebida', invoice_numero = btrim(p_numero), invoice_path = p_path, invoice_em = now() where id = p_redemption;
end $$;
revoke all on function public.survey_redemption_invoice(uuid, text, text) from public, anon;
grant execute on function public.survey_redemption_invoice(uuid, text, text) to authenticated;

create function public.survey_redemption_cancel(p_redemption uuid, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.survey_redemptions;
begin
  select * into r from public.survey_redemptions where id = p_redemption;
  if not found then
    raise exception 'Resgate não encontrado.' using errcode = 'P0001';
  end if;
  if not ((r.estado = 'pedido' and private.can_manage_org(r.supplier_org_id)) or (r.estado in ('pedido', 'fatura_recebida') and private.is_platform_admin())) then
    raise exception 'Não se pode anular este resgate.' using errcode = 'P0001';
  end if;
  update public.survey_redemptions set estado = 'anulado', motivo = left(btrim(coalesce(p_motivo, '')), 300) where id = p_redemption;
  update public.survey_payouts set redemption_id = null where redemption_id = p_redemption;
end $$;
revoke all on function public.survey_redemption_cancel(uuid, text) from public, anon;
grant execute on function public.survey_redemption_cancel(uuid, text) to authenticated;

create function public.survey_redemption_pay(p_redemption uuid, p_ref text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_platform_admin() then
    raise exception 'Só a equipa da plataforma.' using errcode = 'P0001';
  end if;
  update public.survey_redemptions set estado = 'paga', paga_em = now(), referencia_pagamento = left(btrim(coalesce(p_ref, '')), 80) where id = p_redemption and estado = 'fatura_recebida';
  if not found then
    raise exception 'Só se paga um resgate com fatura recebida.' using errcode = 'P0001';
  end if;
  update public.survey_payouts set estado = 'paga' where redemption_id = p_redemption;
end $$;
revoke all on function public.survey_redemption_pay(uuid, text) from public, anon;
grant execute on function public.survey_redemption_pay(uuid, text) to authenticated;

-- Termos de confidencialidade do vendedor (mesmo padrão de painter_terms_acceptances, src/domain/painterTerms.ts):
-- ver a morada exata de uma obra reservada pede aceitação prévia, verificada na aplicação (não aqui em SQL,
-- pelo mesmo motivo por que os termos do pintor também não são verificados em RLS).
create table public.survey_terms_acceptances (
  user_id uuid not null references auth.users (id) on delete cascade,
  version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, version)
);
alter table public.survey_terms_acceptances enable row level security;
revoke all on public.survey_terms_acceptances from anon;
revoke update, delete on public.survey_terms_acceptances from authenticated;
create policy survey_terms_select on public.survey_terms_acceptances for select to authenticated using (user_id = (select auth.uid()));
create policy survey_terms_insert on public.survey_terms_acceptances for insert to authenticated with check (user_id = (select auth.uid()));

revoke all on function private.supplier_covers(uuid, text), private.request_concelho(uuid), private.can_access_as_surveyor(uuid) from public, anon;
grant execute on function private.supplier_covers(uuid, text), private.request_concelho(uuid), private.can_access_as_surveyor(uuid) to authenticated;

-- Armazenamento das fotografias (bucket "fotos"): o vendedor que reservou também carrega fotografias,
-- pelo mesmo caminho e política que o cliente já usa (<request_id>/<ficheiro>).
alter policy fotos_select on storage.objects
  using (
    bucket_id = 'fotos'
    and (
      private.can_access_org(private.request_org(private.org_from_path(name)))
      or private.photo_visible_to_painter(name)
      or private.request_revealed_to_me(private.org_from_path(name))
      or private.can_access_as_surveyor(private.org_from_path(name))
    )
  );
alter policy fotos_insert on storage.objects
  with check (
    bucket_id = 'fotos'
    and (private.can_manage_org(private.request_org(private.org_from_path(name))) or private.can_access_as_surveyor(private.org_from_path(name)))
    and private.request_is_draft(private.org_from_path(name))
  );
