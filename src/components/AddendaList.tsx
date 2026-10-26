import { ADDENDA_STATE_LABELS, diasAEsperar, totalAceite, totalProposto, type Addenda } from '@/domain/addenda';
import { formatEuros } from '@/domain/money';

const dataPt = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/**
 * Lista de trabalhos a mais de uma obra, igual dos dois lados — o que muda é a acção que cada um tem
 * em cada linha, que entra por `acoes`.
 *
 * O que está proposto nunca se soma ao que está aceite: aparece em separado, para o pintor não contar
 * com dinheiro que o cliente ainda não aceitou.
 */
export function AddendaList({
  addenda,
  hoje,
  acoes,
  vazio,
  lado = 'pintor',
}: {
  addenda: Addenda[];
  hoje: string;
  acoes?: (a: Addenda) => React.ReactNode;
  vazio: string;
  /** Quem está a ler: "à espera do cliente" não se diz ao próprio cliente. */
  lado?: 'pintor' | 'cliente';
}) {
  if (addenda.length === 0) {
    return <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[17px] text-slate-600">{vazio}</p>;
  }

  const aceite = totalAceite(addenda);
  const proposto = totalProposto(addenda);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[17px]">
        <span>
          <span className="eyebrow">{lado === 'cliente' ? 'Já aceite' : 'Aceite pelo cliente'}</span>
          <span className="ml-2 font-semibold tabular-nums text-slate-900">{formatEuros(aceite)}</span>
        </span>
        {proposto > 0 && (
          <span>
            <span className="eyebrow">À espera de resposta</span>
            <span className="ml-2 font-semibold tabular-nums text-slate-600">{formatEuros(proposto)}</span>
          </span>
        )}
      </div>

      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {addenda.map((a) => {
          const dias = diasAEsperar(a, hoje);
          return (
            <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0 basis-full sm:flex-1">
                <p className="text-[17px] text-slate-900">{a.descricao}</p>
                <p className="mt-0.5 text-[15px] text-slate-500">
                  {dataPt(a.criadaEm)}
                  {a.estado === 'proposta' ? (
                    <>
                      {' · '}
                      <span className={dias >= 7 ? 'font-semibold text-amber-800' : ''}>
                        {lado === 'cliente' ? 'Por responder' : ADDENDA_STATE_LABELS.proposta} há {dias}{' '}
                        {dias === 1 ? 'dia' : 'dias'}
                      </span>
                    </>
                  ) : (
                    <> · {ADDENDA_STATE_LABELS[a.estado]}{a.respondidaEm ? ` em ${dataPt(a.respondidaEm)}` : ''}</>
                  )}
                  {a.temFotografia ? ' · com fotografia' : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-semibold tabular-nums text-slate-900">{formatEuros(a.valorCents)}</span>
                {acoes?.(a)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
