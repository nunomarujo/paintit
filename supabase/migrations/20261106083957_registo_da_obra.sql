-- O registo do percurso negocial de cada obra, e o relatório que dele se tira (06/11/2026;
-- `src/domain/percurso.ts`, `docs/DECISOES.md`).
--
-- **Auditoria (06/11/2026), o que hoje se perde:**
-- - Um pedido em rascunho apaga-se pelo cliente, e o apagamento leva em cascata (sem passar pelas regras
--   de acesso) as propostas, as versões delas, as mensagens, as fotografias, as zonas, o anúncio e o
--   relatório de propostas. Um pedido publicado que volta a rascunho («voltar a rascunho fecha o anúncio»)
--   passa a poder ser apagado, e com ele as propostas que já tinham sido submetidas.
-- - Apagar um prédio (proprietário da entidade) apaga em cascata os pedidos dele, em qualquer estado,
--   com tudo o que está acima — exceto se já houver contratação (a contratação trava, `restrict`).
-- - Apagar uma entidade apaga em cascata os pedidos e as propostas dela (não há ecrã para isso; só a
--   equipa, por SQL).
-- - O que já trava: a contratação e os seus acontecimentos, os elementos do contrato, os comprovativos e
--   a conclusão (todos `restrict`). As adendas vivem na obra; a obra com contratação não se apaga.
--
-- **O que fica protegido daqui em diante:** um registo só de acrescentar (`registo_da_obra`), escrito
-- por gatilhos com a data do servidor, que **não aponta** para as tabelas de trabalho (sem chaves
-- estrangeiras): apagar um pedido, uma proposta ou uma entidade não lhe toca. Antes de um apagamento, o
-- gatilho copia o essencial da linha para o registo. Ninguém o reescreve nem o apaga, nem a chave de
-- serviço. Só a equipa o lê; o cliente recebe o relatório que a equipa emite.
--
-- Não se afirma aqui, nem na aplicação, que o registo «prova» seja o que for: isso é com o jurista.

create table if not exists public.registo_da_obra (
  id uuid primary key default gen_random_uuid(),
  ordem bigint generated always as identity,
  -- Sem chaves estrangeiras, de propósito: o registo sobrevive ao apagamento do que regista.
  request_id uuid,
  engagement_id uuid,
  org_id uuid,
  painter_org_id uuid,
  tipo text not null check (tipo ~ '^[a-z_]{3,40}$'),
  dados jsonb not null default '{}'::jsonb,
  autor uuid,
  criado_em timestamptz not null default now()
);
create index if not exists registo_da_obra_request_idx on public.registo_da_obra (request_id, ordem);
create index if not exists registo_da_obra_engagement_idx on public.registo_da_obra (engagement_id, ordem);
create index if not exists registo_da_obra_org_idx on public.registo_da_obra (org_id, ordem);

drop trigger if exists registo_da_obra_so_acrescentar on public.registo_da_obra;
create trigger registo_da_obra_so_acrescentar before update or delete on public.registo_da_obra
  for each row execute function private.so_de_acrescentar();

create or replace function private.carimbar_registo() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.criado_em := now();
  new.autor := coalesce(new.autor, (select auth.uid()));
  return new;
end $$;
drop trigger if exists registo_da_obra_carimbo on public.registo_da_obra;
create trigger registo_da_obra_carimbo before insert on public.registo_da_obra
  for each row execute function private.carimbar_registo();

alter table public.registo_da_obra enable row level security;
revoke insert, update, delete, truncate on public.registo_da_obra from anon, authenticated;
grant select, insert, update, delete on public.registo_da_obra to service_role;
drop policy if exists registo_da_obra_select on public.registo_da_obra;
create policy registo_da_obra_select on public.registo_da_obra for select to authenticated using (private.is_platform_admin());
comment on table public.registo_da_obra is
  'Percurso negocial de cada obra: só de acrescentar, com a data do servidor, sem chaves estrangeiras (sobrevive a apagamentos). Só a equipa lê.';

-- Escrever no registo: só pelos gatilhos abaixo e pela função do servidor.
create or replace function private.registar(p_request uuid, p_engagement uuid, p_org uuid, p_painter uuid, p_tipo text, p_dados jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.registo_da_obra (request_id, engagement_id, org_id, painter_org_id, tipo, dados)
  values (p_request, p_engagement, p_org, p_painter, p_tipo, coalesce(p_dados, '{}'::jsonb));
$$;
revoke all on function private.registar(uuid, uuid, uuid, uuid, text, jsonb) from public, anon, authenticated;

-- O IBAN nunca vai por inteiro para o registo: «PT50 ··· 9015 4», como nas listas.
create or replace function private.iban_mascarado(p text) returns text
language sql immutable set search_path = '' as $$
  select case when length(p) >= 9 then left(p, 4) || ' ··· ' || substr(p, length(p) - 4, 4) || ' ' || right(p, 1) else '···' end;
$$;

-- Entidades: abertura de conta e quem entra nela.
create or replace function private.registo_entidade() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.registar(null, null, new.id, null, 'conta_aberta',
    jsonb_build_object('kind', new.kind, 'nome', new.nome, 'nif', new.nif, 'criada_em', new.created_at));
  return new;
end $$;
drop trigger if exists organizations_registo on public.organizations;
create trigger organizations_registo after insert on public.organizations for each row execute function private.registo_entidade();

create or replace function private.registo_membro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.registar(null, null, new.org_id, null, 'membro_entrou', jsonb_build_object('user_id', new.user_id, 'papel', new.role));
  return new;
end $$;
drop trigger if exists org_members_registo on public.org_members;
create trigger org_members_registo after insert on public.org_members for each row execute function private.registo_membro();

-- Pedidos: criação, mudanças de estado e versão, e o apagamento (com a linha copiada).
create or replace function private.registo_pedido() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.registar(new.id, null, new.org_id, null, 'pedido_criado',
      jsonb_build_object('ref', new.ref, 'titulo', new.titulo, 'tipos_obra', new.tipos_obra, 'descricao', new.descricao,
        'trabalhos', new.trabalhos, 'prazo_propostas', new.prazo_propostas, 'execucao_desde', new.execucao_desde,
        'execucao_ate', new.execucao_ate, 'version', new.version));
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status or new.version is distinct from old.version then
      perform private.registar(new.id, null, new.org_id, null, 'pedido_estado',
        jsonb_build_object('de', old.status, 'para', new.status, 'version', new.version, 'descricao', new.descricao,
          'tipos_obra', new.tipos_obra, 'prazo_propostas', new.prazo_propostas));
    end if;
  elsif tg_op = 'DELETE' then
    perform private.registar(old.id, null, old.org_id, null, 'pedido_apagado', to_jsonb(old));
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists work_requests_registo on public.work_requests;
create trigger work_requests_registo after insert or update or delete on public.work_requests for each row execute function private.registo_pedido();

create or replace function private.registo_anuncio() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.registar(new.request_id, null, null, null, 'pedido_publicado',
    jsonb_build_object('ref', new.ref, 'version', new.version, 'concelho', new.concelho, 'prazo_propostas', new.prazo_propostas,
      'area_total_cm2', new.area_total_cm2, 'publicado_em', new.published_at));
  return new;
end $$;
drop trigger if exists request_listings_registo on public.request_listings;
create trigger request_listings_registo after insert on public.request_listings for each row execute function private.registo_anuncio();

-- Propostas: cada mudança de estado com as condições do momento; versões; e o apagamento de uma que já
-- tinha saído de rascunho (só em cascata, por apagamento do pedido ou da entidade).
create or replace function private.registo_proposta() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r public.proposals;
begin
  r := coalesce(new, old);
  if tg_op = 'DELETE' then
    if old.status <> 'rascunho' then
      perform private.registar(old.request_id, null, null, old.painter_org_id, 'proposta_apagada', to_jsonb(old));
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    perform private.registar(r.request_id, null, null, r.painter_org_id, 'proposta_estado',
      jsonb_build_object('proposal_id', r.id, 'status', r.status, 'version', r.version, 'base_cents', r.base_cents,
        'iva_cents', r.iva_cents, 'adiantamento_bps', r.adiantamento_bps, 'fases', r.fases, 'duracao_dias', r.duracao_dias,
        'inicio_possivel', r.inicio_possivel, 'validade', r.validade, 'garantia_anos', r.garantia_anos, 'exclusoes', r.exclusoes));
  end if;
  return new;
end $$;
drop trigger if exists proposals_registo on public.proposals;
create trigger proposals_registo after insert or update or delete on public.proposals for each row execute function private.registo_proposta();

create or replace function private.registo_versao_da_proposta() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  p record;
begin
  select request_id, painter_org_id into p from public.proposals where id = new.proposal_id;
  perform private.registar(p.request_id, null, null, p.painter_org_id, 'proposta_versao',
    jsonb_build_object('proposal_id', new.proposal_id, 'version', new.version, 'submetida_em', new.submitted_at, 'snapshot', new.snapshot));
  return new;
end $$;
drop trigger if exists proposal_versions_registo on public.proposal_versions;
create trigger proposal_versions_registo after insert on public.proposal_versions for each row execute function private.registo_versao_da_proposta();

-- O relatório de propostas congelado: quais entraram em comparação.
create or replace function private.registo_comparacao() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.registar(new.request_id, null, null, null, 'comparacao',
    jsonb_build_object('relatorio_id', new.id, 'codigo_obra', new.codigo_obra, 'numero_de_propostas', new.numero_de_propostas,
      'propostas', (select coalesce(jsonb_agg(jsonb_build_object('proposal_id', p.id, 'painter_org_id', p.painter_org_id, 'status', p.status)), '[]'::jsonb)
                    from public.proposals p where p.request_id = new.request_id and p.status <> 'rascunho')));
  return new;
end $$;
drop trigger if exists relatorios_de_propostas_registo on public.relatorios_de_propostas;
create trigger relatorios_de_propostas_registo after insert on public.relatorios_de_propostas for each row execute function private.registo_comparacao();

-- Contratação e os seus acontecimentos (escolha, caução, comissão, assinaturas, litígios).
create or replace function private.registo_contratacao() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.registar(new.request_id, new.id, new.client_org_id, new.painter_org_id, 'contratacao_criada',
    jsonb_build_object('proposal_id', new.proposal_id, 'base_cents', new.base_cents, 'advance_cents', new.advance_cents,
      'rules_version', new.rules_version, 'minuta_versao', new.minuta_versao, 'garantia_anos', new.garantia_anos));
  return new;
end $$;
drop trigger if exists engagements_registo on public.engagements;
create trigger engagements_registo after insert on public.engagements for each row execute function private.registo_contratacao();

create or replace function private.registo_evento_da_contratacao() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  e record;
begin
  select request_id, client_org_id, painter_org_id into e from public.engagements where id = new.engagement_id;
  -- Do payload só o que identifica o documento e o método; os dados dos certificados ficam onde estão.
  perform private.registar(e.request_id, new.engagement_id, e.client_org_id, e.painter_org_id, 'contratacao_evento',
    jsonb_build_object('kind', new.kind, 'amount_cents', new.amount_cents, 'at', new.at,
      'documentHash', new.payload ->> 'documentHash', 'metodo', new.payload ->> 'metodo', 'reason', new.payload ->> 'reason'));
  return new;
end $$;
drop trigger if exists engagement_events_registo on public.engagement_events;
create trigger engagement_events_registo after insert on public.engagement_events for each row execute function private.registo_evento_da_contratacao();

-- Adendas (trabalhos a mais) das obras com contratação.
create or replace function private.registo_adenda() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  e record;
begin
  select g.request_id, g.id as engagement_id, g.client_org_id, g.painter_org_id into e
  from public.worksites w join public.engagements g on g.id = w.engagement_id where w.id = new.worksite_id;
  if e.engagement_id is null then return new; end if;
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    perform private.registar(e.request_id, e.engagement_id, e.client_org_id, e.painter_org_id, 'adenda',
      jsonb_build_object('adenda_id', new.id, 'descricao', new.descricao, 'valor_cents', new.valor_cents, 'estado', new.estado,
        'nota_cliente', new.nota_cliente, 'respondida_em', new.respondida_em));
  end if;
  return new;
end $$;
drop trigger if exists worksite_addenda_registo on public.worksite_addenda;
create trigger worksite_addenda_registo after insert or update on public.worksite_addenda for each row execute function private.registo_adenda();

-- Os registos de 06/11/2026: elementos, comprovativos, conclusão e garantia.
create or replace function private.registo_da_contratacao_generico() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  e record;
  d jsonb;
begin
  select request_id, client_org_id, painter_org_id into e from public.engagements where id = new.engagement_id;
  d := to_jsonb(new) - 'engagement_id';
  -- `d` e não `new`: as quatro tabelas têm colunas diferentes, e o plpgsql não deixa ler um campo que a
  -- linha não tem, mesmo num ramo que não corre.
  if tg_table_name = 'elementos_do_contrato' and d ->> 'campo' = 'iban' then
    d := jsonb_set(d, '{valor}', to_jsonb(private.iban_mascarado(d ->> 'valor')));
  end if;
  perform private.registar(e.request_id, new.engagement_id, e.client_org_id, e.painter_org_id,
    case tg_table_name
      when 'elementos_do_contrato' then 'elemento_alterado'
      when 'comprovativos_de_pagamento' then 'comprovativo'
      when 'conclusao_da_obra' then 'conclusao'
      else 'garantia'
    end, d);
  return new;
end $$;
drop trigger if exists elementos_do_contrato_registo on public.elementos_do_contrato;
create trigger elementos_do_contrato_registo after insert on public.elementos_do_contrato for each row execute function private.registo_da_contratacao_generico();
drop trigger if exists comprovativos_de_pagamento_registo on public.comprovativos_de_pagamento;
create trigger comprovativos_de_pagamento_registo after insert on public.comprovativos_de_pagamento for each row execute function private.registo_da_contratacao_generico();
drop trigger if exists conclusao_da_obra_registo on public.conclusao_da_obra;
create trigger conclusao_da_obra_registo after insert on public.conclusao_da_obra for each row execute function private.registo_da_contratacao_generico();
drop trigger if exists garantias_calculadas_registo on public.garantias_calculadas;
create trigger garantias_calculadas_registo after insert on public.garantias_calculadas for each row execute function private.registo_da_contratacao_generico();

-- A versão do contrato depois de cada alteração antes da assinatura: o servidor regista a impressão
-- digital do texto (o PDF é determinístico, e cada versão anterior reconstitui-se do histórico).
create or replace function public.registar_versao_da_minuta(p_engagement uuid, p_sha256 text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  e record;
begin
  if p_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'Resumo inválido.'; end if;
  select request_id, client_org_id, painter_org_id into e from public.engagements where id = p_engagement;
  if e.request_id is null then raise exception 'Contratação não encontrada.'; end if;
  perform private.registar(e.request_id, p_engagement, e.client_org_id, e.painter_org_id, 'versao_da_minuta', jsonb_build_object('sha256', p_sha256));
end $$;
revoke all on function public.registar_versao_da_minuta(uuid, text) from public, anon, authenticated;
grant execute on function public.registar_versao_da_minuta(uuid, text) to service_role;

-- O pedido do relatório, pelo cliente; e o relatório, emitido pela equipa.
create table if not exists public.pedidos_de_relatorio (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.work_requests (id) on delete restrict,
  org_id uuid not null references public.organizations (id) on delete restrict,
  motivo text not null check (motivo in ('litigio', 'disputa_de_consumo', 'outro')),
  nota text check (nota is null or length(nota) <= 1000),
  pedido_por uuid not null default auth.uid() references auth.users (id),
  pedido_em timestamptz not null default now()
);
create index if not exists pedidos_de_relatorio_request_idx on public.pedidos_de_relatorio (request_id);
create index if not exists pedidos_de_relatorio_org_idx on public.pedidos_de_relatorio (org_id);
create index if not exists pedidos_de_relatorio_pedido_por_idx on public.pedidos_de_relatorio (pedido_por);

create or replace function private.pedido_de_relatorio_valido() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Só pela entidade cliente do pedido; a data e quem pede são os do servidor.
  if not exists (select 1 from public.work_requests r where r.id = new.request_id and r.org_id = new.org_id) then
    raise exception 'O relatório pede-o a entidade que fez o pedido.';
  end if;
  new.pedido_em := now();
  new.pedido_por := coalesce((select auth.uid()), new.pedido_por);
  perform private.registar(new.request_id, null, new.org_id, null, 'relatorio_pedido', jsonb_build_object('motivo', new.motivo, 'nota', new.nota, 'pedido_por', new.pedido_por));
  return new;
end $$;
drop trigger if exists pedidos_de_relatorio_valido on public.pedidos_de_relatorio;
create trigger pedidos_de_relatorio_valido before insert on public.pedidos_de_relatorio for each row execute function private.pedido_de_relatorio_valido();
drop trigger if exists pedidos_de_relatorio_so_acrescentar on public.pedidos_de_relatorio;
create trigger pedidos_de_relatorio_so_acrescentar before update or delete on public.pedidos_de_relatorio for each row execute function private.so_de_acrescentar();

alter table public.pedidos_de_relatorio enable row level security;
revoke update, delete, truncate on public.pedidos_de_relatorio from anon, authenticated;
grant select, insert, update, delete on public.pedidos_de_relatorio to service_role;
drop policy if exists pedidos_de_relatorio_insert on public.pedidos_de_relatorio;
create policy pedidos_de_relatorio_insert on public.pedidos_de_relatorio for insert to authenticated
  with check (private.can_manage_org(org_id));
drop policy if exists pedidos_de_relatorio_select on public.pedidos_de_relatorio;
create policy pedidos_de_relatorio_select on public.pedidos_de_relatorio for select to authenticated
  using (private.can_access_org(org_id) or private.is_platform_admin());

create table if not exists public.relatorios_do_percurso (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.work_requests (id) on delete restrict,
  pedido_id uuid references public.pedidos_de_relatorio (id) on delete restrict,
  -- Para quem: a versão completa fica no backoffice; a do cliente vai sem o que a plataforma cobra ao
  -- pintor e sem a identidade dos pintores que não ganharam.
  destinatario text not null check (destinatario in ('backoffice', 'cliente')),
  versao integer not null check (versao >= 1),
  conteudo text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  emitido_por uuid not null references auth.users (id),
  emitido_em timestamptz not null default now(),
  constraint relatorios_do_percurso_versao unique (request_id, destinatario, versao),
  constraint relatorios_do_percurso_cliente_tem_pedido check (destinatario <> 'cliente' or pedido_id is not null)
);
create index if not exists relatorios_do_percurso_pedido_idx on public.relatorios_do_percurso (pedido_id);
create index if not exists relatorios_do_percurso_emitido_por_idx on public.relatorios_do_percurso (emitido_por);

create or replace function private.relatorio_emitido() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.emitido_em := now();
  perform private.registar(new.request_id, null, null, null, 'relatorio_emitido',
    jsonb_build_object('relatorio_id', new.id, 'destinatario', new.destinatario, 'versao', new.versao, 'sha256', new.sha256, 'pedido_id', new.pedido_id));
  if new.destinatario = 'cliente' then
    perform private.registar(new.request_id, null, null, null, 'relatorio_entregue',
      jsonb_build_object('relatorio_id', new.id, 'pedido_id', new.pedido_id, 'sha256', new.sha256));
  end if;
  return new;
end $$;
drop trigger if exists relatorios_do_percurso_emitido on public.relatorios_do_percurso;
create trigger relatorios_do_percurso_emitido before insert on public.relatorios_do_percurso for each row execute function private.relatorio_emitido();
drop trigger if exists relatorios_do_percurso_so_acrescentar on public.relatorios_do_percurso;
create trigger relatorios_do_percurso_so_acrescentar before update or delete on public.relatorios_do_percurso for each row execute function private.so_de_acrescentar();

alter table public.relatorios_do_percurso enable row level security;
revoke insert, update, delete, truncate on public.relatorios_do_percurso from anon, authenticated;
grant select, insert, update, delete on public.relatorios_do_percurso to service_role;
drop policy if exists relatorios_do_percurso_select on public.relatorios_do_percurso;
create policy relatorios_do_percurso_select on public.relatorios_do_percurso for select to authenticated
  using (
    private.is_platform_admin()
    or (destinatario = 'cliente' and exists (
      select 1 from public.pedidos_de_relatorio p where p.id = pedido_id and private.can_access_org(p.org_id)
    ))
  );

comment on table public.relatorios_do_percurso is
  'Relatório do percurso negocial: gerado uma vez, nunca atualizado; uma nova emissão é uma versão nova. Gratuito para o cliente que o peça.';
