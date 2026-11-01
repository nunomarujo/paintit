import { describe, expect, it } from 'vitest';
import {
  RAIZ_AVALIACOES,
  RAIZ_VENDAS,
  contextoDoCaminho,
  destinosDoFornecedor,
  inicioDoContexto,
  mandaNaEmpresa,
} from './workspaceFornecedor';

const ORG = '00000000-0000-4000-8000-0000000000aa';
const destinos = (ctx: 'vendas' | 'avaliacoes', papel: 'proprietario' | 'vendedor' = 'vendedor') =>
  destinosDoFornecedor(ctx, { orgId: ORG, papel }).flatMap((g) => g.items);
const rotulos = (ctx: 'vendas' | 'avaliacoes', papel: 'proprietario' | 'vendedor' = 'vendedor') =>
  destinos(ctx, papel).map((d) => d.label);

describe('a privacidade entre a pessoa e a empresa', () => {
  // É a regra que não se negoceia: o responsável manda nos produtos e na equipa, e não vê o trabalho
  // pessoal de ninguém. Se um dia alguém acrescentar «Levantamentos da equipa» a Vendas, falha aqui.
  it('o trabalho pessoal vive só em Avaliações', () => {
    const vendas = rotulos('vendas', 'proprietario');
    expect(vendas).not.toContain('Os meus levantamentos');
    expect(vendas).not.toContain('Comissões pessoais');
    expect(vendas).not.toContain('Qualificação');
  });

  it('Avaliações é igual para o responsável e para o vendedor: é o trabalho de cada um', () => {
    expect(rotulos('avaliacoes', 'proprietario')).toEqual(rotulos('avaliacoes', 'vendedor'));
  });

  it('as comissões de adesão são da empresa e ficam em Vendas', () => {
    expect(rotulos('vendas')).toContain('Comissões de adesão');
    expect(rotulos('avaliacoes')).not.toContain('Comissões de adesão');
  });
});

describe('o que cada papel vê na empresa', () => {
  const filhosDaEmpresa = (papel: 'proprietario' | 'vendedor') =>
    (destinos('vendas', papel).find((d) => d.label === 'Empresa')?.children ?? []).map((c) => c.label);

  it('a subscrição é de quem manda', () => {
    expect(filhosDaEmpresa('proprietario')).toContain('Subscrição');
    expect(filhosDaEmpresa('vendedor')).not.toContain('Subscrição');
  });

  // Um destino que não existe é pior do que um destino que falta: quem clica leva com um 404 e fica
  // sem saber se o problema é dele. Estes endereços têm de existir (01/11/2026).
  it('nenhum destino da empresa aponta para um endereço inventado', () => {
    const empresa = destinos('vendas', 'proprietario').find((d) => d.label === 'Empresa');
    for (const c of empresa?.children ?? []) {
      expect(c.href).not.toMatch(/\/(equipa|regras)$/);
    }
  });

  it('os dados e a equipa veem-se sempre', () => {
    for (const papel of ['proprietario', 'vendedor'] as const) {
      expect(filhosDaEmpresa(papel)).toContain('Dados');
      expect(filhosDaEmpresa(papel)).toContain('Equipa e associações');
    }
  });

  it('mandaNaEmpresa é só proprietário e gestor', () => {
    expect(mandaNaEmpresa('proprietario')).toBe(true);
    expect(mandaNaEmpresa('gestor')).toBe(true);
    expect(mandaNaEmpresa('vendedor')).toBe(false);
    expect(mandaNaEmpresa('financeiro')).toBe(false);
    expect(mandaNaEmpresa('leitor')).toBe(false);
  });
});

describe('a subscrição sai da gestão dos produtos', () => {
  it('não é um destino de Vender', () => {
    const vender = destinosDoFornecedor('vendas', { orgId: ORG, papel: 'proprietario' }).find((g) => g.title === 'Vender');
    expect(vender!.items.map((i) => i.label)).not.toContain('Subscrição');
  });

  it('vive dentro da Empresa, e é a da empresa fornecedora', () => {
    const empresa = destinos('vendas', 'proprietario').find((d) => d.label === 'Empresa');
    // `/app/subscricao` é o plano de uma empresa **de pintura**: mandar lá o fornecedor dava-lhe o
    // ecrã errado. A subscrição do fornecedor vive debaixo da sua própria organização.
    expect((empresa?.children ?? []).map((c) => c.href)).toContain(`/app/organizacoes/${ORG}/subscricao`);
    expect((empresa?.children ?? []).map((c) => c.href)).not.toContain('/app/subscricao');
  });
});

describe('o percurso comercial dos produtos', () => {
  it('Produtos, Preços e descontos e Entrega em obra são um só destino com três passos', () => {
    const produtos = destinos('vendas').find((d) => d.label === 'Produtos e preços');
    expect((produtos?.children ?? []).map((c) => c.label)).toEqual(['Produtos', 'Preços e descontos', 'Entrega em obra']);
  });
});

describe('a que contexto pertence cada endereço', () => {
  it.each([
    ['/app/avaliacoes', 'avaliacoes'],
    ['/app/avaliacoes/oportunidades', 'avaliacoes'],
    ['/app/levantamentos/abc', 'avaliacoes'],
    ['/app/vendas', 'vendas'],
    ['/app/encomendas', 'vendas'],
    [`/app/organizacoes/${ORG}/produtos`, 'vendas'],
    ['/app', 'vendas'],
  ])('%s → %s', (caminho, esperado) => {
    expect(contextoDoCaminho(caminho)).toBe(esperado);
  });

  it('o detalhe de um levantamento é trabalho pessoal, mesmo vivendo fora de /avaliacoes', () => {
    expect(contextoDoCaminho('/app/levantamentos/96777525')).toBe('avaliacoes');
  });
});

describe('contagens', () => {
  it('aparecem só onde há uma ação de quem está a ver', () => {
    const g = destinosDoFornecedor('avaliacoes', {
      orgId: ORG,
      papel: 'vendedor',
      contagens: { oportunidades: 2, porFazer: 1 },
    }).flatMap((x) => x.items);
    expect(g.find((d) => d.label === 'Oportunidades')?.count).toBe(2);
    expect(g.find((d) => d.label === 'Os meus levantamentos')?.count).toBe(1);
    expect(g.find((d) => d.label === 'Qualificação')?.count).toBeUndefined();
  });
});

describe('o início de cada contexto', () => {
  it('leva ao Hoje respetivo', () => {
    expect(inicioDoContexto('vendas')).toBe(RAIZ_VENDAS);
    expect(inicioDoContexto('avaliacoes')).toBe(RAIZ_AVALIACOES);
  });
});
