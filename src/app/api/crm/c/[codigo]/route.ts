import { NextResponse } from 'next/server';
import { FLYERS } from '@/domain/campanhas';
import { adminClient } from '@/lib/supabase/admin';

/**
 * O link de um email do CRM: `/api/crm/c/<código do contacto>?e=<campanha>`. Regista o clique (uma vez por envio) e
 * encaminha para o destino da campanha com `k=<código>`, que fica à vista na adesão. Pré-visualizadores de link e
 * antivírus de correio também seguem links: por isso só conta um GET normal, com um navegador por trás.
 */
const ROBO = /bot|crawler|spider|preview|scanner|curl|wget|python|headless|facebookexternalhit|slack|whatsapp|barracuda|proofpoint|mimecast/i;

export async function GET(req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const campanha = new URL(req.url).searchParams.get('e') ?? '';
  const flyer = FLYERS.find((f) => f.id === campanha);
  const destino = new URL(flyer?.destino ?? 'https://quempinta.pt/');
  if (/^[A-Z0-9]{8}$/.test(codigo)) {
    destino.searchParams.set('k', codigo);
    if (!ROBO.test(req.headers.get('user-agent') ?? '')) {
      const db = adminClient();
      if (db) {
        const { data: c } = await db.from('crm_contactos').select('id').eq('codigo', codigo).maybeSingle();
        if (c && flyer) {
          const { data: envio } = await db.from('crm_envios').select('id').eq('contacto_id', c.id).eq('campanha_id', flyer.id).eq('estado', 'enviado').maybeSingle();
          if (envio) await db.from('crm_eventos').insert({ contacto_id: c.id, envio_id: envio.id, tipo: 'clique' });
        }
      }
    }
  }
  return NextResponse.redirect(destino, 302);
}
