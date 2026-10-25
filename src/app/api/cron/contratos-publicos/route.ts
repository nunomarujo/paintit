import { adminClient } from '@/lib/supabase/admin';
import { ficheiroDoAno, lerAno } from '@/lib/contratosBase';

// Semanal (vercel.json): recarrega os contratos públicos de pintura do portal BASE, via dados.gov.pt.
// A Vercel envia "Authorization: Bearer CRON_SECRET".
//
// Por omissão só o ano em curso, que é o único que muda. Com ?ano=2023 faz a carga de um ano
// anterior, que é como se enchem os anos passados sem ter de esperar por uma semana de cada vez.
// Os anos anteriores nunca mudam, por isso correm uma vez e ficam.
export const maxDuration = 300;

/** O primeiro ano que o portal publica. */
const PRIMEIRO_ANO = 2012;
/** Quanto tempo se dá a uma corrida antes de deixar o resto para a semana seguinte. */
const ORCAMENTO_MS = 230_000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Não autorizado', { status: 401 });

  const db = adminClient();
  if (!db) return new Response('Não configurado', { status: 503 });

  const pedido = Number(new URL(req.url).searchParams.get('ano'));
  const anoCorrente = new Date().getFullYear();

  // Que anos faltam. O ano em curso recarrega-se sempre, porque muda todas as semanas; os anteriores
  // nunca mudam, por isso correm uma vez e ficam. Enche-os do mais recente para o mais antigo: é o
  // que interessa a quem quer saber quem contrata pintura agora.
  const { data: feitos } = await db.from('public_contracts_loads').select('ano');
  const jaFeitos = new Set((feitos ?? []).map((x) => x.ano));
  const porFazer = Number.isInteger(pedido) && pedido >= PRIMEIRO_ANO
    ? [pedido]
    : [anoCorrente, ...Array.from({ length: anoCorrente - PRIMEIRO_ANO }, (_, i) => anoCorrente - 1 - i).filter((a) => !jaFeitos.has(a))];

  const erros: string[] = [];
  const feitosAgora: { ano: number; gravados: number }[] = [];
  const limite = Date.now() + ORCAMENTO_MS;

  for (const ano of porFazer) {
    if (Date.now() > limite) break; // O que faltar fica para a semana seguinte, sem ninguém ter de mexer.
    const url = await ficheiroDoAno(ano);
    if (!url) {
      erros.push(`O portal não publica ficheiro para ${ano}.`);
      continue;
    }
    let gravados = 0;
    try {
      await lerAno(url, ano, async (linhas) => {
        // Cada contrato entra uma vez só: o identificador do BASE é único e uma recarga actualiza,
        // porque o preço e os concorrentes podem ser corrigidos pela entidade depois de publicados.
        const { error } = await db.from('public_contracts').upsert(linhas, { onConflict: 'id_contrato' });
        if (error) erros.push(`${ano}: ${error.message}`);
        else gravados += linhas.length;
      });
    } catch (e) {
      erros.push(`${ano}: ${e instanceof Error ? e.message : 'falha a ler o ficheiro'}`);
    }
    if (gravados > 0) {
      await db.from('public_contracts_loads').upsert(
        { ano, contratos: gravados, corrida_em: new Date().toISOString(), origem: url },
        { onConflict: 'ano' },
      );
      feitosAgora.push({ ano, gravados });
    }
  }

  return Response.json({ anos: feitosAgora, erros }, { status: erros.length ? 500 : 200 });
}
