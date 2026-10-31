import { esvaziarFilaDeAvisos, pedidoAutorizado } from '@/lib/avisosPorEmail';

/**
 * A rede de último recurso: uma passagem diária pela fila, para o caso de o pedido imediato da base de
 * dados não ter chegado (pg_net em baixo, segredo trocado, aplicação indisponível no momento).
 *
 * Diária e não mais frequente porque o plano atual da Vercel (Hobby) só permite tarefas uma vez por dia, com
 * precisão à hora, e recusa o deploy a qualquer expressão mais frequente. Num prazo de uma hora, isto não
 * substitui o caminho imediato — apanha o que ele perdeu, no dia seguinte. É por isso que as repetições
 * dentro da hora vivem na verificação ao minuto, dentro da base.
 */
export async function GET(req: Request) {
  if (!pedidoAutorizado(req)) return new Response('Não autorizado', { status: 401 });
  const resumo = await esvaziarFilaDeAvisos(100);
  return Response.json(resumo);
}
