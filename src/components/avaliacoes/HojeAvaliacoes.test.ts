import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

// O vitest compila o JSX no modo clássico; o `React` tem de existir antes de importar o componente.
(globalThis as { React?: typeof React }).React = React;
const { HojeAvaliacoes } = await import('./HojeAvaliacoes');

const visivel = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

type Cob = { todoOPais: boolean; concelhos: string[] } | null;
const render = (
  situacao: { inscrito: boolean; zonasDefinidas: boolean; responsavel: boolean; whatsappLigado: boolean; zonaDaMorada?: string | null },
  cobertura: Cob = null,
  concelhoDaEmpresa: string | null = null,
) =>
  visivel(
    renderToStaticMarkup(
      React.createElement(HojeAvaliacoes, {
        estado: { emCurso: [], concluidos: [], oportunidades: 0, comissoesDisponiveis: 0, cobertura, concelhoDaEmpresa, avaliador: { userId: 'u1', situacao } },
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

  it('a pílula da presença: sem concelhos não diz «todo o país»; só o diz quando marcado', () => {
    const s = { inscrito: true, zonasDefinidas: false, responsavel: true, whatsappLigado: true };
    expect(render(s, null)).toContain('Sem concelhos escolhidos');
    expect(render(s, null)).not.toContain('todo o país');
    expect(render(s, { todoOPais: false, concelhos: [] })).toContain('Sem concelhos escolhidos');
    expect(render({ ...s, zonasDefinidas: true }, { todoOPais: true, concelhos: [] })).toContain('Disponível · todo o país');
    expect(render({ ...s, zonasDefinidas: true }, { todoOPais: false, concelhos: ['Lisboa', 'Oeiras'] })).toContain('Disponível · 2 concelhos cobertos');
  });

  it('sem concelhos escolhidos vale a morada da empresa, e o ecrã diz qual (06/11/2026)', () => {
    const t = render({ inscrito: true, zonasDefinidas: true, responsavel: true, whatsappLigado: true, zonaDaMorada: 'Viana do Castelo' }, null, 'Viana do Castelo');
    expect(t).toContain('Disponível · Viana do Castelo (morada da empresa)');
    expect(t).toContain('Os levantamentos chegam de Viana do Castelo, o concelho da morada da empresa.');
    expect(t).toContain('Escolher outros concelhos');
  });
});
