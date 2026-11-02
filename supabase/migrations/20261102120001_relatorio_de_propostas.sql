-- Relatório de propostas para a assembleia (secção 8 de "Quem Pinta — a oferta", 02/11/2026).
--
-- Nota de versão: construída em paralelo com outra sessão que gerou, na mesma altura, a migração
-- `20261102120000_reserva_so_para_avaliadores_inscritos.sql` — mesmo timestamp, nenhuma relação entre
-- as duas. Renomeada para `20261102120001` só para desfazer a colisão de versão (o Supabase usa o
-- timestamp como chave); a ordem entre as duas não tem efeito nenhum, não dependem uma da outra.
--
-- Problema que resolve: o condomínio que decide e paga depende de quem imprime e distribui as
-- propostas (normalmente o gestor de condomínio) para ver o quadro completo. Nada impedia, até
-- agora, que esse gestor "esquecesse" de entregar uma proposta à assembleia.
--
-- A solução é uma fotografia imutável do momento em que as propostas são entregues
-- (`private.propostas_entregues`, migração `entrega_simultanea`), gerada uma só vez e nunca
-- recalculada — ao contrário de `src/app/app/pedidos/[id]/propostas/relatorio/page.tsx`, que
-- continua a ser recalculado a cada visita e fica para o gestor acompanhar ao vivo. A ordem, os
-- códigos e o conteúdo desta fotografia são calculados em TypeScript puro e testado
-- (`src/domain/relatorioCongelado.ts`) — esta migração só guarda o resultado e controla quem o pode
-- escrever e ler. Duas tabelas, nunca alteradas depois do insert (sem política de update nem de
-- delete, a mesma disciplina de `engagement_events`):
--
--   `relatorios_de_propostas`        — uma linha por pedido: quando se gerou, o código da obra
--                                       (AAAAA), o token público e o aviso de integridade com o N
--                                       certo.
--   `relatorios_de_propostas_fichas` — uma linha por proposta/página: o número (1..N), o código da
--                                       página (BBBBB) e os dados já resolvidos, em jsonb (preço,
--                                       anos de experiência, garantia, reputação, prazo, material
--                                       principal, preço de referência, trabalhos discriminados,
--                                       documentos). As propostas continuam anónimas: esta tabela
--                                       nunca guarda o nome da empresa (CLAUDE.md, regra 6).
--
-- Leitura interna: só quem gere o pedido (`private.can_manage_org`, o mesmo critério do relatório ao
-- vivo). Escrita: só quem gere o pedido, e só depois de as propostas estarem entregues — a porta
-- fica na regra de acesso da base, não no ecrã (regra 7 do CLAUDE.md / já era assim em
-- `entrega_simultanea`). Nenhuma das duas tabelas tem política para `anon`: a leitura pública
-- (QR e link, sem login) passa só pela função `public.relatorio_publico`, que devolve exactamente o
-- mesmo conteúdo anónimo da versão interna — nunca mais.

create table public.relatorios_de_propostas (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.work_requests (id) on delete cascade,
  codigo_obra text not null check (codigo_obra ~ '^[A-Z0-9]{5}$'),
  -- Nunca sequencial (pedido explícito da especificação): o valor por omissão do Postgres já é
  -- aleatório e não previsível a partir de outro token.
  token uuid not null unique default gen_random_uuid(),
  numero_de_propostas int not null check (numero_de_propostas >= 0),
  aviso_integridade text not null,
  gerado_por uuid not null default auth.uid() references auth.users (id),
  gerado_em timestamptz not null default now()
);
create index relatorios_de_propostas_token_idx on public.relatorios_de_propostas (token);

create table public.relatorios_de_propostas_fichas (
  id uuid primary key default gen_random_uuid(),
  relatorio_id uuid not null references public.relatorios_de_propostas (id) on delete cascade,
  numero int not null check (numero > 0),
  codigo_pagina text not null check (codigo_pagina ~ '^[A-Z0-9]{5}$'),
  -- A forma exacta deste jsonb é a de `FichaCongelada` em src/domain/relatorioCongelado.ts (sem o
  -- `id` interno da proposta, que não entra aqui — a ficha não precisa dele e é mais um dado que
  -- poderia ligar-se, por acidente, de volta à proposta identificada).
  dados jsonb not null,
  unique (relatorio_id, numero),
  unique (relatorio_id, codigo_pagina)
);
create index relatorios_de_propostas_fichas_relatorio_idx on public.relatorios_de_propostas_fichas (relatorio_id);

alter table public.relatorios_de_propostas enable row level security;
alter table public.relatorios_de_propostas_fichas enable row level security;

-- Leitura interna: quem gere o pedido. Igual ao critério de `relatorio/page.tsx` (não `can_access_org`:
-- um papel só de leitura ou financeiro não decide a obra, e este relatório existe para quem decide).
create policy relatorios_de_propostas_select on public.relatorios_de_propostas for select to authenticated
  using (private.can_manage_org(private.request_org(request_id)));

-- Escrita: só quem gere o pedido, e só depois de as propostas estarem entregues. É a mesma porta de
-- `propostas_entregues` que já impede o cliente de ler uma proposta antes do prazo — aqui impede
-- gerar a fotografia antes desse momento, que é exactamente a garantia que a secção 8 pede.
create policy relatorios_de_propostas_insert on public.relatorios_de_propostas for insert to authenticated
  with check (
    private.can_manage_org(private.request_org(request_id))
    and private.propostas_entregues(request_id)
  );

create policy relatorios_de_propostas_fichas_select on public.relatorios_de_propostas_fichas for select to authenticated
  using (
    exists (
      select 1 from public.relatorios_de_propostas r
      where r.id = relatorio_id and private.can_manage_org(private.request_org(r.request_id))
    )
  );

create policy relatorios_de_propostas_fichas_insert on public.relatorios_de_propostas_fichas for insert to authenticated
  with check (
    exists (
      select 1 from public.relatorios_de_propostas r
      where r.id = relatorio_id
        and private.can_manage_org(private.request_org(r.request_id))
        and private.propostas_entregues(r.request_id)
    )
  );

-- Sem política de update nem de delete em nenhuma das duas tabelas: uma vez gerada, a fotografia é
-- definitiva. Mesmo quem a gerou não a pode alterar nem apagar depois. Sem revogar também o
-- privilégio SQL, a ausência de política limitaria as linhas visíveis ao update/delete a zero (sem
-- erro) — aqui prefere-se um erro claro de "permission denied", como em `engagement_events`.
revoke update, delete on public.relatorios_de_propostas, public.relatorios_de_propostas_fichas from authenticated;

-- Leitura pública, sem login, pelo token (QR ou link) — nunca pela tabela directamente, só por esta
-- função. `security definer` para poder ler as duas tabelas apesar de o chamador ser `anon`; o único
-- controlo de acesso é o token em si (comprido, aleatório, nunca listado) — por isso devolve tudo o
-- que a versão interna mostra, e nada que ela não mostre (nunca a identidade do pintor).
create function public.relatorio_publico(p_token uuid) returns table (
  codigo_obra text,
  numero_de_propostas int,
  aviso_integridade text,
  gerado_em timestamptz,
  fichas jsonb
) language sql stable security definer set search_path = '' as $$
  select
    r.codigo_obra,
    r.numero_de_propostas,
    r.aviso_integridade,
    r.gerado_em,
    coalesce(
      (
        select jsonb_agg(jsonb_build_object('numero', f.numero, 'codigoPagina', f.codigo_pagina, 'dados', f.dados) order by f.numero)
        from public.relatorios_de_propostas_fichas f
        where f.relatorio_id = r.id
      ),
      '[]'::jsonb
    )
  from public.relatorios_de_propostas r
  where r.token = p_token;
$$;

revoke all on function public.relatorio_publico(uuid) from public;
grant execute on function public.relatorio_publico(uuid) to anon, authenticated;

comment on function public.relatorio_publico(uuid) is
  'Lê a fotografia congelada pelo token público (QR/link), sem login. Única porta de leitura para anon — as tabelas não têm política para esse papel.';

comment on table public.relatorios_de_propostas is
  'Fotografia imutável das propostas no momento da entrega, para a assembleia (secção 8, "Quem Pinta — a oferta"). Gerada uma vez; nunca actualizada.';
comment on table public.relatorios_de_propostas_fichas is
  'Uma linha por proposta/página da fotografia congelada. Nunca guarda a identidade do pintor.';
