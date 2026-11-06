// Os objetivos do pedido, lidos da descrição que o cliente escreveu (promotor, 06/11/2026).
//
// As pastilhas «Renovar pintura», «Fissuras», «Humidade», «Isolamento» e «Não sei» só se acendiam com a frase
// exata que elas próprias escrevem. Quem escreve «há salitre e bolor» não as via acender. Aqui reconhecem-se
// palavras aproximadas ou relacionadas — sem acentos, sem maiúsculas, por raiz — e a pastilha aparece
// assinalada. **Não converte sintomas em soluções**: só diz que o texto fala daquilo; os trabalhos continuam a
// ser decididos depois (regra de 30/10/2026).

export const OBJECTIVOS_DO_PEDIDO = ['renovar', 'fissuras', 'humidade', 'isolamento', 'nao_sei'] as const;
export type ObjectivoDoPedido = (typeof OBJECTIVOS_DO_PEDIDO)[number];

/** Raízes, já sem acentos. Uma raiz apanha as formas da palavra («fissur» → fissura, fissuras, fissurado). */
const RAIZES: Record<ObjectivoDoPedido, string[]> = {
  renovar: ['renov', 'repint', 'pintar', 'pintura', 'pinte', 'branco', 'cor ', 'cores', 'faixa', 'manter as cores', 'mudar a cor', 'envelhecid', 'desbotad', 'sujo', 'suja', 'manchad'],
  fissuras: ['fissur', 'rach', 'fend', 'quebrad', 'partid', 'pedaco', 'descasc', 'empol', 'lascad', 'buraco', 'esboroa', 'desagreg', 'caruncho', 'reboco a cair', 'a cair'],
  humidade: ['humid', 'salitre', 'bolor', 'mofo', 'fungo', 'infiltr', 'agua', 'chuva', 'eflorescen', 'condensa', 'permeab', 'estanq', 'verdete', 'musgo'],
  isolamento: ['isola', 'capoto', 'termic', 'frio', 'calor', 'eficiencia energetica', 'conforto'],
  nao_sei: ['nao sei', 'nao sabemos', 'aconselh', 'duvida', 'nao temos a certeza', 'recomend'],
};

/** Minúsculas, sem acentos nem cedilhas, espaços simples. */
export const normalizarTexto = (t: string) =>
  ` ${t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;

/** Os objetivos de que a descrição fala. Vazio para um texto vazio. */
export function objectivosNaDescricao(descricao: string): Set<ObjectivoDoPedido> {
  const t = normalizarTexto(descricao);
  const out = new Set<ObjectivoDoPedido>();
  if (!t.trim()) return out;
  for (const o of OBJECTIVOS_DO_PEDIDO) {
    if (RAIZES[o].some((r) => t.includes(r.endsWith(' ') ? ` ${r}` : r))) out.add(o);
  }
  return out;
}
