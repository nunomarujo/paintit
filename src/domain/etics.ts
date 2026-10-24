// Capoto (ETICS — sistema compósito de isolamento térmico pelo exterior).
//
// Um capoto não é um material: é um **sistema certificado** em que a cola, o isolante, a argamassa de
// base, a rede, os perfis e o acabamento vêm aprovados em conjunto pelo fabricante. Misturar marcas
// por conveniência anula a garantia, e é por isso que o orçamento tem de dizer sempre três coisas —
// isolante, espessura e acabamento. Sem elas, duas propostas com preços muito diferentes podem estar
// a falar de obras diferentes, e o cliente não tem como saber.
//
// Os valores de condutibilidade são **indicativos**, para dar ordem de grandeza a quem lê: o valor que
// conta é o da ficha técnica do produto escolhido. Nenhum número daqui entra em cálculo de preço.

import type { ProductType } from './catalog';

export const ISOLANTES = ['eps', 'eps_grafitado', 'xps', 'la_mineral', 'icb'] as const;
export type Isolante = (typeof ISOLANTES)[number];

export interface IsolanteInfo {
  label: string;
  /** Uma linha, para o cabeçalho da ficha de materiais. */
  resumo: string;
  /** Condutibilidade térmica indicativa, em W/(m·K). Quanto menor, mais isola por centímetro. */
  lambda: [number, number];
  vantagens: string[];
  /** Limites e cuidados. Aparecem na proposta: um orçamento honesto diz também o que o material não faz. */
  cuidados: string[];
  /** Reação ao fogo, em linguagem corrente. */
  fogo: string;
}

export const ISOLANTE_INFO: Record<Isolante, IsolanteInfo> = {
  eps: {
    label: 'EPS (poliestireno expandido)',
    resumo: 'O isolante mais usado em capoto: bom desempenho, leve e o mais económico.',
    lambda: [0.036, 0.038],
    vantagens: ['Melhor relação entre preço e isolamento.', 'Leve: não sobrecarrega a parede nem o andaime.', 'Fácil de cortar e ajustar em fachadas com muitos vãos.'],
    cuidados: ['Não serve para zonas em contacto permanente com água ou com o solo.', 'Arde: em edifícios altos há exigências próprias.'],
    fogo: 'Combustível (Euroclasse E).',
  },
  eps_grafitado: {
    label: 'EPS grafitado',
    resumo: 'O mesmo EPS com grafite: isola mais por centímetro, o que permite placas mais finas.',
    lambda: [0.031, 0.033],
    vantagens: ['Isola cerca de 15% a 20% mais do que o EPS branco, à mesma espessura.', 'Permite placa mais fina onde a fachada não tem folga nos peitoris e soleiras.'],
    cuidados: ['Não pode apanhar sol direto durante a aplicação sem rede de sombra: aquece e empena.', 'Mais caro do que o EPS branco.', 'Arde, como o EPS branco.'],
    fogo: 'Combustível (Euroclasse E).',
  },
  xps: {
    label: 'XPS (poliestireno extrudido)',
    resumo: 'Resistente à água e ao impacto. Usa-se sobretudo na zona baixa da fachada.',
    lambda: [0.033, 0.036],
    vantagens: ['Aguenta água e salpicos: é o indicado para socos e zonas enterradas.', 'Resiste melhor a pancadas, onde há passagem de pessoas.'],
    cuidados: ['Deixa sair menos vapor do que o EPS: não é para a fachada toda.', 'Mais caro.'],
    fogo: 'Combustível (Euroclasse E).',
  },
  la_mineral: {
    label: 'Lã mineral / lã de rocha',
    resumo: 'Não arde e deixa a parede respirar. É a escolha quando o fogo manda.',
    lambda: [0.035, 0.041],
    vantagens: ['Não arde: resolve as exigências de segurança contra incêndio em edifícios altos.', 'Muito permeável ao vapor: ajuda em paredes húmidas.', 'Melhora também o isolamento ao ruído.'],
    cuidados: ['Mais cara e mais pesada: a fixação e o andaime têm de contar com isso.', 'Tem de ser protegida da chuva durante a obra.'],
    fogo: 'Não combustível (Euroclasse A1 ou A2).',
  },
  icb: {
    label: 'Cortiça expandida (ICB)',
    resumo: 'Isolante natural, de origem portuguesa, com durabilidade muito longa.',
    lambda: [0.039, 0.045],
    vantagens: ['Natural e reciclável, sem aditivos.', 'Muito estável ao longo do tempo.', 'Boa escolha onde há exigência ambiental ou patrimonial.'],
    cuidados: ['O mais caro dos cinco.', 'Isola menos por centímetro: precisa de mais espessura para o mesmo resultado.'],
    fogo: 'Combustível, mas de comportamento mais lento (Euroclasse E).',
  },
};

/** Espessuras correntes, em milímetros. Em Portugal continental o habitual é 60 a 80. */
/**
 * Que tipo de produto do catálogo corresponde a cada isolante. É o que permite ao separador do capoto
 * mostrar produtos reais, com marca e preço, em vez de conselhos genéricos — o mesmo que já acontece
 * com as tintas.
 */
export const TIPO_PRODUTO: Record<Isolante, ProductType> = {
  eps: 'isolamento_eps',
  eps_grafitado: 'isolamento_eps_grafitado',
  xps: 'isolamento_xps',
  la_mineral: 'isolamento_la_mineral',
  icb: 'isolamento_cortica',
};

/** Tipos do catálogo que compõem o resto do sistema. */
export const TIPO_PRODUTO_COMPLEMENTOS: ProductType[] = ['fixador_capoto', 'rede_fibra_vidro', 'reboco_capoto'];

export const ESPESSURAS_MM = [40, 50, 60, 80, 100, 120, 140, 160] as const;
export type EspessuraMm = (typeof ESPESSURAS_MM)[number];

export const ACABAMENTOS = ['acrilico', 'siloxano', 'silicone', 'mineral'] as const;
export type Acabamento = (typeof ACABAMENTOS)[number];

export const ACABAMENTO_INFO: Record<Acabamento, { label: string; resumo: string; vantagens: string[]; cuidados: string[] }> = {
  acrilico: {
    label: 'Acrílico',
    resumo: 'O acabamento mais económico, com boa resistência mecânica.',
    vantagens: ['Preço.', 'Boa resistência a pancadas e a fissuração.', 'Grande escolha de cores.'],
    cuidados: ['Deixa sair pouco vapor.', 'Suja mais depressa em zonas húmidas ou pouco soalheiras.'],
  },
  siloxano: {
    label: 'Siloxano',
    resumo: 'Repele a água da chuva mas deixa a parede respirar. O equilíbrio mais usado.',
    vantagens: ['Água escorre sem entrar, vapor sai.', 'Suja menos: boa escolha no litoral e a norte.', 'Menos fungos e algas.'],
    cuidados: ['Mais caro do que o acrílico.'],
  },
  silicone: {
    label: 'Silicone',
    resumo: 'O mais durável em fachada exposta, e o que menos suja.',
    vantagens: ['Muito permeável ao vapor.', 'Autolimpante com a chuva.', 'Cor estável durante mais tempo.'],
    cuidados: ['O mais caro.'],
  },
  mineral: {
    label: 'Mineral (à base de cal ou cimento)',
    resumo: 'Acabamento tradicional, muito respirável, indicado em edifício antigo.',
    vantagens: ['Muito permeável ao vapor.', 'Não arde.', 'Aspeto próximo do reboco tradicional.'],
    cuidados: ['Gama de cores mais limitada.', 'Exige pintura posterior com tinta compatível.', 'Mais sensível à aplicação em tempo frio ou húmido.'],
  },
};

/** Situação da fachada. Decide o que entra no orçamento e o que aparece no cabeçalho. */
export const SITUACOES = ['novo_sobre_pintura', 'novo', 'manutencao'] as const;
export type Situacao = (typeof SITUACOES)[number];

export const SITUACAO_LABELS: Record<Situacao, string> = {
  novo_sobre_pintura: 'Fachada pintada, vai levar capoto novo',
  novo: 'Capoto novo (fachada sem acabamento anterior)',
  manutencao: 'Capoto já existente, trabalho de manutenção',
};

/**
 * Camadas do sistema, por ordem de aplicação. Num capoto novo aplicam-se todas; na manutenção de um
 * capoto existente só se mexe no acabamento, e é por isso que a diferença de preço entre as duas
 * situações é enorme — o orçamento tem de deixar claro qual delas está a orçamentar.
 */
export const CAMADAS = [
  { id: 'preparacao', label: 'Preparação do suporte', descricao: 'Lavagem, remoção de tinta solta e correção de zonas degradadas.' },
  { id: 'colagem', label: 'Argamassa de colagem', descricao: 'Fixa as placas à parede.' },
  { id: 'isolante', label: 'Placa isolante', descricao: 'O material que isola, na espessura escolhida.' },
  { id: 'buchas', label: 'Fixação mecânica', descricao: 'Buchas próprias que seguram as placas além da cola.' },
  { id: 'perfis', label: 'Perfis', descricao: 'Arranque, cantos e pingadeiras: definem os remates e protegem as arestas.' },
  { id: 'base_rede', label: 'Argamassa de base com rede', descricao: 'Camada armada com rede de fibra de vidro; é ela que impede fissuras.' },
  { id: 'primario', label: 'Primário', descricao: 'Uniformiza a absorção antes do acabamento.' },
  { id: 'acabamento', label: 'Acabamento', descricao: 'A camada visível, colorida, que dá a textura final.' },
] as const;
export type CamadaId = (typeof CAMADAS)[number]['id'];

/** Camadas que uma manutenção de capoto existente envolve, por omissão. */
export const CAMADAS_MANUTENCAO: CamadaId[] = ['preparacao', 'primario', 'acabamento'];

export interface CapotoSpec {
  situacao: Situacao;
  isolante: Isolante | null;
  espessuraMm: number | null;
  acabamento: Acabamento | null;
  /** Demãos do acabamento ou da tinta final. */
  demaos: number | null;
  /** Cor da tinta de acabamento, como o cliente a pediu ou o pintor a propõe. */
  cor?: string | null;
}

export const isIsolante = (v: unknown): v is Isolante => typeof v === 'string' && (ISOLANTES as readonly string[]).includes(v);
export const isAcabamento = (v: unknown): v is Acabamento => typeof v === 'string' && (ACABAMENTOS as readonly string[]).includes(v);
export const isSituacao = (v: unknown): v is Situacao => typeof v === 'string' && (SITUACOES as readonly string[]).includes(v);

/**
 * O que falta para a especificação do capoto estar completa. Numa manutenção não se pergunta o
 * isolante nem a espessura: o que lá está já está, e perguntá-lo só convidava a inventar.
 */
export function capotoEmFalta(spec: CapotoSpec): string[] {
  const falta: string[] = [];
  if (spec.situacao !== 'manutencao') {
    if (!spec.isolante) falta.push('isolante');
    if (!spec.espessuraMm) falta.push('espessura');
  }
  if (!spec.acabamento) falta.push('acabamento');
  if (spec.espessuraMm !== null && (spec.espessuraMm < 20 || spec.espessuraMm > 300)) falta.push('espessura válida');
  return falta;
}

/** Camadas que esta especificação implica. */
export function camadasDe(spec: CapotoSpec): CamadaId[] {
  if (spec.situacao === 'manutencao') return [...CAMADAS_MANUTENCAO];
  return CAMADAS.map((c) => c.id);
}

/**
 * Como o trabalho se identifica no cabeçalho do orçamento, para que o cliente perceba de imediato
 * que não está a comparar uma pintura com um capoto (pedido do promotor, 24/10/2026).
 */
export function cabecalhoTrabalho(opcoes: { temPintura: boolean; temCapoto: boolean }): string {
  if (opcoes.temCapoto && opcoes.temPintura) return 'Pintura e capoto';
  if (opcoes.temCapoto) return 'Capoto';
  return 'Pintura';
}

/** Uma linha que descreve o sistema, para o cabeçalho e para as listagens. */
export function resumoCapoto(spec: CapotoSpec): string {
  if (spec.situacao === 'manutencao') {
    const ac = spec.acabamento ? ACABAMENTO_INFO[spec.acabamento].label.toLowerCase() : 'acabamento por definir';
    return `Manutenção de capoto existente, acabamento ${ac}`;
  }
  const iso = spec.isolante ? ISOLANTE_INFO[spec.isolante].label : 'isolante por definir';
  const esp = spec.espessuraMm ? `${spec.espessuraMm} mm` : 'espessura por definir';
  const ac = spec.acabamento ? ACABAMENTO_INFO[spec.acabamento].label.toLowerCase() : 'acabamento por definir';
  const cor = spec.cor?.trim() ? `, cor ${spec.cor.trim()}` : '';
  return `Capoto novo: ${iso}, ${esp}, acabamento ${ac}${cor}`;
}
