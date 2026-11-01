// A organização do workspace do fornecedor: dois contextos, e o que vive em cada um.
//
// Decidida pelo promotor a 01/11/2026. Vive aqui, numa função pura, e não espalhada pelo layout, por três
// razões: a regra de privacidade entre pessoa e empresa é de negócio e não de desenho; a mesma lista tem de
// servir a barra lateral e o menu de telemóvel sem poderem divergir; e isto testa-se sem navegador.
//
// **A privacidade é a regra que não se negoceia aqui.** O responsável da empresa manda nos produtos, nos
// descontos e na equipa — e **não vê** os levantamentos que cada vendedor aceita nem as comissões pessoais
// de ninguém. Por isso o contexto «Avaliações» é inteiramente pessoal: o que lá está é de quem está a olhar,
// seja qual for o papel que tenha na empresa.

export type Contexto = 'vendas' | 'avaliacoes';

export type PapelNaEmpresa = 'proprietario' | 'gestor' | 'vendedor' | 'financeiro' | 'leitor';

/** Os nomes dos ícones vêm de quem os desenha (`src/components/NavIcons.tsx`): assim um nome inventado
 * aqui falha na compilação em vez de deixar um destino sem forma nenhuma. */
export type NomeDeIcone =
  | 'casa' | 'lupa' | 'caixa' | 'recibo' | 'pessoas' | 'percentagem' | 'balanca' | 'mostrador' | 'predio';

export type Destino = {
  href: string;
  label: string;
  icon?: NomeDeIcone;
  /** Contagem — só no que exige uma ação de quem está a ver. */
  count?: number;
  /** Aviso em texto, nunca fundo de cor dentro de uma lista (regra 13). */
  aviso?: boolean;
  /** Secções de dentro, mostradas quando se está lá. */
  children?: { href: string; label: string; padrao?: boolean }[];
  exact?: boolean;
};

export type GrupoDeDestinos = { title: string; items: Destino[] };

export const RAIZ_VENDAS = '/app/vendas';
export const RAIZ_AVALIACOES = '/app/avaliacoes';

/** Manda nos produtos, nos descontos e na equipa. Não manda — nem vê — o trabalho pessoal de ninguém. */
export function mandaNaEmpresa(papel: PapelNaEmpresa): boolean {
  return papel === 'proprietario' || papel === 'gestor';
}

/** Qual dos dois contextos um endereço pertence. O que não é de nenhum fica em Vendas, que é o lado da
 * empresa e o que uma conta de fornecedor vê primeiro. */
export function contextoDoCaminho(caminho: string): Contexto {
  return caminho === RAIZ_AVALIACOES || caminho.startsWith(`${RAIZ_AVALIACOES}/`) || caminho.startsWith('/app/levantamentos')
    ? 'avaliacoes'
    : 'vendas';
}

export type ContagensDoWorkspace = {
  /** Encomendas à espera de resposta da empresa. */
  encomendas?: number;
  /** Oportunidades de levantamento abertas na zona desta pessoa. */
  oportunidades?: number;
  /** Levantamentos desta pessoa com alguma coisa por fazer. */
  porFazer?: number;
  /** A empresa tem associações por aceitar. */
  associacoesPendentes?: number;
};

/**
 * Os destinos de um contexto.
 *
 * `papel` só decide o que aparece em **Vendas** — a parte da empresa. Avaliações é igual para toda a gente
 * porque é o trabalho de cada um.
 */
export function destinosDoFornecedor(
  contexto: Contexto,
  { orgId, papel, contagens = {} }: { orgId: string; papel: PapelNaEmpresa; contagens?: ContagensDoWorkspace },
): GrupoDeDestinos[] {
  if (contexto === 'avaliacoes') {
    return [
      {
        title: 'O seu trabalho',
        items: [
          { href: RAIZ_AVALIACOES, label: 'Hoje', icon: 'casa', exact: true },
          { href: `${RAIZ_AVALIACOES}/oportunidades`, label: 'Oportunidades', icon: 'lupa', count: contagens.oportunidades },
          { href: `${RAIZ_AVALIACOES}/levantamentos`, label: 'Os meus levantamentos', icon: 'caixa', count: contagens.porFazer },
        ],
      },
      {
        title: 'A sua conta',
        items: [
          { href: `${RAIZ_AVALIACOES}/comissoes`, label: 'Comissões pessoais', icon: 'percentagem' },
          { href: `${RAIZ_AVALIACOES}/qualificacao`, label: 'Qualificação', icon: 'balanca' },
          { href: `${RAIZ_AVALIACOES}/disponibilidade`, label: 'Disponibilidade e alertas', icon: 'mostrador' },
        ],
      },
    ];
  }

  const empresa: Destino[] = [
    {
      href: `/app/organizacoes/${orgId}`,
      label: 'Empresa',
      icon: 'predio',
      exact: true,
      count: contagens.associacoesPendentes,
      children: [
        { href: `/app/organizacoes/${orgId}`, label: 'Dados', padrao: true },
        { href: `/app/organizacoes/${orgId}/equipa`, label: 'Equipa e associações' },
        ...(mandaNaEmpresa(papel) ? [{ href: `/app/organizacoes/${orgId}/regras`, label: 'Regras comerciais' }] : []),
        ...(mandaNaEmpresa(papel) ? [{ href: `/app/organizacoes/${orgId}/subscricao`, label: 'Subscrição' }] : []),
      ],
    },
  ];

  return [
    {
      title: 'Dia a dia',
      items: [
        { href: RAIZ_VENDAS, label: 'Hoje', icon: 'casa', exact: true },
        { href: '/app/encomendas', label: 'Encomendas', icon: 'recibo', count: contagens.encomendas },
      ],
    },
    {
      title: 'Vender',
      items: [
        {
          href: `/app/organizacoes/${orgId}/produtos`,
          label: 'Produtos e preços',
          icon: 'caixa',
          children: [
            { href: `/app/organizacoes/${orgId}/produtos`, label: 'Produtos', padrao: true },
            { href: `/app/organizacoes/${orgId}/produtos/precos`, label: 'Preços e descontos' },
            { href: `/app/organizacoes/${orgId}/produtos/entrega`, label: 'Entrega em obra' },
          ],
        },
        { href: `/app/organizacoes/${orgId}/clientes`, label: 'Clientes e convites', icon: 'pessoas' },
        { href: '/app/catalogo', label: 'Catálogo', icon: 'lupa' },
      ],
    },
    { title: 'A empresa', items: [{ href: `/app/organizacoes/${orgId}/adesoes`, label: 'Comissões de adesão', icon: 'percentagem' }, ...empresa] },
  ];
}

/** Onde cada contexto começa, para o seletor saber para onde levar. */
export function inicioDoContexto(contexto: Contexto): string {
  return contexto === 'avaliacoes' ? RAIZ_AVALIACOES : RAIZ_VENDAS;
}
