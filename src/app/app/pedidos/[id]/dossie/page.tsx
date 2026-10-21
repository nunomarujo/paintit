import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProposalView } from '@/components/ProposalView';
import { EVENT_LABELS, STATUS_LABELS } from '@/domain/contracting';
import { formatEuros } from '@/domain/money';
import { alias, proposalTotals } from '@/domain/proposal';
import { SURFACE_KIND_LABELS, WORK_TYPE_LABELS, formatArea } from '@/domain/request';
import { loadReplay } from '@/lib/engagements';
import { toLine, toTerms } from '@/lib/proposals';
import { getUser } from '@/lib/supabase/server';

const dt = (iso: string) => new Date(iso).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });

// Dossiê do pedido (CLI-29): pedido, propostas, contratação, assinaturas e
// materiais, numa página para imprimir ou guardar em PDF. Os pintores não
// escolhidos continuam anónimos.
export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getUser();
  const { data: req } = await supabase.from('work_requests').select('*').eq('id', id).maybeSingle();
  if (!req) notFound();
  const [{ data: org }, { data: building }, { data: surfaces }, { data: proposals }, { data: engagements }] = await Promise.all([
    supabase.from('organizations').select('nome, nif').eq('id', req.org_id).single(),
    supabase.from('buildings').select('morada, codigo_postal, localidade, concelho').eq('id', req.building_id).single(),
    supabase.from('request_surfaces').select('*').eq('request_id', id).order('created_at'),
    supabase.from('proposals').select('*').eq('request_id', id).neq('status', 'rascunho').order('submitted_at'),
    supabase.from('engagements').select('*').eq('request_id', id).order('created_at'),
  ]);
  const ids = (proposals ?? []).map((p) => p.id);
  const { data: lines } = ids.length ? await supabase.from('proposal_lines').select('*').in('proposal_id', ids).order('created_at') : { data: [] };
  const linesOf = (pid: string) => (lines ?? []).filter((l) => l.proposal_id === pid).map((l) => ({ id: l.id, ...toLine(l) }));
  const replays = await Promise.all((engagements ?? []).map(async (e) => ({ e, r: await loadReplay(supabase, e) })));
  const painters = await Promise.all(
    (engagements ?? []).map(async (e) => (await supabase.from('organizations').select('id, nome, nif').eq('id', e.painter_org_id).maybeSingle()).data),
  );
  const total = (surfaces ?? []).reduce((n, s) => n + s.area_cm2, 0);
  const h2 = 'mt-8 border-b border-slate-200 pb-1 text-lg font-semibold';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/app/pedidos/${id}`} className="text-sm text-slate-600 hover:underline">
          ← {req.titulo}
        </Link>
        <p className="text-sm text-slate-500">Para guardar em PDF, use a impressão do navegador.</p>
      </div>
      <article className="rounded-2xl border border-slate-200 bg-white p-8 text-sm print:border-0 print:p-0">
        <p className="eyebrow">Dossiê do pedido</p>
        <h1 className="mt-2 text-2xl font-semibold">{req.titulo}</h1>
        <p className="text-slate-500">
          Ref. {req.ref} · {org?.nome}
          {org?.nif ? ` · NIF ${org.nif}` : ''} · gerado a {dt(new Date().toISOString())}
        </p>

        <h2 className={h2}>Obra</h2>
        <p>
          {WORK_TYPE_LABELS[req.tipo_obra]} · {building ? `${building.morada}, ${building.codigo_postal} ${building.localidade}` : ''}
        </p>
        <p className="mt-2 whitespace-pre-line">{req.descricao}</p>
        <table className="mt-3 w-full text-left">
          <tbody className="divide-y divide-slate-100">
            {(surfaces ?? []).map((s) => (
              <tr key={s.id}>
                <td className="py-1">
                  {SURFACE_KIND_LABELS[s.kind]}
                  {s.descricao ? ` · ${s.descricao}` : ''}
                </td>
                <td className="py-1 text-right">{formatArea(s.area_cm2)}</td>
              </tr>
            ))}
            <tr>
              <td className="py-1 font-semibold">Total</td>
              <td className="py-1 text-right font-semibold">{formatArea(total)}</td>
            </tr>
          </tbody>
        </table>

        <h2 className={h2}>Propostas recebidas ({(proposals ?? []).length})</h2>
        {(proposals ?? []).map((p, i) => {
          const eng = (engagements ?? []).findIndex((e) => e.proposal_id === p.id);
          const named = eng >= 0 && replays[eng]!.r.replay.engagement.feePaid ? painters[eng]?.nome : null;
          return (
            <section key={p.id} className="mt-5 break-inside-avoid">
              <h3 className="font-semibold">
                {named ?? alias(i)} · {formatEuros(proposalTotals(linesOf(p.id), p.iva_bps).base)} sem IVA · estado: {p.status.replace('_', ' ')}
              </h3>
              <div className="mt-2">
                <ProposalView
                  lines={linesOf(p.id)}
                  terms={toTerms(p)}
                  zoneNames={Object.fromEntries((surfaces ?? []).map((z) => [z.id, `${z.descricao?.trim() || SURFACE_KIND_LABELS[z.kind]} (${formatArea(z.area_cm2)})`]))}
                />
              </div>
            </section>
          );
        })}

        {replays.map(({ e, r }, i) => (
          <section key={e.id} className="break-inside-avoid">
            <h2 className={h2}>Contratação {e.id.slice(0, 8).toUpperCase()}</h2>
            <p>
              {STATUS_LABELS[r.replay.engagement.status]}
              {r.replay.engagement.feePaid && painters[i] ? ` · pintor: ${painters[i]!.nome}${painters[i]!.nif ? `, NIF ${painters[i]!.nif}` : ''}` : ''}
            </p>
            <ol className="mt-2 space-y-1">
              {r.events.map((v) => (
                <li key={v.id}>
                  {dt(v.at)} — {EVENT_LABELS[v.kind]}
                  {(v.payload as { signatario?: string }).signatario ? ` por ${(v.payload as { signatario?: string }).signatario}` : ''}
                  {(v.payload as { documentHash?: string }).documentHash ? (
                    <span className="block break-all text-xs text-slate-500">SHA-256 {(v.payload as { documentHash: string }).documentHash}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </article>
    </div>
  );
}
