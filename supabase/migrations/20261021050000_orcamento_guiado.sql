-- Orçamento guiado (docs/PROPOSTA.md, fase 3): trabalhos com estado, preço global, IVA livre. Cada instrução numa linha.
alter type public.line_inclusion add value if not exists 'nao_incluido';
alter table public.proposal_lines add column trabalho text;
alter table public.proposal_lines add column detalhes jsonb not null default '{}'::jsonb;
alter table public.proposals add column modo_preco text not null default 'detalhado' check (modo_preco in ('detalhado', 'global'));
alter table public.proposals drop constraint proposals_iva_bps_check;
alter table public.proposals add constraint proposals_iva_bps_range check (iva_bps between 0 and 3000);
