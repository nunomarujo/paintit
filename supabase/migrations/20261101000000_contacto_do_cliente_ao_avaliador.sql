-- O contacto do cliente, ao avaliador, com as duas condições.
--
-- Regra do promotor, 31/10/2026: «disponibilizar os contactos apenas ao avaliador com reserva válida e
-- confidencialidade aceite». **As duas**, não uma.
--
-- Até aqui o avaliador que reservava passava a ver a morada exata do prédio (termos de 23/10/2026), mas não
-- tinha nome, telefone nem email de ninguém — e a regra nova manda-o telefonar na primeira hora útil. Daí
-- esta função, e daí uma versão nova dos termos: o texto antigo cobria a morada e não cobria contactos de
-- pessoas, por isso toda a gente aceita de novo. É a própria regra de `src/domain/surveyTerms.ts`.
--
-- Não é uma política na tabela porque não é uma questão de pertença: é uma porta que só abre com duas
-- chaves, e que fecha outra vez quando a reserva se liberta ou vai a revisão sem ficar ativa.

-- A versão dos termos que cobre contactos de pessoas. Tem de ser igual a CURRENT_SURVEY_TERMS_VERSION em
-- src/domain/surveyTerms.ts — e há um teste que falha se divergirem, porque uma constante repetida em dois
-- sítios sem prova nenhuma é uma divergência à espera de acontecer.
create function private.versao_dos_termos_com_contactos() returns text
language sql immutable set search_path = '' as $$ select '2026-10-31'::text $$;

create function public.survey_client_contact(p_attempt uuid)
returns table (
  nome text,
  telefone text,
  email text,
  morada text,
  codigo_postal text,
  localidade text
)
language plpgsql security definer set search_path = '' as $$
declare
  a public.survey_attempts;
begin
  select * into a from public.survey_attempts where id = p_attempt;
  if a.id is null then
    raise exception 'Levantamento não encontrado.' using errcode = 'P0001';
  end if;
  -- Primeira chave: a reserva. Uma tentativa libertada ou concluída já não dá acesso a nada.
  if a.estado not in ('ativa', 'em_revisao') then
    raise exception 'Esta reserva já não está ativa: os contactos do cliente deixaram de estar disponíveis.'
      using errcode = 'P0001';
  end if;
  if not private.has_role(a.vendedor_org_id, array['proprietario', 'gestor', 'vendedor']::public.member_role[]) then
    raise exception 'Só quem reservou este levantamento vê os contactos do cliente.' using errcode = 'P0001';
  end if;
  -- Segunda chave: a confidencialidade, aceite por esta pessoa e na versão que cobre contactos.
  if not exists (
    select 1 from public.survey_terms_acceptances t
    where t.user_id = (select auth.uid()) and t.version = private.versao_dos_termos_com_contactos()
  ) then
    raise exception 'Aceite o compromisso de confidencialidade para ver os contactos do cliente.'
      using errcode = 'P0001';
  end if;

  return query
    select
      -- Quem pediu a obra, se tiver nome no perfil; senão a entidade, que é sempre alguém com quem falar.
      nullif(btrim(coalesce(pr.nome, '')), ''),
      coalesce(nullif(btrim(coalesce(pr.telefone, '')), ''), nullif(btrim(coalesce(o.telefone, '')), '')),
      coalesce(nullif(btrim(coalesce(o.email_contacto, '')), ''), u.email),
      b.morada, b.codigo_postal, b.localidade
    from public.request_surveys s
    join public.work_requests wr on wr.id = s.request_id
    join public.buildings b on b.id = wr.building_id
    join public.organizations o on o.id = wr.org_id
    left join auth.users u on u.id = wr.created_by
    left join public.profiles pr on pr.user_id = wr.created_by
    where s.id = a.survey_id;
end $$;
revoke all on function public.survey_client_contact(uuid) from public, anon;
grant execute on function public.survey_client_contact(uuid) to authenticated;
revoke all on function private.versao_dos_termos_com_contactos() from public, anon, authenticated;
