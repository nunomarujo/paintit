import { NextResponse } from 'next/server';
import { isPlatformAdmin } from '@/lib/access';
import { loadReplay } from '@/lib/engagements';
import { getUser } from '@/lib/supabase/server';

// Movimentos de todas as contratações, para conciliar com o extrato do parceiro.
export async function GET() {
  const { supabase, user } = await getUser();
  if (!user || !(await isPlatformAdmin(supabase, user.id))) return new NextResponse('Sem permissão.', { status: 403 });
  const { data: rows } = await supabase.from('engagements').select('*').order('created_at');
  const lines = ['contratacao;data;movimento;montante_euros;nota'];
  for (const r of rows ?? []) {
    const e = (await loadReplay(supabase, r)).replay.engagement;
    for (const m of e.movements) {
      lines.push([r.id, m.at, m.kind, (m.amount / 100).toFixed(2).replace('.', ','), (m.note ?? '').replace(/;/g, ',')].join(';'));
    }
  }
  return new NextResponse(lines.join('\n') + '\n', {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="movimentos.csv"',
    },
  });
}
