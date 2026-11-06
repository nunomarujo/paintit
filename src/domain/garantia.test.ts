import { describe, expect, it } from 'vitest';
import { calcularGarantia, estadoDaConclusao, inicioDaGarantia, passosPossiveis, somarMeses, type PassoRegistado } from './garantia';

const p = (o: Partial<PassoRegistado>): PassoRegistado => ({ lado: 'pintor', passo: 'declarou', dataConclusao: '2026-11-01', criadoEm: '2026-11-02T10:00:00Z', ...o });
const agora = new Date('2026-11-05T10:00:00Z');

describe('conclusão da obra', () => {
  it('sem declaração, só se pode declarar', () => {
    const e = estadoDaConclusao([], agora);
    expect(e.estado).toBe('por_declarar');
    expect(passosPossiveis(e, 'cliente')).toEqual(['declarou']);
  });

  it('declarada por uma parte: a outra confirma, discorda ou junta prova', () => {
    const e = estadoDaConclusao([p({})], agora);
    expect(e.estado).toBe('por_confirmar');
    expect(passosPossiveis(e, 'cliente')).toEqual(['confirmou', 'discordou', 'juntou_prova']);
    expect(passosPossiveis(e, 'pintor')).not.toContain('confirmou');
  });

  it('a garantia só começa com a confirmação da outra parte — nunca com a do próprio', () => {
    expect(inicioDaGarantia(estadoDaConclusao([p({}), p({ passo: 'confirmou', criadoEm: '2026-11-03T10:00:00Z', dataConclusao: null })], agora))).toBeNull();
    const ok = estadoDaConclusao([p({}), p({ lado: 'cliente', passo: 'confirmou', criadoEm: '2026-11-03T10:00:00Z', dataConclusao: null })], agora);
    expect(ok.estado).toBe('confirmada');
    expect(inicioDaGarantia(ok)).toBe('2026-11-01');
  });

  it('sem resposta em 15 dias: «declarada por uma só parte», sem início da garantia', () => {
    const e = estadoDaConclusao([p({})], new Date('2026-11-18T10:00:00Z'));
    expect(e.estado).toBe('uma_parte');
    expect(inicioDaGarantia(e)).toBeNull();
    expect(passosPossiveis(e, 'pintor')).toContain('juntou_prova');
  });

  it('a discordância fica registada; uma nova declaração recomeça', () => {
    const contestada = estadoDaConclusao([p({}), p({ lado: 'cliente', passo: 'discordou', dataConclusao: null, criadoEm: '2026-11-03T10:00:00Z' })], agora);
    expect(contestada.estado).toBe('contestada');
    const nova = estadoDaConclusao(
      [p({}), p({ lado: 'cliente', passo: 'discordou', dataConclusao: null, criadoEm: '2026-11-03T10:00:00Z' }), p({ dataConclusao: '2026-11-04', criadoEm: '2026-11-04T10:00:00Z' })],
      agora,
    );
    expect(nova).toMatchObject({ estado: 'por_confirmar', dataConclusao: '2026-11-04' });
  });
});

describe('garantia e conservação', () => {
  it('fim da garantia = início + anos; conservação = mais 24 meses', () => {
    expect(calcularGarantia('2026-11-01', 2)).toEqual({ inicio: '2026-11-01', anos: 2, fimDaGarantia: '2028-11-01', fimDaConservacao: '2030-11-01' });
  });
  it('29 de fevereiro cai no último dia do mês', () => {
    expect(somarMeses('2028-02-29', 12)).toBe('2029-02-28');
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28');
  });
  it('sem início ou sem a duração como número, não se inventa', () => {
    expect(calcularGarantia(null, 2)).toBeNull();
    expect(calcularGarantia('2026-11-01', null)).toBeNull();
  });
});
