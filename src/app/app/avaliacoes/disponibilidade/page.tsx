import { SemEmpresa } from '@/components/vendas/SemEmpresa';
import { pertencaDoFornecedor } from '@/lib/fornecedor';
import { CoverageForm } from '@/app/app/levantamentos/Forms';
import { mandaNaEmpresa } from '@/domain/workspaceFornecedor';
import { getUser } from '@/lib/supabase/server';
import { Disponibilidade } from './Formulario';
import { ConvitesWhatsApp } from './Convites';
import { PreVisualizacaoDoConvite, RegrasDosConvites } from './PreVisualizacao';
import { configuracaoWhatsApp } from '@/domain/whatsapp';
import { zonasDefinidas } from '@/domain/coberturaDaEmpresa';
import { motivosDeInelegibilidade } from '@/domain/convocatoria';
import { VERSAO_AUTODECLARACAO_DO_AVALIADOR } from '@/domain/avaliador';
import { CURRENT_SURVEY_TERMS_VERSION } from '@/domain/surveyTerms';

const ESTADO_DO_CONVITE: Record<string, string> = {
  a_enviar: 'A enviar',
  enviado: 'À espera de resposta',
  falhou: 'Não chegou a sair',
  aceite: 'Aceite — é seu',
  tarde: 'Já tinha sido aceite',
  expirado: 'Sem resposta',
};

/**
 * Disponibilidade e alertas — onde se diz quando se está e por onde se quer ser avisado.
 *
 * A cobertura geográfica vivia a meio da página dos levantamentos, entre a lista de trabalho e os
 * pagamentos; e a suspensão de presença não existia de todo. Juntam-se aqui porque respondem à mesma
 * pergunta: quando e onde é que esta pessoa recebe trabalho.
 *
 * A cobertura é da empresa (um concelho coberto vale para todos os seus avaliadores) e só o responsável
 * a altera; a presença e os alertas são da pessoa, e mais ninguém os vê.
 */
export default async function DisponibilidadePage() {
  const { supabase, user } = await getUser();

  const pertenca = await pertencaDoFornecedor(supabase, user!);
  // «Ainda não pertenço a nenhuma empresa» e «fui convidado e não aceitei» não são erros: são
  // estados por resolver, cada um com a sua ação. Antes, isto era um 404 (01/11/2026).
  if (pertenca.tipo === 'sem_empresa') return <SemEmpresa convites={pertenca.convites} />;
  const responsavel = mandaNaEmpresa(pertenca.papel as 'proprietario' | 'gestor' | 'vendedor');

  const hoje = new Date().toISOString().slice(0, 10);
  const [{ data: minha }, { data: cobertura }, { data: empresa }, { data: perfil }, { data: termos }, { count: emCurso }, { data: convites }] =
    await Promise.all([
      supabase
        .from('survey_availability')
        .select('suspenso_ate, alerta_email, alerta_whatsapp, telemovel_whatsapp, concelho_base, raio_km')
        .eq('user_id', user!.id)
        .maybeSingle(),
      supabase.from('supplier_survey_coverage').select('concelhos, todo_o_pais').eq('org_id', pertenca.orgId).maybeSingle(),
      supabase.from('organizations').select('nif').eq('id', pertenca.orgId).maybeSingle(),
      supabase.from('profiles').select('nome').eq('user_id', user!.id).maybeSingle(),
      supabase
        .from('survey_terms_acceptances')
        .select('version')
        .eq('user_id', user!.id)
        .in('version', [VERSAO_AUTODECLARACAO_DO_AVALIADOR, CURRENT_SURVEY_TERMS_VERSION]),
      supabase.from('survey_attempts').select('id', { count: 'exact', head: true }).eq('vendedor_user_id', user!.id).eq('estado', 'ativa'),
      supabase.from('survey_invites').select('id, estado, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10),
    ]);

  const zona = cobertura ? { todoOPais: cobertura.todo_o_pais, concelhos: cobertura.concelhos } : null;
  const versoes = new Set((termos ?? []).map((t) => t.version));
  const falta = motivosDeInelegibilidade({
    userId: user!.id,
    orgId: pertenca.orgId,
    nipcDaEmpresa: empresa?.nif ?? null,
    inscrito: versoes.has(VERSAO_AUTODECLARACAO_DO_AVALIADOR),
    confidencialidade: versoes.has(CURRENT_SURVEY_TERMS_VERSION),
    nomeCompleto: perfil?.nome ?? null,
    whatsapp: !!minha?.alerta_whatsapp && !!minha?.telemovel_whatsapp,
    concelhoBase: minha?.concelho_base ?? null,
    raioKm: minha?.raio_km ?? null,
    zonasDaEmpresa: zonasDefinidas(zona),
    suspenso: !!minha?.suspenso_ate && minha.suspenso_ate >= hoje,
    emCurso: emCurso ?? 0,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">
          Disponibilidade e alertas
        </h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Quando está disponível para receber levantamentos, e por onde quer ser avisada.
        </p>
      </div>

      <section aria-labelledby="convites" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 id="convites" className="text-[20px] font-semibold text-slate-900">
          Convites por WhatsApp
        </h2>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Quando abre um levantamento perto, o convite chega ao telemóvel. Carregar em «Aceito» reserva o trabalho.
        </p>
        {falta.length === 0 ? (
          <p className="mt-3 text-[17px] font-medium text-tinta-700">Tudo pronto: os convites chegam a este número.</p>
        ) : (
          <div className="mt-3">
            <p className="text-[17px] font-medium text-slate-900">Para começar a receber convites falta:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] text-amber-800">
              {falta.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <ConvitesWhatsApp
            alertaWhatsApp={minha?.alerta_whatsapp ?? false}
            telemovel={minha?.telemovel_whatsapp ?? null}
            concelhoBase={minha?.concelho_base ?? null}
            raioKm={minha?.raio_km ?? null}
            whatsappDisponivel={configuracaoWhatsApp(process.env) !== null}
          />
          <PreVisualizacaoDoConvite concelho={minha?.concelho_base ?? 'Viana do Castelo'} />
        </div>
        <details className="group mt-5 border-t border-slate-200 pt-4">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center text-[17px] font-medium text-tinta-700 [&::-webkit-details-marker]:hidden">
            Como funcionam os convites
          </summary>
          <div className="mt-2">
            <RegrasDosConvites />
          </div>
        </details>
        {(convites ?? []).length > 0 && (
          <div className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="text-[17px] font-medium text-slate-900">Últimos convites</h3>
            <ul className="mt-2 divide-y divide-slate-100">
              {(convites ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-[15px]">
                  <span className="tabular-nums text-slate-700">
                    {new Date(c.created_at).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  <span className={c.estado === 'aceite' ? 'font-medium text-tinta-700' : 'text-slate-700'}>{ESTADO_DO_CONVITE[c.estado] ?? c.estado}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section aria-labelledby="presenca" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 id="presenca" className="text-[20px] font-semibold text-slate-900">
          A sua presença
        </h2>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Só a própria pessoa vê e altera isto. Férias e ausências não são assunto da empresa.
        </p>
        <div className="mt-4">
          <Disponibilidade suspensoAte={minha?.suspenso_ate ?? null} alertaEmail={minha?.alerta_email ?? true} />
        </div>
      </section>

      <section aria-labelledby="zonas" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 id="zonas" className="text-[20px] font-semibold text-slate-900">
          Zonas cobertas pela empresa
        </h2>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Concelhos onde a empresa tem avaliadores. Só chegam oportunidades destes concelhos; sem nenhum escolhido,
          não chega nenhuma.
        </p>
        {responsavel ? (
          <div className="mt-4">
            <CoverageForm orgId={pertenca.orgId} initial={zona?.concelhos ? [...zona.concelhos] : []} todoOPais={zona?.todoOPais ?? false} />
          </div>
        ) : (
          <>
            {!zonasDefinidas(zona) ? (
              <p className="mt-4 text-[17px] font-medium text-amber-800">Ainda sem concelhos escolhidos.</p>
            ) : zona!.todoOPais ? (
              <p className="mt-4 text-[17px] text-slate-800">Todo o país.</p>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-2">
                {zona!.concelhos.map((c) => (
                  <li key={c} className="rounded-lg bg-marca-tag px-3 py-1.5 text-[15px] text-slate-800">
                    {c}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 max-w-[54ch] text-[15px] text-slate-600">
              Quem escolhe os concelhos é o responsável da empresa.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
