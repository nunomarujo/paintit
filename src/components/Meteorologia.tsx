import { condicoesDePintura, resumoDaSemana, VEREDICTO_LABELS, type DiaDeTempo, type Veredicto } from '@/domain/meteorologia';

const DIA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * A previsão do local da obra, traduzida para a única pergunta que importa no cronograma: dá para
 * pintar neste dia?
 *
 * O pintor já tem meteorologia no telemóvel; o que não tem é a leitura dela contra as regras de
 * aplicação da tinta. Por isso o veredicto vem primeiro e **sempre com a razão à frente** — chove,
 * está frio, o ar está húmido —, e os números a seguir, mais pequenos, para quem quiser confirmar.
 *
 * A cor segue a regra 13 do CLAUDE.md: âmbar para o que ainda se contorna (mudar a demão de dia),
 * e nada de vermelho — um dia de chuva não é uma falha, é o tempo.
 */
export function Meteorologia({ dias, local }: { dias: DiaDeTempo[]; local: string }) {
  if (dias.length === 0) return null;

  return (
    <section aria-labelledby="meteo-titulo">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 id="meteo-titulo" className="font-semibold">
          Tempo em {local}
        </h3>
        <p className="text-[15px] text-slate-600">{resumoDaSemana(dias)}</p>
      </div>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {dias.map((d) => {
          const c = condicoesDePintura(d);
          return (
            <li key={d.data} className={`rounded-xl border p-3 ${CAIXA[c.veredicto]}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="font-medium">{quando(d.data)}</span>
                <span className={`text-[15px] font-semibold ${TEXTO[c.veredicto]}`}>{VEREDICTO_LABELS[c.veredicto]}</span>
              </div>
              {c.razoes.length > 0 && <p className="mt-0.5 text-[15px] leading-snug text-slate-700">{c.razoes.join('; ')}.</p>}
              <p className="mt-1 text-[15px] tabular-nums text-slate-500">
                {Math.round(d.tMin)}–{Math.round(d.tMax)} °C · {Math.round(d.humidade)}% humidade · {d.chuvaProb}% chuva
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[15px] text-slate-500">
        Previsão do Open-Meteo para o código postal da obra, actualizada de hora a hora. Os limites são os que as
        fichas técnicas das tintas de exterior costumam indicar — a ficha do produto que vai aplicar manda sempre.
      </p>
    </section>
  );
}

const CAIXA: Record<Veredicto, string> = {
  sim: 'border-slate-200 bg-white',
  talvez: 'border-amber-200 bg-amber-50',
  nao: 'border-amber-300 bg-amber-50',
};

const TEXTO: Record<Veredicto, string> = {
  sim: 'text-tinta-700',
  talvez: 'text-amber-800',
  nao: 'text-amber-900',
};

/** "Hoje", "Amanhã", e depois "Qui, 05/11" — que é como se fala de um dia de obra. */
function quando(iso: string): string {
  const hoje = new Date();
  const d = new Date(`${iso}T12:00:00`);
  const dias = Math.round((d.getTime() - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12).getTime()) / 86_400_000);
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Amanhã';
  return `${DIA_CURTO[d.getDay()]}, ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}
