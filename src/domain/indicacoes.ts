import type { Cents } from './money';
import type { Indicacao } from './metodologia';

/**
 * As indicações: **a mais barata**, **a mais completa** e **a Escolha Quem Pinta** (versão 1.1 da
 * metodologia, 02/11/2026, a pedido do promotor). As duas primeiras são factos verificáveis; a terceira
 * é a sugestão da plataforma, sempre com a justificação escrita em números da própria matriz.
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
  /**
   * Trabalhos que a proposta inclui **além** do que foi pedido (sem acessos, licenças nem a
   * linha de preço global, que não são trabalhos): quantos e quanto somam. Zero quando não há.
   */
  aMais?: { n: number; valorCents: Cents };
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
        { indicacao: 'mais_completa', motivo: 'Com uma proposta só não há comparação a fazer.' },
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

  // 1b. A mais completa: mais trabalhos pedidos cobertos com preço fechado; depois mais trabalhos a
  // mais; depois menor total. Diz quantos trabalhos a mais traz e quanto custam.
  const cobertos = (p: PropostaParaIndicacao) => trabalhosPedidos - p.naoIndicados - p.excluidos;
  const aMaisDe = (p: PropostaParaIndicacao) => p.aMais ?? { n: 0, valorCents: 0 };
  let maisCompleta: PropostaParaIndicacao | null = null;
  if (trabalhosPedidos > 0) {
    const ordem = [...ps].sort(
      (a, b) => cobertos(b) - cobertos(a) || aMaisDe(b).n - aMaisDe(a).n || a.totalComIva - b.totalComIva,
    );
    const primeira = ordem[0]!;
    const empatadas = ordem.filter(
      (p) => cobertos(p) === cobertos(primeira) && aMaisDe(p).n === aMaisDe(primeira).n && p.totalComIva === primeira.totalComIva,
    );
    if (empatadas.length > 1) {
      naoAtribuidas.push({ indicacao: 'mais_completa', motivo: `${empatadas.map((p) => p.alias).join(' e ')} incluem o mesmo: não há uma mais completa.` });
    } else {
      maisCompleta = primeira;
      const extra = aMaisDe(primeira);
      const falta = trabalhosPedidos - cobertos(primeira);
      const nota =
        (falta === 0 ? 'inclui todos os trabalhos pedidos' : `inclui ${cobertos(primeira)} dos ${trabalhosPedidos} trabalhos pedidos`) +
        (extra.n > 0 ? ` e acrescenta ${extra.n === 1 ? 'um trabalho que não foi pedido' : `${extra.n} trabalhos que não foram pedidos`} (${formata(extra.valorCents)}).` : ', sem trabalhos a mais.') +
        (!primeira.precoFirme ? ' Parte do preço só fecha depois de observar.' : '');
      atribuidas.push({
        indicacao: 'mais_completa',
        propostaId: primeira.id,
        alias: primeira.alias,
        valor: formata(primeira.totalComIva),
        nota,
        justificacao: `${formata(primeira.totalComIva)}, ${nota}`,
      });
    }
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
      motivo: 'Nenhuma proposta declara incluir todos os trabalhos pedidos sem custos condicionados: não há Escolha Quem Pinta.',
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
  // E contra a mais completa, quando é outra: o que ela acrescenta não foi pedido, e a diferença de
  // preço ou corresponde a esses trabalhos ou excede-os — é isso que justifica a escolha.
  let contraAMaisCompleta = '';
  if (maisCompleta && maisCompleta.id !== vencedora.id) {
    const dif = maisCompleta.totalComIva - vencedora.totalComIva;
    const extra = aMaisDe(maisCompleta);
    if (dif > 0) {
      const oQueAcrescenta = extra.n > 0 ? `acrescenta ${extra.n === 1 ? 'um trabalho que não foi pedido' : `${extra.n} trabalhos que não foram pedidos`}` : 'não acrescenta trabalhos ao pedido';
      const leitura =
        extra.n > 0 && dif > extra.valorCents
          ? ` — a diferença de preço (${formata(dif)}) é superior ao valor desses trabalhos (${formata(extra.valorCents)}); o resto é preço mais alto pelos mesmos trabalhos.`
          : extra.n > 0
            ? ` — a diferença de preço (${formata(dif)}) corresponde a esses trabalhos; vale a pena se os quiser.`
            : ` — custa mais ${formata(dif)} pelo mesmo pedido.`;
      contraAMaisCompleta = ` A mais completa (${maisCompleta.alias}) ${oQueAcrescenta}${leitura}`;
    }
  }
  const notaCompleta = `declara incluir todos os trabalhos pedidos, sem custos condicionados declarados.${contraOMenor}${contraAMaisCompleta}`;
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
