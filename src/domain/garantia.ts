// Conclusão da obra, início da garantia e conservação dos registos (decisão do promotor, 06/11/2026).
//
// A plataforma é terceira isenta: guarda o registo e a prova documental e não decide quem tem razão.
//
// - **A garantia começa** quando o pintor declara a conclusão na aplicação e o cliente a confirma (ou ao
//   contrário: qualquer das partes declara, a outra é avisada e pode confirmar). Se a outra parte não
//   confirmar, fica registado que só uma parte declarou, e essa parte é convidada a juntar prova
//   (fotografia ou PDF). A outra parte pode **discordar com uma razão escrita**, que fica registada sem a
//   plataforma a julgar. Cada passo vai para um registo só de acrescentar, com a data do servidor.
// - **Duração da garantia:** o número de anos da proposta escolhida, guardado na contratação no momento
//   em que é criada (`engagements.garantia_anos`, só nas contratações novas). O texto do contrato
//   («5. Garantia da obra») já diz que a garantia contratual não reduz o prazo legal de cinco anos do
//   artigo 1225.º do Código Civil, quando aplicável — este cálculo é o da garantia contratual e não o
//   contradiz.
// - **Conservação:** nada do registo da obra se apaga até 24 meses depois do fim da garantia. Não há
//   apagamento automático; depois do período, só a pedido e pelo modo que o jurista decidir.
//
// Propostas do chat, por confirmar pelo promotor (`docs/EM_ABERTO.md`): o prazo de 15 dias para a outra
// parte confirmar (com lembrete aos 7), a discordância com razão, a ação própria «Declarar a conclusão»
// em vez do estado `concluida` do diário, e nenhum limite para os registos de uma obra que ninguém
// declarou concluída.

export const MESES_DE_CONSERVACAO = 24;
/** Dias que a outra parte tem para confirmar, antes de ficar «declarada por uma só parte». Proposta. */
export const DIAS_PARA_CONFIRMAR = 15;
/** Lembrete à outra parte, a meio do prazo. Proposta. */
export const DIAS_DO_LEMBRETE = 7;

export type Lado = 'cliente' | 'pintor';
export const PASSOS_DA_CONCLUSAO = ['declarou', 'confirmou', 'discordou', 'juntou_prova'] as const;
export type PassoDaConclusao = (typeof PASSOS_DA_CONCLUSAO)[number];
export const PASSO_LABELS: Record<PassoDaConclusao, string> = {
  declarou: 'declarou a obra concluída',
  confirmou: 'confirmou a conclusão',
  discordou: 'discordou da conclusão',
  juntou_prova: 'juntou prova',
};

export interface PassoRegistado {
  lado: Lado;
  passo: PassoDaConclusao;
  /** AAAA-MM-DD: a data de conclusão declarada (só em «declarou»). */
  dataConclusao: string | null;
  criadoEm: string;
}

export type EstadoDaConclusao =
  | { estado: 'por_declarar' }
  | { estado: 'por_confirmar'; declaradaPor: Lado; dataConclusao: string; prazo: string }
  | { estado: 'uma_parte'; declaradaPor: Lado; dataConclusao: string }
  | { estado: 'contestada'; declaradaPor: Lado; dataConclusao: string }
  | { estado: 'confirmada'; dataConclusao: string; confirmadaEm: string };

const outra = (l: Lado): Lado => (l === 'cliente' ? 'pintor' : 'cliente');
const somarDias = (iso: string, dias: number) => new Date(Date.parse(iso) + dias * 86_400_000).toISOString();

/**
 * O estado, a partir dos passos registados. Conta a declaração mais recente: uma nova declaração (outra
 * data, por exemplo, depois de uma discordância) recomeça o prazo e pede nova confirmação.
 */
export function estadoDaConclusao(passos: readonly PassoRegistado[], agora: Date): EstadoDaConclusao {
  const ordenados = [...passos].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const ultimaDeclaracao = [...ordenados].reverse().find((p) => p.passo === 'declarou' && p.dataConclusao);
  if (!ultimaDeclaracao) return { estado: 'por_declarar' };
  const depois = ordenados.filter((p) => p.criadoEm >= ultimaDeclaracao.criadoEm && p.lado === outra(ultimaDeclaracao.lado));
  const confirmacao = depois.find((p) => p.passo === 'confirmou');
  const discordancia = depois.find((p) => p.passo === 'discordou');
  const data = ultimaDeclaracao.dataConclusao!;
  if (confirmacao && (!discordancia || confirmacao.criadoEm > discordancia.criadoEm)) {
    return { estado: 'confirmada', dataConclusao: data, confirmadaEm: confirmacao.criadoEm };
  }
  if (discordancia) return { estado: 'contestada', declaradaPor: ultimaDeclaracao.lado, dataConclusao: data };
  const prazo = somarDias(ultimaDeclaracao.criadoEm, DIAS_PARA_CONFIRMAR);
  if (Date.parse(prazo) <= agora.getTime()) return { estado: 'uma_parte', declaradaPor: ultimaDeclaracao.lado, dataConclusao: data };
  return { estado: 'por_confirmar', declaradaPor: ultimaDeclaracao.lado, dataConclusao: data, prazo };
}

/** O que esta parte pode fazer agora. */
export function passosPossiveis(e: EstadoDaConclusao, lado: Lado): PassoDaConclusao[] {
  switch (e.estado) {
    case 'por_declarar':
      return ['declarou'];
    case 'por_confirmar':
    case 'uma_parte':
      return e.declaradaPor === lado ? ['juntou_prova', 'declarou'] : ['confirmou', 'discordou', 'juntou_prova'];
    case 'contestada':
      return ['juntou_prova', 'declarou', ...(e.declaradaPor === lado ? [] : (['confirmou'] as const))];
    case 'confirmada':
      return ['juntou_prova'];
  }
}

/** AAAA-MM-DD + n meses, no último dia do mês quando não existe (29/02 + 12 meses = 28/02). */
export function somarMeses(dataIso: string, meses: number): string {
  const [a, m, d] = dataIso.split('-').map(Number) as [number, number, number];
  const total = a * 12 + (m - 1) + meses;
  const ano = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(d, ultimo)).padStart(2, '0')}`;
}

export interface Garantia {
  inicio: string;
  anos: number;
  fimDaGarantia: string;
  fimDaConservacao: string;
}

/**
 * Fim da garantia = início + duração; fim da conservação = esse fim + 24 meses. `null` sem início
 * confirmado ou sem a duração como número — nunca se inventa uma.
 */
export function calcularGarantia(inicio: string | null, anos: number | null): Garantia | null {
  if (!inicio || !/^\d{4}-\d{2}-\d{2}$/.test(inicio) || anos === null || !Number.isInteger(anos) || anos < 0) return null;
  const fimDaGarantia = somarMeses(inicio, anos * 12);
  return { inicio, anos, fimDaGarantia, fimDaConservacao: somarMeses(fimDaGarantia, MESES_DE_CONSERVACAO) };
}

/** A data em que a garantia começa: só com a conclusão confirmada pelas duas partes. */
export const inicioDaGarantia = (e: EstadoDaConclusao): string | null => (e.estado === 'confirmada' ? e.dataConclusao : null);

export interface PassoComId extends PassoRegistado {
  id: string;
  engagementId: string;
}

/**
 * Os lembretes que se devem hoje (decisão do promotor, 06/11/2026: lembrete ao 7.º dia). Para cada
 * contratação cuja conclusão está por confirmar, a declaração mais recente com 7 dias ou mais pede um
 * lembrete à outra parte. A chave do lembrete é a declaração: a tarefa diária regista-o em `toques` e
 * nunca o envia duas vezes; uma nova declaração tem o seu próprio lembrete.
 */
export function lembretesDaConclusao(passos: readonly PassoComId[], agora: Date): { declaracaoId: string; engagementId: string; para: Lado }[] {
  const porContratacao = new Map<string, PassoComId[]>();
  for (const p of passos) porContratacao.set(p.engagementId, [...(porContratacao.get(p.engagementId) ?? []), p]);
  const devidos: { declaracaoId: string; engagementId: string; para: Lado }[] = [];
  for (const [engagementId, lista] of porContratacao) {
    const e = estadoDaConclusao(lista, agora);
    if (e.estado !== 'por_confirmar') continue;
    const declaracao = [...lista].filter((p) => p.passo === 'declarou' && p.dataConclusao).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0];
    if (!declaracao) continue;
    if (agora.getTime() - Date.parse(declaracao.criadoEm) >= DIAS_DO_LEMBRETE * 86_400_000) {
      devidos.push({ declaracaoId: declaracao.id, engagementId, para: declaracao.lado === 'cliente' ? 'pintor' : 'cliente' });
    }
  }
  return devidos;
}
