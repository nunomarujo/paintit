import { describe, expect, it } from 'vitest';
import { agruparPorTema, melhoresMensagens, principaisLacunas, type EntradaDoDossier } from './crmDossier';

const e = (o: Partial<EntradaDoDossier>): EntradaDoDossier => ({ perfil: 'pintor', zonaId: 'z1', tema: 'propostas sem resposta', tipo: 'dor', evidencias: 1, cobertura: 0, ...o });

describe('dossier', () => {
  it('agrupa o mesmo tema entre perfis e zonas, sem distinguir maiúsculas', () => {
    const [t] = agruparPorTema([e({}), e({ perfil: 'administradora', zonaId: 'z2', tema: 'Propostas sem resposta', evidencias: 2 })]);
    expect(t).toMatchObject({ evidencias: 3, zonas: 2, perfis: ['administradora', 'pintor'] });
    expect(t!.peso).toBe(3 * (2 + 2 - 1));
  });
  it('um tema partilhado pesa mais do que um isolado com as mesmas evidências', () => {
    const ts = agruparPorTema([
      e({ tema: 'A' }),
      e({ tema: 'A' }),
      e({ tema: 'B' }),
      e({ tema: 'B', perfil: 'fornecedor', zonaId: 'z2' }),
    ]);
    expect(ts.map((t) => t.tema)).toEqual(['B', 'A']);
  });
  it('mensagem forte = dor comum que a plataforma resolve; lacuna = dor comum por resolver', () => {
    const ts = agruparPorTema([
      e({ tema: 'resolvida', cobertura: 3, evidencias: 4 }),
      e({ tema: 'por resolver', cobertura: 0, evidencias: 4 }),
    ]);
    expect(melhoresMensagens(ts)[0]!.tema).toBe('resolvida');
    expect(principaisLacunas(ts)[0]!.tema).toBe('por resolver');
    expect(principaisLacunas(ts).map((t) => t.tema)).not.toContain('resolvida');
  });
  it('um acerto conta como mensagem mesmo sem dor associada', () => {
    const ts = agruparPorTema([e({ tema: 'contrato na plataforma', tipo: 'acerto', cobertura: 3 })]);
    expect(melhoresMensagens(ts)[0]!.mensagem).toBeGreaterThan(0);
  });
  it('sem entradas, sem temas', () => expect(agruparPorTema([])).toEqual([]));
});
