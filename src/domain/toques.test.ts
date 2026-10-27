import { describe, expect, it } from 'vitest';
import { chaveDoToque, fimDaJanela, toquesDevidos, type PedidoParaToque } from './toques';

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
