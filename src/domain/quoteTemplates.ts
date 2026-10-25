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

/** Os trabalhos de um modelo, já resolvidos e pela ordem de execução. Ignora códigos que deixem de existir. */
export function trabalhosDoModelo(code: string): WorkDef[] {
  const t = templateDe(code);
  if (!t) return [];
  return t.trabalhos.map((c) => workDef(c)).filter((w): w is WorkDef => w !== undefined);
}

/**
 * Trabalhos que não estão no modelo escolhido, para ele poder acrescentar sem sair do ecrã — um
 * modelo que não deixe fugir dele é uma gaiola, não uma ajuda.
 */
export function trabalhosFora(code: string): WorkDef[] {
  const dentro = new Set(templateDe(code)?.trabalhos ?? []);
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
