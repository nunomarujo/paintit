import 'server-only';

export type NifLookup =
  | { found: true; nome: string; ativo: boolean; cae: string | null; atividade: string | null }
  | { found: false }
  | 'indisponivel';

/**
 * Consulta o NIF na nif.pt (NIFPT_KEY). Sem chave, ou se o serviço falhar ou atingir o limite diário, devolve
 * 'indisponivel' e a validação segue só pelo dígito de controlo: nunca se bloqueia uma pessoa por uma falha nossa.
 *
 * `cae`/`atividade` (26/10/2026): a mesma resposta já trazia o código CAE e a descrição da atividade —
 * ficavam por aproveitar. Servem para o aviso de elegibilidade do pintor (`caeElegibilidade`,
 * `src/domain/organization.ts`), nunca para bloquear: por isso ficam `null` sem drama quando a nif.pt
 * não os tem para este NIF.
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
    const body = (await res.json()) as {
      result?: string;
      records?: Record<string, { title?: string; status?: string; cae?: string; activity?: string }>;
      message?: string;
    };
    const rec = body.records?.[nif];
    if (body.result === 'success' && rec?.title) {
      return {
        found: true,
        nome: rec.title,
        ativo: (rec.status ?? 'active') !== 'inactive',
        cae: rec.cae?.trim() || null,
        atividade: rec.activity?.trim() || null,
      };
    }
    // "Limit" e erros de chave não são "NIF inexistente".
    if (body.result === 'error' && /not found|n[aã]o encontrado|inexist/i.test(body.message ?? '')) return { found: false };
    return 'indisponivel';
  } catch {
    return 'indisponivel';
  }
}
