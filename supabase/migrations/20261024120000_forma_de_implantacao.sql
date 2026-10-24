-- Forma de implantação do prédio (24/10/2026, pedido do promotor): o avaliador escolhe de entre
-- formas canónicas a que mais se aproxima, em vez de a descrever por palavras. É o que dá ao volume 3D
-- uma planta diferente de um retângulo e, com a rotação (PIN-06, MOD-06, ECR-C04), torna o desenho
-- utilizável para orçamentar.
--
-- Continua a não identificar o prédio: é uma de cinco formas, igual para todos os prédios que a
-- escolham, e o volume mantém-se indistinguível entre obras com as mesmas declarações.

alter table public.buildings
  add column if not exists forma_implantacao text
    check (forma_implantacao in ('quadrado', 'I', 'L', 'U', 'T'));

alter table public.request_listings
  add column if not exists forma_implantacao text
    check (forma_implantacao in ('quadrado', 'I', 'L', 'U', 'T'));

-- O anúncio copia a forma no momento da publicação, como os restantes campos públicos.

create or replace function private.work_request_transition() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  b public.buildings%rowtype;
  total int;
begin
  if old.status = new.status then
    if old.status <> 'rascunho' then
      raise exception 'Um pedido % não pode ser alterado.', old.status using errcode = 'P0001';
    end if;
    return new;
  end if;

  if not (
    (old.status = 'rascunho' and new.status in ('publicado', 'cancelado'))
    or (old.status = 'publicado' and new.status in ('rascunho', 'encerrado', 'cancelado'))
  ) then
    raise exception 'Transição inválida: % para %.', old.status, new.status using errcode = 'P0001';
  end if;

  if new.status = 'publicado' then
    select coalesce(sum(area_cm2), 0) into total from public.request_surfaces where request_id = new.id;
    if total <= 0 then raise exception 'Indique pelo menos uma superfície com área.' using errcode = 'P0001'; end if;
    if length(btrim(new.descricao)) < 30 then raise exception 'Descrição demasiado curta.' using errcode = 'P0001'; end if;
    if new.prazo_propostas is null or new.prazo_propostas < (now() at time zone 'Europe/Lisbon')::date + 7 then
      raise exception 'O prazo de propostas tem de ser de pelo menos 7 dias.' using errcode = 'P0001';
    end if;
    select * into b from public.buildings where id = new.building_id;
    new.published_at := now();
    insert into public.request_listings (
      request_id, ref, aberto, tipo_obra, descricao, trabalhos, cor_acabamento, prazo_propostas,
      execucao_desde, execucao_ate, concelho, tipo_imovel, pisos, fachadas, tem_varandas, forma_implantacao,
      area_total_cm2, published_at, version
    ) values (
      new.id, new.ref, true, new.tipo_obra, new.descricao, new.trabalhos, new.cor_acabamento, new.prazo_propostas,
      new.execucao_desde, new.execucao_ate, b.concelho, b.tipo, b.pisos, b.fachadas, b.tem_varandas, b.forma_implantacao,
      total, new.published_at, new.version
    )
    on conflict (request_id) do update set
      aberto = true, tipo_obra = excluded.tipo_obra, descricao = excluded.descricao, trabalhos = excluded.trabalhos,
      cor_acabamento = excluded.cor_acabamento, prazo_propostas = excluded.prazo_propostas,
      execucao_desde = excluded.execucao_desde, execucao_ate = excluded.execucao_ate, concelho = excluded.concelho,
      tipo_imovel = excluded.tipo_imovel, pisos = excluded.pisos, fachadas = excluded.fachadas,
      tem_varandas = excluded.tem_varandas, forma_implantacao = excluded.forma_implantacao,
      area_total_cm2 = excluded.area_total_cm2,
      published_at = excluded.published_at, version = excluded.version;
  else
    update public.request_listings set aberto = false where request_id = new.id;
    if new.status = 'rascunho' then
      new.version := old.version + 1;
    end if;
  end if;
  return new;
end $$;
