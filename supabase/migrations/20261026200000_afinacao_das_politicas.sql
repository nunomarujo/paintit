-- Afinação das políticas criadas ontem e hoje (25/10/2026).
--
-- Os avisos de desempenho do Supabase apanharam três coisas, todas nas tabelas novas:
--
-- 1. `auth.uid()` escrito à solta numa política é reavaliado **linha a linha**. Dentro de um
--    `(select auth.uid())` é avaliado uma vez por consulta. O resto da aplicação não tinha o
--    problema porque passa pelos auxiliares `private.has_role` e `private.can_manage_org`.
-- 2. Uma política `for all` cobre também o SELECT, por isso conviver com uma política `_select`
--    deixava duas políticas permissivas a correr em cada leitura. As de escrita passam a ser
--    explícitas: insert, update e delete.
-- 3. Três chaves estrangeiras ficaram sem índice que as cubra.
--
-- Nada disto muda quem pode ver ou escrever o quê — só o custo de o verificar.

-- 1 e 2: subscrição -------------------------------------------------------------------------------

drop policy if exists org_subscriptions_select on public.org_subscriptions;
create policy org_subscriptions_select on public.org_subscriptions
  for select to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = org_subscriptions.org_id and m.user_id = (select auth.uid())));

drop policy if exists org_subscriptions_insert on public.org_subscriptions;
create policy org_subscriptions_insert on public.org_subscriptions
  for insert to authenticated
  with check (
    estado = 'por_pagar'
    and exists (select 1 from public.org_members m where m.org_id = org_subscriptions.org_id and m.user_id = (select auth.uid()))
  );

drop policy if exists org_subscriptions_update on public.org_subscriptions;
create policy org_subscriptions_update on public.org_subscriptions
  for update to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = org_subscriptions.org_id and m.user_id = (select auth.uid())))
  with check (
    estado = 'cancelada'
    and exists (select 1 from public.org_members m where m.org_id = org_subscriptions.org_id and m.user_id = (select auth.uid()))
  );

-- Concursos públicos: leitura para qualquer conta, escrita só da equipa da plataforma.
drop policy if exists public_tenders_write on public.public_tenders;
create policy public_tenders_insert on public.public_tenders for insert to authenticated
  with check (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())));
create policy public_tenders_update on public.public_tenders for update to authenticated
  using (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())));
create policy public_tenders_delete on public.public_tenders for delete to authenticated
  using (exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid())));

-- Distritos de trabalho da empresa.
drop policy if exists painter_tender_prefs_select on public.painter_tender_prefs;
drop policy if exists painter_tender_prefs_write on public.painter_tender_prefs;
create policy painter_tender_prefs_select on public.painter_tender_prefs for select to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = painter_tender_prefs.org_id and m.user_id = (select auth.uid())));
create policy painter_tender_prefs_insert on public.painter_tender_prefs for insert to authenticated
  with check (exists (select 1 from public.org_members m where m.org_id = painter_tender_prefs.org_id and m.user_id = (select auth.uid())));
create policy painter_tender_prefs_update on public.painter_tender_prefs for update to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = painter_tender_prefs.org_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.org_members m where m.org_id = painter_tender_prefs.org_id and m.user_id = (select auth.uid())));
create policy painter_tender_prefs_delete on public.painter_tender_prefs for delete to authenticated
  using (exists (select 1 from public.org_members m where m.org_id = painter_tender_prefs.org_id and m.user_id = (select auth.uid())));

-- 2: orçamentos próprios, linhas, biblioteca de preços e consumíveis ------------------------------

drop policy if exists painter_quotes_write on public.painter_quotes;
create policy painter_quotes_insert on public.painter_quotes for insert to authenticated
  with check (private.can_manage_org(org_id));
create policy painter_quotes_update on public.painter_quotes for update to authenticated
  using (private.can_manage_org(org_id)) with check (private.can_manage_org(org_id));
create policy painter_quotes_delete on public.painter_quotes for delete to authenticated
  using (private.can_manage_org(org_id));

drop policy if exists painter_quote_lines_write on public.painter_quote_lines;
create policy painter_quote_lines_insert on public.painter_quote_lines for insert to authenticated
  with check (private.can_manage_org(private.painter_quote_owner(quote_id)));
create policy painter_quote_lines_update on public.painter_quote_lines for update to authenticated
  using (private.can_manage_org(private.painter_quote_owner(quote_id)))
  with check (private.can_manage_org(private.painter_quote_owner(quote_id)));
create policy painter_quote_lines_delete on public.painter_quote_lines for delete to authenticated
  using (private.can_manage_org(private.painter_quote_owner(quote_id)));

drop policy if exists org_price_book_write on public.org_price_book;
create policy org_price_book_insert on public.org_price_book for insert to authenticated
  with check (private.can_manage_org(org_id));
create policy org_price_book_update on public.org_price_book for update to authenticated
  using (private.can_manage_org(org_id)) with check (private.can_manage_org(org_id));
create policy org_price_book_delete on public.org_price_book for delete to authenticated
  using (private.can_manage_org(org_id));

-- Consumíveis: a política `for all` era a única da tabela, por isso aqui só se separa para o SELECT
-- deixar de passar pela verificação de gestão.
drop policy if exists org_consumables_all on public.org_consumables;
create policy org_consumables_select on public.org_consumables for select to authenticated
  using (private.has_role(org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]));
create policy org_consumables_insert on public.org_consumables for insert to authenticated
  with check (private.can_manage_org(org_id));
create policy org_consumables_update on public.org_consumables for update to authenticated
  using (private.can_manage_org(org_id)) with check (private.can_manage_org(org_id));
create policy org_consumables_delete on public.org_consumables for delete to authenticated
  using (private.can_manage_org(org_id));

drop policy if exists consumable_moves_all on public.consumable_moves;
create policy consumable_moves_select on public.consumable_moves for select to authenticated
  using (private.has_role(org_id, array['proprietario', 'gestor', 'financeiro', 'leitor']::public.member_role[]));
create policy consumable_moves_insert on public.consumable_moves for insert to authenticated
  with check (private.can_manage_org(org_id));
create policy consumable_moves_update on public.consumable_moves for update to authenticated
  using (private.can_manage_org(org_id)) with check (private.can_manage_org(org_id));
create policy consumable_moves_delete on public.consumable_moves for delete to authenticated
  using (private.can_manage_org(org_id));

-- 3: chaves estrangeiras sem índice ---------------------------------------------------------------

create index if not exists consumable_moves_org_idx on public.consumable_moves (org_id);
create index if not exists painter_quotes_worksite_idx on public.painter_quotes (worksite_id);
create index if not exists worksite_photos_created_by_idx on public.worksite_photos (created_by);
