-- Poderes de representação (05/11/2026): quem assina um contrato em nome de uma entidade tem poderes para a
-- obrigar? Decisão do promotor: verificar e, mesmo sem impedir, avisar bem à vista. Regras em
-- src/domain/poderes.ts; decisão e limites em docs/DECISOES.md (05/11/2026).
--
-- Versão MANUAL. A leitura automática da certidão permanente é proibida sem autorização do IRN (Termos do
-- portal registo.justica.gov.pt, §4); o pedido de autorização segue por email. Até lá:
--   1. a entidade entrega o código de acesso da certidão (Portaria 285/2012, art. 6.º, n.º 2: entregar o
--      código é entregar a certidão) — `definir_codigo_certidao`;
--   2. a equipa da plataforma abre a certidão no portal e regista quem tem poderes, a forma de obrigar, o
--      número de assinaturas e a validade — `registar_leitura_poderes`. Num condomínio, regista o
--      administrador a partir da ata de nomeação (fonte 'ata'), com a mesma lógica.
--
-- O código dá acesso a dados pessoais de terceiros (moradas, estado civil dos sócios…): é um segredo.
-- Vive numa tabela só sua, que apenas a equipa lê; ninguém o escreve senão pela função, e nunca vai para
-- avisos, registos de erro ou acontecimentos. Da certidão guarda-se o mínimo (RGPD): nome, cargo e NIF
-- (opcional) de quem tem poderes, a forma de obrigar tal como está escrita, o número de assinaturas, a
-- validade, e quem a leu e quando.
--
-- Quem gere a entidade lê a sua própria leitura, com os nomes e os cargos: são dados do seu próprio registo,
-- que ela própria entregou, e vê-los é a única maneira de dar por um erro de transcrição antes de um
-- contrato — não no aviso, depois de assinar. Os outros membros (financeiro, avaliador, leitor) veem só o
-- estado (entregue, lida, válida até), que não tem dados pessoais: é o que lhes diz se a certidão ainda falta.
-- A outra parte de uma contratação nunca lê estas tabelas: vê só o resultado, que fica no acontecimento da
-- assinatura (`engagement_events.payload`).

-- O estado da leitura, uma linha por entidade. Sem segredos: a entidade lê-a.
create table public.poderes_de_representacao (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  -- 'certidao': certidão permanente (sociedades, administradoras, fornecedores). 'ata': ata de nomeação do
  -- administrador (condomínios).
  fonte text not null check (fonte in ('certidao', 'ata')),
  -- Quando a entidade entregou, ou trocou, o código. O código está em `certidao_codigos`.
  codigo_entregue_em timestamptz,
  -- Tal como está na certidão: a regra é texto livre e não se interpreta aqui.
  forma_de_obrigar text check (forma_de_obrigar is null or char_length(forma_de_obrigar) between 1 and 1000),
  -- 1 ou 2. Nulo numa leitura feita = «a confirmar» (forma de obrigar invulgar).
  assinaturas_exigidas smallint check (assinaturas_exigidas in (1, 2)),
  valida_ate date,
  lida_em timestamptz,
  lida_por uuid references auth.users (id) on delete set null,
  -- Uma leitura feita traz sempre a forma de obrigar e a validade; uma por fazer não traz nada da anterior.
  constraint poderes_leitura_coerente check (
    (lida_em is not null and forma_de_obrigar is not null and valida_ate is not null)
    or (lida_em is null and forma_de_obrigar is null and assinaturas_exigidas is null and valida_ate is null)
  )
);

-- Quem tem poderes, segundo a leitura. Apaga-se com ela.
create table public.poderes_membros (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.poderes_de_representacao (org_id) on delete cascade,
  ordem smallint not null check (ordem between 1 and 20),
  nome text not null check (char_length(btrim(nome)) between 1 and 200),
  cargo text not null check (char_length(btrim(cargo)) between 2 and 100),
  nif text check (nif is null or private.nif_valido(nif)),
  unique (org_id, ordem)
);

-- O código de acesso. Só a equipa da plataforma o lê; ninguém o escreve senão pela função.
create table public.certidao_codigos (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  codigo text not null check (codigo ~ '^[0-9]{4}-[0-9]{4}-[0-9]{4}$'),
  definido_por uuid references auth.users (id) on delete set null,
  definido_em timestamptz not null default now()
);

-- `lida_por` e `definido_por` ficam sem índice de propósito: são só para auditoria, em tabelas de uma linha
-- por entidade, e nunca se procura por eles.

alter table public.poderes_de_representacao enable row level security;
alter table public.poderes_membros enable row level security;
alter table public.certidao_codigos enable row level security;

revoke all on public.poderes_de_representacao, public.poderes_membros, public.certidao_codigos from anon;
-- Só as duas funções abaixo escrevem: nem a entidade nem a equipa mexem nas linhas à mão.
revoke insert, update, delete, truncate on public.poderes_de_representacao, public.poderes_membros, public.certidao_codigos
  from authenticated;

-- O estado: qualquer membro da entidade (e a administradora que gere o condomínio), e a equipa
-- (`can_access_org` inclui-a). Os nomes e cargos: só quem gere a entidade, e a equipa — os outros membros
-- não precisam deles para nada.
create policy poderes_de_representacao_select on public.poderes_de_representacao for select to authenticated
  using (private.can_access_org(org_id));
create policy poderes_membros_select on public.poderes_membros for select to authenticated
  using (private.can_manage_org(org_id) or (select private.is_platform_admin()));
-- O código: só a equipa. Nem quem o entregou o volta a ler — o ecrã mostra o estado, nunca o código.
create policy certidao_codigos_select on public.certidao_codigos for select to authenticated
  using ((select private.is_platform_admin()));

-- (a) A entidade entrega ou troca o código. Trocar põe a leitura por fazer: a certidão pode ser outra (uma
-- gerência nova, uma renovação), e uma leitura antiga não pode responder por ela. O mesmo código outra vez
-- não muda nada.
create or replace function public.definir_codigo_certidao(p_org uuid, p_codigo text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_kind public.org_kind;
  v_digitos text := regexp_replace(coalesce(p_codigo, ''), '[\s-]', '', 'g');
  v_codigo text;
begin
  if not private.can_manage_org(p_org) then
    raise exception 'Sem permissão para indicar o código desta entidade.' using errcode = '42501';
  end if;
  select kind into v_kind from public.organizations where id = p_org;
  if v_kind is null or v_kind not in ('pintor', 'administradora', 'fornecedor') then
    raise exception 'Esta entidade não usa a certidão permanente.' using errcode = 'P0001';
  end if;
  -- A mensagem nunca repete o que se escreveu: pode ser o código verdadeiro com um algarismo a menos.
  if v_digitos !~ '^[0-9]{12}$' then
    raise exception 'O código de acesso tem 12 algarismos (NNNN-NNNN-NNNN).' using errcode = 'P0001';
  end if;
  v_codigo := substr(v_digitos, 1, 4) || '-' || substr(v_digitos, 5, 4) || '-' || substr(v_digitos, 9, 4);

  if exists (select 1 from public.certidao_codigos where org_id = p_org and codigo = v_codigo) then
    return;
  end if;
  insert into public.certidao_codigos (org_id, codigo, definido_por, definido_em)
    values (p_org, v_codigo, (select auth.uid()), now())
    on conflict (org_id) do update
      set codigo = excluded.codigo, definido_por = excluded.definido_por, definido_em = excluded.definido_em;
  delete from public.poderes_membros where org_id = p_org;
  insert into public.poderes_de_representacao (org_id, fonte, codigo_entregue_em)
    values (p_org, 'certidao', now())
    on conflict (org_id) do update
      set fonte = 'certidao', codigo_entregue_em = now(), forma_de_obrigar = null, assinaturas_exigidas = null,
          valida_ate = null, lida_em = null, lida_por = null;
end $$;
revoke all on function public.definir_codigo_certidao(uuid, text) from public, anon;
grant execute on function public.definir_codigo_certidao(uuid, text) to authenticated;

-- (b) A equipa regista a leitura (de novo, se for preciso: substitui a anterior por inteiro).
-- p_membros: [{"nome": "...", "cargo": "...", "nif": "..." | null}, ...], pela ordem da certidão.
create or replace function public.registar_leitura_poderes(
  p_org uuid,
  p_fonte text,
  p_forma_de_obrigar text,
  p_assinaturas smallint,
  p_valida_ate date,
  p_membros jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_kind public.org_kind;
  v_membro jsonb;
  v_ordem smallint := 0;
  v_nif text;
begin
  if not private.is_platform_admin() then
    raise exception 'Só a equipa da plataforma regista a leitura.' using errcode = '42501';
  end if;
  select kind into v_kind from public.organizations where id = p_org;
  if v_kind is null or v_kind = 'particular' then
    raise exception 'Esta entidade não tem poderes de representação a registar.' using errcode = 'P0001';
  end if;
  if p_fonte is distinct from (case when v_kind = 'condominio' then 'ata' else 'certidao' end) then
    raise exception 'Num condomínio lê-se a ata de nomeação; nas outras entidades, a certidão permanente.' using errcode = 'P0001';
  end if;
  if p_forma_de_obrigar is null or btrim(p_forma_de_obrigar) = '' then
    raise exception 'Falta a forma de obrigar.' using errcode = 'P0001';
  end if;
  if p_assinaturas is not null and p_assinaturas not in (1, 2) then
    raise exception 'O número de assinaturas é 1, 2 ou «a confirmar».' using errcode = 'P0001';
  end if;
  if p_valida_ate is null or p_valida_ate < (now() at time zone 'Europe/Lisbon')::date then
    raise exception 'A validade já passou: é precisa uma certidão (ou uma ata) em vigor.' using errcode = 'P0001';
  end if;
  if p_membros is null or jsonb_typeof(p_membros) <> 'array'
     or jsonb_array_length(p_membros) = 0 or jsonb_array_length(p_membros) > 20 then
    raise exception 'Registe entre 1 e 20 pessoas com poderes.' using errcode = 'P0001';
  end if;

  insert into public.poderes_de_representacao (org_id, fonte, forma_de_obrigar, assinaturas_exigidas, valida_ate, lida_em, lida_por)
    values (p_org, p_fonte, btrim(p_forma_de_obrigar), p_assinaturas, p_valida_ate, now(), (select auth.uid()))
    on conflict (org_id) do update
      set fonte = excluded.fonte, forma_de_obrigar = excluded.forma_de_obrigar,
          assinaturas_exigidas = excluded.assinaturas_exigidas, valida_ate = excluded.valida_ate,
          lida_em = excluded.lida_em, lida_por = excluded.lida_por;
  delete from public.poderes_membros where org_id = p_org;
  for v_membro in select value from jsonb_array_elements(p_membros) loop
    v_ordem := v_ordem + 1;
    v_nif := nullif(regexp_replace(coalesce(v_membro ->> 'nif', ''), '[^0-9]', '', 'g'), '');
    insert into public.poderes_membros (org_id, ordem, nome, cargo, nif)
      values (p_org, v_ordem, btrim(coalesce(v_membro ->> 'nome', '')), btrim(coalesce(v_membro ->> 'cargo', '')), v_nif);
  end loop;
end $$;
revoke all on function public.registar_leitura_poderes(uuid, text, text, smallint, date, jsonb) from public, anon;
grant execute on function public.registar_leitura_poderes(uuid, text, text, smallint, date, jsonb) to authenticated;
