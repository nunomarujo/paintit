import { ORDEM_LABELS, type Ordem } from './comparador';

/**
 * Como a plataforma compara as propostas — escrito uma vez, lido em quatro sítios.
 *
 * ## Porque é que isto existe
 *
 * O Regulamento (UE) 2019/1150 usa um conceito **amplo** de classificação: abrange a organização
 * das ofertas e os destaques visuais, não apenas uma recomendação declarada. A app já agrupa e
 * ordena propostas, e portanto a obrigação de explicar os principais parâmetros e a razão da sua
 * importância relativa **já se aplica hoje** — não nasce quando se acrescentarem recomendações
 * (correcção do promotor, 29/10/2026). Do lado do consumidor, o artigo 4.º-A do Decreto-Lei
 * n.º 24/2014 pede a mesma informação numa secção directa e facilmente acessível a partir da página
 * onde as propostas se comparam.
 *
 * Nenhum dos dois exige publicar o algoritmo ou o código. Exigem dizer **o que pesa, porquê, e o que
 * prevalece sobre o quê** — que é exactamente o que este ficheiro guarda.
 *
 * ## Porquê em domínio, e versionado
 *
 * Quatro sítios têm de dizer o mesmo: o ecrã das propostas, o relatório impresso, a página pública
 * e as condições dos pintores. Escrito em quatro sítios, divergiria em semanas. Escrito aqui,
 * diverge quando alguém o mudar de propósito.
 *
 * A **versão** serve o relatório: um PDF emitido hoje aponta para a metodologia que o produziu, e
 * não para a que estiver em vigor quando alguém o abrir meses depois. Uma alteração às regras cria
 * uma versão nova e não reescreve relatórios já emitidos — a mesma disciplina da regra 3 do
 * CLAUDE.md para os parâmetros comerciais.
 */

/** Sobe quando mudarem os parâmetros, a sua ordem, ou as regras das indicações. */
export const VERSAO_METODOLOGIA = '1.0';

export interface ParametroDeClassificacao {
  id: string;
  nome: string;
  /** O que é medido. */
  descricao: string;
  /** Porque pesa, e quanto pesa em relação aos outros. É esta a parte que a lei pede. */
  importancia: string;
}

/**
 * Por ordem de importância, e a ordem é a informação: o primeiro prevalece sobre o segundo quando
 * os dois discordam. Dizer «consideramos preço, cobertura e prazos» sem dizer qual manda não
 * cumpre a obrigação nem ajuda quem lê.
 */
export const PARAMETROS: ParametroDeClassificacao[] = [
  {
    id: 'cobertura',
    nome: 'Cobertura do pedido',
    descricao: 'Quantos dos trabalhos pedidos a proposta inclui, exclui ou não refere.',
    importancia:
      'É o primeiro critério, e prevalece sobre o preço. Uma proposta que não cobre tudo não é comparável em preço com uma que cobre: falta-lhe trabalho que alguém terá de fazer e pagar.',
  },
  {
    id: 'definicao',
    nome: 'Preço fechado',
    descricao: 'Se o preço está firme ou se parte dele só se determina depois de observar a obra.',
    importancia:
      'Segundo critério. Um total que ainda pode subir não se compara com um total firme, e por isso separa-se antes de qualquer ordenação por valor.',
  },
  {
    id: 'preco',
    nome: 'Total a pagar',
    descricao: 'O valor com IVA que o cliente pagará, tal como a proposta o apresenta.',
    importancia:
      'Terceiro critério, e é o que ordena as propostas dentro de cada grupo — entre propostas comparáveis, decide o preço.',
  },
  {
    id: 'tecnica',
    nome: 'Correspondência técnica',
    descricao: 'Se a proposta identifica produto e demãos nos trabalhos que os levam.',
    importancia:
      'Não ordena nem desempata: assinala o que falta confirmar. Produto e demãos declarados não significam execução adequada ao pedido, e a plataforma não afirma que signifiquem.',
  },
  {
    id: 'reputacao',
    nome: 'Histórico do pintor',
    descricao: 'Avaliações de obras concluídas na plataforma, e quantas são.',
    importancia:
      'Mostra-se, mas **não ordena nem atribui destaque** nesta versão: o limiar que decidiria entre preço e reputação ainda não foi calibrado com obras reais. Enquanto não o for, a plataforma não o usa para recomendar.',
  },
];

export const INDICACOES = ['menor_preco', 'menor_preco_completo'] as const;
export type Indicacao = (typeof INDICACOES)[number];

export interface RegraDaIndicacao {
  id: Indicacao;
  nome: string;
  /** Quem pode recebê-la. */
  elegibilidade: string;
  /** O que a decide entre os elegíveis. */
  criterio: string;
  /** O que ela não quer dizer — a parte que evita que um rótulo seja lido como conselho. */
  limite: string;
}

export const REGRAS_DAS_INDICACOES: RegraDaIndicacao[] = [
  {
    id: 'menor_preco',
    nome: 'Menor preço apresentado',
    elegibilidade: 'Todas as propostas submetidas com um total conhecido.',
    criterio: 'O menor total com IVA, tal como cada proposta o apresenta.',
    limite:
      'Não significa que seja a mais barata para a obra: se lhe faltarem trabalhos pedidos ou tiver preço por fechar, o valor final pode ser outro. As omissões aparecem ao lado.',
  },
  {
    id: 'menor_preco_completo',
    nome: 'Melhor preço para o pedido completo',
    elegibilidade:
      'Propostas que incluem todos os trabalhos pedidos e cujo preço está firme — sem partes por determinar depois de observar.',
    criterio: 'Entre essas, o menor total com IVA.',
    limite:
      'Compara preço entre propostas comparáveis. Não avalia a qualidade da execução, os produtos nem o histórico do pintor.',
  },
];

/** Diz-se antes de qualquer indicação, para que a sua ausência não se leia como desinteresse. */
export const SEM_INDICACAO: string[] = [
  'Nenhuma proposta inclui todos os trabalhos pedidos com o preço firme: nesse caso não se atribui «melhor preço para o pedido completo».',
  'Duas propostas empatam no critério: nenhuma recebe a indicação, e diz-se que empataram.',
  'Há uma divergência de medição por esclarecer que muda qual delas seria indicada.',
];

/**
 * O que **não** entra em nenhum destes cálculos. A primeira linha é a que mais importa, e é a mesma
 * que a regra 15 do CLAUDE.md protege do outro lado: o cliente nunca vê o que a plataforma cobra ao
 * pintor, e o que a plataforma cobra nunca altera o que o cliente vê.
 */
export const NAO_INFLUENCIAM: string[] = [
  'A comissão que a plataforma cobra ao pintor, e qualquer desconto que ele tenha nela.',
  'Promoções, campanhas e relações comerciais entre a plataforma e qualquer pintor.',
  'Pagamento por posição, destaque ou ordenação: não existe, e não se vende.',
  'A antiguidade do pintor na plataforma e o número de propostas que já apresentou.',
];

/** As fontes dos números que a plataforma usa, e o que cada uma sustenta. */
export const FONTES: { o_que: string; donde: string }[] = [
  { o_que: 'Trabalhos, zonas e áreas do pedido', donde: 'O que o cliente descreveu, com a origem declarada em cada zona — medição, estimativa ou levantamento.' },
  { o_que: 'Preços, quantidades, demãos e produtos', donde: 'O que cada proposta declara. A plataforma não os altera nem os completa.' },
  { o_que: 'Avaliações', donde: 'Clientes de obras concluídas na plataforma, uma avaliação por obra.' },
];

export interface Metodologia {
  versao: string;
  parametros: ParametroDeClassificacao[];
  indicacoes: RegraDaIndicacao[];
  semIndicacao: string[];
  naoInfluenciam: string[];
  fontes: { o_que: string; donde: string }[];
}

export const METODOLOGIA: Metodologia = {
  versao: VERSAO_METODOLOGIA,
  parametros: PARAMETROS,
  indicacoes: REGRAS_DAS_INDICACOES,
  semIndicacao: SEM_INDICACAO,
  naoInfluenciam: NAO_INFLUENCIAM,
  fontes: FONTES,
};

/** O endereço da versão que produziu um relatório — nunca o da versão mais recente. */
export const enderecoDaMetodologia = (versao: string = VERSAO_METODOLOGIA) =>
  `https://quempinta.pt/metodologia/${versao}`;

/**
 * A prioridade, dita numa frase corrida. É o que a lei pede que se explique e o que uma lista de
 * factores não diz: qual prevalece sobre qual.
 */
export function prioridadeEmPalavras(): string {
  const [primeiro, segundo, terceiro] = PARAMETROS;
  return (
    `Primeiro separam-se as propostas pela ${primeiro!.nome.toLocaleLowerCase('pt-PT')} e por terem o ${segundo!.nome.toLocaleLowerCase('pt-PT')}; ` +
    `só depois, dentro de cada grupo, ordena o ${terceiro!.nome.toLocaleLowerCase('pt-PT')}. ` +
    `O histórico do pintor mostra-se mas não ordena, e a correspondência técnica assinala o que falta confirmar sem alterar a ordem.`
  );
}

/** O critério activo, para se dizer junto da lista que ele ordenou. */
export const criterioEmPalavras = (ordem: Ordem): string =>
  ordem === 'padrao'
    ? `${ORDEM_LABELS.padrao} — e, dentro de cada grupo, por total a pagar.`
    : `${ORDEM_LABELS[ordem]} — critério escolhido por si, que substitui o agrupamento por omissão.`;
