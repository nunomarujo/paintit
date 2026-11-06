import Link from 'next/link';
import { SemEmpresa } from '@/components/vendas/SemEmpresa';
import { pertencaDoFornecedor } from '@/lib/fornecedor';
import { FATORES_DA_BANDA, VERSAO_AUTODECLARACAO_DO_AVALIADOR } from '@/domain/avaliador';
import type { SurveyorPerformance } from '@/domain/survey';
import { getUser } from '@/lib/supabase/server';
import { Autodeclaracao, SimuladorDeGanho } from './Formularios';
import { AvisosPorWhatsAppDaPessoa } from '@/components/AvisosPorWhatsAppDaPessoa';

/**
 * Ser avaliador — a inscrição por autodeclaração e, depois dela, o simulador de ganho e a explicação de
 * como a percentagem sobe ou desce (pedido do promotor, 02/11/2026; regras em `src/domain/avaliador.ts`).
 *
 * É da pessoa, como tudo em Avaliações: a empresa não vê se cada vendedor se inscreveu.
 */
export default async function InscricaoPage() {
  const { supabase, user } = await getUser();

  const pertenca = await pertencaDoFornecedor(supabase, user!);
  if (pertenca.tipo === 'sem_empresa') return <SemEmpresa convites={pertenca.convites} />;

  const [{ data: inscricao }, { data: avaliacoes }, { data: preferencia }] = await Promise.all([
    supabase.from('survey_terms_acceptances').select('accepted_at').eq('version', VERSAO_AUTODECLARACAO_DO_AVALIADOR).maybeSingle(),
    supabase.from('survey_reviews').select('nota').eq('vendedor_user_id', user!.id),
    supabase.from('survey_availability').select('alerta_whatsapp, telemovel_whatsapp').eq('user_id', user!.id).maybeSingle(),
  ]);
  const whatsappLigado = !!(preferencia?.alerta_whatsapp && preferencia.telemovel_whatsapp);
  const n = (avaliacoes ?? []).length;
  const desempenho: SurveyorPerformance = {
    qualificacaoGeral: n ? (avaliacoes ?? []).reduce((s, a) => s + a.nota, 0) / n : null,
    notaInformacao: null,
    respostaAtempada: null,
    notaCliente: null,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">Ser avaliador</h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Ganhar com o que sabe: ajudar o cliente a medir a obra, com a plataforma a registar tudo, e receber uma
          comissão seja qual for o pintor escolhido.
        </p>
      </div>

      <section className="grid gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7">
          <h2 className="text-[20px] font-semibold text-slate-900">Em que consiste</h2>
          <ul className="mt-3 space-y-2 text-[17px] text-slate-700">
            {[
              'Um cliente publica um pedido e pede uma visita. A oportunidade aparece a quem cobre o concelho; o primeiro a aceitar fica com ela.',
              'Vai ao local, mede as zonas, fotografa o estado do suporte e regista os objetivos do cliente. A aplicação guia o registo passo a passo.',
              'O levantamento entra no pedido: os pintores orçamentam sobre as suas medidas, sem terem de ir lá.',
              'Quando a obra for adjudicada, recebe uma percentagem do valor, independentemente de quem ganhou. E conheceu a obra, e os pintores que a vão orçamentar, antes de todos.',
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-tinta-600" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-paper p-5 lg:col-span-5">
          <h2 className="text-[20px] font-semibold text-slate-900">{inscricao ? 'Inscrição feita' : 'Inscrever-me'}</h2>
          {inscricao ? (
            <p className="mt-2 text-[17px] text-slate-700">
              Declaração registada a {new Date(inscricao.accepted_at).toLocaleDateString('pt-PT')}. As{' '}
              <Link href="/app/avaliacoes/oportunidades" className="ligacao">
                oportunidades
              </Link>{' '}
              da sua zona estão abertas para si.
            </p>
          ) : (
            <>
              <p className="mt-1 mb-4 text-[15px] text-slate-600">
                Por autodeclaração: assume os quatro compromissos e a inscrição fica registada em seu nome.
              </p>
              <Autodeclaracao />
            </>
          )}
        </div>
      </section>

      {/* O convite ao WhatsApp acompanha a inscrição (promotor, 06/11/2026): quem responde primeiro fica
          com o levantamento, e o aviso por WhatsApp é o que chega primeiro. */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-[20px] font-semibold text-slate-900">Ser avisado primeiro</h2>
        <p className="mt-1 mb-4 max-w-[54ch] text-[17px] text-slate-700">
          Para ganhar levantamentos é preciso ser o primeiro a responder. Inscreva o seu telemóvel para receber por WhatsApp os
          avisos de novas ofertas. É gratuito.
        </p>
        {whatsappLigado ? (
          <p className="text-[17px] text-slate-700">
            Avisos por WhatsApp ligados para {preferencia!.telemovel_whatsapp}.{' '}
            <Link href="/app/perfil" className="ligacao">
              Mudar ou desligar
            </Link>
          </p>
        ) : (
          <AvisosPorWhatsAppDaPessoa />
        )}
      </section>

      {inscricao && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-[20px] font-semibold text-slate-900">Quanto ganha</h2>
            <p className="mt-1 mb-4 max-w-[54ch] text-[15px] text-slate-600">
              Entre 1% e 2,7% do valor adjudicado sem IVA. A percentagem é a sua posição na banda, segundo o seu
              desempenho; {n === 0 ? 'ainda sem avaliações, começa a meio.' : `com ${n} ${n === 1 ? 'avaliação' : 'avaliações'} já recebidas.`}
            </p>
            <SimuladorDeGanho desempenho={desempenho} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-[20px] font-semibold text-slate-900">Como a percentagem sobe ou desce</h2>
            <p className="mt-1 mb-4 max-w-[54ch] text-[15px] text-slate-600">
              Quatro fatores, com pesos diferentes. Um fator sem dados ainda conta como neutro; não penaliza quem
              começa.
            </p>
            <dl className="grid gap-4 sm:grid-cols-2">
              {FATORES_DA_BANDA.map((f) => (
                <div key={f.nome} className="rounded-lg bg-paper p-4">
                  <dt className="flex items-baseline justify-between gap-3 text-[17px] font-semibold text-slate-900">
                    {f.nome}
                    <span className="text-[15px] font-semibold tabular-nums text-tinta-700">{f.peso}</span>
                  </dt>
                  <dd className="mt-1 text-[15px] text-slate-600">{f.explicacao}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[15px] text-slate-600">
              As suas avaliações, obra a obra, estão em{' '}
              <Link href="/app/avaliacoes/qualificacao" className="ligacao">
                Qualificação
              </Link>
              ; o que já recebeu, em{' '}
              <Link href="/app/avaliacoes/comissoes" className="ligacao">
                Comissões pessoais
              </Link>
              .
            </p>
          </section>
        </>
      )}
    </div>
  );
}
