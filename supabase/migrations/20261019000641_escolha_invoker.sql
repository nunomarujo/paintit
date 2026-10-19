-- A escolha corre com os direitos de quem chama: as políticas RLS e o gatilho
-- das propostas já garantem que só quem gere o pedido escolhe.
alter function public.select_proposal(uuid) security invoker;
