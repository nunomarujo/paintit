/**
 * Enriquecimento: encontrar o email geral de uma empresa a partir do seu website público.
 * Funções puras; quem vai buscar as páginas é `src/lib/crmEnriquecimento.ts`.
 */

const EMAIL_NO_TEXTO = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const EXTENSOES_DE_FICHEIRO = /\.(png|jpe?g|gif|webp|svg|css|js)$/i;
const GENERICOS = ['geral', 'info', 'contacto', 'contactos', 'comercial', 'orcamentos', 'orcamento', 'administrativo', 'geral1', 'mail'];
const EXEMPLOS = /^(nome|email|seuemail|exemplo|example|teste|name|user|you)@/i;

/** Todos os emails de uma página: ligações `mailto:` e texto corrido. Minúsculas, sem repetidos, sem lixo. */
export function emailsDoHtml(html: string): string[] {
  const bruto = html.replace(/&#64;|&commat;|\[at\]|\(at\)/gi, '@').replace(/%40/g, '@');
  const vistos = new Set<string>();
  for (const m of bruto.matchAll(EMAIL_NO_TEXTO)) {
    const e = m[0].toLowerCase().replace(/^[._%+-]+/, '');
    if (EXTENSOES_DE_FICHEIRO.test(e) || EXEMPLOS.test(e) || e.includes('sentry') || e.includes('wixpress')) continue;
    vistos.add(e);
  }
  return [...vistos];
}

const dominioBase = (host: string) => host.replace(/^www\./, '').toLowerCase();

/** Prefere o do próprio domínio do site e, entre esses, os endereços gerais (geral@, info@…). */
export function melhorEmail(emails: string[], websiteHost: string): string | null {
  const base = dominioBase(websiteHost);
  const pontos = (e: string) => {
    const [local = '', dominio = ''] = e.split('@');
    let p = 0;
    if (dominio === base || dominio.endsWith('.' + base)) p += 10;
    if (GENERICOS.includes(local)) p += 5;
    if (/^(gmail|hotmail|outlook|sapo|yahoo|live)\./.test(dominio)) p -= 8;
    return p;
  };
  const ordenados = [...emails].sort((a, b) => pontos(b) - pontos(a));
  const melhor = ordenados[0];
  // Um endereço de outro domínio e sem ser geral é quase sempre um parceiro, um programador ou uma pessoa.
  return melhor !== undefined && pontos(melhor) >= 5 ? melhor : null;
}

/** Só http/https e nomes de domínio públicos: nunca localhost, IPs ou endereços internos. */
export function urlPublica(entrada: string): URL | null {
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(entrada) ? entrada : `https://${entrada}`);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const h = u.hostname.toLowerCase();
  if (!h.includes('.') || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':') || u.username || u.password) return null;
  return u;
}

/** As páginas onde um email geral costuma estar. */
export function paginasDeContacto(site: URL): URL[] {
  return ['/', '/contactos', '/contacto', '/contact', '/sobre-nos'].map((c) => new URL(c, site));
}
