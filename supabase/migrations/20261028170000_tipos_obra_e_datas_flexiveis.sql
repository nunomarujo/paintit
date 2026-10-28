-- Uma obra com mais do que um tipo, e datas que o cliente dá por indicativas (promotor, 28/10/2026).
--
-- 1. TIPOS DE OBRA
--
-- O pedido escolhia um tipo numa lista pendente. Uma empreitada de condomínio que pinta a fachada e
-- as escadas cabia em "Fachadas e varandas" ou em "Zonas comuns interiores", nunca nas duas, e o
-- pintor recebia o anúncio com metade da obra escondida no texto corrido.
--
-- `tipo_obra` não desaparece nem passa a ser outra coisa: continua a ser o tipo **principal**, e é o
-- que o título do anúncio mostra, o que filtra a lista de oportunidades e o que vai nos documentos.
-- Dezenas de consultas já o leem e todas continuam certas. O que é novo é a lista completa ao lado.
--
-- A regra que liga os dois — o principal é o primeiro da lista, pela ordem do enum — fica num
-- gatilho, e não só na aplicação. Assim o mesmo conjunto dá sempre o mesmo principal, venha de onde
-- vier: do formulário, de SQL à mão, ou de uma gravação feita enquanto esta migração ainda não
-- tinha corrido (nessa janela a aplicação grava só `tipo_obra`, e o gatilho compõe a lista).

alter table public.work_requests add column if not exists tipos_obra public.work_type[] not null default '{}';

create or replace function private.tipos_da_obra() returns trigger language plpgsql set search_path = '' as $$
begin
  -- Sem lista: o principal vale por lista de um. É também o caminho dos pedidos antigos.
  if new.tipos_obra is null or cardinality(new.tipos_obra) = 0 then
    new.tipos_obra := array[new.tipo_obra];
    return new;
  end if;
  -- Com lista: ordem do enum e sem repetidos; o principal é o primeiro. `order by t` num enum é a
  -- ordem de declaração (fachadas, zonas_comuns, muros, moradia, interior), não a alfabética.
  select array_agg(distinct t order by t) into new.tipos_obra from unnest(new.tipos_obra) t;
  new.tipo_obra := new.tipos_obra[1];
  return new;
end $$;

revoke all on function private.tipos_da_obra() from public, anon, authenticated;

drop trigger if exists work_requests_tipos_obra on public.work_requests;
create trigger work_requests_tipos_obra before insert or update on public.work_requests for each row execute function private.tipos_da_obra();

-- Pedidos já existentes: a lista passa a ter o tipo que sempre tiveram.
update public.work_requests set tipos_obra = array[tipo_obra] where cardinality(tipos_obra) = 0;

comment on column public.work_requests.tipo_obra is 'Tipo principal: o primeiro de tipos_obra, pela ordem do enum. Mantido pelo gatilho work_requests_tipos_obra.';
comment on column public.work_requests.tipos_obra is 'Todos os tipos da obra, sem repetidos e pela ordem do enum. Nunca vazio.';

-- 2. DATAS INDICATIVAS
--
-- Uma data de execução sem margem é uma condição; a mesma data com margem é um desejo. O pintor
-- precisa de saber a diferença antes de orçamentar: com margem pode propor outra semana e ganhar a
-- obra; sem margem, ou pode naquelas datas ou não concorre.
--
-- O prazo das propostas é o único que a plataforma faz cumprir — as propostas só chegam ao cliente
-- no fim dele, e isso não muda. Marcá-lo aqui diz ao pintor que o cliente aceita prolongá-lo se lho
-- pedirem; o prolongamento continua a fazer-se pelo seu caminho próprio (`prolongar_prazo`), que é
-- quem verifica se ainda não houve entrega.

alter table public.work_requests add column if not exists datas_flexiveis text[] not null default '{}';
alter table public.work_requests add constraint work_requests_datas_flexiveis_check check (datas_flexiveis <@ array['propostas', 'execucao_desde', 'execucao_ate']::text[]);

comment on column public.work_requests.datas_flexiveis is 'Datas que o cliente dá por indicativas. Não altera prazo nenhum: informa o pintor.';

-- 3. O QUE DISTO CHEGA AO ANÚNCIO
--
-- O anúncio é `request_listings`, a projecção anónima que o pintor vê. As colunas novas vão lá ter
-- pelo gatilho `listing_via_publica`, que já é quem copia a ocupação da via pública, os produtos
-- preferidos e o modo dos trabalhos — e não por `work_request_transition`, que é a função mais
-- delicada do projecto e não se toca de passagem.
--
-- Aproveita-se para levar também as janelas por fachada (migração `janelas_por_fachada`): vêm do
-- prédio, que o pintor não pode ler, e sem isto o volume 3D do anúncio continuava a desenhá-las pelo
-- número por omissão. Vêm do prédio no momento da publicação, como todas as outras características.

alter table public.request_listings add column if not exists tipos_obra public.work_type[] not null default '{}';
alter table public.request_listings add column if not exists datas_flexiveis text[] not null default '{}';
alter table public.request_listings add column if not exists janelas_frente smallint;
alter table public.request_listings add column if not exists janelas_esquerda smallint;
alter table public.request_listings add column if not exists janelas_direita smallint;
alter table public.request_listings add column if not exists janelas_tras smallint;

create or replace function private.listing_via_publica() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'publicado' then
    update public.request_listings l set
      ocupacao_via_publica = new.ocupacao_via_publica,
      produtos_preferidos = new.produtos_preferidos,
      trabalhos_modo = new.trabalhos_modo,
      tipos_obra = new.tipos_obra,
      datas_flexiveis = new.datas_flexiveis,
      janelas_frente = b.janelas_frente,
      janelas_esquerda = b.janelas_esquerda,
      janelas_direita = b.janelas_direita,
      janelas_tras = b.janelas_tras
    from public.buildings b
    where l.request_id = new.id and b.id = new.building_id;
  end if;
  return new;
end $$;

-- Anúncios já publicados: a lista passa a ter o tipo que já lá estava, para o pintor nunca ver vazio.
update public.request_listings set tipos_obra = array[tipo_obra] where cardinality(tipos_obra) = 0;
