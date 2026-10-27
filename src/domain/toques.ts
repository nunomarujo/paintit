import { DIAS_DE_ESCLARECIMENTO, estadoDaEntrega } from './entrega';

/**
 * Toques: os avisos que a plataforma envia sozinha, uma vez cada um (27/10/2026).
 *
 * Nasce da entrega simultânea. A regra existe na base de dados desde 26/10 — as propostas abrem
 * todas no fim do prazo e há três dias para esclarecer —, mas ninguém era avisado de nada: o pintor
 * não sabia que a janela tinha aberto, e tem três dias para responder depressa; o cliente não sabia
 * que ela estava a acabar. Uma regra que ninguém sente só produz erros estranhos.
 *
 * Esta é a parte que decide **quem é tocado e quando**, em funções puras. Quem envia é a tarefa
 * diária (`/api/cron/toques`), e o que já foi enviado fica na tabela `toques`, com uma chave única
 * por tipo, alvo e destinatário: a mesma pessoa nunca leva o mesmo aviso duas vezes, nem que a
 * tarefa corra duas vezes no mesmo dia.
 *
 * **Os textos levam datas, nunca "hoje" ou "amanhã".** Se a tarefa falhar um dia e o aviso sair com
 * atraso, uma data continua verdadeira e um "amanhã" passa a mentira. É também por isso que cada
 * toque tem uma janela de dois dias para sair, em vez de um só instante.
 *
 * A mesma máquina serve, a seguir, o seguimento dos orçamentos e a cobrança do que está na rua — com
 * uma diferença que não se pode perder: esses escrevem a **clientes do pintor**, gente de fora da
 * plataforma, e aí valem as regras que o promotor fixou a 26/10 — até à adjudicação nenhuma parte é
 * identificada, no máximo três toques, sempre educados, sem juros nem ameaças, e dizendo que é o
 * assistente de IA do pintor, com o consentimento dele, pela quempinta.pt.
 */

export const TIPOS_DE_TOQUE = [
  'janela_abriu',
  'janela_acaba',
  'orcamento_1',
  'orcamento_2',
  'orcamento_3',
  'cobranca_1',
  'cobranca_2',
  'cobranca_3',
  'cobranca_pintor',
] as const;
export type TipoDeToque = (typeof TIPOS_DE_TOQUE)[number];

export const DESTINATARIOS = ['cliente', 'pintor', 'cliente_do_pintor'] as const;
export type Destinatario = (typeof DESTINATARIOS)[number];

export interface Toque {
  tipo: TipoDeToque;
  /** O que foi tocado: aqui, o pedido. */
  alvo: string;
  destinatario: Destinatario;
}

/** A chave que torna um toque irrepetível. A tabela `toques` usa estas três colunas como única. */
export const chaveDoToque = (t: Toque) => `${t.tipo}:${t.alvo}:${t.destinatario}`;

export interface PedidoParaToque {
  requestId: string;
  /** Último dia para receber propostas (ISO). */
  prazo: string | null;
  /** O anúncio ainda recebe propostas? */
  aberto: boolean;
  /** Quantas propostas submetidas existem. Sem nenhuma não há nada para abrir nem para esclarecer. */
  propostas: number;
}

const dia = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();
const maisDias = (iso: string, n: number) => new Date(dia(iso) + n * 86_400_000).toISOString().slice(0, 10);
/** Entre dois dias, inclusive. A folga de um dia é o que faz um aviso sobreviver a uma falha da tarefa. */
const entre = (hoje: string, de: string, ate: string) => dia(hoje) >= dia(de) && dia(hoje) <= dia(ate);

/**
 * Os toques devidos hoje para um pedido, tirando os que já foram enviados.
 *
 * @param jaEnviados chaves de `chaveDoToque` já registadas na tabela.
 */
export function toquesDevidos(p: PedidoParaToque, hoje: string, jaEnviados: Set<string>): Toque[] {
  if (!p.prazo || p.propostas === 0) return [];
  const e = estadoDaEntrega(p.prazo, hoje, p.aberto);
  if (!e.entregues) return [];

  const fim = maisDias(p.prazo, DIAS_DE_ESCLARECIMENTO);
  const devidos: Toque[] = [];

  // Abriu: no dia seguinte ao prazo, e mais um dia de folga. Vai aos dois lados — o cliente para
  // comparar, o pintor para estar atento às perguntas que agora podem chegar.
  if (entre(hoje, maisDias(p.prazo, 1), maisDias(p.prazo, 2))) {
    devidos.push({ tipo: 'janela_abriu', alvo: p.requestId, destinatario: 'cliente' });
    devidos.push({ tipo: 'janela_abriu', alvo: p.requestId, destinatario: 'pintor' });
  }

  // Acaba: no último dia da janela, e mais um de folga. Só ao cliente — é ele que tem de perguntar
  // antes de fechar; o pintor responde quando lhe perguntarem, e um aviso a dizer-lhe que a janela
  // acabou não lhe dá nada para fazer.
  if (entre(hoje, fim, maisDias(fim, 1))) {
    devidos.push({ tipo: 'janela_acaba', alvo: p.requestId, destinatario: 'cliente' });
  }

  return devidos.filter((t) => !jaEnviados.has(chaveDoToque(t)));
}

/** O último dia da janela de esclarecimentos, para os textos o escreverem por extenso. */
export const fimDaJanela = (prazo: string) => maisDias(prazo, DIAS_DE_ESCLARECIMENTO);

/**
 * O seguimento de um orçamento próprio — o que o pintor mandou a um cliente dele.
 *
 * Três toques e acabou, ao 3.º, 10.º e 20.º dia depois de enviado. O número não é generoso nem
 * mesquinho: é o que o promotor fixou a 26/10, e é também o limite a partir do qual um lembrete
 * deixa de ser um favor e passa a ser uma chatice.
 *
 * Aqui não há problema de anonimato: o cliente é dele e já o conhece pelo nome. O que a mensagem tem
 * de dizer, e diz, é que quem escreve é o assistente de IA do pintor, com o consentimento dele,
 * através da quempinta.pt.
 *
 * Pára sozinho assim que o orçamento sai do estado "enviado" — ganho ou perdido, não há mais nada a
 * perguntar.
 */
export const DIAS_DOS_TOQUES = [3, 10, 20] as const;

/**
 * O contacto que o pintor guardou serve para escrever?
 *
 * O campo é livre — tanto leva um email como um número de telefone, ou "a filha, 96…". Só se escreve
 * quando é inequivocamente um email: mandar uma mensagem para um endereço adivinhado é pior do que
 * não mandar nada.
 */
export function ehEmail(contacto: string | null): boolean {
  if (!contacto) return false;
  const t = contacto.trim();
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(t);
}

export interface OrcamentoParaToque {
  quoteId: string;
  /** Quando foi dado por enviado (ISO, data). Null = ainda não saiu. */
  enviadoEm: string | null;
  estado: 'rascunho' | 'enviado' | 'ganho' | 'perdido';
  /** O pintor autorizou a plataforma a perguntar por ele? */
  seguimento: boolean;
  /** O contacto do cliente serve para escrever? Só se for um email. */
  temEmail: boolean;
}

export function toquesDoOrcamento(q: OrcamentoParaToque, hoje: string, jaEnviados: Set<string>): Toque[] {
  if (!q.enviadoEm || q.estado !== 'enviado' || !q.seguimento || !q.temEmail) return [];
  const tipos = ['orcamento_1', 'orcamento_2', 'orcamento_3'] as const;
  return DIAS_DOS_TOQUES.flatMap((dias, i) => {
    const de = maisDias(q.enviadoEm!, dias);
    // A mesma folga de dois dias dos outros toques: uma tarefa que falhe um dia não perde o aviso.
    if (!entre(hoje, de, maisDias(de, 1))) return [];
    const t: Toque = { tipo: tipos[i]!, alvo: q.quoteId, destinatario: 'cliente_do_pintor' };
    return jaEnviados.has(chaveDoToque(t)) ? [] : [t];
  });
}

/**
 * A cobrança de uma tranche vencida.
 *
 * Três lembretes ao cliente — no dia do vencimento, aos 8 dias e aos 20 — e, aos 30, uma palavra ao
 * próprio pintor: a partir daí isto não se resolve por email, e continuar a mandar mensagens só
 * gasta a relação que ele vai precisar de ter quando telefonar.
 *
 * O que a plataforma faz aqui é lembrar. Não cobra, não guarda dinheiro, não aplica juros e não
 * ameaça — as três coisas que transformam um lembrete útil numa carta de advogado falhada.
 *
 * Pára no instante em que a tranche é dada por recebida.
 */
export const DIAS_DA_COBRANCA = [0, 8, 20] as const;
/** Ao fim de um mês, quem tem de agir é o pintor, não o email. */
export const DIAS_ATE_AVISAR_O_PINTOR = 30;

export interface TrancheParaToque {
  trancheId: string;
  /** Data prevista de recebimento (ISO). Sem ela não há vencimento nenhum a lembrar. */
  prevista: string | null;
  /** Já foi recebida? Então não há nada a cobrar. */
  recebida: boolean;
  /** O pintor autorizou a cobrança nesta obra? */
  cobranca: boolean;
  /** O contacto do cliente da obra serve para escrever? */
  temEmail: boolean;
}

export function toquesDaCobranca(t: TrancheParaToque, hoje: string, jaEnviados: Set<string>): Toque[] {
  if (!t.prevista || t.recebida || !t.cobranca) return [];

  const tipos = ['cobranca_1', 'cobranca_2', 'cobranca_3'] as const;
  const devidos: Toque[] = [];

  // Ao cliente, e só quando há email para onde escrever.
  if (t.temEmail) {
    DIAS_DA_COBRANCA.forEach((dias, i) => {
      const de = maisDias(t.prevista!, dias);
      if (entre(hoje, de, maisDias(de, 1))) devidos.push({ tipo: tipos[i]!, alvo: t.trancheId, destinatario: 'cliente_do_pintor' });
    });
  }

  // Ao pintor, com ou sem email do cliente: a dívida é dele e o mês passou.
  const mes = maisDias(t.prevista, DIAS_ATE_AVISAR_O_PINTOR);
  if (entre(hoje, mes, maisDias(mes, 1))) devidos.push({ tipo: 'cobranca_pintor', alvo: t.trancheId, destinatario: 'pintor' });

  return devidos.filter((x) => !jaEnviados.has(chaveDoToque(x)));
}
