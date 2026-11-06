-- Números de WhatsApp confirmados por mensagem recebida (06/11/2026).
--
-- A falha: o número que recebe os avisos era um campo de texto. Qualquer conta escrevia o telemóvel de outra
-- pessoa e a plataforma passava a mandar-lhe mensagens de trabalho — sem que ela soubesse, sem consentimento, e
-- com o risco de denúncias que a Meta pune no número da plataforma.
--
-- A correção (decisão do promotor, 06/11/2026): o número deixa de ser escrito. A pessoa pede um código e envia-o,
-- por WhatsApp, para o número da plataforma; o que prova que o telemóvel é dela é o próprio WhatsApp, que diz de
-- que número veio a mensagem (o webhook já o usa no «Aceito»). A base fica com o que o webhook lhe entrega.
--
--   · `whatsapp_numeros`: os números em vigor, até três por conta, um número em uma conta de cada vez. Só se lê
--     (a própria pessoa); só se escreve pelas funções abaixo.
--   · `whatsapp_codigos`: o código pendente de cada pessoa — guardado só pelo resumo SHA-256, válido 15
--     minutos, de uso único.
--   · `whatsapp_tentativas`: quem acerta no código tem de falhar pouco; cinco enganos por hora e por número.
--   · `survey_availability.telemovel_whatsapp` passa a ser **derivado**: o número confirmado mais recente da
--     pessoa. Todos os sítios que enviam (avisos, contrato, convites dos avaliadores) continuam a ler dali, e
--     por isso só enviam a números confirmados. Um gatilho recusa qualquer escrita nessa coluna que não venha
--     destas funções (ou da chave de serviço): sem ele, a pessoa escrevia o número direto pela API.
--
-- Os números que já estavam escritos (dois, de teste) deixam de valer: ficam sem número e sem consentimento até
-- serem associados pelo novo caminho.

create table public.whatsapp_numeros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  numero text not null check (numero ~ '^\+[0-9]{8,15}$'),
  confirmado_em timestamptz not null default now(),
  unique (numero)
);
create index whatsapp_numeros_user_idx on public.whatsapp_numeros (user_id);

create table public.whatsapp_codigos (
  user_id uuid primary key references auth.users (id) on delete cascade,
  codigo_hash text not null,
  expira_em timestamptz not null,
  criado_em timestamptz not null default now()
);

create table public.whatsapp_tentativas (
  numero text not null,
  em timestamptz not null default now()
);
create index whatsapp_tentativas_numero_idx on public.whatsapp_tentativas (numero, em desc);

alter table public.whatsapp_numeros enable row level security;
alter table public.whatsapp_codigos enable row level security;
alter table public.whatsapp_tentativas enable row level security;
revoke all on public.whatsapp_numeros, public.whatsapp_codigos, public.whatsapp_tentativas from public, anon, authenticated;
grant select on public.whatsapp_numeros to authenticated;
create policy whatsapp_numeros_dona_le on public.whatsapp_numeros for select to authenticated using (user_id = (select auth.uid()));

comment on table public.whatsapp_numeros is
  'Números de WhatsApp confirmados por mensagem recebida (até 3 por conta; um número em uma conta de cada vez). Migração 20261106201807.';
comment on table public.whatsapp_codigos is
  'Código pendente de associação de um número (só o resumo SHA-256, 15 minutos, uso único). Ninguém com sessão lê.';

create function private.max_numeros_whatsapp() returns int
language sql immutable set search_path = '' as $$ select 3 $$;

-- O número que as outras partes da aplicação leem: o confirmado mais recente. Sem nenhum, sem consentimento
-- (a restrição `survey_availability_whatsapp_com_numero` exige número para o consentimento valer).
create function private.recalcular_numero_whatsapp(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_numero text;
begin
  select numero into v_numero from public.whatsapp_numeros where user_id = p_user order by confirmado_em desc, id limit 1;
  perform set_config('app.numero_whatsapp_ok', '1', true);
  insert into public.survey_availability (user_id, alerta_whatsapp, telemovel_whatsapp)
    values (p_user, v_numero is not null, v_numero)
    on conflict (user_id) do update
      set telemovel_whatsapp = excluded.telemovel_whatsapp,
          alerta_whatsapp = case when excluded.telemovel_whatsapp is null then false else public.survey_availability.alerta_whatsapp end;
  perform set_config('app.numero_whatsapp_ok', '', true);
end $$;
revoke all on function private.recalcular_numero_whatsapp(uuid) from public, anon, authenticated;

-- Os dois números de teste que já lá estavam, escritos à mão: deixam de valer (antes do gatilho, para este
-- `update` não lhe tocar).
update public.survey_availability set alerta_whatsapp = false, telemovel_whatsapp = null where telemovel_whatsapp is not null;

-- Quem escreve o número: só as funções abaixo (que põem a marca da transação) ou a chave de serviço (sem sessão).
create function private.numero_whatsapp_so_pelo_servidor() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.telemovel_whatsapp is null then return new; end if;
  elsif new.telemovel_whatsapp is not distinct from old.telemovel_whatsapp then
    return new;
  end if;
  if (select auth.uid()) is null or coalesce(current_setting('app.numero_whatsapp_ok', true), '') = '1' then
    return new;
  end if;
  raise exception 'O número de WhatsApp só se associa por mensagem enviada desse número.' using errcode = '42501';
end $$;
revoke all on function private.numero_whatsapp_so_pelo_servidor() from public, anon, authenticated;

create trigger survey_availability_numero_whatsapp
  before insert or update on public.survey_availability
  for each row execute function private.numero_whatsapp_so_pelo_servidor();

-- (1) Pedir um código. Devolve-o em claro uma única vez; na base fica o resumo.
create function public.pedir_codigo_whatsapp() returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_codigo text;
begin
  if v_user is null then
    raise exception 'A sessão expirou. Entre de novo.' using errcode = '42501';
  end if;
  if (select count(*) from public.whatsapp_numeros where user_id = v_user) >= private.max_numeros_whatsapp() then
    raise exception 'Já tem % números associados. Remova um para associar outro.', private.max_numeros_whatsapp() using errcode = 'P0001';
  end if;
  -- Os códigos caducados não ficam à espera: limpam-se aqui, a cada pedido.
  delete from public.whatsapp_codigos where expira_em < now();
  v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.whatsapp_codigos (user_id, codigo_hash, expira_em)
    values (v_user, encode(sha256(convert_to(v_codigo, 'utf8')), 'hex'), now() + interval '15 minutes')
    on conflict (user_id) do update
      set codigo_hash = excluded.codigo_hash, expira_em = excluded.expira_em, criado_em = now();
  return 'QP-' || substr(v_codigo, 1, 4) || '-' || substr(v_codigo, 5, 4);
end $$;
revoke all on function public.pedir_codigo_whatsapp() from public, anon;
grant execute on function public.pedir_codigo_whatsapp() to authenticated;

-- (1b) A pessoa desiste: o código deixa de valer já, não daqui a 15 minutos.
create function public.cancelar_codigo_whatsapp() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'A sessão expirou. Entre de novo.' using errcode = '42501';
  end if;
  delete from public.whatsapp_codigos where user_id = v_user;
end $$;
revoke all on function public.cancelar_codigo_whatsapp() from public, anon;
grant execute on function public.cancelar_codigo_whatsapp() to authenticated;

-- (2) O webhook recebeu o código, vindo de `p_numero`. Só a chave de serviço chama: o WhatsApp não traz sessão, e
-- o que autoriza é o código (e a assinatura da Meta, já verificada pelo webhook). Devolve o estado:
-- ok | transferido | ja_associado | invalido | demasiadas | cheio.
create function public.confirmar_numero_whatsapp(p_codigo text, p_numero text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_norm text;
  v_user uuid;
  v_dono uuid;
begin
  if p_numero is null or p_numero !~ '^\+[0-9]{8,15}$' then
    raise exception 'Número inválido.' using errcode = 'P0001';
  end if;
  delete from public.whatsapp_tentativas where em < now() - interval '1 day';
  if (select count(*) from public.whatsapp_tentativas where numero = p_numero and em > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('estado', 'demasiadas');
  end if;

  v_norm := upper(regexp_replace(coalesce(p_codigo, ''), '[^0-9A-Za-z]', '', 'g'));
  if left(v_norm, 2) = 'QP' then v_norm := substr(v_norm, 3); end if;
  select user_id into v_user from public.whatsapp_codigos
    where codigo_hash = encode(sha256(convert_to(v_norm, 'utf8')), 'hex') and expira_em > now()
    for update;
  if v_user is null then
    insert into public.whatsapp_tentativas (numero) values (p_numero);
    return jsonb_build_object('estado', 'invalido');
  end if;
  -- De uso único: gasta-se mesmo que o resto falhe.
  delete from public.whatsapp_codigos where user_id = v_user;

  select user_id into v_dono from public.whatsapp_numeros where numero = p_numero;
  if v_dono = v_user then
    return jsonb_build_object('estado', 'ja_associado', 'user_id', v_user);
  end if;
  if (select count(*) from public.whatsapp_numeros where user_id = v_user) >= private.max_numeros_whatsapp() then
    return jsonb_build_object('estado', 'cheio', 'user_id', v_user);
  end if;
  -- Um número vale em uma conta de cada vez: quem prova que o telemóvel é seu fica com ele (só quem o tem na mão
  -- consegue enviar a mensagem), e a conta anterior perde-o.
  if v_dono is not null then
    delete from public.whatsapp_numeros where numero = p_numero;
    perform private.recalcular_numero_whatsapp(v_dono);
  end if;
  insert into public.whatsapp_numeros (user_id, numero) values (v_user, p_numero);
  perform private.recalcular_numero_whatsapp(v_user);
  -- Pedir o código e enviá-lo é o consentimento: liga os avisos por WhatsApp desta pessoa.
  update public.survey_availability set alerta_whatsapp = true where user_id = v_user;
  return jsonb_build_object('estado', case when v_dono is null then 'ok' else 'transferido' end, 'user_id', v_user);
end $$;
revoke all on function public.confirmar_numero_whatsapp(text, text) from public, anon, authenticated;
grant execute on function public.confirmar_numero_whatsapp(text, text) to service_role;

-- (3) «PARAR», escrito do próprio número: deixa de receber. Só a chave de serviço chama.
create function public.parar_whatsapp(p_numero text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  delete from public.whatsapp_numeros where numero = p_numero returning user_id into v_user;
  if v_user is null then return false; end if;
  perform private.recalcular_numero_whatsapp(v_user);
  return true;
end $$;
revoke all on function public.parar_whatsapp(text) from public, anon, authenticated;
grant execute on function public.parar_whatsapp(text) to service_role;

-- (4) A própria pessoa remove um número seu.
create function public.remover_numero_whatsapp(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'A sessão expirou. Entre de novo.' using errcode = '42501';
  end if;
  delete from public.whatsapp_numeros where id = p_id and user_id = v_user;
  perform private.recalcular_numero_whatsapp(v_user);
end $$;
revoke all on function public.remover_numero_whatsapp(uuid) from public, anon;
grant execute on function public.remover_numero_whatsapp(uuid) to authenticated;
