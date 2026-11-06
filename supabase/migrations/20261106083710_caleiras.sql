-- Caleiras como tipo de obra orçamentável (pedido do promotor, 06/11/2026; `src/domain/caleiras.ts`).
--
-- Aditiva. Três partes:
-- 1. O valor `caleiras` no fim do enum `work_type`. Vai no fim de propósito: o gatilho
--    `work_requests_tipos_obra` ordena `tipos_obra` pela ordem do enum e o primeiro é o tipo
--    principal — no fim, nenhum pedido existente muda de principal, e a ordem coincide com
--    `WORK_TYPES` no código. O valor não se usa nesta migração (um valor novo de enum não pode ser
--    usado na mesma transação em que é criado).
-- 2. O que o cliente declara: estado, intervenção, metros a substituir, comprimento total, em
--    `work_requests`, com as mesmas regras que `parseCaleiras` (o servidor valida antes; a base
--    recusa o que escape). Metros em centésimos de metro, inteiros.
-- 3. As mesmas colunas no anúncio (`request_listings`), copiadas na publicação pelo gatilho que já
--    copia o resto: o pintor lê o anúncio e não o pedido. Nada disto identifica o cliente.

alter type public.work_type add value if not exists 'caleiras';

alter table public.work_requests
  add column if not exists caleiras_estado text
    check (caleiras_estado in ('bom', 'desgaste', 'ferrugem', 'furos', 'nao_sei')),
  add column if not exists caleiras_intervencao text
    check (caleiras_intervencao in ('renovar', 'substituir_partes', 'apenas_limpar', 'limpar_e_pintar')),
  add column if not exists caleiras_metros_substituir_cm integer
    check (caleiras_metros_substituir_cm > 0 and caleiras_metros_substituir_cm <= 200000),
  add column if not exists caleiras_comprimento_cm integer
    check (caleiras_comprimento_cm > 0 and caleiras_comprimento_cm <= 200000);

alter table public.work_requests drop constraint if exists work_requests_caleiras_metros;
alter table public.work_requests add constraint work_requests_caleiras_metros check (
  coalesce(caleiras_intervencao = 'substituir_partes', false) = (caleiras_metros_substituir_cm is not null)
);

comment on column public.work_requests.caleiras_intervencao is
  'O que o cliente pretende fazer às caleiras (src/domain/caleiras.ts). Nulo sem o tipo caleiras.';
comment on column public.work_requests.caleiras_metros_substituir_cm is
  'Metros a substituir, em centésimos de metro. Só, e obrigatório, com substituir_partes.';

alter table public.request_listings
  add column if not exists caleiras_estado text,
  add column if not exists caleiras_intervencao text,
  add column if not exists caleiras_metros_substituir_cm integer,
  add column if not exists caleiras_comprimento_cm integer;

-- O gatilho de 28/10/2026 (`tipos_obra_e_datas_flexiveis`), com as caleiras acrescentadas. O resto
-- fica igual, linha a linha.
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
      janelas_tras = b.janelas_tras,
      caleiras_estado = new.caleiras_estado,
      caleiras_intervencao = new.caleiras_intervencao,
      caleiras_metros_substituir_cm = new.caleiras_metros_substituir_cm,
      caleiras_comprimento_cm = new.caleiras_comprimento_cm
    from public.buildings b
    where l.request_id = new.id and b.id = new.building_id;
  end if;
  return new;
end $$;
