import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { EstadoDaSeccao, SeccaoId } from '@/domain/seccoes';

// O vitest compila o JSX dos componentes no modo clássico (`React.createElement`); o Next usa o
// automático. Para renderizar um componente da aplicação aqui, o `React` tem de existir antes de o importar.
(globalThis as { React?: typeof React }).React = React;
const { mostrarSo, PedidoEmSeccoes } = await import('./PedidoEmSeccoes');
const { createElement } = React;

// O promotor viu (05/11/2026) o «Resumo do pedido» e o «Publicar» por baixo das «Medidas e
// fotografias»: os passos escondidos tinham o atributo `hidden` e a classe `grid`, e no Tailwind 3.4 a
// classe vence a regra `[hidden]` do preflight. Um passo escondido só pode levar a classe `hidden`.

const estados = Object.fromEntries(
  (['pretende', 'preferencias', 'zonas', 'fotografias', 'resumo', 'publicar'] as SeccaoId[]).map((s) => [s, 'por_preencher']),
) as Record<SeccaoId, EstadoDaSeccao>;

const passos = (inicial: SeccaoId) => {
  const html = renderToStaticMarkup(
    createElement(PedidoEmSeccoes, {
      estados,
      inicial,
      formulario: createElement('p', null, 'FORMULARIO'),
      slots: {
        zonas: createElement('p', null, 'ZONAS'),
        fotografias: createElement('p', null, 'FOTOS'),
        resumo: createElement('p', null, 'RESUMO'),
        publicar: createElement('p', null, 'PUBLICAR'),
      },
    }),
  );
  // As classes do contentor de cada passo: o primeiro `<div` com `hidden` ou com a grelha a seguir ao conteúdo.
  const contentor = (marca: string) => {
    const i = html.indexOf(marca);
    const abre = html.lastIndexOf('<div', html.lastIndexOf('<section', i));
    return html.slice(abre, html.indexOf('>', abre) + 1);
  };
  return { medidas: contentor('ZONAS'), rever: contentor('RESUMO') };
};

describe('PedidoEmSeccoes: um passo escondido não aparece', () => {
  it('no passo 1, os passos 2 e 3 levam a classe `hidden` e não `grid`', () => {
    const { medidas, rever } = passos('pretende');
    for (const div of [medidas, rever]) {
      expect(div).toMatch(/class="hidden"/);
      expect(div).not.toMatch(/\bgrid\b/);
    }
  });

  it('no passo 2, só as medidas e fotografias estão à vista; o resumo e o publicar não', () => {
    const { medidas, rever } = passos('zonas');
    expect(medidas).toMatch(/class="grid /);
    expect(medidas).not.toMatch(/\bhidden\b/);
    expect(rever).toMatch(/class="hidden"/);
  });

  it('no passo 3, ao contrário', () => {
    const { medidas, rever } = passos('resumo');
    expect(rever).toMatch(/class="grid /);
    expect(medidas).toMatch(/class="hidden"/);
  });

  it('mostrarSo: visível dá as classes, escondido dá só `hidden`', () => {
    expect(mostrarSo(true, 'grid gap-6')).toBe('grid gap-6');
    expect(mostrarSo(false, 'grid gap-6')).toBe('hidden');
  });
});
