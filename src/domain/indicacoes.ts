import type { Cents } from './money';
import type { Indicacao } from './metodologia';

/**
 * As indicações da Fase 1: **factos verificáveis, não conselhos**.
 *
 * As duas que aqui estão lêem-se directamente do que as propostas declaram — qual tem o menor total
 * e, entre as que cobrem o pedido com preço firme, qual tem o menor total. Nenhuma precisa de
 * valorizar materiais, tempos ou equipamentos, e portanto nenhuma depende de referências que a
 * plataforma ainda não tem calibradas.
 *
 * **O que não está aqui, e porquê.** O destaque que combinaria preço e reputação exige um limiar —
 * «dentro de uma faixa de preço próxima da melhor» — e esse limiar não foi calibrado com obras
 * reais. Inventá-lo agora seria produzir uma recomendação frágil com ar de regra, que é precisamente
 * o que o plano do promotor manda evitar. O histórico mostra-se na matriz; não decide nada.
 *
 * **Uma indicação não atribuída diz porquê.** O silêncio lê-se como desinteresse ou como erro; a
 * razão escrita lê-se como o que é — não havia base para a atribuir.
 */

export interface PropostaParaIndicacao {
  id: string;
  alias: string;
  /** Total com IVA, tal como a proposta o apresenta. */
  totalComIva: Cents;
  /** Sem partes por determinar depois de observar, e sem zonas do pedido sem preço. */
  precoFirme: boolean;
  /** Trabalhos pedidos sobre os quais a proposta não se pronuncia. */
  naoIndicados: number;
  /** Trabalhos pedidos que a proposta declara expressamente não fazer. */
  excluidos: number;
}

export interface IndicacaoAtribuida {
  indicacao: Indicacao;
  propostaId: string;
  alias: string;
  /** A razão, em números verificáveis na própria matriz. */
  justificacao: string;
  /**
   * O total, formatado, para o relatório o pôr em grande. E a razão **sem** o total à frente: dito
   * em grande e repetido na frase a seguir, o mesmo número lia-se duas vezes e nenhuma delas
   * acrescentava nada. `justificacao` continua a ser os dois juntos, para quem a quiser corrida.
   */
  valor: string;
  nota: string;
}

export interface IndicacaoNaoAtribuida {
  indicacao: Indicacao;
  motivo: string;
}

export interface Indicacoes {
  atribuidas: IndicacaoAtribuida[];
  naoAtribuidas: IndicacaoNaoAtribuida[];
}

const maisBaratas = (ps: PropostaParaIndicacao[]): PropostaParaIndicacao[] => {
  if (ps.length === 0) return [];
  const minimo = Math.min(...ps.map((p) => p.totalComIva));
  return ps.filter((p) => p.totalComIva === minimo);
};

export function indicacoes(
  ps: PropostaParaIndicacao[],
  formata: (c: Cents) => string,
  /** Quantos trabalhos o pedido indica. Zero: não há cobertura que se afira, e a indicação que dela
   *  depende não se atribui — diz-se porquê, em vez de se atribuir a partir de uma lista vazia. */
  trabalhosPedidos = 1,
): Indicacoes {
  const atribuidas: IndicacaoAtribuida[] = [];
  const naoAtribuidas: IndicacaoNaoAtribuida[] = [];

  if (ps.length < 2) {
    return {
      atribuidas: [],
      naoAtribuidas: [
        { indicacao: 'menor_preco', motivo: 'Com uma proposta só não há comparação a fazer.' },
        { indicacao: 'menor_preco_completo', motivo: 'Com uma proposta só não há comparação a fazer.' },
      ],
    };
  }

  // 1. Menor preço apresentado, sem olhar ao que inclui — e dizendo o que não inclui.
  const baratas = maisBaratas(ps);
  if (baratas.length > 1) {
    naoAtribuidas.push({
      indicacao: 'menor_preco',
      motivo: `${baratas.map((p) => p.alias).join(' e ')} apresentam o mesmo total: não há um menor preço.`,
    });
  } else {
    const p = baratas[0]!;
    const ressalvas = [
      // «Não incluídos» afirma o que a proposta não disse, e contradizia a matriz, que diz «por
      // esclarecer». E «preço firme» conclui do silêncio: o que se sabe é que nada foi declarado.
      p.naoIndicados
        ? `não esclarecer se inclui ${p.naoIndicados === 1 ? 'um trabalho pedido' : `${p.naoIndicados} trabalhos pedidos`}`
        : '',
      p.excluidos ? `${p.excluidos === 1 ? 'um trabalho pedido excluído' : `${p.excluidos} trabalhos pedidos excluídos`}` : '',
      !p.precoFirme ? 'parte do preço só fechar depois de observar' : '',
    ].filter(Boolean);
    const nota =
      'o menor total apresentado' +
      (ressalvas.length
        ? `, por ${ressalvas.join(' e ')}.`
        : ', e declara incluir todos os trabalhos pedidos, sem custos condicionados declarados.');
    atribuidas.push({
      indicacao: 'menor_preco',
      propostaId: p.id,
      alias: p.alias,
      valor: formata(p.totalComIva),
      nota,
      justificacao: `${formata(p.totalComIva)}, ${nota}`,
    });
  }

  // 2. Melhor preço para o pedido completo: só entre as comparáveis entre si.
  if (trabalhosPedidos === 0) {
    naoAtribuidas.push({
      indicacao: 'menor_preco_completo',
      motivo: 'O pedido não indica que trabalhos quer: não há cobertura que se possa aferir.',
    });
    return { atribuidas, naoAtribuidas };
  }

  const completas = ps.filter((p) => p.naoIndicados === 0 && p.excluidos === 0 && p.precoFirme);
  if (completas.length === 0) {
    naoAtribuidas.push({
      indicacao: 'menor_preco_completo',
      motivo: 'Nenhuma proposta declara incluir todos os trabalhos pedidos sem custos condicionados.',
    });
    return { atribuidas, naoAtribuidas };
  }

  const baratasCompletas = maisBaratas(completas);
  if (baratasCompletas.length > 1) {
    naoAtribuidas.push({
      indicacao: 'menor_preco_completo',
      motivo: `${baratasCompletas.map((p) => p.alias).join(' e ')} cobrem o pedido pelo mesmo total: não há uma mais barata.`,
    });
    return { atribuidas, naoAtribuidas };
  }

  const vencedora = baratasCompletas[0]!;
  const menorDeTodas = Math.min(...ps.map((p) => p.totalComIva));
  const diferenca = vencedora.totalComIva - menorDeTodas;
  // A comparação com o menor total só se faz quando é outra proposta: dizer que custa mais 0%
  // do que ela própria seria ruído.
  const contraOMenor =
    diferenca > 0
      ? ` Custa mais ${formata(diferenca)} (${(((diferenca / menorDeTodas) * 100)).toLocaleString('pt-PT', { maximumFractionDigits: 1 })}%) do que o menor preço apresentado, que não cobre o pedido todo.`
      : '';
  const notaCompleta = `declara incluir todos os trabalhos pedidos, sem custos condicionados declarados.${contraOMenor}`;
  atribuidas.push({
    indicacao: 'menor_preco_completo',
    propostaId: vencedora.id,
    alias: vencedora.alias,
    valor: formata(vencedora.totalComIva),
    nota: notaCompleta,
    justificacao: `${formata(vencedora.totalComIva)}, ${notaCompleta}`,
  });

  return { atribuidas, naoAtribuidas };
}

/** As indicações de uma proposta, para a coluna da matriz. */
export const indicacoesDe = (r: Indicacoes, propostaId: string): IndicacaoAtribuida[] =>
  r.atribuidas.filter((x) => x.propostaId === propostaId);
