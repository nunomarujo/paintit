-- O vendedor passa a poder descontar, até ao limite que o dono da empresa definir (01/11/2026).
--
-- Até aqui, a base recusava qualquer desconto que não viesse do dono ou de um gestor. Não era o ecrã
-- que escondia o botão: a permissão nunca existiu. E não havia onde escrever um limite, por isso abrir
-- a porta sem mais seria deixar um vendedor dar 50% sem nada contra que comparar.
--
-- Três níveis de limite, que coexistem (decisão do promotor):
--   · da empresa — vale para todos os vendedores;
--   · do vendedor — substitui o da empresa para essa pessoa, para cima ou para baixo;
--   · do produto ou da categoria — teto que se aplica sempre por cima dos outros dois.
-- Sem regra nenhuma escrita, o limite é zero: um vendedor não desconta. É o comportamento de hoje, e é
-- o que fica a valer para quem nunca mexer nisto.
--
-- A regra vive em src/domain/limitesDeDesconto.ts; esta é a cópia da base, e um teste compara as duas.

create table if not exists public.supplier_discount_limits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- Nulo: vale para todos os vendedores da empresa.
  vendedor_user_id uuid references auth.users (id) on delete cascade,
  -- Nulo: vale para todas as categorias.
  tipo public.product_type,
  -- Nulo: vale para todos os produtos.
  product_id uuid references public.products (id) on delete cascade,
  limite_bps integer not null check (limite_bps between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_by uuid not null default auth.uid() references auth.users (id),
  -- Uma regra por combinação: duas linhas iguais com tetos diferentes seriam ambíguas — e a função
  -- que calcula o teto falharia a meio de uma gravação, que é o pior sítio para descobrir o problema.
  --
  -- `nulls not distinct` é essencial aqui: por omissão, o Postgres trata dois vazios como diferentes,
  -- e a restrição deixava passar dois limites gerais contraditórios para a mesma empresa. Os três
  -- níveis desta tabela distinguem-se precisamente por terem colunas vazias, por isso sem isto a
  -- restrição não protegia nada (encontrado pelos testes de acesso, 01/11/2026).
  constraint supplier_discount_limits_unico unique nulls not distinct (org_id, vendedor_user_id, tipo, product_id),
  -- Um limite ou é de uma pessoa, ou de um artigo: a mistura não é nenhum dos três níveis acima e
  -- tornaria a regra impossível de explicar a quem a lê no ecrã.
  constraint supplier_discount_limits_pessoa_ou_artigo check (
    vendedor_user_id is null or (tipo is null and product_id is null)
  ),
  constraint supplier_discount_limits_tipo_ou_produto check (tipo is null or product_id is null)
);

create index if not exists supplier_discount_limits_org_idx on public.supplier_discount_limits (org_id);

alter table public.supplier_discount_limits enable row level security;

-- Quem trabalha na empresa vê os limites: um vendedor tem de saber quanto pode dar antes de tentar.
drop policy if exists supplier_discount_limits_select on public.supplier_discount_limits;
create policy supplier_discount_limits_select on public.supplier_discount_limits
  for select to authenticated using (private.can_access_org(org_id));

-- Mexer nos limites é do dono e dos gestores. Um vendedor que pudesse subir o seu próprio teto não
-- teria teto nenhum.
drop policy if exists supplier_discount_limits_insert on public.supplier_discount_limits;
create policy supplier_discount_limits_insert on public.supplier_discount_limits
  for insert to authenticated
  with check (private.can_manage_org(org_id) and private.is_supplier_org(org_id) and updated_by = (select auth.uid()));

drop policy if exists supplier_discount_limits_update on public.supplier_discount_limits;
create policy supplier_discount_limits_update on public.supplier_discount_limits
  for update to authenticated
  using (private.can_manage_org(org_id)) with check (private.can_manage_org(org_id));

drop policy if exists supplier_discount_limits_delete on public.supplier_discount_limits;
create policy supplier_discount_limits_delete on public.supplier_discount_limits
  for delete to authenticated using (private.can_manage_org(org_id));

grant select, insert, update, delete on public.supplier_discount_limits to authenticated;

-- O teto que vale para uma pessoa num artigo, em pontos-base. Zero: não pode descontar.
create or replace function private.limite_de_desconto(
  p_org uuid, p_user uuid, p_tipo public.product_type, p_product uuid
) returns integer
language sql stable security definer set search_path = '' as $$
  with base as (
    select coalesce(
      (select limite_bps from public.supplier_discount_limits
        where org_id = p_org and vendedor_user_id = p_user and tipo is null and product_id is null),
      (select limite_bps from public.supplier_discount_limits
        where org_id = p_org and vendedor_user_id is null and tipo is null and product_id is null),
      0
    ) as bps
  ),
  tetos as (
    select limite_bps from public.supplier_discount_limits
    where org_id = p_org
      and vendedor_user_id is null
      and (tipo is not null or product_id is not null)
      and (
        case
          -- Um artigo concreto: conta o teto do próprio produto e o da sua categoria.
          when p_product is not null then product_id = p_product or (tipo is not null and tipo = p_tipo)
          -- Uma categoria: conta o teto dessa categoria.
          when p_tipo is not null then tipo = p_tipo
          -- Todo o catálogo: conta o teto mais apertado que exista, senão bastava não escolher
          -- produto nenhum para o contornar.
          else true
        end
      )
  )
  select least((select bps from base), coalesce((select min(limite_bps) from tetos), 10000));
$$;

revoke all on function private.limite_de_desconto(uuid, uuid, public.product_type, uuid) from public, anon;
grant execute on function private.limite_de_desconto(uuid, uuid, public.product_type, uuid) to authenticated;

-- A porta: um vendedor passa a poder gravar um desconto, desde que caiba no seu teto. O dono e os
-- gestores continuam sem limite. A verificação vive aqui, e não só no ecrã — um argumento que vem do
-- navegador pode ser trocado (regra 10 do CLAUDE.md).
alter policy supplier_discounts_insert on public.supplier_discounts
  with check (
    private.is_supplier_org(org_id)
    and private.supplier_has_plan(org_id, 'catalogo')
    and created_by = (select auth.uid())
    and (
      private.can_manage_org(org_id)
      or (
        private.has_role(org_id, array['vendedor']::public.member_role[])
        and desconto_bps <= private.limite_de_desconto(org_id, (select auth.uid()), tipo, product_id)
      )
    )
  );

-- Quem criou um desconto pode desativá-lo; o dono e os gestores mexem em qualquer um.
alter policy supplier_discounts_update on public.supplier_discounts
  using (private.can_manage_org(org_id) or created_by = (select auth.uid()))
  with check (private.can_manage_org(org_id) or created_by = (select auth.uid()));

-- Quem criou um desconto pode retirá-lo. Sem isto, um vendedor que se enganasse num desconto teria de
-- pedir ao responsável para o apagar — e o responsável pode nem estar.
alter policy supplier_discounts_delete on public.supplier_discounts
  using (private.can_manage_org(org_id) or created_by = (select auth.uid()));
