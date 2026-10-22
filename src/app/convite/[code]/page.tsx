import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';
import { BRAND } from '@/config/brand';
import { WORK_TYPE_LABELS, type WorkType } from '@/domain/request';
import { painterOrgs } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { RedeemForm } from './RedeemForm';

export const metadata = { title: `Convite direto — ${BRAND.name}` };

export default async function ConvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { supabase, user } = await getUser();
  if (!user) redirect(`/entrar?seguinte=${encodeURIComponent(`/convite/${code}`)}`);

  const { data } = await supabase.rpc('request_invite_info', { p_code: code });
  const info = data?.[0];
  const orgs = (await painterOrgs(supabase, user.id)).filter((o) => o.manager);

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Link href="/" className="inline-block">
        <BrandMark />
      </Link>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-7">
        <p className="eyebrow">Convite direto</p>
        {!info ? (
          <>
            <h1 className="mt-2 text-2xl font-semibold">Código inválido</h1>
            <p className="mt-2 text-sm text-slate-600">
              Este convite não existe ou foi desativado. Peça ao cliente um código novo.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-semibold">Foi convidado para uma obra</h1>
            <p className="mt-2 text-sm text-slate-600">
              {WORK_TYPE_LABELS[info.tipo_obra as WorkType] ?? 'Pintura'} · {info.concelho}
            </p>
            <p className="mt-4 text-sm text-slate-600">
              O cliente pediu-lhe diretamente para orçamentar esta obra. Ao aceitar, fica associado a este
              convite e a comissão da plataforma nesta obra é muito mais baixa do que a habitual.
            </p>
            {orgs.length === 0 ? (
              <p className="mt-6 text-sm text-slate-700">
                Ainda não tem uma entidade de pintura registada.{' '}
                <Link href="/app/organizacoes/nova" className="font-medium text-blue-700 underline">
                  Criar uma entidade
                </Link>{' '}
                e volte a abrir este link.
              </p>
            ) : (
              <RedeemForm code={code} orgs={orgs.map((o) => ({ id: o.id, nome: o.nome }))} />
            )}
          </>
        )}
      </div>
    </main>
  );
}
