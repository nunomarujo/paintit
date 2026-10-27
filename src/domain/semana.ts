import { formatEuros, type Cents } from './money';

/**
 * O email de segunda-feira: o número da semana de uma empresa de pintura (27/10/2026).
 *
 * As duas ferramentas novas — o seguimento dos orçamentos e a cobrança — trabalham sozinhas, e têm
 * por isso o mesmo risco: podem acontecer sem ninguém dar por elas, e uma subscrição que não se
 * sente não se renova. Este email é o que as torna visíveis, e chega a quem não abriu a aplicação
 * nessa semana.
 *
 * Três regras de desenho, e a terceira é a que mais custa a cumprir:
 *
 * 1. **Quatro linhas, não um relatório.** Quem recebe isto está a abrir a caixa de correio na
 *    segunda de manhã, numa carrinha.
 * 2. **Só o que mudou ou está a chegar.** Uma linha que diz "zero" todas as semanas ensina a apagar
 *    o email sem o abrir, e leva as outras três com ela.
 * 3. **Se não houver nada, não se envia.** Um email semanal garantido é publicidade; um email que
 *    só aparece quando há matéria é informação.
 */

export interface DadosDaSemana {
  /** Tranches por receber cuja data prevista já passou. */
  emAtraso: { valorCents: Cents; prevista: string }[];
  /** Tranches por receber que vencem nos próximos sete dias. */
  aVencer: { valorCents: Cents; prevista: string }[];
  /** Orçamentos enviados, ainda sem desfecho, com a data de envio. */
  orcamentosAEspera: { enviadoEm: string }[];
  /** Documentos da empresa que caducam nos próximos trinta dias. */
  documentosACaducar: { nome: string; validoAte: string }[];
  /** A empresa tem o plano Pro? Sem ele, as ferramentas que fariam o trabalho estão desligadas. */
  pro: boolean;
}

export interface ResumoDaSemana {
  linhas: string[];
  /** Nada a dizer: não se envia nada. */
  vazio: boolean;
}

const dias = (de: string, ate: string) =>
  Math.round((new Date(`${ate}T00:00:00Z`).getTime() - new Date(`${de}T00:00:00Z`).getTime()) / 86_400_000);
const soma = (xs: { valorCents: Cents }[]) => xs.reduce((n, x) => n + x.valorCents, 0);
const pt = (iso: string) => iso.split('-').reverse().join('/');

export function resumoDaSemana(d: DadosDaSemana, hoje: string): ResumoDaSemana {
  const linhas: string[] = [];

  if (d.emAtraso.length > 0) {
    // O mais antigo é o que diz se isto é um atraso ou um problema.
    const antigo = [...d.emAtraso].sort((a, b) => a.prevista.localeCompare(b.prevista))[0]!;
    const idade = dias(antigo.prevista, hoje);
    linhas.push(
      `Na rua: ${formatEuros(soma(d.emAtraso))} por receber fora do prazo, o mais antigo há ${idade} ${idade === 1 ? 'dia' : 'dias'}.`,
    );
  }

  if (d.aVencer.length > 0) {
    linhas.push(`Vence nos próximos sete dias: ${formatEuros(soma(d.aVencer))}, em ${d.aVencer.length} ${d.aVencer.length === 1 ? 'tranche' : 'tranches'}.`);
  }

  if (d.orcamentosAEspera.length > 0) {
    const antigo = [...d.orcamentosAEspera].sort((a, b) => a.enviadoEm.localeCompare(b.enviadoEm))[0]!;
    const idade = dias(antigo.enviadoEm, hoje);
    const n = d.orcamentosAEspera.length;
    linhas.push(
      `Orçamentos à espera de resposta: ${n}, o mais antigo enviado há ${idade} ${idade === 1 ? 'dia' : 'dias'}.`,
    );
  }

  for (const doc of d.documentosACaducar) {
    linhas.push(`Caduca a ${pt(doc.validoAte)}: ${doc.nome}.`);
  }

  // A única linha que vende alguma coisa, e só quando houve mesmo trabalho que ficou por fazer.
  if (!d.pro && (d.emAtraso.length > 0 || d.orcamentosAEspera.length > 0)) {
    linhas.push('Com o plano Pro, a Quem Pinta pergunta por si — aos clientes que receberam orçamento e aos que têm pagamentos em atraso.');
  }

  return { linhas, vazio: linhas.length === 0 };
}
