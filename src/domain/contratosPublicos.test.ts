import { describe, expect, it } from 'vitest';
import {
  classificarContrato,
  entidade,
  lugar,
  normalizar,
  pareceEmpresa,
  porConvite,
  resumirEntidade,
} from './contratosPublicos';

// Casos retirados do ficheiro real do portal BASE de 2026 (dados.gov.pt), a 25/10/2026.
const empreitada = (objectoContrato: string, cpv: string[] = []) => ({
  tipoContrato: ['Empreitadas de obras públicas'],
  objectoContrato,
  cpv,
  tipoprocedimento: 'Consulta Prévia',
});

describe('classificar um contrato do portal BASE', () => {
  it('apanha pela palavra do objecto, mesmo sem CPV de pintura', () => {
    const r = classificarContrato(empreitada('PINTURAS DOS ESPAÇOS INTERIORES DO EDÍFICO DA JUNTA'));
    expect(r.pintura).toBe(true);
    expect(r.via).toBe('objecto');
  });

  it('apanha pelo CPV de núcleo, mesmo com um objecto que não diz pintura', () => {
    const r = classificarContrato(empreitada('Melhoria energética da ERPI', ['45321000-3 - Obras de isolamento']));
    expect(r.pintura).toBe(true);
    expect(r.via).toBe('cpv');
  });

  it('não decide por um CPV genérico de acabamentos', () => {
    // 45450000-6 é "Outras obras de acabamento de edifícios": aceitá-lo sozinho dava 2 034
    // contratos em 2026 em vez de 482, com igrejas e instalações sanitárias pelo meio.
    const r = classificarContrato(empreitada('Obras de recuperação da Igreja da Misericórdia', ['45450000-6 - Outras obras']));
    expect(r.pintura).toBe(false);
  });

  it('não aceita reabilitação como sinal: é qualquer obra de edifício', () => {
    expect(classificarContrato(empreitada('Reabilitação Interior de Habitações Devolutas')).pintura).toBe(false);
  });

  it('ignora o que não é empreitada, por muito que a palavra lá esteja', () => {
    const limpeza = { tipoContrato: ['Aquisição de serviços'], objectoContrato: 'Limpeza de fachadas', cpv: [], tipoprocedimento: '' };
    expect(classificarContrato(limpeza).pintura).toBe(false);
  });

  it('lê o objecto em maiúsculas e sem acentos, como vem no ficheiro', () => {
    expect(normalizar('CAIAÇÃO &amp; Pintura')).toBe('caiacao & pintura');
    expect(classificarContrato(empreitada("APLICAÇÃO DE SISTEMA ETIC' E PINTURA")).pintura).toBe(true);
  });
});

describe('leitura dos campos', () => {
  it('separa o NIF do nome da entidade', () => {
    expect(entidade('500051062 - Município de Sintra')).toEqual({ nif: '500051062', nome: 'Município de Sintra' });
  });

  it('aguenta uma entidade sem NIF à frente', () => {
    expect(entidade('Ângelo Sérgio Trindade Carrapiço').nif).toBeNull();
  });

  it('tira distrito e concelho do local de execução', () => {
    expect(lugar('Portugal, Braga, Barcelos')).toEqual({ distrito: 'Braga', concelho: 'Barcelos' });
    expect(lugar('Portugal')).toEqual({ distrito: null, concelho: null });
    expect(lugar(null)).toEqual({ distrito: null, concelho: null });
  });

  it('reconhece os procedimentos que ninguém anuncia', () => {
    expect(porConvite('Ajuste Direto Regime Geral')).toBe(true);
    expect(porConvite('Consulta Prévia')).toBe(true);
    expect(porConvite('Consulta Prévia Simplificada')).toBe(true);
    expect(porConvite('Concurso público')).toBe(false);
  });
});

describe('resumo de uma entidade', () => {
  it('conta o que decide se vale a pena ir bater à porta', () => {
    const r = resumirEntidade([
      { precoCents: 5_463_100, porConvite: true, convidados: 1 },
      { precoCents: 1_259_300, porConvite: true, convidados: 3 },
      { precoCents: 18_372_900, porConvite: false, convidados: 0 },
    ]);
    expect(r).toEqual({ contratos: 3, totalCents: 25_095_300, porConvite: 2, conviteUnico: 1 });
  });

  it('sem contratos não inventa nada', () => {
    expect(resumirEntidade([])).toEqual({ contratos: 0, totalCents: 0, porConvite: 0, conviteUnico: 0 });
  });
});

describe('pareceEmpresa', () => {
  it('deixa passar empresas e empresários em nome individual', () => {
    // Dos 742 convidados de 2026, 27 não trazem NIF e quase todos são pessoas: são concorrentes
    // verdadeiros, e tirá-los apagava do mapa os que mais ameaçam um pintor pequeno.
    expect(pareceEmpresa('FONROD - Ar Condicionado e afins, Lda.')).toBe(true);
    expect(pareceEmpresa('Susana Margarida Almeida Fonseca Ferrajão')).toBe(true);
    expect(pareceEmpresa('construção civil')).toBe(true);
  });

  it('corta os rótulos de lote que a entidade pôs no campo dos concorrentes', () => {
    expect(pareceEmpresa('Lote 2')).toBe(false);
    expect(pareceEmpresa('lote 3')).toBe(false);
    expect(pareceEmpresa('LOTES 10')).toBe(false);
    expect(pareceEmpresa('   ')).toBe(false);
  });

  it('não corta uma empresa que tenha "lote" no nome', () => {
    expect(pareceEmpresa('Lote Azul, Lda')).toBe(true);
    expect(pareceEmpresa('Loteamentos do Sul')).toBe(true);
  });
});
