import 'server-only';

export type NifLookup = { found: true; nome: string; ativo: boolean } | { found: false } | 'indisponivel';

/**
 * Consulta o NIF na nif.pt (NIFPT_KEY). Sem chave, ou se o serviço falhar ou atingir o limite diário, devolve
 * 'indisponivel' e a validação segue só pelo dígito de controlo: nunca se bloqueia uma pessoa por uma falha nossa.
 */
export async function lookupNif(nif: string): Promise<NifLookup> {
  const key = process.env.NIFPT_KEY;
  if (!key) return 'indisponivel';
  try {
    const res = await fetch(`https://www.nif.pt/?json=1&q=${encodeURIComponent(nif)}&key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });
    if (!res.ok) return 'indisponivel';
    const body = (await res.json()) as { result?: string; records?: Record<string, { title?: string; status?: string }>; message?: string };
    const rec = body.records?.[nif];
    if (body.result === 'success' && rec?.title) return { found: true, nome: rec.title, ativo: (rec.status ?? 'active') === 'active' };
    // "Limit" e erros de chave não são "NIF inexistente".
    if (body.result === 'error' && /not found|n[aã]o encontrado|inexist/i.test(body.message ?? '')) return { found: false };
    return 'indisponivel';
  } catch {
    return 'indisponivel';
  }
}
