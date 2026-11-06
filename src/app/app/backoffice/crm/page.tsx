import { FLYERS } from '@/domain/campanhas';
import { agruparPorTema, melhoresMensagens, principaisLacunas } from '@/domain/crmDossier';
import { TEXTOS_INICIAIS } from '@/domain/crmEmails';
import { decidirCampanha, sequenciaDeCampanhas, type Resultados } from '@/domain/crm';
import { DecidirCampanha } from './DecidirCampanha';
import { Descobrir } from './Descobrir';
import { createClient } from '@/lib/supabase/server';

/**
 * CRM — pintores, fornecedores e administradoras de condomínio, por zona (promotor, 06/11/2026).
 * Fundação: só leitura. O agente propõe envios, uma pessoa aprova; nada sai sem aprovação.
 * Regras em `src/domain/crm.ts`; a porta legal (só pessoas coletivas) está num gatilho da base de dados.
 */
export default async function CrmPage() {
  const supabase = await createClient();
  // Os textos iniciais entram como rascunho; os já existentes não mudam.
  await supabase.from('crm_campanhas').upsert(
    Object.entries(TEXTOS_INICIAIS).map(([id, t]) => ({ id, assunto: t.assunto, corpo: t.corpo, cta: t.cta })),
    { onConflict: 'id', ignoreDuplicates: true },
  );
  const [{ data: zonas }, { data: contactos }, { data: envios }, { data: eventos }, { data: campanhas }, { data: dossier }] = await Promise.all([
    supabase.from('crm_zonas').select('id, concelho, ativa, campanha_atual').order('concelho'),
    supabase.from('crm_contactos').select('id, zona_id, tipo'),
    supabase.from('crm_envios').select('id, contacto_id, estado'),
    supabase.from('crm_eventos').select('contacto_id, tipo'),
    supabase.from('crm_campanhas').select('*').order('id'),
    supabase.from('crm_dossier').select('perfil, zona_id, tema, tipo, evidencias, cobertura'),
  ]);
  const temas = agruparPorTema((dossier ?? []).map((d) => ({ perfil: d.perfil, zonaId: d.zona_id, tema: d.tema, tipo: d.tipo as 'dor' | 'lacuna' | 'acerto', evidencias: d.evidencias, cobertura: d.cobertura })));
  const porDecidir = (campanhas ?? []).filter((c) => c.estado !== 'aprovada');

  const nomeDaCampanha = (id: string | undefined) => FLYERS.find((f) => f.id === id)?.titulo ?? '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">CRM</h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Empresas a contactar por zona, com a sequência de campanhas de cada uma. O agente propõe; nada é enviado sem aprovação.
        </p>
      </div>

      <section aria-labelledby="campanhas">
        <h2 id="campanhas" className="text-[13px] font-semibold text-slate-500">Campanhas à espera de decisão</h2>
        {porDecidir.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-slate-300 p-6 text-[15px] text-slate-600">Nada à espera. As campanhas aprovadas enviam sozinhas.</p>
        ) : (
          <ul className="mt-2 grid gap-4 lg:grid-cols-2">
            {porDecidir.map((c) => (
              <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[13px] text-slate-500">{c.id} · {c.estado === 'correcao' ? <span className="text-amber-800">correção pedida</span> : 'rascunho'}</p>
                <p className="mt-1 text-[17px] font-semibold text-tinta-900">{c.assunto}</p>
                <p className="mt-2 whitespace-pre-line text-[15px] text-slate-700">{c.corpo}</p>
                <p className="mt-2 text-[15px] text-slate-600">Botão: «{c.cta}»</p>
                {c.nota && <p className="mt-2 text-[15px] text-amber-800">Correção pedida: {c.nota}</p>}
                <DecidirCampanha id={c.id} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 max-w-[54ch] text-[15px] text-slate-600">
          O Plano Pro grátis dos pintores já se concede sozinho a quem aderir pelo link. O catálogo sem subscrição (fornecedores) e o relatório sem custo (administradoras) ainda não: não aprovar essas campanhas por agora.
        </p>
      </section>

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
              const agiram = new Set(ev.filter((e) => e.tipo !== 'desistencia').map((e) => e.contacto_id)).size;
              const r: Resultados = {
                enviados: enviadosIds.length,
                agiram,
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
                    {[['Contactos', dela.length], ['Enviados', r.enviados], ['Agiram', r.agiram], ['Adesões', r.adesoes]].map(([k, v]) => (
                      <div key={k as string}>
                        <dt className="text-[13px] text-slate-500">{k}</dt>
                        <dd className="tabular-nums text-[20px] font-semibold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {dela.length > 0 && <p className="mt-3 text-[15px] text-slate-600">{decisao.motivo}</p>}
                  <Descobrir zonaId={z.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="dossier">
        <h2 id="dossier" className="text-[13px] font-semibold text-slate-500">Dossier</h2>
        {temas.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-slate-300 p-6 text-[15px] text-slate-600">O dossier está vazio. Dores, lacunas e acertos entram à medida que chegam respostas e contactos.</p>
        ) : (
          <div className="mt-2 grid gap-4 lg:grid-cols-2">
            {[['Mensagens fortes para as campanhas', melhoresMensagens(temas), 'mensagem'], ['Lacunas do produto', principaisLacunas(temas), 'lacuna']].map(([titulo, lista, campo]) => (
              <div key={titulo as string} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-[17px] font-semibold text-tinta-900">{titulo as string}</p>
                <ul className="mt-2 space-y-1 text-[15px]">
                  {(lista as ReturnType<typeof melhoresMensagens>).map((t) => (
                    <li key={t.tema} className="flex justify-between gap-3">
                      <span>{t.tema} <span className="text-slate-500">· {t.perfis.join(', ')}</span></span>
                      <span className="tabular-nums">{t[campo as 'mensagem' | 'lacuna']}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
