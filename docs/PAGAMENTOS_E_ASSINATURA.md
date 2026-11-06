# Pagamentos e assinatura — recomendação (19/10/2026)

## Parceiro de pagamentos

O que precisamos: receber a garantia, o adiantamento e a comissão; reter durante algumas semanas; devolver ou
transferir por instrução da plataforma; pagamentos por Multibanco, MB WAY, cartão e transferência SEPA; faturação
da comissão com IVA.

| Opção | A favor | Contra |
| --- | --- | --- |
| **Stripe Connect** | Integração simples e bem documentada; Multibanco, MB WAY, cartões e SEPA; contas para pintores com verificação de identidade (KYC); retenção de fundos e transferências por instrução | Feito para pagamentos rápidos: reter dinheiro durante semanas e devolver a quem pagou exige confirmar com a Stripe e o advogado que o modelo é aceite; custos por transação |
| **Mangopay** | Instituição de moeda eletrónica europeia, feita para marketplaces com retenção (carteiras por utilizador, *escrow*); modelo de retenção mais natural | Integração mais trabalhosa; MB WAY e Multibanco a confirmar |
| **Lemonway** | Semelhante ao Mangopay (instituição de pagamento francesa, marketplaces, *escrow*) | Idem |
| **easypay / ifthenpay** | Portugueses, Multibanco e MB WAY nativos, baratos | Não fazem retenção por conta de terceiros nem contas de vendedores: a plataforma acabaria a guardar dinheiro |

**Sugestão:** começar a conversa com a **Stripe** (Connect, *separate charges and transfers*) e, em paralelo, com a
**Mangopay**. Escolher a que aceitar por escrito o nosso modelo de retenção (pergunta A1 ao advogado). Se a
Stripe aceitar, é a mais rápida de integrar; se não, a Mangopay é a que melhor encaixa no modelo. As duas
devolvem confirmações automáticas que substituem as confirmações manuais da equipa em `/app/contratacoes`.

## Assinatura com Chave Móvel Digital

Sim, dá: em vez de integrar um serviço pago de assinatura, a plataforma pode **pedir o PDF assinado na aplicação
gratuita Autenticação.gov** e verificá-lo.

1. A plataforma gera o PDF do contrato e guarda o resumo SHA-256 dos bytes.
2. A parte descarrega o PDF, assina com Chave Móvel Digital (ou Cartão de Cidadão) na Autenticação.gov e carrega o
   PDF assinado.
3. A plataforma verifica:
   - que o PDF assinado **começa exatamente pelos bytes do PDF gerado** (a assinatura PAdES é acrescentada ao fim
     do ficheiro, sem alterar o que já lá estava) — prova de que o teor é o que a plataforma redigiu, sem ser
     preciso "ler" o texto;
   - que existe uma assinatura que cobre o ficheiro todo e é criptograficamente válida;
   - o nome do signatário no certificado (para comparar com o representante esperado).
4. O segundo signatário assina o PDF já assinado pelo primeiro; a verificação repete-se.

Para a validação completa da cadeia de confiança (certificado emitido pelo Estado português, não revogado) pode
usar-se o serviço de validação europeu DSS ou a lista de confiança portuguesa. Isto fica para a fase seguinte; a
verificação dos bytes e da assinatura já impede que se troque o texto.

Como o contrato é gerado pela plataforma, também mostramos ao lado o **texto do contrato em linguagem simples**
(o que cada cláusula quer dizer), gerado a partir dos mesmos dados.

## Implementado (19/10/2026)

- `src/lib/contractPdf.ts`: PDF do contrato determinístico (sem identidades, para servir às duas partes).
- `src/domain/signature.ts`: verificações estruturais (contém o documento esperado; uma assinatura nova que
  cobre o ficheiro inteiro).
- `src/lib/pades.ts`: verificação criptográfica da assinatura CMS e leitura do nome e número do titular.
- Percurso: o cliente assina o PDF gerado; o pintor assina o PDF já assinado pelo cliente. Os PDF ficam no
  armazenamento `contratos`, sem possibilidade de alteração.
- Cadeia de confiança: o certificado do signatário tem de encadear numa das entidades "Cartão de Cidadão
  001–008" do Estado (`src/lib/trust/anchors.ts`, descarregadas do site oficial; a 008 desde 05/11/2026, ver
  `DECISOES.md`); a cadeia completa-se pelo endereço do emissor (AIA) quando não vem no PDF. Se a cadeia for
  avaliada e não encadear, a assinatura é recusada (decisão de 24/10/2026); se ficar por completar por uma
  falha de rede, é aceite e fica "por confirmar" no backoffice. Valida-se o certificado do signatário (em
  último na lista do pkijs, que valida o último), na data de agora, e o OCSP pergunta ao emissor do caminho
  validado (05/11/2026).
- **Revogação (22/10/2026):** consultada por OCSP (`checkRevocation` em `src/lib/pades.ts`) ao responder indicado
  no próprio certificado; uma resposta "revogado" com assinatura válida impede a confiança, qualquer outro caso
  (sem responder, responder em baixo, resposta inconclusiva) falha aberto, como o resto desta verificação. CRL
  não foi implementada — fica como reforço futuro, opcional: a infraestrutura do Cartão de Cidadão publica OCSP,
  que já cobre o caso que importa (um certificado revogado é recusado).
- Para testes sem Chave Móvel Digital: `PERMITIR_ACEITACAO_SIMPLES=1` no ambiente volta a mostrar a aceitação
  com caixa de confirmação. Nunca em produção.

## Cadeia de confiança: quem assina pode obrigar a entidade? (05/11/2026)

A cadeia acima responde a «este certificado é do Estado e não foi revogado?». Não responde a «esta pessoa pode
assinar por esta empresa, ou por este condomínio?». Desde 05/11/2026 há um terceiro elo, que **avisa e nunca
recusa** (decisão do promotor; detalhe em `DECISOES.md`, «Poderes de quem assina»):

1. **Assinatura válida** sobre o contrato gerado (bytes e CMS) — recusa se falhar.
2. **Certificado do Estado** (âncoras «Cartão de Cidadão», OCSP) — recusa se a cadeia for recusada; «por
   confirmar» se ficar indeterminada por falha de rede.
3. **Poderes de representação** (`src/domain/poderes.ts`) — o nome do certificado (CN) comparado com quem tem
   poderes segundo a certidão permanente (sociedades, administradoras, fornecedores), a ata de nomeação
   (condomínios) ou o titular da conta (particulares e empresários em nome individual). A certidão é lida à mão
   pela equipa a partir do código de acesso que a empresa entrega — a leitura automática precisa de autorização
   do IRN. O resultado fica no acontecimento da assinatura (`payload.poderes`), aparece a quem assina e, quando
   não confere, numa banda âmbar no topo da contratação, para as duas partes e para a equipa.

O terceiro elo compara **só nomes**: o certificado não traz NIF, e a certidão não traz o n.º de identificação
civil. Um «confere» é um indício, não uma prova. Ficam por tratar o SCAP (o atributo «gerente» na própria
assinatura, que provaria a qualidade de quem assina) e a LTV (carimbo temporal e revogação embebidos no PDF).
A outra parte vê só o resultado, nunca os dados da certidão (regra 6).
