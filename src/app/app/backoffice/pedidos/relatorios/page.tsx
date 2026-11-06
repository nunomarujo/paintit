import { getUser } from '@/lib/supabase/server';
import { EmitirRelatorio } from './EmitirRelatorio';

const MOTIVOS: Record<string, string> = { litigio: 'Litígio', disputa_de_consumo: 'Disputa de consumo', outro: 'Outro' };
const dt = (iso: string) => new Date(iso).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });

// Relatórios do percurso negocial (06/11/2026): os pedidos dos clientes, à espera de confirmação e emissão,
// e os relatórios já emitidos. Gratuitos. O relatório não se altera depois de emitido; emitir outra vez é
// uma versão nova.
export default async function RelatoriosDoPercurso() {
  const { supabase } = await getUser();
  const [{ data: pedidos }, { data: emitidos }] = await Promise.all([
    supabase.from('pedidos_de_relatorio').select('*').order('pedido_em', { ascending: false }).limit(100),
    supabase.from('relatorios_do_percurso').select('id, request_id, pedido_id, destinatario, versao, sha256, emitido_em').order('emitido_em', { ascending: false }).limit(100),
  ]);
  const requestIds = [...new Set([...(pedidos ?? []).map((p) => p.request_id), ...(emitidos ?? []).map((e) => e.request_id)])];
  const orgIds = [...new Set((pedidos ?? []).map((p) => p.org_id))];
  const [{ data: reqs }, { data: orgs }] = await Promise.all([
    requestIds.length ? supabase.from('work_requests').select('id, ref, titulo').in('id', requestIds) : Promise.resolve({ data: [] }),
    orgIds.length ? supabase.from('organizations').select('id, nome').in('id', orgIds) : Promise.resolve({ data: [] }),
  ]);
  const refDe = (id: string) => reqs?.find((r) => r.id === id)?.ref ?? id.slice(0, 8);
  const entregue = (pedidoId: string) => (emitidos ?? []).some((e) => e.pedido_id === pedidoId);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-[20px] font-semibold">Pedidos dos clientes</h2>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Antes de entregar, a aplicação confirma que quem pediu é, hoje, pessoa da entidade que fez o pedido ou da empresa contratada. Sem custo.
          A versão do dono da obra vai sem o que a plataforma cobra ao pintor e sem a identidade dos pintores que não ganharam; a do empreiteiro,
          sem o que a plataforma lhe cobrou e sem as outras propostas.
        </p>
        {(pedidos ?? []).length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200 px-4 py-3 text-[17px] text-slate-600">Não há pedidos de relatório.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {(pedidos ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="text-[17px]">
                  Obra {refDe(p.request_id)} · {p.lado === 'pintor' ? 'empreiteiro' : 'dono da obra'}: {orgs?.find((o) => o.id === p.org_id)?.nome ?? 'Entidade'} · {MOTIVOS[p.motivo] ?? p.motivo}
                  <span className="block text-[15px] text-slate-600">
                    Pedido a {dt(p.pedido_em)}
                    {p.nota ? ` · «${p.nota}»` : ''}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  {entregue(p.id) && <span className="text-[15px] text-slate-600">Entregue</span>}
                  <EmitirRelatorio requestId={p.request_id} destinatario={p.lado === 'pintor' ? 'pintor' : 'cliente'} pedidoId={p.id} rotulo={entregue(p.id) ? 'Emitir nova versão' : 'Confirmar e entregar'} />
                  <EmitirRelatorio requestId={p.request_id} destinatario="backoffice" pedidoId={null} rotulo="Versão completa" />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-[20px] font-semibold">Emitidos</h2>
        {(emitidos ?? []).length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200 px-4 py-3 text-[17px] text-slate-600">Ainda não foi emitido nenhum relatório.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {(emitidos ?? []).map((e) => (
              <li key={e.id} className="px-4 py-3 text-[17px]">
                Obra {refDe(e.request_id)} · {e.destinatario === 'cliente' ? 'para o dono da obra' : e.destinatario === 'pintor' ? 'para o empreiteiro' : 'versão completa'} · versão {e.versao} · {dt(e.emitido_em)}
                <a href={`/app/backoffice/pedidos/relatorios/${e.id}`} className="ml-2 inline-flex min-h-[44px] items-center font-semibold text-tinta-700 underline">
                  Ler
                </a>
                <span className="block break-all text-[13px] text-slate-600">SHA-256 {e.sha256}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
