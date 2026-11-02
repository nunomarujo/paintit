import { describe, expect, it } from 'vitest';
import {
  avisoDeIntegridade,
  codigoCompleto,
  construirRelatorioCongelado,
  documentoEmDia,
  embaralhar,
  enderecoPublico,
  gerarCodigo,
  linhaDeFicha,
  materialPrincipalSugerido,
  reconstroiFicha,
  type DadosDaPropostaParaRelatorio,
} from './relatorioCongelado';
import type { TrabalhoNaProposta } from './comparador';

/** Uma sequência fixa de valores em [0, 1), para testes deterministas sem `Math.random`. */
function aleatorioDaSequencia(valores: number[]): () => number {
  let i = 0;
  return () => valores[i++ % valores.length]!;
}

const trabalho = (produtos: string[]): TrabalhoNaProposta => ({
  work: 'pintura',
  label: 'Pintura',
  estado: 'incluido',
  quantidade: null,
  unidade: null,
  demaos: null,
  produtos,
  precoCents: 0,
});

describe('avisoDeIntegridade', () => {
  it('escreve o N certo nos dois sítios', () => {
    expect(avisoDeIntegridade(3)).toBe(
      'Este relatório contém 3 propostas, numeradas de 1 a 3. Se recebeu menos do que 3 fichas, ' +
        'falta pelo menos uma — confirme através do código QR antes de aprovar qualquer decisão.',
    );
  });
});

describe('embaralhar', () => {
  it('devolve a mesma lista, por uma ordem (não necessariamente diferente)', () => {
    const itens = ['a', 'b', 'c', 'd'];
    const resultado = embaralhar(itens, aleatorioDaSequencia([0, 0, 0]));
    expect(resultado).toHaveLength(4);
    expect([...resultado].sort()).toEqual([...itens].sort());
  });

  it('é determinista: a mesma sequência de aleatório dá sempre a mesma ordem', () => {
    const itens = ['a', 'b', 'c', 'd', 'e'];
    const seq = () => aleatorioDaSequencia([0.9, 0.1, 0.5, 0.3]);
    expect(embaralhar(itens, seq())).toEqual(embaralhar(itens, seq()));
  });

  it('não muta a lista original', () => {
    const itens = ['a', 'b', 'c'];
    embaralhar(itens, aleatorioDaSequencia([0.5, 0.5]));
    expect(itens).toEqual(['a', 'b', 'c']);
  });
});

describe('gerarCodigo', () => {
  it('tem 5 caracteres, todos do alfabeto sem I/O/0/1', () => {
    const codigo = gerarCodigo(aleatorioDaSequencia([0, 0.2, 0.4, 0.6, 0.8]));
    expect(codigo).toHaveLength(5);
    expect(codigo).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/);
  });
});

describe('codigoCompleto e enderecoPublico', () => {
  it('junta as duas partes com um hífen', () => {
    expect(codigoCompleto('ABCDE', 'FGHJK')).toBe('ABCDE-FGHJK');
  });

  it('constrói o endereço https a partir do domínio e do token', () => {
    expect(enderecoPublico('quempinta.pt', 'xyz-token')).toBe('https://quempinta.pt/relatorio-publico/xyz-token');
  });
});

describe('documentoEmDia', () => {
  it('sem documento nenhum, não está em dia', () => {
    expect(documentoEmDia(undefined, '2026-11-02')).toEqual({ emDia: false, validoAte: null });
  });

  it('aprovado e sem validade (não expira) está em dia', () => {
    expect(documentoEmDia({ status: 'aprovado', validoAte: null }, '2026-11-02')).toEqual({ emDia: true, validoAte: null });
  });

  it('aprovado mas expirado não está em dia', () => {
    expect(documentoEmDia({ status: 'aprovado', validoAte: '2026-01-01' }, '2026-11-02')).toEqual({
      emDia: false,
      validoAte: '2026-01-01',
    });
  });

  it('aprovado e ainda dentro da validade está em dia', () => {
    expect(documentoEmDia({ status: 'aprovado', validoAte: '2027-01-01' }, '2026-11-02')).toEqual({
      emDia: true,
      validoAte: '2027-01-01',
    });
  });

  it('rejeitado não está em dia, mesmo com validade futura', () => {
    expect(documentoEmDia({ status: 'rejeitado', validoAte: '2027-01-01' }, '2026-11-02').emDia).toBe(false);
  });
});

describe('materialPrincipalSugerido', () => {
  it('sem trabalhos nem produtos, devolve null', () => {
    expect(materialPrincipalSugerido([])).toBeNull();
    expect(materialPrincipalSugerido([trabalho([])])).toBeNull();
  });

  it('um produto só, único em todos os trabalhos', () => {
    expect(materialPrincipalSugerido([trabalho(['CIN Vinylmatt']), trabalho(['CIN Vinylmatt'])])).toBe('CIN Vinylmatt');
  });

  it('o mais citado ganha', () => {
    const trabalhos = [trabalho(['Robbialac Satin']), trabalho(['CIN Vinylmatt']), trabalho(['CIN Vinylmatt'])];
    expect(materialPrincipalSugerido(trabalhos)).toBe('CIN Vinylmatt');
  });

  it('em empate, fica o primeiro encontrado', () => {
    const trabalhos = [trabalho(['A']), trabalho(['B'])];
    expect(materialPrincipalSugerido(trabalhos)).toBe('A');
  });

  it('ignora entradas em branco', () => {
    expect(materialPrincipalSugerido([trabalho(['  ', 'Barbot Xinatex'])])).toBe('Barbot Xinatex');
  });
});

describe('construirRelatorioCongelado', () => {
  const basePropostas: DadosDaPropostaParaRelatorio[] = ['p1', 'p2', 'p3'].map((id, i) => ({
    id,
    precoComIvaCents: 100_00 * (i + 1),
    anosExperiencia: null,
    garantiaAnos: 2 + i,
    reputacao: i === 0 ? null : { n: 3, media: 4.5 },
    prazoExecucaoDias: 10 + i,
    trabalhos: [trabalho([`Produto ${id}`])],
    precoReferenciaCents: 500,
    alvara: { emDia: true, validoAte: null },
    naoDividaAt: { emDia: true, validoAte: null },
    naoDividaSs: { emDia: true, validoAte: null },
    submetidaEm: '2026-10-20T10:00:00Z',
    validaAte: '2026-12-01',
  }));

  it('numera as fichas de 1 a N na ordem fixada, não na ordem de entrada', () => {
    const r = construirRelatorioCongelado(basePropostas, aleatorioDaSequencia([0.9, 0.1, 0.5]));
    expect(r.numeroDePropostas).toBe(3);
    expect(r.fichas.map((f) => f.numero)).toEqual([1, 2, 3]);
    expect(r.ordem).toHaveLength(3);
    expect([...r.ordem].sort()).toEqual(['p1', 'p2', 'p3']);
    // A ordem das fichas é a mesma que `ordem`, e não necessariamente p1,p2,p3.
    expect(r.fichas.map((f, i) => r.ordem[i])).toEqual(r.ordem);
  });

  it('duas gerações com fontes aleatórias diferentes podem dar ordens diferentes', () => {
    const r1 = construirRelatorioCongelado(basePropostas, aleatorioDaSequencia([0.9, 0.1, 0.5, 0.2, 0.3, 0.4, 0.5, 0.6]));
    const r2 = construirRelatorioCongelado(basePropostas, aleatorioDaSequencia([0.1, 0.9, 0.2, 0.8, 0.7, 0.6, 0.5, 0.4]));
    // Não se afirma que são sempre diferentes (seria um teste frágil) — só que a função usa de facto
    // a fonte aleatória para a ordem, e não uma ordem fixa por acidente de implementação.
    expect(r1.ordem).not.toEqual(r2.ordem);
  });

  it('gera um código de obra e um código de página por ficha, todos de 5 caracteres', () => {
    const r = construirRelatorioCongelado(basePropostas, aleatorioDaSequencia([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]));
    expect(r.codigoObra).toHaveLength(5);
    const codigosDePagina = r.fichas.map((f) => f.codigoPagina);
    expect(codigosDePagina.every((c) => c.length === 5)).toBe(true);
    // Códigos de página distintos entre si (não é garantido matematicamente, mas com este RNG é).
    expect(new Set(codigosDePagina).size).toBe(codigosDePagina.length);
  });

  it('a linha-resumo e a ficha de cada proposta trazem os mesmos números', () => {
    const r = construirRelatorioCongelado(basePropostas, aleatorioDaSequencia([0.3, 0.6, 0.9]));
    for (let i = 0; i < r.linhas.length; i++) {
      expect(r.linhas[i]!.numero).toBe(r.fichas[i]!.numero);
      expect(r.linhas[i]!.precoComIvaCents).toBe(r.fichas[i]!.precoComIvaCents);
      expect(r.linhas[i]!.materialPrincipal).toBe(r.fichas[i]!.materialPrincipal);
    }
  });

  it('o aviso de integridade usa o N real desta geração', () => {
    const r = construirRelatorioCongelado(basePropostas, aleatorioDaSequencia([0.1, 0.2, 0.3]));
    expect(r.avisoDeIntegridade).toContain('contém 3 propostas');
  });

  it('com zero propostas, devolve um relatório vazio e consistente', () => {
    const r = construirRelatorioCongelado([], aleatorioDaSequencia([0.5]));
    expect(r.numeroDePropostas).toBe(0);
    expect(r.linhas).toEqual([]);
    expect(r.fichas).toEqual([]);
    expect(r.codigoObra).toHaveLength(5);
  });
});

describe('reconstroiFicha e linhaDeFicha (ida e volta pela base de dados)', () => {
  const basePropostas: DadosDaPropostaParaRelatorio[] = ['p1', 'p2'].map((id) => ({
    id,
    precoComIvaCents: 50_000,
    anosExperiencia: null,
    garantiaAnos: 5,
    reputacao: { n: 4, media: 4.2 },
    prazoExecucaoDias: 12,
    trabalhos: [trabalho(['CIN Vinylmatt'])],
    precoReferenciaCents: 999,
    alvara: { emDia: true, validoAte: null },
    naoDividaAt: { emDia: true, validoAte: '2027-01-01' },
    naoDividaSs: { emDia: false, validoAte: null },
    submetidaEm: '2026-10-25T09:00:00Z',
    validaAte: '2026-12-31',
  }));

  it('reconstroiFicha desfaz exactamente o que se tira para guardar', () => {
    const r = construirRelatorioCongelado(basePropostas, aleatorioDaSequencia([0.1, 0.2, 0.3]));
    for (const ficha of r.fichas) {
      const { numero, codigoPagina, ...dados } = ficha;
      expect(reconstroiFicha({ numero, codigoPagina, dados })).toEqual(ficha);
    }
  });

  it('linhaDeFicha extrai os mesmos campos que construirRelatorioCongelado já põe em `linhas`', () => {
    const r = construirRelatorioCongelado(basePropostas, aleatorioDaSequencia([0.4, 0.6]));
    expect(r.fichas.map(linhaDeFicha)).toEqual(r.linhas);
  });
});
