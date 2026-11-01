import { notFound } from 'next/navigation';
import { LinhaDeLevantamento } from '@/components/avaliacoes/LinhaDeLevantamento';
import { getUser } from '@/lib/supabase/server';
import { osMeusLevantamentos } from '../dados';

/**
 * Os meus levantamentos — a lista completa, separada de «Hoje».
 *
 * Antes, oportunidades, levantamentos, cobertura geográfica e pagamentos vinham empilhados numa página só.
 * Cada um tem agora o seu sítio; aqui está só o trabalho da pessoa, por urgência, com a referência, o
 * concelho, o estado, a próxima obrigação e o prazo que conta.
 */
export default async function OsMeusLevantamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const { ver } = await searchParams;
  const { supabase, user } = await getUser();

  const { data: memberships } = await supabase
    .from('org_members')
    .select('role, organizations!inner(kind)')
    .eq('user_id', user!.id)
    .eq('organizations.kind', 'fornecedor');
  if (!(memberships ?? []).some((m) => ['proprietario', 'gestor', 'vendedor'].includes(m.role))) notFound();

  const { emCurso, concluidos } = await osMeusLevantamentos(supabase, user!.id);
  const aba = ver === 'concluidos' ? 'concluidos' : 'em_curso';
  const lista = aba === 'concluidos' ? concluidos : emCurso;
  const agoraIso = new Date().toISOString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[34px] font-bold leading-[1.15] tracking-[-0.025em] text-slate-900">Os meus levantamentos</h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Os levantamentos que aceitou, por urgência. Só os seus: a empresa não vê o trabalho pessoal de cada
          avaliador.
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {(
          [
            ['em_curso', 'Em curso', emCurso.length, '/app/avaliacoes/levantamentos'],
            ['concluidos', 'Concluídos', concluidos.length, '/app/avaliacoes/levantamentos?ver=concluidos'],
          ] as const
        ).map(([chave, texto, n, href]) => (
          <a
            key={chave}
            href={href}
            aria-current={aba === chave ? 'page' : undefined}
            className={`inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap border-b-2 px-3 text-[17px] ${
              aba === chave
                ? 'border-tinta-600 font-semibold text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {texto}
            {n > 0 && (
              <span
                className={`rounded-full px-1.5 text-[13px] font-semibold ${
                  aba === chave ? 'bg-tinta-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {n}
              </span>
            )}
          </a>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="max-w-[54ch] text-[17px] text-slate-600">
          {aba === 'concluidos'
            ? 'Ainda não entregou nenhum levantamento.'
            : 'Nenhum levantamento em curso. As oportunidades na sua zona aparecem em «Oportunidades».'}
        </p>
      ) : (
        <ul>
          {lista.map((l) => (
            <LinhaDeLevantamento key={l.id} l={l} agoraIso={agoraIso} />
          ))}
        </ul>
      )}
    </div>
  );
}
