import { notFound } from 'next/navigation';
import { CoverageForm } from '@/app/app/levantamentos/Forms';
import { mandaNaEmpresa } from '@/domain/workspaceFornecedor';
import { getUser } from '@/lib/supabase/server';
import { Disponibilidade } from './Formulario';

/**
 * Disponibilidade e alertas — onde se diz quando se está e por onde se quer ser avisado.
 *
 * A cobertura geográfica vivia a meio da página dos levantamentos, entre a lista de trabalho e os
 * pagamentos; e a suspensão de presença não existia de todo. Juntam-se aqui porque respondem à mesma
 * pergunta: quando e onde é que esta pessoa recebe trabalho.
 *
 * A cobertura é da empresa (um concelho coberto vale para todos os seus avaliadores) e só o responsável
 * a altera; a presença e os alertas são da pessoa, e mais ninguém os vê.
 */
export default async function DisponibilidadePage() {
  const { supabase, user } = await getUser();

  const { data: memberships } = await supabase
    .from('org_members')
    .select('org_id, role, organizations!inner(kind)')
    .eq('user_id', user!.id)
    .eq('organizations.kind', 'fornecedor');
  const meu = (memberships ?? []).find((m) => ['proprietario', 'gestor', 'vendedor'].includes(m.role));
  if (!meu) notFound();
  const responsavel = mandaNaEmpresa(meu.role as 'proprietario' | 'gestor' | 'vendedor');

  const [{ data: minha }, { data: cobertura }] = await Promise.all([
    supabase.from('survey_availability').select('suspenso_ate, alerta_email').eq('user_id', user!.id).maybeSingle(),
    supabase.from('supplier_survey_coverage').select('concelhos').eq('org_id', meu.org_id).maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[34px] font-bold leading-[1.15] tracking-[-0.025em] text-slate-900">
          Disponibilidade e alertas
        </h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Quando está disponível para receber levantamentos, e por onde quer ser avisada.
        </p>
      </div>

      <section aria-labelledby="presenca" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 id="presenca" className="text-[20px] font-semibold text-slate-900">
          A sua presença
        </h2>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Só a própria pessoa vê e altera isto. Férias e ausências não são assunto da empresa.
        </p>
        <div className="mt-4">
          <Disponibilidade suspensoAte={minha?.suspenso_ate ?? null} alertaEmail={minha?.alerta_email ?? true} />
        </div>
      </section>

      <section aria-labelledby="zonas" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 id="zonas" className="text-[20px] font-semibold text-slate-900">
          Zonas cobertas pela empresa
        </h2>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Concelhos onde a empresa tem avaliadores. Vazio: todo o país. Só aparecem oportunidades destes
          concelhos.
        </p>
        {responsavel ? (
          <div className="mt-4">
            <CoverageForm orgId={meu.org_id} initial={cobertura?.concelhos ?? []} />
          </div>
        ) : (
          <>
            <ul className="mt-4 flex flex-wrap gap-2">
              {(cobertura?.concelhos ?? []).length === 0 ? (
                <li className="text-[17px] text-slate-600">Todo o país.</li>
              ) : (
                (cobertura?.concelhos ?? []).map((c) => (
                  <li key={c} className="rounded-lg bg-marca-tag px-3 py-1.5 text-[15px] text-slate-800">
                    {c}
                  </li>
                ))
              )}
            </ul>
            <p className="mt-3 max-w-[54ch] text-[15px] text-slate-600">
              Para alargar a zona, falar com o responsável da empresa.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
