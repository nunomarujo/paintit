# Decisões

Questões jurídicas, fiscais e regulamentares, com propostas de resposta:
[Paint it — Questões jurídicas para validação](https://claude.ai/code/artifact/6ac31246-9446-4e07-a622-2022b58cdcb3)
(Claude Docs). Requisitos de base: Documento Mestre de Requisitos v0.3 (17/10/2026).

## Decididas pelo promotor

| Data | Tema | Decisão |
| --- | --- | --- |
| 18/10/2026 | Comissão | 3% do valor sem IVA, mínimo 150 €, sem teto; IVA acresce; paga pelo pintor |
| 18/10/2026 | Garantia do cliente | 3% do valor sem IVA, depositada depois da aprovação do condomínio |
| 18/10/2026 | Adiantamento de adjudicação | Depositado com a garantia, se a proposta o previr; guardado até à assinatura |
| 18/10/2026 | Momento da comissão | Gerada na apresentação, definitiva na assinatura |
| 18/10/2026 | Ordem de assinatura | O cliente assina a minuta primeiro; o pintor assina depois de pagar o fee |
| 18/10/2026 | Prazo do fee | 8 dias corridos; conta a receção na conta |
| 18/10/2026 | Perda das garantias | Só a parte culpada perde a sua; a plataforma nunca fica com as duas |
| 18/10/2026 | Papel da plataforma | Termina na assinatura das duas partes; depois só guarda prova |
| 18/10/2026 | Assinatura eletrónica | Chave Móvel Digital é suficiente |
| 18/10/2026 | Fotografias | Só servem para o volume 3D não reconhecível; pormenores só se não identificarem o prédio |
| 18/10/2026 | Volume 3D e fotografias | O volume é gerado dos dados do prédio (pisos, fachadas, varandas), nunca de fotografias. Fotografias gerais ficam privadas; as de pormenor só chegam aos pintores depois de revisão humana pela equipa da plataforma. Metadados (GPS, aparelho) retirados de todas |
| 18/10/2026 | Código existente | O protótipo v0.5 é referência funcional; a app é escrita de raiz |
| 18/10/2026 | Stack | Next.js, TypeScript, Postgres na UE, parceiro de pagamentos autorizado |
| 18/10/2026 | Base de dados | Projeto Supabase "Paint it" na organização mar-nordico, região eu-west-1 |
| 18/10/2026 | Entrada | Link por email, sem palavra-passe |
| 18/10/2026 | Administradoras | Uma administradora gere vários condomínios; cada condomínio tem NIF, prédios e pedidos próprios |

## Notas técnicas em aberto

- Dois avisos de desempenho no Supabase ("várias políticas permissivas" em `org_members` e `profiles`): as políticas
  foram somadas em vez de substituídas, porque o `drop` exige confirmação manual. Sem efeito na segurança; fundir
  numa migração futura, com confirmação.
- Índice redundante `org_documents_building_id_idx`: remover na mesma migração.

## Passos pendentes do promotor

| Onde | O quê | Valor |
| --- | --- | --- |
| Supabase › Authentication › URL Configuration | Site URL e Redirect URLs, quando houver domínio | `https://<domínio>` e `https://<domínio>/auth/confirmar` |
| Supabase › Authentication › SMTP | Envio de emails por um serviço próprio (o envio de origem tem limites baixos e cai no spam) | Por escolher |
| Alojamento | Publicar a app (por exemplo Vercel, região UE) com as variáveis de `.env.example` | Por decidir |

## Em aberto (com a proposta implementada por omissão)

| Tema | Proposta em vigor no código | Onde |
| --- | --- | --- |
| Prazo para o pintor assinar depois de pagar | 8 dias corridos | `rules.ts`, `signDeadlineDays` |
| Garantia quando o pintor falha e o cliente não continua | Devolvida por inteiro | `closeWithoutContract` |
| Adiantamento durante um litígio | Devolvido logo ao cliente | `openDispute` |
| Mínimo de 150 € na garantia do cliente | Aplica-se | `rules.ts`, `guaranteeMinCents` |
| Nome e marca | "Paint it", provisório | `src/config/brand.ts` |
| Parceiro de pagamentos | Por escolher (questão A1). Até lá, a equipa da plataforma regista à mão cada confirmação do parceiro (depósito e comissão), com a hora de receção | `/app/contratacoes/[id]` |
| Assinatura com Chave Móvel Digital | Por contratar o serviço. Até lá, a assinatura na plataforma regista a aceitação, a hora e o resumo SHA-256 do texto aceite | `src/app/app/contratacoes/actions.ts` |
| Momento da apresentação | Quando a comissão do pintor é confirmada dentro do prazo: as partes passam a ver-se, só para essa obra | `isRevealed` em `contracting.ts` |
| Texto da minuta | Gerado da proposta e da ficha da obra; deve ser revisto por um advogado | `contractDraft` em `contracting.ts` |
