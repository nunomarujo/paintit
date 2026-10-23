import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';
import { BRAND } from '@/config/brand';
import { painterOrgs } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { ClaimForm } from './ClaimForm';

export const metadata = { title: `Convite de adesão — ${BRAND.name}` };

/** Convite de adesão enviado diretamente por um fornecedor a um pintor que ainda não estava na
 * plataforma (docs/DECISOES.md, 23/10/2026) — mesma estrutura de /convite/[code] ("traga o seu
 * pintor"), para um código de adesão em vez de um convite a uma obra. */
export default async function SupplierInvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { supabase, user } = await getUser();
  if (!user) redirect(`/entrar?seguinte=${encodeURIComponent(`/convite-fornecedor/${code}`)}`);

  const { data } = await supabase.rpc('supplier_invite_info', { p_code: code });
  const info = data?.[0];
  const allOrgs = await painterOrgs(supabase, user.id);
  const orgs = allOrgs.filter((o) => o.manager);

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Link href="/" className="inline-block">
        <BrandMark />
      </Link>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-7">
        <p className="eyebrow">Convite de adesão</p>
        {!info ? (
          <>
            <h1 className="mt-2 text-2xl font-semibold">Convite inválido</h1>
            <p className="mt-2 text-sm text-slate-600">
              Este convite não existe ou foi desativado. Peça ao fornecedor um convite novo.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-semibold">Foi convidado para a {BRAND.name}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {info.fornecedor} convidou-o a juntar-se como pintor. Ao aceitar, os seus orçamentos passam a ter um
              desconto na comissão da plataforma quando usar produtos desta empresa — sem nenhum custo.
            </p>
            {info.ja_aceite && (
              <p className="mt-4 text-sm text-amber-700" role="alert">
                Este convite já foi associado a uma empresa. Se não for a sua, peça um convite novo — se for, pode
                continuar.
              </p>
            )}
            {allOrgs.length === 0 ? (
              <p className="mt-6 text-sm text-slate-700">
                Ainda não tem uma entidade de pintura registada.{' '}
                <Link href={`/app/organizacoes/nova?tipo=pintor&convite=${code}`} className="font-medium text-blue-700 underline">
                  Criar uma entidade
                </Link>{' '}
                — o convite liga-se sozinho ao criá-la.
              </p>
            ) : orgs.length === 0 ? (
              <p className="mt-6 text-sm text-slate-700">
                Só um gestor ou proprietário da sua empresa de pintura pode aceitar este convite. Peça a quem gere a
                entidade para abrir este link.
              </p>
            ) : (
              <ClaimForm code={code} orgs={orgs.map((o) => ({ id: o.id, nome: o.nome }))} />
            )}
          </>
        )}
      </div>
    </main>
  );
}
