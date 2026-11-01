// Quanto falta para um prazo, em palavras.
//
// Isto é texto que o avaliador lê sob pressão, por isso não pode mentir nem ser vago. Duas contagens, porque
// os prazos são de duas naturezas (ver `horasUteis.ts`):
//
//   · o contacto vence ao fim da primeira hora útil, logo conta-se em **minutos úteis**: «faltam 35 minutos
//     úteis». Dizer «faltam 2 dias» a quem reservou à sexta às 17h30 seria verdade no calendário e mentira
//     na prática;
//   · a conclusão vence em horas de calendário, logo conta-se em **tempo decorrido**: «faltam 47h 20m».
//
// Nunca se arredonda para cima: um prazo que falta 59 minutos diz 59 minutos, não «1 hora». E quando passa,
// diz que passou — não mostra zero.

import { ABERTURA_MIN, FECHO_MIN, FUSO_LEGAL, dentroDoHorarioUtil } from './horasUteis';

export type Contagem = {
  /** Verdadeiro quando o prazo já venceu. */
  vencido: boolean;
  /** «faltam 47h 20m», «faltam 35 minutos úteis», «o prazo passou». Sempre uma frase completa. */
  texto: string;
};

const MINUTO = 60_000;

/** Minutos do relógio útil entre dois instantes. Zero se o prazo já passou. */
export function minutosUteisAte(agora: Date, prazo: Date): number {
  if (prazo.getTime() <= agora.getTime()) return 0;
  // Varre minuto a minuto. O prazo de contacto é de uma hora útil, por isso o varrimento é curto; mesmo no
  // pior caso (uma semana inteira) são 10 080 passos, que é nada para o que isto serve.
  let contados = 0;
  for (let t = agora.getTime(); t < prazo.getTime(); t += MINUTO) {
    if (dentroDoHorarioUtil(new Date(t))) contados += 1;
  }
  return contados;
}

function emPortugues(minutos: number, uteis: boolean): string {
  // A concordância é de propósito: «falta 1 minuto útil», «faltam 2 minutos úteis». Um texto que o avaliador
  // lê dez vezes por semana não pode estar em português errado.
  const um = (n: number) => n === 1;
  if (minutos < 60) {
    if (uteis) return um(minutos) ? 'falta 1 minuto útil' : `faltam ${minutos} minutos úteis`;
    return um(minutos) ? 'falta 1 minuto' : `faltam ${minutos} minutos`;
  }
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (uteis) {
    if (resto === 0) return um(horas) ? 'falta 1 hora útil' : `faltam ${horas} horas úteis`;
    const h = um(horas) ? '1 hora' : `${horas} horas`;
    return `faltam ${h} e ${resto} min úteis`;
  }
  if (horas < 48) return `faltam ${horas}h ${String(resto).padStart(2, '0')}m`;
  const dias = Math.floor(horas / 24);
  const horasRestantes = horas % 24;
  return horasRestantes === 0 ? `faltam ${dias} dias` : `faltam ${dias} dias e ${horasRestantes}h`;
}

/** Quanto falta para o prazo de contacto, no relógio útil. */
export function contagemDoContacto(agora: Date, prazo: Date): Contagem {
  if (prazo.getTime() <= agora.getTime()) return { vencido: true, texto: 'o prazo passou' };
  return { vencido: false, texto: emPortugues(minutosUteisAte(agora, prazo), true) };
}

/** Quanto falta para um prazo de calendário (a conclusão, ou a data acordada com o cliente). */
export function contagemDoPrazo(agora: Date, prazo: Date): Contagem {
  const minutos = Math.floor((prazo.getTime() - agora.getTime()) / MINUTO);
  if (minutos <= 0) return { vencido: true, texto: 'o prazo passou' };
  return { vencido: false, texto: emPortugues(minutos, false) };
}

/** «segunda-feira, 09h30» — a data e a hora exatas, que acompanham sempre a contagem: o tempo que falta
 * ajuda a decidir agora, a hora exata é o que se escreve na agenda. */
export function horaExata(instante: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('pt-PT', {
      timeZone: FUSO_LEGAL,
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(instante)
      .map((x) => [x.type, x.value]),
  );
  return `${p.weekday}, ${p.day}/${p.month}, ${p.hour}h${p.minute}`;
}

/** O horário de atendimento, em palavras, para acompanhar o prazo de contacto. */
export const HORARIO_UTIL = `das ${ABERTURA_MIN / 60}h às ${FECHO_MIN / 60}h, de segunda a sexta`;

/**
 * O prazo como se diz em voz alta numa lista: «Hoje · 10h25», «Amanhã · 09h30», «terça-feira · 13h25»,
 * e a data por extenso só quando já vai longe.
 *
 * Numa coluna estreita a data completa ocupava três linhas e empurrava a hora — que é a parte que decide —
 * para o fim. O dia relativo lê-se de relance e cabe numa linha (01/11/2026).
 */
export function quandoCurto(agora: Date, instante: Date): { dia: string; hora: string; hoje: boolean } {
  const parte = (d: Date) =>
    Object.fromEntries(
      new Intl.DateTimeFormat('pt-PT', {
        timeZone: FUSO_LEGAL,
        weekday: 'long',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(d)
        .map((x) => [x.type, x.value]),
    );
  const a = parte(agora);
  const i = parte(instante);
  const hora = `${i.hour}h${i.minute}`;
  // Dias civis em Lisboa, contados pela data e não por 24 horas: às 23h00 «amanhã» é daqui a uma hora.
  const civil = (p: Record<string, string>) => Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day));
  const dias = Math.round((civil(i) - civil(a)) / 86400000);
  if (dias === 0) return { dia: 'Hoje', hora, hoje: true };
  if (dias === 1) return { dia: 'Amanhã', hora, hoje: false };
  if (dias > 1 && dias < 7) return { dia: i.weekday!, hora, hoje: false };
  return { dia: `${i.day}/${i.month}`, hora, hoje: false };
}
