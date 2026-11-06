import Link from 'next/link';
import { aceitacaoSimples } from '@/domain/aceitacaoSimples';
import { AddendaList } from '@/components/AddendaList';
import { AddendaDecision } from './AddendaDecision';
import { notFound } from 'next/navigation';
import { EVENT_LABELS, STATUS_LABELS, availableActions, clientDepositDue, isRevealed, reviewCategory } from '@/domain/contracting';
import { held, settlement } from '@/domain/engagement';
import { formatEuros } from '@/domain/money';
import { avisosDasAssinaturas } from '@/domain/poderes';
import { proximoPasso } from '@/domain/proximoPasso';
import { alias, proposalTotals } from '@/domain/proposal';
import { canManage, isPlatformAdmin, myRole } from '@/lib/access';
import { loadReplay, missingCondoDocs } from '@/lib/engagements';
import { toLine } from '@/lib/proposals';
import { getUser } from '@/lib/supabase/server';
import { AnswerForm, ReviewForm } from '@/components/ExtrasForms';
import { Steps } from '@/components/Steps';
import { PartyAction, PlatformAction } from './ActionForms';
import { CarryForm } from './CarryForm';
import { PdfSign } from './PdfSign';
import { PayButton } from './PayButton';
import { stripeConfigured } from '@/lib/stripe';
import { Voltar } from '@/components/Voltar';
import { AvisosPorWhatsApp } from '@/components/AvisosPorWhatsApp';
import { configuracaoWhatsApp } from '@/domain/whatsapp';
import { minutaComElementos, ibanEmGrupos } from '@/domain/contracting';
import { CAMPOS, CAMPO_LABELS, VALIDACAO_LABELS, emVigor, faltaParaAssinar, mascararIban, podeAlterar } from '@/domain/elementosDoContrato';
import { tranchesDoContrato } from '@/domain/tranchesDoContrato';
import { parseFases } from '@/domain/proposal';
import { historicoDosElementos } from '@/lib/elementosDoContrato';
import { AlterarElemento } from './ElementosDoContrato';
import { ComprovativoForm } from './ComprovativoForm';
import { PassoDaConclusaoForm } from './ConclusaoDaObra';
import { PedirRelatorio } from '@/app/app/pedidos/[id]/PedirRelatorio';
import { DIAS_PARA_CONFIRMAR, PASSO_LABELS, estadoDaConclusao, passosPossiveis, type Lado as LadoDaObra, type PassoDaConclusao } from '@/domain/garantia';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
const pt = (d: string | undefined) => (d ? d.split('-').reverse().join('/') : '—');
const euros = (c: number) => (c / 100).toFixed(2).replace('.', ',');
const dt = (iso: string) => new Date(iso).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });

export default async function EngagementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { data: row } = await supabase.from('engagements').select('*').eq('id', id).maybeSingle();
  if (!row) notFound();

  const [{ data: clientOrg }, { data: painterOrg }, admin] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', row.client_org_id).maybeSingle(),
    supabase.from('organizations').select('*').eq('id', row.painter_org_id).maybeSingle(),
    isPlatformAdmin(supabase, user!.id),
  ]);
  const clientRole = clientOrg ? await myRole(supabase, user!.id, clientOrg) : null;
  const painterRole = painterOrg ? await myRole(supabase, user!.id, painterOrg) : null;
  const side = clientRole ? 'cliente' : painterRole ? 'pintor' : admin ? 'plataforma' : null;
  if (!side) notFound();
  const manager = side === 'cliente' ? canManage(clientRole) : side === 'pintor' ? canManage(painterRole) : false;

  // Trabalhos a mais: o cliente responde aqui, que é onde já vem ver a contratação. O pintor vê-os
  // nas ferramentas de obra; aqui aparecem-lhe só para acompanhar.
  // A obra é o que agrega os trabalhos a mais; a contratação chega-lhes por aqui.
  const { data: obra } = await supabase.from('worksites').select('id').eq('engagement_id', id).maybeSingle();
  const { data: addendaRows } = obra
    ? await supabase
        .from('worksite_addenda')
        .select('id, descricao, valor_cents, estado, criada_em, respondida_em, foto_path')
        .eq('worksite_id', obra.id)
        .order('criada_em', { ascending: false })
    : { data: [] };
  const addenda = (addendaRows ?? []).map((a) => ({
    id: a.id,
    descricao: a.descricao,
    valorCents: a.valor_cents,
    estado: a.estado,
    criadaEm: a.criada_em,
    respondidaEm: a.respondida_em,
    temFotografia: Boolean(a.foto_path),
  }));

  const { replay, events } = await loadReplay(supabase, row);
  const e = replay.engagement;
  const h = held(e);
  const s = settlement(e);
  const revealed = isRevealed(e);
  const partyActions = manager && side !== 'plataforma' ? availableActions(e, side) : [];
  const platformActions = admin ? availableActions(e, 'plataforma') : [];
  const due = clientDepositDue(e);
  const counterpart = side === 'pintor' ? clientOrg : side === 'cliente' ? painterOrg : null;
  const reference = row.id.slice(0, 8).toUpperCase();
  const v2 = e.rules.flow === 'v2';

  // Alternativas para transitar: as outras propostas do pedido que ficaram de fora.
  const canCarry = partyActions.includes('transitar');
  const { data: others } = canCarry
    ? await supabase.from('proposals').select('*').eq('request_id', row.request_id).neq('status', 'rascunho').order('submitted_at')
    : { data: [] };
  const { data: otherLines } = canCarry && others?.length
    ? await supabase.from('proposal_lines').select('*').in('proposal_id', others.map((o) => o.id))
    : { data: [] };

  const condoMissing = side === 'cliente' && partyActions.includes('cliente_assinou') ? await missingCondoDocs(supabase, row) : [];
  const { data: orders } = e.status === 'assinado' ? await supabase.from('material_orders').select('*').eq('engagement_id', id).neq('estado', 'cancelada') : { data: [] };
  const category = reviewCategory(e);
  const { data: review } = category ? await supabase.from('reviews').select('*').eq('engagement_id', id).maybeSingle() : { data: null };

  // Uma só banda no topo para tudo o que há a confirmar nas assinaturas (regra 13): os poderes de quem assinou
  // (decisão de 05/11/2026 — só o resultado, nunca os dados da certidão) e o certificado por confirmar. Âmbar,
  // porque se resolve; nada disto impediu a assinatura.
  const avisosDePoderes = avisosDasAssinaturas(events);
  const certificadoPorConfirmar = events.some(
    (v) => (v.payload as { metodo?: string } | null)?.metodo === 'cmd_pdf' && !(v.payload as { cadeiaConfiavel?: boolean }).cadeiaConfiavel,
  );
  const minhaEntidade = side === 'cliente' ? row.client_org_id : side === 'pintor' ? row.painter_org_id : null;
  // O passo desta parte (rasto de avisos, 05/11/2026). A assinatura tem secção própria, logo a seguir ao
  // título e com âncora `#assinar`, para onde apontam o menu, o Início e a lista.
  const passo = side === 'cliente' || side === 'pintor' ? proximoPasso(e, side) : null;
  const vezDeAssinar = passo?.passo === 'assinar' && (side === 'cliente' || side === 'pintor');
  const assinadoPeloCliente = events.some((v) => v.kind === 'cliente_assinou' && (v.payload as { metodo?: string }).metodo === 'cmd_pdf');
  const assinadoPelasDuas = events.some((v) => v.kind === 'pintor_assinou' && (v.payload as { metodo?: string }).metodo === 'cmd_pdf');
  const outrasAcoes = partyActions.filter((k) => k !== 'transitar' && (aceitacaoSimples(process.env) || (k !== 'cliente_assinou' && k !== 'pintor_assinou')));
  // Enquanto o contrato está em curso, quem ainda não ligou o WhatsApp pode ligá-lo aqui: é o aviso de que é
  // a sua vez de assinar que mais se perde num email (05/11/2026). Ligado, não se mostra nada.
  const emCurso = e.status.startsWith('aguarda_') && (side === 'cliente' || side === 'pintor') && manager;
  const { data: preferencia } = emCurso
    ? await supabase.from('survey_availability').select('alerta_whatsapp, telemovel_whatsapp').eq('user_id', user!.id).maybeSingle()
    : { data: null };
  const oferecerWhatsApp = emCurso && !(preferencia?.alerta_whatsapp && preferencia.telemovel_whatsapp);

  // Elementos do contrato (06/11/2026): só com a minuta nova, e só depois da apresentação — antes disso
  // nenhuma parte vê os dados da outra (regra 6).
  const apresentada = events.some((v) => v.kind === 'fee_recebido');
  const comElementos = minutaComElementos(row.minuta_versao) && apresentada;
  const historico = comElementos ? await historicoDosElementos(supabase, id) : [];
  const vigor = emVigor(historico);
  const alteravel = podeAlterar({
    minuta: row.minuta_versao,
    apresentada,
    algumaAssinatura: events.some((v) => v.kind === 'cliente_assinou' || v.kind === 'pintor_assinou'),
  });
  const faltaIban = faltaParaAssinar(row.minuta_versao, vigor);
  const meuLado = side === 'cliente' || side === 'pintor' ? side : null;

  // Comprovativos de pagamento: depois das duas assinaturas, por tranche. O plano vem da proposta.
  const celebrado = events.some((v) => v.kind === 'pintor_assinou');
  const { data: comprovativosRows } = celebrado
    ? await supabase.from('comprovativos_de_pagamento').select('*').eq('engagement_id', id).order('criado_em')
    : { data: [] };
  const comprovativos = await Promise.all(
    (comprovativosRows ?? []).map(async (c) => ({
      ...c,
      url: c.ficheiro_path ? (await supabase.storage.from('comprovativos-de-pagamento').createSignedUrl(c.ficheiro_path, 300)).data?.signedUrl ?? null : null,
    })),
  );
  const { data: propostaDoPlano } = celebrado && side === 'cliente'
    ? await supabase.from('proposals').select('adiantamento_bps, fases, base_cents, iva_cents').eq('id', row.proposal_id).maybeSingle()
    : { data: null };
  // Conclusão da obra e garantia (06/11/2026): depois das duas assinaturas.
  const { data: passosRows } = celebrado
    ? await supabase.from('conclusao_da_obra').select('*').eq('engagement_id', id).order('criado_em')
    : { data: [] };
  const passosDaObra = await Promise.all(
    (passosRows ?? []).map(async (p) => ({
      ...p,
      url: p.ficheiro_path ? (await supabase.storage.from('provas-da-obra').createSignedUrl(p.ficheiro_path, 300)).data?.signedUrl ?? null : null,
    })),
  );
  const estadoDaObra = estadoDaConclusao(
    passosDaObra.map((p) => ({ lado: p.lado as LadoDaObra, passo: p.passo as PassoDaConclusao, dataConclusao: p.data_conclusao, criadoEm: p.criado_em })),
    new Date(),
  );
  const { data: garantiaCalculada } = celebrado
    ? await supabase.from('garantias_calculadas').select('*').eq('engagement_id', id).order('calculado_em', { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const passosMeus = meuLado && manager ? passosPossiveis(estadoDaObra, meuLado) : [];
  // O relatório do percurso, pedido pelo pintor contratado (06/11/2026). Sem a migração, as consultas falham
  // sozinhas e a secção fica só com o botão.
  const [{ data: relatoriosDoPintor }, { data: pedidosDoPintor }] =
    side === 'pintor'
      ? await Promise.all([
          supabase.from('relatorios_do_percurso').select('id, versao, emitido_em').eq('request_id', row.request_id).eq('destinatario', 'pintor').order('versao', { ascending: false }),
          supabase.from('pedidos_de_relatorio').select('id').eq('request_id', row.request_id).eq('lado', 'pintor'),
        ])
      : [{ data: [] }, { data: [] }];
  const nomesDasTranches = propostaDoPlano
    ? tranchesDoContrato({
        totalCents: (propostaDoPlano.base_cents ?? 0) + (propostaDoPlano.iva_cents ?? 0),
        adiantamentoBps: propostaDoPlano.adiantamento_bps,
        fases: parseFases(propostaDoPlano.fases),
      }).map((t) => t.descricao)
    : [];

  return (
    <div className="space-y-8">
      {(avisosDePoderes.length > 0 || certificadoPorConfirmar) && (
        <section role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
          <h2 className="text-[17px] font-semibold text-amber-900">Assinaturas a confirmar</h2>
          <ul className="mt-2 max-w-[54ch] space-y-2 text-[17px] text-amber-900">
            {avisosDePoderes.map((a, i) => (
              <li key={i}>
                <span className="font-semibold">Assinatura {a.lado === 'cliente' ? 'do cliente' : 'do pintor'}:</span> {a.texto}
              </li>
            ))}
            {certificadoPorConfirmar && (
              <li>
                Há uma assinatura cujo certificado não foi possível ligar ao Cartão de Cidadão ou à Chave Móvel Digital. A
                plataforma não o confirma; se continuarem, as partes assumem a responsabilidade.
              </li>
            )}
          </ul>
          {avisosDePoderes.length > 0 && (
            <p className="mt-3 max-w-[54ch] text-[15px] text-amber-900">
              A plataforma avisa e não impede. O resultado é o do momento em que cada parte assinou.
            </p>
          )}
          {minhaEntidade && avisosDePoderes.some((a) => a.lado === side) && (
            <Link
              href={side === 'pintor' ? `/app/organizacoes/${minhaEntidade}?ver=documentos` : `/app/organizacoes/${minhaEntidade}#documentos`}
              className="btn-secondary btn-sm mt-3"
            >
              Rever os documentos da entidade
            </Link>
          )}
        </section>
      )}
      <div>
        <Voltar href={side === 'cliente' ? `/app/pedidos/${row.request_id}/propostas` : '/app/contratacoes'}>{side === 'cliente' ? 'Propostas do pedido' : 'Contratações'}</Voltar>
        <h1 className="mt-3 text-[26px] leading-tight font-semibold">Contratação {reference}</h1>
        <p className="mt-1 text-[17px] font-medium text-tinta-700">{STATUS_LABELS[e.status]}</p>
        {v2 ? (
          <Steps
            steps={['Caução do cliente', side === 'cliente' ? 'Confirmação do pintor' : 'Comissão do pintor', 'Adiantamento', 'Assinatura do cliente', 'Assinatura do pintor']}
            done={
              (
                { aguarda_deposito: 0, aguarda_fee: 1, aguarda_adiantamento: 2, aguarda_assinatura_cliente: 3, aguarda_assinatura_pintor: 4, em_litigio: 3, assinado: 5 } as Record<
                  string,
                  number
                >
              )[e.status] ?? 0
            }
          />
        ) : (
          <Steps
            steps={['Depósito do cliente', 'Assinatura do cliente', side === 'cliente' ? 'Confirmação do pintor' : 'Comissão do pintor', 'Assinatura do pintor']}
            done={
              ({ aguarda_deposito: 0, aguarda_assinatura_cliente: 1, aguarda_fee: 2, aguarda_assinatura_pintor: 3, em_litigio: 3, assinado: 4 } as Record<string, number>)[
                e.status
              ] ?? 0
            }
          />
        )}
        <div className="mt-2 flex flex-wrap gap-4 text-[17px]">
          <Link href={`/app/contratacoes/${id}/minuta`} className="text-tinta-700 hover:underline">
            Ver {e.status === 'assinado' ? 'contrato' : 'minuta'}
          </Link>
          {assinadoPelasDuas ? (
            <a href={`/app/contratacoes/${id}/pdf?v=pintor`} className="font-semibold text-tinta-700 hover:underline">
              Descarregar o contrato assinado pelas duas partes (PDF)
            </a>
          ) : (
            assinadoPeloCliente &&
            !vezDeAssinar && (
              <a href={`/app/contratacoes/${id}/pdf?v=cliente`} className="text-tinta-700 hover:underline">
                Descarregar o contrato assinado pelo cliente (PDF)
              </a>
            )
          )}
          {side === 'pintor' && e.status === 'assinado' && (
            <Link href={`/app/obras/${obra?.id ?? ''}`} className="text-slate-600 hover:underline">
              Gestão de obra
            </Link>
          )}
        </div>
      </div>

      {vezDeAssinar && (
        <section id="assinar" className="scroll-mt-24 rounded-2xl border-2 border-tinta-900 bg-white p-5 sm:p-6">
          <p className="text-[13px] font-semibold text-slate-500">{manager ? 'O próximo passo é seu' : 'A seguir, deste lado'}</p>
          <h2 className="mt-1 text-[20px] font-semibold leading-tight">Assinar o contrato</h2>
          {passo?.ate && (
            <p className="mt-1 text-[17px] text-slate-700">
              Até <strong>{pt(passo.ate)}</strong>, às 23:59 (Lisboa).
            </p>
          )}
          <div className="mt-5">
            {!manager ? (
              <p className="max-w-[54ch] text-[17px] text-slate-700">
                Quem assina em nome da entidade é um proprietário ou gestor dela. Esta conta pode acompanhar, mas não assinar.
              </p>
            ) : condoMissing.length > 0 ? (
              // Âmbar e em texto: resolve-se, e a banda do ecrã é a do topo (regra 13).
              <div className="max-w-[54ch] text-[17px]">
                <p className="font-semibold text-amber-800">Antes de assinar em nome do condomínio, falta: {condoMissing.join('; ')}.</p>
                <p className="mt-1 text-slate-700">
                  Enviar na página do condomínio e aguardar a validação. Quem assina tem de ter poderes para obrigar o condomínio.
                </p>
                <Link href={`/app/organizacoes/${row.client_org_id}`} className="btn-secondary btn-sm mt-3">
                  Ir para os documentos do condomínio
                </Link>
              </div>
            ) : side === 'cliente' && faltaIban ? (
              <p className="max-w-[54ch] text-[17px] font-semibold text-amber-800">{faltaIban}</p>
            ) : (
              <PdfSign engagementId={id} side={side} />
            )}
          </div>
        </section>
      )}

      {emCurso && !oferecerWhatsApp && preferencia?.telemovel_whatsapp && (
        // O consentimento retira-se com a mesma facilidade com que se dá (RGPD): o caminho fica à vista.
        <p className="text-[15px] text-slate-600">
          Avisos por WhatsApp ligados para {preferencia.telemovel_whatsapp}.{' '}
          <Link href="/app/perfil" className="font-semibold text-tinta-700 underline">
            Mudar ou desligar
          </Link>
        </p>
      )}

      {oferecerWhatsApp && (
        <section className={card}>
          <h2 className="font-semibold">Ser avisado também por WhatsApp</h2>
          <p className="mt-1 mb-4 max-w-[54ch] text-[17px] text-slate-600">
            Quando for a sua vez de assinar, o aviso segue por email e fica aqui. Com o WhatsApp ligado, chega também ao telemóvel, com a
            ligação direta para este contrato.
          </p>
          <AvisosPorWhatsApp alertaWhatsApp={false} telemovel={preferencia?.telemovel_whatsapp ?? null} whatsappDisponivel={configuracaoWhatsApp(process.env) !== null} />
        </section>
      )}

      {comElementos && (
        <section id="elementos" className={`${card} scroll-mt-24`}>
          <h2 className="font-semibold">Elementos do contrato</h2>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
            {alteravel
              ? 'IBAN, telefone e email para correspondência de cada parte, como o contrato os indica. Até à primeira assinatura, cada parte corrige os seus; a outra é avisada de cada alteração e o valor anterior fica no histórico.'
              : 'Os elementos indicados no contrato. Depois da primeira assinatura, qualquer alteração faz-se por adenda ao contrato, entre as partes, fora da plataforma.'}
          </p>
          {faltaIban && alteravel && (
            <p className="mt-2 max-w-[54ch] text-[17px] font-semibold text-amber-800">
              {side === 'pintor' ? 'Falta indicar o IBAN do empreiteiro: o dono da obra só pode assinar depois disso.' : faltaIban}
            </p>
          )}
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {(['cliente', 'pintor'] as const).map((lado) => (
              <div key={lado}>
                <h3 className="text-[15px] font-semibold text-slate-600">{lado === 'cliente' ? 'Dono da obra' : 'Empreiteiro'}</h3>
                <dl className="mt-2 space-y-3">
                  {CAMPOS.map((campo) => (
                    <div key={campo}>
                      <dt className="text-[15px] text-slate-600">
                        {CAMPO_LABELS[campo]}
                        {campo === 'iban' && lado === 'pintor' && <span className="text-slate-600"> (obrigatório para o contrato)</span>}
                        {campo === 'iban' && lado === 'cliente' && <span className="text-slate-600"> (facultativo)</span>}
                      </dt>
                      <dd className="text-[17px] text-slate-900 [font-variant-numeric:tabular-nums]">
                        {vigor[lado][campo] ? (campo === 'iban' ? ibanEmGrupos(vigor[lado][campo]!) : vigor[lado][campo]) : <span className="text-slate-600">Por indicar</span>}
                      </dd>
                      {alteravel && manager && meuLado === lado && (
                        <AlterarElemento engagementId={id} lado={lado} campo={campo} atual={vigor[lado][campo]} emailDaSessao={user?.email ?? null} />
                      )}
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          {historico.length > 0 && (
            <details className="mt-5">
              <summary className="flex min-h-[44px] cursor-pointer items-center text-[15px] font-semibold text-tinta-700">Histórico de alterações ({historico.length})</summary>
              <ol className="mt-2 space-y-1 text-[15px] text-slate-700">
                {[...historico].reverse().map((h, i) => (
                  <li key={i}>
                    {dt(h.criadoEm)} · {h.lado === 'cliente' ? 'Dono da obra' : 'Empreiteiro'} · {CAMPO_LABELS[h.campo]}:{' '}
                    {h.campo === 'iban' ? mascararIban(h.valor) : h.valor} · {VALIDACAO_LABELS[h.validacao]}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </section>
      )}

      {celebrado && (side === 'cliente' || side === 'pintor' || side === 'plataforma') && (
        <section className={card}>
          <h2 className="font-semibold">Comprovativos de pagamento</h2>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
            {side === 'cliente'
              ? 'Por cada tranche paga ao empreiteiro, o valor, a data e o comprovativo. É só registo: fica guardado tal como foi enviado, e a tranche é dada por recebida pelo empreiteiro.'
              : 'O que o dono da obra registou ter pago, por tranche. É só registo: a plataforma guarda o que lhe enviam e não o valida.'}
          </p>
          {comprovativos.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200">
              {comprovativos.map((c) => (
                <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
                  <span className="text-[17px]">
                    {c.tranche} · pago a {pt(c.pago_em)}
                    {c.nota && <span className="block text-[15px] text-slate-600">{c.nota}</span>}
                    <span className="block text-[13px] text-slate-600">Registado a {dt(c.criado_em)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-[17px] font-semibold [font-variant-numeric:tabular-nums]">{formatEuros(c.valor_cents)}</span>
                    {c.url && (
                      <a href={c.url} className="btn-quiet btn-sm" target="_blank" rel="noreferrer">
                        Ver o ficheiro
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-lg border border-slate-200 px-4 py-3 text-[17px] text-slate-600">Ainda não há comprovativos registados.</p>
          )}
          {side === 'cliente' && manager && (
            <div className="mt-5">
              <ComprovativoForm engagementId={id} tranches={nomesDasTranches} />
            </div>
          )}
        </section>
      )}

      {celebrado && (
        <section id="conclusao" className={`${card} scroll-mt-24`}>
          <h2 className="font-semibold">Conclusão da obra e garantia</h2>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
            A garantia começa quando uma parte declara a obra concluída e a outra o confirma. A plataforma regista cada passo, com a data, e a
            prova que as partes juntarem; não decide quem tem razão.
          </p>
          <p className="mt-3 text-[17px] text-slate-900">
            {estadoDaObra.estado === 'por_declarar' && 'Ainda ninguém declarou a obra concluída.'}
            {estadoDaObra.estado === 'por_confirmar' &&
              `${estadoDaObra.declaradaPor === 'cliente' ? 'O dono da obra' : 'O empreiteiro'} declarou a obra concluída a ${pt(estadoDaObra.dataConclusao)}; falta a confirmação da outra parte (até ${dt(estadoDaObra.prazo)}).`}
            {estadoDaObra.estado === 'uma_parte' &&
              `Declarada só por ${estadoDaObra.declaradaPor === 'cliente' ? 'o dono da obra' : 'o empreiteiro'} (${pt(estadoDaObra.dataConclusao)}): a outra parte não confirmou em ${DIAS_PARA_CONFIRMAR} dias. Fica registado assim; quem declarou pode juntar prova.`}
            {estadoDaObra.estado === 'contestada' && `A conclusão declarada a ${pt(estadoDaObra.dataConclusao)} foi contestada pela outra parte, com a razão registada abaixo.`}
            {estadoDaObra.estado === 'confirmada' && `Obra concluída a ${pt(estadoDaObra.dataConclusao)}, confirmado pelas duas partes.`}
          </p>
          {garantiaCalculada && (
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-[17px] sm:grid-cols-[auto_1fr]">
              <dt className="text-slate-600">Garantia contratual</dt>
              <dd>
                {garantiaCalculada.anos} {garantiaCalculada.anos === 1 ? 'ano' : 'anos'}, de {pt(garantiaCalculada.inicio)} a {pt(garantiaCalculada.fim_garantia)}
              </dd>
              <dt className="text-slate-600">Registos guardados até</dt>
              <dd>
                {pt(garantiaCalculada.fim_conservacao)} <span className="text-[15px] text-slate-600">(24 meses depois do fim da garantia; calculado a {dt(garantiaCalculada.calculado_em)})</span>
              </dd>
            </dl>
          )}
          {passosDaObra.length > 0 && (
            <ol className="mt-4 space-y-2 text-[15px] text-slate-700">
              {passosDaObra.map((p) => (
                <li key={p.id}>
                  {dt(p.criado_em)} · {p.lado === 'cliente' ? 'Dono da obra' : 'Empreiteiro'} {PASSO_LABELS[p.passo as PassoDaConclusao]}
                  {p.data_conclusao && ` (${pt(p.data_conclusao)})`}
                  {p.razao && <span className="block text-slate-900">«{p.razao}»</span>}
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noreferrer" className="ml-2 font-semibold text-tinta-700 underline">
                      Ver a prova
                    </a>
                  )}
                </li>
              ))}
            </ol>
          )}
          {meuLado && passosMeus.length > 0 && (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {passosMeus.map((passo) => (
                <PassoDaConclusaoForm key={passo} engagementId={id} lado={meuLado} passo={passo} />
              ))}
            </div>
          )}
        </section>
      )}

      {side === 'pintor' && (
        <section className={card}>
          <h2 className="font-semibold">Relatório do percurso negocial</h2>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
            Um registo do que aconteceu na plataforma nesta obra, por ordem e com datas: o pedido publicado, a proposta, a contratação, as
            assinaturas, as adendas, os pagamentos registados e a conclusão. Pode ser pedido sem custo; a equipa da plataforma confirma o pedido e
            emite-o aqui.
          </p>
          {(relatoriosDoPintor ?? []).length > 0 && (
            <ul className="mt-3 space-y-1">
              {(relatoriosDoPintor ?? []).map((r) => (
                <li key={r.id}>
                  <Link href={`/app/relatorios/${r.id}`} className="inline-flex min-h-[44px] items-center text-[17px] font-semibold text-tinta-700 hover:underline">
                    Versão {r.versao}, emitida a {new Date(r.emitido_em).toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon' })}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {(pedidosDoPintor ?? []).length > (relatoriosDoPintor ?? []).length && (
            <p className="mt-3 text-[17px] text-slate-700">Há um pedido de relatório à espera da equipa da plataforma.</p>
          )}
          {manager && (
            <div className="mt-4">
              <PedirRelatorio engagementId={id} />
            </div>
          )}
        </section>
      )}

      {addenda.length > 0 && (
        <section className={card}>
          <h2 className="font-semibold">Trabalhos a mais</h2>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
            {side === 'cliente'
              ? 'Trabalho que não estava no orçamento e que a empresa propõe fazer. Só é cobrado depois de o aceitar aqui.'
              : 'O que propôs ao cliente além do orçamento. Só conta para o valor da obra depois de ele aceitar.'}
          </p>
          <div className="mt-4">
            <AddendaList
              addenda={addenda}
              hoje={new Date().toISOString().slice(0, 10)}
              vazio="Sem trabalhos a mais."
              lado={side === 'cliente' ? 'cliente' : 'pintor'}
              acoes={(a) =>
                a.estado === 'proposta' && side === 'cliente' && manager ? (
                  <AddendaDecision engagementId={id} addendaId={a.id} />
                ) : null
              }
            />
          </div>
        </section>
      )}

      <section className={card}>
        <h2 className="font-semibold">Valores</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-[17px] sm:grid-cols-2">
          <dt className="text-slate-500">Valor da obra sem IVA</dt>
          <dd className="font-semibold sm:text-right">{formatEuros(e.base)}</dd>
          <dt className="text-slate-500">Caução do cliente (3%)</dt>
          <dd className="sm:text-right">{formatEuros(e.guarantee)}</dd>
          <dt className="text-slate-500">Adiantamento de adjudicação</dt>
          <dd className="sm:text-right">{e.advance > 0 ? formatEuros(e.advance) : 'Nenhum'}</dd>
          {side !== 'cliente' && (
            <>
              <dt className="text-slate-500">Comissão do pintor (3% + IVA)</dt>
              <dd className="sm:text-right">
                {formatEuros(e.fee.gross)} <span className="text-slate-500">({formatEuros(e.fee.net)} + {formatEuros(e.fee.vat)})</span>
              </dd>
            </>
          )}
          {e.carriedCredit > 0 && (
            <>
              <dt className="text-slate-500">Transitado da contratação anterior</dt>
              <dd className="sm:text-right">{formatEuros(e.carriedCredit)}</dd>
            </>
          )}
          <dt className="text-slate-500">Retido agora no parceiro de pagamentos</dt>
          <dd className="sm:text-right">{formatEuros(h.guarantee + h.advance + (side === 'cliente' ? 0 : h.fee))}</dd>
        </dl>
        {e.feeDue && e.status === 'aguarda_fee' && (
          <p className="mt-3 text-[17px]">
            {side === 'cliente' ? 'Prazo para o pintor confirmar' : 'Prazo para a comissão do pintor entrar'}: <strong>{pt(e.feeDue)}</strong>, até às 23:59 (Lisboa).
          </p>
        )}
        {e.signDue && e.status === 'aguarda_assinatura_pintor' && (
          <p className="mt-3 text-[17px]">
            Prazo para o pintor assinar: <strong>{pt(e.signDue)}</strong>, até às 23:59 (Lisboa).
          </p>
        )}
      </section>

      {(e.status === 'aguarda_deposito' || e.status === 'aguarda_adiantamento') && side === 'cliente' && (
        <section className={`${card} border-tinta-100 bg-tinta-50`}>
          <h2 className="font-semibold">{e.status === 'aguarda_adiantamento' ? 'Adiantamento a depositar' : 'Depósito a fazer'}</h2>
          <p className="mt-2 text-[17px]">
            Deposite <strong>{formatEuros(due)}</strong> com a referência <strong>{reference}</strong>. O dinheiro fica no
            parceiro de pagamentos autorizado, nunca na plataforma.{' '}
            {v2
              ? e.status === 'aguarda_deposito'
                ? 'É a caução, uma garantia de interesse: é-lhe devolvida quando as duas partes assinarem. Se desistir antes de conhecer o pintor, também lhe é devolvida.'
                : `O adiantamento passa para o pintor quando as duas partes assinarem. Prazo para depositar e assinar: ${pt(e.clientDue)}.`
              : 'A caução é-lhe devolvida quando as duas partes assinarem; o adiantamento passa para o pintor nesse momento.'}
          </p>
          {stripeConfigured && e.status === 'aguarda_deposito' && manager ? (
            <>
              <PayButton engagementId={id} side="cliente" label={`Pagar a caução de ${formatEuros(due)}`} />
              <p className="mt-2 text-[15px] text-slate-600">
                Pagamento seguro no Stripe (instituição de pagamento autorizada). A devolução é automática quando as duas partes
                assinarem, ou se desistir antes de conhecer o pintor.
              </p>
            </>
          ) : (
            <p className="mt-2 text-[15px] text-slate-600">A equipa da plataforma combina o depósito consigo.</p>
          )}
        </section>
      )}
      {e.status === 'aguarda_fee' && side === 'pintor' && (
        <section className={`${card} border-tinta-100 bg-tinta-50`}>
          <h2 className="font-semibold">{v2 ? 'A sua proposta foi escolhida' : 'Ganhou esta obra'}</h2>
          <p className="mt-2 text-[17px]">
            {v2 ? 'O cliente depositou a caução.' : 'O cliente já assinou.'} Pague <strong>{formatEuros(e.fee.gross)}</strong> com a referência <strong>{reference}</strong>{' '}
            até <strong>{pt(e.feeDue)}</strong>. Quando o pagamento for confirmado, vê a identidade do cliente e a morada, e
            pode assinar. {e.advance > 0 && `O adiantamento de ${formatEuros(e.advance)} está reservado para si e é libertado quando assinar.`}
          </p>
          {stripeConfigured && manager && (
            <PayButton engagementId={id} side="pintor" label={`Pagar a comissão de ${formatEuros(e.fee.gross)}`} />
          )}
        </section>
      )}

      {revealed && counterpart && (
        <section className={card}>
          <h2 className="font-semibold">{side === 'pintor' ? 'Cliente' : 'Pintor'}</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-[17px] sm:grid-cols-2">
            <dt className="text-slate-500">Nome</dt>
            <dd>{counterpart.nome}</dd>
            <dt className="text-slate-500">NIF</dt>
            <dd>{counterpart.nif ?? '—'}</dd>
            <dt className="text-slate-500">Morada</dt>
            <dd>
              {counterpart.morada_fiscal ? `${counterpart.morada_fiscal}, ${counterpart.codigo_postal ?? ''} ${counterpart.localidade ?? ''}` : '—'}
            </dd>
            <dt className="text-slate-500">Email</dt>
            <dd>{counterpart.email_contacto ?? 'Não indicado'}</dd>
            <dt className="text-slate-500">Telefone</dt>
            <dd>{counterpart.telefone ?? 'Não indicado'}</dd>
          </dl>
        </section>
      )}

      {(outrasAcoes.length > 0 || platformActions.length > 0 || canCarry) && (
        <section className={card}>
          <h2 className="font-semibold">O que pode fazer agora</h2>
          <div className="mt-4 space-y-4">
            {platformActions.map((k) => (
              <PlatformAction
                key={k}
                engagementId={id}
                kind={k as 'deposito_confirmado' | 'fee_recebido' | 'litigio_resolvido'}
                expected={k === 'deposito_confirmado' ? euros(due) : k === 'fee_recebido' ? euros(e.fee.gross) : undefined}
              />
            ))}
            {outrasAcoes.map((k) => (
              <PartyAction
                key={k}
                engagementId={id}
                kind={k as 'cliente_assinou' | 'cliente_desistiu' | 'pintor_assinou' | 'litigio_aberto' | 'encerrar_sem_contrato'}
              />
            ))}
            {canCarry && (
              <div className="space-y-3 rounded-xl border border-slate-200 p-4 text-[17px]">
                <p>
                  O pintor não cumpriu. Pode passar para outra proposta: a caução e o adiantamento já depositados transitam
                  para ela.
                </p>
                {(others ?? []).map((o, i) =>
                  o.status === 'nao_selecionada' ? (
                    <div key={o.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {alias(i)} ·{' '}
                        {formatEuros(proposalTotals((otherLines ?? []).filter((l) => l.proposal_id === o.id).map(toLine), o.iva_bps).base)} sem IVA
                      </span>
                      <CarryForm engagementId={id} requestId={row.request_id} proposalId={o.id} label={`Passar para ${alias(i)}`} />
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {['assinado', 'cliente_desistiu', 'litigio_culpa_cliente', 'litigio_culpa_pintor', 'litigio_repartido', 'encerrado_sem_contrato', 'transitado'].includes(e.status) && (
        <section className={card}>
          <h2 className="font-semibold">Acerto final</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-[17px] sm:grid-cols-2">
            <dt className="text-slate-500">Cliente entregou / recebeu</dt>
            <dd className="sm:text-right">
              {formatEuros(s.cliente.entregou)} / {formatEuros(s.cliente.recebeu)}
              {s.cliente.transitou > 0 ? ` (transitou ${formatEuros(s.cliente.transitou)})` : ''}
            </dd>
            {side !== 'cliente' && (
              <>
                <dt className="text-slate-500">Pintor entregou / recebeu</dt>
                <dd className="sm:text-right">
                  {formatEuros(s.pintor.entregou)} / {formatEuros(s.pintor.recebeu)}
                </dd>
                <dt className="text-slate-500">Plataforma recebeu</dt>
                <dd className="sm:text-right">{formatEuros(s.plataforma.recebeu)}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {side === 'cliente' && (orders ?? []).length > 0 && (
        <section className={card}>
          <h2 className="font-semibold">Materiais comprometidos</h2>
          <ul className="mt-3 space-y-1 text-[17px]">
            {(orders ?? []).map((o) => (
              <li key={o.id}>
                {o.embalagens} embalagens · {o.estado === 'entregue' ? 'compra e entrega em obra confirmadas pelo fornecedor' : o.estado === 'confirmada' ? 'compra confirmada pelo fornecedor' : 'encomendado ao fornecedor'}
                {o.delivered_at ? ` (${dt(o.delivered_at)})` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {category && side !== 'plataforma' && (
        <section className={card}>
          <h2 className="font-semibold">Avaliação — {category === 'concluida' ? 'obra concluída' : 'obra cancelada'}</h2>
          {review && (
            <div className="mt-3 text-[17px]">
              <p>
                Qualidade {review.qualidade}/5 · Prazo {review.prazo}/5 · Comunicação {review.comunicacao}/5
              </p>
              {review.comentario && <p className="mt-1 whitespace-pre-line">{review.comentario}</p>}
              {review.resposta && (
                <p className="mt-2 rounded-lg bg-slate-50 p-2">
                  <span className="text-slate-500">Resposta do pintor: </span>
                  {review.resposta}
                </p>
              )}
            </div>
          )}
          <div className="mt-4">
            {side === 'cliente' && manager && (
              <ReviewForm
                engagementId={id}
                initial={review ? { qualidade: review.qualidade, prazo: review.prazo, comunicacao: review.comunicacao, comentario: review.comentario } : null}
              />
            )}
            {side === 'pintor' && manager && review && <AnswerForm engagementId={id} initial={review.resposta} />}
            {side === 'pintor' && !review && <p className="text-[17px] text-slate-600">O cliente ainda não avaliou.</p>}
          </div>
          <p className="mt-3 text-[15px] text-slate-500">
            {category === 'concluida'
              ? 'A avaliação entra na nota média do pintor e aparece, sem o nome do cliente, quando o pintor faz novas propostas.'
              : 'Por ser uma obra cancelada, esta avaliação não entra na nota média do pintor; fica visível só nesta contratação, para as duas partes.'}
          </p>
        </section>
      )}

      <section className={card}>
        <h2 className="font-semibold">Histórico</h2>
        <ol className="mt-3 space-y-2 text-[17px]">
          {e.history.map((x, i) => (
            <li key={i} className="flex flex-wrap justify-between gap-2">
              <span>{x.event}</span>
              <span className="text-slate-500">{dt(x.at)}</span>
            </li>
          ))}
        </ol>
        {/* O aviso do certificado por confirmar subiu para a banda do topo (05/11/2026): era uma segunda caixa
            de fundo vermelho no mesmo ecrã, e o que se pode resolver é âmbar (regra 13). */}
        {events.some((v) => (v.payload as { documentHash?: string } | null)?.documentHash) && (
          <div className="mt-4 border-t border-slate-100 pt-3 text-[15px] text-slate-500">
            {events
              .filter((v) => (v.payload as { documentHash?: string } | null)?.documentHash)
              .map((v) => (
                <p key={v.id} className="break-all">
                  {EVENT_LABELS[v.kind]}
                  {(v.payload as { signatario?: string }).signatario ? ` por ${(v.payload as { signatario?: string }).signatario}` : ''}
                  {(v.payload as { metodo?: string }).metodo === 'cmd_pdf'
                    ? (v.payload as { cadeiaConfiavel?: boolean }).cadeiaConfiavel
                      ? ' (assinatura em PDF, certificado do Estado)'
                      : ' (assinatura em PDF, origem do certificado por confirmar)'
                    : ' (aceitação simples, só em testes)'}
                  : SHA-256{' '}
                  {(v.payload as { documentHash: string }).documentHash}
                </p>
              ))}
          </div>
        )}
        {replay.rejected.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3 text-[17px] text-red-800">
            <p className="font-medium">Registos sem efeito</p>
            <ul className="mt-1 list-disc pl-5">
              {replay.rejected.map((r) => (
                <li key={r.event.id}>
                  {EVENT_LABELS[r.event.kind]} ({dt(r.event.at)}): {r.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
