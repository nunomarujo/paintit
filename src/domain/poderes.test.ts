import { describe, expect, it } from 'vitest';
import { expectedDocs, missingDocs } from './organization';
import {
  RESULTADOS,
  RESULTADO_ROTULO,
  avisosDasAssinaturas,
  compararNomes,
  estadoDaLeitura,
  normalizarCodigoCertidao,
  normalizarNome,
  palavrasDoNome,
  parseLeitura,
  pedeAviso,
  poderesDaAssinatura,
  poderesDoPayload,
  regimeDosPoderes,
  usaCertidao,
  type LeituraDosPoderes,
  type PedidoDePoderes,
} from './poderes';

const HOJE = '2026-11-05';
const SOCIEDADE = '503504564';
const SINGULAR = '123456789';

const leitura = (membros: string[], assinaturasExigidas: 1 | 2 | null = 1, extra: Partial<LeituraDosPoderes> = {}): LeituraDosPoderes => ({
  fonte: 'certidao',
  membros: membros.map((nome) => ({ nome })),
  assinaturasExigidas,
  validaAte: '2027-05-01',
  ...extra,
});

const pedido = (p: Partial<PedidoDePoderes>): PedidoDePoderes => ({
  tipo: 'pintor',
  nif: SOCIEDADE,
  leitura: null,
  codigoEntregue: false,
  signatarios: [],
  titulares: [],
  hoje: HOJE,
  ...p,
});

describe('normalizar nomes', () => {
  it('maiúsculas, sem acentos e sem partículas', () => {
    expect(normalizarNome('João Luís Marques da Silva')).toBe('JOAO LUIS MARQUES SILVA');
    expect(normalizarNome('JOÃO LUIS')).toBe('JOAO LUIS');
    expect(normalizarNome('José dos Santos e Sá')).toBe('JOSE SANTOS SA');
    expect(normalizarNome('Maria Conceição Gonçalves')).toBe('MARIA CONCEICAO GONCALVES');
  });

  it("D' cai com a partícula, com apóstrofo direito ou curvo", () => {
    expect(normalizarNome("Maria D'Almeida")).toBe('MARIA ALMEIDA');
    expect(normalizarNome('MARIA D’ALMEIDA')).toBe('MARIA ALMEIDA');
    expect(normalizarNome('Maria de Almeida')).toBe('MARIA ALMEIDA');
  });

  it('espaços a mais, hífenes e pontuação', () => {
    expect(palavrasDoNome('  Ana   Sousa-Pinto, ')).toEqual(['ANA', 'SOUSA', 'PINTO']);
    expect(palavrasDoNome('J. Silva')).toEqual(['J', 'SILVA']);
  });

  it('o mesmo nome escrito em NFC e em NFD dá o mesmo', () => {
    expect(normalizarNome('João'.normalize('NFC'))).toBe(normalizarNome('João'.normalize('NFD')));
  });

  it('vazio, nulo ou só partículas dá nada', () => {
    expect(palavrasDoNome('')).toEqual([]);
    expect(palavrasDoNome(null)).toEqual([]);
    expect(palavrasDoNome(undefined)).toEqual([]);
    expect(palavrasDoNome(' de da do ')).toEqual([]);
  });
});

describe('comparar nomes', () => {
  it('confere: as mesmas palavras, por qualquer ordem', () => {
    expect(compararNomes('João Luís Silva', 'JOAO LUIS DA SILVA')).toBe('confere');
    expect(compararNomes('SILVA JOÃO', 'João Silva')).toBe('confere');
    expect(compararNomes('Silva', 'SILVA')).toBe('confere');
  });

  it('provável: o mesmo primeiro e último nome, e um contido no outro', () => {
    expect(compararNomes('João Silva', 'JOÃO PEDRO SILVA')).toBe('provavel');
    expect(compararNomes('JOÃO PEDRO MARQUES SILVA', 'João Marques Silva')).toBe('provavel');
  });

  it('não: o último nome diferente, o primeiro diferente, ou nenhum contido no outro', () => {
    expect(compararNomes('João Pedro', 'João Pedro Silva')).toBe('nao');
    expect(compararNomes('Pedro Silva', 'João Pedro Silva')).toBe('nao');
    expect(compararNomes('João Antunes Silva', 'João Pedro Silva')).toBe('nao');
    expect(compararNomes('João Silva', 'João Santos')).toBe('nao');
  });

  it('um só nome nunca é provável: precisa de primeiro e último', () => {
    expect(compararNomes('João', 'João Silva')).toBe('nao');
  });

  it('um nome vazio não confere com nada', () => {
    expect(compararNomes('', '')).toBe('nao');
    expect(compararNomes(null, 'João Silva')).toBe('nao');
  });
});

describe('de onde vem a resposta', () => {
  it('particular e condomínio, sempre', () => {
    expect(regimeDosPoderes('particular', null)).toBe('titular');
    expect(regimeDosPoderes('particular', SOCIEDADE)).toBe('titular');
    expect(regimeDosPoderes('condominio', '901000000')).toBe('ata');
  });

  it('pintor: sociedade pela certidão, empresário em nome individual pelo titular, o resto não se aplica', () => {
    expect(regimeDosPoderes('pintor', SOCIEDADE)).toBe('certidao');
    for (const nif of ['123456789', '234567899', '312345670', '451234560']) expect(regimeDosPoderes('pintor', nif)).toBe('titular');
    for (const nif of ['600000000', '700000000', '800000000', '980000000', null]) expect(regimeDosPoderes('pintor', nif)).toBe('nenhum');
  });

  it('administradora e fornecedor: certidão, salvo se forem pessoa singular', () => {
    expect(regimeDosPoderes('administradora', SOCIEDADE)).toBe('certidao');
    expect(regimeDosPoderes('administradora', '980000000')).toBe('certidao');
    expect(regimeDosPoderes('administradora', SINGULAR)).toBe('titular');
    expect(regimeDosPoderes('fornecedor', SOCIEDADE)).toBe('certidao');
    expect(regimeDosPoderes('fornecedor', null)).toBe('certidao');
  });

  it('o NIF pode vir com espaços', () => {
    expect(usaCertidao('pintor', '503 504 564')).toBe(true);
    expect(usaCertidao('pintor', ' 123 456 789')).toBe(false);
  });
});

describe('sociedade: pela certidão permanente', () => {
  it('sem código entregue, nem leitura', () => {
    const r = poderesDaAssinatura(pedido({ signatarios: ['João Silva'] }));
    expect(r.resultado).toBe('sem_certidao');
    expect(r.texto).toMatch(/ainda não entregou o código/);
  });

  it('com o código entregue e ainda por ler', () => {
    const r = poderesDaAssinatura(pedido({ codigoEntregue: true, signatarios: ['João Silva'] }));
    expect(r.resultado).toBe('sem_certidao');
    expect(r.texto).toMatch(/ainda não foi lida pela equipa/);
  });

  it('caducada a partir do dia seguinte ao «válida até»', () => {
    const l = leitura(['JOÃO SILVA'], 1, { validaAte: HOJE });
    expect(poderesDaAssinatura(pedido({ leitura: l, signatarios: ['João Silva'] })).resultado).toBe('confere');
    const r = poderesDaAssinatura(pedido({ leitura: l, signatarios: ['João Silva'], hoje: '2026-11-06' }));
    expect(r.resultado).toBe('certidao_caducada');
    expect(r.texto).toMatch(/caducou/);
  });

  it('confere: o nome de quem assinou é o de um gerente; o texto diz que é um indício', () => {
    const r = poderesDaAssinatura(
      pedido({ leitura: leitura(['JOÃO LUIS MARQUES DA SILVA', 'ANA COSTA']), signatarios: ['João Luís Marques Silva'] }),
    );
    expect(r.resultado).toBe('confere');
    expect(r.texto).toMatch(/indício, não uma prova/);
    expect(r.texto).not.toMatch(/verificad/i);
  });

  it('provável: falta um nome do meio', () => {
    const r = poderesDaAssinatura(pedido({ leitura: leitura(['JOÃO LUIS MARQUES DA SILVA']), signatarios: ['João Silva'] }));
    expect(r.resultado).toBe('provavel');
    expect(r.texto).toMatch(/Convém confirmar/);
  });

  it('não consta: o nome não é de ninguém com poderes', () => {
    const r = poderesDaAssinatura(pedido({ leitura: leitura(['ANA COSTA']), signatarios: ['João Silva'] }));
    expect(r.resultado).toBe('nao_consta');
    expect(r.texto).toMatch(/^O nome de quem assinou não consta/);
  });

  it('não consta, com várias pessoas: diz «uma das pessoas»', () => {
    const r = poderesDaAssinatura(pedido({ leitura: leitura(['ANA COSTA', 'RUI MOTA']), signatarios: ['Ana Costa', 'João Silva'] }));
    expect(r.resultado).toBe('nao_consta');
    expect(r.texto).toMatch(/uma das pessoas/);
  });

  it('obriga com duas assinaturas e só há uma', () => {
    const r = poderesDaAssinatura(pedido({ leitura: leitura(['ANA COSTA', 'RUI MOTA'], 2), signatarios: ['Ana Costa'] }));
    expect(r.resultado).toBe('faltam_assinaturas');
  });

  it('obriga com duas assinaturas e assinaram os dois gerentes', () => {
    const r = poderesDaAssinatura(pedido({ leitura: leitura(['ANA COSTA', 'RUI MOTA'], 2), signatarios: ['Rui Mota', 'Ana Costa'] }));
    expect(r.resultado).toBe('confere');
  });

  it('a mesma pessoa a assinar duas vezes conta uma vez', () => {
    const r = poderesDaAssinatura(pedido({ leitura: leitura(['ANA COSTA', 'RUI MOTA'], 2), signatarios: ['Ana Costa', 'ANA COSTA'] }));
    expect(r.resultado).toBe('faltam_assinaturas');
  });

  it('dois signatários não valem por dois se só um gerente lhes corresponde', () => {
    const r = poderesDaAssinatura(
      pedido({ leitura: leitura(['JOÃO PEDRO SILVA', 'ANA COSTA'], 2), signatarios: ['João Pedro Silva', 'João Silva'] }),
    );
    expect(r.resultado).toBe('nao_consta');
  });

  it('escolhe o emparelhamento que serve a todos, não o primeiro que aparece', () => {
    // «João Silva» serve aos dois gerentes; «João Pedro Silva» só ao primeiro. Quem emparelhasse pela
    // ordem dava o primeiro gerente ao «João Silva» e deixava o outro signatário sem par.
    const l = leitura(['JOÃO ANTÓNIO PEDRO SILVA', 'JOÃO MANUEL SILVA'], 2);
    const r = poderesDaAssinatura(pedido({ leitura: l, signatarios: ['João Silva', 'João Pedro Silva'] }));
    expect(r.resultado).toBe('provavel');
  });

  it('a forma de obrigar invulgar fica por confirmar, mesmo com o nome a conferir', () => {
    const r = poderesDaAssinatura(pedido({ leitura: leitura(['ANA COSTA'], null), signatarios: ['Ana Costa'] }));
    expect(r.resultado).toBe('por_confirmar');
    expect(r.texto).toMatch(/forma de obrigar/);
  });

  it('um nome que não consta pesa mais do que a forma de obrigar por confirmar', () => {
    expect(poderesDaAssinatura(pedido({ leitura: leitura(['ANA COSTA'], null), signatarios: ['João Silva'] })).resultado).toBe(
      'nao_consta',
    );
  });

  it('não consta pesa mais do que faltar uma assinatura', () => {
    expect(poderesDaAssinatura(pedido({ leitura: leitura(['ANA COSTA', 'RUI MOTA'], 2), signatarios: ['João Silva'] })).resultado).toBe(
      'nao_consta',
    );
  });

  it('faltar uma assinatura pesa mais do que um nome só provável', () => {
    expect(
      poderesDaAssinatura(pedido({ leitura: leitura(['ANA MARIA COSTA', 'RUI MOTA'], 2), signatarios: ['Ana Costa'] })).resultado,
    ).toBe('faltam_assinaturas');
  });

  it('um certificado sem nome fica por confirmar', () => {
    expect(poderesDaAssinatura(pedido({ leitura: leitura(['ANA COSTA']), signatarios: [null] })).resultado).toBe('por_confirmar');
    const r = poderesDaAssinatura(pedido({ leitura: leitura(['ANA COSTA']), signatarios: [null, 'Ana Costa'] }));
    expect(r.resultado).toBe('por_confirmar');
    expect(r.texto).toMatch(/não traz o nome/);
  });

  it('administradora e fornecedor seguem a mesma regra', () => {
    expect(
      poderesDaAssinatura(pedido({ tipo: 'administradora', leitura: leitura(['ANA COSTA']), signatarios: ['Ana Costa'] })).resultado,
    ).toBe('confere');
    expect(poderesDaAssinatura(pedido({ tipo: 'fornecedor', signatarios: ['Ana Costa'] })).resultado).toBe('sem_certidao');
  });
});

describe('condomínio: pela ata de nomeação', () => {
  const ata = (membros: string[], extra: Partial<LeituraDosPoderes> = {}) => leitura(membros, 1, { fonte: 'ata', ...extra });
  const condo = (p: Partial<PedidoDePoderes>) => pedido({ tipo: 'condominio', nif: '901000000', ...p });

  it('sem leitura da ata', () => {
    const r = poderesDaAssinatura(condo({ signatarios: ['Ana Costa'] }));
    expect(r.resultado).toBe('sem_certidao');
    expect(r.texto).toMatch(/ata de nomeação/);
  });

  it('o mandato terminou', () => {
    const r = poderesDaAssinatura(condo({ leitura: ata(['ANA COSTA'], { validaAte: '2026-01-31' }), signatarios: ['Ana Costa'] }));
    expect(r.resultado).toBe('certidao_caducada');
    expect(r.texto).toMatch(/mandato/);
  });

  it('confere e não consta, a falar do condomínio', () => {
    const ok = poderesDaAssinatura(condo({ leitura: ata(['ANA COSTA']), signatarios: ['Ana Costa'] }));
    expect(ok.resultado).toBe('confere');
    expect(ok.texto).toMatch(/ata de nomeação/);
    const nao = poderesDaAssinatura(condo({ leitura: ata(['ANA COSTA']), signatarios: ['Rui Mota'] }));
    expect(nao.resultado).toBe('nao_consta');
    expect(nao.texto).toMatch(/obrigar o condomínio/);
  });
});

describe('particular e empresário em nome individual: pelo titular da conta', () => {
  it('confere, provável e não confere', () => {
    expect(
      poderesDaAssinatura(pedido({ tipo: 'particular', nif: null, titulares: ['Ana Costa'], signatarios: ['ANA COSTA'] })).resultado,
    ).toBe('particular_confere');
    const provavel = poderesDaAssinatura(pedido({ tipo: 'particular', titulares: ['Ana Costa'], signatarios: ['Ana Maria Costa'] }));
    expect(provavel.resultado).toBe('particular_confere');
    expect(provavel.texto).toMatch(/nome completo não é igual/);
    expect(poderesDaAssinatura(pedido({ tipo: 'particular', titulares: ['Ana Costa'], signatarios: ['Rui Mota'] })).resultado).toBe(
      'particular_nao_confere',
    );
  });

  it('basta um dos titulares, e um dos signatários', () => {
    const r = poderesDaAssinatura(
      pedido({ tipo: 'particular', titulares: ['Rui Mota', 'Ana Costa'], signatarios: ['Joana Mota', 'Ana Costa'] }),
    );
    expect(r.resultado).toBe('particular_confere');
  });

  it('sem nome do titular, ou sem nome no certificado, fica por confirmar', () => {
    expect(poderesDaAssinatura(pedido({ tipo: 'particular', titulares: ['', '  '], signatarios: ['Ana Costa'] })).resultado).toBe(
      'por_confirmar',
    );
    expect(poderesDaAssinatura(pedido({ tipo: 'particular', titulares: ['Ana Costa'], signatarios: [null] })).resultado).toBe(
      'por_confirmar',
    );
  });

  it('o pintor empresário em nome individual compara com o titular, e ignora qualquer leitura', () => {
    const r = poderesDaAssinatura(
      pedido({ nif: SINGULAR, leitura: leitura(['RUI MOTA']), titulares: ['Ana Costa'], signatarios: ['Ana Costa'] }),
    );
    expect(r.resultado).toBe('particular_confere');
  });

  it('o pintor com um NIF que não é de sociedade nem de pessoa singular não é verificado', () => {
    expect(poderesDaAssinatura(pedido({ nif: '600000000', signatarios: ['Ana Costa'] })).resultado).toBe('nao_aplicavel');
  });
});

describe('o que a outra parte lê', () => {
  // Regra 6 e a decisão de 05/11/2026: a outra parte vê o resultado, nunca os dados da certidão.
  const membros = ['ZACARIAS QUINTELA', 'XAVIER WENCESLAU'];
  const cenarios: PedidoDePoderes[] = [];
  for (const tipo of ['pintor', 'condominio', 'administradora'] as const) {
    for (const assinaturas of [1, 2, null] as const) {
      for (const validaAte of ['2027-05-01', '2026-01-01']) {
        for (const signatarios of [
          ['Zacarias Quintela'],
          ['Zacarias Silva Quintela'],
          ['Rui Mota'],
          ['Zacarias Quintela', 'Xavier Wenceslau'],
          [null],
        ]) {
          cenarios.push(
            pedido({
              tipo,
              leitura: leitura(membros, assinaturas, { fonte: tipo === 'condominio' ? 'ata' : 'certidao', validaAte }),
              signatarios,
            }),
          );
        }
      }
    }
  }

  it('nenhum texto traz nomes, datas ou a forma de obrigar da leitura', () => {
    for (const c of cenarios) {
      const { texto } = poderesDaAssinatura(c);
      expect(texto).not.toMatch(/ZACARIAS|QUINTELA|XAVIER|WENCESLAU|Zacarias|Xavier/);
      expect(texto).not.toMatch(/\d/);
    }
  });

  it('os cenários passam por todos os resultados de uma leitura', () => {
    const vistos = new Set(cenarios.map((c) => poderesDaAssinatura(c).resultado));
    expect([...vistos].sort()).toEqual(['certidao_caducada', 'confere', 'faltam_assinaturas', 'nao_consta', 'por_confirmar', 'provavel']);
  });

  it('nenhum texto trata o leitor por tu ou você, nem diz «verificado»', () => {
    for (const c of cenarios) expect(poderesDaAssinatura(c).texto).not.toMatch(/\b(tu|você|verificad[oa])\b/i);
  });
});

describe('aviso', () => {
  it('só confere, confere com o titular e não se aplica ficam sem aviso', () => {
    const semAviso = RESULTADOS.filter((r) => !pedeAviso(r));
    expect(semAviso).toEqual(['confere', 'particular_confere', 'nao_aplicavel']);
  });

  it('todos os resultados têm rótulo', () => {
    for (const r of RESULTADOS) expect(RESULTADO_ROTULO[r]).toBeTruthy();
  });
});

describe('o que fica no acontecimento', () => {
  it('lê o resultado do payload, e recusa formas estranhas', () => {
    expect(poderesDoPayload({ poderes: { resultado: 'nao_consta', texto: 'x' } })).toEqual({ resultado: 'nao_consta', texto: 'x' });
    expect(poderesDoPayload({ poderes: { resultado: 'inventado', texto: 'x' } })).toBeNull();
    expect(poderesDoPayload({ poderes: { resultado: 'confere' } })).toBeNull();
    expect(poderesDoPayload({ poderes: 'confere' })).toBeNull();
    expect(poderesDoPayload({})).toBeNull();
    expect(poderesDoPayload(null)).toBeNull();
  });

  it('os avisos vêm das assinaturas, com o lado de cada uma', () => {
    const avisos = avisosDasAssinaturas([
      { kind: 'deposito_confirmado', payload: { poderes: { resultado: 'nao_consta', texto: 'ignorado' } } },
      { kind: 'cliente_assinou', payload: { poderes: { resultado: 'confere', texto: 'ok' } } },
      { kind: 'cliente_assinou', payload: { metodo: 'cmd_pdf' } },
      { kind: 'pintor_assinou', payload: { poderes: { resultado: 'faltam_assinaturas', texto: 'falta uma' } } },
      { kind: 'cliente_assinou', payload: { poderes: { resultado: 'sem_certidao', texto: 'sem leitura' } } },
    ]);
    expect(avisos).toEqual([
      { lado: 'pintor', resultado: 'faltam_assinaturas', texto: 'falta uma' },
      { lado: 'cliente', resultado: 'sem_certidao', texto: 'sem leitura' },
    ]);
  });
});

describe('código de acesso da certidão', () => {
  it('aceita os 12 algarismos com ou sem hífenes e espaços', () => {
    expect(normalizarCodigoCertidao('1234-5678-9012')).toBe('1234-5678-9012');
    expect(normalizarCodigoCertidao('123456789012')).toBe('1234-5678-9012');
    expect(normalizarCodigoCertidao(' 1234 5678 9012 ')).toBe('1234-5678-9012');
  });

  it('recusa o resto', () => {
    for (const s of ['', '1234-5678-901', '1234-5678-90123', 'abcd-5678-9012', '1234-5678-9012x', '1234.5678.9012']) {
      expect(normalizarCodigoCertidao(s)).toBeNull();
    }
  });
});

describe('o estado que a entidade vê no lugar do código', () => {
  it('sem código, guardado, lido e caducado', () => {
    expect(estadoDaLeitura(null, HOJE).estado).toBe('sem_codigo');
    expect(estadoDaLeitura({ codigoEntregueEm: null, lidaEm: null, validaAte: null }, HOJE).estado).toBe('sem_codigo');
    expect(estadoDaLeitura({ codigoEntregueEm: '2026-11-05T10:00:00Z', lidaEm: null, validaAte: null }, HOJE)).toEqual({
      estado: 'por_ler',
      texto: 'Guardado · por ler pela equipa',
    });
    expect(
      estadoDaLeitura({ codigoEntregueEm: '2026-11-01T10:00:00Z', lidaEm: '2026-11-02T09:00:00Z', validaAte: '2027-05-01' }, HOJE),
    ).toEqual({
      estado: 'lida',
      texto: 'Lida pela equipa a 02/11/2026 · válida até 01/05/2027',
    });
    const caducada = estadoDaLeitura({ codigoEntregueEm: null, lidaEm: '2025-11-02T09:00:00Z', validaAte: '2026-05-01' }, HOJE);
    expect(caducada.estado).toBe('caducada');
    expect(caducada.texto).toMatch(/caducou a 01\/05\/2026/);
  });
});

describe('o formulário da equipa', () => {
  const form = (campos: [string, string][]) => {
    const f = new FormData();
    for (const [k, v] of campos) f.append(k, v);
    return f;
  };
  const valido: [string, string][] = [
    ['membroNome', 'JOÃO LUIS MARQUES DA SILVA'],
    ['membroCargo', 'Gerente'],
    ['membroNif', '123 456 789'],
    ['membroNome', ''],
    ['membroCargo', ''],
    ['membroNif', ''],
    ['membroNome', 'ANA  COSTA'],
    ['membroCargo', 'Gerente'],
    ['membroNif', ''],
    ['formaDeObrigar', 'Com a assinatura de dois gerentes.'],
    ['assinaturas', '2'],
    ['validaAte', '2027-05-01'],
  ];

  it('aceita linhas em branco pelo meio, normaliza o NIF e os espaços', () => {
    const { value, errors } = parseLeitura(form(valido), HOJE);
    expect(errors).toEqual({});
    expect(value).toEqual({
      formaDeObrigar: 'Com a assinatura de dois gerentes.',
      assinaturasExigidas: 2,
      validaAte: '2027-05-01',
      membros: [
        { nome: 'JOÃO LUIS MARQUES DA SILVA', cargo: 'Gerente', nif: '123456789' },
        { nome: 'ANA COSTA', cargo: 'Gerente', nif: null },
      ],
    });
  });

  it('«a confirmar» fica sem número', () => {
    const f = form(valido.map(([k, v]) => [k, k === 'assinaturas' ? 'confirmar' : v]));
    expect(parseLeitura(f, HOJE).value?.assinaturasExigidas).toBeNull();
  });

  it('recusa sem ninguém, sem cargo, ou com NIF inválido, e diz a linha', () => {
    const sem = valido.filter(([k]) => !k.startsWith('membro'));
    expect(parseLeitura(form(sem), HOJE).errors.membros).toMatch(/pelo menos uma pessoa/);
    const semCargo = valido.map(([k, v]): [string, string] => [k, k === 'membroCargo' && v === 'Gerente' ? '' : v]);
    expect(parseLeitura(form(semCargo), HOJE).errors.membros).toMatch(/^Linha 1: indique o cargo/);
    const nifMau = valido.map(([k, v]): [string, string] => [k, k === 'membroNif' && v ? '123456780' : v]);
    expect(parseLeitura(form(nifMau), HOJE).errors.membros).toMatch(/^Linha 1: o NIF/);
  });

  it('recusa mais de vinte pessoas', () => {
    const muitos = Array.from({ length: 21 }, (_, i): [string, string][] => [
      ['membroNome', `Pessoa ${String.fromCharCode(65 + i)} Silva`],
      ['membroCargo', 'Gerente'],
      ['membroNif', ''],
    ]).flat();
    expect(parseLeitura(form([...muitos, ...valido.filter(([k]) => !k.startsWith('membro'))]), HOJE).errors.membros).toMatch(
      /No máximo 20/,
    );
  });

  it('recusa a forma de obrigar vazia ou comprida demais, e um número de assinaturas que não existe', () => {
    const semForma = valido.map(([k, v]): [string, string] => [k, k === 'formaDeObrigar' ? ' ' : v]);
    expect(parseLeitura(form(semForma), HOJE).errors.formaDeObrigar).toBeDefined();
    const longa = valido.map(([k, v]): [string, string] => [k, k === 'formaDeObrigar' ? 'x'.repeat(1001) : v]);
    expect(parseLeitura(form(longa), HOJE).errors.formaDeObrigar).toBeDefined();
    const tres = valido.map(([k, v]): [string, string] => [k, k === 'assinaturas' ? '3' : v]);
    expect(parseLeitura(form(tres), HOJE).errors.assinaturas).toBeDefined();
  });

  it('a validade: hoje serve, ontem não, e uma data que não existe também não', () => {
    const com = (d: string) => form(valido.map(([k, v]): [string, string] => [k, k === 'validaAte' ? d : v]));
    expect(parseLeitura(com(HOJE), HOJE).errors).toEqual({});
    expect(parseLeitura(com('2026-11-04'), HOJE).errors.validaAte).toMatch(/já passou/);
    expect(parseLeitura(com('2027-02-30'), HOJE).errors.validaAte).toBeDefined();
    expect(parseLeitura(com(''), HOJE).errors.validaAte).toBeDefined();
  });
});

describe('a certidão nos documentos em falta', () => {
  it('o pintor que é sociedade passa a ter de a entregar; o empresário em nome individual não', () => {
    expect(expectedDocs('pintor', SOCIEDADE)).toContainEqual(['certidao_permanente']);
    expect(expectedDocs('pintor', SINGULAR)).not.toContainEqual(['certidao_permanente']);
    expect(missingDocs('pintor', [], { nif: SOCIEDADE })).toHaveLength(6);
    expect(missingDocs('pintor', [], { nif: SINGULAR })).toHaveLength(5);
    expect(missingDocs('pintor', [])).toHaveLength(5);
  });

  it('o ficheiro da certidão ou o código de acesso valem o mesmo', () => {
    expect(missingDocs('pintor', [{ kind: 'certidao_permanente', status: 'submetido' }], { nif: SOCIEDADE })).toHaveLength(5);
    expect(missingDocs('pintor', [], { nif: SOCIEDADE, codigoCertidao: true })).toHaveLength(5);
    expect(missingDocs('fornecedor', [], { codigoCertidao: true })).toEqual([]);
    expect(missingDocs('administradora', [{ kind: 'certidao_permanente', status: 'rejeitado' }])).toEqual([['certidao_permanente']]);
  });
});
