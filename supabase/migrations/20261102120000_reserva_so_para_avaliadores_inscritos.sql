-- Reservar um levantamento passa a exigir a autodeclaração de avaliador (02/11/2026, docs/DECISOES.md
-- «Ser avaliador»). O ecrã já a pedia; a base passa a pedi-la também, para a barreira não depender do
-- ecrã. A declaração é uma linha em survey_terms_acceptances com a versão própria, a mesma que
-- src/domain/avaliador.ts conhece (VERSAO_AUTODECLARACAO_DO_AVALIADOR); mudar o texto dos compromissos
-- sobe a versão nos dois sítios, e um teste em supabase/tests falha se divergirem.
--
-- Só muda a verificação no início de reserve_survey; o resto da função é o de
-- 20261031210000_matriz_de_libertacao.sql, repetido porque uma função se substitui inteira.

create or replace function private.versao_da_autodeclaracao_do_avaliador() returns text
language sql immutable as $$ select 'avaliador-2026-11-02'::text $$;

create or replace function private.e_avaliador_inscrito() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.survey_terms_acceptances a
    where a.user_id = (select auth.uid()) and a.version = private.versao_da_autodeclaracao_do_avaliador()
  )
$$;

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
  if not private.e_avaliador_inscrito() then
    raise exception 'Para aceitar um levantamento é preciso a inscrição como avaliador (Avaliações › Ser avaliador).'
      using errcode = 'P0001';
  end if;
  if private.tentativa_excluida(p_survey_id, p_org) then
    raise exception 'Já teve este levantamento reservado e perdeu o prazo: esta oportunidade segue para outro fornecedor.'
      using errcode = 'P0001';
  end if;
  select * into p from private.prazos_da_reserva(now());
  update public.request_surveys s
    set status = 'reservado', vendedor_org_id = p_org, vendedor_user_id = (select auth.uid()),
        reserved_at = now(), reserve_deadline = p.prazo_conclusao,
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
