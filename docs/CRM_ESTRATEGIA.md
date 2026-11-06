# CRM e promoção — estratégia e bastião de agentes (06/11/2026)

Resposta às três perguntas do promotor sobre o que é fraco no outreach, e desenho do bastião de agentes. É uma proposta
de trabalho, por discutir e corrigir; nada daqui exceto o que está marcado «construído» existe em código.

## 1. Conteúdo: porque alguém clicaria?

Os textos atuais explicam o produto. Ninguém clica para ser informado de um produto: clica por uma razão **concreta, local
e de baixo esforço**. O que se propõe:

- **Abrir pelo problema do destinatário, não pela plataforma.** Pintor: pedidos sem qualificação, tempo perdido a
  orçamentar, obras que não se pagam. Administradora: reunir propostas comparáveis para a assembleia. Fornecedor: ser
  escolhido na loja, não no preço. Os temas certos vêm do dossier (secção 4), não da nossa imaginação.
- **Dar primeiro.** Um ativo útil sem registo: uma calculadora de tinta por área, um modelo de caderno de encargos para
  fachadas de condomínio, um guia de preços por concelho. A plataforma entra como passo seguinte, não como pedido.
- **Prova que se pode verificar**, nunca adjetivos: propostas abertas em simultâneo, contrato assinado na plataforma,
  relatório pronto para a assembleia. Nunca números de propostas (decisão de 02/11/2026).
- **Remetente humano e curto:** de uma pessoa (Nuno), não de uma marca; 80 a 100 palavras; um só botão; assunto específico
  e local. Duas variantes de assunto por campanha e o UCB1 (`src/domain/crm.ts`) favorece a que rende.
- **Honestidade sobre o arranque.** Sem pedidos reais ainda, não se pode dizer «há obras na sua zona». O texto atual diz
  «estamos a abrir em Viana do Castelo», que é verdade.

## 2. Canal: email frio a 30 empresas por dia é pouco?

Não é o volume que limita, é o canal. Em Viana do Castelo o universo de pintores, lojas de tintas e administradoras são
algumas dezenas: dois meses a 20 por dia esgotam-no. Pior, pequenas empresas de pintura vivem no telemóvel e no WhatsApp,
não na caixa de correio. O email frio serve para **administradoras e lojas de tintas** (empresas com secretária); para
pintores é o canal mais fraco. Então:

- **Administradoras:** poucas, de alto valor. Email personalizado + telefonema + visita. Cada uma vale dezenas de prédios.
- **Lojas de tintas (fornecedores):** são o canal de distribuição para os pintores. É ao balcão que o pintor compra;
  um flyer com QR ali, e o fornecedor com interesse comercial em que os pintores usem o catálogo, vale mais do que mil
  emails. Fornecedor primeiro, pintores a seguir.
- **Pintores:** presença onde estão (balcão das lojas, grupos de Facebook locais, recomendação de outro pintor) e, depois
  de haver obras reais, convite direto por quem já os conhece. WhatsApp frio a empresas exige consentimento prévio
  (regras da Meta): só com autorização.
- **Particulares:** nunca email frio (Lei 41/2004). Chegam por pesquisa local, Google Business Profile, flyers com QR e
  recomendação.

## 3. Promoção em geral: arranque de um mercado de dois lados

O problema real não é o email, é o **arranque**: pintores só vêm se houver obras, e as obras só vêm se houver pintores.
Proposta de sequência para **um concelho, um nicho**:

1. **Procura primeiro, no nicho de condomínios** (as administradoras são poucas e decidem por dezenas de prédios): obter
   as primeiras obras reais, mesmo que a plataforma as acompanhe quase à mão.
2. **Oferta a seguir:** com obras reais, convidar pintores com a frase que mais converte: «há uma obra aberta na sua zona».
3. **Presença local:** Google Business Profile, páginas por concelho («pintar fachada de prédio em Viana do Castelo: preços
   e como orçamentar»), antes/depois reais, parcerias com lojas de tintas e associações de administradores/empresariais.
4. **Referências:** a aplicação já tem códigos de recomendação (`referral_codes`); usá-los entre pintores e administradoras.
5. **Redes sociais:** automatizáveis com Postiz (candidato do estudo), alimentadas por casos reais; sem casos reais, não há
   conteúdo honesto. Fica para depois do passo 1.

Métrica por fase: obras publicadas por semana (procura), pintores com proposta enviada (oferta), propostas por obra. O
email mede cliques; o mercado mede-se em obras.

## 4. Dossier em evolução e bastião de agentes

**Dossier** (`crm_dossier`, construído): dores, lacunas e acertos por perfil e por zona, cada um com a medida de quanto a
plataforma o resolve hoje (cobertura 0 a 3). `src/domain/crmDossier.ts` agrupa por tema e dá duas listas: **mensagens
fortes** (dor comum e plataforma resolve → vai para as campanhas) e **lacunas** (dor comum e plataforma não resolve → vai
para o produto). Os temas partilhados entre perfis e zonas pesam mais. Aparece no separador CRM.

**Agentes** (por construir; cada um escreve na base, nenhum envia por si):

| Agente | Faz | Escreve em |
|---|---|---|
| Escuta | lê respostas, notas de chamadas, críticas públicas; extrai dores, lacunas e acertos | `crm_dossier` |
| Estratega | lê resultados por zona e dossier; propõe a campanha seguinte e a próxima zona | rascunho de campanha |
| Redator | escreve variantes de texto a partir dos temas mais fortes | `crm_campanhas` em rascunho |
| Caixa | classifica respostas; redige respostas; responde só nas categorias seguras | `crm_eventos` |
| Auditor | verifica cada afirmação do texto contra o produto e as regras (comissão ao cliente, nº de propostas, particulares) | bloqueia o rascunho |
| Analista | relatório semanal do que funcionou | resumo no separador CRM |

Autonomia: só campanhas novas ou corrigidas esperam pelo promotor. Tudo o resto corre sozinho, com limites diários e a
porta legal na base de dados. A API do Claude entra nos agentes Escuta, Redator, Caixa e Auditor, com orçamento mensal fixo.

**Fonte do dossier por indicar:** o promotor referiu informação num «founder-skill» onde clientes levantam críticas,
apontam lacunas e indicam acertos. Não está neste repositório, e o que a pesquisa no Drive devolveu pertence a outro projeto
do promotor, que não pode ser usado aqui (regra de isolamento). Falta dizer onde está, ou colar o conteúdo.
