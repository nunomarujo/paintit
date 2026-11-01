import { SemEmpresa } from '@/components/vendas/SemEmpresa';
import { pertencaDoFornecedor } from '@/lib/fornecedor';
import { ReserveButton } from '@/app/app/levantamentos/ReserveButton';
import { referenciaDoLevantamento } from '@/domain/referencias';
import { quandoCurto } from '@/domain/contagem';
import { getUser } from '@/lib/supabase/server';

/**
 * Oportunidades — os pedidos abertos na zona coberta, à espera de quem os aceite.
 *
 * Tinham o seu lugar no topo de uma página que também era a lista do trabalho próprio, a cobertura
 * geográfica e os pagamentos. Aqui estão sozinhos, que é o que são: o que se *pode* aceitar.
 *
 * Quem aceita é a pessoa, não a empresa: o botão aparece a qualquer vendedor da empresa, e não só ao
 * responsável. O ecrã antigo só o mostrava a proprietários e gestores — um avaliador entrava e não via
 * maneira nenhuma de aceitar trabalho, embora a base sempre lho tenha permitido.
 */
export default async function OportunidadesPage() {
  const { supabase, user } = await getUser();

  const pertenca = await pertencaDoFornecedor(supabase, user!);
  // «Ainda não pertenço a nenhuma empresa» e «fui convidado e não aceitei» não são erros: são
  // estados por resolver, cada um com a sua ação. Antes, isto era um 404 (01/11/2026).
  if (pertenca.tipo === 'sem_empresa') return <SemEmpresa convites={pertenca.convites} />;

  const { data: abertos } = await supabase
    .from('request_surveys')
    .select('id, numero, created_at')
    .eq('status', 'aberto')
    .order('created_at');

  // A pré-visualização devolve concelho e tipo de obra, e só a quem cobre a zona: o que fica de fora
  // fica de fora porque não é para esta pessoa (regra 6).
  const naZona = (
    await Promise.all(
      (abertos ?? []).map(async (s) => ({
        ...s,
        zona: (await supabase.rpc('survey_preview', { p_survey_id: s.id })).data?.[0] ?? null,
      })),
    )
  ).filter((s) => s.zona);

  const agora = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">Oportunidades</h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Pedidos de avaliação abertos nos concelhos que cobre. O primeiro a aceitar fica com o levantamento,
          e o prazo de contacto começa a contar nesse momento.
        </p>
      </div>

      {naZona.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-[20px] font-semibold text-slate-900">Nenhuma oportunidade de momento</h2>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
            Só aparecem aqui os pedidos dos concelhos cobertos. Alargar a cobertura faz chegar mais trabalho.
          </p>
        </section>
      ) : (
        <ul>
          {naZona.map((s) => {
            const q = quandoCurto(agora, new Date(s.created_at));
            return (
              <li
                key={s.id}
                className="flex min-h-[44px] flex-col gap-3 border-t border-slate-200 px-2 py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-900">
                    {referenciaDoLevantamento(s.numero)} · {s.zona!.concelho}
                  </span>
                  <span className="block text-[15px] text-slate-600">
                    {s.zona!.tipo_obra} · aberta desde {q.dia.toLowerCase()}, {q.hora}
                  </span>
                </span>
                <ReserveButton surveyId={s.id} orgId={pertenca.orgId} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
