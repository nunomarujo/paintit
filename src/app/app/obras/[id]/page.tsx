import Link from 'next/link';
import { AddendaList } from '@/components/AddendaList';
import type { ProductType } from '@/domain/catalog';
import type { ProdutoSugerivel } from '@/domain/produtoSugerido';
import { loadReferences } from '@/lib/reference';
import { margemDaObra } from '@/domain/margin';
import { custoDasHoras, custoHoraEm, suplementaresDe } from '@/domain/overtime';
import { FASE_LABELS, FASE_PORQUE, faltas, porFase } from '@/domain/worksiteDiary';
import { DayLog } from './DayLog';
import { Cobranca } from './Cobranca';
import { ExpenseForm } from './ExpenseForm';
import { AddDiaryPhoto, RemoveDiaryPhoto } from './Diary';
import { TranchesDoContrato } from './TranchesDoContrato';
import { parseFases } from '@/domain/proposal';
import { tranchesDoContrato, type TrancheDoContrato } from '@/domain/tranchesDoContrato';
import { ProposeAddenda, WithdrawAddenda } from './AddendaForms';
import { notFound } from 'next/navigation';
import {
  addEntry,
  addMember,
  addPhase,
  criarTranchesDoContrato,
  deleteWorksiteRow,
  markTrancheReceived,
  orderMaterial,
  reviewSupplier,
  setOrderState,
  setPhaseState,
} from '@/app/app/obras/actions';
import { MiniForm } from '@/components/MiniForm';
import { consumption, discounted, productLabel } from '@/domain/catalog';
import { localDate } from '@/domain/deadline';
import { formatEuros } from '@/domain/money';
import { CURRENT_RULES } from '@/domain/rules';
import {
  COST_CATEGORIES,
  COST_LABELS,
  CREW_ROLE_LABELS,
  MEMBER_ROLES,
  PAYMENT_LABELS,
  PAYMENT_METHODS,
  summarize,
  type CostCategory,
  type CrewRole,
  type PaymentMethod,
} from '@/domain/worksite';
import { canManage, myRole } from '@/lib/access';
import { Voltar } from '@/components/Voltar';
import { getUser } from '@/lib/supabase/server';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
const pt = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—');
const del = 'text-[15px] text-red-700 hover:underline';
const ORDER: Record<string, string> = { pedida: 'Pedida', confirmada: 'Venda confirmada', entregue: 'Entregue em obra', cancelada: 'Cancelada' };
const SCORES = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }));
const PHASE: Record<string, string> = { por_iniciar: 'Por iniciar', em_curso: 'Em curso', concluida: 'Concluída' };

// Gestão de obra: interna do pintor, opcional. O cliente não a vê.
export default async function WorksitePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const { id } = await params;
  const { s: section = 'resumo' } = await searchParams;
  const { supabase, user } = await getUser();
  // O identificador da rota é o da obra. Uma obra pode ter contratação da plataforma por trás, ou ser
  // uma obra própria do pintor, ganha por fora — as ferramentas são as mesmas (decisão de 25/10/2026).
  const { data: w } = await supabase.from('worksites').select('*').eq('id', id).maybeSingle();
  if (!w) notFound();
  const { data: org } = await supabase.from('organizations').select('id, nome, gerida_por').eq('id', w.org_id).maybeSingle();
  const role = org ? await myRole(supabase, user!.id, org) : null;
  if (!org || !role) notFound();
  const manager = canManage(role);

  const { data: e } = w.engagement_id
    ? await supabase.from('engagements').select('*').eq('id', w.engagement_id).maybeSingle()
    : { data: null };

  const [{ data: lines }, { data: members }, { data: phases }, { data: entries }, { data: orders }, { data: listing }] =
    await Promise.all([
      e ? supabase.from('proposal_lines').select('*').eq('proposal_id', e.proposal_id).order('created_at') : Promise.resolve({ data: [] }),
      supabase.from('worksite_members').select('*').eq('worksite_id', id).order('created_at'),
      supabase.from('worksite_phases').select('*').eq('worksite_id', id).order('inicio', { nullsFirst: false }),
      supabase.from('worksite_entries').select('*').eq('worksite_id', id).order('data', { ascending: false }),
      e ? supabase.from('material_orders').select('*').eq('engagement_id', e.id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      e ? supabase.from('request_listings').select('ref, concelho').eq('request_id', e.request_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
  const { data: fotosRows } = await supabase
    .from('worksite_photos')
    .select('id, fase, zona, produto, legenda, registada_em')
    .eq('worksite_id', id)
    .order('registada_em');
  const fotos = (fotosRows ?? []).map((f) => ({
    id: f.id,
    fase: f.fase,
    zona: f.zona,
    produto: f.produto,
    legenda: f.legenda,
    registadaEm: f.registada_em,
  }));

  const { data: addendaRows } = await supabase
    .from('worksite_addenda')
    .select('id, descricao, valor_cents, estado, criada_em, respondida_em, foto_path')
    .eq('worksite_id', id)
    .order('criada_em', { ascending: false });
  const addenda = (addendaRows ?? []).map((a) => ({
    id: a.id,
    descricao: a.descricao,
    valorCents: a.valor_cents,
    estado: a.estado,
    criadaEm: a.criada_em,
    respondidaEm: a.respondida_em,
    temFotografia: Boolean(a.foto_path),
  }));
  const productIds = [...new Set((lines ?? []).map((l) => l.product_id).filter((x): x is string => Boolean(x)))];
  const { data: products } = productIds.length ? await supabase.from('products').select('*').in('id', productIds) : { data: [] };
  // O que o campo "Produto aplicado" do diário sugere. Primeiro os produtos que o orçamento desta
  // obra já previu — é a resposta certa quase sempre, e aparece antes de se escrever uma letra —,
  // depois o catálogo de referência inteiro. O texto que fica escrito é o nome canónico, para que
  // `usedProducts` (src/lib/reference.ts) o reconheça mais tarde sem precisar de coluna nenhuma.
  const produtosSugeridos: ProdutoSugerivel[] = [
    ...(products ?? []).map((p) => ({
      label: `${p.marca} ${p.nome}`,
      tipo: p.tipo as ProductType,
      origem: 'obra' as const,
      detalhe: p.embalagem_ml ? `${(p.embalagem_ml / 1000).toLocaleString('pt-PT')} L` : null,
    })),
    ...(await loadReferences(supabase)).map((r) => ({
      label: `${r.marca} ${r.nome}`,
      tipo: r.tipo as ProductType,
      origem: 'catalogo' as const,
      detalhe: r.acabamento,
    })),
  ];

  // O plano de pagamentos do contrato, só quando faz falta: a obra veio da plataforma e ainda não
  // tem tranches nenhumas. Acrescentar por cima de um plano que o pintor já montou à mão seria
  // duplicar-lhe a cobrança, e por isso nem se oferece.
  const semTranches = !(entries ?? []).some((x) => x.tipo === 'tranche');
  let planoDoContrato: TrancheDoContrato[] = [];
  if (w.engagement_id && semTranches) {
    const { data: contrato } = await supabase.from('engagements').select('proposal_id').eq('id', w.engagement_id).maybeSingle();
    const { data: proposta } = contrato
      ? await supabase.from('proposals').select('adiantamento_bps, fases, base_cents, iva_cents').eq('id', contrato.proposal_id).maybeSingle()
      : { data: null };
    if (proposta) {
      planoDoContrato = tranchesDoContrato({
        // O que o cliente paga é o preço com IVA: é sobre isso que as percentagens incidem.
        totalCents: (proposta.base_cents ?? 0) + (proposta.iva_cents ?? 0),
        adiantamentoBps: proposta.adiantamento_bps,
        fases: parseFases(proposta.fases),
        inicio: w.inicio,
        fim: w.fim,
      });
    }
  }

  const supplierIds = [...new Set((products ?? []).map((p) => p.org_id))];
  const [{ data: suppliers }, { data: myReviews }] = await Promise.all([
    supplierIds.length ? supabase.from('organizations').select('id, nome, email_contacto, telefone').in('id', supplierIds) : Promise.resolve({ data: [] }),
    supabase.from('supplier_reviews').select('*').eq('painter_org_id', org.id),
  ]);

  const today = localDate(new Date(), CURRENT_RULES.timeZone);
  const list = entries ?? [];

  // As horas de todas as obras da empresa, porque o limiar das 100 horas anuais é por trabalhador e
  // não por obra. Sem isto, quem anda em três obras nunca lá chega em nenhuma e o custo sai por
  // baixo (corrigido a 25/10/2026; era uma aproximação conhecida).
  const { data: horasDaEmpresa } = await supabase
    .from('worksite_entries')
    .select('id, horas, member_id, data, tipo_dia')
    .eq('painter_org_id', w.org_id)
    .eq('tipo', 'horas');
  // A ficha da obra aponta para a pessoa da empresa; é a pessoa que conta para o limiar anual, e é
  // dela que vem o custo por hora, ao valor que tinha na data do trabalho.
  const [{ data: atribuicoes }, { data: custosPorHora }] = await Promise.all([
    supabase.from('worksite_members').select('id, person_id').eq('painter_org_id', w.org_id),
    supabase
      .from('painter_person_rates')
      .select('person_id, desde, custo_hora_cents, painter_people!inner(painter_org_id)')
      .eq('painter_people.painter_org_id', w.org_id),
  ]);
  const pessoaDaFicha = new Map((atribuicoes ?? []).map((m) => [m.id, m.person_id]));
  const tabelaDe = new Map<string, { desde: string; custoHoraCents: number }[]>();
  for (const r of custosPorHora ?? []) {
    const lista = tabelaDe.get(r.person_id) ?? [];
    lista.push({ desde: r.desde, custoHoraCents: r.custo_hora_cents });
    tabelaDe.set(r.person_id, lista);
  }
  const custoHoraNaData = (memberId: string | null, data: string | null) => {
    const pessoa = memberId ? pessoaDaFicha.get(memberId) : null;
    return pessoa ? custoHoraEm(tabelaDe.get(pessoa) ?? [], data) : null;
  };

  const custoPorLinha = custoDasHoras(
    (horasDaEmpresa ?? []).map((x) => ({
      id: x.id,
      horas: x.horas ?? 0,
      custoHora: custoHoraNaData(x.member_id, x.data),
      pessoaId: x.member_id ? (pessoaDaFicha.get(x.member_id) ?? null) : null,
      data: x.data,
      tipoDia: x.tipo_dia,
    })),
  );

  const sum = summarize({
    contrato: w.valor_cents ?? e?.base_cents ?? 0,
    tranches: list.filter((x) => x.tipo === 'tranche').map((x) => ({ valor: x.valor_cents ?? 0, prevista: x.prevista, recebidaEm: x.recebida_em })),
    costs: list.filter((x) => x.tipo === 'custo').map((x) => ({ categoria: x.categoria as CostCategory, valor: x.valor_cents ?? 0 })),
    // Ordenadas por data: o limiar anual das 100 horas aplica-se pela ordem em que elas aconteceram.
    hours: list
      .filter((x) => x.tipo === 'horas')
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((x) => ({
        id: x.id,
        horas: x.horas ?? 0,
        custoHora: custoHoraNaData(x.member_id, x.data),
        memberId: x.member_id,
        data: x.data,
        tipoDia: x.tipo_dia,
      })),
    today,
    custoPorLinha,
  });
  // Horas suplementares já feitas este ano por cada pessoa, em todas as obras da empresa — que é
  // como a lei conta o limiar das 100 horas.
  // O que já está guardado para hoje nesta obra: com isso, a acção passa a ser corrigir e não
  // registar outra vez por cima sem dar por isso.
  const horasDeHoje = list.filter((x) => x.tipo === 'horas' && x.data === today);

  const anoAtual = today.slice(0, 4);
  const suplementaresPorPessoa = new Map<string, number>();
  for (const x of horasDaEmpresa ?? []) {
    const pessoa = x.member_id ? pessoaDaFicha.get(x.member_id) : null;
    if (!pessoa || x.data.slice(0, 4) !== anoAtual) continue;
    const extra = suplementaresDe({ horas: x.horas ?? 0, tipoDia: x.tipo_dia ?? 'util' });
    suplementaresPorPessoa.set(pessoa, (suplementaresPorPessoa.get(pessoa) ?? 0) + extra);
  }

  // Preço cobrado contra custo real: é isto que faz valer a pena registar o dia (25/10/2026).
  const margem = margemDaObra({
    valorCents: w.valor_cents ?? e?.base_cents ?? 0,
    areaCm2: w.area_cm2,
    custosDiretos: sum.custos - sum.maoDeObra,
    maoDeObra: sum.maoDeObra,
    horas: sum.horas,
  });

  const grupos = porFase(fotos);
  const faltasDoDiario = faltas(fotos);

  const memberOptions = (members ?? []).map((m) => ({ value: m.id, label: m.nome }));
  const tabs = [
    ['dia', 'Registar o dia'],
    ['resumo', 'Resumo'],
    ['materiais', 'Materiais'],
    ['equipa', 'Equipa e horas'],
    ['cronograma', 'Cronograma'],
    ['financeiro', 'Custos e tranches'],
    ['adendas', 'Trabalhos a mais'],
    ['diario', 'Diário'],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <Voltar href={`/app/contratacoes/${id}`}>Contratação</Voltar>
        <h1 className="mt-3 text-[26px] leading-tight font-semibold">Gestão de obra</h1>
        <p className="mt-1 text-[17px] text-slate-600">
          Obra {listing?.ref ?? id.slice(0, 8).toUpperCase()} · {listing?.concelho ?? ''}. Só a sua equipa vê esta página; a
          plataforma não intervém na execução.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-slate-200 text-[17px]">
        {tabs.map(([k, label]) => (
          <Link
            key={k}
            href={`/app/obras/${id}?s=${k}`}
            className={`-mb-px border-b-2 px-3 py-2 ${section === k ? 'border-tinta-600 font-semibold text-tinta-900' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {section === 'resumo' && (
        <section className={card}>
          {!margem.fiavel && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[17px] text-amber-900">
              <strong className="font-semibold">A margem abaixo está incompleta:</strong> ainda não há horas registadas
              nesta obra, por isso o custo da mão de obra é zero e a margem parece melhor do que é.{' '}
              <Link href={`/app/obras/${id}?s=dia`} className="font-semibold underline underline-offset-4">
                Registar o dia
              </Link>
            </p>
          )}
          <dl className="grid gap-x-6 gap-y-1 text-[17px] sm:grid-cols-2">
            <dt className="text-slate-500">Valor do contrato (sem IVA)</dt>
            <dd className="font-semibold sm:text-right">{formatEuros(sum.contrato)}</dd>
            <dt className="text-slate-500">Recebido</dt>
            <dd className="sm:text-right">{formatEuros(sum.recebido)}</dd>
            <dt className="text-slate-500">Por receber</dt>
            <dd className="sm:text-right">{formatEuros(sum.porReceber)}</dd>
            {sum.emAtraso > 0 && (
              // Regra 13 do CLAUDE.md: uma tranche em atraso ainda se cobra — âmbar, não vermelho
              // (27/10/2026); dentro de lista, o alarme é texto, nunca fundo de cor.
              <>
                <dt className="text-amber-800">Tranches em atraso</dt>
                <dd className="text-amber-800 sm:text-right">{formatEuros(sum.emAtraso)}</dd>
              </>
            )}
            <dt className="text-slate-500">Custos registados</dt>
            <dd className="sm:text-right">{formatEuros(sum.custos)}</dd>
            <dt className="text-slate-500">
              dos quais mão de obra ({(sum.horas / 100).toLocaleString('pt-PT')} h
              {sum.suplementares > 0 ? `, ${(sum.suplementares / 100).toLocaleString('pt-PT')} h a mais` : ''})
            </dt>
            <dd className="sm:text-right">{formatEuros(sum.maoDeObra)}</dd>
            <dt className="text-slate-500">Margem prevista</dt>
            <dd className={`font-semibold sm:text-right ${sum.margem < 0 ? 'text-red-700' : ''}`}>
              {formatEuros(sum.margem)}
              {sum.margemBps !== null ? ` (${(sum.margemBps / 100).toLocaleString('pt-PT')}%)` : ''}
            </dd>
            {margem.custoPorM2 !== null && (
              <>
                <dt className="text-slate-500">Custou-lhe, por m²</dt>
                <dd className="sm:text-right">
                  <span className="tabular-nums">{formatEuros(margem.custoPorM2)}</span>
                  {margem.precoPorM2 !== null && (
                    <span className="text-slate-500"> · cobrou {formatEuros(margem.precoPorM2)}</span>
                  )}
                </dd>
              </>
            )}
            {sum.semPlano > 0 && (
              <>
                <dt className="text-slate-500">Valor ainda sem tranche planeada</dt>
                <dd className="sm:text-right">{formatEuros(sum.semPlano)}</dd>
              </>
            )}
          </dl>
          {Object.keys(sum.porCategoria).length > 0 && (
            <ul className="mt-4 border-t border-slate-100 pt-3 text-[17px]">
              {Object.entries(sum.porCategoria).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span className="text-slate-500">{COST_LABELS[k as CostCategory]}</span>
                  <span>{formatEuros(v)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {section === 'dia' && (
        <section className={card}>
          <h2 className="text-[17px] font-semibold">Registar o dia</h2>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
            Vem preenchido com o dia normal para toda a gente: corrija só o que foi diferente e guarde. É daqui que sai
            a margem real da obra — sem horas registadas, o custo da mão de obra é um palpite.
          </p>
          <div className="mt-4">
            <DayLog
              worksiteId={id}
              equipa={(members ?? [])
                .filter((m) => m.ativo)
                // Pela pessoa e não pela ficha: o limiar anual é dela e conta todas as obras.
                .map((m) => ({ id: m.id, nome: m.nome, suplementaresNoAno: suplementaresPorPessoa.get(m.person_id ?? '') ?? 0 }))}
              hoje={today}
              jaRegistado={horasDeHoje.length > 0 ? { pessoas: horasDeHoje.length, horas: horasDeHoje.reduce((n, x) => n + (x.horas ?? 0), 0) } : undefined}
            />
          </div>
        </section>
      )}

      {section === 'diario' && (
        <section className={card}>
          <h2 className="text-[17px] font-semibold">Diário da obra</h2>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
            O estado em que encontrou o suporte, o que fez por baixo da tinta e o resultado. Seis meses depois, numa
            reclamação, é isto que a defende — e serve de portefólio quando a obra corre bem.
          </p>

          {faltasDoDiario.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[17px] text-amber-900">
              {faltasDoDiario.map((f) => (
                <p key={f}>{f}</p>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-5">
            {grupos.length === 0 ? (
              <p className="text-[17px] text-slate-600">Ainda não há fotografias nesta obra.</p>
            ) : (
              grupos.map((g) => (
                <div key={g.fase}>
                  <p className="eyebrow">{FASE_LABELS[g.fase]}</p>
                  <p className="mt-0.5 text-[15px] text-slate-500">{FASE_PORQUE[g.fase]}</p>
                  <ul className="mt-2 grid gap-3 sm:grid-cols-3">
                    {g.fotos.map((f) => (
                      <li key={f.id} className="overflow-hidden rounded-xl border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/app/obras/foto/${f.id}`} alt={f.legenda ?? FASE_LABELS[f.fase]} className="aspect-[4/3] w-full object-cover" />
                        <div className="px-3 py-2">
                          <p className="text-[15px] text-slate-700">{f.legenda ?? '—'}</p>
                          <p className="text-[15px] text-slate-500">
                            {[f.zona, f.produto].filter(Boolean).join(' · ')}
                            {f.zona || f.produto ? ' · ' : ''}
                            {f.registadaEm.slice(0, 10).split('-').reverse().join('/')}
                          </p>
                          {manager && (
                            <div className="mt-1">
                              <RemoveDiaryPhoto worksiteId={id} photoId={f.id} />
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>

          {manager && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="eyebrow mb-2">Juntar uma fotografia</p>
              <AddDiaryPhoto worksiteId={id} produtos={produtosSugeridos} />
            </div>
          )}
        </section>
      )}

      {section === 'adendas' && (
        <section className={card}>
          <h2 className="text-[17px] font-semibold">Trabalhos a mais</h2>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
            O que o cliente pediu a mais durante a obra, com preço e aceitação registados. Sem isto escrito, ou não se
            cobra ou cobra-se e discute-se — e só conta para o valor da obra depois de o cliente aceitar. O que fizer
            e não quiser cobrar também se regista aqui: fica a dizer ao cliente o que recebeu de borla.
          </p>
          <div className="mt-4">
            <AddendaList
              addenda={addenda}
              hoje={today}
              vazio="Ainda não há trabalhos a mais registados nesta obra."
              acoes={(a) => (a.estado === 'proposta' && manager ? <WithdrawAddenda engagementId={id} addendaId={a.id} /> : null)}
            />
          </div>
          {manager && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="eyebrow mb-2">Registar um trabalho a mais</p>
              <ProposeAddenda engagementId={id} />
            </div>
          )}
        </section>
      )}

      {section === 'materiais' && (
        <section className={`${card} space-y-6 text-[17px]`}>
          <p className="text-slate-600">
            Materiais comprometidos do contrato. A quantidade sugerida usa a área da linha, as demãos e o rendimento do
            produto. O fornecedor confirma a venda e a entrega, e o cliente vê essa confirmação.{' '}
            <Link href="/app/catalogo" className="text-tinta-700 hover:underline">
              Procurar outros produtos e preços
            </Link>
          </p>
          {(lines ?? []).filter((l) => l.product_id).length === 0 && <p>Esta proposta não tem materiais comprometidos.</p>}
          {(lines ?? [])
            .filter((l) => l.product_id)
            .map((l) => {
              const p = (products ?? []).find((x) => x.id === l.product_id);
              if (!p) return null;
              const s = (suppliers ?? []).find((x) => x.id === p.org_id);
              const c = l.unidade === 'm2' ? consumption(l.quantidade, l.demaos ?? p.demaos_recomendadas ?? 2, {
                rendimento: p.rendimento,
                embalagemMl: p.embalagem_ml,
                precoReferencia: l.preco_fornecedor_cents,
              }) : null;
              return (
                <div key={l.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-semibold">{productLabel(p)}</p>
                  <p className="text-slate-600">
                    {l.descricao} · {s?.nome}
                    {s?.telefone ? ` · ${s.telefone}` : ''}
                    {s?.email_contacto ? ` · ${s.email_contacto}` : ''}
                  </p>
                  {c && (
                    <p className="mt-1">
                      Sugestão: {(c.ml / 1000).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} {p.unidade}
                      {c.embalagens !== null ? `, ${c.embalagens} embalagens` : ''}
                      {l.preco_fornecedor_cents !== null && c.embalagens !== null
                        ? `, cerca de ${formatEuros(c.embalagens * discounted(l.preco_fornecedor_cents, l.desconto_bps ?? 0))} com desconto`
                        : ''}
                    </p>
                  )}
                  {manager && (
                    <div className="mt-3">
                      <MiniForm
                        action={orderMaterial.bind(null, id, p.id)}
                        submit="Encomendar ao fornecedor"
                        fields={[
                          { name: 'embalagens', label: 'Embalagens', placeholder: c?.embalagens ? String(c.embalagens) : '' },
                          { name: 'nota', label: 'Nota (data e local de entrega)', wide: true },
                        ]}
                      />
                    </div>
                  )}
                </div>
              );
            })}

          {(orders ?? []).length > 0 && (
            <div>
              <h3 className="font-semibold">Encomendas</h3>
              <ul className="mt-2 divide-y divide-slate-100">
                {(orders ?? []).map((o) => {
                  const p = (products ?? []).find((x) => x.id === o.product_id);
                  return (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                      <span>
                        {o.embalagens} × {p ? productLabel(p) : 'produto'} · {ORDER[o.estado]}
                        {o.delivered_at ? ` a ${pt(o.delivered_at.slice(0, 10))}` : ''}
                      </span>
                      {manager && o.estado === 'pedida' && (
                        <form action={setOrderState.bind(null, o.id, 'cancelada', `/app/obras/${id}`)}>
                          <button type="submit" className={del}>
                            Cancelar
                          </button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {manager &&
            supplierIds
              .filter((sid) => (orders ?? []).some((o) => o.supplier_org_id === sid && ['confirmada', 'entregue'].includes(o.estado)))
              .map((sid) => {
                const r = (myReviews ?? []).find((x) => x.supplier_org_id === sid);
                return (
                  <div key={sid} className="rounded-xl border border-slate-200 p-4">
                    <h3 className="font-semibold">Avaliar {(suppliers ?? []).find((x) => x.id === sid)?.nome}</h3>
                    {r && (
                      <p className="text-slate-600">
                        A sua avaliação: produto {r.produto}/5 · entrega {r.entrega}/5 · atendimento {r.atendimento}/5. Pode alterá-la.
                      </p>
                    )}
                    {r?.resposta && (
                      <p className="mt-1 rounded-lg bg-slate-50 p-2 text-slate-700">
                        <span className="text-slate-500">Resposta do fornecedor: </span>
                        {r.resposta}
                      </p>
                    )}
                    <div className="mt-2">
                      <MiniForm
                        action={reviewSupplier.bind(null, id, sid, org.id)}
                        submit={r ? 'Atualizar avaliação' : 'Avaliar'}
                        fields={[
                          { name: 'produto', label: 'Produto', options: SCORES },
                          { name: 'entrega', label: 'Entrega', options: SCORES },
                          { name: 'atendimento', label: 'Atendimento', options: SCORES },
                          { name: 'comentario', label: 'Comentário', type: 'textarea' },
                        ]}
                      />
                    </div>
                  </div>
                );
              })}
        </section>
      )}

      {section === 'equipa' && (
        <section className={`${card} space-y-6 text-[17px]`}>
          <ul className="divide-y divide-slate-100">
            {(members ?? []).map((m) => {
              const h = list.filter((x) => x.tipo === 'horas' && x.member_id === m.id).reduce((n, x) => n + (x.horas ?? 0), 0);
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                  <span>
                    <span className="font-medium">{m.nome}</span> · {CREW_ROLE_LABELS[m.funcao as CrewRole]}
                    {m.telefone ? ` · ${m.telefone}` : ''}
                    {m.custo_hora_cents !== null ? ` · ${formatEuros(m.custo_hora_cents)}/h` : ''} · {(h / 100).toLocaleString('pt-PT')} h
                  </span>
                  {manager && (
                    <form action={deleteWorksiteRow.bind(null, id, 'worksite_members', m.id)}>
                      <button type="submit" className={del}>
                        Remover
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
          {manager && (
            <>
              <MiniForm
                action={addMember.bind(null, id)}
                submit="Acrescentar pessoa"
                fields={[
                  { name: 'nome', label: 'Nome' },
                  { name: 'funcao', label: 'Função', options: MEMBER_ROLES.map((r) => ({ value: r, label: CREW_ROLE_LABELS[r] })) },
                  { name: 'telefone', label: 'Telefone' },
                  { name: 'custoHora', label: 'Custo por hora (€)' },
                ]}
              />
              <div className="border-t border-slate-100 pt-6">
                <h3 className="mb-2 font-semibold">Registar horas</h3>
                <MiniForm
                  action={addEntry.bind(null, id, 'horas')}
                  submit="Registar"
                  fields={[
                    { name: 'member', label: 'Pessoa', options: memberOptions },
                    { name: 'data', label: 'Dia', type: 'date' },
                    { name: 'horas', label: 'Horas', placeholder: '7,5' },
                    { name: 'descricao', label: 'Trabalho feito' },
                  ]}
                />
              </div>
            </>
          )}
        </section>
      )}

      {section === 'cronograma' && (
        <section className={`${card} space-y-6 text-[17px]`}>
          <ol>
            {(phases ?? []).map((ph, i, all) => (
              <li key={ph.id} className="relative flex flex-wrap items-start justify-between gap-2 pb-6 pl-12">
                {i < all.length - 1 && <span className="absolute bottom-0 left-[15px] top-8 w-px bg-slate-200" aria-hidden="true" />}
                <span
                  className={`absolute left-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full border text-[15px] ${
                    ph.estado === 'concluida' ? 'border-tinta-600 bg-tinta-600 text-white' : ph.estado === 'em_curso' ? 'border-tinta-600 bg-sage' : 'border-slate-200 bg-slate-100'
                  }`}
                  aria-hidden="true"
                >
                  {ph.estado === 'concluida' ? '✓' : i + 1}
                </span>
                <span>
                  <span className="font-medium">{ph.nome}</span> · {pt(ph.inicio)} a {pt(ph.fim)} · {PHASE[ph.estado]}
                  {/* Regra 13 do CLAUDE.md: a fase ainda está em curso, só passou da data prevista —
                      âmbar, não vermelho (27/10/2026). */}
                  {ph.estado !== 'concluida' && ph.fim && ph.fim < today && <span className="ml-2 text-amber-800">atrasada</span>}
                </span>
                {manager && (
                  <span className="flex gap-3">
                    {ph.estado === 'por_iniciar' && (
                      <form action={setPhaseState.bind(null, id, ph.id, 'em_curso')}>
                        <button type="submit" className="text-[15px] text-tinta-700 hover:underline">
                          Iniciar
                        </button>
                      </form>
                    )}
                    {ph.estado === 'em_curso' && (
                      <form action={setPhaseState.bind(null, id, ph.id, 'concluida')}>
                        <button type="submit" className="text-[15px] text-tinta-700 hover:underline">
                          Concluir
                        </button>
                      </form>
                    )}
                    <form action={deleteWorksiteRow.bind(null, id, 'worksite_phases', ph.id)}>
                      <button type="submit" className={del}>
                        Remover
                      </button>
                    </form>
                  </span>
                )}
              </li>
            ))}
          </ol>
          {manager && (
            <MiniForm
              action={addPhase.bind(null, id)}
              submit="Acrescentar fase"
              fields={[
                { name: 'nome', label: 'Fase', placeholder: 'Ex.: montagem de andaimes' },
                { name: 'inicio', label: 'Início', type: 'date' },
                { name: 'fim', label: 'Fim', type: 'date' },
              ]}
            />
          )}
        </section>
      )}

      {section === 'financeiro' && (
        <section className={`${card} space-y-6 text-[17px]`}>
          {/* A despesa fica à cabeça, porque é o que se faz todos os dias; as tranches lêem-se de
              vez em quando. */}
          <div>
            <h3 className="font-semibold">Lançar uma despesa</h3>
            <div className="mt-2">
              <ExpenseForm worksiteId={id} />
            </div>
          </div>
          <div>
            <h3 className="font-semibold">Tranches do cliente</h3>
            {manager && planoDoContrato.length > 0 && (
              <div className="mt-2">
                <TranchesDoContrato
                  action={criarTranchesDoContrato.bind(null, id)}
                  plano={planoDoContrato}
                  datadas={planoDoContrato.some((t) => t.prevista !== null)}
                />
              </div>
            )}
            <ul className="mt-2 divide-y divide-slate-100">
              {list
                .filter((x) => x.tipo === 'tranche')
                .map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                    <span>
                      {formatEuros(x.valor_cents ?? 0)} · {x.descricao || 'tranche'} · prevista {pt(x.prevista)}
                      {x.meio ? ` · ${PAYMENT_LABELS[x.meio as PaymentMethod]}` : ''}
                      {x.recebida_em ? (
                        <span className="text-tinta-700"> · recebida a {pt(x.recebida_em)}</span>
                      ) : x.prevista && x.prevista < today ? (
                        <span className="font-medium text-amber-800"> · em atraso</span>
                      ) : null}
                    </span>
                    {manager && !x.recebida_em && (
                      <form action={markTrancheReceived.bind(null, id, x.id)}>
                        <button type="submit" className="text-[15px] text-tinta-700 hover:underline">
                          Marcar recebida
                        </button>
                      </form>
                    )}
                  </li>
                ))}
            </ul>
            <div className="mt-4">
              <Cobranca
                worksiteId={id}
                ligada={!!w.cobranca}
                contacto={w.cliente_contacto}
                emAtrasoCents={list
                  .filter((x) => x.tipo === 'tranche' && !x.recebida_em && x.prevista && x.prevista < today)
                  .reduce((n, x) => n + (x.valor_cents ?? 0), 0)}
              />
            </div>
            {manager && (
              <div className="mt-3">
                <MiniForm
                  action={addEntry.bind(null, id, 'tranche')}
                  submit="Acrescentar tranche"
                  fields={[
                    { name: 'descricao', label: 'Descrição', placeholder: 'Ex.: 40% a meio da obra' },
                    { name: 'valor', label: 'Valor (€)' },
                    { name: 'prevista', label: 'Data prevista', type: 'date' },
                    { name: 'meio', label: 'Meio de pagamento', options: PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_LABELS[m] })) },
                  ]}
                />
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 pt-6">
            <h3 className="font-semibold">Custos</h3>
            <ul className="mt-2 divide-y divide-slate-100">
              {list
                .filter((x) => x.tipo === 'custo')
                .map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                    <span>
                      {pt(x.data)} · {COST_LABELS[x.categoria as CostCategory]} · {x.descricao} · {formatEuros(x.valor_cents ?? 0)}
                    </span>
                    {manager && (
                      <form action={deleteWorksiteRow.bind(null, id, 'worksite_entries', x.id)}>
                        <button type="submit" className={del}>
                          Remover
                        </button>
                      </form>
                    )}
                  </li>
                ))}
            </ul>
            {manager && (
              <div className="mt-3">
                <MiniForm
                  action={addEntry.bind(null, id, 'custo')}
                  submit="Registar custo"
                  fields={[
                    { name: 'categoria', label: 'Categoria', options: COST_CATEGORIES.map((c) => ({ value: c, label: COST_LABELS[c] })) },
                    { name: 'valor', label: 'Valor (€)' },
                    { name: 'data', label: 'Data', type: 'date' },
                    { name: 'descricao', label: 'Descrição' },
                  ]}
                />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
