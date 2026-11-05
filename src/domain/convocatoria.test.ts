import { describe, expect, it } from 'vitest';
import { CENTROS_DOS_CONCELHOS } from '../lib/centrosDosConcelhos';
import { DISTRITOS } from '../lib/concelhos';
import {
  REGRAS_DA_CONVOCATORIA as R,
  anel,
  distanciaKm,
  erroDoNifPessoal,
  motivosDeInelegibilidade,
  onda,
  proximoPasso,
  qualidade,
  soDaSegundaOnda,
  tamanhoDaOnda,
  textoDoConvite,
  type Candidato,
  type FichaDoAvaliador,
} from './convocatoria';
import { DESEMPENHO_INICIAL } from './avaliador';

// Uma quarta-feira às 10h de Lisboa (inverno, UTC+0).
const QUARTA_10H = new Date('2026-11-04T10:00:00Z');

const ficha = (o: Partial<FichaDoAvaliador> = {}): FichaDoAvaliador => ({
  userId: 'u1',
  orgId: 'o1',
  nipcDaEmpresa: '503504564',
  inscrito: true,
  confidencialidade: true,
  nomeCompleto: 'Cláudio Pereira',
  whatsapp: true,
  concelhoBase: 'Viana do Castelo',
  raioKm: 30,
  suspenso: false,
  emCurso: 0,
  ...o,
});

const cand = (userId: string, o: Partial<Candidato> = {}): Candidato => ({
  userId,
  anel: 0,
  avaliacoes: 5,
  media: 4,
  desempenho: { ...DESEMPENHO_INICIAL, qualificacaoGeral: 4 },
  inscritoEm: new Date('2026-11-01T00:00:00Z'),
  ultimaAtribuicao: null,
  ultimoIncumprimento: null,
  ...o,
});

describe('centros dos concelhos', () => {
  it('há um centro para cada concelho dos CTT, e nenhum a mais', () => {
    const nomes = DISTRITOS.flatMap((d) => d.concelhos).sort();
    expect(Object.keys(CENTROS_DOS_CONCELHOS).sort()).toEqual(nomes);
  });
  it('as distâncias batem com o mapa', () => {
    const d = distanciaKm(CENTROS_DOS_CONCELHOS['Viana do Castelo']!, CENTROS_DOS_CONCELHOS['Ponte de Lima']!);
    expect(d).toBeGreaterThan(10);
    expect(d).toBeLessThan(25);
    expect(distanciaKm(CENTROS_DOS_CONCELHOS['Lisboa']!, CENTROS_DOS_CONCELHOS['Porto']!)).toBeGreaterThan(260);
  });
  it('o Funchal fica na cidade, não no mar das Selvagens', () => {
    const [lat, lon] = CENTROS_DOS_CONCELHOS['Funchal']!;
    expect(lat).toBeGreaterThan(32.6);
    expect(lon).toBeLessThan(-16.8);
  });
});

describe('o NIF de quem recebe', () => {
  it('pede um NIF de pessoa singular válido', () => {
    expect(erroDoNifPessoal('')).toMatch(/indique o NIF pessoal/i);
    expect(erroDoNifPessoal('123456780')).toMatch(/não é válido/);
    expect(erroDoNifPessoal('503504564')).toMatch(/NIF de empresa/);
    expect(erroDoNifPessoal('123 456 789')).toBeNull();
  });
});

describe('condições para ser convidado', () => {
  it('com tudo em ordem, nada falta', () => {
    expect(motivosDeInelegibilidade(ficha())).toEqual([]);
  });
  it('cada falta diz o que fazer', () => {
    const m = motivosDeInelegibilidade(
      ficha({ nipcDaEmpresa: null, inscrito: false, confidencialidade: false, nomeCompleto: 'Cláudio', whatsapp: false, concelhoBase: null, raioKm: 20, suspenso: true, emCurso: 2 }),
    );
    expect(m).toHaveLength(9);
    expect(m.join(' ')).toMatch(/NIPC/);
    expect(m.join(' ')).toMatch(/nome completo/);
    expect(m.join(' ')).toMatch(/2 levantamentos em curso/);
  });
});

describe('anéis', () => {
  const C = CENTROS_DOS_CONCELHOS;
  it('o mesmo concelho é o anel 0, seja qual for o raio', () => {
    expect(anel('Viana do Castelo', 'Viana do Castelo', 15, C)).toBe(0);
  });
  it('um concelho vizinho cai no primeiro anel', () => {
    expect(anel('Viana do Castelo', 'Ponte de Lima', 30, C)).toBe(1);
  });
  it('nunca se convida para fora do raio que a própria pessoa declarou', () => {
    expect(anel('Viana do Castelo', 'Braga', 30, C)).toBeNull();
    expect(anel('Viana do Castelo', 'Braga', 60, C)).toBe(2);
    expect(anel('Viana do Castelo', 'Porto', 100, C)).toBe(3);
  });
  it('um concelho desconhecido não entra', () => {
    expect(anel('Viana do Castelo', 'Atlântida', 100, C)).toBeNull();
  });
});

describe('tamanho da onda', () => {
  it('metade, entre 3 e 5', () => {
    expect([1, 2, 3, 4, 6, 7, 10, 30].map((n) => tamanhoDaOnda(n))).toEqual([1, 2, 3, 3, 3, 4, 5, 5]);
  });
});

describe('quem é convidado', () => {
  it('10 em Viana: cinco na primeira onda, até dois deles novos', () => {
    const veteranos = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'].map((id, i) => cand(id, { desempenho: { ...DESEMPENHO_INICIAL, qualificacaoGeral: 5 - i * 0.5 } }));
    const novos = ['n1', 'n2', 'n3', 'n4'].map((id, i) => cand(id, { avaliacoes: 0, media: null, desempenho: DESEMPENHO_INICIAL, inscritoEm: new Date(Date.UTC(2026, 9, 10 + i)) }));
    const o = onda(1, [...novos, ...veteranos], QUARTA_10H);
    expect(o).toEqual(['v1', 'v2', 'v3', 'n1', 'n2']);
  });
  it('sem novos, os lugares deles vão para os outros; sem outros, para os novos', () => {
    expect(onda(1, ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => cand(id)), QUARTA_10H)).toHaveLength(3);
    const soNovos = ['a', 'b', 'c', 'd'].map((id) => cand(id, { avaliacoes: 1 }));
    expect(onda(1, soNovos, QUARTA_10H)).toHaveLength(3);
  });
  it('só se alarga o anel quando o concelho não chega para uma onda', () => {
    const muitosAqui = [cand('a'), cand('b'), cand('c'), cand('fora', { anel: 1 })];
    expect(onda(1, muitosAqui, QUARTA_10H)).not.toContain('fora');
    const poucosAqui = [cand('a'), cand('perto', { anel: 1 }), cand('longe', { anel: 2 }), cand('mais-longe', { anel: 3 })];
    expect(onda(1, poucosAqui, QUARTA_10H)).toEqual(['a', 'perto', 'longe']);
  });
  it('quem ganhou uma vaga nas últimas 24 h passa para trás de quem não ganhou', () => {
    const ontem = new Date(QUARTA_10H.getTime() - 3 * 3_600_000);
    const cs = [cand('rapido', { ultimaAtribuicao: ontem, desempenho: { ...DESEMPENHO_INICIAL, qualificacaoGeral: 5 } }), cand('b'), cand('c'), cand('d'), cand('e'), cand('f')];
    expect(onda(1, cs, QUARTA_10H)).not.toContain('rapido');
  });
  it('em empate de qualidade, primeiro quem está há mais tempo sem trabalho', () => {
    const cs = [
      cand('recente', { ultimaAtribuicao: new Date('2026-10-30T00:00:00Z') }),
      cand('antigo', { ultimaAtribuicao: new Date('2026-09-01T00:00:00Z') }),
      cand('nunca'),
    ];
    expect(onda(1, cs, QUARTA_10H)).toEqual(['nunca', 'antigo', 'recente']);
  });
  it('nota baixa ou incumprimento recente: fora da primeira onda, dentro da segunda', () => {
    const fraco = cand('fraco', { avaliacoes: 6, media: 2.5 });
    const faltou = cand('faltou', { ultimoIncumprimento: new Date(QUARTA_10H.getTime() - 2 * 86_400_000) });
    expect(soDaSegundaOnda(fraco, QUARTA_10H)).toBe(true);
    expect(soDaSegundaOnda(faltou, QUARTA_10H)).toBe(true);
    expect(soDaSegundaOnda(cand('x', { avaliacoes: 2, media: 1 }), QUARTA_10H)).toBe(false);
    expect(onda(1, [fraco, faltou, cand('a')], QUARTA_10H)).toEqual(['a']);
    expect(onda(2, [fraco, faltou], QUARTA_10H).sort()).toEqual(['faltou', 'fraco']);
  });
  it('sem ninguém, a onda vem vazia', () => {
    expect(onda(1, [], QUARTA_10H)).toEqual([]);
  });
});

describe('o tempo das ondas', () => {
  it('a primeira onda sai logo, em horário útil', () => {
    expect(proximoPasso(0, null, QUARTA_10H, true)).toEqual({ tipo: 'nova_onda', numero: 1 });
  });
  it('fora de horas espera pela abertura: ninguém ganha por estar acordado', () => {
    const noite = new Date('2026-11-04T22:00:00Z');
    expect(proximoPasso(0, null, noite, true)).toEqual({ tipo: 'aguardar', ate: null });
  });
  it('uma onda espera uma hora útil pelo «Aceito»', () => {
    const passo = proximoPasso(1, QUARTA_10H, new Date('2026-11-04T10:30:00Z'), true);
    expect(passo).toEqual({ tipo: 'aguardar', ate: new Date('2026-11-04T11:00:00Z') });
    expect(proximoPasso(1, QUARTA_10H, new Date('2026-11-04T11:00:00Z'), true)).toEqual({ tipo: 'nova_onda', numero: 2 });
  });
  it('a hora útil de uma onda das 17h30 só acaba às 9h30 do dia seguinte', () => {
    const tarde = new Date('2026-11-04T17:30:00Z');
    const passo = proximoPasso(1, tarde, new Date('2026-11-04T20:00:00Z'), true);
    expect(passo).toEqual({ tipo: 'aguardar', ate: new Date('2026-11-05T09:30:00Z') });
  });
  it('sem ninguém antes da primeira onda não se esgota: fica à espera do primeiro avaliador da zona', () => {
    expect(proximoPasso(0, null, QUARTA_10H, false)).toEqual({ tipo: 'sem_candidatos' });
    expect(proximoPasso(0, null, new Date('2026-11-04T22:00:00Z'), false)).toEqual({ tipo: 'sem_candidatos' });
  });
  it('ao fim de três ondas, ou sem mais ninguém, esgota-se', () => {
    expect(proximoPasso(R.maximoDeOndas, QUARTA_10H, new Date('2026-11-05T10:00:00Z'), true)).toEqual({ tipo: 'esgotada' });
    expect(proximoPasso(1, QUARTA_10H, new Date('2026-11-05T10:00:00Z'), false)).toEqual({ tipo: 'esgotada' });
  });
});

describe('qualidade', () => {
  it('é a posição na banda de comissão: a meio sem avaliações', () => {
    expect(qualidade(DESEMPENHO_INICIAL)).toBeCloseTo(50, 0);
    expect(qualidade({ qualificacaoGeral: 5, notaInformacao: 5, respostaAtempada: true, notaCliente: 5 })).toBe(100);
  });
});

describe('o texto do convite', () => {
  it('diz só o concelho, nunca a morada', () => {
    const t = textoDoConvite('Viana do Castelo', 'fachada de prédio, cerca de 420 m²');
    expect(t).toContain('Viana do Castelo');
    expect(t).not.toMatch(/\btu\b|\bvocê\b/i);
  });
});
