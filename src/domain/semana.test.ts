import { describe, expect, it } from 'vitest';
import { formatEuros } from './money';
import { resumoDaSemana, type DadosDaSemana } from './semana';

const vazio: DadosDaSemana = { emAtraso: [], aVencer: [], orcamentosAEspera: [], documentosACaducar: [], pro: true };
const hoje = '2026-11-02';

describe('resumoDaSemana', () => {
  it('sem matéria não se envia nada', () => {
    expect(resumoDaSemana(vazio, hoje)).toEqual({ linhas: [], vazio: true });
  });

  it('o que está na rua vem com o total e a idade do mais antigo', () => {
    const r = resumoDaSemana(
      { ...vazio, emAtraso: [{ valorCents: 240_000, prevista: '2026-10-20' }, { valorCents: 60_000, prevista: '2026-10-28' }] },
      hoje,
    );
    // Pelo formatador, não por uma cópia à mão: o separador de milhares é um espaço fino.
    expect(r.linhas[0]).toContain(formatEuros(300_000));
    expect(r.linhas[0]).toContain('13 dias');
  });

  it('um dia só não vem no plural', () => {
    const r = resumoDaSemana({ ...vazio, emAtraso: [{ valorCents: 100_00, prevista: '2026-11-01' }] }, hoje);
    expect(r.linhas[0]).toContain('há 1 dia.');
  });

  it('as linhas de zero não aparecem — é o que impede o email de ser apagado sem abrir', () => {
    const r = resumoDaSemana({ ...vazio, aVencer: [{ valorCents: 50_000, prevista: '2026-11-05' }] }, hoje);
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas.join(' ')).not.toContain('Na rua');
    expect(r.linhas.join(' ')).not.toContain('Orçamentos');
  });

  it('cada documento a caducar tem a sua linha, com a data', () => {
    const r = resumoDaSemana(
      { ...vazio, documentosACaducar: [{ nome: 'Seguro de acidentes de trabalho', validoAte: '2026-11-20' }] },
      hoje,
    );
    expect(r.linhas[0]).toBe('Caduca a 20/11/2026: Seguro de acidentes de trabalho.');
  });

  it('a linha do Pro só aparece a quem não o tem, e só quando havia trabalho a fazer', () => {
    const comTrabalho = { ...vazio, pro: false, orcamentosAEspera: [{ enviadoEm: '2026-10-25' }] };
    expect(resumoDaSemana(comTrabalho, hoje).linhas.at(-1)).toContain('plano Pro');

    // Só documentos a caducar não é trabalho que o Pro faria: não se vende nada.
    const semTrabalho = { ...vazio, pro: false, documentosACaducar: [{ nome: 'Alvará', validoAte: '2026-11-10' }] };
    expect(resumoDaSemana(semTrabalho, hoje).linhas.join(' ')).not.toContain('plano Pro');

    // E a quem já é Pro nunca se vende nada.
    const jaPro = { ...comTrabalho, pro: true };
    expect(resumoDaSemana(jaPro, hoje).linhas.join(' ')).not.toContain('plano Pro');
  });
});
