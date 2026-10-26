import Link from 'next/link';
import { AVISO_DIAS, VALIDADE_MESES, type LinhaDossier, type ResumoDossier } from '@/domain/dossier';

const dataPt = (iso: string) => iso.split('-').reverse().join('/');

/**
 * O cofre de documentos da empresa, no topo das obras.
 *
 * Fechado quando está tudo em ordem, aberto sozinho quando há algo a resolver — é um alarme diário,
 * não uma página de configuração, e por isso vive aqui e não na ficha da entidade. Usa `<details>`,
 * que abre e fecha sem JavaScript nenhum.
 *
 * Disciplina de cor: o bloco fechado não tem cor nenhuma; dentro dele, o que falta ou caducou é texto
 * âmbar ou vermelho, sem fundo. Um documento caducado é facto consumado — é o único vermelho.
 */
export function Dossier({ linhas, resumo, orgId }: { linhas: LinhaDossier[]; resumo: ResumoDossier; orgId: string }) {
  return (
    <details open={resumo.abrir} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5">
        <span>
          <span className="eyebrow">Dossiê da empresa</span>
          <span className="mt-0.5 block text-[17px] text-slate-700">{resumo.resumo}</span>
        </span>
        <span className="shrink-0 text-[15px] font-semibold text-tinta-700">
          <span className="dossier-abrir">Abrir</span>
          <span className="dossier-fechar">Fechar</span>
        </span>
      </summary>

      <div className="border-t border-slate-200 px-5 py-4">
        <p className="text-[15px] leading-snug text-slate-600">
          Refazer este dossiê a cada adjudicação é o que faz perder obra. As declarações de não dívida às Finanças e à
          Segurança Social valem três meses; aqui ficam guardadas e avisadas {AVISO_DIAS} dias antes de caducarem.
        </p>

        <ul className="mt-3 divide-y divide-slate-100">
          {linhas.map((l) => (
            <li key={l.kind} className="flex items-baseline justify-between gap-4 py-2">
              <span className="min-w-0">
                <span className="text-[17px] font-semibold text-slate-900">{l.label}</span>
                <span className="block text-[15px] leading-snug text-slate-500">
                  {l.porque}
                  {VALIDADE_MESES[l.kind] ? ` Vale ${VALIDADE_MESES[l.kind]} meses.` : ''}
                </span>
              </span>
              <span className="shrink-0 text-right text-[15px]">
                {l.estado === 'caducado' ? (
                  <Link href={`/app/organizacoes/${orgId}#documentos`} className="font-semibold text-red-700 underline underline-offset-4">
                    Caducou em {dataPt(l.validoAte!)} — substituir
                  </Link>
                ) : l.estado === 'a_caducar' ? (
                  <Link href={`/app/organizacoes/${orgId}#documentos`} className="font-semibold text-amber-800 underline underline-offset-4">
                    Caduca em {l.dias} {l.dias === 1 ? 'dia' : 'dias'} — renovar
                  </Link>
                ) : l.estado === 'em_falta' ? (
                  <Link href={`/app/organizacoes/${orgId}#documentos`} className="font-semibold text-tinta-700 underline underline-offset-4">
                    Enviar
                  </Link>
                ) : l.estado === 'por_validar' ? (
                  <span className="text-slate-500">À espera de validação</span>
                ) : (
                  <span className="text-slate-500">{l.validoAte ? `Até ${dataPt(l.validoAte)}` : 'Em ordem'}</span>
                )}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Link href={`/app/organizacoes/${orgId}#documentos`} className="btn-secondary">
            Gerir documentos
          </Link>
          <p className="text-[15px] text-slate-500">
            Desde Outubro de 2026, nas obras públicas é a própria entidade que vai buscar as certidões de não dívida —
            basta a situação estar regularizada nas Finanças e na Segurança Social.
          </p>
        </div>
      </div>
    </details>
  );
}
