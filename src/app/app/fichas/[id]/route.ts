import { NextResponse, type NextRequest } from 'next/server';
import { getUser } from '@/lib/supabase/server';

// Ficha técnica de um produto, com um link temporário de 60 segundos.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.redirect(new URL('/entrar', request.url));
  const { data: p } = await supabase.from('products').select('ficha_path').eq('id', id).maybeSingle();
  if (!p?.ficha_path) return new NextResponse('Ficha não encontrada.', { status: 404 });
  const { data } = await supabase.storage.from('fichas').createSignedUrl(p.ficha_path, 60);
  if (!data?.signedUrl) return new NextResponse('Ficha indisponível.', { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
