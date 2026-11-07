import { describe, expect, it } from 'vitest';
import {
  RESPOSTAS_DA_ASSOCIACAO,
  codigoNaMensagem,
  eParar,
  ligacaoParaAssociar,
  mascararCodigos,
  mensagemDeAssociacao,
} from './whatsappNumeros';

describe('confirmar o número por mensagem', () => {
  it('encontra o código onde quer que a pessoa o tenha deixado', () => {
    expect(codigoNaMensagem('Quero receber avisos da Quem Pinta por WhatsApp. Código: QP-AB12-cd34')).toBe('QP-AB12-CD34');
    expect(codigoNaMensagem('qp ab12 cd34')).toBe('QP-AB12-CD34');
    expect(codigoNaMensagem('QPAB12CD34')).toBe('QP-AB12-CD34');
    expect(codigoNaMensagem('olá')).toBeNull();
    expect(codigoNaMensagem('QP-AB12-CD3')).toBeNull();
    expect(codigoNaMensagem('QP-ZZ12-CD34')).toBeNull();
  });

  it('esconde o código nos registos', () => {
    expect(mascararCodigos('Código: QP-AB12-CD34, obrigado')).toBe('Código: QP-••••-••••, obrigado');
    expect(mascararCodigos('sem código')).toBe('sem código');
  });

  it('«PARAR» sozinho para; dentro de uma frase, não', () => {
    for (const t of ['PARAR', ' parar ', 'Parar.', 'STOP', 'stop!']) expect(eParar(t)).toBe(true);
    for (const t of ['não quero parar de receber', 'paragem', '', 'Aceito']) expect(eParar(t)).toBe(false);
  });

  it('a ligação abre o WhatsApp da plataforma com a mensagem e o código já escritos', () => {
    const l = ligacaoParaAssociar('+351926549194', 'QP-AB12-CD34');
    expect(l.startsWith('https://wa.me/351926549194?text=')).toBe(true);
    expect(decodeURIComponent(l.split('text=')[1]!)).toBe(mensagemDeAssociacao('QP-AB12-CD34'));
    expect(codigoNaMensagem(decodeURIComponent(l.split('text=')[1]!))).toBe('QP-AB12-CD34');
  });

  it('há resposta para cada resultado da base', () => {
    for (const e of ['ok', 'transferido', 'ja_associado', 'invalido', 'demasiadas', 'cheio'])
      expect(RESPOSTAS_DA_ASSOCIACAO[e]).toBeTruthy();
  });
});
