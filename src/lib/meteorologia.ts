import 'server-only';
import type { DiaDeTempo } from '@/domain/meteorologia';

/**
 * A previsão para o local da obra, do Open-Meteo.
 *
 * Escolhido por um motivo concreto: é o único dos dois serviços públicos que dá **humidade
 * relativa**, que é metade da decisão de pintar no exterior. O IPMA, que seria o primeiro a
 * considerar por ser o nacional, dá temperatura, vento e probabilidade de chuva — e por concelho,
 * não por coordenadas. Sem a humidade, a tabela deixava de responder à pergunta que interessa.
 *
 * Não leva chave nem registo, o que evita mais um segredo para gerir e mais uma conta para expirar
 * sem ninguém dar por isso.
 *
 * A previsão vale por horas, não por minutos: guarda-se durante uma hora. Se o serviço não
 * responder, devolve-se nada e o ecrã cala-se — meteorologia é um extra, e um extra nunca derruba o
 * cronograma (a lição do 404 de hoje de manhã).
 */

const CAMPOS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'relative_humidity_2m_mean',
  'wind_speed_10m_max',
].join(',');

export async function previsao(lat: number, lon: number, dias = 7): Promise<DiaDeTempo[] | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&daily=${CAMPOS}&timezone=Europe%2FLisbon&forecast_days=${Math.max(1, Math.min(14, dias))}`;
  try {
    // Três segundos e meio, não cinco: isto está no caminho de quem abre o cronograma, e mais vale
    // a secção faltar do que o ecrã inteiro ficar à espera do tempo.
    const res = await fetch(url, { signal: AbortSignal.timeout(3500), next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const j = (await res.json()) as { daily?: Record<string, (number | null)[]> & { time?: string[] } };
    const d = j.daily;
    if (!d?.time?.length) return null;
    return d.time.flatMap((data, i) => {
      const dia = {
        data,
        tMax: d.temperature_2m_max?.[i],
        tMin: d.temperature_2m_min?.[i],
        chuvaMm: d.precipitation_sum?.[i],
        chuvaProb: d.precipitation_probability_max?.[i],
        humidade: d.relative_humidity_2m_mean?.[i],
        ventoKmh: d.wind_speed_10m_max?.[i],
      };
      // Um dia com um buraco é um dia sobre o qual não se decide: cai fora em vez de valer zero,
      // que seria lido como "cinco graus negativos" ou "sem chuva nenhuma".
      const valores = [dia.tMax, dia.tMin, dia.chuvaMm, dia.chuvaProb, dia.humidade, dia.ventoKmh];
      return valores.every((v) => typeof v === 'number') ? [dia as DiaDeTempo] : [];
    });
  } catch {
    return null;
  }
}

/**
 * Onde é a obra, em coordenadas.
 *
 * Vem do código postal, pelo mesmo serviço que já preenche as moradas na aplicação (geoapi.pt):
 * não se acrescenta fornecedor nenhum para isto. O centro do código postal chega e sobra — a
 * previsão é a mesma em toda a rua.
 */
export async function coordenadasDoCodigoPostal(cp: string): Promise<{ lat: number; lon: number } | null> {
  if (!/^\d{4}-\d{3}$/.test(cp)) return null;
  try {
    const res = await fetch(`https://json.geoapi.pt/cp/${cp}`, { signal: AbortSignal.timeout(5000), next: { revalidate: 2_592_000 } });
    if (!res.ok) return null;
    const j = (await res.json()) as { centro?: unknown };
    const c = j.centro;
    return Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number' ? { lat: c[0], lon: c[1] } : null;
  } catch {
    return null;
  }
}

/** Um código postal escrito no meio de um texto livre ("Rua das Flores, 4900-320 Viana"). */
export function codigoPostalNoTexto(texto: string | null): string | null {
  return texto?.match(/\b\d{4}-\d{3}\b/)?.[0] ?? null;
}
