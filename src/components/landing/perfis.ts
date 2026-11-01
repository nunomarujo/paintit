/**
 * O que a página inicial e as páginas próprias dizem ao pintor e ao fornecedor — uma só fonte,
 * sem `'use client'`, para poder ser lida tanto pelo `AudiencePopup` (cliente) como pelas páginas
 * `/empresas` e `/fornecedores` (servidor). Nunca percentagens (regra 15 do CLAUDE.md).
 */
export type Tipo = 'pintor' | 'fornecedor';

export const toOrg = (tipo: string) => `/entrar?seguinte=${encodeURIComponent(`/app/organizacoes/nova?tipo=${tipo}`)}`;

export const DEMO_DE_PERFIL: Record<Tipo, { src: string; width: number; height: number; alt: string; legenda: string }> = {
  pintor: {
    src: '/img/popup-demo-pintor.webp',
    width: 1696,
    height: 1240,
    alt: 'Orçamento guiado: trabalho "Pintura final" selecionado, com sugestões de produto do catálogo (CIN Vinylmatt) e a descrição gerada automaticamente para o cliente.',
    legenda: 'O orçamento guiado, a sério — com sugestões de produtos do catálogo.',
  },
  fornecedor: {
    src: '/img/popup-demo-fornecedor.webp',
    width: 1792,
    height: 1520,
    alt: 'Catálogo de produtos de um fornecedor, com fichas técnicas e preços, e a lista de descontos que já tem definidos para os pintores.',
    legenda: 'O catálogo e os descontos, exatamente como o pintor os vê.',
  },
};

export const CONTEUDO_DE_PERFIL: Record<Tipo, {
  tag: string;
  titulo: string;
  intro: string;
  destaques: string[];
  beneficios: string[];
  nota: string;
  ctaTexto: string;
  ctaNota: string;
}> = {
  pintor: {
    tag: 'Para empresas de pintura',
    titulo: 'Mais obras, menos tempo em orçamentos.',
    intro:
      'Oportunidades de negócio filtradas pela sua zona e tipo de obra, com uma ferramenta de orçamentação feita para pintores — não uma folha de cálculo genérica.',
    destaques: [
      'Oportunidades de negócio na sua zona, por tipo de obra',
      'Comissão só devida depois de ganhar a obra — nunca antecipada',
      'Documento A4 gerado automaticamente, pronto a enviar',
    ],
    beneficios: [
      'Oportunidades de negócio na sua zona, por tipo de obra',
      'Orçamento guiado, com sugestões de produtos do catálogo',
      'Associação direta de trabalhos a materiais e preços',
      'Documento A4 gerado automaticamente, pronto a enviar',
      'Orçamentos para clientes próprios, fora do mercado aberto',
      'Gestão de obra incluída — fotos, horas e despesas',
    ],
    nota:
      'A comissão só é devida depois de ganhar uma obra — nunca antecipada — e desce com fidelização e com referências de fornecedores. Há também um plano Pro opcional, com desconto adicional de comissão. Os valores exatos são confirmados na área profissional.',
    ctaTexto: 'Aderir como empresa',
    ctaNota: 'Receba pedidos de orçamento compatíveis com a sua zona e especialidade.',
  },
  fornecedor: {
    tag: 'Para fornecedores de tintas',
    titulo: 'O seu catálogo, dentro de cada orçamento.',
    intro:
      'Os seus produtos aparecem onde a decisão é tomada: dentro do orçamento guiado dos pintores, com fichas técnicas e condições já definidas.',
    destaques: [
      'Presença direta nos orçamentos dos pintores da plataforma',
      'Descontos e condições automáticas, sem negociação manual',
      'Dois programas de referência (adesão e indicação)',
    ],
    beneficios: [
      'Catálogo integrado com fichas técnicas e preço de referência',
      'Presença direta nos orçamentos dos pintores da plataforma',
      'Descontos e condições automáticas, sem negociação manual repetida',
      'Gestão da relação com os pintores que usam o seu catálogo',
      'Dois programas de referência: código de adesão para pintores e indicação de outros fornecedores',
      'Oportunidades de levantamento no terreno, através dos avaliadores',
    ],
    nota:
      'A presença no catálogo depende de um plano de subscrição mensal; as condições comerciais reais, incluindo subscrições já existentes, são confirmadas na área de fornecedor.',
    ctaTexto: 'Aderir como fornecedor',
    ctaNota: 'Ponha o seu catálogo à frente de quem orçamenta pintura todos os dias.',
  },
};
