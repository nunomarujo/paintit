import { NextResponse, type NextRequest } from 'next/server';
import { contractPdfFor, signedPdf } from '@/lib/engagements';
import { getUser } from '@/lib/supabase/server';

// PDF do contrato: "?v=base" é o documento gerado, para o cliente assinar;
// "?v=cliente" e "?v=pintor" são as versões já assinadas.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = request.nextUrl.searchParams.get('v') ?? 'base';
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.redirect(new URL('/entrar', request.url));
  const { data: row } = await supabase.from('engagements').select('*').eq('id', id).maybeSingle();
  if (!row) return new NextResponse('Contratação não encontrada.', { status: 404 });

  const bytes = v === 'cliente' || v === 'pintor' ? await signedPdf(supabase, id, v) : await contractPdfFor(supabase, row);
  if (!bytes) return new NextResponse('Documento ainda não assinado.', { status: 404 });
  const ref = id.slice(0, 8).toUpperCase();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="contrato-${ref}${v === 'base' ? '' : `-assinado-${v}`}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
}
