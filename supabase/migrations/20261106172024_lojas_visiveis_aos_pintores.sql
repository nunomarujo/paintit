-- As lojas do fornecedor veem-se pelos pintores (promotor, 06/11/2026: «sim, mostra a morada das lojas aos
-- pintores»): é onde vão levantar o material quando não há entrega em obra. Só as lojas de empresas
-- fornecedoras, e só a quem pertence a uma empresa de pintura; clientes e outros fornecedores continuam
-- sem as ver. A morada fiscal da empresa não muda: continua reservada.

drop policy supplier_stores_select on public.supplier_stores;
create policy supplier_stores_select on public.supplier_stores for select to authenticated
  using (private.can_access_org(org_id) or private.is_platform_admin() or private.is_painter());
