import { describe, expect, it } from 'vitest';
import { relatorioDoPercurso, type DadosDoRelatorio, type EventoDoRegisto } from './percursoNegocial';

const CLIENTE = 'c';
const VENCEDOR = 'v';
const PERDEDOR = 'p';
let n = 0;
const ev = (tipo: string, dados: Record<string, unknown>, o: Partial<EventoDoRegisto> = {}): EventoDoRegisto => ({
  ordem: ++n,
  tipo,
  criadoEm: `2026-11-0${Math.min(9, 1 + Math.floor(n / 3))}T10:00:00Z`,
  orgId: null,
  painterOrgId: null,
  dados,
  ...o,
});

const eventos = [
  ev('conta_aberta', {}, { orgId: CLIENTE }),
  ev('pedido_criado', { titulo: 'Fachadas', descricao: 'Pintar as fachadas.' }),
  ev('pedido_publicado', { ref: 'QP-1', prazo_propostas: '2026-11-20' }),
  ev('proposta_estado', { status: 'submetida', base_cents: 1_000_000, iva_cents: 230_000 }, { painterOrgId: PERDEDOR }),
  ev('proposta_estado', { status: 'submetida', base_cents: 900_000, iva_cents: 207_000, adiantamento_bps: 1000 }, { painterOrgId: VENCEDOR }),
  ev('comparacao', { numero_de_propostas: 2 }),
  ev('contratacao_criada', { base_cents: 900_000, advance_cents: 0, garantia_anos: 2 }, { painterOrgId: VENCEDOR }),
  ev('contratacao_evento', { kind: 'deposito_confirmado', amount_cents: 27_000 }, { painterOrgId: VENCEDOR }),
  ev('contratacao_evento', { kind: 'fee_recebido', amount_cents: 199_260 }, { painterOrgId: VENCEDOR }),
  ev('elemento_alterado', { lado: 'pintor', campo: 'iban', valor: 'PT50 ··· 9015 4', validacao: 'sem_validacao' }),
  ev('contratacao_evento', { kind: 'cliente_assinou', documentHash: 'a'.repeat(64) }, { painterOrgId: VENCEDOR }),
  ev('relatorio_pedido', { motivo: 'litigio' }),
];
const base = (destinatario: 'cliente' | 'backoffice'): DadosDoRelatorio => ({
  ref: 'QP-1',
  destinatario,
  versao: 1,
  emitidoEm: new Date('2026-11-10T10:00:00Z'),
  eventos,
  nomes: { [CLIENTE]: 'Condomínio X', [VENCEDOR]: 'Pinturas Ganhou, Lda.', [PERDEDOR]: 'Pinturas Perdeu, Lda.' },
  clienteOrgId: CLIENTE,
  vencedorOrgId: VENCEDOR,
});

describe('relatório do percurso negocial', () => {
  it('backoffice: tudo, com nomes e valores', () => {
    const t = relatorioDoPercurso(base('backoffice'));
    expect(t).toContain('Pinturas Perdeu, Lda.');
    expect(t).toContain('Comissão do pintor recebida');
    expect(t).toMatch(/1\D?992,60/);
  });

  it('cliente: sem a comissão do pintor, em nenhuma forma (regra 15)', () => {
    const t = relatorioDoPercurso(base('cliente'));
    expect(t).not.toMatch(/comiss/i);
    expect(t).not.toMatch(/1\D?992,60/);
    expect(t).toContain('Confirmação do pintor registada');
  });

  it('cliente: o pintor que não ganhou não é identificado, nem as condições dele', () => {
    const t = relatorioDoPercurso(base('cliente'));
    expect(t).not.toContain('Pinturas Perdeu');
    expect(t).toContain('Proposta de Pintor A: submetida.');
    expect(t).not.toMatch(/10\D?000,00/);
    expect(t).toContain('Pinturas Ganhou, Lda.');
    expect(t).toMatch(/Proposta de Pinturas Ganhou, Lda\.: submetida — preço sem IVA 9\D?000,00/);
  });

  it('por ordem, com as datas, e diz o que é — sem prometer valor de prova', () => {
    const t = relatorioDoPercurso(base('cliente'));
    expect(t.indexOf('Conta aberta')).toBeLessThan(t.indexOf('Pedido de orçamentos criado'));
    expect(t.indexOf('Pedido publicado')).toBeLessThan(t.indexOf('Escolhida a proposta'));
    expect(t).toContain('registo do que aconteceu na plataforma');
    expect(t).not.toMatch(/prova perante|tribunal|valor probat/i);
    expect(t).toContain('Pedido deste relatório pelo dono da obra (motivo: litígio)');
  });

  it('o IBAN chega já mascarado do registo, e assim fica', () => {
    expect(relatorioDoPercurso(base('backoffice'))).toContain('PT50 ··· 9015 4');
  });

  it('é determinístico: os mesmos dados dão o mesmo texto', () => {
    expect(relatorioDoPercurso(base('cliente'))).toBe(relatorioDoPercurso(base('cliente')));
  });
});

describe('versão do empreiteiro (pintor contratado, 06/11/2026)', () => {
  const t = () => relatorioDoPercurso({ ...base('cliente'), destinatario: 'pintor' });
  it('sem a comissão, em nenhuma forma', () => {
    expect(t()).not.toMatch(/comiss/i);
    expect(t()).not.toMatch(/1\D?992,60/);
  });
  it('sem nada das outras propostas, nem por letra, nem a comparação', () => {
    expect(t()).not.toContain('Pinturas Perdeu');
    expect(t()).not.toContain('Pintor A');
    expect(t()).not.toContain('Relatório de comparação');
  });
  it('sem o que o cliente fez antes de publicar, nem a abertura de conta dele', () => {
    expect(t()).not.toContain('Pedido de orçamentos criado');
    expect(t()).not.toContain('Conta aberta na plataforma: Condomínio X');
    expect(t()).toContain('Pedido publicado aos pintores');
    expect(t()).toContain('para o empreiteiro');
  });
  it('com a sua própria proposta e a contratação', () => {
    expect(t()).toMatch(/Proposta de Pinturas Ganhou, Lda\.: submetida/);
    expect(t()).toContain('Escolhida a proposta de Pinturas Ganhou, Lda.');
  });
});
