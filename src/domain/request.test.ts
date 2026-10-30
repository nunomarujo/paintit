import { describe, expect, it } from 'vitest';
import {
  formatArea,
  fraseDePrazo,
  parseRequest,
  parseSurface,
  publishBlockers,
  bloqueiosDaPublicacao,
  resumoDasZonas,
  type ZonaDoPedido,
  revealingContent,
  surfaceArea,
  urgenciaPrazo,
  type SurfaceInput,
} from './request';

describe('urgência do prazo (ecrã de Oportunidades)', () => {
  it('hoje é "Termina hoje", 1 a 3 dias é atenção, o resto é normal', () => {
    expect(fraseDePrazo(urgenciaPrazo('2026-10-26', '2026-10-26'))).toBe('Termina hoje');
    expect(urgenciaPrazo('2026-10-26', '2026-10-26').nivel).toBe('hoje');
    expect(fraseDePrazo(urgenciaPrazo('2026-10-27', '2026-10-26'))).toBe('1 dia restante');
    expect(urgenciaPrazo('2026-10-27', '2026-10-26').nivel).toBe('atencao');
    expect(fraseDePrazo(urgenciaPrazo('2026-10-29', '2026-10-26'))).toBe('3 dias restantes');
    expect(urgenciaPrazo('2026-10-29', '2026-10-26').nivel).toBe('atencao');
    expect(urgenciaPrazo('2026-10-30', '2026-10-26').nivel).toBe('normal');
  });

  it('um prazo já passado também conta como "hoje" (caso-limite), mas com a frase de fecho', () => {
    const u = urgenciaPrazo('2026-10-20', '2026-10-26');
    expect(u.nivel).toBe('hoje');
    expect(fraseDePrazo(u)).toBe('Prazo terminado');
  });
});

describe('formulário do pedido', () => {
  it('lê vários trabalhos e valida as datas de execução', () => {
    const f = new FormData();
    f.set('buildingId', 'b1');
    f.set('titulo', 'Fachadas 2027');
    f.set('tipoObra', 'fachadas');
    f.append('trabalhos', 'lavagem');
    f.append('trabalhos', 'pintura');
    f.set('execucaoDesde', '2027-05-01');
    f.set('execucaoAte', '2027-04-01');
    const r = parseRequest(f);
    expect(r.errors.execucaoAte).toBeDefined();
    f.set('execucaoAte', '2027-06-30');
    expect(parseRequest(f).value?.trabalhos).toEqual(['lavagem', 'pintura']);
  });
});

const base: SurfaceInput = {
  kind: 'fachada',
  descricao: null,
  origemQuantidade: 'estimativa',
  areaDireta: null,
  larguraCm: null,
  alturaCm: null,
  vaosCm2: null,
  quantidade: 1,
  origem: 'estimativa',
  trabalhos: null,
};

describe('área das superfícies', () => {
  it('largura × altura − vãos', () => {
    // 12 m × 15,5 m = 186 m², menos 24,5 m² de janelas = 161,5 m².
    expect(surfaceArea({ ...base, larguraCm: 1200, alturaCm: 1550, vaosCm2: 2450 })).toBe(16150);
  });

  it('a área direta prevalece e multiplica pela quantidade', () => {
    expect(surfaceArea({ ...base, areaDireta: 350, larguraCm: 1000, alturaCm: 1000, quantidade: 8 })).toBe(2800);
  });

  it('nunca é negativa', () => {
    expect(surfaceArea({ ...base, larguraCm: 100, alturaCm: 100, vaosCm2: 99_999 })).toBe(0);
  });

  it('formata em m² à portuguesa', () => {
    expect(formatArea(16150)).toBe('161,5 m²');
  });
});

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

describe('formulário de superfície', () => {
  it('aceita vírgula decimal', () => {
    const r = parseSurface(form({ kind: 'fachada', largura: '12', altura: '15,5', vaos: '24,5' }));
    expect(r.errors).toEqual({});
    expect(surfaceArea(r.value!)).toBe(16150);
  });

  it('exige área ou dimensões', () => {
    expect(parseSurface(form({ kind: 'fachada' })).errors.area).toBeDefined();
  });

  it('recusa mais de duas casas decimais e quantidade zero', () => {
    const r = parseSurface(form({ kind: 'muro', area: '10,123', quantidade: '0' }));
    expect(Object.keys(r.errors).sort()).toEqual(['area', 'quantidade']);
  });
});

describe('anonimato do texto', () => {
  it.each([
    ['Ligue para 912 345 678', 'um número de telefone'],
    ['Contacto: admin@condominio.pt', 'um email'],
    ['Prédio na Rua das Flores', 'uma morada'],
    ['Código 1200-195', 'um código postal'],
    ['Ver www.exemplo.pt', 'um endereço web'],
    ['Lote 12, junto ao parque', 'um número de porta ou lote'],
  ])('deteta em "%s"', (text, reason) => {
    expect(revealingContent(text)).toContain(reason);
  });

  it('um telemóvel conta só como telefone, não também como NIF', () => {
    expect(revealingContent('Contacte o 912345678.')).toEqual(['um número de telefone']);
    expect(revealingContent('NIF 123456789')).toEqual(['um NIF']);
  });

  it('apanha contactos disfarçados e pedidos para contornar a plataforma', () => {
    const r = revealingContent(
      'o meu contacto é nunomarujo@gmail ponto com\npode-me contactar diretamente para evitar comissão da aplicação\nde outro modo pode vir ao predio 45 do largo cidade da baía',
    );
    expect(r).toEqual(expect.arrayContaining(['um email', 'um pedido de contacto fora da plataforma', 'uma morada', 'um número de porta ou lote']));
    expect(revealingContent('fale comigo pelo WhatsApp')).toContain('um contacto fora da plataforma');
    expect(revealingContent('escreva para joao arroba sapo')).toContain('um email');
  });

  it('deixa passar uma descrição normal', () => {
    expect(
      revealingContent('Prédio de 6 pisos com fissuras na fachada norte e tinta a descascar nas varandas.'),
    ).toEqual([]);
  });
});

describe('publicação', () => {
  const ok = {
    descricao: 'Pintura das quatro fachadas e tetos das varandas; há fissuras na fachada norte.',
    prazoPropostas: '2026-11-01',
    zonas: [{ areaCm2: 16150, participacao: 'incluida' as const, origemDaQuantidade: 'medicao' as const, confirmacao: 'confirmada' as const }],
    today: '2026-10-19',
  };

  it('um pedido completo pode ser publicado', () => {
    expect(publishBlockers(ok)).toEqual([]);
  });

  it('também verifica as descrições das superfícies', () => {
    expect(publishBlockers({ ...ok, otherTexts: ['Fachada virada para a Avenida da Liberdade'] })).toHaveLength(1);
  });

  it('exige área, descrição sem contactos e pelo menos 7 dias para propostas', () => {
    const r = publishBlockers({ ...ok, zonas: [], descricao: 'Ligue 912345678 para visitar a obra hoje mesmo', prazoPropostas: '2026-10-22' });
    expect(r).toHaveLength(3);
  });
});

describe('fachadas: trabalhos iguais ou com diferenças', () => {
  it('o pedido lê o modo e recusa valores inválidos', () => {
    const f = new FormData();
    f.set('buildingId', 'x'); f.set('titulo', 't'); f.set('tipoObra', 'fachadas');
    expect(parseRequest(f).value?.trabalhosModo).toBe('iguais');
    f.set('trabalhosModo', 'diferencas');
    expect(parseRequest(f).value?.trabalhosModo).toBe('diferencas');
    f.set('trabalhosModo', 'x');
    expect(parseRequest(f).errors.trabalhosModo).toBeDefined();
  });
  it('a zona guarda os seus trabalhos, só os válidos', () => {
    const f = new FormData();
    f.set('kind', 'fachada'); f.set('area', '45');
    f.append('trabalhosZona', 'reparacao_fissuras'); f.append('trabalhosZona', 'pintura');
    expect(parseSurface(f).value?.trabalhos).toEqual(['reparacao_fissuras', 'pintura']);
    f.append('trabalhosZona', 'inventado');
    expect(parseSurface(f).errors.trabalhosZona).toBeDefined();
    const g = new FormData();
    g.set('kind', 'fachada'); g.set('area', '45');
    expect(parseSurface(g).value?.trabalhos).toBeNull();
  });
});

describe('contornar a plataforma sem contactos diretos', () => {
  it('apanha a loja, o ponto de referência e o preço mais barato por causa da app', () => {
    const msg = 'pode-me encontra a nossa loja ao laod do café Feijoada, na abelheira\nfaço-lhe mais barato porque a app quer muito dinheiro';
    const r = revealingContent(msg);
    expect(r).toContain('a localização da empresa');
    expect(r).toContain('um pedido de contacto fora da plataforma');
    expect(revealingContent('Ao lado do café fica a loja; ligue-me, sem passar pela app')).not.toEqual([]);
  });
  it('não bloqueia perguntas técnicas normais', () => {
    for (const t of [
      'Qual é a altura da fachada ao lado da varanda?',
      'O reboco junto às janelas está solto?',
      'Podem enviar fotografias do tardoz e da zona das caleiras?',
      'Preferem tinta acrílica ou elastomérica para as fissuras?',
      'A plataforma leva muito tempo a carregar as fotografias.',
    ]) {
      expect(revealingContent(t)).toEqual([]);
    }
  });
});

describe('as três dimensões de uma zona', () => {
  const z = (o: Partial<ZonaDoPedido> = {}): ZonaDoPedido => ({
    areaCm2: 10000,
    participacao: 'incluida',
    origemDaQuantidade: 'medicao',
    confirmacao: 'confirmada',
    ...o,
  });

  it('o total conta só as zonas incluídas', () => {
    const r = resumoDasZonas([z(), z({ participacao: 'excluida' }), z({ participacao: 'por_decidir' })]);
    expect(r.areaIncluidaCm2).toBe(10000);
    expect(r.incluidas).toBe(1);
    expect(r.excluidas).toBe(1);
    expect(r.porDecidir).toBe(1);
  });

  it('uma zona excluída conserva a área que tinha, e mesmo assim não conta', () => {
    // «Conserva dados anteriores, se existirem» (promotor, 30/10/2026): exclui-se uma zona sem lhe
    // apagar o que já se sabia dela.
    const r = resumoDasZonas([z({ participacao: 'excluida', areaCm2: 45000 })]);
    expect(r.areaIncluidaCm2).toBe(0);
  });

  it('por confirmar conta-se só nas incluídas: o que está fora não tem nada a confirmar', () => {
    const r = resumoDasZonas([
      z({ confirmacao: 'por_confirmar' }),
      z({ participacao: 'excluida', confirmacao: 'por_confirmar' }),
    ]);
    expect(r.porConfirmar).toBe(1);
  });

  it('uma estimativa é uma quantidade legítima, e não uma zona sem quantidade', () => {
    const r = resumoDasZonas([z({ origemDaQuantidade: 'estimativa', confirmacao: 'por_confirmar' })]);
    expect(r.semQuantidade).toBe(0);
    expect(r.porConfirmar).toBe(1);
  });

  it('as três dimensões são independentes: medir não é confirmar, e confirmar não é incluir', () => {
    const r = resumoDasZonas([z({ participacao: 'excluida', origemDaQuantidade: 'medicao', confirmacao: 'confirmada' })]);
    expect(r.incluidas).toBe(0);
    expect(r.excluidas).toBe(1);
  });
});

describe('as zonas e a publicação', () => {
  const base = {
    descricao: 'Pintura das quatro fachadas do prédio, com reparação de fissuras e primário.',
    prazoPropostas: '2026-11-30',
    today: '2026-10-30',
  };
  const inc = { areaCm2: 16150, participacao: 'incluida' as const, origemDaQuantidade: 'medicao' as const, confirmacao: 'confirmada' as const };

  it('uma zona excluída não serve de área do pedido', () => {
    const r = bloqueiosDaPublicacao({ ...base, zonas: [{ ...inc, participacao: 'excluida' }] });
    expect(r.map((x) => x.texto)).toContain('Indique pelo menos uma superfície com área.');
  });

  it('uma zona por decidir impede publicar, e o bloqueio é do cliente', () => {
    // Ninguém pode responder por ele se aquela fachada entra ou não.
    const r = bloqueiosDaPublicacao({ ...base, zonas: [inc, { ...inc, participacao: 'por_decidir' }] });
    const b = r.find((x) => x.texto.includes('por decidir'))!;
    expect(b).toBeDefined();
    expect(b.de).toBe('cliente');
  });

  it('duas por decidir dizem-se no plural, que é como se lê', () => {
    const r = bloqueiosDaPublicacao({
      ...base,
      zonas: [inc, { ...inc, participacao: 'por_decidir' }, { ...inc, participacao: 'por_decidir' }],
    });
    expect(r.some((x) => x.texto.includes('2 zonas por decidir'))).toBe(true);
  });

  it('uma estimativa por confirmar não impede publicar', () => {
    // Não é um número errado: é um número por confirmar, e os pintores veem-no como tal.
    const r = bloqueiosDaPublicacao({
      ...base,
      zonas: [{ ...inc, origemDaQuantidade: 'estimativa', confirmacao: 'por_confirmar' }],
    });
    expect(r).toEqual([]);
  });

  it('zonas excluídas à mistura não impedem publicar, desde que sobre uma incluída', () => {
    const r = bloqueiosDaPublicacao({ ...base, zonas: [inc, { ...inc, participacao: 'excluida' }] });
    expect(r).toEqual([]);
  });
});

describe('o contexto do pedido, em vez da contagem de caracteres', () => {
  const base = {
    prazoPropostas: '2026-11-30',
    today: '2026-10-30',
    zonas: [{ areaCm2: 16150, participacao: 'incluida' as const, origemDaQuantidade: 'medicao' as const, confirmacao: 'confirmada' as const }],
  };
  const falta = (r: { texto: string }[]) => r.some((x) => x.texto.includes('Diga o que pretende fazer'));

  it('uma descrição curta e clara publica: trinta caracteres não são uma medida de qualidade', () => {
    // «Pintar o prédio todo por fora» tem 29 caracteres e diz mais do que muitos parágrafos.
    expect(bloqueiosDaPublicacao({ ...base, descricao: 'Pintar o prédio todo por fora' })).toEqual([]);
  });

  it('sem descrição mas com trabalhos escolhidos, o pedido tem contexto', () => {
    const r = bloqueiosDaPublicacao({ ...base, descricao: '   ', trabalhos: ['pintura', 'reparacao_fissuras'] });
    expect(falta(r)).toBe(false);
  });

  it('sem descrição e sem trabalhos, não se sabe o que o cliente quer', () => {
    const r = bloqueiosDaPublicacao({ ...base, descricao: '', trabalhos: [] });
    expect(falta(r)).toBe(true);
    expect(r.find((x) => x.texto.includes('Diga o que pretende'))!.de).toBe('cliente');
  });

  it('nenhum bloqueio fala de caracteres', () => {
    const r = bloqueiosDaPublicacao({ ...base, descricao: '', trabalhos: [] });
    expect(r.map((x) => x.texto).join(' ')).not.toContain('caracteres');
  });
});
