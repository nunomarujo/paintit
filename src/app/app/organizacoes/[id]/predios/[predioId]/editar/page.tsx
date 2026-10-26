import Link from 'next/link';
import { notFound } from 'next/navigation';
import { updateBuildingIdentity } from '@/app/app/actions';
import { canManage, myRole } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';
import { BuildingForm } from '../../novo/BuildingForm';
import { Characteristics } from './Characteristics';
import { Needs } from './Needs';

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
    <div className="max-w-2xl">
      <Link href={`/app/organizacoes/${org.id}`} className="text-[17px] text-slate-600 hover:underline">
        ← {org.nome}
      </Link>
      <h1 className="mt-3 text-[26px] leading-tight font-semibold">{building.nome_interno}</h1>
      <p className="mt-1 text-[17px] text-slate-600">Ficha do prédio. As características gravam-se à medida que escreve.</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <Characteristics
          orgId={org.id}
          buildingId={building.id}
          initial={building}
          areaAproximadaCm2={extra?.area_aproximada_cm2 ?? null}
          semAreaAproximada={colunasPorAplicar}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        {colunasPorAplicar ? (
          <>
            <h2 className="font-semibold">Que obras quer fazer neste prédio</h2>
            <p className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[17px] text-amber-900">
              Os campos desta secção não existem nesta base de dados. Falta aplicar a migração
              <code>20261024034142_obras_pretendidas_no_predio.sql</code>. Assim que o for, aparece aqui a lista de
              obras e o convite a pedir orçamentos.
            </p>
          </>
        ) : (
          <Needs orgId={org.id} buildingId={building.id} iniciais={extra?.obras_pretendidas ?? []} />
        )}
      </div>

      {/* A morada fica no formulário com gravação explícita: é validada contra o código postal real, e
          não se pode gravar a meio de ser escrita (ver saveBuildingCharacteristic). */}
      <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <summary className="cursor-pointer font-semibold">Identificação e morada</summary>
        <p className="mt-1 text-[17px] text-slate-600">
          Estes dados são confirmados contra o código postal, por isso guardam-se de uma vez, com o botão.
        </p>
        <div className="mt-4">
          <BuildingForm
            action={updateBuildingIdentity.bind(null, org.id, building.id)}
            defaultKind={building.tipo}
            initial={building}
            semCaracteristicas
          />
        </div>
      </details>
    </div>
  );
}
