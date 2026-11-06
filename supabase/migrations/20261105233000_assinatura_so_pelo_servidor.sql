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

-- Quanto tempo vale um registo verificado. O servidor regista e grava o acontecimento logo a seguir (menos
-- de um segundo); um registo mais velho é de uma tentativa que falhou, e não pode ser gasto mais tarde.
create function private.validade_da_verificacao() returns interval
language sql immutable set search_path = '' as $$ select interval '15 minutes' $$;

-- A política continua a decidir QUEM regista cada assinatura (o papel na entidade do lado certo). A prova de
-- QUE o servidor verificou exatamente isto vive no gatilho abaixo, e não na política, por duas razões que a
-- revisão de 06/11/2026 encontrou: (1) a política vê todas as linhas de uma instrução antes de qualquer
-- gatilho AFTER as gastar, e um só registo deixava entrar várias assinaturas num INSERT de várias linhas;
-- (2) um gatilho BEFORE gasta o registo linha a linha, e a linha seguinte já não o encontra.
alter policy engagement_events_insert on public.engagement_events
  with check (
    actor = (select auth.uid())
    and (
      private.is_platform_admin()
      or (
        not reveal and amount_cents is null
        and (
          (kind in ('cliente_desistiu', 'transitar', 'encerrar_sem_contrato', 'litigio_aberto', 'cliente_assinou')
            and private.can_manage_org(private.engagement_client(engagement_id)))
          or (kind in ('litigio_aberto', 'pintor_assinou')
            and private.can_manage_org(private.engagement_painter(engagement_id)))
        )
      )
    )
  );

-- Gasta o registo verificado no momento em que a assinatura entra: tem de ser desta pessoa, deste lado e
-- desta contratação, com o payload exato, e recente. Sem ele a assinatura não entra (só a equipa da
-- plataforma passa sem registo, como passava antes). Volátil e linha a linha: num INSERT de várias linhas, a
-- segunda já não encontra o registo que a primeira gastou. Se a política recusar a linha depois disto, a
-- instrução inteira desfaz-se, e o registo com ela.
create function private.gastar_assinatura_verificada() returns trigger
language plpgsql volatile security definer set search_path = '' as $$
begin
  -- Sem sessão de utilizador (o dono da base, a chave de serviço) não há regras de acesso a aplicar — como na
  -- política. A equipa da plataforma passa como passava. Quem chega pela API com sessão tem de ter o registo.
  if (select auth.uid()) is null or private.is_platform_admin() then
    return new;
  end if;
  delete from public.assinaturas_verificadas v
  where v.engagement_id = new.engagement_id
    and v.kind = new.kind
    and v.actor = (select auth.uid())
    and v.payload = new.payload
    and v.verificada_em > now() - private.validade_da_verificacao();
  if not found then
    raise exception 'A assinatura só entra depois de o servidor verificar o PDF.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.gastar_assinatura_verificada() from public, anon, authenticated;

create trigger engagement_events_gasta_verificacao
  before insert on public.engagement_events
  for each row when (new.kind in ('cliente_assinou', 'pintor_assinou'))
  execute function private.gastar_assinatura_verificada();

-- Qualquer acontecimento da contratação apaga os registos que ficaram pendentes: o estado mudou, e o que se
-- verificou antes já não é o que está para assinar. Sem isto, o registo de uma tentativa recusada (por
-- exemplo, a meio de um litígio) servia mais tarde, depois de um «retomar», para o pintor assinar sobre uma
-- versão do PDF do cliente que já não é a aceite (revisão de 06/11/2026).
create function private.limpar_verificacoes_pendentes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.assinaturas_verificadas where engagement_id = new.engagement_id;
  return new;
end $$;
revoke all on function private.limpar_verificacoes_pendentes() from public, anon, authenticated;

create trigger engagement_events_limpa_verificacoes
  after insert on public.engagement_events
  for each row execute function private.limpar_verificacoes_pendentes();

-- O balde: só o servidor carrega. Os ficheiros passam a chamar-se pelo resumo SHA-256 do próprio conteúdo
-- («<contratação>/cliente-<sha256>.pdf»), e lê-se o do acontecimento aceite: um carregamento atrasado nunca
-- substitui o que foi verificado (src/lib/engagements.ts, `signedPdf`).
alter policy contratos_insert on storage.objects
  with check (false);
