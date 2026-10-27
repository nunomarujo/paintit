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

export const TIPOS_DE_TOQUE = ['janela_abriu', 'janela_acaba'] as const;
export type TipoDeToque = (typeof TIPOS_DE_TOQUE)[number];

export const DESTINATARIOS = ['cliente', 'pintor'] as const;
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
