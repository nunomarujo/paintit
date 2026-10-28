'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { addDelivery, addDiscount } from '@/app/app/catalogo/actions';
import { ConcelhosPicker } from '@/components/ConcelhosPicker';
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

const button = 'btn-secondary';
const msg = (s: FormState) => {
  const m = Object.values(s.errors)[0] ?? s.message;
  return m ? <p className={`text-[17px] ${s.ok ? 'text-tinta-700' : 'text-red-700'}`}>{m}</p> : null;
};

export interface DiscountFormProduct {
  id: string;
  label: string;
  /** Melhor desconto já em vigor para este artigo (sem olhar ao cliente), para saber o que falta atribuir. */
  currentBps: number | null;
}

/** Cria um desconto — "artigo" e "cliente" são dois eixos independentes do mesmo mecanismo, nunca dois
 * sistemas (decisão de 23/10/2026, docs/DECISOES.md). Reaproveitado na ficha de um cliente
 * (clientes/[painterOrgId]/page.tsx) com `fixedCliente`, só para não repetir o seletor. */
export function DiscountForm({
  orgId,
  products,
  clientes = [],
  fixedCliente,
}: {
  orgId: string;
  products: DiscountFormProduct[];
  clientes?: { id: string; nome: string }[];
  fixedCliente?: { id: string; nome: string };
}) {
  const { state, pending, formProps } = useFormAction<FormState>(addDiscount.bind(null, orgId), { errors: {} }, { resetOnSuccess: true });
  const e = state.errors;
  const [alvo, setAlvo] = useState<'catalogo' | 'tipo' | 'produtos'>('catalogo');
  const [cliente, setCliente] = useState<'todos' | 'um'>(fixedCliente ? 'um' : 'todos');
  return (
    <form {...formProps} className="space-y-4">
      <h3 className="text-[17px] font-semibold">Novo desconto</h3>

      <fieldset className="text-[17px]">
        <legend className="font-medium text-slate-700">Aplica-se a</legend>
        <div className="mt-1 flex flex-wrap gap-4">
          {(
            [
              ['catalogo', 'Todo o catálogo'],
              ['tipo', 'Um tipo de produto'],
              ['produtos', 'Artigos específicos'],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className="flex items-center gap-1">
              <input type="radio" name="modo" value={v} defaultChecked={v === 'catalogo'} onChange={() => setAlvo(v)} /> {label}
            </label>
          ))}
        </div>
        {alvo === 'tipo' && (
          <select name="tipo" defaultValue="" className={`${selectClass} mt-2`}>
            <option value="">Escolha o tipo</option>
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>
                {PRODUCT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        )}
        {alvo === 'produtos' && (
          <>
            <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {products.length === 0 ? (
                <p className="text-slate-500">Sem produtos ativos.</p>
              ) : (
                products.map((p) => (
                  <label key={p.id} className="flex items-center justify-between gap-2 py-1">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" name="produtos" value={p.id} /> {p.label}
                    </span>
                    {p.currentBps !== null && (
                      <span className="shrink-0 rounded-full bg-sage px-2 py-0.5 text-[15px] text-tinta-700">
                        já tem {(p.currentBps / 100).toLocaleString('pt-PT')}%
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>
            {e.produtos && <p className="mt-1 text-[17px] text-red-700">{e.produtos}</p>}
          </>
        )}
      </fieldset>

      <fieldset className="text-[17px]">
        <legend className="font-medium text-slate-700">Aplica-se ao cliente</legend>
        {fixedCliente ? (
          <>
            <p className="mt-1 text-slate-600">Só a {fixedCliente.nome}.</p>
            <input type="hidden" name="cliente" value={fixedCliente.id} />
          </>
        ) : (
          <div className="mt-1 space-y-2">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-1">
                <input type="radio" name="_cliente_modo" defaultChecked onChange={() => setCliente('todos')} /> Todos os pintores
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" name="_cliente_modo" onChange={() => setCliente('um')} disabled={clientes.length === 0} />
                Um cliente específico{clientes.length === 0 ? ' (ainda sem clientes com encomendas)' : ''}
              </label>
            </div>
            {cliente === 'um' && (
              <select name="cliente" defaultValue="" className={selectClass}>
                <option value="">Escolha o cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="desconto" label="Desconto (%)" required error={e.desconto} />
        <Field name="validoAte" label="Válido até" type="date" error={e.validoAte} hint="Vazio = válido até alterar." />
        <Field name="minArea" label="Obras a partir de (m²)" error={e.minArea} hint="Vazio = sem mínimo." />
        <Field name="maxArea" label="Obras até (m²)" error={e.maxArea} hint="Vazio = sem máximo." />
        <Field name="perfil" label="Classificação do cliente" error={e.perfil}>
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
      <p className="text-[15px] text-slate-500">
        Combine regras: um ou vários artigos (com o que já têm assinalado, para ver o que falta), dimensão da obra (ex.: até
        1000 m² 10%, acima 15%), classificação do cliente (novo = primeira compra; frequente = {FREQUENT_MIN_ORDERS} ou mais
        encomendas entregues; premium = quem classificar assim na ficha de cada cliente), pronto pagamento ou quantidade.
        Sem data de validade, fica em vigor até alterar. O pintor vê sempre o melhor desconto garantido e, à parte, os que
        dependem do pagamento ou da quantidade.
      </p>
      {msg(state)}
      <button type="submit" disabled={pending} className={button}>
        {pending ? 'A criar…' : 'Criar desconto'}
      </button>
    </form>
  );
}

export function DeliveryForm({ orgId }: { orgId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(addDelivery.bind(null, orgId), { errors: {} }, { resetOnSuccess: true });
  const e = state.errors;
  return (
    <form {...formProps} className="space-y-4">
      <h3 className="text-[17px] font-semibold">Nova condição de entrega em obra</h3>
      <Field name="concelhos" label="Concelhos servidos" error={e.concelhos} hint="Vazio = todo o país.">
        <ConcelhosPicker name="concelhos" />
      </Field>
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
