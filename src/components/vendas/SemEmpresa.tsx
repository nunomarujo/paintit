import Link from 'next/link';
import { acceptInvitation } from '@/app/app/actions';

/**
 * O estado de quem ainda não pertence a nenhuma empresa fornecedora (01/11/2026).
 *
 * Antes era um 404. Um avaliador acabado de registar — ou convidado e ainda por aceitar — entrava no
 * workspace e batia numa página de erro em todos os ecrãs, sem nada que lhe dissesse o que fazer a
 * seguir. Um estado por resolver não é um erro: tem nome, tem razão e tem ação.
 */

export type ConvitePendente = {
  id: string;
  orgNome: string | null;
  papel: string;
  expiraEm: string;
};

const PAPEL: Record<string, string> = {
  proprietario: 'responsável',
  gestor: 'gestor',
  vendedor: 'avaliador',
  financeiro: 'financeiro',
  leitor: 'leitor',
};

export function SemEmpresa({ convites }: { convites: ConvitePendente[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[34px] font-bold leading-[1.15] tracking-[-0.025em] text-slate-900">
          {convites.length > 0 ? 'Associação por aceitar' : 'Ainda sem empresa'}
        </h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          {convites.length > 0
            ? 'Foi convidado para uma empresa. Enquanto não aceitar, não chegam oportunidades nem levantamentos.'
            : 'Esta área é para quem trabalha numa empresa de tintas. Sem empresa, não há oportunidades a receber.'}
        </p>
      </div>

      {/* Uma só banda com fundo de cor por ecrã, e no topo (regra 13). Âmbar: resolve-se. */}
      {convites.length > 0 ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
          <p className="text-[17px] font-semibold text-amber-900">
            {convites.length === 1 ? 'Um convite à sua espera' : `${convites.length} convites à sua espera`}
          </p>
          <p className="mt-1 max-w-[54ch] text-[17px] text-amber-900">
            Aceitar liga a conta à empresa. O papel já vem definido por quem convidou.
          </p>
        </section>
      ) : null}

      {convites.length > 0 ? (
        <ul>
          {convites.map((c) => (
            <li
              key={c.id}
              className="flex min-h-[44px] flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-2 py-3 first:border-t-0"
            >
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900">{c.orgNome ?? 'Uma empresa'}</span>
                <span className="block text-[15px] text-slate-600">
                  como {PAPEL[c.papel] ?? c.papel} · válido até{' '}
                  {new Date(c.expiraEm).toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon' })}
                </span>
              </span>
              <form action={acceptInvitation.bind(null, c.id)}>
                <button type="submit" className="btn-primary">
                  Aceitar
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-[20px] font-semibold text-slate-900">Como ficar ligado a uma empresa</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[17px] text-slate-700">
            <li>
              Pedir ao responsável da empresa que envie um convite para o email desta conta. O convite aparece
              aqui assim que for enviado.
            </li>
            <li>Se a empresa ainda não está na plataforma, pode registá-la e ficar como responsável.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/app/organizacoes/nova" className="btn-primary">
              Registar a empresa
            </Link>
            <Link href="/app" className="btn-secondary">
              Voltar ao início
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
