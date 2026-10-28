-- Trabalho a mais que o pintor faz e decide não cobrar (pedido do promotor, 28/10/2026).
--
-- Até aqui uma adenda tinha de ter preço: `valor_cents > 0`, e o cliente aceitava ou recusava. Mas
-- há um caso real que não cabia lá e que vale dinheiro de outra maneira: o pintor fez trabalho que
-- não estava contratado e **não quer cobrá-lo**. Continua a querer que o cliente saiba — é
-- precisamente esse o ponto. «Vê? Fiz isto a mais que não estava contratado e nem lhe cobro por
-- isso» é a melhor propaganda que um pintor tem, e hoje não tem onde a registar.
--
-- Fica um estado próprio, `oferecido`, e não um preço a zero com um campo à parte:
--
--   * `proposta` espera resposta; `oferecido` não espera nada — não há preço para o cliente aceitar,
--     e deixá-lo na fila de "à espera do cliente" seria mentir ao pintor sobre o que está pendente;
--   * não acresce ao valor da obra, pela mesma regra de sempre (só `aceite` acresce);
--   * fica no registo da obra, com data, para o relatório de entrega — que é para onde isto vai.
--
-- O valor deixa de ser obrigatoriamente positivo, mas só pode ser zero quando é oferta: assim não
-- se cria por engano uma adenda a zero que devia ter preço.

alter table public.worksite_addenda drop constraint if exists worksite_addenda_valor_cents_check;
alter table public.worksite_addenda drop constraint if exists worksite_addenda_estado_check;

alter table public.worksite_addenda
  add constraint worksite_addenda_estado_check
    check (estado in ('proposta', 'aceite', 'recusada', 'retirada', 'oferecido'));

alter table public.worksite_addenda
  add constraint worksite_addenda_valor_check
    check (
      (estado = 'oferecido' and valor_cents >= 0)
      or (estado <> 'oferecido' and valor_cents > 0)
    );

comment on column public.worksite_addenda.valor_cents is
  'Preço sem IVA. Zero só é admissível em adendas oferecidas (estado = oferecido).';

-- A data da resposta é do servidor. Uma oferta não espera resposta do cliente: fica datada no
-- momento em que o pintor a regista, para o relatório de entrega a poder mostrar em ordem.
create or replace function private.addenda_answer_time() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.estado is distinct from old.estado and new.estado in ('aceite', 'recusada', 'oferecido') then
    new.respondida_em := now();
  end if;
  return new;
end $$;
