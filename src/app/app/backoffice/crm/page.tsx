import { FLYERS } from '@/domain/campanhas';
import { decidirCampanha, sequenciaDeCampanhas, type Resultados } from '@/domain/crm';
import { createClient } from '@/lib/supabase/server';

/**
 * CRM — pintores, fornecedores e administradoras de condomínio, por zona (promotor, 06/11/2026).
 * Fundação: só leitura. O agente propõe envios, uma pessoa aprova; nada sai sem aprovação.
 * Regras em `src/domain/crm.ts`; a porta legal (só pessoas coletivas) está num gatilho da base de dados.
 */
export default async function CrmPage() {
  const supabase = await createClient();
  const [{ data: zonas }, { data: contactos }, { data: envios }, { data: eventos }] = await Promise.all([
    supabase.from('crm_zonas').select('id, concelho, ativa, campanha_atual').order('concelho'),
    supabase.from('crm_contactos').select('id, zona_id, tipo'),
    supabase.from('crm_envios').select('id, contacto_id, estado'),
    supabase.from('crm_eventos').select('contacto_id, tipo'),
  ]);

  const porPendente = (envios ?? []).filter((e) => e.estado === 'proposto').length;
  const nomeDaCampanha = (id: string | undefined) => FLYERS.find((f) => f.id === id)?.titulo ?? '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">CRM</h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Empresas a contactar por zona, com a sequência de campanhas de cada uma. O agente propõe; nada é enviado sem aprovação.
        </p>
      </div>

      {porPendente > 0 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-[15px] text-amber-800">
          {porPendente} {porPendente === 1 ? 'envio proposto espera' : 'envios propostos esperam'} aprovação.
        </p>
      )}

      <section aria-labelledby="zonas">
        <h2 id="zonas" className="text-[13px] font-semibold text-slate-500">Zonas</h2>
        {(zonas ?? []).length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-slate-300 p-6 text-[15px] text-slate-600">Ainda não há zonas.</p>
        ) : (
          <ul className="mt-2 grid gap-4 lg:grid-cols-2">
            {(zonas ?? []).map((z) => {
              const dela = (contactos ?? []).filter((c) => c.zona_id === z.id);
              const ids = new Set(dela.map((c) => c.id));
              const enviadosIds = (envios ?? []).filter((e) => ids.has(e.contacto_id) && e.estado === 'enviado');
              const ev = (eventos ?? []).filter((e) => ids.has(e.contacto_id));
              const r: Resultados = {
                enviados: enviadosIds.length,
                respostas: ev.filter((e) => e.tipo === 'resposta').length,
                adesoes: ev.filter((e) => e.tipo === 'adesao').length,
                desistencias: ev.filter((e) => e.tipo === 'desistencia').length,
              };
              const sequencia = sequenciaDeCampanhas('pintor');
              const atual = sequencia[z.campanha_atual - 1];
              const decisao = decidirCampanha(r, Math.max(dela.length - r.enviados, 0));
              return (
                <li key={z.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[20px] font-semibold text-tinta-900">{z.concelho}</p>
                  <p className="mt-0.5 text-[15px] text-slate-600">
                    Campanha {z.campanha_atual}: {nomeDaCampanha(atual)}
                  </p>
                  <dl className="mt-3 grid grid-cols-4 gap-2 text-[15px]">
                    {[['Contactos', dela.length], ['Enviados', r.enviados], ['Respostas', r.respostas], ['Adesões', r.adesoes]].map(([k, v]) => (
                      <div key={k as string}>
                        <dt className="text-[13px] text-slate-500">{k}</dt>
                        <dd className="tabular-nums text-[20px] font-semibold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {dela.length > 0 && <p className="mt-3 text-[15px] text-slate-600">{decisao.motivo}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
