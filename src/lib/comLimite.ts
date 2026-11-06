/**
 * Espera por uma promessa no máximo `ms` milissegundos (06/11/2026).
 *
 * O middleware pergunta ao Supabase, em cada pedido, quem é o utilizador. A 06/11/2026, às 12:18, essa
 * pergunta ficou sem resposta e a Vercel cortou o pedido aos 25 s: a página não abriu. Com um limite, quem
 * chama decide o que fazer quando a resposta não chega — em vez de a página inteira esperar por ela.
 * Uma promessa que falhe dentro do prazo continua a falhar (não se transforma em «esgotado»).
 */
export type ComLimite<T> = { tipo: 'ok'; valor: T } | { tipo: 'esgotado' };

export function comLimite<T>(promessa: Promise<T>, ms: number): Promise<ComLimite<T>> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const esgotado = new Promise<ComLimite<T>>((resolve) => {
    temporizador = setTimeout(() => resolve({ tipo: 'esgotado' }), ms);
  });
  return Promise.race([promessa.then((valor): ComLimite<T> => ({ tipo: 'ok', valor })), esgotado]).finally(() => clearTimeout(temporizador));
}
