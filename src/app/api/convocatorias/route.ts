import { pedidoAutorizado } from '@/lib/avisosPorEmail';
import { avancarConvocatorias } from '@/lib/convocatorias';

/**
 * Avança as convocatórias por ondas (05/11/2026). Chamada pela base ao minuto (`private.pedir_convocatorias`,
 * com o mesmo segredo dos avisos), e só quando há levantamentos à espera, em horário útil.
 */
export async function POST(req: Request) {
  if (!pedidoAutorizado(req)) return new Response('Não autorizado', { status: 401 });
  return Response.json(await avancarConvocatorias());
}

export const GET = POST;
