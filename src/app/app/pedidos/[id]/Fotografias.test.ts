import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// As ações do servidor e o router do Next não existem aqui: a galeria só de leitura não os chama.
vi.mock('@/app/app/pedidos/actions', () => ({ corrigirFotografia: vi.fn(), deletePhoto: vi.fn(), enviarFotografia: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

// O vitest compila o JSX no modo clássico; o `React` tem de existir antes de importar o componente.
(globalThis as { React?: typeof React }).React = React;
const { Fotografias } = await import('./Fotografias');

/** O texto que se vê, sem as etiquetas (o que o cético leu no pedido publicado). */
const visivel = (html: string) =>
  html
    .replace(/<span class="sr-only">.*?<\/span>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('as fotografias, só de leitura (o pedido publicado)', () => {
  const html = renderToStaticMarkup(
    React.createElement(Fotografias, {
      requestId: 'r1',
      podeEditar: false,
      porZona: true,
      zonas: [{ id: 'z1', nome: 'Fachada principal', n: 1 }],
      fotografias: [
        { id: 'f1', kind: 'pormenor', legenda: 'Fissura por cima da porta', revisao: 'aprovada', notas_revisao: null, zonaId: 'z1' },
        { id: 'f2', kind: 'pormenor', legenda: 'Placa da rua', revisao: 'rejeitada', notas_revisao: 'Mostra o nome da rua', zonaId: 'z1' },
        { id: 'f3', kind: 'pormenor', legenda: 'Humidade no rés-do-chão', revisao: 'pendente', notas_revisao: null, zonaId: 'z1' },
        { id: 'f4', kind: 'geral', legenda: null, revisao: null, notas_revisao: null, zonaId: 'z1' },
      ],
    }),
  );
  const texto = visivel(html);

  it('cada fotografia de uma zona com várias mostra a sua legenda e o seu estado — nada se resume', () => {
    expect(texto).toContain('Fissura por cima da porta Pormenor, aprovada para o anúncio');
    expect(texto).toContain('Placa da rua Pormenor, não vai para o anúncio');
    expect(texto).toContain('Humidade no rés-do-chão Pormenor, à espera de revisão');
    expect(texto).toContain('Sem legenda Geral, privada');
  });

  it('a nota de uma fotografia recusada vê-se, em âmbar, ao lado dela', () => {
    expect(texto).toContain('Placa da rua Pormenor, não vai para o anúncio Mostra o nome da rua');
    expect(html).toMatch(/<p class="[^"]*text-amber-800[^"]*">Mostra o nome da rua<\/p>/);
  });

  it('só de leitura, cada miniatura abre a fotografia; não há como editar nem acrescentar', () => {
    expect(html.match(/<a href="\/app\/fotos\//g)).toHaveLength(4);
    expect(html).not.toContain('legenda e zona');
    expect(texto).not.toContain('Acrescentar');
    expect(texto).not.toContain('Adicionar fotografias');
  });
});
