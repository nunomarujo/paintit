-- Respostas do promotor de 06/11/2026 (`docs/DECISOES.md`, «Respostas às 12 questões»). Aditiva.
--
-- 1. As zonas comuns usam a ferramenta do interior: quatro tipos de divisão novos em `request_rooms`
--    (átrio, patamar, corredor comum, escadas). As escadas ficam por medir até haver regra própria — é o
--    servidor que o garante (`areasDaDivisao`), não a base.
-- 2. O relatório do percurso negocial pode ser pedido também pelo **pintor contratado** (o pintor de uma
--    contratação desse pedido). Leva a sua versão própria (`pintor`): sem o que a plataforma lhe cobrou e sem
--    nada das outras propostas. O pedido diz de que lado vem; a base confirma que quem pede é dessa parte.

alter table public.request_rooms drop constraint if exists request_rooms_tipo_check;
alter table public.request_rooms add constraint request_rooms_tipo_check check (tipo in (
  'sala', 'quarto', 'cozinha', 'wc', 'corredor', 'hall', 'escritorio', 'arrumos', 'marquise', 'outra',
  'atrio', 'patamar', 'corredor_comum', 'escadas'
));

alter table public.pedidos_de_relatorio add column if not exists lado text not null default 'cliente' check (lado in ('cliente', 'pintor'));

create or replace function private.pedido_de_relatorio_valido() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.lado = 'cliente' and not exists (select 1 from public.work_requests r where r.id = new.request_id and r.org_id = new.org_id) then
    raise exception 'O relatório pede-o a entidade que fez o pedido.';
  end if;
  if new.lado = 'pintor' and not exists (
    select 1 from public.engagements e where e.request_id = new.request_id and e.painter_org_id = new.org_id
  ) then
    raise exception 'O relatório pede-o o pintor contratado nesta obra.';
  end if;
  new.pedido_em := now();
  new.pedido_por := coalesce((select auth.uid()), new.pedido_por);
  perform private.registar(new.request_id, null, new.org_id, null, 'relatorio_pedido',
    jsonb_build_object('motivo', new.motivo, 'nota', new.nota, 'pedido_por', new.pedido_por, 'lado', new.lado));
  return new;
end $$;

alter table public.relatorios_do_percurso drop constraint if exists relatorios_do_percurso_destinatario_check;
alter table public.relatorios_do_percurso add constraint relatorios_do_percurso_destinatario_check check (destinatario in ('backoffice', 'cliente', 'pintor'));
alter table public.relatorios_do_percurso drop constraint if exists relatorios_do_percurso_cliente_tem_pedido;
alter table public.relatorios_do_percurso add constraint relatorios_do_percurso_cliente_tem_pedido check (destinatario = 'backoffice' or pedido_id is not null);

create or replace function private.relatorio_emitido() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.emitido_em := now();
  perform private.registar(new.request_id, null, null, null, 'relatorio_emitido',
    jsonb_build_object('relatorio_id', new.id, 'destinatario', new.destinatario, 'versao', new.versao, 'sha256', new.sha256, 'pedido_id', new.pedido_id));
  if new.destinatario in ('cliente', 'pintor') then
    perform private.registar(new.request_id, null, null, null, 'relatorio_entregue',
      jsonb_build_object('relatorio_id', new.id, 'pedido_id', new.pedido_id, 'sha256', new.sha256, 'destinatario', new.destinatario));
  end if;
  return new;
end $$;

drop policy if exists relatorios_do_percurso_select on public.relatorios_do_percurso;
create policy relatorios_do_percurso_select on public.relatorios_do_percurso for select to authenticated
  using (
    private.is_platform_admin()
    or (destinatario in ('cliente', 'pintor') and exists (
      select 1 from public.pedidos_de_relatorio p where p.id = pedido_id and p.lado = destinatario and private.can_access_org(p.org_id)
    ))
  );
