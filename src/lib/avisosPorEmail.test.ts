import { afterEach, describe, expect, it } from 'vitest';
import { pedidoAutorizado } from './avisosPorEmail';

// A porta por onde os dois caminhos entram. Sem segredo configurado, ninguém entra — nem por engano, nem
// porque alguém se lembrou de chamar a rota à mão.

const comCabecalho = (valor?: string) =>
  new Request('https://exemplo.invalid/api/avisos/enviar', {
    method: 'POST',
    headers: valor === undefined ? {} : { authorization: valor },
  });

const anterior = process.env.CRON_SECRET;
afterEach(() => {
  if (anterior === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = anterior;
});

describe('autorização do pedido de envio', () => {
  it('sem segredo configurado, recusa mesmo o cabeçalho certo', () => {
    delete process.env.CRON_SECRET;
    expect(pedidoAutorizado(comCabecalho('Bearer qualquer-coisa'))).toBe(false);
  });

  it('recusa sem cabeçalho', () => {
    process.env.CRON_SECRET = 'segredo-de-ensaio';
    expect(pedidoAutorizado(comCabecalho())).toBe(false);
  });

  it('recusa um segredo errado', () => {
    process.env.CRON_SECRET = 'segredo-de-ensaio';
    expect(pedidoAutorizado(comCabecalho('Bearer outro'))).toBe(false);
  });

  it('recusa o segredo certo sem a palavra Bearer', () => {
    process.env.CRON_SECRET = 'segredo-de-ensaio';
    expect(pedidoAutorizado(comCabecalho('segredo-de-ensaio'))).toBe(false);
  });

  it('aceita o segredo certo', () => {
    process.env.CRON_SECRET = 'segredo-de-ensaio';
    expect(pedidoAutorizado(comCabecalho('Bearer segredo-de-ensaio'))).toBe(true);
  });
});
