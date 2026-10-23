-- Avisos do levantamento por vendedor e expiração da reserva (continuação de
-- 20261023143643_levantamento_por_vendedor.sql, decisão de 23/10/2026, docs/DECISOES.md):
-- - o cliente é avisado quando o levantamento é concluído (a app já promete isto em
--   RequestSurveyCard.tsx: "Avisamos quando o levantamento estiver registado");
-- - se o vendedor que reservou não concluir dentro do prazo (RESERVE_WINDOW_HOURS, 48h,
--   src/domain/survey.ts), a reserva liberta-se e o pedido volta a ficar aberto a qualquer
--   fornecedor da zona — o cliente é avisado, tal como já acontece quando o prazo de um
--   anúncio de propostas termina (private.daily_maintenance, 20261019015913).
-- Mantém-se o anonimato também aqui (CLAUDE.md, regra 6): o aviso nunca nomeia o fornecedor
-- nem o vendedor.

create function private.notify_survey_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = old.status then return new; end if;
  if new.status = 'concluido' then
    perform private.notify(private.request_org(new.request_id), 'O levantamento da obra foi concluído: pode rever e avaliar.', '/app/pedidos/' || new.request_id);
  elsif new.status = 'aberto' and old.status = 'reservado' then
    perform private.notify(
      private.request_org(new.request_id),
      'O profissional que tinha reservado a visita não concluiu o levantamento a tempo: o pedido voltou a ficar disponível para outro profissional.',
      '/app/pedidos/' || new.request_id
    );
  end if;
  return new;
end $$;
revoke all on function private.notify_survey_status() from public, anon, authenticated;

create trigger request_surveys_notify after update on public.request_surveys
  for each row execute function private.notify_survey_status();

-- Mesma função de manutenção diária, corpo completo ("create or replace" substitui-o todo, nunca
-- só acrescenta — os privilégios já revogados na migração original mantêm-se, ligados à função,
-- não ao texto): os três blocos existentes ficam iguais, com um quarto para libertar reservas
-- vencidas de um levantamento.
create or replace function private.daily_maintenance() returns void
language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Europe/Lisbon')::date;
  r record;
begin
  for r in
    update public.org_documents set status = 'expirado'
    where status = 'aprovado' and valido_ate is not null and valido_ate < today
    returning org_id
  loop
    perform private.notify(r.org_id, 'Um documento de verificação expirou: envie a versão atual.', '/app/organizacoes/' || r.org_id);
  end loop;

  for r in
    select org_id from public.org_documents
    where status = 'aprovado' and valido_ate = today + 30
  loop
    perform private.notify(r.org_id, 'Um documento de verificação expira daqui a 30 dias.', '/app/organizacoes/' || r.org_id);
  end loop;

  for r in
    update public.request_listings set aberto = false
    where aberto and prazo_propostas < today
    returning request_id
  loop
    perform private.notify(
      private.request_org(r.request_id),
      'Terminou o prazo de propostas: compare e escolha.',
      '/app/pedidos/' || r.request_id || '/propostas'
    );
  end loop;

  -- Reserva de um levantamento vencida: liberta-se para qualquer fornecedor da zona voltar a
  -- reservar (mesma obra, mesma linha); o aviso ao cliente é o próprio gatilho
  -- request_surveys_notify, que corre nesta mesma transação por causa deste update.
  update public.request_surveys
    set status = 'aberto', vendedor_org_id = null, vendedor_user_id = null,
        reserved_at = null, reserve_deadline = null, contact_notes = '', scheduled_at = null
    where status = 'reservado' and reserve_deadline < now();
end $$;
