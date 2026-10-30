-- Quem Pinta — o logótipo da empresa de pintura (30/10/2026).
--
-- O lugar já lá estava. A 29/10/2026 o cabeçalho do orçamento tinha o logótipo da Quem Pinta, e o
-- promotor corrigiu: «no orçamento, a Quem Pinta continua a ocupar o lugar onde deveria sobressair a
-- empresa de pintura». O lugar passou a estar **reservado** — uma caixa a tracejado que diz que ali
-- falta um nome — mas não havia nada para lá pôr: a empresa não tinha onde guardar o seu logótipo.
-- Isto é o que faltava.
--
-- ## Cofre público, e porquê
--
-- Os outros cofres desta base são privados e abrem-se com um link assinado de 60 segundos. Para um
-- logótipo, isso seria errado por duas razões. A primeira é prática: um orçamento guardado em PDF
-- hoje e aberto amanhã teria um buraco no cabeçalho, porque o link já expirou. A segunda é de
-- fundo: o logótipo de uma empresa é a coisa que ela mais quer que se veja — está no site dela, na
-- carrinha e na fatura. Não é um segredo.
--
-- **O anonimato não se defende aqui.** Defende-se onde sempre se defendeu: antes da apresentação, o
-- documento não mostra o logótipo nem o nome (`revelado` em `ProposalDocument`). O caminho leva um
-- uuid, por isso não se adivinha sem se ter o identificador da organização — e esse, antes da
-- apresentação, o cliente não tem.

alter table public.organizations add column logotipo_path text;

comment on column public.organizations.logotipo_path is
  'Caminho do logótipo no cofre público "logotipos". Nulo = sem logótipo; o cabeçalho do orçamento mostra as iniciais.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logotipos', 'logotipos', true, 2097152, array['image/jpeg', 'image/png']);

-- Escrever: só quem manda na empresa. Ler: o cofre é público, não leva política de leitura.
create policy logotipos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logotipos'
    and private.has_role(private.org_from_path(name), array['proprietario', 'gestor']::public.member_role[])
  );
create policy logotipos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'logotipos'
    and private.has_role(private.org_from_path(name), array['proprietario', 'gestor']::public.member_role[])
  );
create policy logotipos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'logotipos'
    and private.has_role(private.org_from_path(name), array['proprietario', 'gestor']::public.member_role[])
  );
