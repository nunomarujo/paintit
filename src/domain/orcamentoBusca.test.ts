import { describe, expect, it } from 'vitest';
import { corresponde, filtrar, semResultados, sugestoes, type OrcamentoProcuravel } from './orcamentoBusca';

const base: OrcamentoProcuravel = {
  numero: 12,
  clienteNome: 'Condomínio da Rua das Flores',
  clienteNif: '501964843',
  local: 'Viana do Castelo',
  titulo: 'Fachadas e varandas',
  criadoEm: '2026-03-14T10:00:00Z',
};

const lista: OrcamentoProcuravel[] = [
  base,
  { numero: 13, clienteNome: 'Joaquim Pereira', clienteNif: null, local: 'Braga', titulo: null, criadoEm: '2025-11-02T09:00:00Z' },
  { numero: 14, clienteNome: 'Condomínio do Monte', clienteNif: '500000000', local: 'Viana do Castelo', titulo: 'Zonas comuns', criadoEm: '2026-07-01T09:00:00Z' },
];

describe('procurar um orçamento', () => {
  it('encontra sem acentos e sem maiúsculas, nos dois sentidos', () => {
    // Quem escreve no telemóvel não põe acentos; quem guardou pôs.
    expect(corresponde(base, 'condominio')).toBe(true);
    expect(corresponde(base, 'CONDOMÍNIO')).toBe(true);
    expect(corresponde(base, 'viana')).toBe(true);
  });

  it('cada palavra pode estar numa parte diferente do orçamento', () => {
    // "viana condominio" é local + cliente. Exigir as duas no mesmo campo não encontrava nada.
    expect(corresponde(base, 'viana condominio')).toBe(true);
    expect(corresponde(base, 'braga condominio')).toBe(false);
  });

  it('o NIPC encontra-se como as pessoas o escrevem', () => {
    expect(corresponde(base, '501964843')).toBe(true);
    expect(corresponde(base, '501 964 843')).toBe(true);
    expect(corresponde(base, 'PT501964843')).toBe(true);
    expect(corresponde(base, '999999999')).toBe(false);
  });

  it('também pelo número do orçamento e pelo ano', () => {
    expect(corresponde(base, '12')).toBe(true);
    expect(corresponde(base, '2026')).toBe(true);
    expect(corresponde(base, '2024')).toBe(false);
  });

  it('sem NIPC guardado, a procura por números não rebenta', () => {
    expect(corresponde(lista[1]!, '501964843')).toBe(false);
    expect(corresponde(lista[1]!, 'braga')).toBe(true);
  });

  it('termo vazio devolve tudo', () => {
    expect(filtrar(lista, {})).toHaveLength(3);
    expect(filtrar(lista, { termo: '   ' })).toHaveLength(3);
  });

  it('o ano filtra à parte do termo, e os dois somam-se', () => {
    expect(filtrar(lista, { ano: '2026' })).toHaveLength(2);
    expect(filtrar(lista, { ano: '2026', termo: 'monte' })).toHaveLength(1);
    expect(filtrar(lista, { ano: '2025', termo: 'monte' })).toHaveLength(0);
  });
});

describe('o que a base de dados sugere', () => {
  it('locais e clientes que existem mesmo, sem repetidos e por ordem', () => {
    const s = sugestoes(lista);
    expect(s.termos).toEqual(['Braga', 'Condomínio da Rua das Flores', 'Condomínio do Monte', 'Joaquim Pereira', 'Viana do Castelo']);
  });

  it('os anos vêm do mais recente para o mais antigo', () => {
    expect(sugestoes(lista).anos).toEqual(['2026', '2025']);
  });

  it('uma empresa sem orçamentos não sugere nada — e isso não é um erro', () => {
    expect(sugestoes([])).toEqual({ termos: [], anos: [] });
  });

  it('não sugere NIPC: escreve-se, não se escolhe', () => {
    expect(sugestoes(lista).termos.some((t) => /\d{9}/.test(t))).toBe(false);
  });
});

describe('não encontrar é diferente de não haver', () => {
  it('diz o que se procurou', () => {
    expect(semResultados({ termo: 'viana' })).toBe('Nenhum orçamento encontrado «viana».');
    expect(semResultados({ termo: 'viana', ano: '2025' })).toBe('Nenhum orçamento encontrado «viana» em 2025.');
    expect(semResultados({ ano: '2025' })).toBe('Nenhum orçamento encontrado em 2025.');
    expect(semResultados({})).toBe('Nenhum orçamento.');
  });
});
