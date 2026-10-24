# Fotografias do levantamento — o que a app pode e não pode prometer

Escrito a 24/10/2026, depois de o promotor pedir que a app transforme fotografias de fachada "a tal ponto
que não seja reconhecível tão facilmente o prédio", com três fotografias de exemplo e um esboço
arquitetónico anotado como referência de resultado.

---

## 1. A resposta curta

**Nenhum tratamento automático de imagem anonimiza a fotografia de uma fachada.** O que identifica um
prédio não é a textura nem a cor — é a **silhueta e o ritmo dos vãos**, e é precisamente isso que qualquer
filtro preserva, porque é isso que faz a imagem continuar a ser útil. Um esboço fiel é tão identificável
como a fotografia; um esboço que deixa de ser identificável deixou, pelo mesmo gesto, de servir para
orçamentar.

Isto não é cautela: é verificável nas três fotografias que o promotor enviou.

- **Prédio verde e branco**: identifica-se pelo padrão de cor entre varandas, pelo ritmo das varandas e
  pela torre curva da caixa de escadas. Apagar o céu e os vizinhos não retira nada disso. Para quem passa
  ali, continua a ser aquele prédio.
- **Prédio de tijolo (duas vistas)**: identifica-se pelas faixas de tijolo entre lajes, pelos portões de
  garagem ao nível do solo, pela vedação laranja do lado e — pior — tem **texto legível na própria
  fachada**: "Nº 09 RESIDENCIAL" e o número de porta 104. Texto numa fachada é morada escrita; apagá-lo é
  um problema à parte, e falhar uma vez chega para deitar abaixo o anonimato.

A referência que o promotor escolheu — a prancha de esboço anotado — **não é uma fotografia tratada**. É
um **desenho feito a partir de dados**: volumes, sistemas construtivos, setas e legendas. É por isso que
parece anónima: foi desenhada de origem, não derivada de uma fotografia. E é por aí que há caminho.

---

## 2. O que já está decidido e construído, e que resolve isto

`src/domain/volume.ts`, no seu primeiro comentário: *"É gerado só a partir dos dados declarados (tipo,
pisos, fachadas, varandas) e com proporções fixas: dois prédios com os mesmos dados dão exatamente o mesmo
desenho, por isso o volume não permite reconhecer o prédio. **Nunca usa fotografias.**"*

É a mesma ideia da referência do promotor, e funciona por uma razão exata: **dois prédios iguais nos dados
dão o mesmo desenho**. Essa indistinguibilidade é o que faz dele um anonimizador. Um desenho derivado da
fotografia nunca a tem, porque a fotografia é única.

O percurso das fotografias também já está construído com esta lógica (migração `fotos_pedido`,
`src/domain/photo.ts`):

- `kind = 'geral'` → **fica privada**, serve a equipa da plataforma, **nunca chega aos pintores**;
- `kind = 'pormenor'` → entra em `revisao = 'pendente'` e só vai para o anúncio **depois de uma pessoa
  confirmar** que não identifica o prédio;
- os metadados (GPS, data, aparelho) são retirados antes de gravar.

---

## 3. Proposta

### 3.1 A fotografia de fachada justificada continua privada
Quando o avaliador tiver razão para a tirar — complexidade arquitetónica, um pormenor que só se percebe no
conjunto — ela **grava-se como `geral`**: serve-lhe de referência, serve a equipa da plataforma, e não é
publicada. O aviso para não a tirar mantém-se, mas deixa de ser um beco: há onde a pôr.

### 3.2 O que chega ao pintor no lugar dela
1. **O volume gerado dos dados** (`volume.ts`), que já existe — e que pode ganhar o aspeto da referência do
   promotor: anotações, setas, materiais, sistemas. **Isso é trabalho de desenho sobre dados, não de
   tratamento de imagem**, e é seguro por construção.
2. **Fotografias de pormenor**, enquadradas de perto. Uma fissura a 30 cm não identifica prédio nenhum: o
   corte apertado é o anonimizador barato e fiável que o filtro não consegue ser.
3. **A anotação de estado** da secção 4, que é o que o pintor precisa de facto para orçamentar.

### 3.3 Se ainda assim se quiser o esboço a partir da fotografia
Fica dito, para não haver ilusão: seria uma **estilização**, não uma anonimização, e teria de passar pela
revisão humana que já existe antes de ser publicada — exatamente como hoje. Acrescenta custo e uma
dependência nova (modelo de imagem), e **não substitui** o corte apertado nem o volume. Não se recomenda
como primeira peça.

---

## 4. Anotação de estado — a peça que substitui a fotografia da fachada

Pedido do promotor: *"rachadelas: sim, muitas > nota de 0 a 10 com desenho ilustrativo, sendo 1 o nível
suave e 10 um nível tremendo; e as fotos correspondentes devem inserir upload"*.

**Construído e testado** (`src/domain/condition.ts`, 6 testes; `src/components/SeverityScale.tsx`):

- Sete patologias com rótulo e com o que procurar em cada uma: fissuras, humidade, tinta a destacar,
  fungos/algas, reboco degradado, eflorescências, ferrugem.
- Escala **0 a 10** tal como pedida — 0 ausência, 1 suave, 10 tremendo — com bandas (ligeiro 1-3,
  moderado 4-6, grave 7-10).
- **Desenho paramétrico** por patologia: o nível alimenta a densidade, a espessura e a extensão do defeito,
  em vez de dez desenhos à mão. A escala fica coerente de ponta a ponta e sobrevive a mudar as bandas.
- **A partir de gravidade 4, exige fotografia de pormenor**: uma anotação grave sem fotografia não deixa
  concluir o levantamento (`conditionBlockers`).
- Resumo para o anúncio: só o que tem ocorrência, do mais grave para o menos.

**Por ligar:** falta a tabela para guardar as anotações (uma linha por zona e patologia, com as
fotografias associadas). É a quinta migração por aplicar — ver secção 5.

---

## 5. O travão a montante

Há **quatro migrações escritas e por aplicar** (`20261023160000`, `20261024030000`, `20261024040000`,
`20261024050000`). Acrescentar a quinta antes de as anteriores entrarem só aumenta uma fila que já não
anda, e cada peça nova fica invisível na mesma. Por isso a anotação de estado ficou **em domínio puro e
testado, sem tabela**: entra no dia em que a fila for drenada, e até lá não finge estar a funcionar.
