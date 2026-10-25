import { DOC_KIND_LABELS, DOC_KIND_WHY, type DocKind } from './organization';

// Cofre de documentos da empresa de pintura (25/10/2026, docs/DECISOES.md).
//
// O dossiê administrativo é refeito a cada adjudicação e quase sempre com um documento fora de prazo:
// as declarações de não dívida às Finanças e à Segurança Social valem 3 meses e ninguém controla os
// prazos. Perder uma adjudicação por causa disso é o desperdício mais evitável do sector, e é esta
// função que o evita — avisa 15 dias antes, que é tempo de pedir uma certidão nova.

/** Dias de antecedência do aviso. Tempo suficiente para obter certidões novas sem correrias. */
export const AVISO_DIAS = 15;

/** Quanto tempo valem as declarações de não dívida, para o ecrã o poder dizer sem o pintor perguntar. */
export const VALIDADE_MESES: Partial<Record<DocKind, number>> = {
  declaracao_nao_divida_at: 3,
  declaracao_nao_divida_ss: 3,
};

export type EstadoDoc = 'em_ordem' | 'a_caducar' | 'caducado' | 'por_validar' | 'em_falta';

export interface LinhaDossier {
  kind: DocKind;
  label: string;
  porque: string;
  estado: EstadoDoc;
  /** Dias até caducar; negativo já caducou; null quando não tem validade ou não existe. */
  dias: number | null;
  validoAte: string | null;
}

/** Documentos que uma empresa de pintura tem de ter prontos para ser aceite numa adjudicação. */
export const DOSSIER_PINTOR: DocKind[] = [
  'certidao_permanente',
  'alvara_impic',
  'seguro_acidentes_trabalho',
  'seguro_responsabilidade_civil',
  'declaracao_nao_divida_at',
  'declaracao_nao_divida_ss',
];

const diasAte = (validoAte: string, hoje: string) =>
  Math.round((Date.parse(`${validoAte}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000);

export interface DocExistente {
  kind: DocKind;
  status: string;
  validoAte: string | null;
}

/**
 * O estado de cada documento do dossiê, hoje.
 *
 * O alvará e o certificado do IMPIC são alternativos: ter um deles basta, e por isso quem tem
 * certificado não vê o alvará marcado como em falta. Um documento sem data de validade conta como em
 * ordem — não se inventa uma caducidade que o documento não declara.
 */
export function dossier(docs: DocExistente[], hoje: string): LinhaDossier[] {
  const temCertificado = docs.some((d) => d.kind === 'certificado_impic' && d.status === 'aprovado');

  return DOSSIER_PINTOR.filter((k) => !(k === 'alvara_impic' && temCertificado))
    .concat(temCertificado ? ['certificado_impic'] : [])
    .map((kind) => {
      const existentes = docs.filter((d) => d.kind === kind && d.status !== 'rejeitado');
      // O que vale mais é sempre o que caduca mais tarde: substituir um documento não deve deixar o
      // antigo a disparar o alarme.
      const melhor = existentes.sort((a, b) => (b.validoAte ?? '9999').localeCompare(a.validoAte ?? '9999'))[0];
      const base = { kind, label: DOC_KIND_LABELS[kind], porque: DOC_KIND_WHY[kind] };

      if (!melhor) return { ...base, estado: 'em_falta' as const, dias: null, validoAte: null };
      if (melhor.status !== 'aprovado') return { ...base, estado: 'por_validar' as const, dias: null, validoAte: melhor.validoAte };
      if (!melhor.validoAte) return { ...base, estado: 'em_ordem' as const, dias: null, validoAte: null };

      const dias = diasAte(melhor.validoAte, hoje);
      const estado: EstadoDoc = dias < 0 ? 'caducado' : dias <= AVISO_DIAS ? 'a_caducar' : 'em_ordem';
      return { ...base, estado, dias, validoAte: melhor.validoAte };
    });
}

export interface ResumoDossier {
  emOrdem: number;
  total: number;
  caducados: number;
  aCaducar: number;
  emFalta: number;
  porValidar: number;
  /** O bloco abre sozinho quando há algo a resolver; fechado quando está tudo em ordem. */
  abrir: boolean;
  /** Uma linha para o cabeçalho, sem obrigar a abrir o bloco. */
  resumo: string;
}

export function resumirDossier(linhas: LinhaDossier[]): ResumoDossier {
  const conta = (e: EstadoDoc) => linhas.filter((l) => l.estado === e).length;
  const caducados = conta('caducado');
  const aCaducar = conta('a_caducar');
  const emFalta = conta('em_falta');
  const porValidar = conta('por_validar');
  const emOrdem = conta('em_ordem');

  const partes: string[] = [];
  if (emOrdem > 0) partes.push(`${emOrdem} em ordem`);
  if (porValidar > 0) partes.push(`${porValidar} por validar`);
  if (emFalta > 0) partes.push(`${emFalta} por enviar`);
  if (aCaducar > 0) {
    const proximo = linhas.filter((l) => l.estado === 'a_caducar').sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0))[0]!;
    partes.push(`${aCaducar === 1 ? '1 caduca' : `${aCaducar} caducam`} em ${proximo.dias} ${proximo.dias === 1 ? 'dia' : 'dias'}`);
  }
  if (caducados > 0) partes.push(`${caducados} ${caducados === 1 ? 'caducado' : 'caducados'}`);

  return {
    emOrdem,
    total: linhas.length,
    caducados,
    aCaducar,
    emFalta,
    porValidar,
    abrir: caducados + aCaducar + emFalta + porValidar > 0,
    resumo: partes.join(' · ') || 'Nada por enviar',
  };
}

/** O dossiê pode ser enviado a um cliente quando não falta nada nem há nada caducado. */
export const dossierPronto = (r: ResumoDossier): boolean => r.caducados === 0 && r.emFalta === 0;
