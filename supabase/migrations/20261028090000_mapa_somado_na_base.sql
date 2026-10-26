-- O mapa passa a ser somado na base de dados (26/10/2026, docs/DECISOES.md).
--
-- O ecrã foi desenhado contra 133 contratos de um distrito e trazia-os em bruto para somar depois de
-- os receber. Feita a carga dos quinze anos são 9 393, e isso são 5,7 MB transferidos de cada vez que
-- a página abre — 2 MB para quem tem só Lisboa. Nada se perdia (não há tecto de linhas configurado na
-- base, foi verificado), mas é desperdício e cresce todos os anos.
--
-- Uma função só, que devolve as quatro peças do ecrã em cerca de 20 kB. `security invoker`, de
-- propósito: as políticas de quem chama continuam a valer, e não se acrescenta mais uma função com
-- poderes próprios à lista que já existe.
--
-- O que fica do lado do código: a ordem por que as entidades se apresentam é uma decisão de produto
-- (frequência antes de valor) e vive em `src/domain/mapaContratos.ts`, sobre as poucas centenas de
-- linhas já somadas. O que está aqui são contagens. As duas que são juízo — o convite a uma empresa
-- só, e o convite sem lista publicada — têm um teste em `supabase/tests/` que as prende ao que o
-- domínio diz que elas são.

create or replace function public.mapa_contratos(
  p_distritos text[] default null,
  p_desde int default null,
  p_nif text default null
) returns jsonb
language sql stable security invoker set search_path = '' as $$
with base as (
  select *
  from public.public_contracts c
  where (p_distritos is null or cardinality(p_distritos) = 0 or c.distrito = any (p_distritos))
    and (p_desde is null or c.ano >= p_desde)
),
-- Um convite por linha, para contar quem é chamado e quantas dessas ficou com a obra.
convites as (
  select b.adjudicatario_nif,
         coalesce(x->>'nif', lower(btrim(x->>'nome'))) as chave,
         x->>'nif' as nif,
         x->>'nome' as nome,
         b.entidade_nome
  from base b, lateral jsonb_array_elements(b.convidados) x
),
agrupadas as (
  select
    coalesce(b.entidade_nif, lower(btrim(b.entidade_nome))) as chave,
    min(b.entidade_nif) as nif,
    min(b.entidade_nome) as nome,
    count(*)::int as contratos,
    sum(b.preco_cents)::bigint as total_cents,
    -- A mediana, e não a média: uma obra grande desloca a média e mente sobre o que a entidade
    -- costuma pagar.
    round(percentile_cont(0.5) within group (order by b.preco_cents))::bigint as mediana_cents,
    count(*) filter (where b.por_convite)::int as por_convite,
    count(*) filter (where b.por_convite and jsonb_array_length(b.convidados) = 1)::int as convite_unico,
    -- Contado à parte: um número baixo de convites a uma empresa só lê-se como abertura da entidade
    -- quando pode ser apenas que a lista não foi publicada.
    count(*) filter (where b.por_convite and jsonb_array_length(b.convidados) = 0)::int as sem_lista,
    max(b.data_celebracao)::text as ultimo,
    coalesce(array_agg(distinct b.concelho) filter (where b.concelho is not null), '{}') as concelhos
  from base b
  group by 1
)
select jsonb_build_object(
  'resumo', (
    select jsonb_build_object(
      'contratos', count(*)::int,
      'totalCents', coalesce(sum(preco_cents), 0)::bigint,
      'entidades', (select count(*)::int from agrupadas),
      'porConvite', count(*) filter (where por_convite)::int,
      'semLista', count(*) filter (where por_convite and jsonb_array_length(convidados) = 0)::int,
      'anos', coalesce((select jsonb_agg(a order by a) from (select distinct ano a from base) x), '[]'::jsonb)
    ) from base
  ),
  'entidades', coalesce((
    select jsonb_agg(jsonb_build_object(
      'chave', e.chave, 'nif', e.nif, 'nome', e.nome,
      'contratos', e.contratos, 'totalCents', e.total_cents, 'medianaCents', e.mediana_cents,
      'porConvite', e.por_convite, 'conviteUnico', e.convite_unico, 'semLista', e.sem_lista,
      'ultimo', e.ultimo, 'concelhos', to_jsonb(e.concelhos)
    ) order by e.contratos desc, e.total_cents desc, e.nome)
    from agrupadas e
  ), '[]'::jsonb),
  'convidados', coalesce((
    select jsonb_agg(jsonb_build_object(
      'chave', q.chave, 'nif', q.nif, 'nome', q.nome, 'convites', q.convites, 'ganhos', q.ganhos
    ) order by q.convites desc, q.ganhos desc, q.nome)
    from (
      select chave, min(nif) as nif, min(nome) as nome,
             count(*)::int as convites,
             count(*) filter (where nif is not distinct from adjudicatario_nif)::int as ganhos
      from convites group by chave
      order by count(*) desc, min(nome)
      limit 15
    ) q
  ), '[]'::jsonb),
  -- Só pelo NIF: comparar nomes de empresa daria falsos positivos.
  'presenca', (
    select jsonb_build_object(
      'convites', count(*)::int,
      'ganhos', count(*) filter (where nif is not distinct from adjudicatario_nif)::int,
      'entidades', coalesce(jsonb_agg(distinct entidade_nome), '[]'::jsonb)
    ) from convites where p_nif is not null and nif = p_nif
  )
);
$$;

revoke all on function public.mapa_contratos(text[], int, text) from public, anon;
grant execute on function public.mapa_contratos(text[], int, text) to authenticated;

comment on function public.mapa_contratos is
  'As quatro peças do Mapa de Contratos Públicos somadas na base: resumo, entidades, quem é convidado e a presença da própria empresa.';
