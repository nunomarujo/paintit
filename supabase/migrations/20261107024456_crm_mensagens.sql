-- CRM: a caixa de correio (promotor, 06/11/2026). Guarda as respostas recebidas aos emails das campanhas, a categoria que a
-- plataforma lhes dá, e os rascunhos de resposta que esperam por uma pessoa. Só a equipa da plataforma lê e escreve.
--
-- Entrada: nova (espera por uma pessoa) ou tratada (a plataforma já fez o que havia a fazer: desistência, recusa, ressalto,
-- resposta automática). Saída: rascunho, enviada ou descartada. `message_id` torna a entrada idempotente: a mesma mensagem
-- entregue duas vezes só conta uma.

create table public.crm_mensagens (
  id uuid primary key default gen_random_uuid(),
  contacto_id uuid references public.crm_contactos (id) on delete set null,
  direcao text not null check (direcao in ('entrada', 'saida')),
  de text,
  assunto text not null default '',
  texto text not null,
  categoria text check (categoria is null or categoria in ('ressalto', 'automatica', 'desistencia', 'recusa', 'interesse', 'pergunta', 'outro')),
  estado text not null,
  em_resposta_a uuid references public.crm_mensagens (id) on delete set null,
  campanha_id text,
  message_id text unique,
  criado_em timestamptz not null default now(),
  check (
    (direcao = 'entrada' and estado in ('nova', 'tratada'))
    or (direcao = 'saida' and estado in ('rascunho', 'enviada', 'descartada'))
  )
);
create index crm_mensagens_contacto_idx on public.crm_mensagens (contacto_id);
create index crm_mensagens_em_resposta_a_idx on public.crm_mensagens (em_resposta_a);
create index crm_mensagens_por_tratar_idx on public.crm_mensagens (criado_em) where direcao = 'entrada' and estado = 'nova';

alter table public.crm_mensagens enable row level security;
create policy crm_mensagens_equipa on public.crm_mensagens for all to authenticated
  using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));
revoke all on public.crm_mensagens from anon, public;
grant select, insert, update, delete on public.crm_mensagens to authenticated;
