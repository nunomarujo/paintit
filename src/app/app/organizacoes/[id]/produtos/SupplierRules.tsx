'use client';

import type { FormState } from '@/app/app/actions';
import { addDelivery, addDiscount } from '@/app/app/catalogo/actions';
import { Field, selectClass } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import {
  BUYER_PROFILES,
  BUYER_PROFILE_LABELS,
  PAYMENT_TERMS,
  PAYMENT_TERMS_LABELS,
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  FREQUENT_MIN_ORDERS,
} from '@/domain/catalog';

const button = 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60';
const msg = (s: FormState) => {
  const m = Object.values(s.errors)[0] ?? s.message;
  return m ? <p className={`text-sm ${s.ok ? 'text-tinta-700' : 'text-red-700'}`}>{m}</p> : null;
};

export function DiscountForm({ orgId, products }: { orgId: string; products: { id: string; label: string }[] }) {
  const { state, pending, formProps } = useFormAction<FormState>(addDiscount.bind(null, orgId), { errors: {} }, { resetOnSuccess: true });
  const e = state.errors;
  return (
    <form {...formProps} className="space-y-4">
      <h3 className="text-sm font-semibold">Novo desconto</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="alvo" label="Aplica-se a" error={e.alvo}>
          <select name="alvo" defaultValue="" className={selectClass}>
            <option value="">Todo o catálogo</option>
            <optgroup label="Tipo de produto">
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={`tipo:${t}`}>
                  {PRODUCT_TYPE_LABELS[t]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Produto">
              {products.map((p) => (
                <option key={p.id} value={`produto:${p.id}`}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        <Field name="desconto" label="Desconto (%)" required error={e.desconto} />
        <Field name="validoAte" label="Válido até" type="date" error={e.validoAte} />
        <Field name="minArea" label="Obras a partir de (m²)" error={e.minArea} hint="Vazio = sem mínimo." />
        <Field name="maxArea" label="Obras até (m²)" error={e.maxArea} hint="Vazio = sem máximo." />
        <Field name="perfil" label="Perfil do comprador" error={e.perfil}>
          <select name="perfil" defaultValue="" className={selectClass}>
            <option value="">Qualquer pintor</option>
            {BUYER_PROFILES.map((p) => (
              <option key={p} value={p}>
                {BUYER_PROFILE_LABELS[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="pagamento" label="Forma de pagamento" error={e.pagamento}>
          <select name="pagamento" defaultValue="" className={selectClass}>
            <option value="">Qualquer</option>
            {PAYMENT_TERMS.map((p) => (
              <option key={p} value={p}>
                {PAYMENT_TERMS_LABELS[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="minQuantidade" label="A partir de (embalagens)" error={e.minQuantidade} hint="Vazio = qualquer quantidade." />
      </div>
      <p className="text-xs text-slate-500">
        Combine regras: dimensão da obra (ex.: até 1000 m² 10%, acima 15%), primeira compra para atrair novos pintores,
        cliente frequente ({FREQUENT_MIN_ORDERS} ou mais encomendas entregues), pronto pagamento ou quantidade. O pintor vê o
        melhor desconto garantido e, à parte, os que dependem do pagamento ou da quantidade.
      </p>
      {msg(state)}
      <button type="submit" disabled={pending} className={button}>
        Criar desconto
      </button>
    </form>
  );
}

export function DeliveryForm({ orgId }: { orgId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(addDelivery.bind(null, orgId), { errors: {} }, { resetOnSuccess: true });
  const e = state.errors;
  return (
    <form {...formProps} className="space-y-4">
      <h3 className="text-sm font-semibold">Nova condição de entrega em obra</h3>
      <Field name="concelhos" label="Concelhos servidos" error={e.concelhos} hint="Separados por vírgulas. Vazio = todo o país." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="incluida" label="Entrega" error={e.incluida}>
          <select name="incluida" defaultValue="sim" className={selectClass}>
            <option value="sim">Incluída no preço</option>
            <option value="nao">Paga à parte</option>
          </select>
        </Field>
        <Field name="custo" label="Custo da entrega (€)" error={e.custo} hint="Se for paga." />
        <Field name="minimo" label="Encomenda mínima (€)" error={e.minimo} />
      </div>
      <Field name="condicoes" label="Condições" error={e.condicoes} placeholder="Ex.: entrega em 48 h úteis; descarga ao nível do solo" />
      {msg(state)}
      <button type="submit" disabled={pending} className={button}>
        Criar condição
      </button>
    </form>
  );
}
