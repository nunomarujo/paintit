import { NextResponse, type NextRequest } from 'next/server';
import { getUser } from '@/lib/supabase/server';

// Abre um documento privado com um link temporário de 60 segundos. As políticas
// RLS decidem quem o pode ler: membros da entidade e equipa da plataforma.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.redirect(new URL('/entrar', request.url));

  const { data: doc } = await supabase.from('org_documents').select('storage_path').eq('id', id).maybeSingle();
  if (!doc) return new NextResponse('Documento não encontrado.', { status: 404 });

  const { data } = await supabase.storage.from('documentos').createSignedUrl(doc.storage_path, 60);
  if (!data?.signedUrl) return new NextResponse('Documento indisponível.', { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
