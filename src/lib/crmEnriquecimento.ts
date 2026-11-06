import { emailsDoHtml, melhorEmail, paginasDeContacto, urlPublica } from '@/domain/crmEnriquecimento';

const MAX_BYTES = 600_000;

/** Lê uma página pública: segue até 3 redireccionamentos, voltando a validar cada destino, com limite de tempo e tamanho. */
async function ler(inicial: URL): Promise<string | null> {
  let url: URL | null = inicial;
  for (let salto = 0; salto < 4 && url; salto++) {
    try {
      const res: Response = await fetch(url, {
        redirect: 'manual',
        headers: { 'user-agent': 'QuemPinta-CRM/1.0 (+https://quempinta.pt)', accept: 'text/html' },
        signal: AbortSignal.timeout(8_000),
      });
      if (res.status >= 300 && res.status < 400) {
        const destino: string | null = res.headers.get('location');
        url = destino ? urlPublica(new URL(destino, url).toString()) : null;
        continue;
      }
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/html')) return null;
      return (await res.text()).slice(0, MAX_BYTES);
    } catch {
      return null;
    }
  }
  return null;
}

/** O email geral de uma empresa, lido do seu website. `null` se não houver, ou se não for fiável. */
export async function emailDoWebsite(website: string): Promise<string | null> {
  const site = urlPublica(website);
  if (!site) return null;
  const encontrados = new Set<string>();
  for (const pagina of paginasDeContacto(site)) {
    const html = await ler(pagina);
    if (html) emailsDoHtml(html).forEach((e) => encontrados.add(e));
    const melhor = melhorEmail([...encontrados], site.hostname);
    if (melhor) return melhor;
  }
  return null;
}
