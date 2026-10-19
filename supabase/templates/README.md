# Emails de autenticação (Supabase Auth → Email Templates)

| Modelo no Supabase | Assunto | Ficheiro |
| --- | --- | --- |
| Confirm signup | Confirme o seu email — Quem Pinta | confirmar-conta.html |
| Magic Link | O seu link de entrada — Quem Pinta | link-entrada.html |
| Change Email Address | Confirme o novo email — Quem Pinta | mudar-email.html |
| Reset Password | Nova palavra-passe — Quem Pinta | recuperar.html |

Envio: SMTP do Resend (Authentication → SMTP Settings): host `smtp.resend.com`, porta `465`, utilizador
`resend`, palavra-passe = chave API do Resend, remetente `avisos@quempinta.pt`, nome `Quem Pinta`.
