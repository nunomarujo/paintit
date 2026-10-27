-- O registo dos toques (27/10/2026).
--
-- A plataforma passa a avisar sozinha: a janela de esclarecimentos abriu, a janela vai fechar — e,
-- a seguir, o orçamento está há dias sem resposta e a factura venceu. Tudo isso é enviado por uma
-- tarefa diária, e uma tarefa diária tem de poder correr duas vezes sem incomodar ninguém duas
-- vezes. É para isso que esta tabela existe: a chave única (tipo, alvo, destinatário) é a garantia,
-- e não a memória da tarefa.
--
-- Só o serviço escreve aqui. Não há políticas de acesso de propósito: nem o cliente nem o pintor
-- têm nada a ler nesta tabela, e o que lhes interessa — o aviso — chega-lhes por email.
create table if not exists public.toques (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  -- O que foi tocado: hoje o pedido; amanhã o orçamento próprio ou a obra por receber.
  alvo uuid not null,
  destinatario text not null,
  enviado_em timestamptz not null default now(),
  unique (tipo, alvo, destinatario)
);

alter table public.toques enable row level security;
revoke all on public.toques from anon, authenticated;

create index if not exists toques_alvo_idx on public.toques (alvo);

comment on table public.toques is
  'Avisos automáticos já enviados. A chave única impede repetir o mesmo toque à mesma pessoa.';
