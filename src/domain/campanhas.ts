/**
 * Campanhas e marketing: o catálogo dos materiais de divulgação da plataforma.
 *
 * Pedido do promotor (02/11/2026): dois flyers por perfil — pintores, fornecedores de tintas,
 * clientes diretos, gestores de condomínios — pensados sobre o que a aplicação faz e, em cada um,
 * as vantagens e os ganhos desse perfil. Ficam disponíveis no backoffice («Campanhas e Marketing»)
 * para descarregar ou enviar por email, com a data de criação.
 *
 * Os ficheiros são gerados por `scripts/gerar-flyers.ts` a partir desta lista (um A5 por flyer, em
 * PDF e em JPG de pré-visualização), com um código QR próprio por flyer: o endereço leva um
 * parâmetro `c=` que ainda não é lido por ninguém, mas é o que um dia vai permitir medir de onde
 * vieram as adesões (o motor de métricas de campanhas está em EM_ABERTO.md como ideia futura).
 *
 * **Campanha de lançamento.** O texto dos flyers anuncia condições de lançamento inventadas a
 * pedido do promotor. Enquanto não forem confirmadas, cada flyer está em `rascunho`, e o
 * backoffice diz isso ao lado do ficheiro. As condições estão todas na constante
 * `CAMPANHA_DE_LANCAMENTO`, para se mudarem num sítio só.
 */

export type Perfil = 'cliente' | 'condominio' | 'pintor' | 'fornecedor';

export const PERFIL_LABELS: Record<Perfil, string> = {
  cliente: 'Clientes diretos',
  condominio: 'Gestores de condomínios',
  pintor: 'Empresas de pintura',
  fornecedor: 'Fornecedores de tintas',
};

export const CAMPANHA_DE_LANCAMENTO = {
  nome: 'Campanha de lançamento',
  /** Adesões até esta data, pelo QR do flyer. */
  ate: '2027-01-31',
  ateEmPalavras: '31 de janeiro de 2027',
  condicoes: {
    cliente: 'Visita de avaliador sem custo e prioridade na marcação para quem pedir orçamentos pelo QR.',
    condominio: 'Relatório para a assembleia e acesso dos condóminos incluídos, sem custo, para os prédios registados pelo QR.',
    pintor: 'Plano Pro sem custo até 31 de janeiro de 2027 para as empresas que aderirem pelo QR.',
    fornecedor: 'Presença no catálogo sem subscrição até 31 de janeiro de 2027 para os fornecedores que aderirem pelo QR.',
  } satisfies Record<Perfil, string>,
};

export type EstadoDoFlyer = 'rascunho' | 'aprovado';

/**
 * Os três esquemas de desenho (direção de arte de 02/11/2026): `a` fotografia à esquerda a sangrar
 * e coluna de texto; `b` prédio isométrico sobre campo azul-pálido (`b-escuro`: sobre marinho);
 * `c` captura real da aplicação com anotações numeradas. Nenhum par do mesmo perfil repete o esquema.
 */
export type Desenho = 'a' | 'b' | 'b-escuro' | 'c';

export interface Flyer {
  id: string;
  perfil: Perfil;
  /** O título que aparece na lista do backoffice. */
  titulo: string;
  /** A ideia do flyer numa frase, para quem escolhe qual enviar. */
  angulo: string;
  /** O endereço a que o QR leva, já com o código da campanha. */
  destino: string;
  /** Data de criação (ISO), a que o backoffice mostra. */
  criadoEm: string;
  estado: EstadoDoFlyer;
  /** O que vai impresso. */
  conteudo: {
    /** O que a plataforma é, para este público, numa frase. É a primeira coisa que se lê a seguir ao logótipo. */
    oQueE: string;
    /** A dor, em pergunta ou afirmação curta. */
    gancho: string;
    titulo: string;
    sub: string;
    vantagens: { t: string; d: string }[];
    /** Três passos, pela ordem real para este público. */
    comoFunciona: string[];
    /** Um mecanismo verificável que dá confiança. */
    prova: string;
    /** Números ou factos em destaque, até três; só quando verdadeiros e úteis. */
    numeros?: { v: string; l: string }[];
    cta: string;
    /** A imagem (public/img, sem extensão): fotografia, `predio2-cor` ou `popup-demo-*`. */
    imagem: string;
    /** `object-position` da fotografia no esquema `a`. */
    foco?: string;
    /** A palavra do título que leva a marca lima, nos esquemas `b` e `b-escuro`. */
    realce?: string;
    desenho: Desenho;
  };
}

const CRIADO = '2026-11-02';
const url = (caminho: string, codigo: string) => `https://quempinta.pt${caminho}${caminho.includes('?') ? '&' : '?'}c=${codigo}`;

/**
 * O texto (estratégia de 02/11/2026, com alavancas comportamentais por público): abre sempre por
 * dizer o que a plataforma é; nunca promete um número de propostas — a plataforma leva as que
 * houver; toda a confiança assenta em mecanismos verificáveis (abertura simultânea, caução devolvida,
 * Chave Móvel Digital, adenda assinada), nunca em adjetivos.
 */
export const FLYERS: Flyer[] = [
  // ---------------------------------------------------------------- Clientes diretos
  {
    id: 'cliente-1',
    perfil: 'cliente',
    titulo: 'Comparar propostas, linha a linha',
    angulo: 'Orçamentos em papéis diferentes que não se comparam; autoridade por mecanismo e três indicações.',
    destino: url('/', 'fl-cli-1'),
    criadoEm: CRIADO,
    estado: 'rascunho',
    conteudo: {
      oQueE: 'Plataforma onde pintores verificados orçamentam a obra e as propostas se comparam.',
      gancho: 'Orçamentos em papéis diferentes. Qual é mesmo o mais barato?',
      titulo: 'Comparar propostas de pintura, linha a linha.',
      sub: 'Descrever a obra uma vez. Empresas com alvará e seguros verificados respondem até uma data; as propostas abrem todas ao mesmo tempo e ficam lado a lado: trabalhos, produtos, demãos, prazos e garantia. Comparar não custa nada.',
      vantagens: [
        { t: 'Três indicações, uma escolha', d: '«A mais barata», «A mais completa» e «Escolha Quem Pinta», esta com justificação escrita.' },
        { t: 'Pintores verificados', d: 'Alvará e seguros confirmados antes de qualquer proposta chegar.' },
        { t: 'Contrato assinado na plataforma', d: 'A proposta escolhida passa a contrato, assinado por ambos com Chave Móvel Digital.' },
      ],
      comoFunciona: ['Descrever a obra ou pedir visita gratuita', 'Ler as propostas quando abrirem, lado a lado', 'Escolher e assinar com Chave Móvel Digital'],
      prova: 'As propostas abrem todas ao mesmo tempo, na data marcada: ninguém perde por responder primeiro e ninguém vê o preço dos outros.',
      cta: 'Peça propostas pelo QR',
      imagem: 'lixadora-parede',
      foco: '70% 50%',
      desenho: 'a',
    },
  },
  {
    id: 'cliente-2',
    perfil: 'cliente',
    titulo: 'Medição gratuita, preço firme',
    angulo: 'Quem não sabe os metros: avaliador gratuito, preço firme, extras só por escrito, contactos escondidos.',
    destino: url('/', 'fl-cli-2'),
    criadoEm: CRIADO,
    estado: 'rascunho',
    conteudo: {
      oQueE: 'Onde quem quer pintar a casa recebe propostas comparáveis de empresas verificadas.',
      gancho: 'Sem saber os metros da fachada, como pedir orçamento?',
      titulo: 'Medição gratuita, preço firme, extras só por escrito.',
      sub: 'Um avaliador vai ao local, mede e fotografa sem custo. Com as medidas certas, as empresas orçamentam a mesma coisa e o preço é firme. Trabalhos a mais só existem com adenda assinada pelas duas partes.',
      vantagens: [
        { t: 'Visita de avaliador gratuita', d: 'Mede e fotografa a obra; o pedido sai completo e todas as propostas respondem ao mesmo.' },
        { t: 'Preço firme sobre medidas reais', d: 'A «Escolha Quem Pinta» só considera propostas que cobrem todo o pedido com preço firme.' },
        { t: 'Dados privados até escolher', d: 'Morada e contactos não chegam a nenhum pintor antes da escolha. Zero chamadas de insistência.' },
      ],
      comoFunciona: ['Pedir a visita do avaliador pelo QR', 'Receber e comparar as propostas na data', 'Escolher, assinar, acompanhar a obra'],
      prova: 'Antes de escolher, deposita-se uma pequena caução, devolvida na assinatura: só avançam obras a sério, e os pintores respondem a sério.',
      numeros: [
        { v: '0 €', l: 'visita do avaliador, até 31 jan 2027' },
        { v: '100%', l: 'da caução devolvida na assinatura' },
        { v: '0', l: 'trabalhos a mais sem adenda assinada' },
      ],
      cta: 'Marque a visita gratuita pelo QR',
      imagem: 'predio2-cor',
      realce: 'gratuita',
      desenho: 'b',
    },
  },
  // ---------------------------------------------------------------- Gestores de condomínios
  {
    id: 'condominio-1',
    perfil: 'condominio',
    titulo: 'A pintura do prédio pronta para a assembleia',
    angulo: 'Defensabilidade: relatório, matriz e justificação escrita, tudo por edifício.',
    destino: url('/?perfil=condominio', 'fl-cond-1'),
    criadoEm: CRIADO,
    estado: 'rascunho',
    conteudo: {
      oQueE: 'Plataforma onde a pintura do prédio recebe propostas comparáveis e relatório para assembleia.',
      gancho: 'A assembleia quer decidir. Os orçamentos não se comparam.',
      titulo: 'A pintura do prédio, pronta para a assembleia.',
      sub: 'Descrever a obra uma vez. As empresas verificadas respondem até à data; as propostas abrem em simultâneo e a plataforma gera a matriz de comparação, a síntese e a explicação das três indicações — tudo por edifício, pronto a apresentar.',
      vantagens: [
        { t: 'Relatório para a assembleia', d: 'Matriz, síntese e justificação da escolha, gerados pela plataforma, prontos a distribuir aos condóminos.' },
        { t: 'Tudo organizado por edifício', d: 'Cada prédio com a sua obra, propostas, contrato e histórico, sem pastas de emails.' },
        { t: 'Contrato com Chave Móvel Digital', d: 'A proposta aprovada passa a contrato assinado pelas duas partes; trabalhos a mais só por adenda.' },
      ],
      comoFunciona: ['Registar o edifício e descrever a obra', 'Receber as propostas e o relatório na data', 'Apresentar à assembleia, decidir, assinar'],
      prova: '«Escolha Quem Pinta» é a mais barata entre as que cobrem todo o pedido com preço firme, com justificação escrita: defensável perante qualquer condómino.',
      numeros: [
        { v: '1', l: 'relatório por obra: matriz, síntese, justificação' },
        { v: '0 €', l: 'para publicar e comparar' },
        { v: '31 jan', l: 'relatório e acesso dos condóminos incluídos, até 2027' },
      ],
      cta: 'Registe o edifício pelo QR',
      imagem: 'predio2-cor',
      realce: 'assembleia',
      desenho: 'b',
    },
  },
  {
    id: 'condominio-2',
    perfil: 'condominio',
    titulo: 'Todos os condóminos a ver as mesmas propostas',
    angulo: 'Prova social por mecanismo: acesso por QR ao prédio, leitura simultânea, voto antes da assembleia.',
    destino: url('/?perfil=condominio', 'fl-cond-2'),
    criadoEm: CRIADO,
    estado: 'rascunho',
    conteudo: {
      oQueE: 'Onde os condóminos acompanham as propostas de pintura do prédio e votam.',
      gancho: 'Cada condómino com uma opinião e ninguém com os mesmos dados.',
      titulo: 'Todos os condóminos a ver as mesmas propostas.',
      sub: 'Cada condómino entra no seu prédio por ligação ou QR, acompanha o pedido, lê as propostas quando abrem e dá o seu voto indicativo, com permilagem se a administração quiser. A decisão chega à assembleia já discutida.',
      vantagens: [
        { t: 'Acesso por QR ao prédio', d: 'Cada condómino vê só o seu edifício, sem registos complicados nem papéis a circular.' },
        { t: 'Voto indicativo antes da assembleia', d: 'Opcionalmente ponderado por permilagem; a administração vê o resultado antes da reunião.' },
        { t: 'Menos reuniões a discutir papéis', d: 'As propostas abrem para todos no mesmo momento, na mesma grelha de comparação.' },
      ],
      comoFunciona: ['A administração publica a obra do prédio', 'Os condóminos entram, leem e votam', 'A assembleia confirma; o contrato é assinado'],
      prova: 'Morada e contactos ficam escondidos dos pintores até à escolha: nenhuma empresa tem como ligar a condóminos antes de ser escolhida.',
      cta: 'Registe o prédio e partilhe o QR',
      imagem: 'fachadas-porto',
      foco: '50% 30%',
      desenho: 'a',
    },
  },
  // ---------------------------------------------------------------- Empresas de pintura
  {
    id: 'pintor-1',
    perfil: 'pintor',
    titulo: 'Obras já medidas. Orçamentar é grátis.',
    angulo: 'Justiça processual: abertura simultânea, pedidos medidos, comissão só com adjudicação.',
    destino: url('/empresas', 'fl-pin-1'),
    criadoEm: CRIADO,
    estado: 'rascunho',
    conteudo: {
      oQueE: 'Plataforma onde empresas de pintura recebem obras medidas e orçamentam com um motor guiado.',
      gancho: 'Visitas, medições, orçamentos à noite. E depois silêncio.',
      titulo: 'Obras já medidas. Orçamentar é grátis. Paga-se ao ganhar.',
      sub: 'Pedidos filtrados por concelho e tipo de obra chegam com medidas e fotografias. As propostas abrem todas na mesma data: ninguém ganha por responder primeiro nem perde por responder depois. Comissão apenas na obra adjudicada.',
      vantagens: [
        { t: 'Pedidos medidos, no concelho certo', d: 'Fachadas, capoto, interiores e condomínios filtrados por zona e tipo; menos visitas em vão.' },
        { t: 'Prazo igual para todos', d: 'Abertura simultânea; comparação por trabalhos, produtos, demãos e garantia, não só pelo preço.' },
        { t: 'Comissão só com adjudicação', d: 'Orçamentar não custa nada. A plataforma só ganha quando a empresa ganha a obra.' },
      ],
      comoFunciona: ['Registar a empresa; alvará e seguros verificados', 'Escolher pedidos e orçamentar até à data', 'Ganhar, assinar com CMD, começar a obra'],
      prova: 'A plataforma indica «A mais completa» e «Escolha Quem Pinta» ao lado de «A mais barata»: fazer bem tem onde se ver.',
      cta: 'Registe a empresa pelo QR',
      imagem: 'popup-demo-pintor',
      desenho: 'c',
    },
  },
  {
    id: 'pintor-2',
    perfil: 'pintor',
    titulo: 'Orçamentos em A4 que aprendem com a empresa',
    angulo: 'A ferramenta: modelos que acumulam, clientes próprios sem comissão, diário com prova.',
    destino: url('/empresas', 'fl-pin-2'),
    criadoEm: CRIADO,
    estado: 'rascunho',
    conteudo: {
      oQueE: 'Ferramenta de orçamentação e gestão de obra para empresas de pintura, com marketplace incluído.',
      gancho: 'Quanto tempo leva um orçamento a sério? E os extras, quem prova?',
      titulo: 'Orçamentos em A4 que aprendem com a empresa.',
      sub: 'O motor guiado guarda modelos, produtos de catálogo com ficha técnica, rendimentos e demãos; cada orçamento sai mais rápido que o anterior, num documento formal. Serve também para os clientes próprios, sem comissão, com diário de obra incluído.',
      vantagens: [
        { t: 'Clientes próprios, sem comissão', d: 'Orçamentar fora do marketplace é livre: mesmo documento, mesmo catálogo, nenhuma comissão.' },
        { t: 'Diário de obra com prova', d: 'Fotografias, horas, custos e trabalhos a mais documentados; adendas assinadas em vez de discussões.' },
        { t: 'Descontos de fornecedor automáticos', d: 'Os acordos com as lojas de tintas entram no preço sem contas à parte.' },
      ],
      comoFunciona: ['Criar modelos a partir do primeiro orçamento', 'Orçamentar obras do marketplace e clientes próprios', 'Registar a obra no diário até ao fim'],
      prova: 'Um trabalho a mais só é cobrável com adenda assinada pelas duas partes e registo no diário: o que está escrito, paga-se.',
      numeros: [
        { v: '0 €', l: 'de comissão nas obras de clientes próprios' },
        { v: '1', l: 'documento A4 formal, o mesmo para todos os clientes' },
        { v: '31 jan', l: 'Plano Pro gratuito até 2027, pelo QR' },
      ],
      cta: 'Experimente o Plano Pro pelo QR',
      imagem: 'predio2-cor',
      realce: 'aprendem',
      desenho: 'b-escuro',
    },
  },
  // ---------------------------------------------------------------- Fornecedores de tintas
  {
    id: 'fornecedor-1',
    perfil: 'fornecedor',
    titulo: 'A tinta da loja, escrita no orçamento do pintor',
    angulo: 'Efeito padrão: o catálogo carregado é o menu de onde o pintor escolhe cada linha; descontos e código de adesão.',
    destino: url('/fornecedores', 'fl-for-1'),
    criadoEm: CRIADO,
    estado: 'rascunho',
    conteudo: {
      oQueE: 'Plataforma onde os pintores orçamentam e onde o catálogo da loja entra no orçamento.',
      gancho: 'O pintor orçamenta em casa, à noite. Que marca escreve?',
      titulo: 'A tinta da loja, escrita no orçamento do pintor.',
      sub: 'Quando um pintor orçamenta uma fachada, escolhe os produtos no catálogo da plataforma, com rendimento, demãos e preço de referência. Um catálogo carregado é a marca que aparece em cada linha do orçamento; o cliente vê-a e o pintor compra-a.',
      vantagens: [
        { t: 'Descontos por pintor, automáticos', d: 'Regras por artigo, tipo ou catálogo, cruzadas com o perfil de cada pintor; aplicam-se sozinhas no orçamento.' },
        { t: 'Carteira de pintores à vista', d: 'Que pintores usam o catálogo, em que obras e com que produtos, sem telefonemas a perguntar.' },
        { t: 'Código de adesão que rende', d: 'Pintores trazidos pela loja geram comissão para a loja sempre que ganham obras.' },
      ],
      comoFunciona: ['Carregar o catálogo com fichas técnicas', 'Definir descontos por pintor ou por artigo', 'Dar o código de adesão aos pintores clientes'],
      prova: 'A ficha técnica fica ligada à linha do orçamento: rendimento e demãos vêm do fabricante, não da memória do pintor.',
      cta: 'Carregue o catálogo pelo QR',
      imagem: 'popup-demo-fornecedor',
      desenho: 'c',
    },
  },
  {
    id: 'fornecedor-2',
    perfil: 'fornecedor',
    titulo: 'Medir a fachada, ganhar 1% a 2,7% da obra',
    angulo: 'Ancoragem com dinheiro concreto (45 000 € → 900 €) e aversão à perda competitiva: quem vê a obra primeiro vende a tinta.',
    destino: url('/fornecedores#avaliador', 'fl-for-2'),
    criadoEm: CRIADO,
    estado: 'rascunho',
    conteudo: {
      oQueE: 'Plataforma onde se contratam pinturas; quem mede a obra recebe parte do valor adjudicado.',
      gancho: 'Quem vê a obra primeiro vende a tinta. Hoje é o pintor.',
      titulo: 'Medir a fachada, ganhar 1% a 2,7% da obra.',
      sub: 'O vendedor da loja declara-se avaliador. Quando um cliente perto pede uma visita, vai ao local, mede e fotografa. Na adjudicação recebe entre 1% e 2,7% do valor, ganhe quem ganhar — e conheceu a obra antes de existir orçamento.',
      vantagens: [
        { t: 'Pago seja quem for o pintor', d: 'A comissão do avaliador não depende de quem vence: depende de a obra ser adjudicada.' },
        { t: 'Primeiro a saber da obra', d: 'Medidas na mão e pintores por escolher: a loja conhece a obra e os concorrentes antes do orçamento.' },
        { t: 'O catálogo já lá dentro', d: 'Os pintores que orçamentam escolhem produtos no catálogo da plataforma, o da loja incluído.' },
      ],
      comoFunciona: ['Declarar-se avaliador na conta da loja', 'Aceitar visitas no concelho, medir e fotografar', 'Receber a comissão quando a obra for adjudicada'],
      prova: 'Entre 1% e 2,7% do valor adjudicado no contrato assinado na plataforma: registado no sistema, não combinado à boca.',
      numeros: [
        { v: '45 000 €', l: 'exemplo: pintura da fachada de um prédio' },
        { v: '900 €', l: 'para o avaliador, a 2%' },
        { v: '450–1 215 €', l: 'intervalo a 1%–2,7%, ganhe quem ganhar' },
      ],
      cta: 'Declare-se avaliador pelo QR',
      imagem: 'balcao-loja',
      foco: '60% 50%',
      desenho: 'a',
    },
  },
];

export const flyersPorPerfil = (perfil: Perfil) => FLYERS.filter((f) => f.perfil === perfil);

/** Onde o ficheiro gerado vive, relativo a `public/`. */
export const caminhoDoFlyer = (f: Flyer, formato: 'pdf' | 'jpg') => `/campanhas/${f.id}.${formato}`;
