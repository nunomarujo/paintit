import { esvaziarFilaDeAvisos, pedidoAutorizado } from '@/lib/avisosPorEmail';

/**
 * O caminho imediato: a base de dados pede o esvaziamento da fila logo que um aviso entra nela (pg_net), e
 * outra vez em cada verificação ao minuto se ficou alguma linha para trás.
 *
 * Aceita POST porque é um pedido que muda estado. A tarefa diária de recuperação está em
 * /api/cron/avisos e usa a mesma função.
 */
export async function POST(req: Request) {
  if (!pedidoAutorizado(req)) return new Response('Não autorizado', { status: 401 });
  const resumo = await esvaziarFilaDeAvisos();
  return Response.json(resumo);
}
