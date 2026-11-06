/**
 * CRM do workspace de developer: as regras, em funções puras (promotor, 06/11/2026).
 *
 * Cada zona percorre uma sequência de campanhas (os flyers de `campanhas.ts`): a 1 primeiro, a 2 depois,
 * e assim por diante. Uma zona nova começa sempre na 1. Estas funções decidem quando se avança, quando se
 * pára e qual variante merece mais envios — sem enviar nada nem tocar na base de dados.
 */

import { FLYERS, type Perfil } from './campanhas';

export type TipoContacto = 'pintor' | 'fornecedor' | 'administradora';

export const PERFIL_DO_TIPO: Record<TipoContacto, Perfil> = {
  pintor: 'pintor',
  fornecedor: 'fornecedor',
  administradora: 'condominio',
};

export interface ContactoParaEnvio {
  email: string | null;
  pessoaColetiva: boolean;
  desistiuEm: string | null;
}

/**
 * Lei 41/2004, art. 13.º-A: sem consentimento prévio, só pessoas coletivas. É o mesmo teste que a base de
 * dados faz num gatilho; aqui serve para o ecrã e o agente explicarem a recusa antes de a pedirem.
 */
export function podeContactarPorEmail(c: ContactoParaEnvio): { ok: true } | { ok: false; motivo: string } {
  if (!c.email) return { ok: false, motivo: 'Sem email.' };
  if (c.desistiuEm) return { ok: false, motivo: 'Pediu para não receber mais mensagens.' };
  if (!c.pessoaColetiva) return { ok: false, motivo: 'Pessoa singular: exige consentimento prévio.' };
  return { ok: true };
}

/** A sequência de campanhas de um tipo de contacto, pela ordem do catálogo. */
export function sequenciaDeCampanhas(tipo: TipoContacto): string[] {
  const perfil = PERFIL_DO_TIPO[tipo];
  return FLYERS.filter((f) => f.perfil === perfil).map((f) => f.id);
}

export interface Resultados {
  enviados: number;
  respostas: number;
  adesoes: number;
  desistencias: number;
}

export const LIMIARES = {
  /** Abaixo disto os números não dizem nada. */
  amostraMinima: 30,
  /** Pontos-base de desistências sobre enviados a partir dos quais se pára e uma pessoa olha (5%). */
  desistenciaMaxBp: 500,
  /** Pontos-base de respostas + adesões sobre enviados abaixo dos quais a campanha «não resulta» (2%). */
  respostaMinBp: 200,
} as const;

export type Decisao = { acao: 'continuar' | 'avancar' | 'parar'; motivo: string };

const bp = (parte: number, total: number) => Math.floor((parte * 10_000) / total);

/**
 * O que fazer a uma campanha numa zona. `restantes` são os contactos da zona que ainda não a receberam.
 * «Parar» tem prioridade: muitas desistências protegem a reputação do domínio e pedem revisão humana.
 */
export function decidirCampanha(r: Resultados, restantes: number, l = LIMIARES): Decisao {
  if (r.enviados >= l.amostraMinima && bp(r.desistencias, r.enviados) > l.desistenciaMaxBp) {
    return { acao: 'parar', motivo: 'Desistências acima do limite: rever o texto e a lista antes de continuar.' };
  }
  if (restantes === 0) return { acao: 'avancar', motivo: 'Todos os contactos da zona já a receberam.' };
  if (r.enviados >= l.amostraMinima && bp(r.respostas + r.adesoes, r.enviados) < l.respostaMinBp) {
    return { acao: 'avancar', motivo: 'Respostas abaixo do mínimo: passar à campanha seguinte.' };
  }
  return { acao: 'continuar', motivo: 'A campanha está a resultar ou a amostra ainda é curta.' };
}

/** A campanha a seguir na sequência, ou `null` se já era a última. */
export function campanhaSeguinte(sequencia: string[], atual: string): string | null {
  const i = sequencia.indexOf(atual);
  return i >= 0 && i + 1 < sequencia.length ? sequencia[i + 1]! : null;
}

export interface Variante {
  id: string;
  tentativas: number;
  sucessos: number;
}

/**
 * Qual variante enviar a seguir: UCB1. Uma variante por experimentar passa à frente; depois, a que
 * melhor equilibra o que já rendeu com o que ainda não se sabe. Determinística, logo testável.
 */
export function escolherVariante(variantes: Variante[]): string | null {
  if (variantes.length === 0) return null;
  const novas = variantes.find((v) => v.tentativas === 0);
  if (novas) return novas.id;
  const total = variantes.reduce((s, v) => s + v.tentativas, 0);
  let melhor = variantes[0]!;
  let melhorPontos = -Infinity;
  for (const v of variantes) {
    const pontos = v.sucessos / v.tentativas + Math.sqrt((2 * Math.log(total)) / v.tentativas);
    if (pontos > melhorPontos) {
      melhor = v;
      melhorPontos = pontos;
    }
  }
  return melhor.id;
}
