import { describe, expect, it } from 'vitest';
import { cabem, proximoAEnviar, resumoDaFila, type FicheiroNaFila } from './fila';

const f = (estado: FicheiroNaFila['estado'], n: string = estado): FicheiroNaFila => ({
  id: n + Math.random(),
  nome: `${n}.jpg`,
  estado,
});

describe('o que se diz de uma fila de envios', () => {
  it('sem nada escolhido, não se diz nada', () => {
    expect(resumoDaFila([]).texto).toBe('');
  });

  it('a caminho, conta a posição e não inventa percentagens', () => {
    const r = resumoDaFila([f('enviado'), f('enviado'), f('a_enviar'), f('na_fila')]);
    expect(r.texto).toBe('A enviar a 3.ª de 4.');
    expect(r.aEnviarNumero).toBe(3);
    expect(r.terminou).toBe(false);
  });

  it('uma que falhou também ocupa lugar na contagem', () => {
    // Senão a 4.ª de 4 aparecia como «a 3.ª de 4» e a conta nunca fechava.
    expect(resumoDaFila([f('enviado'), f('falhou'), f('enviado'), f('a_enviar')]).texto).toBe('A enviar a 4.ª de 4.');
  });

  it('no fim, diz quantas foram e quantas não foram', () => {
    expect(resumoDaFila([f('enviado'), f('enviado')]).texto).toBe('2 fotografias enviadas.');
    expect(resumoDaFila([f('enviado')]).texto).toBe('1 fotografia enviada.');
    expect(resumoDaFila([f('falhou'), f('falhou')]).texto).toBe('2 fotografias não foram enviadas.');
    expect(resumoDaFila([f('enviado'), f('falhou')]).texto).toBe('1 enviada, 1 não foi.');
    expect(resumoDaFila([f('enviado'), f('enviado'), f('falhou'), f('falhou')]).texto).toBe('2 enviadas, 2 não foram.');
  });

  it('terminou quando não falta nenhuma, mesmo que algumas tenham falhado', () => {
    expect(resumoDaFila([f('enviado'), f('falhou')]).terminou).toBe(true);
    expect(resumoDaFila([f('enviado'), f('na_fila')]).terminou).toBe(false);
  });
});

describe('qual vai a seguir', () => {
  it('a primeira à espera, e só quando nenhuma está a caminho', () => {
    const fila = [f('enviado'), f('na_fila', 'primeira'), f('na_fila', 'segunda')];
    expect(proximoAEnviar(fila)!.nome).toBe('primeira.jpg');
    expect(proximoAEnviar([f('a_enviar'), f('na_fila')])).toBeUndefined();
  });

  it('uma que falhou não volta sozinha para a fila', () => {
    // Quem decide repetir é quem está a ver, com o botão «Tentar de novo».
    expect(proximoAEnviar([f('falhou'), f('enviado')])).toBeUndefined();
  });
});

describe('quantas cabem', () => {
  it('aceita o que cabe e diz quantas ficam de fora', () => {
    expect(cabem(18, 5, 20)).toEqual({ aceitas: 2, recusadas: 3 });
    expect(cabem(0, 5, 20)).toEqual({ aceitas: 5, recusadas: 0 });
    expect(cabem(20, 1, 20)).toEqual({ aceitas: 0, recusadas: 1 });
  });
});
