-- O relógio das horas úteis dentro da base de dados, e a tentativa de levantamento como entidade própria.
--
-- Regras ratificadas pelo promotor a 31/10/2026:
--
--   · contacto: até ao fim da PRIMEIRA HORA ÚTIL após aceitar (9h-18h, segunda a sexta, hora de Lisboa);
--   · conclusão: 48 HORAS DE CALENDÁRIO a contar do fim dessa primeira hora útil. O início é fixo e não
--     depende da confirmação do cliente;
--   · adiamento: só a pedido e com confirmação do cliente, nunca além de 7 DIAS ÚTEIS depois do mesmo
--     início, mantendo a mesma hora como limite;
--   · «Cada redistribuição cria uma nova tentativa; os registos anteriores permanecem intactos.»
--
-- A última regra é a que obriga a esta tabela. Até aqui o contacto e o agendamento viviam em colunas de
-- `request_surveys`, uma linha por pedido, e libertar a reserva apagava-as (a manutenção diária fazia
-- exatamente isso). Com a regra nova esses registos são a única prova do que se passou numa revisão, e por
-- isso passam a pendurar-se na tentativa, que nunca se reescreve.
--
-- Migração ADITIVA, de propósito: as colunas antigas de `request_surveys` ficam, continuam a ser escritas, e
-- nada no código existente deixa de funcionar. A tentativa é a fonte de verdade de agora em diante; a
-- limpeza das colunas antigas é um trabalho separado, depois de os ecrãs passarem a ler daqui.
--
-- O relógio existe duas vezes — aqui e em `src/domain/horasUteis.ts` — porque a reserva é atómica na base de
-- dados e a interface precisa de prever prazos antes de aceitar. Duas implementações só valem se se provar
-- que concordam: `supabase/tests/relogioUtil.test.ts` corre as duas sobre a mesma semana, minuto a minuto.

-- ---------------------------------------------------------------------------------------------------------
-- O relógio
-- ---------------------------------------------------------------------------------------------------------

-- Soma minutos do relógio útil (9h-18h, seg-sex, Europa/Lisboa). Minutos fora do horário não contam.
-- `immutable` porque o fuso é nomeado aqui e não depende da sessão.
create function private.somar_minutos_uteis(p_desde timestamptz, p_minutos int)
returns timestamptz language plpgsql immutable set search_path = '' as $$
declare
  l timestamp;   -- hora de parede de Lisboa
  restam int;
  disponiveis int;
begin
  if p_minutos is null or p_minutos < 0 then
    raise exception 'somar_minutos_uteis: minutos tem de ser não negativo (recebi %).', p_minutos
      using errcode = 'P0001';
  end if;
  l := p_desde at time zone 'Europe/Lisbon';
  restam := p_minutos;
  -- Primeiro instante de atendimento igual ou posterior a l.
  loop
    if extract(isodow from l) >= 6 then
      l := date_trunc('day', l) + interval '1 day 9 hours';
    elsif l::time < time '09:00' then
      l := date_trunc('day', l) + interval '9 hours';
    elsif l::time >= time '18:00' then
      l := date_trunc('day', l) + interval '1 day 9 hours';
    else
      exit;
    end if;
  end loop;
  loop
    disponiveis := (extract(epoch from (date_trunc('day', l) + interval '18 hours' - l)) / 60)::int;
    if restam <= disponiveis then
      return (l + make_interval(mins => restam)) at time zone 'Europe/Lisbon';
    end if;
    restam := restam - disponiveis;
    l := date_trunc('day', l) + interval '1 day 9 hours';
    while extract(isodow from l) >= 6 loop
      l := l + interval '1 day';
    end loop;
  end loop;
end $$;

-- Soma dias úteis mantendo a hora de parede. Sábados e domingos não contam.
create function private.somar_dias_uteis(p_desde timestamptz, p_dias int)
returns timestamptz language plpgsql immutable set search_path = '' as $$
declare
  l timestamp;
begin
  if p_dias is null or p_dias < 0 then
    raise exception 'somar_dias_uteis: dias tem de ser não negativo (recebi %).', p_dias using errcode = 'P0001';
  end if;
  l := p_desde at time zone 'Europe/Lisbon';
  for i in 1 .. p_dias loop
    loop
      l := l + interval '1 day';
      exit when extract(isodow from l) <= 5;
    end loop;
  end loop;
  return l at time zone 'Europe/Lisbon';
end $$;

-- Os três prazos de uma reserva, calculados de uma só vez no momento da aceitação.
create function private.prazos_da_reserva(p_aceitacao timestamptz)
returns table (prazo_contacto timestamptz, prazo_conclusao timestamptz, limite_adiamento timestamptz)
language sql immutable set search_path = '' as $$
  select c, c + interval '48 hours', private.somar_dias_uteis(c, 7)
  from private.somar_minutos_uteis(p_aceitacao, 60) as c;
$$;

-- ---------------------------------------------------------------------------------------------------------
-- A tentativa
-- ---------------------------------------------------------------------------------------------------------

create table public.survey_attempts (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.request_surveys (id) on delete cascade,
  -- 1, 2, 3… pela ordem em que a vaga foi aceite. A tentativa nova começa em branco e não herda nada.
  numero int not null check (numero >= 1),
  vendedor_org_id uuid not null references public.organizations (id),
  vendedor_user_id uuid references auth.users (id),
  aceita_em timestamptz not null default now(),
  -- Os três prazos. Escritos uma vez, nunca recalculados: é isto que faz o início ser fixo.
  prazo_contacto timestamptz not null,
  prazo_conclusao timestamptz not null,
  limite_adiamento timestamptz not null,
  -- O que o avaliador registou.
  contacto_registado_em timestamptz,
  contacto_notas text not null default '' check (length(contacto_notas) <= 2000),
  agendado_para timestamptz,
  -- O que o cliente respondeu. As três opções são as do promotor, pela ordem em que lhe são apresentadas.
  resposta_cliente text check (resposta_cliente in ('agendado_48h', 'adiado', 'nao_contactado')),
  resposta_cliente_em timestamptz,
  -- Só quando o cliente pede adiamento. Validado contra `limite_adiamento`.
  adiado_para timestamptz,
  estado text not null default 'ativa'
    check (estado in ('ativa', 'concluida', 'libertada', 'em_revisao')),
  fecho_em timestamptz,
  fecho_motivo text check (length(fecho_motivo) <= 500),
  constraint survey_attempts_numero_unico unique (survey_id, numero),
  -- Uma tentativa fechada diz quando e porquê; uma aberta não tem fecho.
  constraint survey_attempts_fecho check (
    (estado in ('ativa', 'em_revisao') and fecho_em is null)
    or (estado in ('concluida', 'libertada') and fecho_em is not null)
  ),
  -- O adiamento nunca passa do teto, e não existe sem a resposta do cliente que o pediu.
  constraint survey_attempts_adiamento check (
    adiado_para is null or (adiado_para <= limite_adiamento and resposta_cliente = 'adiado')
  )
);

-- Uma só tentativa a decorrer por levantamento. As anteriores ficam todas, fechadas.
create unique index survey_attempts_uma_ativa on public.survey_attempts (survey_id)
  where estado in ('ativa', 'em_revisao');
create index survey_attempts_vendedor_idx on public.survey_attempts (vendedor_org_id);
-- Para a verificação de vencimentos ao minuto: só olha para o que está a decorrer.
create index survey_attempts_prazos_idx on public.survey_attempts (prazo_contacto, prazo_conclusao)
  where estado = 'ativa';

comment on table public.survey_attempts is
  'Uma tentativa de levantamento: quem aceitou, com que prazos, o que registou e o que o cliente respondeu. '
  'Nunca se reescreve nem se apaga — libertar a reserva fecha a tentativa e abre outra, e o histórico fica '
  'para revisão da plataforma (regra do promotor, 31/10/2026).';
comment on column public.survey_attempts.prazo_conclusao is
  '48 horas de calendário a contar de prazo_contacto. Não se move com a resposta do cliente: o silêncio dele '
  'consome o prazo do avaliador.';

alter table public.survey_attempts enable row level security;
-- Revogação explícita antes da concessão: sem ela, privilégios por omissão do esquema podiam dar escrita a
-- quem só deve ler, e o bloqueio passaria a vir só do RLS — que nega devolvendo zero linhas, em silêncio, em
-- vez de um erro. Nesta tabela, escrever é um erro que se quer ver.
revoke all on public.survey_attempts from anon, authenticated;
grant select on public.survey_attempts to authenticated;

-- Quem vê: a entidade que aceitou, e a equipa da plataforma (que é quem faz as revisões). O cliente vê o
-- agendamento pelo ecrã de confirmação, que tem a sua própria política — fica para o commit desse ecrã.
create policy survey_attempts_select on public.survey_attempts for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_role(vendedor_org_id, array['proprietario', 'gestor', 'vendedor']::public.member_role[])
  );

-- Escrever não se faz por política: passa pelas funções, que é onde as regras de prazo vivem.

-- ---------------------------------------------------------------------------------------------------------
-- O que já existe
-- ---------------------------------------------------------------------------------------------------------

-- Para as reservas em curso ou já concluídas, cria-se a tentativa 1 com o que estiver registado. O prazo de
-- conclusão é o que foi prometido (`reserve_deadline`), não um recalculado: ninguém vê o seu prazo mudar por
-- causa de uma migração. Os outros dois derivam da regra nova.
insert into public.survey_attempts (
  survey_id, numero, vendedor_org_id, vendedor_user_id, aceita_em,
  prazo_contacto, prazo_conclusao, limite_adiamento,
  contacto_registado_em, contacto_notas, agendado_para, estado, fecho_em, fecho_motivo
)
select
  s.id, 1, s.vendedor_org_id, s.vendedor_user_id, coalesce(s.reserved_at, s.created_at),
  private.somar_minutos_uteis(coalesce(s.reserved_at, s.created_at), 60),
  coalesce(s.reserve_deadline, private.somar_minutos_uteis(coalesce(s.reserved_at, s.created_at), 60) + interval '48 hours'),
  private.somar_dias_uteis(private.somar_minutos_uteis(coalesce(s.reserved_at, s.created_at), 60), 7),
  case when s.contact_notes <> '' then coalesce(s.reserved_at, s.created_at) end,
  s.contact_notes, s.scheduled_at,
  case s.status when 'concluido' then 'concluida' else 'ativa' end,
  case s.status when 'concluido' then coalesce(s.concluded_at, now()) end,
  case s.status when 'concluido' then 'Concluída antes de as tentativas existirem.' end
from public.request_surveys s
where s.vendedor_org_id is not null and s.status in ('reservado', 'concluido');

-- ---------------------------------------------------------------------------------------------------------
-- A reserva passa a abrir uma tentativa
-- ---------------------------------------------------------------------------------------------------------

-- Igual à anterior na verificação atómica e nas permissões; o que muda é que escreve os três prazos e abre a
-- tentativa. As colunas antigas continuam a ser preenchidas para não quebrar o que já as lê.
create or replace function public.reserve_survey(p_survey_id uuid, p_org uuid) returns public.request_surveys
language plpgsql security definer set search_path = '' as $$
declare
  r public.request_surveys;
  p record;
  n int;
begin
  if not exists (select 1 from public.organizations where id = p_org and kind = 'fornecedor') then
    raise exception 'Só um fornecedor pode reservar um levantamento.' using errcode = 'P0001';
  end if;
  if not private.has_role(p_org, array['proprietario', 'gestor', 'vendedor']::public.member_role[]) then
    raise exception 'Sem permissão para reservar por esta entidade.' using errcode = 'P0001';
  end if;
  select * into p from private.prazos_da_reserva(now());
  update public.request_surveys s
    set status = 'reservado', vendedor_org_id = p_org, vendedor_user_id = (select auth.uid()),
        reserved_at = now(), reserve_deadline = p.prazo_conclusao,
        -- A tentativa nova começa em branco: não herda o contacto nem o agendamento da anterior.
        contact_notes = '', scheduled_at = null
    where s.id = p_survey_id and s.status = 'aberto'
      and private.supplier_covers(p_org, private.request_concelho(s.request_id))
    returning * into r;
  if r.id is null then
    raise exception 'Este levantamento já não está disponível (reservado por outro fornecedor, ou fora da sua zona).' using errcode = 'P0001';
  end if;
  select coalesce(max(a.numero), 0) + 1 into n from public.survey_attempts a where a.survey_id = r.id;
  insert into public.survey_attempts (
    survey_id, numero, vendedor_org_id, vendedor_user_id, aceita_em,
    prazo_contacto, prazo_conclusao, limite_adiamento
  ) values (r.id, n, p_org, (select auth.uid()), now(), p.prazo_contacto, p.prazo_conclusao, p.limite_adiamento);
  return r;
end $$;
revoke all on function public.reserve_survey(uuid, uuid) from public, anon;
grant execute on function public.reserve_survey(uuid, uuid) to authenticated;
