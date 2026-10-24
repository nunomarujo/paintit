import { describe, expect, it } from 'vitest';
import { podeConcluir, surveyPendings } from './surveyPendings';

const cheio = {
  superficies: [
    { id: 's1', label: 'Fachada principal', areaCm2: 420_00 },
    { id: 's2', label: 'Varandas', areaCm2: 80_00 },
  ],
  fotografias: 3,
};

describe('o que falta no levantamento', () => {
  it('nada falta quando há superfícies medidas e fotografias', () => {
    expect(surveyPendings(cheio)).toEqual([]);
    expect(podeConcluir(surveyPendings(cheio))).toBe(true);
  });

  it('aponta a superfície por medir pelo nome', () => {
    const p = surveyPendings({ ...cheio, superficies: [cheio.superficies[0]!, { id: 's2', label: 'Fachada de tardoz', areaCm2: 0 }] });
    expect(p).toHaveLength(1);
    expect(p[0]?.texto).toBe('Fachada de tardoz: falta a área.');
    expect(p[0]?.ancora).toBe('superficies');
  });

  it('sem fotografias, diz porque é que isso é um problema', () => {
    const p = surveyPendings({ ...cheio, fotografias: 0 });
    expect(p.map((x) => x.id)).toEqual(['sem-fotos']);
    expect(p[0]?.texto).toContain('às cegas');
  });

  it('sem superfícies nenhumas, é a primeira coisa a dizer', () => {
    const p = surveyPendings({ superficies: [], fotografias: 2 });
    expect(p[0]?.id).toBe('sem-superficies');
  });

  it('o esclarecimento por responder vem à frente de tudo: tem prazo a correr', () => {
    const p = surveyPendings({ ...cheio, fotografias: 0, esclarecimentoPorResponder: true });
    expect(p[0]?.id).toBe('esclarecimento');
  });

  it('não se conclui com pendências', () => {
    expect(podeConcluir(surveyPendings({ superficies: [], fotografias: 0 }))).toBe(false);
  });

  it('cada pendência tem identificador próprio', () => {
    const p = surveyPendings({
      superficies: [
        { id: 'a', label: 'A', areaCm2: 0 },
        { id: 'b', label: 'B', areaCm2: 0 },
      ],
      fotografias: 0,
    });
    expect(new Set(p.map((x) => x.id)).size).toBe(p.length);
  });
});
