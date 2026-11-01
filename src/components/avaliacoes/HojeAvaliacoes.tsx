import Link from 'next/link';
import { contagemDoContacto, contagemDoPrazo, quandoCurto } from '@/domain/contagem';
import { faltaParaVoltar, type Suspensao } from '@/domain/disponibilidade';
import { formatEuros } from '@/domain/money';
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
  /** Concelhos cobertos pela empresa; 0 = todo o país. */
  concelhosCobertos?: number;
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

/** A presença da pessoa, numa pílula: disponível (com a cobertura) ou suspensa até uma data. */
function Presenca({ suspenso, concelhos }: { suspenso: Suspensao | null | undefined; concelhos: number }) {
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
  return (
    <Link
      href="/app/avaliacoes/disponibilidade"
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-tinta-100 px-4 text-[15px] font-semibold text-tinta-700"
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-tinta-600" />
      Disponível · {concelhos === 0 ? 'todo o país' : `${concelhos} ${concelhos === 1 ? 'concelho coberto' : 'concelhos cobertos'}`}
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
        <Presenca suspenso={estado.suspenso} concelhos={estado.concelhosCobertos ?? 0} />
      </div>

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
