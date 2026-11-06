import { describe, expect, it } from 'vitest';
import { emailsDoHtml, melhorEmail, paginasDeContacto, urlPublica } from './crmEnriquecimento';

describe('emailsDoHtml', () => {
  it('apanha mailto, texto e formas ofuscadas, sem lixo', () => {
    const html = `<a href="mailto:Geral@Pinturas.pt">x</a> info&#64;pinturas.pt <img src="logo@2x.png"> nome@exemplo.com wixpress@sentry.io`;
    expect(emailsDoHtml(html)).toEqual(['geral@pinturas.pt', 'info@pinturas.pt']);
  });
});

describe('melhorEmail', () => {
  it('prefere o do domínio do site e o geral', () => {
    expect(melhorEmail(['joao@gmail.com', 'info@pinturas.pt', 'maria@pinturas.pt'], 'www.pinturas.pt')).toBe('info@pinturas.pt');
  });
  it('recusa o que parece de terceiros ou pessoal', () => {
    expect(melhorEmail(['joao@gmail.com'], 'pinturas.pt')).toBeNull();
    expect(melhorEmail(['dev@agencia.pt'], 'pinturas.pt')).toBeNull();
  });
  it('aceita um endereço pessoal do próprio domínio', () => expect(melhorEmail(['maria@pinturas.pt'], 'pinturas.pt')).toBe('maria@pinturas.pt'));
});

describe('urlPublica', () => {
  it('aceita sites normais, com ou sem esquema', () => {
    expect(urlPublica('pinturas.pt')?.hostname).toBe('pinturas.pt');
    expect(urlPublica('http://www.x.pt/a')?.hostname).toBe('www.x.pt');
  });
  it.each(['http://localhost', 'http://127.0.0.1/x', 'http://10.0.0.5', 'ftp://x.pt', 'http://u:p@x.pt', 'http://[::1]/', 'http://servidor', 'x.internal'])('recusa %s', (u) => {
    expect(urlPublica(u)).toBeNull();
  });
  it('lista as páginas de contacto', () => expect(paginasDeContacto(new URL('https://x.pt')).map((u) => u.pathname)).toEqual(['/', '/contactos', '/contacto', '/contact', '/sobre-nos']));
});
