import { describe, expect, it } from 'vitest';
import { lerLoja } from './lojas';

const f = (o: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(o)) fd.append(k, v);
  return fd;
};

describe('lojas do fornecedor', () => {
  it('aceita uma loja completa, sem espaços a mais', () => {
    expect(lerLoja(f({ nome: '  Loja  do Centro ', morada: 'Rua A, 1', codigoPostal: '4900-002', localidade: 'Viana do Castelo' }))).toEqual({
      value: { nome: 'Loja do Centro', morada: 'Rua A, 1', codigoPostal: '4900-002', localidade: 'Viana do Castelo' },
    });
  });
  it('diz o que falta, campo a campo', () => {
    const r = lerLoja(f({ nome: '', morada: '', codigoPostal: '4900', localidade: '' }));
    expect('errors' in r && Object.keys(r.errors).sort()).toEqual(['codigoPostal', 'localidade', 'morada', 'nome']);
  });
});
