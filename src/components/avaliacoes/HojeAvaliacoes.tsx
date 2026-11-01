import Link from 'next/link';
import { contagemDoContacto, contagemDoPrazo, horaExata, quandoCurto } from '@/domain/contagem';
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
 * Uma só banda com fundo de cor, no topo, e é a da próxima ação (regra 13). Dentro das listas o alarme é
 * texto.
 */

export type EstadoDeHoje = {
  /** Por urgência: o primeiro é o que está no topo. */
  emCurso: LevantamentoNaLista[];
  concluidos: LevantamentoNaLista[];
  oportunidades: number;
  comissoesDisponiveis: number;
  suspenso?: { ate: string; diasRestantes: number } | null;
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
}: {
  titulo: string;
  nota: string;
  destaque?: string;
  href: string;
  acao: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[44px] flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-tinta-600 sm:p-5"
    >
      <div>
        <p className="font-semibold text-slate-900">{titulo}</p>
        {destaque && <p className="mt-1 text-[26px] font-semibold leading-tight text-slate-900">{destaque}</p>}
        <p className="mt-1 max-w-[54ch] text-[15px] text-slate-600">{nota}</p>
      </div>
      <span aria-hidden="true" className="text-[15px] font-semibold text-tinta-700">
        {acao} →
      </span>
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
      <div>
        <h1 className="text-[34px] font-bold leading-[1.15] tracking-[-0.025em] text-slate-900">Hoje</h1>
        <p className="mt-1 text-[17px] text-slate-600">{diaPorExtenso(agora)}</p>
      </div>

      {estado.suspenso ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5">
          <p className="text-[17px] font-semibold text-amber-900">
            Presença suspensa até {horaExata(new Date(estado.suspenso.ate)).split(',')[0]}
          </p>
          <p className="mt-1 max-w-[54ch] text-[17px] text-amber-900">
            Faltam {estado.suspenso.diasRestantes} dias. Durante este período não chegam oportunidades novas.
          </p>
          <Link href="/app/avaliacoes/disponibilidade" className="btn-secondary mt-4 inline-flex">
            Rever a disponibilidade
          </Link>
        </section>
      ) : primeira && contagem ? (
        <section
          aria-labelledby="agora"
          className="flex flex-col gap-4 rounded-2xl border border-tinta-200 bg-tinta-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="min-w-0">
            <h2 id="agora" className="text-[20px] font-semibold text-slate-900">
              Próxima ação: {primeira.estado === 'por_contactar' ? 'contactar o cliente' : 'fazer a visita'}
            </h2>
            <p className="mt-1 text-[17px] text-slate-700">
              {primeira.ref} · {primeira.concelho}
            </p>
            <p className={`text-[17px] ${contagem.vencido ? 'font-semibold text-amber-800' : 'text-slate-700'}`}>
              {(() => {
                const q = quandoCurto(agora, new Date(primeira.prazo!));
                return `Até ${q.dia === 'Hoje' ? 'hoje' : q.dia.toLowerCase()}, ${q.hora}`;
              })()}{' '}
              · {contagem.vencido ? 'o prazo passou' : contagem.texto}
            </p>
          </div>
          <Link href={`/app/levantamentos/${primeira.id}`} className="btn-primary shrink-0">
            {primeira.estado === 'por_contactar' ? 'Contactar e agendar' : 'Preparar a visita'}
          </Link>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-[20px] font-semibold text-slate-900">Nada por fazer agora</h2>
          <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
            Quando aceitar um levantamento, a primeira coisa a fazer aparece aqui, com o prazo a correr.
          </p>
        </section>
      )}

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
