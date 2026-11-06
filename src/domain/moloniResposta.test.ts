import { describe, expect, it } from 'vitest';
import { idDoDocumentoCriado, recusaEmObjeto } from './moloniResposta';

describe('idDoDocumentoCriado', () => {
  it('aceita um inteiro positivo, também em texto', () => {
    expect(idDoDocumentoCriado({ valid: 1, document_id: 4521 })).toBe(4521);
    expect(idDoDocumentoCriado({ document_id: '4521' })).toBe(4521);
  });

  it('recusa uma resposta sem identificador — o caso do «undefined» de 06/11/2026', () => {
    expect(() => idDoDocumentoCriado({ valid: 1 })).toThrow(/não devolveu o identificador/);
    expect(() => idDoDocumentoCriado({})).toThrow();
    expect(() => idDoDocumentoCriado(undefined)).toThrow();
    expect(() => idDoDocumentoCriado(null)).toThrow();
    expect(() => idDoDocumentoCriado([{ document_id: 1 }])).toThrow();
  });

  it('recusa identificadores que não são um inteiro positivo', () => {
    for (const document_id of [0, -3, 1.5, 'abc', '', 'undefined', null, NaN]) {
      expect(() => idDoDocumentoCriado({ document_id })).toThrow();
    }
  });

  it('a mensagem leva a resposta, para se ver o que a Moloni disse', () => {
    expect(() => idDoDocumentoCriado({ valid: 0, errors: ['série fechada'] })).toThrow(/série fechada/);
  });
});

describe('recusaEmObjeto', () => {
  it('apanha as recusas em forma de objeto, que chegam com HTTP 200', () => {
    expect(recusaEmObjeto({ valid: 0 })).toContain('"valid":0');
    expect(recusaEmObjeto({ valid: false, errors: [{ code: 1 }] })).not.toBeNull();
    expect(recusaEmObjeto({ valid: '0' })).not.toBeNull();
    expect(recusaEmObjeto({ errors: [{ code: 5, description: 'x' }] })).not.toBeNull();
  });

  it('deixa passar o que é sucesso, e as listas (clientes, por exemplo)', () => {
    expect(recusaEmObjeto({ valid: 1, document_id: 9 })).toBeNull();
    expect(recusaEmObjeto({ document_id: 9, errors: [] })).toBeNull();
    expect(recusaEmObjeto([{ customer_id: 3 }])).toBeNull();
    expect(recusaEmObjeto(false)).toBeNull();
    expect(recusaEmObjeto(null)).toBeNull();
  });
});
