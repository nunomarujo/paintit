import { describe, expect, it } from 'vitest';
import { formatEuros } from './money';
import { indicacoes, type PropostaParaIndicacao } from './indicacoes';
import { METODOLOGIA, NAO_INFLUENCIAM, PARAMETROS, prioridadeEmPalavras } from './metodologia';

const p = (alias: string, total: number, o: Partial<PropostaParaIndicacao> = {}): PropostaParaIndicacao => ({
  id: alias,
  alias,
  totalComIva: total,
  precoFirme: true,
  emFalta: 0,
  ...o,
});

const dadas = (r: ReturnType<typeof indicacoes>) => r.atribuidas.map((x) => [x.indicacao, x.alias]);

describe('as indicações da fase 1', () => {
  it('o menor preço e o melhor preço completo podem ser propostas diferentes', () => {
    const r = indicacoes(
      [p('Pintor A', 1_400_000, { emFalta: 2 }), p('Pintor B', 1_600_000), p('Pintor C', 1_640_000)],
      formatEuros,
    );
    expect(dadas(r)).toEqual([
      ['menor_preco', 'Pintor A'],
      ['menor_preco_completo', 'Pintor B'],
    ]);
  });

  it('a mesma proposta pode receber as duas', () => {
    const r = indicacoes([p('Pintor A', 1_400_000), p('Pintor B', 1_600_000)], formatEuros);
    expect(dadas(r)).toEqual([
      ['menor_preco', 'Pintor A'],
      ['menor_preco_completo', 'Pintor A'],
    ]);
  });

  it('o menor preço diz o que lhe falta, para não se ler como a mais barata para a obra', () => {
    const r = indicacoes([p('Pintor A', 1_400_000, { emFalta: 2 }), p('Pintor B', 1_600_000)], formatEuros);
    const menor = r.atribuidas.find((x) => x.indicacao === 'menor_preco')!;
    expect(menor.justificacao).toContain('2 trabalhos do pedido não incluídos');
  });

  it('um preço por fechar é ressalva do menor preço, mesmo cobrindo tudo', () => {
    const r = indicacoes([p('Pintor A', 1_400_000, { precoFirme: false }), p('Pintor B', 1_600_000)], formatEuros);
    expect(r.atribuidas.find((x) => x.indicacao === 'menor_preco')!.justificacao).toContain('depois de observar');
    // E não pode ganhar a indicação do pedido completo: o total ainda pode subir.
    expect(r.atribuidas.find((x) => x.indicacao === 'menor_preco_completo')!.alias).toBe('Pintor B');
  });

  it('o preço completo diz quanto custa a mais do que o menor total, e a percentagem', () => {
    const r = indicacoes([p('Pintor A', 1_400_000, { emFalta: 2 }), p('Pintor B', 1_435_000)], formatEuros);
    const completo = r.atribuidas.find((x) => x.indicacao === 'menor_preco_completo')!;
    expect(completo.justificacao).toContain(formatEuros(35_000));
    expect(completo.justificacao).toContain('2,5%');
  });

  it('sendo a mesma proposta, não se compara consigo própria', () => {
    const r = indicacoes([p('Pintor A', 1_400_000), p('Pintor B', 1_600_000)], formatEuros);
    expect(r.atribuidas.find((x) => x.indicacao === 'menor_preco_completo')!.justificacao).not.toContain('Custa mais');
  });

  it('um empate não produz vencedor: diz-se que empataram', () => {
    const r = indicacoes([p('Pintor A', 1_600_000), p('Pintor B', 1_600_000)], formatEuros);
    expect(r.atribuidas).toEqual([]);
    expect(r.naoAtribuidas.map((x) => x.indicacao)).toEqual(['menor_preco', 'menor_preco_completo']);
    expect(r.naoAtribuidas[0]!.motivo).toContain('Pintor A e Pintor B');
  });

  it('sem nenhuma completa, não se finge que há uma — e diz-se porquê', () => {
    const r = indicacoes(
      [p('Pintor A', 1_400_000, { emFalta: 1 }), p('Pintor B', 1_600_000, { precoFirme: false })],
      formatEuros,
    );
    expect(dadas(r)).toEqual([['menor_preco', 'Pintor A']]);
    expect(r.naoAtribuidas.find((x) => x.indicacao === 'menor_preco_completo')!.motivo)
      .toBe('Nenhuma proposta inclui todos os trabalhos pedidos com o preço firme.');
  });

  it('com uma proposta só não há indicações, e as duas dizem porquê', () => {
    const r = indicacoes([p('Pintor A', 1_400_000)], formatEuros);
    expect(r.atribuidas).toEqual([]);
    expect(r.naoAtribuidas).toHaveLength(2);
  });

  it('nenhuma justificação recomenda, aconselha ou elege', () => {
    const r = indicacoes(
      [p('Pintor A', 1_400_000, { emFalta: 2 }), p('Pintor B', 1_600_000), p('Pintor C', 1_640_000)],
      formatEuros,
    );
    const texto = [...r.atribuidas.map((x) => x.justificacao), ...r.naoAtribuidas.map((x) => x.motivo)].join(' ').toLowerCase();
    for (const palavra of ['recomend', 'aconselh', 'melhor opção', 'deve escolher', 'preferível', 'vencedor', 'ganha']) {
      expect(texto).not.toContain(palavra);
    }
  });
});

describe('a metodologia que se publica', () => {
  it('a reputação está entre os parâmetros, e diz que não ordena nesta versão', () => {
    const rep = PARAMETROS.find((x) => x.id === 'reputacao')!;
    expect(rep.importancia).toContain('não ordena');
    expect(rep.importancia.toLowerCase()).toContain('calibrad');
  });

  it('a prioridade diz qual prevalece sobre qual, e não apenas quais são os factores', () => {
    const f = prioridadeEmPalavras();
    expect(f).toContain('Primeiro');
    expect(f).toContain('só depois');
    expect(f.toLowerCase()).toContain('não ordena');
  });

  it('a comissão da plataforma está declarada como não influente', () => {
    expect(NAO_INFLUENCIAM[0]!.toLowerCase()).toContain('comissão');
    expect(NAO_INFLUENCIAM.join(' ').toLowerCase()).toContain('pagamento por posição');
  });

  it('cada indicação publicada tem elegibilidade, critério e limite', () => {
    for (const r of METODOLOGIA.indicacoes) {
      expect(r.elegibilidade.length).toBeGreaterThan(20);
      expect(r.criterio.length).toBeGreaterThan(10);
      expect(r.limite.length).toBeGreaterThan(20);
    }
  });

  it('as regras publicadas cobrem exactamente as indicações que o motor atribui', () => {
    const r = indicacoes([p('Pintor A', 1_400_000, { emFalta: 1 }), p('Pintor B', 1_600_000)], formatEuros);
    const publicadas = new Set(METODOLOGIA.indicacoes.map((x) => x.id));
    for (const a of r.atribuidas) expect(publicadas.has(a.indicacao)).toBe(true);
    for (const n of r.naoAtribuidas) expect(publicadas.has(n.indicacao)).toBe(true);
  });
});

describe('sem pedido definido não há recomendação que dele dependa', () => {
  it('a indicação do pedido completo não se atribui, e diz porquê', () => {
    const r = indicacoes([p('Pintor A', 1_400_000), p('Pintor B', 1_600_000)], formatEuros, 0);
    expect(r.atribuidas.map((x) => x.indicacao)).toEqual(['menor_preco']);
    const nao = r.naoAtribuidas.find((x) => x.indicacao === 'menor_preco_completo')!;
    expect(nao.motivo).toBe('O pedido não indica que trabalhos quer: não há cobertura que se possa aferir.');
  });

  it('o menor preço continua a poder dizer-se: não depende de cobertura nenhuma', () => {
    const r = indicacoes([p('Pintor A', 1_400_000), p('Pintor B', 1_600_000)], formatEuros, 0);
    expect(r.atribuidas[0]!.alias).toBe('Pintor A');
  });
});
