-- "O meu Perfil" (26/10/2026, docs/DECISOES.md): o cartão de Dados da entidade passa a mostrar o CAE
-- devolvido pela consulta ao NIF (já feita hoje em createOrganization/updateOrganization, só que o
-- código devolvido ficava a cair fora) e "Equipa online" passa a deixar o proprietário mudar o papel
-- de outro membro — coisa que a política de RLS nunca tinha previsto (só select/insert/delete).

-- O código CAE e a descrição da atividade, tal como a nif.pt os devolve. Não se valida a forma do
-- código aqui (a tabela de CAE não está na base); caeCobrePintura (src/domain/organization.ts) é quem
-- decide se avisa, e é tolerante com um código em falta ou desconhecido — nunca bloqueia.
alter table public.organizations add column if not exists cae text;
alter table public.organizations add column if not exists cae_atividade text;

-- Mudar o papel de um colega: só o proprietário, nunca o próprio papel (para nunca ficar uma entidade
-- sem proprietário por engano) e nunca para 'proprietario' (só há um, atribuído pelo gatilho na
-- criação — promover alguém a proprietário é uma decisão à parte, não uma troca de papel aqui).
create policy org_members_update on public.org_members for update to authenticated
  using (private.has_role(org_id, array['proprietario']::public.member_role[]) and user_id <> (select auth.uid()))
  with check (private.has_role(org_id, array['proprietario']::public.member_role[]) and user_id <> (select auth.uid()) and role <> 'proprietario');

comment on column public.organizations.cae is
  'CAE devolvido pela nif.pt ao consultar o NIF. Informativo; caeCobrePintura decide se avisa o pintor.';
comment on column public.organizations.cae_atividade is 'Descrição textual da atividade, da mesma consulta.';
