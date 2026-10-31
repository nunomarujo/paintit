// O relógio das horas úteis, e os três prazos de um levantamento.
//
// Regras fechadas pelo promotor a 31/10/2026:
//
//   contacto   — até ao fim da PRIMEIRA HORA ÚTIL após aceitar (9h–18h, segunda a sexta, hora de Lisboa);
//   conclusão  — 48 HORAS DE CALENDÁRIO contadas do fim dessa primeira hora útil. O início é fixo e não
//                depende da confirmação do cliente: o silêncio dele consome o prazo do avaliador;
//   adiamento  — só a pedido e com confirmação do cliente, e nunca além de 7 DIAS ÚTEIS após o início das
//                48 horas, MANTENDO A MESMA HORA como limite.
//
// Duas naturezas diferentes, de propósito:
//   · a conclusão é tempo decorrido (48 × 60 min reais), porque é o que se mostra em contagem decrescente
//     («faltam 47h 20m»). Nas duas mudanças de hora do ano isto desloca a hora apresentada em 60 minutos,
//     e está certo assim: o avaliador teve 48 horas;
//   · o adiamento é hora de parede, porque o promotor pediu expressamente a mesma hora como limite.
//
// Nada aqui lê o relógio do sistema nem toca na base de dados: recebe o instante da aceitação e devolve
// instantes. É isso que o torna testável até ao minuto.

export const FUSO_LEGAL = 'Europe/Lisbon';

/** Início do horário de contacto, em hora local: 09:00. */
export const ABERTURA_MIN = 9 * 60;
/** Fim do horário de contacto, em hora local: 18:00. */
export const FECHO_MIN = 18 * 60;

const MS_POR_HORA = 3_600_000;

/** Horas de calendário para concluir, a contar do fim da primeira hora útil. */
export const HORAS_PARA_CONCLUIR = 48;
/** Dias úteis, a contar do início das 48 horas, que o adiamento pedido pelo cliente nunca pode exceder. */
export const DIAS_UTEIS_PARA_ADIAR = 7;

type Parede = {
  ano: number;
  mes: number; // 1–12
  dia: number;
  minutoDoDia: number; // 0–1439, hora local
};

const FORMATO = new Intl.DateTimeFormat('en-GB', {
  timeZone: FUSO_LEGAL,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/** O instante, lido no relógio de parede de Lisboa. */
function parede(instante: Date): Parede {
  const p = Object.fromEntries(FORMATO.formatToParts(instante).map((x) => [x.type, x.value]));
  return {
    ano: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    minutoDoDia: Number(p.hour) * 60 + Number(p.minute),
  };
}

/** O inverso: uma hora de parede de Lisboa → instante. Resolve a diferença com UTC no próprio momento, por
 * isso trata as mudanças de hora sem tabelas. */
function instante({ ano, mes, dia, minutoDoDia }: Parede): Date {
  const palpite = Date.UTC(ano, mes - 1, dia, Math.floor(minutoDoDia / 60), minutoDoDia % 60);
  const lido = parede(new Date(palpite));
  const comoUtc = Date.UTC(lido.ano, lido.mes - 1, lido.dia, Math.floor(lido.minutoDoDia / 60), lido.minutoDoDia % 60);
  return new Date(palpite - (comoUtc - palpite));
}

/** Dia da semana da data de parede: 0 = domingo … 6 = sábado. Não depende do fuso porque só usa a data. */
function diaDaSemana({ ano, mes, dia }: Parede): number {
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

function eDiaUtil(p: Parede): boolean {
  const d = diaDaSemana(p);
  return d >= 1 && d <= 5;
}

function diaSeguinte(p: Parede): Parede {
  const d = new Date(Date.UTC(p.ano, p.mes - 1, p.dia + 1));
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate(), minutoDoDia: p.minutoDoDia };
}

/** Avança até ao próximo dia útil, mantendo a hora. */
function proximoDiaUtil(p: Parede): Parede {
  let q = diaSeguinte(p);
  while (!eDiaUtil(q)) q = diaSeguinte(q);
  return q;
}

/** O primeiro instante de atendimento igual ou posterior a `p`. Fim de semana, noite e madrugada caem todos
 * nas 9h00 do dia útil seguinte. */
function abreviaParaHorarioUtil(p: Parede): Parede {
  if (!eDiaUtil(p)) return { ...proximoDiaUtil(p), minutoDoDia: ABERTURA_MIN };
  if (p.minutoDoDia < ABERTURA_MIN) return { ...p, minutoDoDia: ABERTURA_MIN };
  if (p.minutoDoDia >= FECHO_MIN) return { ...proximoDiaUtil(p), minutoDoDia: ABERTURA_MIN };
  return p;
}

/** Soma `minutos` do relógio útil a um instante. Minutos fora do horário não contam. */
export function somarMinutosUteis(desde: Date, minutos: number): Date {
  if (!Number.isFinite(minutos) || minutos < 0) {
    throw new RangeError('somarMinutosUteis: minutos tem de ser um número não negativo.');
  }
  let p = abreviaParaHorarioUtil(parede(desde));
  let restam = Math.round(minutos);
  for (;;) {
    const disponiveis = FECHO_MIN - p.minutoDoDia;
    if (restam <= disponiveis) return instante({ ...p, minutoDoDia: p.minutoDoDia + restam });
    restam -= disponiveis;
    p = { ...proximoDiaUtil(p), minutoDoDia: ABERTURA_MIN };
  }
}

/** Soma `dias` dias úteis a um instante, mantendo a hora de parede. Sábados e domingos não contam. */
export function somarDiasUteis(desde: Date, dias: number): Date {
  if (!Number.isInteger(dias) || dias < 0) {
    throw new RangeError('somarDiasUteis: dias tem de ser um inteiro não negativo.');
  }
  let p = parede(desde);
  for (let i = 0; i < dias; i += 1) p = proximoDiaUtil(p);
  return instante(p);
}

/** Verdadeiro se o instante cai dentro do horário de contacto (dia útil, 9h–18h). */
export function dentroDoHorarioUtil(instanteDado: Date): boolean {
  const p = parede(instanteDado);
  return eDiaUtil(p) && p.minutoDoDia >= ABERTURA_MIN && p.minutoDoDia < FECHO_MIN;
}

export type PrazosDaReserva = {
  /** Fim da primeira hora útil: o prazo para registar o contacto com o cliente. */
  contacto: Date;
  /** 48 horas de calendário depois de `contacto`: o prazo para concluir o levantamento. */
  conclusao: Date;
  /** 7 dias úteis depois de `contacto`, à mesma hora: o teto de um adiamento pedido pelo cliente. */
  limiteDeAdiamento: Date;
};

/** Os três prazos de uma reserva, calculados uma única vez no momento da aceitação e nunca recalculados
 * depois. É isto que faz o início ser fixo e não depender da resposta do cliente. */
export function prazosDaReserva(aceitacao: Date): PrazosDaReserva {
  const contacto = somarMinutosUteis(aceitacao, 60);
  return {
    contacto,
    conclusao: new Date(contacto.getTime() + HORAS_PARA_CONCLUIR * MS_POR_HORA),
    limiteDeAdiamento: somarDiasUteis(contacto, DIAS_UTEIS_PARA_ADIAR),
  };
}

/** Uma data de visita pedida pelo cliente só vale se não passar do teto. A comparação é ao minuto, pela hora
 * exata — é a mesma precisão com que os vencimentos são verificados. */
export function adiamentoAceitavel(visita: Date, prazos: PrazosDaReserva): boolean {
  return visita.getTime() <= prazos.limiteDeAdiamento.getTime();
}
