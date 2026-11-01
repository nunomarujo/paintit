import { notFound } from 'next/navigation';
import { updateBuildingIdentity } from '@/app/app/actions';
import { canManage, myRole } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';
import { BuildingForm } from '../../novo/BuildingForm';
import { Characteristics } from './Characteristics';
import { Needs } from './Needs';
import { Voltar } from '@/components/Voltar';

export default async function EditBuildingPage({ params }: { params: Promise<{ id: string; predioId: string }> }) {
  const { id, predioId } = await params;
  const { supabase, user } = await getUser();
  const [{ data: org }, { data: building }] = await Promise.all([
    supabase.from('organizations').select('id, nome, gerida_por').eq('id', id).maybeSingle(),
    supabase.from('buildings').select('*').eq('id', predioId).eq('org_id', id).maybeSingle(),
  ]);
  if (!org || !building || !canManage(await myRole(supabase, user!.id, org))) notFound();

  // Obras pretendidas e área aproximada (migração 20261024034142, aplicada a 24/10/2026). A leitura fica
  // numa consulta própria, com o erro tratado, como rede de segurança: se um dia estas colunas faltarem
  // (base nova, reposição), a página mostra o aviso em vez de rebentar. Foi assim que nasceu o bug do
  // "Nova entidade" — código em produção a escrever uma coluna que ainda não existia na base real.
  const { data: extra, error: extraErro } = await supabase
    .from('buildings')
    .select('obras_pretendidas, area_aproximada_cm2')
    .eq('id', predioId)
    .maybeSingle();
  const colunasPorAplicar = !!extraErro;

  return (
    <div>
      <Voltar href={`/app/organizacoes/${org.id}`}>{org.nome}</Voltar>
      <h1 className="mt-3 text-[26px] leading-tight font-semibold">{building.nome_interno}</h1>
      <p className="mt-1 text-[17px] text-slate-600">Ficha do prédio. As características gravam-se à medida que escreve.</p>

      {/* Grelha por função (promotor, 01/11/2026): características à esquerda, obras pretendidas à
          direita; a identificação e morada em baixo, recolhida, porque muda raramente. */}
      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7">
          <h2 className="text-[17px] font-semibold text-tinta-900">Características</h2>
          <div className="mt-4">
            <Characteristics
              orgId={org.id}
              buildingId={building.id}
              initial={building}
              areaAproximadaCm2={extra?.area_aproximada_cm2 ?? null}
              semAreaAproximada={colunasPorAplicar}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5">
          <h2 className="text-[17px] font-semibold text-tinta-900">Que obras quer fazer</h2>
          <div className="mt-4">
            {colunasPorAplicar ? (
              <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[17px] text-amber-900">
                Os campos desta secção não existem nesta base de dados. Falta aplicar a migração
                <code>20261024034142_obras_pretendidas_no_predio.sql</code>. Assim que o for, aparece aqui a lista de
                obras e o convite a pedir orçamentos.
              </p>
            ) : (
              <Needs orgId={org.id} buildingId={building.id} iniciais={extra?.obras_pretendidas ?? []} />
            )}
          </div>
        </section>

        {/* A morada fica no formulário com gravação explícita: é validada contra o código postal real, e
            não se pode gravar a meio de ser escrita (ver saveBuildingCharacteristic). */}
        <details className="rounded-2xl border border-slate-200 bg-white px-5 lg:col-span-12">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 py-3">
            <span className="text-[17px] font-semibold text-tinta-900">Identificação e morada</span>
            <span className="ml-auto text-[13px] text-slate-500">Abrir para editar</span>
          </summary>
          <p className="text-[15px] text-slate-600">
            Estes dados são confirmados contra o código postal, por isso guardam-se de uma vez, com o botão.
          </p>
          <div className="mt-4 pb-5">
            <BuildingForm action={updateBuildingIdentity.bind(null, org.id, building.id)} defaultKind={building.tipo} initial={building} semCaracteristicas />
          </div>
        </details>
      </div>
    </div>
  );
}
