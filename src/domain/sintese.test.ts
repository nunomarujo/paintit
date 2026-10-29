import { describe, expect, it } from 'vitest';
import { classificar, trabalhosDaProposta, type SinaisDaProposta, type TrabalhoNaProposta } from './comparador';
import { formatEuros } from './money';
import { formatArea, type DesiredWork } from './request';
import {
  diferencasRelevantes,
  leituraImediata,
  pendenciasQueImportam,
  sinteseDasPropostas,
  type ContextoDaSintese,
  type PropostaNaSintese,
} from './sintese';
import type { ProposalLine } from './proposal';

const linha = (p: Partial<ProposalLine>): ProposalLine => ({
  categoria: 'pintura',
  descricao: '',
  superficie: null,
  quantidade: 24000,
  unidade: 'm2',
  precoUnitario: 200,
  demaos: null,
  produto: null,
  inclusao: 'incluido',
  ...p,
});

const PEDIDOS: readonly DesiredWork[] = ['lavagem', 'pintura'];

const LINHAS_OK = [
  linha({ trabalho: 'lavagem', produto: 'Alta pressão' }),
  linha({ trabalho: 'pintura_final', produto: 'CIN Vinylmatt', demaos: 2 }),
];

function proposta(alias: string, p: Partial<PropostaNaSintese> = {}, linhas = LINHAS_OK): PropostaNaSintese {
  const trabalhos: TrabalhoNaProposta[] = p.trabalhos ?? trabalhosDaProposta(PEDIDOS, linhas);
  const sinais: SinaisDaProposta = { trabalhos, temCondicionados: false, zonasSemPreco: 0, precoGlobal: false };
  return {
    id: alias,
    alias,
    totalComIva: 1_845_000,
    classificacao: classificar(sinais),
    trabalhos,
    garantiaAnos: 5,
    duracaoDias: 20,
    inicioPossivel: '2026-11-15',
    adiantamentoBps: 2000,
    ...p,
    ...(p.trabalhos ? { trabalhos: p.trabalhos, classificacao: classificar({ ...sinais, trabalhos: p.trabalhos }) } : {}),
  };
}

const ctx = (p: Partial<ContextoDaSintese> = {}): ContextoDaSintese => ({
  pedidos: PEDIDOS,
  areaPedidoCm2: 24000,
  formataEuros: formatEuros,
  formataArea: formatArea,
  formataData: (iso) => iso,
  ...p,
});

const linhaPor = (ls: ReturnType<typeof sinteseDasPropostas>, id: string) => ls.find((l) => l.id === id);

describe('a tabela de síntese', () => {
  it('abre pelo preço e fecha pelo essencial: a ordem dos critérios não muda', () => {
    const ls = sinteseDasPropostas([proposta('Pintor A')], ctx());
    expect(ls[0]!.id).toBe('total');
    expect(ls[ls.length - 1]!.id).toBe('essencial');
    expect(ls[0]!.destacada).toBe(true);
  });

  it('nada fica âmbar sem dizer porquê: a cor nunca carrega sozinha a informação', () => {
    const comFalhas = proposta('Pintor C', { garantiaAnos: null, duracaoDias: null }, [
      linha({ trabalho: 'lavagem', produto: 'Alta pressão' }),
      linha({ trabalho: 'pintura_final', quantidade: 31000 }),
    ]);
    const ls = sinteseDasPropostas([comFalhas], ctx());
    const celulas = ls.flatMap((l) => l.celulas);
    expect(celulas.some((c) => c.tom === 'atencao')).toBe(true);
    for (const c of celulas) {
      if (c.tom === 'atencao') expect(c.motivo && c.motivo.length > 10).toBe(true);
      else expect(c.motivo).toBeNull();
    }
  });

  it('cumprir não ganha destaque nenhum: só há neutro e atenção', () => {
    const ls = sinteseDasPropostas([proposta('Pintor A')], ctx());
    const tons = new Set(ls.flatMap((l) => l.celulas).map((c) => c.tom));
    expect([...tons]).toEqual(['neutro']);
  });

  it('mais demãos e mais anos de garantia não são tratados como melhores', () => {
    const duas = proposta('Pintor A');
    const uma = proposta('Pintor B', { garantiaAnos: 1 }, [
      linha({ trabalho: 'lavagem', produto: 'Alta pressão' }),
      linha({ trabalho: 'pintura_final', produto: 'Robbialac', demaos: 1 }),
    ]);
    const ls = sinteseDasPropostas([duas, uma], ctx());
    // As duas declararam o que lhes competia: nenhuma é assinalada, para nenhum dos lados.
    expect(linhaPor(ls, 'acabamento_pintura')!.celulas.map((c) => c.tom)).toEqual(['neutro', 'neutro']);
    expect(linhaPor(ls, 'garantia')!.celulas.map((c) => c.tom)).toEqual(['neutro', 'neutro']);
    expect(linhaPor(ls, 'garantia')!.celulas.map((c) => c.texto)).toEqual(['5 anos', '1 ano']);
  });

  it('a área que não bate diz que diverge, e não que alguém contou a mais', () => {
    const p = proposta('Pintor C', {}, [
      linha({ trabalho: 'lavagem', produto: 'Alta pressão' }),
      linha({ trabalho: 'pintura_final', produto: 'CIN', demaos: 2, quantidade: 31000 }),
    ]);
    const c = linhaPor(sinteseDasPropostas([p], ctx()), 'area')!.celulas[0]!;
    expect(c.tom).toBe('atencao');
    expect(c.texto).toContain('diverge');
    expect(c.motivo).toContain('310 m² onde o pedido diz 240 m²');
    // Oferece as duas hipóteses pela ordem certa: medir de outra forma antes de alguém estar errado.
    // Não sugere engano: diz o que confirmar. Uma diferença de medição pode ser critério, não erro.
    expect(c.motivo).toContain('Confirme o que cada medição abrange');
    expect(`${c.texto} ${c.motivo}`.toLowerCase()).not.toContain('engan');
    expect(`${c.texto} ${c.motivo}`.toLowerCase()).not.toContain('a mais');
    expect(`${c.texto} ${c.motivo}`.toLowerCase()).not.toContain('erro');
  });

  it('um preço por fechar conta nos custos, e não como trabalho em falta', () => {
    const p = proposta('Pintor B', {}, [
      linha({ trabalho: 'lavagem', produto: 'Alta pressão' }),
      linha({ trabalho: 'pintura_final', produto: 'CIN', demaos: 2, inclusao: 'condicionado' }),
    ]);
    const ls = sinteseDasPropostas([p], ctx());
    expect(linhaPor(ls, 'custos_por_fechar')!.celulas[0]!.tom).toBe('atencao');
    expect(linhaPor(ls, 'custos_por_fechar')!.celulas[0]!.texto).toContain('após observação');
    expect(linhaPor(ls, 'trabalhos')!.celulas[0]!.texto).not.toContain('não indicado');
  });

  it('só entram as linhas que o pedido torna relevantes', () => {
    const soLavagem = ['lavagem'] as const;
    const trabalhos = trabalhosDaProposta(soLavagem, [linha({ trabalho: 'lavagem', produto: 'Alta pressão' })]);
    const ls = sinteseDasPropostas([proposta('Pintor A', { trabalhos })], ctx({ pedidos: soLavagem, areaPedidoCm2: null }));
    expect(linhaPor(ls, 'acabamento_pintura')).toBeUndefined();
    expect(linhaPor(ls, 'area')).toBeUndefined();
    expect(linhaPor(ls, 'preparacao')).toBeDefined();
  });

  it('o essencial resume sem eleger ninguém', () => {
    const a = proposta('Pintor A');
    const c = proposta('Pintor C', {}, [linha({ trabalho: 'pintura_final', produto: 'CIN', demaos: 2 })]);
    const celulas = linhaPor(sinteseDasPropostas([a, c], ctx()), 'essencial')!.celulas;
    // Não diz «preço definido»: não haver condicionados declarados não prova um preço confirmado.
    expect(celulas[0]!.texto).toBe('Cobre o pedido; sem custos por fechar declarados');
    expect(celulas[1]!.texto.toLowerCase()).toContain('esclarecer');
    for (const cel of celulas) {
      const t = cel.texto.toLowerCase();
      for (const palavra of ['melhor', 'pior', 'mais barata', 'recomend', 'vencedor', 'preferível']) {
        expect(t).not.toContain(palavra);
      }
    }
  });

  it('muitos produtos no mesmo trabalho remetem para o detalhe em vez de encherem a célula', () => {
    const p = proposta('Pintor A', {}, [
      linha({ trabalho: 'lavagem', produto: 'Alta pressão' }),
      linha({ trabalho: 'pintura_final', produto: 'CIN', demaos: 2 }),
      linha({ trabalho: 'pintura_final', produto: 'Robbialac', demaos: 2 }),
      linha({ trabalho: 'pintura_final', produto: 'Dyrup', demaos: 2 }),
    ]);
    expect(linhaPor(sinteseDasPropostas([p], ctx({ areaPedidoCm2: null })), 'acabamento_pintura')!.celulas[0]!.texto)
      .toContain('ver detalhe');
  });
});

describe('a frase que se lê antes da tabela', () => {
  const barataCompleta = () => ({ ...proposta('Pintor A'), totalComIva: 1_690_000 });
  const barataIncompleta = () => ({
    ...proposta('Pintor C', {}, [linha({ trabalho: 'pintura_final', produto: 'CIN', demaos: 2 })]),
    totalComIva: 1_398_000,
  });

  it('diz qual é a mais barata completa e, se for outra, qual é a mais barata de todas e o que lhe falta', () => {
    const f = leituraImediata([barataCompleta(), barataIncompleta()], formatEuros)!;
    expect(f).toContain('Pintor A tem o menor total');
    expect(f).toContain('incluem todos os trabalhos pedidos');
    expect(f).toContain('Pintor C apresenta o menor total');
    expect(f.toLowerCase()).toContain('esclarecer');
  });

  it('quando a mais barata é também a completa, diz-se numa frase só', () => {
    const cara = { ...proposta('Pintor B'), id: 'Pintor B', alias: 'Pintor B', totalComIva: 1_900_000 };
    const f = leituraImediata([barataCompleta(), cara], formatEuros)!;
    expect(f).toBe(`Pintor A tem o menor total (${formatEuros(1_690_000)}) e inclui todos os trabalhos pedidos, sem custos por fechar.`);
  });

  it('sem nenhuma completa, não se finge que há uma', () => {
    const f = leituraImediata([barataIncompleta(), { ...barataIncompleta(), id: 'Pintor D', alias: 'Pintor D', totalComIva: 1_500_000 }], formatEuros)!;
    expect(f).toContain('Nenhuma proposta inclui todos os trabalhos pedidos');
  });

  it('não recomenda nem elege: só descreve factos', () => {
    const f = leituraImediata([barataCompleta(), barataIncompleta()], formatEuros)!.toLowerCase();
    for (const palavra of ['recomend', 'melhor', 'escolha', 'aconselh', 'preferível', 'vencedor']) {
      expect(f).not.toContain(palavra);
    }
  });

  it('com uma proposta só não há comparação para fazer', () => {
    expect(leituraImediata([barataCompleta()], formatEuros)).toBeNull();
  });
});

describe('o que sobe à primeira página', () => {
  const tres = () => [
    proposta('Pintor A'),
    proposta('Pintor B', { garantiaAnos: 3 }, [
      linha({ trabalho: 'lavagem', produto: 'Alta pressão' }),
      linha({ trabalho: 'pintura_final', produto: 'Robbialac', demaos: 2 }),
    ]),
    proposta('Pintor C', { garantiaAnos: null }, [
      linha({ trabalho: 'lavagem', produto: 'Alta pressão' }),
      linha({ trabalho: 'pintura_final', produto: 'CIN Vinylmatt', demaos: 2, quantidade: 31000 }),
    ]),
  ];

  it('as diferenças juntam quem diz o mesmo, em vez de repetir', () => {
    const ps = tres();
    const ds = diferencasRelevantes(sinteseDasPropostas(ps, ctx()), ps.map((p) => p.alias));
    const area = ds.find((d) => d.criterio === 'Área de pintura')!;
    expect(area.frase).toBe('Pintor A e Pintor B: 240 m² · Pintor C: 310 m² — diverge');
  });

  it('um critério em que todas dizem o mesmo não é uma diferença', () => {
    const ps = tres();
    const ds = diferencasRelevantes(sinteseDasPropostas(ps, ctx()), ps.map((p) => p.alias));
    expect(ds.map((d) => d.criterio)).not.toContain('Adiantamento');
    expect(ds.map((d) => d.criterio)).not.toContain('Trabalhos pedidos');
  });

  it('o total e o essencial ficam de fora: um está sempre em cima, o outro é o resumo', () => {
    const ps = tres();
    const ds = diferencasRelevantes(sinteseDasPropostas(ps, ctx()), ps.map((p) => p.alias));
    expect(ds.map((d) => d.criterio)).not.toContain('Total com IVA');
    expect(ds.map((d) => d.criterio)).not.toContain('O essencial');
  });

  it('só sobem as pendências das propostas que estão a ser consideradas', () => {
    const ps = tres();
    const ls = sinteseDasPropostas(ps, ctx());
    const aliases = ps.map((p) => p.alias);
    const so_c = pendenciasQueImportam(ls, aliases, ['Pintor C']);
    expect(so_c.every((p) => p.alias === 'Pintor C')).toBe(true);
    expect(so_c.some((p) => p.criterio === 'Área de pintura')).toBe(true);
    // Sem ninguém indicado, nada sobe: não há escolha que uma pendência possa alterar.
    expect(pendenciasQueImportam(ls, aliases, [])).toEqual([]);
  });

  it('cada pendência traz o motivo escrito, nunca só o critério', () => {
    const ps = tres();
    const ls = sinteseDasPropostas(ps, ctx());
    for (const p of pendenciasQueImportam(ls, ps.map((x) => x.alias), ['Pintor C'])) {
      expect(p.motivo.length).toBeGreaterThan(20);
    }
  });
});

describe('o que o cliente lê é português de cliente', () => {
  // O promotor apanhou «o preço não é comparável sem os somar» e disse o que era: linguagem de quem
  // construiu a tabela. Quem lê isto é um condómino numa assembleia, não quem fez o comparador.
  const JARGAO = ['comparável', 'comparáveis', 'âmbito', 'parcela', 'índice', 'critério de medição', 'valorização'];

  const todosOsMotivos = () => {
    const ps = [
      proposta('Pintor A'),
      proposta('Pintor B', { garantiaAnos: null, duracaoDias: null }, [
        linha({ trabalho: 'lavagem' }),
        linha({ trabalho: 'pintura_final', quantidade: 31000 }),
      ]),
      proposta('Pintor C', {}, [linha({ trabalho: 'pintura_final', produto: 'CIN', demaos: 2, inclusao: 'condicionado' })]),
    ];
    return sinteseDasPropostas(ps, ctx())
      .flatMap((l) => l.celulas)
      .map((c) => c.motivo)
      .filter((m): m is string => !!m);
  };

  it('nenhum motivo usa palavras que só nós percebemos', () => {
    const motivos = todosOsMotivos();
    expect(motivos.length).toBeGreaterThan(3);
    for (const m of motivos) {
      for (const palavra of JARGAO) expect(m.toLowerCase()).not.toContain(palavra);
    }
  });

  it('cada motivo diz o que acontece a quem escolher aquela proposta, e não o estado de um campo', () => {
    for (const m of todosOsMotivos()) {
      // Frases inteiras, com verbo: «Não indicada» sozinho não explica nada a ninguém.
      expect(m.length).toBeGreaterThan(40);
      expect(m.trim().endsWith('.')).toBe(true);
    }
  });
});

describe('não afirmar o que os dados não mostram', () => {
  const motivosDe = (ps: PropostaNaSintese[], semEssencial = false) =>
    sinteseDasPropostas(ps, ctx())
      .filter((l) => !(semEssencial && l.id === 'essencial'))
      .flatMap((l) => l.celulas)
      .map((c) => c.motivo)
      .filter((m): m is string => !!m);

  it('um trabalho não indicado não vira trabalho excluído', () => {
    // «Não indicar não comprova exclusão» (promotor, 29/10/2026): o pintor pode tê-lo esquecido ou
    // dado por implícito. Afirmar que não o faz é pôr-lhe na boca o que ele não disse.
    // Três trabalhos pedidos, dois na proposta: o terceiro não foi referido.
    const pedidos = ['lavagem', 'pintura', 'reparacao_fissuras'] as const;
    const trabalhos = trabalhosDaProposta(pedidos, [
      linha({ trabalho: 'lavagem', produto: 'Alta pressão' }),
      linha({ trabalho: 'pintura_final', produto: 'CIN', demaos: 2 }),
    ]);
    const p = proposta('Pintor C', { trabalhos });
    const celula = sinteseDasPropostas([p, proposta('Pintor A')], ctx({ pedidos }))
      .find((l) => l.id === 'trabalhos')!.celulas[0]!;
    expect(celula.texto).toContain('por esclarecer');
    expect(celula.motivo).toContain('não esclarece se inclui');
    expect(celula.motivo).toContain('Pergunte ao pintor');
    for (const afirmacao of ['não estão nesta proposta', 'não faz', 'exclui']) {
      expect(celula.motivo!.toLowerCase()).not.toContain(afirmacao);
    }
  });

  it('nenhum motivo afirma efeitos que não decorrem dos dados', () => {
    const ps = [
      proposta('Pintor A'),
      proposta('Pintor B', { garantiaAnos: null, duracaoDias: null }, [
        linha({ trabalho: 'lavagem' }),
        linha({ trabalho: 'pintura_final', quantidade: 31000 }),
      ]),
    ];
    const texto = motivosDe(ps).join(' ').toLowerCase();
    // Não há garantia escrita não quer dizer que não haja direitos; não saber a duração não prova
    // que haverá andaimes; medir diferente não prova engano.
    for (const invencao of ['não há prazo', 'andaimes', 'varandas ocupadas', 'engan', 'não tem direito']) {
      expect(texto).not.toContain(invencao);
    }
  });

  it('cada motivo diz o que confirmar, e não só o que falta', () => {
    const ps = [
      proposta('Pintor A'),
      proposta('Pintor B', { garantiaAnos: null, duracaoDias: null }, [
        linha({ trabalho: 'lavagem' }),
        linha({ trabalho: 'pintura_final', quantidade: 31000 }),
      ]),
    ];
    // O «essencial» fica de fora: resume as linhas de cima, e a acção está em cada uma delas.
    for (const m of motivosDe(ps, true)) {
      expect(/confirme|pergunte|peça/i.test(m)).toBe(true);
    }
  });

  it('nunca se afirma que um preço está fechado ou garantido', () => {
    const ls = sinteseDasPropostas([proposta('Pintor A'), proposta('Pintor B')], ctx());
    const tudo = ls.flatMap((l) => l.celulas.map((c) => `${c.texto} ${c.motivo ?? ''}`)).join(' ').toLowerCase();
    for (const promessa of ['preço definido', 'preço fixo', 'preço garantido', 'preço confirmado']) {
      expect(tudo).not.toContain(promessa);
    }
  });
});
