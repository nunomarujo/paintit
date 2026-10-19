# Domínio quempinta.pt e email

Domínio comprado em dominios.pt (20/10/2026). Contacto provisório: quempinta.pt@gmail.com.

## 1. Alojamento da app (antes do DNS)

Feito a 20/10/2026: projeto Vercel `paintit` (equipa quempintapt-8835), a partir de `nunomarujo/paintit`,
endereço provisório **https://paintit-one.vercel.app** (o `paintit.vercel.app` é de outra pessoa). Variáveis
secretas colocadas pelo promotor; webhook do Stripe e URLs do Supabase apontam para este endereço.

Recomendação: **Vercel** (Next.js nativo, região de Frankfurt/Paris). Criar o projeto a partir do repositório,
com as variáveis de `.env.example`. A chave secreta do Supabase só entra nas variáveis da Vercel, nunca no
repositório.

## 2. DNS no painel da dominios.pt

| Tipo | Nome | Valor | Para quê |
| --- | --- | --- | --- |
| A | `@` | `76.76.21.21` | quempinta.pt → Vercel |
| CNAME | `www` | `cname.vercel-dns.com` | www.quempinta.pt → Vercel |

A Vercel mostra os valores exatos ao adicionar o domínio; se forem diferentes, valem os dela.

## 3. Email @quempinta.pt com o Gmail (sem custo)

**Receber:** reencaminhamento de email. Se a dominios.pt não o oferecer, mudar os servidores de nomes para a
Cloudflare (grátis) e usar o *Email Routing*: `geral@quempinta.pt` → quempinta.pt@gmail.com. A Cloudflare cria os
registos MX e SPF.

**Enviar como @quempinta.pt no Gmail:**
1. Ativar a verificação em dois passos na conta Google e criar uma *palavra-passe de aplicação*.
2. Gmail → Definições → Contas → *Enviar email como* → adicionar `geral@quempinta.pt`, servidor
   `smtp.gmail.com`, porta 587, utilizador quempinta.pt@gmail.com e a palavra-passe de aplicação.
3. Confirmar com o código que chega (pelo reencaminhamento).

**Emails da app** (confirmação de conta, avisos): usar um serviço transacional, recomendado **Resend**, com
remetente `avisos@quempinta.pt`. Configura-se no Supabase → Authentication → SMTP. O Resend dá os registos SPF e
DKIM a acrescentar ao DNS. Sem isto, os emails do Supabase têm limite baixo e caem no spam.

## 4. Supabase

Authentication → URL Configuration: *Site URL* `https://quempinta.pt` e *Redirect URLs* `https://quempinta.pt/**`.
