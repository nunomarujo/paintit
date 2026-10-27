import { WORKS, workDef, type WorkDef } from './works';

// Modelos de orçamento por tipo de obra (25/10/2026, docs/DECISOES.md).
//
// Dos 1 a 3 horas que um orçamento leva hoje, cerca de 45 minutos são a decidir e a escrever de novo
// os mesmos capítulos — e é também onde se esquece o primário ou o andaime, que depois sai do bolso.
// Um modelo não decide nada pelo pintor: põe em cima da mesa o que normalmente entra naquele tipo de
// obra, já pela ordem de execução, para ele tirar o que não quer em vez de se lembrar do que falta.
//
// Nenhum modelo traz preços. Os preços são dele e vêm da biblioteca (src/domain/priceBook.ts).

export interface QuoteTemplate {
  code: string;
  label: string;
  /** Uma linha que diz a quem serve, para ele escolher sem abrir. */
  quando: string;
  /** Códigos de `WORKS`, pela ordem de execução em obra. */
  trabalhos: string[];
}

export const QUOTE_TEMPLATES: QuoteTemplate[] = [
  {
    code: 'fachada_reboco',
    label: 'Fachada exterior rebocada',
    quando: 'Prédio ou moradia com reboco pintado, com fissuras e sujidade acumulada. O caso mais comum.',
    trabalhos: ['lavagem', 'fissuras', 'rebocos', 'primario', 'pintura_final', 'selagem_remates', 'acessos', 'conclusao'],
  },
  {
    code: 'fachada_degradada',
    label: 'Fachada degradada, com humidade',
    quando: 'Reboco a destacar, manchas de humidade ou salitre, paredes que já falharam uma pintura.',
    trabalhos: ['lavagem', 'humidade', 'fissuras', 'rebocos', 'rede_barramento', 'primario', 'pintura_final', 'acessos', 'conclusao'],
  },
  {
    code: 'zonas_comuns',
    label: 'Zonas comuns interiores',
    quando: 'Entradas, patamares e caixa de escadas de um prédio.',
    trabalhos: ['fissuras', 'primario', 'pintura_final', 'metais_madeiras', 'conclusao'],
  },
  {
    code: 'interior_habitacao',
    label: 'Interior de habitação',
    quando: 'Casa ou apartamento por dentro, com ou sem mobília.',
    trabalhos: ['fissuras', 'primario', 'pintura_final', 'metais_madeiras', 'conclusao'],
  },
  {
    code: 'muros',
    label: 'Muros e vedações',
    quando: 'Muros de rua ou de quintal, com ou sem gradeamento.',
    trabalhos: ['lavagem', 'fissuras', 'primario', 'pintura_final', 'metais_madeiras', 'conclusao'],
  },
  {
    code: 'impermeabilizacao',
    label: 'Terraço ou cobertura',
    quando: 'Impermeabilização de terraço, varanda ou cobertura plana.',
    trabalhos: ['lavagem', 'fissuras', 'impermeabilizacao', 'selagem_remates', 'acessos', 'conclusao'],
  },
  {
    code: 'metais',
    label: 'Gradeamentos e serralharia',
    quando: 'Portões, guardas, grades e estruturas metálicas.',
    trabalhos: ['lavagem', 'metais_madeiras', 'conclusao'],
  },
];

export const templateDe = (code: string): QuoteTemplate | undefined => QUOTE_TEMPLATES.find((t) => t.code === code);

/**
 * Os capítulos que fecham qualquer obra, por esta ordem. Em todos os modelos já estão no fim; ao
 * juntar modelos é preciso dizê-lo em voz alta, senão a serralharia das zonas comuns entrava depois
 * da limpeza final.
 */
const FECHO = ['acessos', 'conclusao'];

/**
 * Os códigos de trabalho de um ou mais modelos, numa só sequência de execução.
 *
 * Uma obra real é quase sempre mais do que um modelo — fachada *e* zonas comuns, fachada *e* muros —
 * e obrigar a escolher um só deixava o pintor a adivinhar qual deles sacrificava (pedido do promotor,
 * 27/10/2026). Juntar é somar sem repetir: cada capítulo entra uma vez, na posição em que o primeiro
 * modelo que o traz o põe, e os dois capítulos de fecho vão sempre para o fim.
 *
 * Um capítulo que apareça nos dois modelos — a pintura final, por exemplo — fica numa linha só. Não é
 * descuido: a linha tem zonas e o pintor acrescenta uma segunda linha no editor se quiser separar o
 * exterior do interior com produto e preço próprios.
 */
export function codigosDosModelos(codes: string[]): string[] {
  const vistos = new Set<string>();
  const corpo: string[] = [];
  for (const code of codes) {
    for (const c of templateDe(code)?.trabalhos ?? []) {
      if (vistos.has(c)) continue;
      vistos.add(c);
      if (!FECHO.includes(c)) corpo.push(c);
    }
  }
  return [...corpo, ...FECHO.filter((c) => vistos.has(c))];
}

/** Os trabalhos de um modelo, já resolvidos e pela ordem de execução. Ignora códigos que deixem de existir. */
export function trabalhosDoModelo(code: string): WorkDef[] {
  return trabalhosDosModelos([code]);
}

/** O mesmo, para vários modelos escolhidos ao mesmo tempo. */
export function trabalhosDosModelos(codes: string[]): WorkDef[] {
  return codigosDosModelos(codes)
    .map((c) => workDef(c))
    .filter((w): w is WorkDef => w !== undefined);
}

/**
 * Trabalhos que não estão nos modelos escolhidos, para ele poder acrescentar sem sair do ecrã — um
 * modelo que não deixe fugir dele é uma gaiola, não uma ajuda.
 */
export function trabalhosFora(codes: string | string[]): WorkDef[] {
  const dentro = new Set(codigosDosModelos(Array.isArray(codes) ? codes : [codes]));
  return WORKS.filter((w) => !dentro.has(w.code));
}

/** Os acessos e a limpeza final são os dois que mais se esquecem, e os dois que saem do bolso. */
export const ESQUECIDOS = ['acessos', 'conclusao'] as const;

/** Avisa quando o orçamento não prevê acessos nem limpeza final — não impede nada, só lembra. */
export function lembretes(codigosUsados: string[]): string[] {
  const usados = new Set(codigosUsados);
  const out: string[] = [];
  if (!usados.has('acessos')) out.push('O orçamento não prevê acessos. Se a obra levar andaime ou plataforma, é um custo que sai do seu bolso.');
  if (!usados.has('conclusao')) out.push('O orçamento não prevê limpeza final nem remoção de resíduos.');
  return out;
}

/**
 * Unidades em que a quantidade da primeira linha serve as outras.
 *
 * Só a área. Numa fachada de 30 m², o primário, o barramento e a pintura são os mesmos 30 m² — é a
 * mesma superfície a ser trabalhada várias vezes. Metros lineares não: a fissura a reparar e o
 * rodapé a pintar não têm o mesmo comprimento. Unidades e verbas globais muito menos.
 */
export const UNIDADES_QUE_HERDAM = ['m2'] as const;

export interface LinhaParaHerdar {
  id: string;
  unidade: string;
  quantidade: number;
}

/**
 * Que linhas devem receber a quantidade que acabou de ser escrita.
 *
 * Só as que ainda estão por preencher (quantidade a zero, como nascem de um modelo) e na mesma
 * unidade. Nunca se mexe numa quantidade que alguém já escreveu — o automatismo serve para poupar
 * trabalho, não para desfazer o que o pintor decidiu.
 */
export function linhasQueHerdam(linhas: LinhaParaHerdar[], origem: LinhaParaHerdar): string[] {
  if (origem.quantidade <= 0) return [];
  if (!(UNIDADES_QUE_HERDAM as readonly string[]).includes(origem.unidade)) return [];
  return linhas.filter((l) => l.id !== origem.id && l.unidade === origem.unidade && l.quantidade === 0).map((l) => l.id);
}
