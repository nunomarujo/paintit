import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { buildingVolume } from '@/domain/volume';
import { entradaDoVolume, numerarZonas, lugaresDasZonas, type ZonaParaDesenho } from '@/domain/prancheta';

// As ações do servidor não existem aqui: os cartões só as importam.
vi.mock('@/app/app/pedidos/actions', () => ({
  addSurface: vi.fn(),
  deleteSurface: vi.fn(),
  setParticipacaoDaZona: vi.fn(),
  updateSurface: vi.fn(),
}));
(globalThis as { React?: typeof React }).React = React;
const { MiniaturaDoLado } = await import('./PlantaDoPredio');
const { FRASE_DA_OCULTACAO } = await import('./ZonasDoPedido');
const { QuadroDasZonas } = await import('./Prancheta');

describe('a miniatura do lado do prédio', () => {
  it('destaca o lado escolhido e só esse, e marca os ocupados', () => {
    const html = renderToStaticMarkup(React.createElement(MiniaturaDoLado, { forma: 'U', lado: 'tras-2', ocupados: ['frente'] }));
    expect(html).toContain('data-lado="tras-2"');
    expect((html.match(/stroke-tinta-600/g) ?? []).length).toBe(1);
    expect((html.match(/stroke-slate-600/g) ?? []).length).toBe(1);
    // Os oito lados de um U: um destacado, um ocupado, seis livres.
    expect((html.match(/<line /g) ?? []).length).toBe(8);
  });

  it('sem lado escolhido nada se destaca', () => {
    const html = renderToStaticMarkup(React.createElement(MiniaturaDoLado, { forma: 'L', lado: null }));
    expect(html).not.toContain('stroke-tinta-600');
  });
});

describe('as frases de uma zona sem número', () => {
  it('atrás, de lado e tapada dizem coisas diferentes', () => {
    expect(new Set(Object.values(FRASE_DA_OCULTACAO)).size).toBe(3);
    expect(FRASE_DA_OCULTACAO.de_lado).toBe('De lado, nesta vista.');
  });
});

describe('o quadro das zonas', () => {
  const zonas: ZonaParaDesenho[] = [
    { id: 'a', kind: 'fachada', participacao: 'incluida', face: null, descricao: 'Fachada principal' },
    { id: 'b', kind: 'fachada', participacao: 'incluida', face: null, descricao: 'Tardoz' },
  ];
  const predio = { pisos: 4, fachadas: 2, temVarandas: false, moradia: false, forma: 'I' as const };
  const volumeEm = (a: number) => buildingVolume(entradaDoVolume(predio, zonas, null, a));
  const naLista = zonas.map((z) => ({
    id: z.id,
    kind: z.kind,
    descricao: z.descricao ?? null,
    areaCm2: 0,
    areaDiretaCm2: null,
    larguraCm: null,
    alturaCm: null,
    vaosCm2: null,
    quantidade: 1,
    participacao: z.participacao,
    origemDaQuantidade: null,
    confirmacao: 'por_confirmar' as const,
    trabalhos: null,
    face: null,
  }));
  const render = (angulo: number) =>
    renderToStaticMarkup(
      React.createElement(QuadroDasZonas, {
        requestId: 'r1',
        volume: volumeEm(angulo),
        volumeEm,
        rotacao: { angulo, definir: vi.fn(), ir: vi.fn(), rodar: vi.fn(), voltar: vi.fn(), aAnimar: false },
        zonas: naLista as never,
        numeracao: numerarZonas(zonas, lugaresDasZonas(volumeEm(25), zonas)),
        textos: {},
        aberta: null,
        apontada: null,
        podeEditar: true,
        aoAbrir: vi.fn(),
        aoApontar: vi.fn(),
        descricao: 'Desenho do prédio',
      }),
    );

  it('tem uma região viva, vazia ao abrir, para anunciar a vista quando a rotação pára', () => {
    const html = render(25);
    expect(html).toMatch(/<div role="status" aria-live="polite" aria-atomic="true" class="sr-only"><\/div>/);
  });

  it('os dois desenhos (lista e chamadas) trazem a marca que «Ver no desenho» usa para os encontrar', () => {
    expect(render(25)).toContain('data-desenho=""');
  });

  it('com lados por entregar à vista, a legenda di-lo; os números levam a marca para o foco', () => {
    const html = render(25);
    expect(html).toContain('A tracejado: lados do prédio sem alçado.');
    expect(html).toContain('data-pino="a"');
  });
});
