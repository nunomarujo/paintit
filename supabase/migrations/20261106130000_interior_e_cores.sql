-- Medição do interior da habitação e cor da pintura (06/11/2026; `src/domain/interior.ts`,
-- `src/domain/corDaPintura.ts`; adenda 2 do promotor). Aditiva.
--
-- 1. `request_rooms` — as divisões do interior de um pedido: tipo e número (só da lista geral, sem texto
--    livre que identifique pessoas), cotas, pé-direito, vãos, o que se pinta, a cor, e as áreas calculadas
--    pelo servidor com a certeza. **A imagem da planta não se guarda em lado nenhum**: fica no aparelho de
--    quem desenha; só os números chegam aqui (regra 6). Quem mediu e quando ficam na linha. As mesmas
--    regras de acesso das zonas (`request_surfaces`): só se altera em rascunho; o pintor lê os números
--    quando o anúncio está aberto, nunca a planta.
-- 2. O modo e o pé-direito geral do interior, no pedido. (A cor geral continua em `cor_acabamento`; o
--    quadrado de cor tira-se da referência QP, sem coluna própria.)
-- 3. `paleta_cores` — a paleta própria da Quem Pinta (códigos `QP-nnn`, nomes e hex nossos): leitura
--    pública, escrita só da equipa. Não se embutem RAL, NCS nem Pantone (proprietárias).
-- 4. Depois de o pedido ter sido publicado, uma alteração das divisões ou da cor fica no registo da obra.

create table if not exists public.request_rooms (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.work_requests (id) on delete cascade,
  ordem smallint not null default 0,
  tipo text not null check (tipo in ('sala', 'quarto', 'cozinha', 'wc', 'corredor', 'hall', 'escritorio', 'arrumos', 'marquise', 'outra')),
  numero smallint not null default 1 check (numero between 1 and 50),
  comprimento_cm integer check (comprimento_cm is null or comprimento_cm between 1 and 10000),
  largura_cm integer check (largura_cm is null or largura_cm between 1 and 10000),
  perimetro_cm integer check (perimetro_cm is null or perimetro_cm between 1 and 40000),
  pe_direito_cm integer check (pe_direito_cm is null or pe_direito_cm between 100 and 1000),
  -- [{"largura_cm": 80, "altura_cm": 200, "quantidade": 1}, …]
  vaos jsonb not null default '[]'::jsonb check (jsonb_typeof(vaos) = 'array' and jsonb_array_length(vaos) <= 20),
  pintar_paredes boolean not null default true,
  pintar_teto boolean not null default false,
  -- Modo manual, em centésimos de m² (como `request_surfaces.area_cm2`).
  area_paredes_manual_cm2 integer check (area_paredes_manual_cm2 is null or area_paredes_manual_cm2 > 0),
  area_teto_manual_cm2 integer check (area_teto_manual_cm2 is null or area_teto_manual_cm2 > 0),
  cor_referencia text check (cor_referencia is null or length(cor_referencia) between 1 and 120),
  cor_hex text check (cor_hex is null or cor_hex ~ '^#[0-9a-fA-F]{6}$'),
  -- Calculado pelo servidor (`areasDaDivisao`); nulo = por medir.
  area_paredes_cm2 integer check (area_paredes_cm2 is null or area_paredes_cm2 >= 0),
  area_teto_cm2 integer check (area_teto_cm2 is null or area_teto_cm2 >= 0),
  certeza text not null default 'desconhecida' check (certeza in ('declarada', 'estimada', 'desconhecida')),
  -- Margem relativa da planta à escala, em pontos-base (só no modo planta).
  margem_bp integer check (margem_bp is null or margem_bp between 0 and 10000),
  vao_minimo_cm2 integer not null default 100 check (vao_minimo_cm2 >= 0),
  registado_por uuid references auth.users (id) default auth.uid(),
  registado_em timestamptz not null default now(),
  unique (request_id, tipo, numero)
);
create index if not exists request_rooms_request_idx on public.request_rooms (request_id, ordem);
create index if not exists request_rooms_registado_por_idx on public.request_rooms (registado_por);

alter table public.request_rooms enable row level security;
drop policy if exists request_rooms_select on public.request_rooms;
create policy request_rooms_select on public.request_rooms for select to authenticated using (
  private.can_access_org(private.request_org(request_id))
  or (private.is_painter() and exists (select 1 from public.request_listings l where l.request_id = request_rooms.request_id and l.aberto))
  or private.request_revealed_to_me(request_id)
  or private.can_access_as_surveyor(request_id)
  or private.is_resident_of_request(request_id)
);
drop policy if exists request_rooms_insert on public.request_rooms;
create policy request_rooms_insert on public.request_rooms for insert to authenticated with check (
  (private.can_manage_org(private.request_org(request_id)) or private.can_access_as_surveyor(request_id)) and private.request_is_draft(request_id)
);
drop policy if exists request_rooms_update on public.request_rooms;
create policy request_rooms_update on public.request_rooms for update to authenticated
  using ((private.can_manage_org(private.request_org(request_id)) or private.can_access_as_surveyor(request_id)) and private.request_is_draft(request_id))
  with check ((private.can_manage_org(private.request_org(request_id)) or private.can_access_as_surveyor(request_id)) and private.request_is_draft(request_id));
drop policy if exists request_rooms_delete on public.request_rooms;
create policy request_rooms_delete on public.request_rooms for delete to authenticated using (
  (private.can_manage_org(private.request_org(request_id)) or private.can_access_as_surveyor(request_id)) and private.request_is_draft(request_id)
);
revoke all on public.request_rooms from anon;

alter table public.work_requests
  add column if not exists interior_modo text check (interior_modo is null or interior_modo in ('desenho', 'planta', 'manual')),
  add column if not exists interior_pe_direito_cm integer check (interior_pe_direito_cm is null or interior_pe_direito_cm between 100 and 1000),
  add column if not exists interior_pe_direito_corrente boolean not null default false;

create table if not exists public.paleta_cores (
  codigo text primary key check (codigo ~ '^QP-[0-9]{3}$'),
  nome text not null check (length(nome) between 1 and 60),
  hex text not null check (hex ~ '^#[0-9a-fA-F]{6}$'),
  familia text not null check (length(familia) between 1 and 40),
  ordem smallint not null default 0,
  ativa boolean not null default true
);
alter table public.paleta_cores enable row level security;
drop policy if exists paleta_cores_select on public.paleta_cores;
create policy paleta_cores_select on public.paleta_cores for select to authenticated using (ativa or private.is_platform_admin());
-- Sem sessão (o anónimo não executa as funções privadas): só as ativas.
drop policy if exists paleta_cores_select_anon on public.paleta_cores;
create policy paleta_cores_select_anon on public.paleta_cores for select to anon using (ativa);
drop policy if exists paleta_cores_insert on public.paleta_cores;
create policy paleta_cores_insert on public.paleta_cores for insert to authenticated with check (private.is_platform_admin());
drop policy if exists paleta_cores_update on public.paleta_cores;
create policy paleta_cores_update on public.paleta_cores for update to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());
revoke delete, truncate on public.paleta_cores from anon, authenticated;
comment on table public.paleta_cores is
  'Paleta própria da Quem Pinta (QP-nnn). As cores no ecrã são aproximadas; a cor real é a da amostra do fabricante. Não contém RAL, NCS nem Pantone.';

-- Lista inicial, proposta a 06/11/2026: 60 cores de interior correntes, nomes e valores nossos.
insert into public.paleta_cores (codigo, nome, hex, familia, ordem) values
  ('QP-001', 'Branco puro', '#f8f8f5', 'Brancos', 1),
  ('QP-002', 'Branco gelo', '#eef2f3', 'Brancos', 2),
  ('QP-003', 'Branco quente', '#f6f1e6', 'Brancos', 3),
  ('QP-004', 'Branco linho', '#f1ebdf', 'Brancos', 4),
  ('QP-005', 'Branco giz', '#f3f2ee', 'Brancos', 5),
  ('QP-006', 'Branco marfim', '#f4ecd8', 'Brancos', 6),
  ('QP-007', 'Branco nata', '#f7efdc', 'Brancos', 7),
  ('QP-008', 'Branco algodão', '#f5f4ef', 'Brancos', 8),
  ('QP-009', 'Cinza pérola', '#e3e2de', 'Cinzentos', 9),
  ('QP-010', 'Cinza névoa', '#d6d8d7', 'Cinzentos', 10),
  ('QP-011', 'Cinza seixo', '#c4c2bc', 'Cinzentos', 11),
  ('QP-012', 'Cinza pedra', '#a9a7a0', 'Cinzentos', 12),
  ('QP-013', 'Cinza ardósia', '#7c8085', 'Cinzentos', 13),
  ('QP-014', 'Cinza grafite', '#55585c', 'Cinzentos', 14),
  ('QP-015', 'Cinza nuvem', '#dcdfe0', 'Cinzentos', 15),
  ('QP-016', 'Cinza cimento', '#b8b6b0', 'Cinzentos', 16),
  ('QP-017', 'Areia clara', '#ece2cf', 'Beges e areias', 17),
  ('QP-018', 'Areia', '#dccbaf', 'Beges e areias', 18),
  ('QP-019', 'Duna', '#cfbb98', 'Beges e areias', 19),
  ('QP-020', 'Bege linho', '#e4d7c0', 'Beges e areias', 20),
  ('QP-021', 'Bege caramelo', '#c9a983', 'Beges e areias', 21),
  ('QP-022', 'Palha', '#e8dcb5', 'Beges e areias', 22),
  ('QP-023', 'Camurça', '#c2a888', 'Beges e areias', 23),
  ('QP-024', 'Trigo', '#e2cfa6', 'Beges e areias', 24),
  ('QP-025', 'Terracota', '#b86b4b', 'Terras', 25),
  ('QP-026', 'Barro', '#a8644a', 'Terras', 26),
  ('QP-027', 'Ocre', '#c8964a', 'Terras', 27),
  ('QP-028', 'Canela', '#a87452', 'Terras', 28),
  ('QP-029', 'Telha', '#9c5139', 'Terras', 29),
  ('QP-030', 'Siena', '#8a5a3c', 'Terras', 30),
  ('QP-031', 'Cacau', '#6e4b3a', 'Terras', 31),
  ('QP-032', 'Verde salva', '#b9c3ad', 'Verdes', 32),
  ('QP-033', 'Verde menta', '#cfe0d2', 'Verdes', 33),
  ('QP-034', 'Verde oliva', '#8a8a5c', 'Verdes', 34),
  ('QP-035', 'Verde musgo', '#6f7a55', 'Verdes', 35),
  ('QP-036', 'Verde eucalipto', '#9fb3a6', 'Verdes', 36),
  ('QP-037', 'Verde pistácio', '#c9d6a8', 'Verdes', 37),
  ('QP-038', 'Verde garrafa', '#3f5a4a', 'Verdes', 38),
  ('QP-039', 'Verde água', '#bfdcd6', 'Verdes', 39),
  ('QP-040', 'Azul céu', '#cfe0ea', 'Azuis', 40),
  ('QP-041', 'Azul gelo', '#dde8ec', 'Azuis', 41),
  ('QP-042', 'Azul atlântico', '#4f6f86', 'Azuis', 42),
  ('QP-043', 'Azul ganga', '#6d86a0', 'Azuis', 43),
  ('QP-044', 'Azul petróleo', '#2f5560', 'Azuis', 44),
  ('QP-045', 'Azul lavanda', '#c9cde3', 'Azuis', 45),
  ('QP-046', 'Azul marinho', '#2b3a55', 'Azuis', 46),
  ('QP-047', 'Azul bruma', '#aebfcc', 'Azuis', 47),
  ('QP-048', 'Rosa velho', '#d7b6ae', 'Rosas e vermelhos', 48),
  ('QP-049', 'Rosa pó', '#ead3cd', 'Rosas e vermelhos', 49),
  ('QP-050', 'Salmão', '#e7b39c', 'Rosas e vermelhos', 50),
  ('QP-051', 'Coral', '#e08f72', 'Rosas e vermelhos', 51),
  ('QP-052', 'Bordeaux', '#6e2c34', 'Rosas e vermelhos', 52),
  ('QP-053', 'Vermelho tijolo', '#a5473a', 'Rosas e vermelhos', 53),
  ('QP-054', 'Malva', '#b8a0ad', 'Rosas e vermelhos', 54),
  ('QP-055', 'Amarelo manteiga', '#f3e3a6', 'Amarelos', 55),
  ('QP-056', 'Amarelo palha', '#efdc9d', 'Amarelos', 56),
  ('QP-057', 'Mostarda', '#c9a13b', 'Amarelos', 57),
  ('QP-058', 'Amarelo açafrão', '#e0a53a', 'Amarelos', 58),
  ('QP-059', 'Limão suave', '#efeaa8', 'Amarelos', 59),
  ('QP-060', 'Mel', '#d9a85a', 'Amarelos', 60)
on conflict (codigo) do nothing;

-- Depois de publicado, uma alteração das divisões ou da cor fica no registo da obra (T5).
create or replace function private.registo_do_interior() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  linha public.request_rooms;
begin
  linha := coalesce(new, old);
  select id, org_id, published_at into r from public.work_requests where id = linha.request_id;
  if r.published_at is not null then
    perform private.registar(r.id, null, r.org_id, null, 'interior_alterado',
      jsonb_build_object('operacao', lower(tg_op), 'divisao', to_jsonb(linha) - 'registado_por'));
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists request_rooms_registo on public.request_rooms;
create trigger request_rooms_registo after insert or update or delete on public.request_rooms for each row execute function private.registo_do_interior();

create or replace function private.registo_da_cor() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.published_at is not null and new.cor_acabamento is distinct from old.cor_acabamento then
    perform private.registar(new.id, null, new.org_id, null, 'cor_alterada', jsonb_build_object('de', old.cor_acabamento, 'para', new.cor_acabamento));
  end if;
  return new;
end $$;
drop trigger if exists work_requests_registo_da_cor on public.work_requests;
create trigger work_requests_registo_da_cor after update of cor_acabamento on public.work_requests for each row execute function private.registo_da_cor();
