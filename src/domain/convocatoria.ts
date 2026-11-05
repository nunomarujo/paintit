import { isCompanyNif, isValidNif, normalizeNif } from './nif';
import { dentroDoHorarioUtil, somarMinutosUteis } from './horasUteis';
import { SURVEYOR_SHARE_OF_VALUE_BP_MAX, SURVEYOR_SHARE_OF_VALUE_BP_MIN, surveyorShareBp, type SurveyorPerformance } from './survey';

/**
 * Convocatória por ondas: quem é convidado para um levantamento, por que ordem, e quando se alarga.
 *
 * Decisões do promotor (05/11/2026, docs/DECISOES.md «Convocatória por ondas»). Até aqui, quando um
 * levantamento abria, ninguém era avisado — os avaliadores descobriam-no a navegar a lista, e quem
 * chegava primeiro ficava. Com o WhatsApp a convidar, convidar toda a gente de uma vez paga uma
 * mensagem por pessoa e entrega sempre a vaga a quem tem o telemóvel mais à mão. Daí as ondas:
 *
 *  · **Condições** — sem elas não há convite (`motivosDeInelegibilidade`).
 *  · **Zona** — cada avaliador declara o concelho base e o raio que percorre; procura-se em anéis à volta
 *    da obra: o próprio concelho, até 25 km, até 50 km, até ao raio de cada um.
 *  · **Onda** — metade dos elegíveis dos anéis em uso, entre 3 e 5 pessoas; até metade dela (arredondada
 *    para baixo) para quem ainda tem poucas avaliações, para quem chega ter por onde começar.
 *  · **Ordem** — os novos por antiguidade de inscrição; os outros pela mesma qualidade que define a banda
 *    de comissão (uma regra só), e em empate quem está há mais tempo sem trabalho. Quem ganhou uma vaga
 *    nas últimas 24 h passa para o fim do seu anel (a proximidade à obra pesa sempre primeiro).
 *  · **Segunda oportunidade, não exclusão** — nota baixa ou incumprimento recente tiram da primeira onda,
 *    nunca da convocatória: nada aqui castiga sem uma pessoa ver (regra da matriz de libertação).
 *  · **Tempo** — cada onda tem uma hora útil; só se envia em horário útil, para ninguém ganhar por estar
 *    acordado; ao fim de três ondas sem resposta avisa-se a equipa e o cliente segue pelo preenchimento
 *    próprio, que nunca deixou de existir.
 *
 * Os números vivem numa versão (`REGRAS_DA_CONVOCATORIA`); a convocatória guarda a versão que aplicou,
 * para afinar sem reescrever o passado (regra 3 do CLAUDE.md).
 */

export interface RegrasDaConvocatoria {
  versao: string;
  /** Tamanho da onda: metade dos elegíveis em uso, arredondada para cima, entre estes dois. */
  ondaMinima: number;
  ondaMaxima: number;
  /** Abaixo de quantos levantamentos avaliados alguém conta como novo (o limiar do comparador de pintores). */
  novoAbaixoDe: number;
  /** Anéis à volta da obra, em km, depois do próprio concelho. O último anel é o raio de cada um. */
  aneisKm: readonly number[];
  /** Os raios que um avaliador pode declarar. */
  raiosKm: readonly number[];
  /** Minutos úteis que uma onda espera por um «Aceito» antes da seguinte. */
  janelaMinutosUteis: number;
  /** Ondas antes de escalar para a equipa. */
  maximoDeOndas: number;
  /** Levantamentos em curso a partir dos quais deixa de ser convidado. */
  maximoEmCurso: number;
  /** Quem ganhou uma vaga há menos destas horas vai para o fim da ordem. */
  rotacaoHoras: number;
  /** Média abaixo disto, com pelo menos `notaBaixaMinimoAvaliacoes`, só entra a partir da 2.ª onda. */
  notaBaixa: number;
  notaBaixaMinimoAvaliacoes: number;
}

export const REGRAS_DA_CONVOCATORIA: RegrasDaConvocatoria = {
  versao: '2026-11-05',
  ondaMinima: 3,
  ondaMaxima: 5,
  novoAbaixoDe: 3,
  aneisKm: [25, 50],
  raiosKm: [15, 30, 60, 100],
  janelaMinutosUteis: 60,
  maximoDeOndas: 3,
  maximoEmCurso: 2,
  rotacaoHoras: 24,
  notaBaixa: 3,
  notaBaixaMinimoAvaliacoes: 5,
};

/** Dias fora da primeira onda depois de um incumprimento provado (reserva libertada pela matriz). */
export const DIAS_FORA_DA_PRIMEIRA_ONDA = 7;

// ---------------------------------------------------------------------------------------------------
// O NIF de quem recebe
// ---------------------------------------------------------------------------------------------------

/**
 * A comissão do levantamento é sempre da pessoa (decisão de 05/11/2026): acumula na sua conta, e resgata-se
 * com recibo em nome próprio (fatura-recibo ou ato isolado). O NIF é por isso de pessoa singular — um NIF
 * de empresa (começado por 5, 6, 8 ou 9) não serve. Pede-se nos dados para receber, não para ser convidado.
 */
export function erroDoNifPessoal(nif: string | null | undefined): string | null {
  const limpo = normalizeNif(nif ?? '');
  if (limpo === '') return 'Indique o NIF pessoal.';
  if (!isValidNif(limpo)) return 'Este NIF não é válido: confirme os nove algarismos.';
  if (isCompanyNif(limpo)) return 'Este é um NIF de empresa. A comissão é paga em nome próprio: indique o NIF pessoal.';
  return null;
}

// ---------------------------------------------------------------------------------------------------
// Condições
// ---------------------------------------------------------------------------------------------------

export interface FichaDoAvaliador {
  userId: string;
  orgId: string;
  /** NIPC da empresa (fornecedor) a que pertence. */
  nipcDaEmpresa: string | null;
  /** Inscrição de avaliador na versão em vigor. */
  inscrito: boolean;
  /** Confidencialidade dos levantamentos na versão em vigor. */
  confidencialidade: boolean;
  nomeCompleto: string | null;
  /** WhatsApp ligado, com número em formato internacional. */
  whatsapp: boolean;
  concelhoBase: string | null;
  raioKm: number | null;
  /** Suspenso em «Disponibilidade» hoje. */
  suspenso: boolean;
  emCurso: number;
}

/**
 * O que falta para receber convites, numa frase cada — vazio quando está tudo. É a mesma lista que o
 * ecrã do avaliador mostra, para a pessoa saber o que fazer em vez de simplesmente não ser chamada.
 */
export function motivosDeInelegibilidade(f: FichaDoAvaliador, regras: RegrasDaConvocatoria = REGRAS_DA_CONVOCATORIA): string[] {
  const m: string[] = [];
  if (!f.nipcDaEmpresa || !isValidNif(f.nipcDaEmpresa) || !isCompanyNif(f.nipcDaEmpresa)) m.push('A empresa precisa de um NIPC válido nos dados da entidade.');
  if (!f.inscrito) m.push('Falta a inscrição como avaliador.');
  if (!f.confidencialidade) m.push('Falta aceitar a confidencialidade dos levantamentos.');
  if (!f.nomeCompleto || f.nomeCompleto.trim().split(/\s+/).length < 2) m.push('Falta o nome completo no perfil: o cliente vai recebê-lo em casa.');
  if (!f.whatsapp) m.push('Falta ligar o WhatsApp, com um telemóvel pessoal.');
  if (!f.concelhoBase) m.push('Falta o concelho base.');
  if (f.raioKm == null || !regras.raiosKm.includes(f.raioKm)) m.push('Falta o raio de deslocação.');
  if (f.suspenso) m.push('A presença está suspensa.');
  if (f.emCurso >= regras.maximoEmCurso) m.push(`Já tem ${f.emCurso} levantamentos em curso: novos convites voltam quando um terminar.`);
  return m;
}

// ---------------------------------------------------------------------------------------------------
// Zona
// ---------------------------------------------------------------------------------------------------

export type Coordenadas = readonly [number, number];

/** Distância em km entre dois pontos [latitude, longitude] (fórmula de haversine). */
export function distanciaKm(a: Coordenadas, b: Coordenadas): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Em que anel da obra está este avaliador: 0 no mesmo concelho, 1 até ao primeiro raio fixo (25 km), 2 até
 * ao segundo (50 km), 3 além disso; null se a obra fica fora do raio que a própria pessoa declarou — nunca
 * se convida alguém para onde disse que não vai. O mesmo concelho conta sempre, seja qual for o raio.
 */
export function anel(
  concelhoDaObra: string,
  concelhoBase: string,
  raioKm: number,
  centros: Readonly<Record<string, Coordenadas>>,
  regras: RegrasDaConvocatoria = REGRAS_DA_CONVOCATORIA,
): number | null {
  if (concelhoDaObra === concelhoBase) return 0;
  const a = centros[concelhoDaObra];
  const b = centros[concelhoBase];
  if (!a || !b) return null;
  const d = distanciaKm(a, b);
  if (d > raioKm) return null;
  const i = regras.aneisKm.findIndex((limite) => d <= limite);
  return i === -1 ? regras.aneisKm.length + 1 : i + 1;
}

// ---------------------------------------------------------------------------------------------------
// Ondas
// ---------------------------------------------------------------------------------------------------

export interface Candidato {
  userId: string;
  /** Anel da obra em que está (já filtrado: quem está fora do próprio raio não chega aqui). */
  anel: number;
  /** Levantamentos já avaliados. */
  avaliacoes: number;
  /** Média de estrelas desses levantamentos (1-5), ou null. */
  media: number | null;
  /** Desempenho, para a qualidade (a mesma de `surveyorShareBp`). */
  desempenho: SurveyorPerformance;
  inscritoEm: Date;
  ultimaAtribuicao: Date | null;
  /** Último incumprimento provado (reserva libertada pela matriz), ou null. */
  ultimoIncumprimento: Date | null;
}

/** Qualidade 0-100: a posição na banda de comissão. Uma regra só para pagar e para ordenar. */
export function qualidade(d: SurveyorPerformance): number {
  return ((surveyorShareBp(d) - SURVEYOR_SHARE_OF_VALUE_BP_MIN) / (SURVEYOR_SHARE_OF_VALUE_BP_MAX - SURVEYOR_SHARE_OF_VALUE_BP_MIN)) * 100;
}

const HORA = 3_600_000;
const DIA = 24 * HORA;

/** Só a partir da 2.ª onda: nota baixa com avaliações suficientes, ou incumprimento recente. */
export function soDaSegundaOnda(c: Candidato, agora: Date, regras: RegrasDaConvocatoria = REGRAS_DA_CONVOCATORIA): boolean {
  const notaBaixa = c.media != null && c.avaliacoes >= regras.notaBaixaMinimoAvaliacoes && c.media < regras.notaBaixa;
  const incumprimento = c.ultimoIncumprimento != null && agora.getTime() - c.ultimoIncumprimento.getTime() < DIAS_FORA_DA_PRIMEIRA_ONDA * DIA;
  return notaBaixa || incumprimento;
}

/** Tamanho da onda para `n` pessoas disponíveis. */
export function tamanhoDaOnda(n: number, regras: RegrasDaConvocatoria = REGRAS_DA_CONVOCATORIA): number {
  return Math.min(n, Math.min(regras.ondaMaxima, Math.max(regras.ondaMinima, Math.ceil(n / 2))));
}

/**
 * Quem convidar na onda `numero` (1, 2, 3…). `candidatos` são os elegíveis, dentro do próprio raio, que
 * ainda não foram convidados para este levantamento nem o perderam por prazo. Devolve os `userId` pela
 * ordem de convite; vazio quando já não há a quem convidar.
 *
 * Anéis: usam-se os mais próximos até haver pelo menos o mínimo de uma onda — num concelho com 10
 * avaliadores ninguém de fora é chamado na primeira onda; num com 1, junta-se o anel seguinte.
 */
export function onda(numero: number, candidatos: readonly Candidato[], agora: Date, regras: RegrasDaConvocatoria = REGRAS_DA_CONVOCATORIA): string[] {
  // «Só a partir da 2.ª onda» quer dizer «depois dos outros», não «nunca»: se na primeira onda não houver mais
  // ninguém, vão eles — senão um levantamento com um único avaliador na zona ficava parado (05/11/2026).
  const primeiros = numero === 1 ? candidatos.filter((c) => !soDaSegundaOnda(c, agora, regras)) : [...candidatos];
  const pool = primeiros.length > 0 ? primeiros : [...candidatos];
  if (pool.length === 0) return [];

  const aneis = [...new Set(pool.map((c) => c.anel))].sort((a, b) => a - b);
  let emUso: Candidato[] = [];
  for (const a of aneis) {
    emUso = pool.filter((c) => c.anel <= a);
    if (emUso.length >= regras.ondaMinima) break;
  }

  const tamanho = tamanhoDaOnda(emUso.length, regras);
  const lugaresNovos = Math.floor(tamanho / 2);
  const recente = (c: Candidato) => c.ultimaAtribuicao != null && agora.getTime() - c.ultimaAtribuicao.getTime() < regras.rotacaoHoras * HORA;
  const e = (c: Candidato) => c.avaliacoes < regras.novoAbaixoDe;

  const novos = emUso
    .filter(e)
    .sort((a, b) => a.anel - b.anel || Number(recente(a)) - Number(recente(b)) || a.inscritoEm.getTime() - b.inscritoEm.getTime() || a.userId.localeCompare(b.userId));
  const outros = emUso
    .filter((c) => !e(c))
    .sort(
      (a, b) =>
        a.anel - b.anel ||
        Number(recente(a)) - Number(recente(b)) ||
        qualidade(b.desempenho) - qualidade(a.desempenho) ||
        (a.ultimaAtribuicao?.getTime() ?? 0) - (b.ultimaAtribuicao?.getTime() ?? 0) ||
        a.userId.localeCompare(b.userId),
    );

  const escolhidosNovos = novos.slice(0, lugaresNovos);
  const escolhidosOutros = outros.slice(0, tamanho - escolhidosNovos.length);
  const faltam = tamanho - escolhidosNovos.length - escolhidosOutros.length;
  const maisNovos = faltam > 0 ? novos.slice(lugaresNovos, lugaresNovos + faltam) : [];
  return [...escolhidosOutros, ...escolhidosNovos, ...maisNovos].map((c) => c.userId);
}

// ---------------------------------------------------------------------------------------------------
// Tempo
// ---------------------------------------------------------------------------------------------------

export type PassoDaConvocatoria =
  | { tipo: 'aguardar'; ate: Date | null }
  | { tipo: 'nova_onda'; numero: number }
  | { tipo: 'sem_candidatos' }
  | { tipo: 'esgotada' };

/**
 * O que fazer agora com um levantamento aberto. `ondas` é o número de ondas já enviadas e `ultimaOnda`
 * quando saiu a última. `haMaisCandidatos` diz se a próxima onda teria alguém (a função `onda` não vazia).
 *
 * Sem ninguém a quem convidar **antes da primeira onda** não é esgotar: é «sem candidatos» — avisa-se a
 * equipa e o levantamento continua à espera, para o primeiro avaliador que se inscrever na zona o receber.
 * (Correção de 05/11/2026: na primeira passagem com as chaves ligadas, três levantamentos de Viana do
 * Castelo foram dados por esgotados só porque ainda ninguém tinha configurado o WhatsApp.) Esgotar fica para
 * quem já recebeu ondas e ninguém aceitou, ou cujos convidados já se acabaram.
 */
export function proximoPasso(
  ondas: number,
  ultimaOnda: Date | null,
  agora: Date,
  haMaisCandidatos: boolean,
  regras: RegrasDaConvocatoria = REGRAS_DA_CONVOCATORIA,
): PassoDaConvocatoria {
  if (ondas > 0 && ultimaOnda) {
    const fim = somarMinutosUteis(ultimaOnda, regras.janelaMinutosUteis);
    if (agora < fim) return { tipo: 'aguardar', ate: fim };
  }
  if (ondas === 0 && !haMaisCandidatos) return { tipo: 'sem_candidatos' };
  if (ondas >= regras.maximoDeOndas || !haMaisCandidatos) return { tipo: 'esgotada' };
  if (!dentroDoHorarioUtil(agora)) return { tipo: 'aguardar', ate: null };
  return { tipo: 'nova_onda', numero: ondas + 1 };
}

// ---------------------------------------------------------------------------------------------------
// Mensagens
// ---------------------------------------------------------------------------------------------------

/**
 * O texto do convite: o do modelo `avaliador_nova_oportunidade`, **como está aprovado na Meta** (lido a
 * 05/11/2026 no WhatsApp Manager), com {{1}} a localização e {{2}} a descrição. A localização é só o
 * concelho — a morada só chega a quem reserva (regra 6 do CLAUDE.md, e a dupla chave de 31/10/2026).
 * Mudar este texto aqui não muda o que chega: o que chega é o que a Meta aprovou. Se o modelo for recriado,
 * o texto tem de ser submetido igual a este.
 */
export const CORPO_DO_MODELO_DO_CONVITE =
  'Quem Pinta: há um levantamento disponível em {{1}} ({{2}}). Aceite-o em quempinta.pt. Após aceitar, tem uma hora útil para contactar o cliente.';

export function textoDoConvite(concelho: string, descricao: string): string {
  return CORPO_DO_MODELO_DO_CONVITE.replace('{{1}}', concelho).replace('{{2}}', descricao);
}

export const TEXTO_JA_ATRIBUIDA =
  'Esta oportunidade já foi aceite por outro avaliador. Obrigado pela disponibilidade — o próximo convite segue pela mesma via.';

export const TEXTO_ATRIBUIDA = (ligacao: string) =>
  `Levantamento reservado. O contacto com o cliente deve acontecer até ao fim da primeira hora útil. Ficha e contactos: ${ligacao}`;

/** Descrição curta e não identificável do prédio para o convite: tipo de obra e área, nunca a morada. */
export function descricaoDoConvite(tipo: string, areaM2: number | null): string {
  const t = tipo.trim() || 'pintura';
  return areaM2 && areaM2 > 0 ? `${t}, cerca de ${Math.round(areaM2)} m²` : t;
}
