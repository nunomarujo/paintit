import { describe, expect, it } from 'vitest';
import { dossier, dossierPronto, resumirDossier, type DocExistente } from './dossier';

const HOJE = '2026-10-25';
const d = (kind: DocExistente['kind'], validoAte: string | null, status = 'aprovado'): DocExistente => ({ kind, status, validoAte });

const completo: DocExistente[] = [
  d('certidao_permanente', '2027-03-01'),
  d('alvara_impic', '2027-06-30'),
  d('seguro_acidentes_trabalho', '2027-01-15'),
  d('seguro_responsabilidade_civil', '2027-01-15'),
  d('declaracao_nao_divida_at', '2026-12-20'),
  d('declaracao_nao_divida_ss', '2026-12-20'),
];

describe('cofre de documentos', () => {
  it('com tudo válido e longe de caducar, está em ordem e o bloco fica fechado', () => {
    const r = resumirDossier(dossier(completo, HOJE));
    expect(r.emOrdem).toBe(6);
    expect(r.abrir).toBe(false);
    expect(dossierPronto(r)).toBe(true);
  });

  it('avisa 15 dias antes, e não antes disso', () => {
    const quinze = dossier([...completo.slice(1), d('certidao_permanente', '2026-11-09')], HOJE);
    expect(quinze.find((l) => l.kind === 'certidao_permanente')!.estado).toBe('a_caducar');
    const dezasseis = dossier([...completo.slice(1), d('certidao_permanente', '2026-11-10')], HOJE);
    expect(dezasseis.find((l) => l.kind === 'certidao_permanente')!.estado).toBe('em_ordem');
  });

  it('um documento fora de prazo é facto consumado, não aviso', () => {
    const l = dossier([...completo.slice(1), d('certidao_permanente', '2026-10-24')], HOJE);
    const linha = l.find((x) => x.kind === 'certidao_permanente')!;
    expect(linha.estado).toBe('caducado');
    expect(linha.dias).toBe(-1);
    expect(dossierPronto(resumirDossier(l))).toBe(false);
  });

  it('substituir um documento não deixa o antigo a disparar o alarme', () => {
    const l = dossier([...completo.slice(1), d('certidao_permanente', '2026-10-01'), d('certidao_permanente', '2027-10-01')], HOJE);
    expect(l.find((x) => x.kind === 'certidao_permanente')!.estado).toBe('em_ordem');
  });

  it('quem tem certificado do IMPIC não vê o alvará como em falta', () => {
    const l = dossier([...completo.filter((x) => x.kind !== 'alvara_impic'), d('certificado_impic', null)], HOJE);
    expect(l.some((x) => x.kind === 'alvara_impic')).toBe(false);
    expect(l.find((x) => x.kind === 'certificado_impic')!.estado).toBe('em_ordem');
  });

  it('um documento submetido mas ainda não validado não conta como em ordem', () => {
    const l = dossier([...completo.slice(1), d('certidao_permanente', '2027-01-01', 'submetido')], HOJE);
    expect(l.find((x) => x.kind === 'certidao_permanente')!.estado).toBe('por_validar');
    expect(resumirDossier(l).abrir).toBe(true);
  });

  it('no primeiro dia está tudo por enviar', () => {
    const r = resumirDossier(dossier([], HOJE));
    expect(r.emFalta).toBe(6);
    expect(r.resumo).toBe('6 por enviar');
    expect(r.abrir).toBe(true);
  });

  it('o resumo diz quantos dias faltam ao que caduca primeiro', () => {
    const l = dossier([...completo.slice(2), d('certidao_permanente', '2026-11-03'), d('alvara_impic', '2026-10-30')], HOJE);
    expect(resumirDossier(l).resumo).toContain('caducam em 5 dias');
  });
});
