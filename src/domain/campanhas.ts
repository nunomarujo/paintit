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
    /** A pergunta ou a dor, por cima do título. Curta. */
    gancho: string;
    titulo: string;
    sub: string;
    vantagens: { t: string; d: string }[];
    /** Números ou factos em destaque, até três. */
    numeros?: { v: string; l: string }[];
    cta: string;
    /** A fotografia (public/img). */
    foto: string;
    /** Variante de desenho: fotografia em cima ou bloco de cor em cima. */
    desenho: 'foto' | 'cor';
  };
}

const CRIADO = '2026-11-02';
const url = (caminho: string, codigo: string) => `https://quempinta.pt${caminho}${caminho.includes('?') ? '&' : '?'}c=${codigo}`;

export const FLYERS: Flyer[] = [
  // ---------------------------------------------------------------- Clientes diretos
  {
    id: 'cliente-1',
    perfil: 'cliente',
    titulo: 'Três orçamentos sem esforço',
    angulo: 'A dor dos pedidos sem resposta e das propostas que não se comparam.',
    destino: url('/', 'fl-cli-1'),
    criadoEm: CRIADO,
    estado: 'rascunho',
    conteudo: {
      gancho: 'Pediu orçamentos e ninguém respondeu?',
      titulo: 'Três propostas, lado a lado, sem andar atrás de ninguém.',
      sub: 'Descreva a obra uma vez. As propostas chegam todas ao mesmo tempo, descrevem trabalhos, produtos e demãos, e comparam-se linha a linha.',
      vantagens: [
        { t: 'Sem custo até escolher', d: 'Comparar não se paga. Só há contrato quando quiser.' },
        { t: 'Empresas verificadas', d: 'Alvará e seguros conferidos antes de poderem orçamentar.' },
        { t: 'Não sabe medir?', d: 'Um avaliador vai ao local, mede e fotografa, sem custo.' },
      ],
      numeros: [
        { v: '0 €', l: 'até escolher' },
        { v: '3', l: 'indicações com a razão escrita' },
        { v: '1', l: 'contrato que transcreve a proposta' },
      ],
      cta: 'Peça orçamentos pelo QR',
      foto: 'trincha-janela',
      desenho: 'foto',
    },
  },
  {
    id: 'cliente-2',
    perfil: 'cliente',
    titulo: 'O contrato diz o que a proposta disse',
    angulo: 'O medo da obra que fica a meio e do preço que muda.',
    destino: url('/', 'fl-cli-2'),
    criadoEm: CRIADO,
    estado: 'rascunho',
    conteudo: {
      gancho: 'Medo de a obra ficar a meio?',
      titulo: 'O preço mais baixo não conta a história toda. Aqui conta-se.',
      sub: 'Cada proposta é lida pelo que inclui, exclui ou deixa por esclarecer. A Escolha Quem Pinta vem com a razão escrita — e o contrato transcreve exatamente a proposta que escolher.',
      vantagens: [
        { t: 'Trabalhos a mais, só por escrito', d: 'O que aparecer depois de assinar leva adenda, com preço aceite.' },
        { t: 'Assinatura com Chave Móvel Digital', d: 'As duas partes assinam na plataforma; a prova fica guardada.' },
        { t: 'Morada e contactos protegidos', d: 'Só a empresa escolhida os conhece, e só depois da escolha.' },
      ],
      cta: 'Comece pelo QR',
      foto: 'fachada-meia',
      desenho: 'cor',
    },
  },
  // ---------------------------------------------------------------- Gestores de condomínios
  {
    id: 'condominio-1',
    perfil: 'condominio',
    titulo: 'O condomínio não consegue três propostas?',
    angulo: 'Menos concorrência, piores resultados; propostas comparáveis sem esforço.',
    destino: url('/?perfil=condominio', 'fl-cond-1'),
    criadoEm: CRIADO,
    estado: 'rascunho',
    conteudo: {
      gancho: 'O condomínio tem dificuldade em juntar três orçamentos?',
      titulo: 'Menos concorrência, piores resultados. Mude isso num pedido.',
      sub: 'Publique a obra uma vez e receba propostas de empresas verificadas, descritas de forma compreensível e comparável — sem telefonemas, sem compromisso.',
      vantagens: [
        { t: 'Um pedido, várias propostas', d: 'Chegam todas ao mesmo tempo, para ninguém perder por responder primeiro.' },
        { t: 'Cada edifício, a sua obra', d: 'Pedidos, propostas e documentos organizados por condomínio.' },
        { t: 'Levantamento sem custo', d: 'Um avaliador mede e fotografa o estado da fachada; os pintores orçamentam sobre isso.' },
      ],
      numeros: [
        { v: '1', l: 'pedido publicado' },
        { v: '0 €', l: 'para comparar' },
        { v: '100%', l: 'das propostas abrem ao mesmo tempo' },
      ],
      cta: 'Registe o condomínio pelo QR',
      foto: 'gestor-e-pintor',
      desenho: 'foto',
    },
  },
  {
    id: 'condominio-2',
    perfil: 'condominio',
    titulo: 'A assembleia decide com o relatório na mão',
    angulo: 'O relatório pronto e os condóminos a acompanhar e a votar.',
    destino: url('/?perfil=condominio', 'fl-cond-2'),
    criadoEm: CRIADO,
    estado: 'rascunho',
    conteudo: {
      gancho: 'Assembleia marcada e as propostas ainda em PDF soltos?',
      titulo: 'O relatório para a assembleia sai pronto. E os condóminos votam.',
      sub: 'A comparação organizada, a mais barata, a mais completa e a Escolha Quem Pinta com justificação, num documento para levar à reunião. Cada condómino acompanha o seu prédio, lê as propostas e vota.',
      vantagens: [
        { t: 'Relatório para a assembleia', d: 'Matriz, síntese e explicação económica, com a metodologia referenciada.' },
        { t: 'Condóminos com acesso ao seu prédio', d: 'Por link ou QR; leem as propostas quando abrem e votam, com permilagem se quiser.' },
        { t: 'Minuta pronta a assinar', d: 'Transcreve a proposta escolhida; assinatura com Chave Móvel Digital.' },
      ],
      cta: 'Peça o primeiro relatório pelo QR',
      foto: 'atrio-em-obra',
      desenho: 'cor',
    },
  },
  // ---------------------------------------------------------------- Empresas de pintura
  {
    id: 'pintor-1',
    perfil: 'pintor',
    titulo: 'Orçamentos em cinco minutos',
    angulo: 'O motor de orçamentos: horas passam a minutos, documento A4 pronto.',
    destino: url('/empresas', 'fl-pin-1'),
    criadoEm: CRIADO,
    estado: 'rascunho',
    conteudo: {
      gancho: 'Ainda perde a noite a fazer orçamentos?',
      titulo: 'Horas por orçamento passam a minutos. E sai um A4 a sério.',
      sub: 'A aplicação aprende de orçamento para orçamento: modelos, produtos do catálogo com ficha técnica, descrição escrita por si. Orçamentar nunca se paga.',
      vantagens: [
        { t: 'Obras na sua zona, já medidas', d: 'Pedidos com zonas, áreas e fotografias do estado; orçamenta sem ir lá.' },
        { t: 'Só paga quando ganha', d: 'Sem custo para aderir nem para orçamentar.' },
        { t: 'Ferramentas da obra incluídas', d: 'Diário com fotografias, horas, contas, trabalhos a mais com prova.' },
      ],
      numeros: [
        { v: '≈ 45 min', l: 'no primeiro orçamento' },
        { v: '≈ 20 min', l: 'no segundo' },
        { v: '≈ 5 min', l: 'do terceiro em diante' },
      ],
      cta: 'Adira pelo QR',
      foto: 'orcamento-noite',
      desenho: 'foto',
    },
  },
  {
    id: 'pintor-2',
    perfil: 'pintor',
    titulo: 'Há mais obras do que empresas',
    angulo: 'Oportunidades reais, contrato assinado na plataforma, cliente que paga a caução.',
    destino: url('/empresas', 'fl-pin-2'),
    criadoEm: CRIADO,
    estado: 'rascunho',
    conteudo: {
      gancho: 'Há mais obras do que empresas para as fazer.',
      titulo: 'Oportunidades na sua zona, contrato assinado, cliente comprometido.',
      sub: 'Pedidos filtrados por concelho e tipo de obra. O cliente deposita caução antes de escolher e assina com Chave Móvel Digital. A sua proposta é lida pelo que inclui, não só pelo preço.',
      vantagens: [
        { t: 'Propostas que se comparam', d: 'O cliente vê trabalhos, produtos e demãos — quem faz bem destaca-se.' },
        { t: 'Os seus clientes também', d: 'Orçamentos fora do mercado, com seguimento automático, sem comissão.' },
        { t: 'Descontos de fornecedores', d: 'Condições comerciais automáticas por fornecedor, no orçamento.' },
      ],
      cta: 'Veja as obras da sua zona pelo QR',
      foto: 'carrinha-equipa',
      desenho: 'cor',
    },
  },
  // ---------------------------------------------------------------- Fornecedores de tintas
  {
    id: 'fornecedor-1',
    perfil: 'fornecedor',
    titulo: 'Chegue antes da lista de compras',
    angulo: 'O catálogo dentro do orçamento do pintor, com a ficha técnica a fazer contas.',
    destino: url('/fornecedores', 'fl-for-1'),
    criadoEm: CRIADO,
    estado: 'rascunho',
    conteudo: {
      gancho: 'O pintor entra na loja com a lista feita?',
      titulo: 'Aqui, o seu produto está no orçamento antes de haver lista.',
      sub: 'Os produtos do catálogo aparecem ao pintor dentro do orçamento, trabalho a trabalho, com rendimento, demãos e preço de referência. A ficha técnica passa a fazer contas.',
      vantagens: [
        { t: 'Descontos por regra', d: 'Por artigo, tipo ou catálogo, cruzados com o perfil do cliente. Sem negociar um a um.' },
        { t: 'Carteira de clientes', d: 'Quem comprou, a que condições, e os pintores que convidou.' },
        { t: 'Código de adesão', d: 'Partilhe com novos pintores e ganhe comissão quando lhes for adjudicada uma obra.' },
      ],
      cta: 'Ponha o catálogo à frente pelo QR',
      foto: 'maquina-de-tinta',
      desenho: 'foto',
    },
  },
  {
    id: 'fornecedor-2',
    perfil: 'fornecedor',
    titulo: 'Ganhe duas vezes: seja avaliador',
    angulo: 'A comissão do levantamento e a obra antes de todos.',
    destino: url('/fornecedores#avaliador', 'fl-for-2'),
    criadoEm: CRIADO,
    estado: 'rascunho',
    conteudo: {
      gancho: 'Sabe olhar para uma fachada?',
      titulo: 'Ganhe dinheiro com o que sabe. Duas vezes.',
      sub: 'Inscreva-se como avaliador: mede a obra, regista o estado e os objetivos do cliente com a app a guiar, e recebe uma comissão seja qual for o pintor escolhido. E conhece a obra antes de todos.',
      vantagens: [
        { t: '1% a 2,7% do valor adjudicado', d: 'Numa obra de 45 000 €, entre 450 € e 1 215 €. Sobe com as avaliações.' },
        { t: 'A obra antes de haver proposta', d: 'Chegue aos pintores com condições, antes da lista de compras.' },
        { t: 'Inscrição em um minuto', d: 'Por autodeclaração de experiência e compromisso, na área de fornecedor.' },
      ],
      numeros: [
        { v: '45 000 €', l: 'obra adjudicada' },
        { v: '900 €', l: 'a 2%, para si' },
        { v: '2,7%', l: 'no topo da banda' },
      ],
      cta: 'Inscreva-se pelo QR',
      foto: 'balcao-loja',
      desenho: 'cor',
    },
  },
];

export const flyersPorPerfil = (perfil: Perfil) => FLYERS.filter((f) => f.perfil === perfil);

/** Onde o ficheiro gerado vive, relativo a `public/`. */
export const caminhoDoFlyer = (f: Flyer, formato: 'pdf' | 'jpg') => `/campanhas/${f.id}.${formato}`;
