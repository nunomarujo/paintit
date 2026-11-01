import { describe, expect, it } from 'vitest';
import { contarPorFicheiro, geometriaAMao } from './alvosDeToque';

/**
 * Inventário do que ainda falta corrigir — **vazio desde 01/11/2026**: os 31 botões que restavam
 * passaram para `btn-*` quando os botões viraram pílulas (um botão à mão com `rounded-lg` ficaria a
 * destoar em cada ecrã). Um ficheiro que volte a aparecer aqui reprova; a lista não cresce.
 */
const DIVIDA: Record<string, number> = {};

describe('alvos de toque: a geometria vem do sistema (regra 17)', () => {
  it('reconhece um botão feito à mão e deixa passar o do sistema', () => {
    expect(geometriaAMao('<button className="rounded-lg px-3 py-1.5">x</button>')).toHaveLength(1);
    expect(geometriaAMao('<button className="btn-primary">x</button>')).toHaveLength(0);
    expect(geometriaAMao('<Link className="inline-flex min-h-[44px] rounded-lg px-3 py-2">x</Link>')).toHaveLength(0);
    // Uma pílula não é um botão: a forma é redonda de propósito e não leva 44px.
    expect(geometriaAMao('<a className="rounded-full px-2 py-0.5">3</a>')).toHaveLength(0);
  });

  it('nenhum ficheiro novo entra na dívida, e nenhum sobe', () => {
    const atual = contarPorFicheiro('src');
    const novos = Object.keys(atual).filter((f) => !(f in DIVIDA));
    expect(novos, 'ficheiros novos com geometria à mão — usar btn-primary/secondary/quiet ou campo').toEqual([]);
    for (const [f, n] of Object.entries(atual)) {
      expect(n, `${f} subiu de ${DIVIDA[f]} para ${n}`).toBeLessThanOrEqual(DIVIDA[f]!);
    }
  });

  it('o percurso do fornecedor está limpo', () => {
    const atual = contarPorFicheiro('src');
    const doFornecedor = Object.keys(atual).filter(
      (f) =>
        f.includes('app/app/avaliacoes/') ||
        f.includes('app/app/vendas/') ||
        f.includes('app/app/encomendas/') ||
        f.includes('app/app/levantamentos/') ||
        f.includes('app/app/organizacoes/[id]/produtos/') ||
        f.includes('app/app/organizacoes/[id]/clientes/') ||
        f.includes('components/avaliacoes/') ||
        f.includes('components/vendas/'),
    );
    expect(doFornecedor).toEqual([]);
  });
});
