import { describe, expect, it } from 'vitest';
import { documentosACaducar, prazosAFechar, type PedidoAberto } from './hojeDoPintor';

const hoje = '2026-11-06';
const pedido = (id: string, prazo: string): PedidoAberto => ({
  request_id: id,
  ref: `QP-${id}`,
  concelho: 'Porto',
  tipo_obra: 'fachada',
  area_total_cm2: 100000,
  prazo_propostas: prazo,
});

describe('prazosAFechar', () => {
  it('ordena pelo prazo e põe o rascunho à frente a igualdade', () => {
    const r = prazosAFechar(
      [pedido('a', '2026-11-09'), pedido('b', '2026-11-08'), pedido('c', '2026-11-08')],
      [{ request_id: 'c', status: 'rascunho' }],
      hoje,
    );
    expect(r.linhas.map((l) => l.requestId)).toEqual(['c', 'b', 'a']);
    expect(r.linhas[0]).toMatchObject({ estado: 'rascunho', dias: 2 });
  });

  it('esconde o que já foi enviado, escolhido ou retirado', () => {
    const r = prazosAFechar(
      [pedido('a', '2026-11-07'), pedido('b', '2026-11-07'), pedido('c', '2026-11-07'), pedido('d', '2026-11-07')],
      [
        { request_id: 'a', status: 'submetida' },
        { request_id: 'b', status: 'selecionada' },
        { request_id: 'c', status: 'retirada' },
      ],
      hoje,
    );
    expect(r.linhas.map((l) => l.requestId)).toEqual(['d']);
  });

  it('só mostra a janela, mas conta todos os pedidos abertos por propor', () => {
    const r = prazosAFechar([pedido('a', '2026-11-08'), pedido('b', '2026-11-20')], [], hoje);
    expect(r.linhas.map((l) => l.requestId)).toEqual(['a']);
    expect(r.porPropor).toBe(2);
  });

  it('o último dia ainda conta (0 dias) e o dia seguinte ao prazo já não', () => {
    const r = prazosAFechar([pedido('a', hoje), pedido('b', '2026-11-05')], [], hoje);
    expect(r.linhas.map((l) => [l.requestId, l.nivel])).toEqual([['a', 'hoje']]);
  });

  it('respeita o limite de linhas', () => {
    const muitos = Array.from({ length: 9 }, (_, i) => pedido(String(i), '2026-11-08'));
    expect(prazosAFechar(muitos, [], hoje, { limite: 3 }).linhas).toHaveLength(3);
  });
});

describe('documentosACaducar', () => {
  it('lista só os aprovados com validade dentro da janela, o mais urgente primeiro', () => {
    const r = documentosACaducar(
      [
        { kind: 'seguro_acidentes_trabalho', status: 'aprovado', valido_ate: '2026-11-18' },
        { kind: 'alvara_impic', status: 'aprovado', valido_ate: '2027-06-01' },
        { kind: 'certificado_impic', status: 'aprovado', valido_ate: '2026-11-01' },
        { kind: 'outro', status: 'rejeitado', valido_ate: '2026-11-10' },
        { kind: 'certidao_permanente', status: 'aprovado', valido_ate: null },
      ],
      hoje,
    );
    expect(r).toEqual([
      { kind: 'certificado_impic', dias: -5 },
      { kind: 'seguro_acidentes_trabalho', dias: 12 },
    ]);
  });
});
