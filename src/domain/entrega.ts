/**
 * Quando é que as propostas chegam ao cliente, e até quando se pode perguntar (26/10/2026).
 *
 * O percurso decidido pelo promotor: o cliente abre a obra com um prazo para receber propostas; no
 * fim desse prazo elas são entregues **todas ao mesmo tempo**; seguem-se três dias para esclarecer
 * dúvidas pelo canal anónimo; e o cliente escolhe quando quiser — durante a janela ou depois dela.
 *
 * A entrega simultânea não é cortesia: sem ela, o primeiro pintor a entregar fica com o preço à vista
 * durante dias e quem entrega no último dia leva vantagem. A porta está na regra de acesso da base de
 * dados (migração `entrega_simultanea`); estas funções só dizem ao ecrã o que mostrar, e por isso têm
 * de contar os dias exactamente da mesma maneira.
 */

/** Dias para o cliente perguntar e o pintor responder, depois da entrega. */
export const DIAS_DE_ESCLARECIMENTO = 3;

export interface EstadoDaEntrega {
  /** O cliente já pode ver as propostas? */
  entregues: boolean;
  /** O dia em que abrem (ISO), enquanto não abriram. */
  abremEm: string | null;
  /** Último dia para perguntar (ISO), depois de entregues. */
  esclarecimentosAte: string | null;
  /** Estamos dentro da janela: é agora que vale a pena perguntar. */
  emEsclarecimentos: boolean;
  /** Dias que faltam até abrirem. Zero no próprio dia do prazo. */
  faltamDias: number | null;
}

const dia = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();
const maisDias = (iso: string, n: number) => new Date(dia(iso) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * @param prazo Último dia para receber propostas (ISO). As propostas abrem no dia seguinte.
 * @param hoje Dia de hoje (ISO), em Lisboa — o mesmo fuso que a base usa.
 * @param aberto O anúncio ainda recebe propostas? Encerrado, o que houver é entregue logo.
 */
export function estadoDaEntrega(prazo: string | null, hoje: string, aberto = true): EstadoDaEntrega {
  // Sem prazo não há anúncio publicado, e portanto não há nada para entregar.
  if (!prazo) return { entregues: !aberto, abremEm: null, esclarecimentosAte: null, emEsclarecimentos: false, faltamDias: null };

  const entregues = !aberto || dia(hoje) > dia(prazo);
  const abertura = maisDias(prazo, 1);
  const ate = maisDias(prazo, DIAS_DE_ESCLARECIMENTO);
  return {
    entregues,
    abremEm: entregues ? null : abertura,
    esclarecimentosAte: entregues ? ate : null,
    emEsclarecimentos: entregues && dia(hoje) <= dia(ate),
    faltamDias: entregues ? null : Math.round((dia(abertura) - dia(hoje)) / 86_400_000),
  };
}
