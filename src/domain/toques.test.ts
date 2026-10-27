import { describe, expect, it } from 'vitest';
import {
  chaveDoToque,
  ehEmail,
  fimDaJanela,
  toquesDevidos,
  toquesDoOrcamento,
  type OrcamentoParaToque,
  type PedidoParaToque,
} from './toques';

const pedido: PedidoParaToque = { requestId: 'r1', prazo: '2026-11-10', aberto: true, propostas: 2 };
const nada = new Set<string>();
const tipos = (hoje: string, p: PedidoParaToque = pedido, ja = nada) =>
  toquesDevidos(p, hoje, ja).map((t) => `${t.tipo}/${t.destinatario}`);

describe('toquesDevidos', () => {
  it('antes do fim do prazo não se toca a ninguém', () => {
    expect(tipos('2026-11-10')).toEqual([]);
  });

  it('no dia da abertura avisa os dois lados', () => {
    expect(tipos('2026-11-11')).toEqual(['janela_abriu/cliente', 'janela_abriu/pintor']);
  });

  it('um dia de folga: a tarefa pode falhar um dia e o aviso ainda sai', () => {
    expect(tipos('2026-11-12')).toEqual(['janela_abriu/cliente', 'janela_abriu/pintor']);
    expect(tipos('2026-11-13')).not.toContain('janela_abriu/cliente');
  });

  it('no último dia da janela avisa o cliente, que é quem tem de perguntar', () => {
    expect(tipos('2026-11-13')).toEqual(['janela_acaba/cliente']);
    expect(tipos('2026-11-14')).toEqual(['janela_acaba/cliente']);
    expect(tipos('2026-11-15')).toEqual([]);
  });

  it('o que já foi enviado não volta a sair', () => {
    const ja = new Set([chaveDoToque({ tipo: 'janela_abriu', alvo: 'r1', destinatario: 'cliente' })]);
    expect(tipos('2026-11-11', pedido, ja)).toEqual(['janela_abriu/pintor']);
  });

  it('sem propostas não há janela nenhuma para anunciar', () => {
    expect(tipos('2026-11-11', { ...pedido, propostas: 0 })).toEqual([]);
  });

  it('o anúncio encerrado entrega já, e a janela conta-se na mesma a partir do prazo', () => {
    // Encerrar mais cedo entrega o que houver; a janela mantém as datas do prazo publicado, para o
    // pintor não ser apanhado por um fim que mudou sem ele saber.
    expect(tipos('2026-11-11', { ...pedido, aberto: false })).toEqual(['janela_abriu/cliente', 'janela_abriu/pintor']);
  });

  it('sem prazo não há toques', () => {
    expect(tipos('2026-11-11', { ...pedido, prazo: null })).toEqual([]);
  });

  it('o fim da janela são três dias depois do prazo', () => {
    expect(fimDaJanela('2026-11-10')).toBe('2026-11-13');
  });
});

describe('toquesDoOrcamento', () => {
  const base: OrcamentoParaToque = {
    quoteId: 'q1',
    enviadoEm: '2026-11-02',
    estado: 'enviado',
    seguimento: true,
    temEmail: true,
  };
  const t = (hoje: string, over: Partial<OrcamentoParaToque> = {}, ja = new Set<string>()) =>
    toquesDoOrcamento({ ...base, ...over }, hoje, ja).map((x) => x.tipo);

  it('toca ao 3.º, ao 10.º e ao 20.º dia, e mais nada', () => {
    expect(t('2026-11-04')).toEqual([]);
    expect(t('2026-11-05')).toEqual(['orcamento_1']);
    expect(t('2026-11-12')).toEqual(['orcamento_2']);
    expect(t('2026-11-22')).toEqual(['orcamento_3']);
    expect(t('2026-12-02')).toEqual([]);
  });

  it('são três e nunca mais: não há quarto toque', () => {
    const dias = ['2026-11-05', '2026-11-12', '2026-11-22'];
    const todos = dias.flatMap((d) => t(d));
    expect(new Set(todos).size).toBe(3);
  });

  it('cala-se assim que o orçamento é ganho ou perdido', () => {
    expect(t('2026-11-05', { estado: 'ganho' })).toEqual([]);
    expect(t('2026-11-05', { estado: 'perdido' })).toEqual([]);
    expect(t('2026-11-05', { estado: 'rascunho' })).toEqual([]);
  });

  it('não escreve a ninguém sem o pintor autorizar', () => {
    expect(t('2026-11-05', { seguimento: false })).toEqual([]);
  });

  it('nem quando o contacto do cliente não é um email', () => {
    expect(t('2026-11-05', { temEmail: false })).toEqual([]);
  });

  it('o que já saiu não volta a sair', () => {
    const ja = new Set([chaveDoToque({ tipo: 'orcamento_1', alvo: 'q1', destinatario: 'cliente_do_pintor' })]);
    expect(t('2026-11-05', {}, ja)).toEqual([]);
  });
});

describe('ehEmail', () => {
  it('aceita um email e recusa tudo o resto, que o campo é livre', () => {
    expect(ehEmail('ana@exemplo.pt')).toBe(true);
    expect(ehEmail('  ana@exemplo.pt  ')).toBe(true);
    expect(ehEmail('912 345 678')).toBe(false);
    expect(ehEmail('a filha, 96...')).toBe(false);
    expect(ehEmail('ana@exemplo')).toBe(false);
    expect(ehEmail(null)).toBe(false);
  });
});
