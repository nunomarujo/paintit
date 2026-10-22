-- Token OAuth da Moloni, em cache (válido 1h; o refresh token, 14 dias). Só o servidor (chave secreta) lê e escreve:
-- nenhuma política para utilizadores autenticados, nem para a equipa da plataforma — um token aqui equivale a uma
-- credencial. Linha única (id fixo). Uma instrução por linha.
create table public.moloni_token (id boolean primary key default true check (id), access_token text not null, refresh_token text not null, expires_at timestamptz not null, updated_at timestamptz not null default now());
alter table public.moloni_token enable row level security;
revoke all on public.moloni_token from anon, authenticated;
