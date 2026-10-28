import { describe, expect, it } from 'vitest';
import { LETRAS_MINIMAS, sugestoesDeProduto, type ProdutoSugerivel } from './produtoSugerido';

const obra: ProdutoSugerivel[] = [
  { label: 'CIN Vinylmatt (520)', tipo: 'tinta_interior', origem: 'obra', detalhe: 'Mate · 15 L' },
  { label: 'Barbot Acryl Plus VG (1279)', tipo: 'tinta_exterior', origem: 'obra', detalhe: 'Mate · 15 L' },
];
const catalogo: ProdutoSugerivel[] = [
  { label: 'Robbialac Vinylmatt Premium', tipo: 'tinta_interior', origem: 'catalogo', detalhe: 'Acetinado · 5 L' },
  { label: 'Dyrup Isolante Universal', tipo: 'primario', origem: 'catalogo', detalhe: null },
  { label: 'Sikkens Esmalte Aquoso', tipo: 'esmalte', origem: 'catalogo', detalhe: null },
  { label: 'CIN Vinylmatt (520)', tipo: 'tinta_interior', origem: 'catalogo', detalhe: 'Mate · 15 L' },
];
const todos = [...obra, ...catalogo];

describe('o que se sugere enquanto o pintor escreve', () => {
  it('com o campo vazio, só o que esta obra já previu — é o atalho que poupa o tempo todo', () => {
    const s = sugestoesDeProduto('', todos);
    expect(s.map((x) => x.label)).toEqual(['CIN Vinylmatt (520)', 'Barbot Acryl Plus VG (1279)']);
  });

  it('uma só letra ainda não abre o catálogo', () => {
    // Senão a lista salta à frente de quem ainda está a pensar.
    expect(LETRAS_MINIMAS).toBe(2);
    const s = sugestoesDeProduto('v', todos);
    expect(s.every((x) => x.origem === 'obra')).toBe(true);
  });

  it('a partir de duas letras entra o catálogo, mas a obra fica à frente', () => {
    const s = sugestoesDeProduto('vinyl', todos);
    expect(s[0]!.label).toBe('CIN Vinylmatt (520)');
    expect(s.map((x) => x.origem)).toEqual(['obra', 'catalogo']);
  });

  it('o mesmo produto não aparece duas vezes por estar nos dois sítios', () => {
    const s = sugestoesDeProduto('vinylmatt', todos);
    expect(s.filter((x) => x.label === 'CIN Vinylmatt (520)')).toHaveLength(1);
  });

  it('encontra sem acentos e pela gíria do catálogo', () => {
    expect(sugestoesDeProduto('primario', todos).map((x) => x.label)).toContain('Dyrup Isolante Universal');
    expect(sugestoesDeProduto('esmalte', todos).map((x) => x.label)).toContain('Sikkens Esmalte Aquoso');
  });

  it('escrito por inteiro, a lista fecha-se — é esse o sinal de que ficou igual ao catálogo', () => {
    expect(sugestoesDeProduto('CIN Vinylmatt (520)', todos).map((x) => x.label)).not.toContain('CIN Vinylmatt (520)');
  });

  it('o que não existe no catálogo não inventa nada, e o texto livre fica de pé', () => {
    expect(sugestoesDeProduto('cal hidráulica da quinta', todos)).toEqual([]);
  });

  it('nunca passa do máximo pedido', () => {
    expect(sugestoesDeProduto('a', todos, 1)).toHaveLength(1);
    expect(sugestoesDeProduto('', todos, 1)).toHaveLength(1);
  });

  it('uma obra sem produtos orçamentados não deixa o campo sem ajuda', () => {
    const s = sugestoesDeProduto('vinyl', catalogo);
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((x) => x.origem === 'catalogo')).toBe(true);
  });
});
