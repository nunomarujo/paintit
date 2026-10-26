import { formatEuros } from '@/domain/money';
import { SUBCATEGORIA_LABELS, type Elegibilidade, type Subcategoria } from '@/domain/obrasPublicas';

export interface Tender {
  id: string;
  referencia: string;
  anuncio_url: string | null;
  objeto: string;
  entidade: string;
  distrito: string;
  concelho: string | null;
  valor_cents: number | null;
  subcategorias: string[];
  prazo_entrega: string;
  documentos_exigidos: string[];
}

const dataPt = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/**
 * Uma linha da lista de concursos. O veredicto de elegibilidade vem primeiro, numa coluna estreita e
 * em texto — não é um semáforo, é uma etiqueta. O prazo só ganha cor quando falta uma semana, e mesmo
 * aí é a palavra que muda, não o fundo.
 */
export function TenderRow({ c, e, faltam }: { c: Tender; e: Elegibilidade; faltam: number }) {
  const urgente = faltam <= 7;
  return (
  <li className="flex gap-4 px-4 py-3">
                  <span
                    className={`w-[92px] shrink-0 text-[13px] font-bold uppercase leading-tight tracking-[0.12em] ${
                      e.veredicto === 'pode' ? 'text-tinta-700' : 'text-slate-600'
                    }`}
                  >
                    {e.veredicto === 'pode'
                      ? 'Pode ganhar'
                      : e.veredicto === 'sem_titulo'
                        ? 'Sem título'
                        : e.veredicto === 'falta_subcategoria'
                          ? 'Falta subcategoria'
                          : `Falta classe ${e.classeNecessaria}`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{c.objeto}</p>
                    <p className="text-[15px] text-slate-600">
                      {c.entidade} · {c.concelho && c.concelho !== c.distrito ? `${c.concelho}, ` : ''}
                      {c.distrito}
                    </p>
                    <p className="mt-1 text-[15px] text-slate-700">
                      {c.valor_cents ? <span className="tabular-nums">{formatEuros(c.valor_cents)}</span> : 'Valor não indicado'}
                      {c.subcategorias.length > 0 && (
                        <> · exige {c.subcategorias.map((s) => SUBCATEGORIA_LABELS[s as Subcategoria]).join(' e ')}</>
                      )}
                      {' · entrega '}
                      <span className={`tabular-nums ${urgente ? 'font-semibold text-amber-800' : ''}`}>
                        {dataPt(c.prazo_entrega)} ({faltam} {faltam === 1 ? 'dia' : 'dias'})
                      </span>
                    </p>
                    {e.veredicto !== 'pode' && e.caminho && (
                      <p className="mt-0.5 text-[15px] text-slate-500">{e.caminho}</p>
                    )}
                    {c.documentos_exigidos.length > 0 && (
                    <p className="mt-0.5 text-[15px] text-slate-500">{c.documentos_exigidos.length} documentos exigidos.</p>
                  )}
                  {c.anuncio_url && (
                      <a
                        href={c.anuncio_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 inline-block text-[15px] font-semibold text-tinta-700 underline underline-offset-4"
                      >
                        Ver o anúncio ({c.referencia})
                      </a>
                    )}
                  </div>
                </li>
  );
}
