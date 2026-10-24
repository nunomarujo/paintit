-- O pintor passa a poder ler o levantamento concluído da obra que está a orçamentar.
--
-- Até aqui, `request_surveys_select` (20261023143643) só deixava ver: o cliente dono do pedido, o
-- vendedor atribuído, e os fornecedores da zona enquanto o levantamento está por reservar. **O pintor
-- não tinha leitura nenhuma** — nem sobre um levantamento concluído da obra que vê publicada.
--
-- Isso passou despercebido porque as duas funcionalidades que o pintor tem sobre o levantamento
-- (`request_painter_doubt`, 20261024010647; `rate_survey_info`, 20261024010704) são `security definer`:
-- funcionam sem o pintor ter leitura, e por isso os testes dessas funções passavam na mesma. Só ao
-- construir o ecrã é que a falta aparece — sem poder ler a linha, a aplicação não sabe sequer que existe
-- um levantamento concluído para oferecer "avaliar a informação" ou "pedir esclarecimento". Encontrado
-- em 24/10/2026 a confirmar as políticas na base real, não só nos ficheiros (regra 7 do CLAUDE.md).
--
-- O acesso é o mesmo que já guarda as duas funções, nem mais um bocadinho: só um pintor
-- (`private.is_painter()`), só sobre um levantamento **concluído**, e só enquanto o anúncio da obra
-- estiver **aberto**. Nada disto revela quem é o vendedor ao pintor na interface: as colunas de
-- identificação do vendedor existem na linha, mas o anonimato continua a ser garantido pelo que os
-- ecrãs mostram (CLAUDE.md, regra 6) — o pintor nunca vê nome nem contacto de ninguém, aqui como no
-- resto da plataforma, e a lista de dúvidas continua a não identificar quem perguntou.

alter policy request_surveys_select on public.request_surveys using (
  private.can_access_org(private.request_org(request_id))
  or (vendedor_org_id is not null and private.has_role(vendedor_org_id, array['proprietario', 'gestor', 'vendedor', 'financeiro']::public.member_role[]))
  or (
    status = 'aberto'
    and exists (
      select 1 from public.org_members m join public.organizations o on o.id = m.org_id
      where m.user_id = (select auth.uid())
        and o.kind = 'fornecedor'
        and m.role in ('proprietario', 'gestor', 'vendedor')
        and private.supplier_covers(m.org_id, private.request_concelho(request_surveys.request_id))
    )
  )
  or (status = 'concluido' and private.is_painter() and private.listing_open(request_id))
);
