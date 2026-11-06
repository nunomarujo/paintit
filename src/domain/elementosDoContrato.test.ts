import { describe, expect, it } from 'vitest';
import {
  CODIGO_MAX_TENTATIVAS,
  codigoServe,
  emVigor,
  faltaParaAssinar,
  lerCodigo,
  mascararIban,
  mudaAlgo,
  normalizarEmail,
  normalizarIban,
  normalizarTelefone,
  podeAlterar,
  type LinhaDeElemento,
} from './elementosDoContrato';

const IBAN = 'PT50000201231234567890154';
const linha = (o: Partial<LinhaDeElemento>): LinhaDeElemento => ({
  lado: 'pintor',
  campo: 'iban',
  valor: IBAN,
  validacao: 'sem_validacao',
  criadoEm: '2026-11-06T10:00:00Z',
  criadoPor: 'u',
  ...o,
});

describe('elementos do contrato', () => {
  it('IBAN: português, com o algarismo de controlo; espaços e minúsculas aceites', () => {
    expect(normalizarIban('pt50 0002 0123 1234 5678 9015 4')).toBe(IBAN);
    expect(normalizarIban('PT50000201231234567890155')).toBeNull();
    expect(normalizarIban('DE89370400440532013000')).toBeNull();
  });

  it('telefone e email', () => {
    expect(normalizarTelefone('+351 912 345 678')).toBe('+351912345678');
    expect(normalizarTelefone('12345')).toBeNull();
    expect(normalizarEmail(' Ana@Exemplo.PT ')).toBe('ana@exemplo.pt');
    expect(normalizarEmail('ana@')).toBeNull();
  });

  it('nas listas o IBAN vai mascarado', () => {
    expect(mascararIban(IBAN)).toBe('PT50 ··· 9015 4');
    expect(mascararIban(IBAN)).not.toContain('0002');
  });

  it('em vigor é o mais recente de cada campo; os anteriores ficam no histórico', () => {
    const h = [
      linha({ valor: 'PT50000201231234567890154', criadoEm: '2026-11-06T10:00:00Z' }),
      linha({ valor: 'PT50003300000000000000000', criadoEm: '2026-11-06T11:00:00Z' }),
      linha({ lado: 'cliente', campo: 'email', valor: 'a@b.pt', validacao: 'codigo' }),
    ];
    const v = emVigor(h);
    expect(v.pintor.iban).toBe('PT50003300000000000000000');
    expect(v.cliente.email).toBe('a@b.pt');
    expect(v.cliente.iban).toBeNull();
    // A ordem de chegada não manda: manda a data.
    expect(emVigor([...h].reverse()).pintor.iban).toBe('PT50003300000000000000000');
    expect(mudaAlgo(v.pintor, 'iban', 'PT50003300000000000000000')).toBe(false);
  });

  it('só se altera com a minuta nova, depois da apresentação e antes da primeira assinatura', () => {
    expect(podeAlterar({ minuta: '2026-11-06', apresentada: true, algumaAssinatura: false })).toBe(true);
    expect(podeAlterar({ minuta: '2026-11-06', apresentada: false, algumaAssinatura: false })).toBe(false);
    expect(podeAlterar({ minuta: '2026-11-06', apresentada: true, algumaAssinatura: true })).toBe(false);
    expect(podeAlterar({ minuta: null, apresentada: true, algumaAssinatura: false })).toBe(false);
  });

  it('o cliente só assina com o IBAN do empreiteiro no contrato (minuta nova); as antigas não mudam', () => {
    const sem = { pintor: { iban: null, telefone: null, email: null } };
    expect(faltaParaAssinar('2026-11-06', sem)).toMatch(/IBAN/);
    expect(faltaParaAssinar('2026-11-06', { pintor: { ...sem.pintor, iban: IBAN } })).toBeNull();
    expect(faltaParaAssinar(null, sem)).toBeNull();
  });

  it('código: 6 algarismos; deixa de servir usado, expirado ou com tentativas gastas', () => {
    expect(lerCodigo('123 456')).toBe('123456');
    expect(lerCodigo('12345')).toBeNull();
    const agora = new Date('2026-11-06T10:00:00Z');
    const base = { expiraEm: '2026-11-06T10:05:00Z', tentativas: 0, usadoEm: null };
    expect(codigoServe(base, agora)).toBe(true);
    expect(codigoServe({ ...base, expiraEm: '2026-11-06T09:59:59Z' }, agora)).toBe(false);
    expect(codigoServe({ ...base, tentativas: CODIGO_MAX_TENTATIVAS }, agora)).toBe(false);
    expect(codigoServe({ ...base, usadoEm: '2026-11-06T09:00:00Z' }, agora)).toBe(false);
  });
});
