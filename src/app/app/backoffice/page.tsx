import Link from 'next/link';
import { invoicingCount, pendingEngagements, queueCounts } from '@/lib/backofficeCounts';
import { serverChecks } from '@/lib/diagnostics';
import { getUser } from '@/lib/supabase/server';

const card = 'rounded-2xl border border-slate-200 bg-white p-5';

// Painel da equipa da plataforma: o que espera por uma pessoa, por secção. O detalhe está em cada secção (barra lateral).
export default async function BackofficeDashboard() {
  const { supabase } = await getUser();
  const [c, engagements, faturar, { data: open }, { data: submitted }] = await Promise.all([
    queueCounts(supabase),
    pendingEngagements(supabase),
    invoicingCount(),
    supabase.from('request_listings').select('request_id').eq('aberto', true),
    supabase.from('proposals').select('request_id').eq('status', 'submetida'),
  ]);
  const checks = await serverChecks(engagements.length);
  const failing = checks.filter((x) => !x.ok);
  const few = (open ?? []).filter((l) => (submitted ?? []).filter((p) => p.request_id === l.request_id).length < 3).length;

  const groups: { title: string; items: { href: string; label: string; n: number }[] }[] = [
    {
      title: 'Pedidos',
      items: [
        { href: '/app/backoffice/pedidos', label: 'Pedidos abertos com menos de três propostas', n: few },
        { href: '/app/backoffice/pedidos/denuncias', label: 'Denúncias de anúncios', n: c.denuncias },
        { href: '/app/backoffice/pedidos/fotografias', label: 'Fotografias por rever', n: c.fotografias },
      ],
    },
    {
      title: 'Entidades',
      items: [
        { href: '/app/backoffice/entidades', label: 'Documentos por validar', n: c.documentos },
        { href: '/app/backoffice/entidades/regimes', label: 'Regimes de fornecedores por validar', n: c.regimes },
      ],
    },
    {
      title: 'Contratações',
      items: [
        { href: '/app/backoffice/contratacoes', label: 'À espera de confirmação da plataforma', n: engagements.filter((e) => e.pending).length },
        { href: '/app/backoffice/contratacoes/assinaturas', label: 'Assinaturas a conferir', n: c.assinaturas },
        { href: '/app/backoffice/contratacoes/litigios', label: 'Em litígio', n: engagements.filter((e) => e.e.status === 'em_litigio').length },
      ],
    },
    { title: 'Moderação', items: [{ href: '/app/backoffice/moderacao', label: 'Pedidos de revisão por decidir', n: c.revisoes }] },
    {
      title: 'Contabilidade',
      items: [
        { href: '/app/backoffice/contabilidade/pagar', label: 'Resgates de fornecedores por pagar', n: c.resgates },
        { href: '/app/backoffice/contabilidade/banco', label: 'Movimentos do banco por classificar', n: c.banco },
        { href: '/app/backoffice/contabilidade/faturacao', label: 'Documentos fiscais por emitir', n: faturar },
      ],
    },
  ];
  const total = groups.flatMap((g) => g.items).reduce((n, i) => n + i.n, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Painel</h1>
        <p className="mt-1 text-sm text-slate-600">{total === 0 ? 'Nada à espera de uma pessoa.' : `${total} assuntos à espera de uma pessoa.`} Tudo o que a equipa decide fica registado com autor e hora.</p>
      </div>
      {failing.length > 0 && (
        <Link href="/app/backoffice/sistema" className="block rounded-2xl border border-red-300 bg-red-50 p-5 text-sm text-red-900 hover:bg-red-100">
          <b>Há {failing.length === 1 ? 'uma ligação' : `${failing.length} ligações`} do servidor com problema</b> ({failing.map((f) => f.label).join(', ')}). Ver em Sistema →
        </Link>
      )}
      {groups.map((g) => (
        <section key={g.title}>
          <h2 className="eyebrow mb-3">{g.title}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((t) => (
              <li key={t.label}>
                <Link href={t.href} className={`${card} block hover:bg-slate-50 ${t.n === 0 ? 'opacity-60' : ''}`}>
                  <span className={`text-3xl font-semibold ${t.n > 0 ? 'text-tinta-700' : 'text-slate-400'}`}>{t.n}</span>
                  <span className="mt-1 block text-sm text-slate-600">{t.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
