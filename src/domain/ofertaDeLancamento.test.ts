import { describe, expect, it } from 'vitest';
import { CAMPANHA_DE_LANCAMENTO } from './campanhas';
import { concessaoPara, origemDoCookie, origemDoEndereco, origemParaCookie, VERSAO_DE_LANCAMENTO } from './ofertaDeLancamento';

const q = (s: string) => new URL(`https://x.pt/?${s}`).searchParams;

describe('origem', () => {
  it('lê o flyer e o código do contacto do endereço', () => {
    expect(origemDoEndereco(q('c=fl-pin-1&k=AB12CD34'))).toEqual({ flyer: 'fl-pin-1', codigo: 'AB12CD34' });
    expect(origemDoEndereco(q('c=fl-pin-2'))).toEqual({ flyer: 'fl-pin-2', codigo: null });
  });
  it('ignora o que não tem o formato exato', () => {
    expect(origemDoEndereco(q('c=<script>&k=abc'))).toBeNull();
    expect(origemDoEndereco(q('c=fl-pin-10'))).toBeNull();
    expect(origemDoEndereco(q('k=ab12cd34'))).toBeNull();
    expect(origemDoEndereco(q(''))).toBeNull();
  });
  it('ida e volta pelo cookie, e um cookie adulterado não passa', () => {
    const o = { flyer: 'fl-pin-1', codigo: 'AB12CD34' };
    expect(origemDoCookie(origemParaCookie(o))).toEqual(o);
    expect(origemDoCookie(origemParaCookie({ flyer: null, codigo: 'AB12CD34' }))).toEqual({ flyer: null, codigo: 'AB12CD34' });
    expect(origemDoCookie('c:fl-pin-1; admin=1.k:')).toBeNull();
    expect(origemDoCookie('lixo')).toBeNull();
    expect(origemDoCookie(undefined)).toBeNull();
  });
});

describe('concessaoPara', () => {
  const pin = { flyer: 'fl-pin-1', codigo: null };
  it('concede o Pro a uma empresa de pintura vinda de um flyer de pintores, dentro da data', () => {
    expect(concessaoPara('pintor', pin, '2026-11-06')).toEqual({ tipo: 'pro', validaAte: CAMPANHA_DE_LANCAMENTO.ate });
    expect(concessaoPara('pintor', pin, CAMPANHA_DE_LANCAMENTO.ate)).not.toBeNull();
  });
  it('não concede depois da data', () => expect(concessaoPara('pintor', pin, '2027-02-01')).toBeNull());
  it('não concede a outros tipos de entidade, nem sem origem, nem a flyers de outros perfis', () => {
    for (const k of ['fornecedor', 'condominio', 'cliente']) expect(concessaoPara(k, pin, '2026-11-06')).toBeNull();
    expect(concessaoPara('pintor', { flyer: 'fl-for-1', codigo: null }, '2026-11-06')).toBeNull();
    expect(concessaoPara('pintor', null, '2026-11-06')).toBeNull();
    expect(concessaoPara('pintor', { flyer: null, codigo: 'AB12CD34' }, '2026-11-06')).toBeNull();
    expect(concessaoPara('pintor', { flyer: 'fl-cli-1', codigo: null }, '2026-11-06')).toBeNull();
  });
  it('a versão de lançamento leva a data da campanha', () => expect(VERSAO_DE_LANCAMENTO).toBe('lancamento-2027-01-31'));
});

describe('concessaoPara: fornecedores', () => {
  const forn = { flyer: 'fl-for-2', codigo: 'AB12CD34' };
  it('concede o catálogo a um fornecedor vindo de um flyer de fornecedores, dentro da data', () => {
    expect(concessaoPara('fornecedor', forn, '2026-11-06')).toEqual({ tipo: 'catalogo', validaAte: CAMPANHA_DE_LANCAMENTO.ate });
    expect(concessaoPara('fornecedor', forn, '2027-02-01')).toBeNull();
  });
  it('não concede a um fornecedor vindo de um flyer de pintores, nem a administradoras', () => {
    expect(concessaoPara('fornecedor', { flyer: 'fl-pin-1', codigo: null }, '2026-11-06')).toBeNull();
    expect(concessaoPara('condominio', { flyer: 'fl-cond-1', codigo: null }, '2026-11-06')).toBeNull();
    expect(concessaoPara('fornecedor', null, '2026-11-06')).toBeNull();
  });
});
