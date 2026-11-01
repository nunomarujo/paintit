import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AutoSubmit } from '@/components/AutoSubmit';
import { ProductThumb } from '@/components/ProductThumb';
import { ISOLAMENTO_E_ACESSORIOS, PRODUCT_TYPES, PRODUCT_TYPE_LABELS, type ProductType } from '@/domain/catalog';
import { formatEuros } from '@/domain/money';
import { matchesSearch } from '@/domain/search';
import { residenciasDe } from '@/lib/condomino';
import { loadReferences, refPerLitre, refPerM2 } from '@/lib/reference';
import { getUser } from '@/lib/supabase/server';

export const metadata = { title: 'Catálogo de referência' };

/**
 * Catálogo do condómino (01/11/2026): as fichas de fabricante e os preços de referência — valores de
 * mercado, datados — para perceber o que cada proposta inclui. Sem descontos, que são negociação
 * entre fornecedor e pintor e não informação do condómino (a política da base também os esconde).
 */
export default async function CatalogoDoCondominoPage({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string }> }) {
  const { q, tipo } = await searchParams;
  const { supabase } = await getUser();
  if ((await residenciasDe(supabase)).length === 0) redirect('/app');

  const term = (q ?? '').trim();
  const tipoValido = tipo && (PRODUCT_TYPES as readonly string[]).includes(tipo) ? (tipo as ProductType) : null;
  const refs = (await loadReferences(supabase)).filter(
    (r) =>
      (!tipoValido || r.tipo === tipoValido) &&
      (!term || matchesSearch(term, { tipo: r.tipo, texto: `${r.marca} ${r.nome} ${r.descricao ?? ''} ${r.cores ?? ''}` })),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">Catálogo de referência</h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Fichas técnicas dos fabricantes e preços de referência de mercado, com data. Servem para ler uma proposta: que
          tinta é, para que suporte, quanto custa por litro. Não são preços de venda nem incluem descontos.
        </p>
      </div>

      <form autoComplete="off" className="flex flex-wrap items-end gap-3 text-[17px]">
        <label>
          Procurar
          <input name="q" defaultValue={q ?? ''} className="campo mt-1" />
        </label>
        <label>
          Tipo
          <AutoSubmit>
            <select name="tipo" defaultValue={tipoValido ?? ''} className="campo mt-1">
              <option value="">Todos</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PRODUCT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </AutoSubmit>
        </label>
        <button type="submit" className="btn-secondary">
          Aplicar
        </button>
      </form>

      {refs.length === 0 ? (
        <p className="text-[17px] text-slate-600">Nenhum produto com estes critérios.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {refs.map((r) => {
            const isBoard = (ISOLAMENTO_E_ACESSORIOS as readonly string[]).includes(r.tipo);
            const pl = isBoard ? refPerM2(r) : refPerLitre(r);
            return (
              <li key={r.id}>
                <Link
                  href={`/app/catalogo/referencia/${r.id}?de=condominio`}
                  className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-[17px] hover:border-tinta-600"
                >
                  <ProductThumb fotoPath={r.foto_path} alt={`${r.marca} ${r.nome}`} className="h-32 w-28 self-center rounded-lg border border-slate-100 bg-white object-contain" />
                  <div>
                    <span className="block font-semibold">
                      {r.marca} {r.nome}
                    </span>
                    <span className="block text-slate-600">
                      {PRODUCT_TYPE_LABELS[r.tipo]}
                      {r.acabamento ? ` · ${r.acabamento}` : ''}
                    </span>
                  </div>
                  <p className="flex-1 text-[15px] text-slate-600">
                    {r.descricao ?? `${PRODUCT_TYPE_LABELS[r.tipo]}${r.uso ? ` para uso ${r.uso}` : ''}.`}
                  </p>
                  <span className="text-[15px] text-slate-500">
                    {pl !== null ? `${formatEuros(pl)}/${isBoard ? 'm²' : 'L'} de referência` : 'Sem preço de referência'}
                    {r.preco_data ? ` · ${r.preco_data.split('-').reverse().join('/')}` : ''}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
