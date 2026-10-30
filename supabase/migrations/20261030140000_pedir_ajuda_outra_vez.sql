-- Pedir ajuda outra vez depois de ter desistido (defeito apontado pelo promotor, 30/10/2026).
--
-- O cartão da ajuda desaparecia assim que o cliente escolhia «prefiro preencher sozinho», e não
-- havia maneira de voltar atrás: a vaga ficava 'cancelado' e as políticas só deixam o cliente
-- INSERIR uma vaga nova — que o `unique (request_id)` impede, porque a linha antiga está lá.
--
-- Era precisamente ao contrário do que faz sentido: «é exactamente a saída de que o cliente precisa
-- quando fica com dificuldades». Quem desistiu e depois percebeu que não sabe medir tem de poder
-- pedir ajuda outra vez, sem perder nada do que já escreveu.
--
-- Função e não política, para seguir o que já existe (`cancel_survey`, `reserve_survey`): a regra
-- fica num sítio só e o cliente nunca escreve directamente na tabela.

create or replace function public.reabrir_levantamento(p_request uuid) returns public.request_surveys
language plpgsql security definer set search_path = '' as $$
declare
  s public.request_surveys;
begin
  if not private.can_manage_org(private.request_org(p_request)) then
    raise exception 'Sem permissão.' using errcode = 'P0001';
  end if;
  if not private.request_is_draft(p_request) then
    raise exception 'Só um rascunho pode pedir levantamento.' using errcode = 'P0001';
  end if;

  -- Reabrir é limpar quem lá estava: a vaga volta ao mercado como qualquer outra. Os dados do
  -- pedido — zonas, medidas, fotografias — não se tocam: são do cliente e ficam.
  update public.request_surveys
     set status = 'aberto',
         vendedor_org_id = null,
         vendedor_user_id = null,
         reserved_at = null,
         reserve_deadline = null,
         scheduled_at = null
   where request_id = p_request
     and status in ('cancelado', 'expirado')
  returning * into s;

  if s.id is null then
    -- Ou já está activa — e então não se cria uma segunda, que é o pedido duplicado que o promotor
    -- mandou impedir — ou nunca existiu, e cria-se agora.
    select * into s from public.request_surveys where request_id = p_request;
    if s.id is null then
      insert into public.request_surveys (request_id, status)
      values (p_request, 'aberto')
      returning * into s;
    end if;
  end if;
  return s;
end $$;

revoke all on function public.reabrir_levantamento(uuid) from public, anon;
grant execute on function public.reabrir_levantamento(uuid) to authenticated;

comment on function public.reabrir_levantamento(uuid) is
  'Pede o levantamento, ou pede-o outra vez depois de o cliente ter desistido. Nunca cria uma segunda vaga para o mesmo pedido, e nunca mexe nos dados que o cliente já escreveu.';
