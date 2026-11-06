import Link from 'next/link';
import { contagemDoContacto, contagemDoPrazo, quandoCurto } from '@/domain/contagem';
import { faltaParaVoltar, type Suspensao } from '@/domain/disponibilidade';
import { formatEuros, formatEurosCurto } from '@/domain/money';
import { percentagemEmPalavras, simularGanho, VALOR_DE_EXEMPLO_CENTS } from '@/domain/avaliador';
import { listaDoAvaliador, prontoParaLevantamentos, RECOMENDACAO_WHATSAPP, type SituacaoDoAvaliador } from '@/domain/prontidaoDoAvaliador';
import { SURVEYOR_SHARE_OF_VALUE_BP_MAX, SURVEYOR_SHARE_OF_VALUE_BP_MIN } from '@/domain/survey';
import { JanelaDePronto } from './JanelaDePronto';
import { resumoDaCobertura, zonaEfetiva, type Cobertura } from '@/domain/coberturaDaEmpresa';
import { LinhaDeLevantamento, type LevantamentoNaLista } from './LinhaDeLevantamento';

/**
 * Hoje — Avaliações (01/11/2026).
 *
 * O que isto substitui: uma página que mostrava uma caixa de avisos e mais nada. Um início assim não diz a
 * ninguém o que tem de fazer; obriga a procurar noutro sítio.
 *
 * A composição segue a maqueta aprovada pelo promotor: no topo o dia e a **próxima ação**, com o botão ao
 * lado; a seguir «O seu trabalho», em curso ou concluídos, uma linha por levantamento; e no fim dois cartões
 * — oportunidades e comissões — que são o que se *pode* fazer, não o que se *tem* de fazer.
 *
 * Recomposição v5 (01/11/2026, canvas «Quem Pinta — landing v5», artboard App-Hoje): o cartão da
 * próxima ação está **sempre** presente, em marinho, com o rótulo em lima — é o único fundo de cor forte
 * do ecrã (regra 13); «Nada por fazer agora» é um estado dele, não a sua ausência. A presença da pessoa
 * (disponível / suspensa) vive numa pílula à direita do título, não numa segunda banda. Dentro das listas
 * o alarme é texto.
 */

export type EstadoDeHoje = {
  /** Por urgência: o primeiro é o que está no topo. */
  emCurso: LevantamentoNaLista[];
  concluidos: LevantamentoNaLista[];
  oportunidades: number;
  comissoesDisponiveis: number;
  suspenso?: Suspensao | null;
  /** A zona da empresa; `null` = nunca escolhida (06/11/2026: sem zona não chegam oportunidades). */
  cobertura?: Cobertura | null;
  /** O concelho da morada da empresa: vale quando a empresa não escolheu concelhos. */
  concelhoDaEmpresa?: string | null;
  /** O que falta para receber levantamentos e, quando está tudo, quanto pode ganhar (06/11/2026). */
  avaliador?: { userId: string; situacao: SituacaoDoAvaliador };
};

const DIA = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Lisbon',
});

/** «Segunda-feira, 2 de novembro» — maiúscula só na primeira letra. A classe `capitalize` do Tailwind
 * punha maiúscula em cada palavra («Segunda-Feira, 2 De Novembro»), que não é português. */
function diaPorExtenso(d: Date): string {
  const t = DIA.format(d);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function Cartao({
  titulo,
  nota,
  destaque,
  href,
  acao,
  nevoa,
}: {
  titulo: string;
  nota: string;
  destaque?: string;
  href: string;
  acao: string;
  nevoa?: boolean;
}) {
  return (
    <section className={`flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 sm:p-5 ${nevoa ? 'bg-tinta-50' : 'bg-white'}`}>
      <h3 className="font-semibold text-slate-900">{titulo}</h3>
      {destaque && <p className="text-[34px] font-bold leading-[1.1] tracking-[-0.02em] text-slate-900">{destaque}</p>}
      <p className="max-w-[54ch] text-[15px] text-slate-600">{nota}</p>
      <Link href={href} className="btn-secondary mt-2 self-start">
        {acao} →
      </Link>
    </section>
  );
}

/**
 * O topo de «Hoje» para quem ainda não recebe levantamentos, ou quanto pode ganhar quando já recebe
 * (promotor, 06/11/2026; `src/domain/prontidaoDoAvaliador.ts`).
 *
 * Os valores saíram da página pública: só aparecem aqui, depois da inscrição e das zonas. Antes disso, a
 * lista do que falta — os dois passos obrigatórios e o WhatsApp, recomendado. Cartão branco com borda:
 * o único fundo de cor forte do ecrã continua a ser a próxima ação (regra 13).
 */
function Avaliador({ userId, situacao }: { userId: string; situacao: SituacaoDoAvaliador }) {
  const g = simularGanho(VALOR_DE_EXEMPLO_CENTS);
  const intervalo = `${formatEurosCurto(g.minimoCents)} a ${formatEurosCurto(g.maximoCents)}`;
  const exemplo = `Numa obra adjudicada por ${formatEurosCurto(VALOR_DE_EXEMPLO_CENTS)}, sem IVA.`;
  const banda = `Entre ${percentagemEmPalavras(SURVEYOR_SHARE_OF_VALUE_BP_MIN)} e ${percentagemEmPalavras(SURVEYOR_SHARE_OF_VALUE_BP_MAX)} do valor adjudicado`;

  if (prontoParaLevantamentos(situacao)) {
    return (
      <section aria-labelledby="ganho" className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="min-w-0">
          <h2 id="ganho" className="text-[15px] font-semibold text-slate-600">
            Quanto pode ganhar
          </h2>
          <p className="mt-1 text-[34px] font-bold leading-[1.1] tracking-[-0.02em] tabular-nums text-slate-900">{intervalo}</p>
          <p className="mt-1 max-w-[54ch] text-[15px] text-slate-600">
            {exemplo} {banda}, conforme a qualificação.
          </p>
          {situacao.zonaDaMorada && (
            <p className="mt-3 max-w-[54ch] text-[15px] text-slate-700">
              Os levantamentos chegam de {situacao.zonaDaMorada}, o concelho da morada da empresa.{' '}
              <Link href="/app/avaliacoes/disponibilidade" className="ligacao">
                {situacao.responsavel ? 'Escolher outros concelhos' : 'Ver as zonas'}
              </Link>
            </p>
          )}
          {!situacao.whatsappLigado && <p className="mt-3 max-w-[54ch] text-[15px] text-slate-700">{RECOMENDACAO_WHATSAPP}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          {!situacao.whatsappLigado && (
            <Link href="/app/avaliacoes/inscricao#avisos" className="btn-secondary">
              Ligar os avisos
            </Link>
          )}
          <Link href="/app/avaliacoes/inscricao#simulador" className="btn-quiet">
            Simular o ganho
          </Link>
        </div>
        <JanelaDePronto
          userId={userId}
          intervalo={intervalo}
          exemplo={exemplo}
          banda={banda}
          whatsappLigado={situacao.whatsappLigado}
          recomendacao={RECOMENDACAO_WHATSAPP}
        />
      </section>
    );
  }

  const lista = listaDoAvaliador(situacao);
  const faltam = lista.filter((i) => i.obrigatorio && !i.feito).length;
  return (
    <section aria-labelledby="falta" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 id="falta" className="text-[20px] font-semibold text-slate-900">
        Para começar a receber levantamentos
      </h2>
      <p className="mt-1 max-w-[54ch] text-[15px] text-slate-600">
        {faltam === 1 ? 'Falta um passo.' : `Faltam ${faltam} passos.`} Depois disso aparece aqui quanto pode ganhar.
      </p>
      <ol className="mt-4 divide-y divide-slate-200 border-t border-slate-200">
        {lista.map((i) => (
          <li key={i.passo} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <span
                aria-hidden="true"
                className={`mt-1.5 h-2.5 w-2.5 flex-none rounded-full ${i.feito ? 'bg-tinta-600' : i.obrigatorio ? 'border-2 border-slate-400' : 'border-2 border-dashed border-slate-400'}`}
              />
              <div className="min-w-0">
                <p className="text-[17px] font-semibold text-slate-900">
                  {i.titulo}
                  <span className="ml-2 text-[13px] font-normal text-slate-600">
                    {i.feito ? 'Feito' : i.obrigatorio ? 'Obrigatório' : 'Recomendado'}
                  </span>
                </p>
                {!i.feito && <p className="mt-0.5 max-w-[54ch] text-[15px] text-slate-600">{i.nota}</p>}
              </div>
            </div>
            {!i.feito && i.acao && (
              <Link href={i.href} className={`${i.obrigatorio ? 'btn-primary' : 'btn-secondary'} btn-sm shrink-0 self-start sm:self-center`}>
                {i.acao}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** A presença da pessoa, numa pílula: disponível (com a cobertura) ou suspensa até uma data. */
function Presenca({
  suspenso,
  cobertura,
  concelhoDaEmpresa,
}: {
  suspenso: Suspensao | null | undefined;
  cobertura: Cobertura | null | undefined;
  concelhoDaEmpresa: string | null | undefined;
}) {
  if (suspenso) {
    return (
      <Link
        href="/app/avaliacoes/disponibilidade"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-amber-50 px-4 text-[15px] font-semibold text-amber-900"
      >
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-500" />
        Suspensa até {suspenso.ateEmPalavras}
      </Link>
    );
  }
  const comZona = zonaEfetiva(cobertura, concelhoDaEmpresa).origem !== 'nenhuma';
  return (
    <Link
      href="/app/avaliacoes/disponibilidade"
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-full bg-tinta-100 px-4 text-[15px] font-semibold ${comZona ? 'text-tinta-700' : 'text-amber-800'}`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${comZona ? 'bg-tinta-600' : 'bg-amber-500'}`} />
      {comZona ? `Disponível · ${resumoDaCobertura(cobertura, concelhoDaEmpresa)}` : 'Sem concelhos escolhidos'}
    </Link>
  );
}

export function HojeAvaliacoes({
  estado,
  agoraIso,
  aba = 'em_curso',
}: {
  estado: EstadoDeHoje;
  agoraIso: string;
  aba?: 'em_curso' | 'concluidos';
}) {
  const agora = new Date(agoraIso);
  const primeira = estado.emCurso.find((l) => l.estado === 'por_contactar' || l.estado === 'agendado') ?? null;
  const contagem = primeira?.prazo
    ? primeira.prazoUtil
      ? contagemDoContacto(agora, new Date(primeira.prazo))
      : contagemDoPrazo(agora, new Date(primeira.prazo))
    : null;

  const lista = aba === 'concluidos' ? estado.concluidos : estado.emCurso;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[34px] font-bold leading-[1.15] tracking-[-0.025em] text-slate-900">Hoje</h1>
          <p className="mt-1 text-[17px] text-slate-600">{diaPorExtenso(agora)}</p>
        </div>
        <Presenca suspenso={estado.suspenso} cobertura={estado.cobertura} concelhoDaEmpresa={estado.concelhoDaEmpresa} />
      </div>

      {estado.avaliador && <Avaliador userId={estado.avaliador.userId} situacao={estado.avaliador.situacao} />}

      {(() => {
        const base = 'flex flex-col gap-4 rounded-2xl bg-tinta-900 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6';
        const rotulo = <p className="text-[13px] font-semibold text-lima">Próxima ação</p>;
        if (estado.suspenso) {
          return (
            <section aria-labelledby="agora" className={base}>
              <div className="min-w-0">
                {rotulo}
                <h2 id="agora" className="mt-1 text-[20px] font-semibold">
                  Presença suspensa até {estado.suspenso.ateEmPalavras}
                </h2>
                <p className="mt-1 max-w-[54ch] text-[15px] text-tinta-200">
                  {faltaParaVoltar(estado.suspenso)}. Durante este período não chegam oportunidades novas.
                </p>
              </div>
              <Link href="/app/avaliacoes/disponibilidade" className="btn-primary shrink-0">
                Rever a disponibilidade
              </Link>
            </section>
          );
        }
        if (primeira && contagem) {
          const q = quandoCurto(agora, new Date(primeira.prazo!));
          return (
            <section aria-labelledby="agora" className={base}>
              <div className="min-w-0">
                {rotulo}
                <h2 id="agora" className="mt-1 text-[20px] font-semibold">
                  {primeira.estado === 'por_contactar' ? 'Contactar o cliente' : 'Fazer a visita'} · {primeira.ref} · {primeira.concelho}
                </h2>
                <p className={`mt-1 text-[15px] ${contagem.vencido ? 'font-semibold text-amber-300' : 'text-tinta-200'}`}>
                  Até {q.dia === 'Hoje' ? 'hoje' : q.dia.toLowerCase()}, {q.hora} · {contagem.vencido ? 'o prazo passou' : contagem.texto}
                </p>
              </div>
              <Link href={`/app/levantamentos/${primeira.id}`} className="btn-primary shrink-0">
                {primeira.estado === 'por_contactar' ? 'Contactar e agendar' : 'Preparar a visita'}
              </Link>
            </section>
          );
        }
        return (
          <section aria-labelledby="agora" className={base}>
            <div className="min-w-0">
              {rotulo}
              <h2 id="agora" className="mt-1 text-[20px] font-semibold">
                Nada por fazer agora
              </h2>
              <p className="mt-1 max-w-[54ch] text-[15px] text-tinta-200">
                Quando aceitar um levantamento, a primeira coisa a fazer aparece aqui, com o prazo a correr.
              </p>
            </div>
            <Link href="/app/avaliacoes/oportunidades" className="btn-primary shrink-0">
              Ver oportunidades
            </Link>
          </section>
        );
      })()}

      <section aria-labelledby="trabalho">
        <h2 id="trabalho" className="text-[20px] font-semibold text-slate-900">
          O seu trabalho
        </h2>
        <div className="mt-2 flex gap-1 border-b border-slate-200" role="tablist">
          {(
            [
              ['em_curso', 'Em curso', estado.emCurso.length],
              ['concluidos', 'Concluídos', estado.concluidos.length],
            ] as const
          ).map(([chave, texto, n]) => (
            <Link
              key={chave}
              href={chave === 'em_curso' ? '/app/avaliacoes' : '/app/avaliacoes?ver=concluidos'}
              aria-current={aba === chave ? 'page' : undefined}
              className={`inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap border-b-2 px-3 text-[17px] ${
                aba === chave
                  ? 'border-tinta-600 font-semibold text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {texto}
              {n > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[13px] font-semibold ${
                    aba === chave ? 'bg-tinta-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {n}
                </span>
              )}
            </Link>
          ))}
        </div>
        {lista.length === 0 ? (
          <p className="mt-3 max-w-[54ch] text-[17px] text-slate-600">
            {aba === 'concluidos'
              ? 'Ainda não entregou nenhum levantamento.'
              : 'Nenhum levantamento em curso. As oportunidades na sua zona estão em baixo.'}
          </p>
        ) : (
          <ul className="mt-1">
            {lista.map((l) => (
              <LinhaDeLevantamento key={l.id} l={l} agoraIso={agoraIso} />
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Cartao
          titulo={
            estado.oportunidades === 0
              ? 'Nenhuma oportunidade na sua zona'
              : `${estado.oportunidades} ${estado.oportunidades === 1 ? 'oportunidade' : 'oportunidades'} na sua zona`
          }
          nota={
            estado.oportunidades === 0
              ? 'Alargar os concelhos cobertos faz chegar mais pedidos.'
              : 'Pedidos de avaliação perto de si, ainda por aceitar.'
          }
          href={estado.oportunidades === 0 ? '/app/avaliacoes/disponibilidade' : '/app/avaliacoes/oportunidades'}
          acao={estado.oportunidades === 0 ? 'Disponibilidade e alertas' : 'Ver oportunidades'}
        />
        <Cartao
          nevoa
          titulo="Comissões disponíveis"
          destaque={formatEuros(estado.comissoesDisponiveis)}
          nota="Levantamentos já adjudicados, prontos a resgatar."
          href="/app/avaliacoes/comissoes"
          acao="Consultar movimentos"
        />
      </div>
    </div>
  );
}
