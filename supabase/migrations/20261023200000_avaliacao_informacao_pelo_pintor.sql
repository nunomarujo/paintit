-- Nota do pintor sobre a informação do levantamento (decisão de 23/10/2026, docs/DECISOES.md, componente
-- de 30% da fórmula dinâmica da fração do vendedor — src/domain/survey.ts, surveyorCommissionBp). Qualquer
-- pintor com acesso ao pedido publicado pode avaliar, a qualquer momento, uma só vez cada (pode corrigir a
-- sua própria nota, nunca duplica); a média de todos entra na fórmula. Mesmo guarda de acesso que
-- request_painter_doubt (20261023190000): só sobre um levantamento já concluído, só enquanto o anúncio
-- estiver aberto.

create table public.survey_info_reviews (
  request_survey_id uuid not null references public.request_surveys (id) on delete cascade,
  painter_user_id uuid not null references auth.users (id),
  nota smallint not null check (nota between 1 and 5),
  comentario text not null default '' check (length(comentario) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (request_survey_id, painter_user_id)
);
create index survey_info_reviews_survey_idx on public.survey_info_reviews (request_survey_id);

create function public.rate_survey_info(p_request_survey_id uuid, p_nota smallint, p_comentario text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.request_surveys;
begin
  if not private.is_painter() then
    raise exception 'Só um pintor pode avaliar a informação do levantamento.' using errcode = 'P0001';
  end if;
  if p_nota < 1 or p_nota > 5 then
    raise exception 'A nota tem de ser entre 1 e 5.' using errcode = 'P0001';
  end if;
  select * into s from public.request_surveys where id = p_request_survey_id;
  if not found or s.status <> 'concluido' or not private.listing_open(s.request_id) then
    raise exception 'Não é possível avaliar a informação deste levantamento.' using errcode = 'P0001';
  end if;
  insert into public.survey_info_reviews (request_survey_id, painter_user_id, nota, comentario)
    values (p_request_survey_id, (select auth.uid()), p_nota, left(btrim(coalesce(p_comentario, '')), 2000))
    on conflict (request_survey_id, painter_user_id) do update
      set nota = excluded.nota, comentario = excluded.comentario, updated_at = now();
end $$;
revoke all on function public.rate_survey_info(uuid, smallint, text) from public, anon;
grant execute on function public.rate_survey_info(uuid, smallint, text) to authenticated;

-- Média para a fórmula de comissão (src/lib/surveys.ts, lido pela app do lado do servidor com privilégios
-- próprios) — não precisa de função pública: a leitura administrativa já ignora RLS.
alter table public.survey_info_reviews enable row level security;
revoke all on public.survey_info_reviews from anon;
revoke insert, update, delete on public.survey_info_reviews from authenticated;
-- Nunca uma política de leitura para o vendedor aqui: cada nota identifica o pintor que a deu, e o
-- vendedor só deve conhecer a média (quando a tiver na sua própria página), nunca uma nota avulsa.
create policy survey_info_reviews_select on public.survey_info_reviews for select to authenticated
  using (
    painter_user_id = (select auth.uid())
    or private.can_access_org(private.request_org(private.survey_request(request_survey_id)))
  );
