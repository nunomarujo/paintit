import { NextResponse } from 'next/server';

export function GET(req: Request) {
  return NextResponse.redirect(new URL('/app/backoffice/contabilidade/contratacoes/csv', req.url));
}
