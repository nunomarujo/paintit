import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';

/** Serve uma fotografia do diário por link assinado de curta duração, como as dos pedidos. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getUser();
  const { data: foto } = await supabase.from('worksite_photos').select('storage_path').eq('id', id).maybeSingle();
  if (!foto) return new NextResponse('Não encontrada', { status: 404 });
  const { data } = await supabase.storage.from('obra').createSignedUrl(foto.storage_path, 60);
  if (!data) return new NextResponse('Não encontrada', { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
