import { describe, expect, it } from 'vitest';
import { ACAO_AUTOMATICA, classificarMensagem, enderecoDe, rascunhoDeResposta, semCitacao, type Categoria } from './crmRespostas';

const cls = (texto: string, assunto = 'Re: Plano Pro grátis até 31 de janeiro', de = 'Maria <maria@pinturas.pt>') => classificarMensagem({ de, assunto, texto });

describe('classificarMensagem', () => {
  const casos: [Categoria, string][] = [
    ['interesse', 'Bom dia, tenho interesse. Podem enviar mais informação?'],
    ['interesse', 'Gostaria de saber como funciona e quanto custa.'],
    ['interesse', 'Liguem-me amanhã de manhã, por favor. 912 345 678'],
    ['interesse', 'Estamos interessados, como nos registamos?'],
    ['recusa', 'Não temos interesse, obrigado.'],
    ['recusa', 'Obrigado mas não precisamos de momento.'],
    ['desistencia', 'Por favor removam o meu email da vossa lista.'],
    ['desistencia', 'Não quero receber mais mensagens.'],
    ['desistencia', 'Unsubscribe'],
    ['desistencia', 'Isto é spam. Parem de me contactar.'],
    ['automatica', 'Estou ausente do escritório até dia 20. Volto a responder em breve.'],
    ['pergunta', 'A empresa é de Viana? Qual a morada?'],
    ['outro', 'Recebido, obrigado.'],
  ];
  it.each(casos)('%s ← «%s»', (esperada, texto) => expect(cls(texto)).toBe(esperada));

  it('um ressalto: pelo remetente ou pelo assunto', () => {
    expect(cls('A mensagem não foi entregue.', 'Mail delivery failed', 'Mail Delivery Subsystem <mailer-daemon@googlemail.com>')).toBe('ressalto');
    expect(cls('x', 'Undeliverable: Plano Pro grátis')).toBe('ressalto');
  });
  it('«não tenho interesse» é uma recusa, não interesse', () => expect(cls('Não tenho interesse.')).toBe('recusa'));
  it('um pedido para sair vence o interesse na mesma mensagem', () => {
    expect(cls('Tenho interesse mas não quero receber mais emails vossos.')).toBe('desistencia');
  });
});

describe('a nossa mensagem citada não conta', () => {
  const nossoRodape = 'Para não receber mais mensagens: https://quempinta.pt/api/crm/sair/AB12CD34\nNão quero receber mais mensagens';
  it('o rodapé citado com «>» não faz de uma resposta um pedido de saída', () => {
    expect(cls(`Tenho interesse, podem ligar?\n\n> ${nossoRodape.replace('\n', '\n> ')}`)).toBe('interesse');
  });
  it('nem a citação introduzida por «Em … escreveu:»', () => {
    expect(cls(`Recebido, obrigado.\n\nEm sex., 6 de nov. de 2026 às 10:00, Nuno <nm@quempinta.pt> escreveu:\n${nossoRodape}`)).toBe('outro');
  });
  it('nem a introduzida por «On … wrote:»', () => {
    expect(cls(`Sounds good\n\nOn Fri, Nov 6, 2026 at 10:00 AM Nuno <nm@quempinta.pt> wrote:\n${nossoRodape}`)).toBe('outro');
  });
  it('semCitacao devolve só o que a pessoa escreveu', () => {
    expect(semCitacao('Olá\n\n> citado\n> mais')).toBe('Olá');
    expect(semCitacao('Sem citação')).toBe('Sem citação');
    expect(semCitacao('Olá\n\n-----Mensagem original-----\nDe: x')).toBe('Olá');
  });
});

describe('ações automáticas e rascunhos', () => {
  it('só a lei e o bom senso se tratam sozinhos', () => {
    expect(ACAO_AUTOMATICA).toMatchObject({ desistencia: 'sair', recusa: 'parar', ressalto: 'endereco_invalido', interesse: 'nenhuma', pergunta: 'nenhuma', outro: 'nenhuma', automatica: 'nenhuma' });
  });
  it('rascunho só para interesse, com «Re:» no assunto e sem repetir', () => {
    expect(rascunhoDeResposta('pergunta', { nome: 'X', assuntoOriginal: 'a' })).toBeNull();
    expect(rascunhoDeResposta('recusa', { nome: 'X', assuntoOriginal: 'a' })).toBeNull();
    expect(rascunhoDeResposta('interesse', { nome: 'Pinturas Lima', assuntoOriginal: 'Plano Pro' })!.assunto).toBe('Re: Plano Pro');
    expect(rascunhoDeResposta('interesse', { nome: 'Pinturas Lima', assuntoOriginal: 'Re: Plano Pro' })!.assunto).toBe('Re: Plano Pro');
    expect(rascunhoDeResposta('interesse', { nome: 'Pinturas Lima', assuntoOriginal: '' })!.corpo).toContain('Pinturas Lima');
  });
  it('enderecoDe', () => {
    expect(enderecoDe('Maria Silva <Maria@Pinturas.PT>')).toBe('maria@pinturas.pt');
    expect(enderecoDe('maria@pinturas.pt')).toBe('maria@pinturas.pt');
    expect(enderecoDe('sem endereço')).toBeNull();
  });
});
