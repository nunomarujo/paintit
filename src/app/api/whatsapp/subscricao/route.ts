import { configuracaoWhatsApp } from '@/domain/whatsapp';
import { pedidoAutorizado } from '@/lib/avisosPorEmail';

/**
 * A subscrição da aplicação a uma conta WhatsApp Business (05/11/2026).
 *
 * Subscrever o campo «messages» no painel da aplicação não chega: a Meta só entrega mensagens e estados de
 * uma conta WhatsApp à aplicação que estiver subscrita **a essa conta** (`/{waba}/subscribed_apps`). Uma conta
 * criada à mão, como a que substituiu a da Twilio, nasce sem essa subscrição, e o teste do painel — que
 * ignora a conta — dá a ilusão de que tudo funciona. Esta rota faz a chamada com o token que já está no
 * servidor, para ninguém ter de o tirar de lá.
 *
 * GET lista as aplicações subscritas; POST subscreve a da chave. Protegida pelo mesmo segredo dos outros
 * trabalhos internos; o identificador da conta vem no pedido e só aceita algarismos.
 */
async function chamar(metodo: 'GET' | 'POST', req: Request) {
  if (!pedidoAutorizado(req)) return new Response('Não autorizado', { status: 401 });
  const cfg = configuracaoWhatsApp(process.env);
  if (!cfg) return new Response('Canal desligado', { status: 503 });
  const waba = new URL(req.url).searchParams.get('waba') ?? '';
  if (!/^\d{8,20}$/.test(waba)) return new Response('Identificador da conta inválido', { status: 400 });
  const r = await fetch(`https://graph.facebook.com/${cfg.versaoApi}/${waba}/subscribed_apps`, {
    method: metodo,
    headers: { Authorization: `Bearer ${cfg.token}` },
  });
  return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json' } });
}

export const GET = (req: Request) => chamar('GET', req);
export const POST = (req: Request) => chamar('POST', req);
