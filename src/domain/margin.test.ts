import { describe, expect, it } from 'vitest';
import { avisoDePreco, historico, margemDaObra, type ObraConcluida } from './margin';

const obra = (over: Partial<ObraConcluida> = {}): ObraConcluida => ({
  id: Math.random().toString(36).slice(2),
  nome: 'Obra',
  valorCents: 1_000_000, // 10 000 €
  areaCm2: 100_000, // 1000 m²
  custosDiretos: 300_000,
  maoDeObra: 500_000,
  horas: 40_000,
  fim: '2026-09-30',
  ...over,
});

describe('margem de uma obra', () => {
  it('dá a margem em euros, em percentagem e por m²', () => {
    const m = margemDaObra(obra());
    expect(m.custo).toBe(800_000);
    expect(m.margem).toBe(200_000);
    expect(m.margemBps).toBe(2_000);
    expect(m.custoPorM2).toBe(800);
    expect(m.precoPorM2).toBe(1_000);
  });

  it('sem área não inventa um preço por m²', () => {
    const m = margemDaObra(obra({ areaCm2: null }));
    expect(m.custoPorM2).toBeNull();
    expect(m.precoPorM2).toBeNull();
    expect(m.margem).toBe(200_000);
  });

  it('sem horas registadas, a margem é alta por mentira e diz-se que não é fiável', () => {
    const m = margemDaObra(obra({ maoDeObra: 0, horas: 0 }));
    expect(m.margemBps).toBe(7_000);
    expect(m.fiavel).toBe(false);
    expect(margemDaObra(obra()).fiavel).toBe(true);
  });
});

describe('histórico da empresa', () => {
  it('não conta obras sem área nem obras sem horas', () => {
    const h = historico([obra(), obra({ areaCm2: null }), obra({ horas: 0 })]);
    expect(h.obras).toBe(1);
  });

  it('a média é ponderada pela área: uma obra pequena não pesa como uma grande', () => {
    // 1000 m² a 8 €/m² de custo, e 100 m² a 20 €/m². Ponderada: (800000 + 200000) / 1100 = 9,09 €/m².
    const h = historico([
      obra(),
      obra({ areaCm2: 10_000, valorCents: 300_000, custosDiretos: 100_000, maoDeObra: 100_000 }),
    ]);
    expect(h.custoMedioPorM2).toBe(909);
    expect(h.obras).toBe(2);
  });

  it('mostra a dispersão, não só a média', () => {
    const h = historico([obra(), obra({ custosDiretos: 500_000 })]);
    expect(h.minimoPorM2).toBe(800);
    expect(h.maximoPorM2).toBe(1_000);
  });

  it('abaixo de três obras avisa que ainda não chega', () => {
    expect(historico([obra(), obra()]).suficiente).toBe(false);
    expect(historico([obra(), obra(), obra()]).suficiente).toBe(true);
  });

  it('sem nenhuma obra útil não devolve médias nenhumas', () => {
    const h = historico([obra({ horas: 0 })]);
    expect(h).toMatchObject({ obras: 0, custoMedioPorM2: null, suficiente: false });
  });
});

describe('aviso a quem está a orçamentar', () => {
  const h = historico([obra(), obra(), obra()]); // custo médio 8 €/m²

  it('cala-se enquanto o histórico não chegar', () => {
    expect(avisoDePreco(historico([obra()]), 1_000)).toBeNull();
  });

  it('avisa quando o preço fica abaixo do custo das obras dele', () => {
    expect(avisoDePreco(h, 700)).toContain('abaixo');
  });

  it('avisa quando a folga é pequena de mais para um imprevisto', () => {
    expect(avisoDePreco(h, 900)).toContain('11%');
  });

  it('cala-se quando a margem é confortável', () => {
    expect(avisoDePreco(h, 1_200)).toBeNull();
  });
});
