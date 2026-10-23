-- O convite de adesão do fornecedor (20261023161107) só pedia nome e email. O pedido do promotor
-- (23/10/2026) acrescenta telefone e morada/localização, para o fornecedor registar um contacto
-- completo de quem já conhece, não só um email de disparo. Tabela confirmada vazia (0 linhas) antes
-- desta migração — por isso `not null` direto, sem valor por omissão.

alter table public.supplier_painter_invites
  add column telefone text not null check (length(telefone) between 1 and 30),
  add column morada text not null check (length(morada) between 1 and 200);
