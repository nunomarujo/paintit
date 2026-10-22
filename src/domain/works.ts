import { EQUIVALENT_LABEL, equivalentFlag } from './equivalence';
import { DESIRED_WORK_LABELS, parseHundredths, type DesiredWork } from './request';
import type { Inclusion, LineCategory, Unit } from './proposal';

// Orçamento guiado (docs/PROPOSTA.md, fase 3): o pintor escolhe "trabalhos"; cada um tem os seus campos,
// um estado e a zona onde se executa. As linhas de preço geram-se daqui, sem reescrever descrições.

export const WORK_STATES = ['base', 'opcional', 'confirmar', 'nao_incluido'] as const;
export type WorkState = (typeof WORK_STATES)[number];
export const WORK_STATE_LABELS: Record<WorkState, string> = {
  base: 'Proposta base',
  opcional: 'Opcional',
  confirmar: 'A confirmar',
  nao_incluido: 'Não incluído',
};
const STATE_TO_INCLUSION: Record<WorkState, Inclusion> = {
  base: 'incluido',
  opcional: 'opcional',
  confirmar: 'condicionado',
  nao_incluido: 'nao_incluido',
};
export const inclusionToState = (i: Inclusion): WorkState =>
  (Object.entries(STATE_TO_INCLUSION).find(([, v]) => v === i)?.[0] as WorkState | undefined) ?? 'base';

export interface WorkField {
  key: string;
  label: string;
  kind: 'text' | 'select' | 'number';
  options?: readonly string[];
  placeholder?: string;
  suffix?: string;
  required?: boolean;
  /** Como aparece na descrição para o cliente, antes do valor (por omissão, só o valor). */
  prefix?: string;
}

export interface WorkDef {
  code: string;
  label: string;
  categoria: LineCategory;
  unit: Unit;
  /** Etiqueta da quantidade; null = valor global (sem quantidade). */
  qtyLabel: string | null;
  /** Mostra "Onde vai executar?" (zonas). */
  where: boolean;
  /** Trabalho que o cliente pode pedir no pedido e que este cobre. */
  requested?: DesiredWork;
  fields: WorkField[];
}

const produto: WorkField = { key: 'produto', label: 'Produto: marca e referência', kind: 'text', placeholder: 'Escrever a marca e a referência' };

export const WORKS: WorkDef[] = [
  { code: 'lavagem', label: 'Lavagem e limpeza', categoria: 'preparacao', unit: 'm2', qtyLabel: 'Área deste trabalho', where: true, requested: 'lavagem',
    fields: [{ key: 'metodo', label: 'Como vai limpar?', kind: 'select', required: true, options: ['Lavagem a alta pressão', 'Lavagem com tratamento antifungos e algas', 'Escovagem e raspagem', 'Outro método'] }, produto] },
  { code: 'fissuras', label: 'Reparação de fissuras', categoria: 'reparacao', unit: 'ml', qtyLabel: 'Comprimento', where: true, requested: 'reparacao_fissuras',
    fields: [{ key: 'tratamento', label: 'Tratamento proposto', kind: 'text', required: true, placeholder: 'Descrever o tratamento após avaliação' }, produto] },
  { code: 'rebocos', label: 'Rebocos', categoria: 'reparacao', unit: 'm2', qtyLabel: 'Área deste trabalho', where: true,
    fields: [{ key: 'extensao', label: 'Extensão do trabalho', kind: 'select', required: true, options: ['Localizado', 'Integral'] }, produto, { key: 'espessura', label: 'Espessura prevista (mm)', kind: 'number', suffix: 'mm', placeholder: 'Por definir', prefix: 'Espessura' }] },
  { code: 'rede_barramento', label: 'Rede e barramento', categoria: 'preparacao', unit: 'm2', qtyLabel: 'Área deste trabalho', where: true,
    fields: [{ key: 'extensao', label: 'Extensão do trabalho', kind: 'select', required: true, options: ['Integral', 'Localizada', 'Faixas'] }, { key: 'rede', label: 'Rede: marca e referência', kind: 'text', placeholder: 'Escrever a marca e a referência', prefix: 'Rede' }, { key: 'argamassa', label: 'Argamassa de barramento', kind: 'text', placeholder: 'Marca e referência', prefix: 'Argamassa' }] },
  { code: 'primario', label: 'Primário', categoria: 'preparacao', unit: 'm2', qtyLabel: 'Área deste trabalho', where: true, requested: 'primario',
    fields: [{ ...produto, required: true }, { key: 'demaos', label: 'Número de demãos', kind: 'number', required: true, placeholder: 'Indicar' }] },
  { code: 'pintura_final', label: 'Pintura final', categoria: 'pintura', unit: 'm2', qtyLabel: 'Área deste trabalho', where: true, requested: 'pintura',
    fields: [{ ...produto, required: true }, { key: 'cor', label: 'Cor e código', kind: 'text', placeholder: 'Ex.: branco gelo, NCS S 0502-Y', prefix: 'Cor' }, { key: 'acabamento', label: 'Acabamento', kind: 'select', options: ['Mate', 'Acetinado', 'Brilhante', 'Texturado', 'Outro'] }, { key: 'demaos', label: 'Número de demãos', kind: 'number', required: true, placeholder: 'Indicar' }] },
  { code: 'selagem_remates', label: 'Selagem e remates', categoria: 'reparacao', unit: 'ml', qtyLabel: 'Comprimento', where: true,
    fields: [{ key: 'solucao', label: 'Onde e como (juntas, encontros, peitoris)', kind: 'text', required: true }, { key: 'material', label: 'Material: marca e referência', kind: 'text', placeholder: 'Escrever a marca e a referência' }] },
  { code: 'humidade', label: 'Tratamento de humidade', categoria: 'reparacao', unit: 'm2', qtyLabel: 'Área deste trabalho', where: true, requested: 'tratamento_humidade',
    fields: [{ key: 'tratamento', label: 'Tratamento proposto', kind: 'text', required: true }, produto] },
  { code: 'impermeabilizacao', label: 'Impermeabilização', categoria: 'pintura', unit: 'm2', qtyLabel: 'Área deste trabalho', where: true, requested: 'impermeabilizacao',
    fields: [{ key: 'sistema', label: 'Sistema proposto', kind: 'text', required: true, placeholder: 'Preparação, armadura, camadas' }, produto] },
  { code: 'metais_madeiras', label: 'Metais e madeiras', categoria: 'pintura', unit: 'm2', qtyLabel: 'Área deste trabalho', where: true, requested: 'tratamento_metais',
    fields: [{ key: 'tratamento', label: 'Preparação e sistema', kind: 'text', required: true }, produto] },
  { code: 'acessos', label: 'Acessos e proteções', categoria: 'acessos', unit: 'vg', qtyLabel: null, where: false,
    fields: [{ key: 'meio', label: 'Meio de acesso', kind: 'select', required: true, options: ['Andaimes', 'Plataforma elevatória', 'Acesso por cordas', 'Outro'] }, { key: 'dias', label: 'Duração incluída (dias)', kind: 'number', suffix: 'dias', prefix: 'Duração' }, { key: 'protecoes', label: 'Proteções previstas', kind: 'text', prefix: 'Proteções' }] },
  { code: 'licencas', label: 'Licenças e taxas', categoria: 'licencas', unit: 'vg', qtyLabel: null, where: false,
    fields: [{ key: 'inclui', label: 'O que inclui', kind: 'text', required: true, placeholder: 'Ex.: ocupação da via pública' }] },
  { code: 'conclusao', label: 'Limpeza final e resíduos', categoria: 'outro', unit: 'vg', qtyLabel: null, where: false,
    fields: [{ key: 'inclui', label: 'O que inclui', kind: 'text', required: true, placeholder: 'Ex.: remoção de resíduos e limpeza final' }] },
];

export const workDef = (code: string) => WORKS.find((w) => w.code === code);
const BY_REQUESTED = new Map(WORKS.filter((w) => w.requested).map((w) => [w.requested as DesiredWork, w]));
export const workForRequested = (w: DesiredWork) => BY_REQUESTED.get(w);

/**
 * Para cada trabalho que o cliente pediu no pedido, como esta proposta o cobre — usado no comparador do cliente,
 * trabalho a trabalho, do mesmo jeito que já se mostra a aderência por produto pedido. Uma entrada por pedido,
 * na mesma ordem e com o mesmo tamanho de `requested` (nunca filtra), para poder cruzar pelo índice com a lista
 * original. `state: null` quando a proposta não tem nenhuma linha desse trabalho, ou quando o próprio trabalho
 * pedido não tem um módulo correspondente no orçamento guiado (não deveria acontecer; os sete trabalhos do
 * pedido têm todos um módulo — ver `WORKS` — mas não se assume isso aqui).
 *
 * Um trabalho pode ter mais do que uma linha (zonas diferentes, cada uma com o seu estado, como em
 * `budgetIssues`) — conta o melhor estado encontrado (base > opcional > a confirmar > não incluído, a ordem de
 * `WORK_STATES`): se a proposta inclui o trabalho nalguma zona, isso é o que importa para "cobre ou não o
 * pedido", mesmo que outra zona o exclua.
 */
export function requestedCoverage(
  requested: DesiredWork[],
  lines: { trabalho?: string | null; inclusao: Inclusion }[],
): Array<{ work: DesiredWork; label: string; state: WorkState | null }> {
  return requested.map((w) => {
    const def = workForRequested(w);
    if (!def) return { work: w, label: DESIRED_WORK_LABELS[w], state: null };
    const states = lines.filter((l) => l.trabalho === def.code).map((l) => inclusionToState(l.inclusao));
    const best = WORK_STATES.find((s) => states.includes(s)) ?? null;
    return { work: w, label: def.label, state: best };
  });
}

export interface Zone {
  id: string;
  label: string;
  /** Área em centésimos de m². */
  area: number;
}

export interface WorkItem {
  /** `codigo` ou `codigo#2` quando há mais do que uma versão do mesmo trabalho. */
  key: string;
  code: string;
  estado: WorkState;
  zonas: 'todas' | string[];
  campos: Record<string, string>;
  /** Quantidade escrita pelo pintor (m², m); vazia nos valores globais. */
  quantidade: string;
  notas: string;
}

const KEY = /^[a-z_]+(#[2-9])?$/;
const qtyText = (h: number) => (h / 100).toLocaleString('pt-PT', { maximumFractionDigits: 2 });
const parseQty = (s: string): number | null => {
  const v = parseHundredths(s);
  return v === null || Number.isNaN(v) || v <= 0 ? null : v;
};

/** Área das zonas escolhidas, em m², para pré-preencher a quantidade (o pintor confirma ou ajusta). */
export function suggestedQuantity(def: WorkDef, zonas: WorkItem['zonas'], zones: Zone[]): string {
  if (def.unit !== 'm2') return '';
  const chosen = zonas === 'todas' ? zones : zones.filter((z) => zonas.includes(z.id));
  const total = chosen.reduce((n, z) => n + z.area, 0);
  return total > 0 ? String(total / 100).replace('.', ',') : '';
}

export function isComplete(item: WorkItem, zones: Zone[]): boolean {
  const def = workDef(item.code);
  if (!def) return false;
  if (item.estado === 'nao_incluido' || item.estado === 'confirmar') return item.notas.trim().length > 0;
  if (def.where && zones.length > 0 && item.zonas !== 'todas' && item.zonas.length === 0) return false;
  if (def.qtyLabel && parseQty(item.quantidade) === null) return false;
  return def.fields.every((f) => !f.required || (item.campos[f.key] ?? '').trim().length > 0);
}

export function zoneText(zonas: WorkItem['zonas'], zones: Zone[]): string {
  if (zonas === 'todas') return zones.length > 1 ? 'Todas as fachadas' : (zones[0]?.label ?? 'Obra toda');
  return zones.filter((z) => zonas.includes(z.id)).map((z) => z.label).join(', ');
}

/** Descrição que o cliente lê, gerada dos campos: o pintor não a reescreve. */
export function describeItem(item: WorkItem, zones: Zone[]): string {
  const def = workDef(item.code);
  if (!def) return item.code;
  const parts: string[] = [def.label];
  if (def.where) parts.push(zoneText(item.zonas, zones) || 'Zonas por indicar');
  if (def.qtyLabel) {
    const q = parseQty(item.quantidade);
    parts.push(q ? `${qtyText(q)} ${def.unit === 'ml' ? 'm' : 'm²'}` : 'quantidade por confirmar');
  }
  for (const f of def.fields) {
    const v = (item.campos[f.key] ?? '').trim();
    if (!v) continue;
    const eq = f.kind === 'text' && item.campos[equivalentFlag(f.key)] === 'sim' ? ` ${EQUIVALENT_LABEL}` : '';
    parts.push(f.key === 'demaos' ? `${v} ${v === '1' ? 'demão' : 'demãos'}` : `${f.prefix ? `${f.prefix}: ` : ''}${v}${eq}${f.kind === 'number' && f.suffix ? ` ${f.suffix}` : ''}`);
  }
  if (item.notas.trim()) parts.push(item.notas.trim());
  return parts.join(' · ').slice(0, 500);
}

export function parseWorkItems(raw: unknown, zones: Zone[]): { items?: WorkItem[]; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(raw) || raw.length > 40) return { errors: ['Dados inválidos.'] };
  const ids = new Set(zones.map((z) => z.id));
  const seen = new Set<string>();
  const items: WorkItem[] = [];
  for (const r of raw) {
    const o = (r ?? {}) as Record<string, unknown>;
    const key = String(o.key ?? '');
    const code = String(o.code ?? '');
    const def = workDef(code);
    if (!def || !KEY.test(key) || key.split('#')[0] !== code || seen.has(key)) {
      errors.push('Trabalho inválido ou repetido.');
      continue;
    }
    seen.add(key);
    const estado = String(o.estado ?? 'base');
    if (!(WORK_STATES as readonly string[]).includes(estado)) errors.push(`${def.label}: estado inválido.`);
    let zonas: WorkItem['zonas'] = 'todas';
    if (o.zonas !== 'todas') {
      if (!Array.isArray(o.zonas) || o.zonas.some((z) => typeof z !== 'string' || !ids.has(z))) errors.push(`${def.label}: zona inválida.`);
      else zonas = [...new Set(o.zonas as string[])];
    }
    const campos: Record<string, string> = {};
    const rc = (o.campos ?? {}) as Record<string, unknown>;
    for (const f of def.fields) {
      const v = String(rc[f.key] ?? '').trim().slice(0, 200);
      if (f.kind === 'select' && v && !(f.options ?? []).includes(v)) errors.push(`${def.label}: ${f.label} inválido.`);
      if (f.kind === 'number' && v && !/^\d{1,4}([.,]\d{1,2})?$/.test(v)) errors.push(`${def.label}: ${f.label} tem de ser um número.`);
      if (f.key === 'demaos' && v && !(Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 5)) errors.push(`${def.label}: demãos entre 1 e 5.`);
      if (v) campos[f.key] = v;
      if (v && f.kind === 'text' && rc[equivalentFlag(f.key)] === 'sim') campos[equivalentFlag(f.key)] = 'sim';
    }
    const quantidade = String(o.quantidade ?? '').trim().slice(0, 12);
    if (quantidade && parseQty(quantidade) === null) errors.push(`${def.label}: quantidade inválida.`);
    items.push({ key, code, estado: estado as WorkState, zonas, campos, quantidade, notas: String(o.notas ?? '').trim().slice(0, 300) });
  }
  return errors.length ? { errors } : { items, errors };
}

export interface WorkLine {
  key: string;
  trabalho: string;
  categoria: LineCategory;
  descricao: string;
  quantidade: number;
  unidade: Unit;
  precoUnitario: number;
  inclusao: Inclusion;
  zonas: string[];
  produto: string | null;
  demaos: number | null;
}

/** Linhas de preço geradas dos trabalhos. `prices`: € por unidade (ou valor global do trabalho), em cêntimos, por chave. */
export function linesFromItems(items: WorkItem[], prices: Record<string, number>, zones: Zone[], globalMode: boolean): WorkLine[] {
  return items.map((i) => {
    const def = workDef(i.code)!;
    const qty = def.qtyLabel ? parseQty(i.quantidade) : null;
    const priced = !globalMode && (i.estado === 'base' || i.estado === 'opcional' || i.estado === 'confirmar');
    const demaos = Number(i.campos.demaos);
    return {
      key: i.key,
      trabalho: i.code,
      categoria: def.categoria,
      descricao: describeItem(i, zones),
      quantidade: qty ?? 100,
      unidade: def.unit,
      precoUnitario: priced ? Math.max(0, Math.round(prices[i.key] ?? 0)) : 0,
      inclusao: STATE_TO_INCLUSION[i.estado],
      zonas: def.where ? (i.zonas === 'todas' ? zones.map((z) => z.id) : i.zonas) : [],
      produto: (i.campos.produto || i.campos.rede || i.campos.material || null)?.slice(0, 200) ?? null,
      demaos: Number.isInteger(demaos) && demaos >= 1 && demaos <= 5 ? demaos : null,
    };
  });
}

/** Pendências do orçamento, antes de enviar. Vazio = sem pendências. */
export function budgetIssues(p: {
  items: WorkItem[];
  prices: Record<string, number>;
  globalMode: boolean;
  zones: Zone[];
  /** Trabalhos que o cliente pediu. */
  requested: DesiredWork[];
}): string[] {
  const out: string[] = [];
  for (const i of p.items) {
    const def = workDef(i.code)!;
    const name = def.label + (i.key.includes('#') ? ` (${i.key.split('#')[1]})` : '');
    if (!isComplete(i, p.zones)) out.push(`${name}: faltam dados.`);
    else if (!p.globalMode && (i.estado === 'base' || i.estado === 'opcional') && !((p.prices[i.key] ?? 0) > 0)) out.push(`${name}: falta o preço.`);
  }
  for (const w of p.requested) {
    const def = workForRequested(w);
    if (!def) continue;
    const mine = p.items.filter((i) => i.code === def.code);
    if (mine.length === 0) out.push(`${def.label}: o cliente pediu este trabalho e a proposta não diz se o inclui.`);
    else if (mine.every((i) => i.estado === 'nao_incluido' && i.notas.trim() === '')) out.push(`${def.label}: justificar porque não está incluído.`);
  }
  return out;
}

/** Reconstrói os trabalhos guardados nas linhas (campo `detalhes`), pela ordem em que foram guardados. */
export function itemsFromLines(rows: { trabalho: string | null; detalhes: unknown }[]): WorkItem[] {
  const out: { ordem: number; item: WorkItem }[] = [];
  for (const r of rows) {
    if (!r.trabalho || r.trabalho === 'global' || !workDef(r.trabalho)) continue;
    const d = (r.detalhes ?? {}) as Record<string, unknown>;
    const estado = (WORK_STATES as readonly string[]).includes(String(d.estado)) ? (d.estado as WorkState) : 'base';
    out.push({
      ordem: typeof d.ordem === 'number' ? d.ordem : 999,
      item: {
        key: String(d.key ?? r.trabalho),
        code: r.trabalho,
        estado,
        zonas: d.zonas === 'todas' || !Array.isArray(d.zonas) ? 'todas' : (d.zonas as string[]),
        campos: (d.campos ?? {}) as Record<string, string>,
        quantidade: String(d.quantidade ?? ''),
        notas: String(d.notas ?? ''),
      },
    });
  }
  return out.sort((a, b) => a.ordem - b.ordem).map((x) => x.item);
}

// --- Sugestões de produtos do catálogo de referência, só os que servem ao trabalho --------------

export interface CatalogueProduct {
  id: string;
  marca: string;
  nome: string;
  tipo: string;
  uso: string | null;
  descricao: string | null;
  acabamento: string | null;
  rendimento_m2_l: number | null;
  preco_referencia_cents: number | null;
  preco_embalagem_l: number | null;
}

/**
 * Produtos do catálogo adequados a um campo de produto de um trabalho. Respeita o uso (interior ou exterior)
 * do pedido: numa fachada não se sugere uma tinta só de interior. Vazio = não há sugestões para este campo.
 */
export function productSuggestions(code: string, fieldKey: string, tipoObra: string | null, products: CatalogueProduct[]): CatalogueProduct[] {
  const useOk = (p: CatalogueProduct) => {
    if (tipoObra === 'interior') return p.uso === null || p.uso === 'interior' || p.uso === 'ambos';
    if (tipoObra === 'fachadas' || tipoObra === 'moradia' || tipoObra === 'muros') return p.uso === null || p.uso === 'exterior' || p.uso === 'ambos';
    return true;
  };
  const text = (p: CatalogueProduct) => `${p.nome} ${p.descricao ?? ''}`.toLowerCase();
  const repair = (p: CatalogueProduct) => p.tipo === 'outro' || p.tipo === 'massa_reparacao';
  const rules: Record<string, (p: CatalogueProduct) => boolean> = {
    'primario/produto': (p) => p.tipo === 'primario',
    'pintura_final/produto': (p) => p.tipo === 'tinta_exterior' || p.tipo === 'tinta_interior',
    'impermeabilizacao/produto': (p) => p.tipo === 'impermeabilizante',
    'humidade/produto': (p) => p.tipo === 'impermeabilizante' || /humidade|isolante|fungos/.test(text(p)),
    'metais_madeiras/produto': (p) => p.tipo === 'esmalte' || (p.tipo === 'primario' && /metal|madeira/.test(text(p))),
    'fissuras/produto': (p) => p.tipo === 'massa_reparacao' || /fissur/.test(text(p)),
    'rebocos/produto': (p) => repair(p) && /argamassa|reboco|massa/.test(text(p)),
    'rede_barramento/argamassa': (p) => repair(p) && /argamassa|barramento|massa/.test(text(p)),
    'lavagem/produto': (p) => /fungos|algas|antifung/.test(text(p)),
  };
  const rule = rules[`${code}/${fieldKey}`];
  if (!rule) return [];
  return products.filter((p) => rule(p) && useOk(p));
}
