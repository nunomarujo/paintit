import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

// O vitest compila o JSX no modo clássico; o `React` tem de existir antes de importar o componente.
(globalThis as { React?: typeof React }).React = React;
const { HojeAvaliacoes } = await import('./HojeAvaliacoes');

const visivel = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const render = (situacao: { inscrito: boolean; zonasDefinidas: boolean; responsavel: boolean; whatsappLigado: boolean }) =>
  visivel(
    renderToStaticMarkup(
      React.createElement(HojeAvaliacoes, {
        estado: { emCurso: [], concluidos: [], oportunidades: 0, comissoesDisponiveis: 0, avaliador: { userId: 'u1', situacao } },
        agoraIso: '2026-11-06T10:00:00Z',
      }),
    ),
  );

describe('Hoje — topo do avaliador (06/11/2026)', () => {
  it('sem inscrição nem zonas: a lista do que falta, sem valores', () => {
    const t = render({ inscrito: false, zonasDefinidas: false, responsavel: true, whatsappLigado: false });
    expect(t).toContain('Para começar a receber levantamentos');
    expect(t).toContain('Faltam 2 passos.');
    expect(t).toContain('Fazer a inscrição');
    expect(t).toContain('Escolher os concelhos');
    expect(t).toContain('Recomendado');
    expect(t).toContain('Inscreva o seu telemóvel para receber por WhatsApp');
    expect(t).not.toContain('Quanto pode ganhar');
    expect(t).not.toMatch(/2,7%|1\s?215/);
  });

  it('quem não é responsável vê que as zonas são do responsável, sem botão', () => {
    const t = render({ inscrito: true, zonasDefinidas: false, responsavel: false, whatsappLigado: false });
    expect(t).toContain('Falta um passo.');
    expect(t).toContain('Quem os escolhe é o responsável da empresa');
    expect(t).not.toContain('Escolher os concelhos');
  });

  it('com inscrição e zonas: quanto pode ganhar, e o WhatsApp como recomendação', () => {
    const t = render({ inscrito: true, zonasDefinidas: true, responsavel: false, whatsappLigado: false });
    expect(t).toContain('Quanto pode ganhar');
    expect(t).toMatch(/450\s€ a 1\s215\s€/);
    expect(t).toContain('Entre 1% e 2,7% do valor adjudicado');
    expect(t).toContain('Ligar os avisos');
    expect(t).not.toContain('Para começar a receber levantamentos');
  });

  it('com o WhatsApp ligado, a recomendação desaparece', () => {
    const t = render({ inscrito: true, zonasDefinidas: true, responsavel: true, whatsappLigado: true });
    expect(t).toContain('Quanto pode ganhar');
    expect(t).not.toContain('Inscreva o seu telemóvel');
  });
});
