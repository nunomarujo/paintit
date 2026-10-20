import { lookupPostalCode } from '@/lib/postalCodes';

// Sugestões para o formulário: localidade, concelho e ruas de um código postal.
export async function GET(req: Request) {
  const cp = new URL(req.url).searchParams.get('cp') ?? '';
  const info = await lookupPostalCode(cp);
  if (info === 'indisponivel') return Response.json({ estado: 'indisponivel' });
  if (!info) return Response.json({ estado: 'inexistente' });
  return Response.json({ estado: 'ok', ...info });
}
