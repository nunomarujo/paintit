import { notFound } from 'next/navigation';
import { canManage, myRole } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';
import { qrCodeSvg } from '@/lib/qrcode';
import { BRAND } from '@/config/brand';
import { Voltar } from '@/components/Voltar';
import { BotaoDeAcesso, BotoesDoCodigo, CopiarLink, FormularioDeRegisto, Permilagem } from './Formularios';

/**
 * Condóminos com acesso a este prédio (decisão de 01/11/2026). O gestor dá acesso de duas maneiras:
 * o código do prédio (QR para afixar ou link para enviar), em que cada condómino se regista com a
 * fração, o andar, o email e o telemóvel; ou o registo à mão, email a email, já com a permilagem.
 * O acesso é a este prédio e só a ele: um condómino não vê os outros prédios da administradora.
 */
export default async function CondominosPage({ params }: { params: Promise<{ id: string; predioId: string }> }) {
  const { id, predioId } = await params;
  const { supabase, user } = await getUser();
  const [{ data: org }, { data: building }] = await Promise.all([
    supabase.from('organizations').select('id, nome, gerida_por').eq('id', id).maybeSingle(),
    supabase.from('buildings').select('id, nome_interno, concelho').eq('id', predioId).eq('org_id', id).maybeSingle(),
  ]);
  if (!org || !building || !canManage(await myRole(supabase, user!.id, org))) notFound();

  const [{ data: codigo }, { data: residentes }] = await Promise.all([
    supabase.from('building_access_codes').select('codigo, revoked_at').eq('building_id', predioId).maybeSingle(),
    supabase
      .from('building_residents')
      .select('id, email, nome, telemovel, fracao, andar, permilagem, user_id, revoked_at')
      .eq('building_id', predioId)
      .order('fracao'),
  ]);
  const codigoActivo = codigo && !codigo.revoked_at ? codigo.codigo : null;
  const url = codigoActivo ? `${BRAND.url}/predio/${codigoActivo}` : null;
  const lista = residentes ?? [];
  const activos = lista.filter((r) => !r.revoked_at);
  const somaPermilagem = activos.reduce((s, r) => s + (r.permilagem ?? 0), 0);
  const semPermilagem = activos.filter((r) => r.permilagem === null).length;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Voltar href={`/app/organizacoes/${org.id}`}>{org.nome}</Voltar>
        <h1 className="mt-3 text-[26px] leading-tight font-semibold">Condóminos de {building.nome_interno}</h1>
        <p className="mt-2 text-[17px] text-slate-600">
          Quem tiver acesso vê o pedido deste prédio, as propostas quando abrirem — ao mesmo tempo que a administração — e
          pode votar na que prefere. Não vê os outros prédios, nem a morada, nem o que ainda está em preparação.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-[20px] font-semibold">Código do prédio</h2>
        <p className="mt-1 text-[17px] text-slate-600">
          Para afixar na entrada ou enviar aos condóminos. Quem o abre escreve a fração, o andar, o email e o telemóvel, e
          recebe no email o link de entrada.
        </p>
        {url && codigoActivo ? (
          <div className="mt-5 grid gap-6 sm:grid-cols-[180px_1fr]">
            <div className="rounded-lg border border-slate-200 p-2" dangerouslySetInnerHTML={{ __html: qrCodeSvg(url, `Código QR do prédio ${building.nome_interno}`) }} />
            <div className="space-y-3">
              <p className="break-all rounded-lg bg-paper px-3 py-2 font-mono text-[15px]">{url}</p>
              <div className="flex flex-wrap gap-2">
                <CopiarLink url={url} />
                <a href={`/predio/${codigoActivo}/cartaz`} target="_blank" rel="noreferrer" className="btn-secondary">
                  Imprimir cartaz
                </a>
              </div>
              <BotoesDoCodigo orgId={org.id} predioId={predioId} temCodigo />
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <BotoesDoCodigo orgId={org.id} predioId={predioId} temCodigo={false} />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[20px] font-semibold">
            Com acesso <span className="text-slate-500">({activos.length})</span>
          </h2>
          {activos.length > 0 && (
            <p className="text-[15px] text-slate-600">
              Permilagem registada: <span className="font-semibold">{somaPermilagem}‰</span>
              {semPermilagem > 0 && <span className="text-amber-800"> · {semPermilagem} sem permilagem</span>}
            </p>
          )}
        </div>
        {lista.length === 0 ? (
          <p className="mt-3 text-[17px] text-slate-600">Ainda ninguém. Partilhe o código ou registe abaixo.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {lista.map((r) => (
              <li key={r.id} className={`flex flex-wrap items-center justify-between gap-3 py-3 ${r.revoked_at ? 'text-slate-500' : ''}`}>
                <div className="min-w-0">
                  <p className="font-semibold">
                    {r.fracao}
                    {r.andar && <span className="font-normal text-slate-500"> · {r.andar}</span>}
                    {r.revoked_at && <span className="ml-2 text-[13px] font-semibold text-red-700">Acesso retirado</span>}
                    {!r.revoked_at && !r.user_id && <span className="ml-2 text-[13px] font-semibold text-amber-800">Ainda não entrou</span>}
                  </p>
                  <p className="truncate text-[15px] text-slate-600">
                    {r.nome && `${r.nome} · `}
                    {r.email}
                    {r.telemovel && ` · ${r.telemovel}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {!r.revoked_at && <Permilagem orgId={org.id} predioId={predioId} residentId={r.id} valor={r.permilagem} />}
                  <BotaoDeAcesso orgId={org.id} predioId={predioId} residentId={r.id} activo={!r.revoked_at} fracao={r.fracao} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-[20px] font-semibold">Registar um condómino</h2>
        <p className="mt-1 mb-4 text-[17px] text-slate-600">
          Entra com este email, sem precisar do código. A permilagem pode pôr-se agora ou mais tarde.
        </p>
        <FormularioDeRegisto orgId={org.id} predioId={predioId} />
      </section>
    </div>
  );
}
