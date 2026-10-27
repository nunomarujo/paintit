/**
 * A aceitação simples do contrato: quando é que a plataforma deixa dar uma assinatura por feita sem
 * o PDF assinado com Chave Móvel Digital (27/10/2026).
 *
 * Existe para uma coisa só: poder exercitar o percurso da contratação de ponta a ponta sem uma
 * assinatura real. Era controlada por `PERMITIR_ACEITACAO_SIMPLES=1` no ambiente, e isso bastava —
 * a variável estava definida em produção, e quem lhe trocasse o valor abria a porta de par em par.
 *
 * A regra passa a ter duas chaves, e a segunda não se pode trocar no painel: **em produção não há
 * aceitação simples, qualquer que seja o valor da variável**. Fora de produção continua a precisar
 * dela, para não ficar ligada por distracção em nenhum ambiente de ensaio.
 */
export interface AmbienteDaAceitacao {
  NODE_ENV?: string;
  PERMITIR_ACEITACAO_SIMPLES?: string;
}

export function aceitacaoSimples(env: AmbienteDaAceitacao): boolean {
  if (env.NODE_ENV === 'production') return false;
  return env.PERMITIR_ACEITACAO_SIMPLES === '1';
}
