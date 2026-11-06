-- A assinatura só entra pelo servidor (05/11/2026).
--
-- A falha: a política `engagement_events_insert` deixava quem gere uma das entidades registar
-- `cliente_assinou` ou `pintor_assinou` diretamente pela API, com a sessão do próprio, sem PDF nenhum — e com
-- o `payload` que quisesse (`metodo: 'cmd_pdf'`, `cadeiaConfiavel: true`, um resultado de poderes «confere»).
-- Todas as verificações do PDF (o documento é o esperado, a assinatura é válida, o certificado é do Estado,
-- quem assinou tem poderes) viviam só no servidor, e a base aceitava o acontecimento sem elas. Encontrada na
-- revisão da verificação de poderes; nunca usada (não há em produção acontecimentos de assinatura fora do
-- percurso do servidor, consulta de 05/11/2026).
--
-- A correção mantém a base como segunda verificação de QUEM regista (a política de sempre: o papel na
-- entidade do lado certo e `actor = auth.uid()`), e acrescenta-lhe a prova de QUE o servidor verificou:
--   1. o servidor, depois de verificar o PDF, regista com a chave de serviço o `payload` exato que vai gravar
--      (`registar_assinatura_verificada`, que só a chave de serviço executa);
--   2. o acontecimento só entra se o seu `payload` for igual a esse, para a mesma contratação, o mesmo lado e
--      o mesmo utilizador.
-- Quem tentar pela API sem passar pelo servidor não tem registo verificado; quem tentar com o registo de
-- outra pessoa, ou com outro `payload`, não acerta na igualdade.
--
-- E o PDF: o carregamento para `contratos` passa também a ser feito pelo servidor. Com a política antiga, a
-- parte podia pôr lá um ficheiro qualquer pela API, sem verificação, e o pintor ia buscá-lo como «o contrato
-- assinado pelo cliente». A política de inserção fica, fechada (`with check (false)`), para a migração não
-- precisar de `drop`.
--
-- A equipa da plataforma continua a poder registar qualquer acontecimento (é a mesma regra de antes, e a
-- tabela `platform_admins` só se altera por SQL).

create table public.assinaturas_verificadas (
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  kind public.engagement_event_kind not null check (kind in ('cliente_assinou', 'pintor_assinou')),
  -- Quem carregou o PDF. Só esta pessoa pode registar o acontecimento.
  actor uuid not null references auth.users (id) on delete cascade,
  -- O `payload` exato do acontecimento: resumo do PDF, signatário, cadeia, poderes.
  payload jsonb not null,
  verificada_em timestamptz not null default now(),
  primary key (engagement_id, kind)
);
alter table public.assinaturas_verificadas enable row level security;
-- Ninguém com sessão lê ou escreve aqui: só a função abaixo (chave de serviço) e a verificação da política.
revoke all on public.assinaturas_verificadas from public, anon, authenticated;

comment on table public.assinaturas_verificadas is
  'O payload de cada assinatura que o servidor verificou (PDF esperado, assinatura válida). O acontecimento cliente_assinou/pintor_assinou só entra com um payload igual. Migração 20261105233000.';

-- A porta do servidor. Um novo PDF verificado do mesmo lado substitui o anterior enquanto o acontecimento não
-- existir (um carregamento cujo registo falhou não fica preso); depois de existir, o percurso do servidor
-- já não chega aqui (o passo deixa de estar disponível) e, se chegasse, o acontecimento antigo não muda.
create function public.registar_assinatura_verificada(
  p_engagement uuid,
  p_kind public.engagement_event_kind,
  p_actor uuid,
  p_payload jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_kind not in ('cliente_assinou', 'pintor_assinou') then
    raise exception 'Só assinaturas.' using errcode = 'P0001';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Falta o registo da verificação.' using errcode = 'P0001';
  end if;
  insert into public.assinaturas_verificadas (engagement_id, kind, actor, payload)
  values (p_engagement, p_kind, p_actor, p_payload)
  on conflict (engagement_id, kind) do update
    set actor = excluded.actor, payload = excluded.payload, verificada_em = now();
end $$;
revoke all on function public.registar_assinatura_verificada(uuid, public.engagement_event_kind, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.registar_assinatura_verificada(uuid, public.engagement_event_kind, uuid, jsonb)
  to service_role;

-- O que a política pergunta: o servidor verificou exatamente isto, para esta pessoa?
create function private.assinatura_verificada(p_engagement uuid, p_kind public.engagement_event_kind, p_payload jsonb)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assinaturas_verificadas v
    where v.engagement_id = p_engagement
      and v.kind = p_kind
      and v.actor = (select auth.uid())
      and v.payload = p_payload
  );
$$;
revoke all on function private.assinatura_verificada(uuid, public.engagement_event_kind, jsonb) from public, anon;
grant execute on function private.assinatura_verificada(uuid, public.engagement_event_kind, jsonb) to authenticated;

alter policy engagement_events_insert on public.engagement_events
  with check (
    actor = (select auth.uid())
    and (
      private.is_platform_admin()
      or (
        not reveal and amount_cents is null
        and (
          (kind in ('cliente_desistiu', 'transitar', 'encerrar_sem_contrato', 'litigio_aberto')
            and private.can_manage_org(private.engagement_client(engagement_id)))
          or (kind = 'litigio_aberto'
            and private.can_manage_org(private.engagement_painter(engagement_id)))
          or (kind = 'cliente_assinou'
            and private.can_manage_org(private.engagement_client(engagement_id))
            and private.assinatura_verificada(engagement_id, kind, payload))
          or (kind = 'pintor_assinou'
            and private.can_manage_org(private.engagement_painter(engagement_id))
            and private.assinatura_verificada(engagement_id, kind, payload))
        )
      )
    )
  );

-- Um registo verificado vale um acontecimento: gasta-se quando o acontecimento entra. Sem isto, o mesmo
-- payload entrava quantas vezes se quisesse pela API — cada cópia aparecia nas provas, na fila da equipa e
-- mandava outro aviso à outra parte (revisão de 05/11/2026). Não se proíbe uma segunda assinatura do mesmo
-- lado: depois de um litígio resolvido com «retomar», o cliente assina de novo, legitimamente.
create function private.gastar_assinatura_verificada() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.assinaturas_verificadas where engagement_id = new.engagement_id and kind = new.kind;
  return new;
end $$;
revoke all on function private.gastar_assinatura_verificada() from public, anon, authenticated;

create trigger engagement_events_gasta_verificacao
  after insert on public.engagement_events
  for each row when (new.kind in ('cliente_assinou', 'pintor_assinou'))
  execute function private.gastar_assinatura_verificada();

-- O balde: só o servidor carrega. Os ficheiros passam a chamar-se pelo resumo SHA-256 do próprio conteúdo
-- («<contratação>/cliente-<sha256>.pdf»), e lê-se o do acontecimento aceite: um carregamento atrasado nunca
-- substitui o que foi verificado (src/lib/engagements.ts, `signedPdf`).
alter policy contratos_insert on storage.objects
  with check (false);
