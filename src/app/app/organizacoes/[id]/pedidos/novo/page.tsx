import { escolhivel, loadReferences } from '@/lib/reference';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createRequest } from '@/app/app/pedidos/actions';
import { RequestForm } from '@/app/app/pedidos/RequestForm';
import { getUser } from '@/lib/supabase/server';
import { Voltar } from '@/components/Voltar';

export default async function NewRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ predio?: string }>;
}) {
  const { id } = await params;
  const { predio } = await searchParams;
  const { supabase } = await getUser();
  const [{ data: org }, { data: buildings }] = await Promise.all([
    supabase.from('organizations').select('id, nome, kind').eq('id', id).maybeSingle(),
    supabase.from('buildings').select('id, nome_interno').eq('org_id', id).order('nome_interno'),
  ]);
  if (!org) notFound();

  // Gestora de condomínios: ela própria nunca é parte do contrato (quem assina e é faturado é o
  // condomínio, com o NIPC dele), por isso o pedido não se cria aqui — escolhe-se primeiro o
  // condomínio. Até 24/10/2026 esta página dava 404 para a gestora, e não havia caminho nenhum para
  // iniciar um pedido a partir dela (relatado pelo promotor).
  if (org.kind === 'administradora') {
    const { data: managed } = await supabase.from('organizations').select('id, nome, localidade').eq('gerida_por', id).order('nome');
    const ids = (managed ?? []).map((c) => c.id);
    const { data: bs } = ids.length
      ? await supabase.from('buildings').select('id, org_id, nome_interno, concelho').in('org_id', ids).order('nome_interno')
      : { data: [] };
    return (
      <div className="max-w-2xl">
        <Voltar href={`/app/organizacoes/${org.id}`}>{org.nome}</Voltar>
        <h1 className="mt-3 text-[26px] leading-tight font-semibold">Novo pedido de orçamento</h1>
        <p className="mt-2 text-[17px] text-slate-600">
          Escolha o condomínio a que a obra diz respeito. O pedido, o contrato e a fatura ficam em nome desse
          condomínio — não da gestora.
        </p>
        <div className="mt-6 space-y-4">
          {(managed ?? []).map((c) => {
            const own = (bs ?? []).filter((b) => b.org_id === c.id);
            return (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 text-[17px]">
                <p className="font-semibold">{c.nome}</p>
                {c.localidade && <p className="text-slate-500">{c.localidade}</p>}
                {own.length > 0 ? (
                  <ul className="mt-3 space-y-1">
                    {own.map((b) => (
                      <li key={b.id}>
                        <Link
                          href={`/app/organizacoes/${c.id}/pedidos/novo?predio=${b.id}`}
                          className="inline-flex min-h-[44px] items-center font-medium text-tinta-700 hover:underline"
                        >
                          {b.nome_interno}
                          {b.concelho ? ` · ${b.concelho}` : ''}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3">
                    Sem prédio registado.{' '}
                    <Link href={`/app/organizacoes/${c.id}/predios/novo`} className="font-medium text-tinta-700 hover:underline">
                      Registar o prédio
                    </Link>{' '}
                    (morada completa, frações, pisos) para poder pedir orçamento.
                  </p>
                )}
              </div>
            );
          })}
          <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-[17px]">
            O condomínio não está na lista?{' '}
            <Link href={`/app/organizacoes/nova?tipo=condominio&gerida_por=${org.id}`} className="font-medium text-tinta-700 hover:underline">
              Criar novo condomínio sob administração
            </Link>{' '}
            — pede-se a designação e o NIPC do condomínio e, a seguir, a ficha do prédio.
          </p>
        </div>
      </div>
    );
  }

  if (org.kind !== 'condominio' && org.kind !== 'particular') notFound();

  const list = buildings ?? [];
  // O prédio vindo da ficha fica pré-selecionado (primeiro da lista).
  const ordered = [...list.filter((b) => b.id === predio), ...list.filter((b) => b.id !== predio)];

  return (
    <div className="max-w-2xl">
      <Voltar href={`/app/organizacoes/${org.id}`}>{org.nome}</Voltar>
      <h1 className="mt-3 text-[26px] leading-tight font-semibold">Novo pedido de orçamento</h1>
      <p className="mt-2 text-[17px] text-slate-600">
        Passo 1 de 3 — o essencial da obra. As superfícies, as áreas e as fotografias vêm a seguir, e podem
        ficar a cargo de um avaliador.
      </p>

      {/* Canvas «Espaço do cliente» (01/11/2026): a ajuda gratuita cabe numa linha. O bloco de
          texto que aqui estava desde 24/10/2026 explicava a visita antes de o pedido existir — cedo
          de mais para quem ainda só quer dizer o que pretende. O pedido de ajuda abre-se sozinho ao
          criar o pedido (gatilho `work_requests_create_survey`); o detalhe fica no próprio pedido. */}
      <p className="mt-4 flex items-start gap-3 rounded-lg bg-tinta-50 px-4 py-3 text-[15px] text-slate-700">
        <span aria-hidden className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tinta-600 text-[13px] font-bold text-white">
          ✓
        </span>
        <span>
          <span className="font-semibold text-tinta-900">Não precisa de saber medir.</span> Um avaliador pode visitar a
          obra e preencher as medidas e as fotografias, sem custo e sem compromisso. Decide-se a seguir, no pedido.
        </span>
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        {ordered.length === 0 ? (
          <p className="text-[17px]">
            Registe primeiro o prédio.{' '}
            <Link href={`/app/organizacoes/${org.id}/predios/novo`} className="text-tinta-700 hover:underline">
              Adicionar prédio
            </Link>
          </p>
        ) : (
          <RequestForm action={createRequest.bind(null, org.id)} buildings={ordered} references={(await loadReferences(supabase)).map(escolhivel)} />
        )}
      </div>
    </div>
  );
}
