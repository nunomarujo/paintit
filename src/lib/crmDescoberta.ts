import { candidatosDeOsm, concelhoSeguro, consultaOverpass, type Candidato } from '@/domain/crmDescoberta';

const SERVIDORES = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

/** Pergunta ao OpenStreetMap que pintores, tintas e administradoras há num concelho. Tenta cada servidor uma vez. */
export async function procurarNoOsm(concelho: string): Promise<{ ok: true; candidatos: Candidato[] } | { ok: false; erro: string }> {
  if (!concelhoSeguro(concelho)) return { ok: false, erro: 'Nome de concelho inválido.' };
  for (const url of SERVIDORES) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'QuemPinta-CRM/1.0 (quempinta.pt)' },
        body: new URLSearchParams({ data: consultaOverpass(concelho) }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { elements?: { tags?: Record<string, string> }[] };
      return { ok: true, candidatos: candidatosDeOsm(json.elements ?? []) };
    } catch {
      // próximo servidor
    }
  }
  return { ok: false, erro: 'O OpenStreetMap não respondeu. Tentar daqui a pouco.' };
}
