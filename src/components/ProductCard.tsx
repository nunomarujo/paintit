import type { ReactNode } from 'react';
import { PRODUCT_TYPE_LABELS, productLabel } from '@/domain/catalog';
import { formatEuros } from '@/domain/money';
import type { Database } from '@/lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];

export function ProductCard({ p, children }: { p: Product; children?: ReactNode }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 text-sm ${p.ativo ? '' : 'opacity-60'}`}>
      <p className="font-semibold">{productLabel(p)}</p>
      <p className="text-slate-600">
        {PRODUCT_TYPE_LABELS[p.tipo]}
        {!p.ativo && ' · desativado'}
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
        <dt className="text-slate-500">Rendimento</dt>
        <dd>{p.rendimento ? `${(p.rendimento / 100).toLocaleString('pt-PT')} m²/L por demão` : 'Não indicado'}</dd>
        <dt className="text-slate-500">Embalagem</dt>
        <dd>{p.embalagem_ml ? `${(p.embalagem_ml / 1000).toLocaleString('pt-PT')} L` : 'Não indicada'}</dd>
        <dt className="text-slate-500">Preço de referência</dt>
        <dd>
          {p.preco_referencia_cents !== null
            ? `${formatEuros(p.preco_referencia_cents)} (${p.preco_data?.split('-').reverse().join('/')})`
            : 'Não indicado'}
        </dd>
      </dl>
      {p.ficha_path && (
        <a href={`/app/fichas/${p.id}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-tinta-700 hover:underline">
          Ficha técnica (PDF)
        </a>
      )}
      {children}
    </div>
  );
}
