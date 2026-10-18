import { NextResponse, type NextRequest } from 'next/server';
import { getUser } from '@/lib/supabase/server';

// Abre uma fotografia de um pedido com um link temporário de 60 segundos. As
// políticas RLS decidem quem a vê: a entidade e a equipa da plataforma sempre;
// os pintores só um pormenor aprovado de um anúncio aberto.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.redirect(new URL('/entrar', request.url));

  const { data: photo } = await supabase.from('request_photos').select('storage_path').eq('id', id).maybeSingle();
  if (!photo) return new NextResponse('Fotografia não encontrada.', { status: 404 });

  const { data } = await supabase.storage.from('fotos').createSignedUrl(photo.storage_path, 60);
  if (!data?.signedUrl) return new NextResponse('Fotografia indisponível.', { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
