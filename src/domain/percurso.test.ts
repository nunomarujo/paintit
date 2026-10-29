import { describe, expect, it } from 'vitest';
import {
  ETAPAS,
  ETAPAS_SEM_VISITA,
  etapaAtingida,
  etapasDoPedido,
  percursoDoPedido,
  type EntradaDoPercurso,
} from './percurso';

const p = (o: Partial<EntradaDoPercurso> = {}): EntradaDoPercurso => ({
  estadoDoPedido: 'rascunho',
  levantamento: { status: 'aberto', marcadoPara: null },
  bloqueiosDaPublicacao: 2,
  ...o,
});

describe('o percurso do pedido, e de quem é a vez', () => {
  it('com visita pedida, a vez é do profissional e as medidas não são do cliente', () => {
    const r = percursoDoPedido(p());
    expect(r.fase).toBe('visita_pedida');
    expect(r.vez).toBe('profissional');
    expect(r.tecnicoPertenceAoCliente).toBe(false);
  });

  it('o cliente com visita a caminho nunca lê que lhe faltam medidas', () => {
    // É o defeito que o promotor apontou a 29/10/2026: a aplicação promete um profissional que
    // mede, e depois bloqueia o cliente por não ter medidas.
    for (const estado of ['aberto', 'reservado'] as const) {
      const r = percursoDoPedido(p({ levantamento: { status: estado, marcadoPara: null } }));
      expect(r.tecnicoPertenceAoCliente).toBe(false);
      expect(r.explicacao.toLowerCase()).not.toContain('falta');
      expect(r.explicacao).toContain('Não precisa de indicar as medidas');
    }
  });

  it('reservado sem data não é «visita marcada»', () => {
    // «Só apresentar "Visita marcada" quando houver uma data efectivamente confirmada» (promotor).
    const r = percursoDoPedido(p({ levantamento: { status: 'reservado', marcadoPara: null } }));
    expect(r.titulo).toBe('Visita a combinar');
    expect(r.titulo).not.toContain('marcada');
  });

  it('reservado com data é «visita marcada»', () => {
    const r = percursoDoPedido(p({ levantamento: { status: 'reservado', marcadoPara: '2026-11-04T10:00:00Z' } }));
    expect(r.titulo).toBe('Visita marcada');
    expect(r.vez).toBe('profissional');
  });

  it('entregue o levantamento, a vez passa ao cliente — e o técnico passa a ser dele', () => {
    const r = percursoDoPedido(p({ levantamento: { status: 'concluido', marcadoPara: null } }));
    expect(r.fase).toBe('levantamento_entregue');
    expect(r.vez).toBe('cliente');
    expect(r.tecnicoPertenceAoCliente).toBe(true);
    // E diz-lhe que pode pedir correcções, em vez de o pôr a validar medidas que não fez.
    expect(r.explicacao).toContain('correcções');
  });

  it('sem levantamento nenhum, o pedido é do cliente e o que falta diz-se', () => {
    const r = percursoDoPedido(p({ levantamento: null }));
    expect(r.fase).toBe('a_preencher');
    expect(r.vez).toBe('cliente');
    expect(r.tecnicoPertenceAoCliente).toBe(true);
  });

  it('desistir da ajuda devolve o pedido ao cliente, e ninguém fica à espera', () => {
    for (const estado of ['cancelado', 'expirado'] as const) {
      const r = percursoDoPedido(p({ levantamento: { status: estado, marcadoPara: null } }));
      expect(r.vez).toBe('cliente');
    }
  });

  it('sem bloqueios e sem visita a caminho, está pronto a publicar', () => {
    const r = percursoDoPedido(p({ levantamento: null, bloqueiosDaPublicacao: 0 }));
    expect(r.fase).toBe('pronto_a_publicar');
    expect(r.vez).toBe('cliente');
  });

  it('a visita a caminho não torna o pedido publicável: são perguntas diferentes', () => {
    // A outra metade da regra do promotor: «não publicar automaticamente um pedido incompleto só
    // porque foi solicitada uma visita».
    const r = percursoDoPedido(p({ bloqueiosDaPublicacao: 3 }));
    expect(r.fase).not.toBe('pronto_a_publicar');
    expect(r.fase).toBe('visita_pedida');
  });

  it('publicado, a vez é dos pintores e não há nada a fazer', () => {
    const r = percursoDoPedido(p({ estadoDoPedido: 'publicado' }));
    expect(r.fase).toBe('a_receber_propostas');
    expect(r.vez).toBe('pintores');
    expect(r.tecnicoPertenceAoCliente).toBe(false);
  });

  it('publicado manda sobre o levantamento: já não interessa de quem era a vez antes', () => {
    const r = percursoDoPedido(p({ estadoDoPedido: 'publicado', levantamento: { status: 'aberto', marcadoPara: null } }));
    expect(r.fase).toBe('a_receber_propostas');
  });

  it('encerrado e cancelado não põem ninguém à espera', () => {
    for (const estado of ['encerrado', 'cancelado']) {
      const r = percursoDoPedido(p({ estadoDoPedido: estado }));
      expect(r.vez).toBe('ninguem');
      expect(r.fase).toBe('fechado');
    }
  });

  it('nenhuma explicação culpa o cliente nem usa linguagem de formulário', () => {
    const casos: EntradaDoPercurso[] = [
      p(),
      p({ levantamento: { status: 'reservado', marcadoPara: '2026-11-04T10:00:00Z' } }),
      p({ levantamento: { status: 'concluido', marcadoPara: null } }),
      p({ levantamento: null }),
      p({ levantamento: null, bloqueiosDaPublicacao: 0 }),
      p({ estadoDoPedido: 'publicado' }),
    ];
    for (const c of casos) {
      const t = `${percursoDoPedido(c).titulo} ${percursoDoPedido(c).explicacao}`.toLowerCase();
      for (const palavra of ['obrigatório', 'inválido', 'erro', 'preencha os campos', 'não pode']) {
        expect(t).not.toContain(palavra);
      }
    }
  });
});

describe('a régua das etapas', () => {
  it('as etapas são as cinco do percurso que o promotor escreveu', () => {
    expect(ETAPAS.map((e) => e.nome)).toEqual(['Pedido de visita', 'Visita', 'Levantamento', 'Revisão', 'Propostas']);
  });

  it('a régua avança com a fase, e nunca anda para trás', () => {
    const ordem = ['visita_pedida', 'visita_marcada', 'levantamento_entregue', 'pronto_a_publicar', 'a_receber_propostas'] as const;
    const pos = ordem.map((f) => etapaAtingida(f));
    expect(pos).toEqual([...pos].sort((a, b) => a - b));
    expect(new Set(pos).size).toBe(ordem.length);
  });

  it('um pedido sem visita usa a régua curta: as etapas que não vão acontecer não se mostram', () => {
    // Mostrá-las a cinzento prometia um passo que não vem, e punha o pedido a parecer atrasado
    // logo no princípio.
    expect(etapasDoPedido(false).map((e) => e.nome)).toEqual(['Levantamento', 'Revisão', 'Propostas']);
    expect(etapasDoPedido(true)).toHaveLength(5);
    expect(etapaAtingida('a_preencher', ETAPAS_SEM_VISITA)).toBe(0);
    expect(etapaAtingida('pronto_a_publicar', ETAPAS_SEM_VISITA)).toBe(1);
    expect(etapaAtingida('a_receber_propostas', ETAPAS_SEM_VISITA)).toBe(2);
  });
});
