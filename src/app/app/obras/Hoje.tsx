import Link from 'next/link';
import { formatEuros } from '@/domain/money';
import { formatHoras } from '@/domain/dayLog';
import { CREW_ROLE_LABELS, type CrewRole } from '@/domain/worksite';
import type { DiaDaObra } from '@/lib/queries';

const DIA = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long' });

/**
 * O ecrã do dia a dia. Abre-se todas as manhãs; tudo o resto da gestão de obra é ocasional.
 *
 * A ordem é a do protótipo do promotor (26/10/2026) e foi desenhada para quem não gosta de
 * formulários: **primeiro o que há a fazer hoje** — três botões grandes, um por tarefa —, depois
 * quem lá anda, depois o que está parado à espera de uma decisão, e só no fim o histórico. Nada
 * aqui é um formulário aberto à espera de ser preenchido: cada acção abre quando é precisa.
 */
export function Hoje({
  obras,
  obra,
  dia,
}: {
  obras: { id: string; nome: string; estado: string }[];
  obra: { id: string; nome: string; local: string | null; estado: string } | null;
  dia: DiaDaObra | null;
}) {
  if (!obra || !dia) return null;
  const hoje = new Date();

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Hoje · {DIA.format(hoje)}</p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight text-slate-900">{obra.nome}</h1>
          <p className="mt-1 flex items-center gap-2 text-[15px] text-slate-600">
            <span className={`inline-block h-2 w-2 rounded-full ${obra.estado === 'ativa' ? 'bg-tinta-600' : 'bg-slate-400'}`} />
            {obra.estado === 'ativa' ? 'Em curso' : 'Parada'}
            {obra.local && <span className="text-slate-600">·</span>}
            {obra.local}
          </p>
        </div>
        {obras.length > 1 && (
          // Trocar de obra sem sair do ecrã: um encarregado anda em duas ou três no mesmo dia.
          <form className="flex items-center gap-2 text-[15px] text-slate-600">
            <label htmlFor="obra-a-consultar">A consultar</label>
            <select
              id="obra-a-consultar"
              name="obra"
              defaultValue={obra.id}
              className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-[17px] text-slate-900"
            >
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
            <input type="hidden" name="ver" value="hoje" />
            <button type="submit" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[15px] font-semibold text-slate-700 hover:bg-slate-50">
              Ver
            </button>
          </form>
        )}
      </header>

      {/* Uma acção por tarefa, e nada mais. Registar o dia é a que se faz todos os dias, por isso é
          a única cheia. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Accao
          href={`/app/obras/${obra.id}?s=dia`}
          titulo="Registar dia"
          detalhe="Confirmar a equipa e as horas"
          destaque
        />
        <Accao href={`/app/obras/${obra.id}?s=diario`} titulo="Fotografar" detalhe="Guardar o trabalho feito" />
        <Accao href={`/app/obras/${obra.id}?s=financeiro`} titulo="Despesa" detalhe="Juntar uma compra ou custo" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-baseline justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="text-[17px] font-semibold text-slate-900">Equipa hoje</h2>
              <p className="text-[15px] text-slate-600">Quem trabalhou nesta obra</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[17px] font-semibold text-slate-700">
              {dia.presencas.length} {dia.presencas.length === 1 ? 'pessoa' : 'pessoas'}
            </span>
          </div>
          {dia.presencas.length === 0 ? (
            <p className="border-t border-slate-100 px-5 py-4 text-[15px] text-slate-600">
              Ainda não há ninguém atribuído a esta obra.{' '}
              <Link href={`/app/obras/${obra.id}?s=equipa`} className="font-semibold text-tinta-700 underline underline-offset-4">
                Atribuir uma pessoa
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {dia.presencas.map((p) => (
                <li key={p.memberId} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="min-w-0">
                    <span className="block text-[17px] font-medium text-slate-900">{p.nome}</span>
                    <span className="block text-[15px] text-slate-600">
                      {/* `funcao` vem da base em bruto (`chefe_equipa`, nunca "Chefe de equipa") — passa
                          sempre por CREW_ROLE_LABELS antes de chegar ao ecrã (auditoria de UI/UX, 26/10/2026). */}
                      {(p.funcao && CREW_ROLE_LABELS[p.funcao as CrewRole]) || 'Pintor'}
                      {p.horasNoutras.length > 0 &&
                        ` · ${p.horasNoutras.map((o) => `${formatHoras(o.horas)} h ${o.obra}`).join(', ')}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[17px] font-semibold tabular-nums text-slate-900">
                      {p.confirmado ? `${formatHoras(p.horasHoje)} h` : '—'}
                    </span>
                    <span className={`block text-[17px] ${p.confirmado ? 'text-slate-500' : 'text-amber-700'}`}>
                      {p.confirmado ? 'Confirmadas' : 'Por confirmar'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {dia.presencas.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[15px]">
              <span className="text-slate-600">
                {formatHoras(dia.horasConfirmadas)} h confirmadas de {formatHoras(dia.horasPrevistas)} h previstas
              </span>
              <Link href="/app/obras?ver=equipa" className="font-semibold text-tinta-700 hover:underline">
                Ver semana
              </Link>
            </div>
          )}
        </section>

        <div className="space-y-4">
          {dia.atencao.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="eyebrow text-amber-900">Precisa da sua atenção</p>
              <ul className="mt-2 space-y-3">
                {dia.atencao.slice(0, 3).map((a, i) => (
                  <li key={i}>
                    <p className="text-[17px] font-semibold leading-snug text-amber-950">{a.titulo}</p>
                    <p className="mt-0.5 text-[15px] leading-snug text-amber-900">{a.detalhe}</p>
                    <Link
                      href={a.href}
                      className="mt-1.5 inline-block rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[15px] font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      Rever
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {dia.fases.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
              <p className="eyebrow">Em que ponto estamos</p>
              <Fases fases={dia.fases} obraId={obra.id} />
            </section>
          )}
        </div>
      </div>

      {dia.registos.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-baseline justify-between gap-3 px-5 py-4">
            <h2 className="text-[17px] font-semibold text-slate-900">Últimos registos</h2>
            <Link href={`/app/obras/${obra.id}?s=diario`} className="text-[15px] font-semibold text-tinta-700 hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {dia.registos.map((r) => (
              <li key={r.id} className="flex items-baseline justify-between gap-4 px-5 py-3">
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium text-slate-900">{r.titulo}</span>
                  {r.detalhe && <span className="block text-[15px] text-slate-600">{r.detalhe}</span>}
                </span>
                <span className="shrink-0 text-[17px] tabular-nums text-slate-500">
                  {r.quando.slice(8, 10)}/{r.quando.slice(5, 7)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Accao({ href, titulo, detalhe, destaque }: { href: string; titulo: string; detalhe: string; destaque?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 transition ${
        destaque
          ? 'border-tinta-700 bg-tinta-700 text-white hover:bg-tinta-800'
          : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <span>
        <span className="block text-[17px] font-semibold leading-tight">{titulo}</span>
        <span className={`block text-[15px] leading-snug ${destaque ? 'text-white/80' : 'text-slate-600'}`}>{detalhe}</span>
      </span>
      <span aria-hidden className="text-[17px] opacity-70">
      </span>
    </Link>
  );
}

/** As fases por ordem, com a que está a decorrer a cheio. Uma régua, não uma tabela. */
function Fases({ fases, obraId }: { fases: DiaDaObra['fases']; obraId: string }) {
  const emCurso = fases.find((f) => f.estado === 'em_curso') ?? fases.find((f) => f.estado !== 'concluida');
  const feitas = fases.filter((f) => f.estado === 'concluida').length;
  return (
    <>
      <p className="mt-1 text-[17px] font-semibold leading-snug text-slate-900">{emCurso?.nome ?? 'Todas as fases concluídas'}</p>
      <p className="text-[15px] text-slate-600">
        {feitas} de {fases.length} {fases.length === 1 ? 'fase concluída' : 'fases concluídas'}
      </p>
      <div className="mt-3 flex gap-1.5" aria-hidden>
        {fases.map((f) => (
          <span
            key={f.id}
            className={`h-2 flex-1 rounded-full ${
              f.estado === 'concluida' ? 'bg-tinta-600' : f.id === emCurso?.id ? 'bg-tinta-400' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <p className="mt-2 flex justify-between text-[17px] text-slate-500">
        <span>{fases[0]?.nome}</span>
        <span>{fases.at(-1)?.nome}</span>
      </p>
      <Link href={`/app/obras/${obraId}?s=cronograma`} className="mt-3 inline-block text-[15px] font-semibold text-tinta-700 hover:underline">
        Ver planeamento
      </Link>
    </>
  );
}
