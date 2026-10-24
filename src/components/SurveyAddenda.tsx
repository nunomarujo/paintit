const ptDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export interface Addendum {
  ronda: number;
  aberta_em: string;
  estado: string;
  duvidas: string[];
  resposta: string | null;
  respondido_em: string | null;
}

/**
 * As adendas ao levantamento: cada ronda de dúvidas e a respetiva resposta, pela ordem em que
 * aconteceram (pedido do promotor, 24/10/2026 — "aumenta a info do dossier de avaliação do prédio
 * mantendo a anterior"). Nada aqui substitui o levantamento original: acrescenta-se-lhe.
 *
 * Nunca mostra quem perguntou — a função `survey_addenda` nem sequer devolve essa informação. Serve o
 * cliente, o avaliador e qualquer pintor a orçamentar a obra, todos com o mesmo texto à frente.
 */
export function SurveyAddenda({ addenda, titulo = 'Adendas ao levantamento' }: { addenda: Addendum[]; titulo?: string }) {
  if (addenda.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold">{titulo}</h3>
      <p className="mt-1 text-xs text-slate-600">
        Perguntas dos pintores sobre o levantamento e as respostas dadas na obra. Acrescentam-se ao que já estava
        registado; não substituem nada.
      </p>
      <ol className="mt-3 space-y-3">
        {addenda.map((a) => (
          <li key={a.ronda} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">Adenda {a.ronda}</p>
              <p className="text-xs text-slate-500">
                pedida a {ptDateTime(a.aberta_em)}
                {a.respondido_em ? ` · respondida a ${ptDateTime(a.respondido_em)}` : ''}
              </p>
            </div>

            {a.duvidas.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                {a.duvidas.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}

            {a.resposta ? (
              <div className="mt-3 rounded-lg bg-tinta-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-tinta-800">Resposta</p>
                <p className="mt-1 whitespace-pre-line text-slate-800">{a.resposta}</p>
              </div>
            ) : a.estado === 'expirado' ? (
              <p className="mt-3 text-xs text-slate-600">
                Ficou sem resposta dentro do prazo. As dúvidas por responder seguiram para a adenda seguinte.
              </p>
            ) : (
              <p className="mt-3 text-xs text-slate-600">À espera de resposta.</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
