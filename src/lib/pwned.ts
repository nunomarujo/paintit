import 'server-only';
import { createHash } from 'node:crypto';
import { contarEm } from '@/domain/pwned';

// Palavras-passe comprometidas (25/10/2026, docs/DECISOES.md).
//
// O Supabase só oferece esta verificação a partir do plano Pro. Faz-se aqui, e faz-se do mesmo modo
// que a deles: pelo modelo de k-anonimato do Have I Been Pwned.
//
// **A palavra-passe nunca sai daqui.** Calcula-se o SHA-1 e enviam-se só os **primeiros cinco
// caracteres** do resumo. O serviço devolve todos os resumos que começam por esses cinco — algumas
// centenas — e a comparação faz-se no nosso servidor. Quem está do outro lado não consegue saber qual
// deles nos interessava, nem sequer se algum lhe interessava.
//
// O SHA-1 aqui não é para guardar nada: é o formato que aquele serviço usa, e o que se compara é um
// prefixo público. Não é, nem se torna, a forma como as palavras-passe são guardadas — disso trata o
// Supabase Auth.

const ENDPOINT = 'https://api.pwnedpasswords.com/range/';

/** Quanto tempo se espera pelo serviço antes de seguir sem ele. */
const TIMEOUT_MS = 2_500;

export interface PwnedResult {
  /** Quantas vezes esta palavra-passe aparece em fugas conhecidas. 0 = nenhuma. */
  ocorrencias: number;
  /** O serviço respondeu? Quando não responde, deixa-se passar — ver nota abaixo. */
  verificado: boolean;
}

/**
 * Quantas vezes esta palavra-passe aparece em fugas de dados conhecidas.
 *
 * Se o serviço estiver em baixo ou demorar, **deixa-se passar**: recusar uma conta nova por causa de
 * uma dependência externa indisponível seria trocar um risco pequeno por um problema certo. A
 * verificação é uma camada a mais, não a única — o comprimento mínimo continua a ser exigido.
 */
export async function pwnedCount(password: string): Promise<PwnedResult> {
  if (password.length === 0) return { ocorrencias: 0, verificado: false };

  const sha1 = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  const prefixo = sha1.slice(0, 5);
  const resto = sha1.slice(5);

  try {
    const resposta = await fetch(`${ENDPOINT}${prefixo}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'Add-Padding': 'true' },
      cache: 'no-store',
    });
    if (!resposta.ok) return { ocorrencias: 0, verificado: false };
    const texto = await resposta.text();
    return { ocorrencias: contarEm(texto, resto), verificado: true };
  } catch {
    return { ocorrencias: 0, verificado: false };
  }
}
