import { describe, expect, it } from 'vitest';
import { CURRENT_RULES } from './rules';
import { applyPainterDiscount } from './referral';
import { BENEFICIOS_GRATUITO, BENEFICIOS_PRO, FUNCIONALIDADES_PRO, PRECO_ATUAL, PRO_DISCOUNT_BP, poupancaAnual, precoDe, situacaoDe, subscriberDiscountBp, temPro, type SubscricaoPintor } from './painterPlan';

const pro = (over: Partial<SubscricaoPintor> = {}): SubscricaoPintor => ({ plano: 'pro', estado: 'ativa', periodicidade: 'mensal', validaAte: '2026-12-31', ...over });

describe('desconto de subscritor', () => {
  it('não desconta sem subscrição', () => {
    expect(subscriberDiscountBp(null, '2026-10-25')).toBe(0);
  });

  it('não desconta no plano gratuito', () => {
    expect(subscriberDiscountBp(pro({ plano: 'gratuito' }), '2026-10-25')).toBe(0);
  });

  it('desconta 5 pontos percentuais no plano Pro ativo', () => {
    expect(subscriberDiscountBp(pro(), '2026-10-25')).toBe(500);
    expect(PRO_DISCOUNT_BP).toBe(500);
  });

  it('não desconta enquanto a subscrição está por pagar', () => {
    expect(subscriberDiscountBp(pro({ estado: 'por_pagar' }), '2026-10-25')).toBe(0);
  });

  it('cancelada sem validade conhecida não desconta — senão bastava cancelar para ficar com o desconto', () => {
    expect(subscriberDiscountBp(pro({ estado: 'cancelada', validaAte: null }), '2026-10-25')).toBe(0);
  });

  it('activa sem validade ainda desconta: é o estado logo a seguir ao pagamento', () => {
    expect(subscriberDiscountBp(pro({ validaAte: null }), '2026-10-25')).toBe(500);
  });

  it('mantém o desconto depois de cancelada, até ao fim do período já pago', () => {
    const cancelada = pro({ estado: 'cancelada', validaAte: '2026-11-30' });
    expect(subscriberDiscountBp(cancelada, '2026-11-30')).toBe(500);
    expect(subscriberDiscountBp(cancelada, '2026-12-01')).toBe(0);
  });
});

describe('comissão com subscrição', () => {
  it('leva a comissão de 18% para 13%', () => {
    expect(applyPainterDiscount(CURRENT_RULES, 500).commissionBp).toBe(1_300);
  });

  it('soma-se aos outros descontos do pintor', () => {
    // 0,5 p.p. de códigos de adesão + 5 p.p. de subscritor = 12,5%.
    expect(applyPainterDiscount(CURRENT_RULES, 50 + 500).commissionBp).toBe(1_250);
  });

  it('não atravessa o piso de 9%, nem com todos os descontos empilhados', () => {
    expect(applyPainterDiscount(CURRENT_RULES, 800 + 500).commissionBp).toBe(900);
  });
});

describe('preço de lançamento', () => {
  it('é 30 €/mês e 250 €/ano, abaixo do preço de tabela', () => {
    expect(PRECO_ATUAL.mensalCents).toBe(3_000);
    expect(PRECO_ATUAL.anualCents).toBe(25_000);
    expect(PRECO_ATUAL.tabelaMensalCents).toBe(5_000);
    expect(PRECO_ATUAL.tabelaAnualCents).toBe(50_000);
  });

  it('a anual poupa 110 € face a doze meses', () => {
    expect(poupancaAnual()).toBe(11_000);
  });
});

describe('precoDe', () => {
  it('dá o preço da periodicidade na versão guardada', () => {
    expect(precoDe('2026-10-25', 'mensal')).toBe(3_000);
    expect(precoDe('2026-10-25', 'anual')).toBe(25_000);
  });

  it('recusa uma versão que não conhece, em vez de inventar um preço', () => {
    expect(precoDe('2030-01-01', 'anual')).toBeNull();
  });
});

describe('situacaoDe', () => {
  it('diz o que está a ser pago, com que frequência e quando renova', () => {
    const s = situacaoDe(pro({ periodicidade: 'anual', precoCents: 25_000, validaAte: '2027-10-25' }), '2026-10-25');
    expect(s).toEqual({ tipo: 'activa', periodicidade: 'anual', precoCents: 25_000, renovaEm: '2027-10-25' });
  });

  it('cancelada dentro do período pago diz até quando o desconto dura', () => {
    const s = situacaoDe(pro({ estado: 'cancelada', validaAte: '2027-10-25' }), '2026-10-25');
    expect(s).toEqual({ tipo: 'cancelada_ate', validaAte: '2027-10-25' });
  });

  it('cancelada e já fora do período é o fim, não uma subscrição activa', () => {
    expect(situacaoDe(pro({ estado: 'cancelada', validaAte: '2026-01-01' }), '2026-10-25').tipo).toBe('terminada');
    expect(situacaoDe(pro({ estado: 'cancelada', validaAte: null }), '2026-10-25').tipo).toBe('terminada');
  });

  it('nunca chama activa a uma adesão por pagar', () => {
    expect(situacaoDe(pro({ estado: 'por_pagar', validaAte: null }), '2026-10-25').tipo).toBe('por_pagar');
  });

  it('sem subscrição é o plano gratuito', () => {
    expect(situacaoDe(null, '2026-10-25').tipo).toBe('gratuito');
  });
});

describe('acesso ao Pro', () => {
  it('uma subscrição a correr dá acesso', () => {
    expect(temPro(pro(), '2026-10-25')).toBe(true);
  });

  it('cancelada dentro do período pago continua a dar, porque já foi paga', () => {
    expect(temPro(pro({ estado: 'cancelada', validaAte: '2027-10-25' }), '2026-10-25')).toBe(true);
  });

  it('por pagar não dá acesso nenhum', () => {
    expect(temPro(pro({ estado: 'por_pagar', validaAte: null }), '2026-10-25')).toBe(false);
  });

  it('sem subscrição não dá', () => {
    expect(temPro(null, '2026-10-25')).toBe(false);
  });

  it('as adendas e as ferramentas de obra ficam fora do Pro, de propósito', () => {
    expect(FUNCIONALIDADES_PRO).not.toContain('adendas');
    expect(FUNCIONALIDADES_PRO).not.toContain('ferramentas_obra');
    expect(FUNCIONALIDADES_PRO).toContain('marca_propria');
    expect(FUNCIONALIDADES_PRO).toContain('cofre_documentos');
  });

  it('só fica marcado como a chegar o que ainda não entrega nada ao pintor', () => {
    // As obras públicas e o mapa de convites têm ecrã e nenhuma obra lá dentro; o resto funciona.
    const aChegar = BENEFICIOS_PRO.filter((b) => b.aChegar).map((b) => b.titulo);
    expect(aChegar).toHaveLength(2);
    expect(aChegar.join(' ')).toContain('obras públicas');
    expect(BENEFICIOS_PRO.filter((b) => !b.aChegar)).toHaveLength(6);
  });

  it('o benefício do convite traz os números medidos, não adjectivos', () => {
    const convite = BENEFICIOS_PRO.find((b) => b.titulo.includes('Dois terços'));
    expect(convite?.maisInfo).toContain('482');
    expect(convite?.maisInfo).toContain('63,6 milhões');
    expect(convite?.maisInfo).toContain('mais de um terço');
  });

  it('não volta a pôr os 58% do convite único, que são de outra base', () => {
    // Os 58% são 124 convites a uma empresa só em 213 — só os convites cuja lista de convidados o
    // BASE publica. Sobre os 326 convites todos são 38%, e é esse o universo de que a frase fala.
    // Estiveram aqui como se fossem dos 326: um número verdadeiro na base errada continua a enganar
    // quem o lê, e numa página de venda isso não passa (verificado na carga real de 25/10/2026).
    const texto = BENEFICIOS_PRO.flatMap((b) => [b.titulo, b.detalhe, b.maisInfo ?? '']).join(' ');
    expect(texto).not.toContain('58%');
  });

  it('a taxa da comissão não aparece em lado nenhum, só os pontos que desce', () => {
    // Decisão do promotor, 25/10/2026: nem 18% nem 13% nem qualquer outra taxa nesta página. O que
    // se diz é quanto desce — cinco pontos percentuais — e quanto isso vale em euros.
    const texto = [...BENEFICIOS_GRATUITO, ...BENEFICIOS_PRO]
      .flatMap((b) => [b.titulo, b.detalhe, b.maisInfo ?? ''])
      .join(' ');
    for (const taxa of ['18%', '13%', '9%']) expect(texto).not.toContain(taxa);
    expect(texto).toContain('5 pontos percentuais');
  });
});
