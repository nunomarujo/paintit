import Link from 'next/link';
import type { Sugestoes } from '@/domain/orcamentoBusca';

/**
 * Procurar nos orçamentos.
 *
 * Um formulário normal, que vai pelo endereço: os separadores desta página já vivem lá, um resultado
 * partilha-se com um link, e o botão de voltar do telemóvel desfaz a procura. Sem estado de cliente.
 *
 * As sugestões vêm das localidades e dos clientes que existem mesmo nos orçamentos desta empresa —
 * é a lista nativa do navegador, que funciona sem JavaScript e abre como deve ser no telemóvel.
 * Nunca sugere um termo que não dê resultados.
 */
export function Busca({
  ver,
  grupo,
  termo,
  ano,
  sugestoes,
  encontrados,
  total,
}: {
  ver: string;
  grupo?: string;
  termo?: string;
  ano?: string;
  sugestoes: Sugestoes;
  encontrados: number;
  total: number;
}) {
  const aFiltrar = Boolean(termo?.trim() || ano);
  const limpo = `/app/orcamentos?ver=${ver}${grupo ? `&grupo=${grupo}` : ''}`;

  return (
    <div className="space-y-2">
      <form action="/app/orcamentos" className="flex flex-wrap items-end gap-2 text-[17px]">
        <input type="hidden" name="ver" value={ver} />
        {grupo && <input type="hidden" name="grupo" value={grupo} />}
        <label className="w-full font-medium text-slate-700 sm:w-auto sm:min-w-[16rem] sm:flex-1">
          Procurar
          <input
            name="q"
            defaultValue={termo ?? ''}
            list="orcamentos-sugestoes"
            placeholder="Cliente, localidade, NIPC ou número"
            className="campo font-normal"
          />
        </label>
        <datalist id="orcamentos-sugestoes">
          {sugestoes.termos.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        {sugestoes.anos.length > 1 && (
          <label className="font-medium text-slate-700">
            Ano
            <select name="ano" defaultValue={ano ?? ''} className="campo w-auto font-normal">
              <option value="">Todos</option>
              {sugestoes.anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" className="btn-secondary">
          Procurar
        </button>
        {aFiltrar && (
          <Link href={limpo} className="btn-quiet">
            Limpar
          </Link>
        )}
      </form>
      {aFiltrar && (
        <p className="text-[15px] text-slate-600" role="status">
          {encontrados} de {total} {total === 1 ? 'orçamento' : 'orçamentos'}.
        </p>
      )}
    </div>
  );
}
