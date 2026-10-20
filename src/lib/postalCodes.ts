import 'server-only';
import type { PostalCodeInfo } from '@/domain/address';

/**
 * Arruamentos de um código postal (base dos CTT, via geoapi.pt). Devolve null se o código
 * não existe e 'indisponivel' se o serviço não responde (nesse caso não se bloqueia ninguém).
 */
export async function lookupPostalCode(cp: string): Promise<PostalCodeInfo | null | 'indisponivel'> {
  if (!/^\d{4}-\d{3}$/.test(cp)) return null;
  try {
    const res = await fetch(`https://json.geoapi.pt/cp/${cp}`, { signal: AbortSignal.timeout(5000), next: { revalidate: 86_400 } });
    if (res.status === 404) return null;
    if (!res.ok) return 'indisponivel';
    const j = (await res.json()) as {
      Localidade?: string;
      Concelho?: string;
      Distrito?: string;
      partes?: { Artéria?: string }[];
      ruas?: string[];
      erro?: string;
    };
    if (j.erro || !j.Concelho) return null;
    const ruas = [...new Set([...(j.partes ?? []).map((p) => p['Artéria'] ?? ''), ...(j.ruas ?? [])].map((r) => r.trim()).filter(Boolean))];
    return { cp, localidade: j.Localidade ?? '', concelho: j.Concelho, distrito: j.Distrito ?? '', ruas };
  } catch {
    return 'indisponivel';
  }
}
