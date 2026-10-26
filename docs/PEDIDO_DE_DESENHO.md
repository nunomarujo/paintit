# Pedido de desenho: Quem Pinta

## Antes de tudo, o que correu mal

Este pedido é feito com humildade, e convém dizer porquê. A interface actual foi desenhada por uma IA
— eu — ao longo de várias sessões, uma funcionalidade de cada vez, sempre com pressa de entregar a
seguinte. Nunca houve um momento em que alguém se sentasse e desenhasse **o produto inteiro**. O
resultado é o que os primeiros testadores disseram, nas palavras do dono: *"todo o site está
horrível, desorganizado, não prioriza nada, não há categorias definidas, cores diferentes, margens
aleatórias, às vezes passa de alinhado à esquerda, depois ao centro com margens brutas dos lados,
depois a ocupar tudo"*.

Têm razão, e os defeitos são verificáveis. Eis o diagnóstico honesto, medido no código:

- **Duas paletas em uso ao mesmo tempo.** 171 ficheiros usam uma (`tinta`, `slate`, `sage`, `paper`),
  três usam outra (variáveis de marca: `--ink`, `--cream`, `--orange`). A segunda é a da marca; a
  primeira é um resto de um protótipo antigo que nunca foi substituído.
- **Nove raios de canto diferentes** (16px, 10px, 8px, 7px, 9px, 11px, 4px, `rounded-md`, `rounded-full`),
  alguns deles medidos a olho a partir de uma imagem.
- **Botões: duas classes definidas e 59 botões feitos à mão em 22 assinaturas diferentes.** Só o botão
  primário à mão tem sete espaçamentos distintos.
- **38 formas diferentes de banda de aviso** para 68 bandas. Só a de âmbar tem onze variantes.
- **31 ficheiros declaram o seu próprio cartão**, e 27 declaram exactamente a mesma string.
- **Larguras incoerentes:** o mesmo tipo de ecrã aparece a 448px, 576px, 672px, 768px, 896px e a toda a
  largura. É isto que produz a sensação de "ora à esquerda, ora ao centro, ora a ocupar tudo".
- **Nenhuma grelha acima do ponto de quebra `sm:`** em toda a aplicação, pelo que num ecrã de 1600px
  uma lista de três linhas ocupa a largura toda com três linhas e deixa o resto branco.
- **O menu da esquerda cresceu por acumulação**, não por desenho: cada funcionalidade nova foi
  acrescentada ao fim do grupo que parecia mais próximo.

A tipografia e o contraste foram corrigidos ontem (corpo a 17px, escala de seis degraus, contrastes
acima do mínimo de acessibilidade). **Não é isso que se pede aqui.** Pede-se o que não foi feito:
desenhar o produto como um todo.

---

## O produto

**Quem Pinta** (quempinta.pt) é um mercado português de empreitadas de pintura, com ferramentas de
gestão para quem pinta. O percurso é: um condomínio ou um particular descreve a obra → empresas de
pintura verificadas orçamentam → o cliente escolhe → as duas partes assinam na plataforma → a empresa
gere a execução com as ferramentas da aplicação.

Há **três tipos de utilizador**, e cada um vê um menu diferente:

1. **A empresa de pintura** (o utilizador principal, e o que paga). Dono-operário de uma empresa
   pequena, tipicamente dois a dez trabalhadores.
2. **O cliente** — administrador de condomínio, ou um particular.
3. **O fornecedor** de tintas e materiais.

Há ainda um backoffice para a equipa da plataforma, que **não faz parte deste pedido**.

## Quem usa isto, a sério

Isto não é uma ferramenta para pessoas de escritório. O utilizador típico:

- é dono de uma empresa de pintura em Portugal, tem muitas vezes mais de 45 anos;
- usa o telemóvel **numa obra**, com as mãos sujas, ao sol, de pé num andaime;
- ou usa um PC de escritório antigo, a 1366×768, sem escalamento;
- **não gosta de formulários, de escrever, nem de computadores**. Disse-o o dono do produto:
  *"quero que um quase-analfabeto com pouca vontade de ler ou escrever possa ter aqui a melhor
  solução"*;
- está a usar isto entre duas tarefas, não a explorá-lo com tempo.

Isto tem consequências directas no desenho: **densidade e legibilidade antes de espaço livre**. O
espaço em branco generoso lê-se como luxo numa landing page de SaaS e lê-se como desperdício numa
ferramenta de trabalho. O dono já o disse: *"espaço livre dá a sensação de luxo, mas aqui quer-se
praticabilidade e fácil leitura"*.

---

## O que se pede

### 1. Um sistema visual coerente

Uma só paleta, uma só escala de espaçamento, um só raio de canto (ou dois, com regra clara), um só
botão primário, um só secundário, um só cartão, uma só banda de aviso. Poucas peças, bem definidas.

A paleta de marca actual, que deve vencer (mas que pode propor afinar, com justificação):

```
--ink:        #1F3D2E   verde-escuro, cor da marca
--ink-soft:   #2E5240
--cream:      #F6F2E9   fundo
--orange:     #E07B39   acento
--orange-deep:#A04D19   acento para texto (o claro não tem contraste suficiente)
--border:     #E1D9C6
--muted:      #5B5444
--tag-bg:     #ECE6D4
```

Tipografia já decidida e **a manter**: escala de 13 / 15 / 17 / 20 / 26 / 34 px, corpo a 17px. Nada
abaixo de 13px no ecrã. Nenhum campo de formulário abaixo de 16px (abaixo disso o Safari do iPhone dá
zoom a cada toque, e o utilizador está numa obra).

### 2. Reorganizar o menu da esquerda

**É esta a parte mais importante do pedido.** O menu deve seguir a ordem em que o utilizador
realmente trabalha, não a ordem em que as funcionalidades foram construídas.

Eis o que existe hoje para a **empresa de pintura**, em dois grupos ("Área de trabalho" e "Recursos"),
com o que cada coisa faz:

| Entrada actual | Rota | O que é |
|---|---|---|
| Início | `/app` | Painel: avisos por ler, contratações a precisar de atenção, pedidos abertos |
| Oportunidades | `/app/oportunidades` | O mercado: pedidos de clientes abertos a propostas. **É por aqui que entra o trabalho.** |
| Ganhar obra › Obra pública | `/app/obras-publicas` | Quem contrata pintura no sector público, e os concursos anunciados |
| Orçamentos | `/app/orcamentos` | Orçamentos a clientes próprios, fora do mercado da plataforma. Sub-vistas: Novo / Em preenchimento / Enviados / Arquivo |
| Contratações | `/app/contratacoes` | Obras já adjudicadas: contrato, assinatura, tranches |
| Catálogo de materiais | `/app/catalogo` | Tintas e materiais dos fornecedores, com descontos |
| Gestão de obra | `/app/obras` | A execução. Sub-vistas: Hoje / Equipa / Contas. Dentro de cada obra: registar o dia, fotografias, despesas, fases, trabalhos a mais |
| Planos & Subscrições | `/app/subscricao` | O plano da empresa, grátis ou Pro |
| Referências de fornecedores | `/app/organizacoes/[id]/referencias` | Indicar fornecedores e receber desconto na comissão |
| (sem entrada no menu) | `/app/organizacoes/[id]` | A ficha da empresa: dados, documentos, alvará, seguro |
| (sem entrada no menu) | `/app/perfil` | A conta pessoal |
| (sem entrada no menu) | `/app/obras/consumiveis` | Armazém e consumíveis |

Para o **cliente** (condomínio ou particular): Início, Pedidos de orçamento (`/app/pedidos`),
Contratações. Para o **fornecedor**: Início, Encomendas (`/app/encomendas`), Levantamentos
(`/app/levantamentos`), Catálogo, Produtos e descontos, Clientes, Comissões de adesão.

**O que decidir e justificar:**
- Que agrupamentos fazem sentido, e como se chamam. Os actuais — "Área de trabalho" e "Recursos" —
  não querem dizer nada a ninguém.
- Que ordem. Uma hipótese a avaliar, não a aceitar: a ordem do dinheiro — *encontrar trabalho →
  orçamentar → contratar → executar → receber* — mais um grupo à parte para a conta e as definições.
- O que não devia estar no menu de todo, e deve viver dentro de outra coisa.
- Onde entram a ficha da empresa, os documentos e o perfil, que hoje não estão em lado nenhum.
- Quantos níveis. Hoje há dois (item e sub-item); diga se chegam.

### 3. Resolver o problema das larguras

É a queixa mais repetida. A aplicação tem uma barra lateral de 235px e uma área de conteúdo que hoje
vai até 1600px. Dentro dela, cada ecrã escolheu a sua largura. **Defina a regra**, e diga para que
serve cada caso: formulário estreito? lista densa a toda a largura? texto corrido com medida de
leitura? Duas colunas a partir de que largura?

---

## O que entregar

**Um ficheiro HTML único e autónomo**, com o CSS embutido, que mostre:

1. **A folha de estilo visível** — paleta, tipografia, espaçamentos, e os componentes todos numa
   página: botões (primário, secundário, destrutivo, pequeno), cartões, bandas de aviso (informação,
   atenção, erro), etiquetas, campos de formulário, cabeçalho de página, linha de lista, tabela,
   estado vazio.
2. **O menu da esquerda proposto**, nos três perfis (pintor, cliente, fornecedor), com uma nota curta
   a explicar a ordem escolhida.
3. **Quatro ecrãs desenhados a sério**, à largura de computador **e** à de telemóvel (390px):
   - **Início** (o painel de entrada do pintor)
   - **Oportunidades** (uma lista densa de pedidos abertos, com prazo, área, concelho e estado)
   - **Gestão de obra · Hoje** (o ecrã diário: acções grandes, equipa do dia, o que precisa de
     atenção, fases)
   - **Orçamentos** (lista agrupada por estado, com valor, cliente e data)

Use dados de exemplo em português. Não invente funcionalidades que não constam da tabela acima: se
achar que falta alguma coisa, escreva-o à parte, não a desenhe como se existisse.

### Restrições técnicas, que não são negociáveis

- A aplicação é **Next.js 15 com Tailwind CSS 3**. O HTML que entregar será convertido em classes do
  Tailwind. Use medidas da escala do Tailwind sempre que puder; se precisar de um valor fora dela,
  diga-o explicitamente.
- **Não proponha mudar de framework**, nem acrescentar bibliotecas de componentes, nem animações que
  dependam de JavaScript.
- **Sem imagens, fotografias ou ilustrações** — não as temos. Ícones só se forem SVG simples
  desenhados à mão, e diga quais.
- Português de Portugal, tratamento impessoal: infinitivo ("Registar o dia", "Comparar propostas") ou
  frases sem sujeito. Nunca "tu" nem "você". Nos botões e erros, a forma de cortesia ("Registe",
  "Indique").
- **Regra de alarme, a respeitar:** uma só banda com fundo de cor por ecrã, no topo. Dentro de listas
  o alarme é texto, não fundo colorido. Vermelho só para o que já fechou, caducou ou foi recusado; o
  que ainda se resolve é âmbar. Cor de aviso nunca para selecção ou destaque.
- Contraste mínimo de 4,5:1 para texto, 3:1 para contornos de campos de formulário.

---

## Como será avaliado

O desenho vai ser aplicado à aplicação a sério, ecrã a ecrã, por quem escreveu este pedido. Por isso:

- **Seja concreto.** Valores exactos, não intenções. "Espaçamento de 16px entre cartões", não
  "espaçamento generoso".
- **Explique as decisões em uma linha cada**, sobretudo as do menu. Quem aplica precisa de saber o
  porquê para resolver os casos que o desenho não cobre.
- **Prefira o aborrecido e previsível ao engenhoso.** Isto é uma ferramenta de trabalho para alguém
  que não quer aprender a usá-la.
- Se achar que alguma coisa deste pedido está errada, diga-o. Quem o escreveu já errou neste produto
  várias vezes, e o pedido não é uma defesa do que lá está — é um pedido de ajuda para o corrigir.
