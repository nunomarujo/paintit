'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { anularResgate, enviarRecibo, guardarDadosDePagamento, pedirResgate } from './actions';

const Nota = ({ s }: { s: FormState }) => {
  const m = s.ok ? s.message : (Object.values(s.errors)[0] ?? s.message);
  return m ? (
    <p className={`text-[17px] ${s.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
      {m}
    </p>
  ) : null;
};

export type DadosIniciais = {
  nif: string;
  titular: string;
  iban: string;
  documento: 'recibo_verde' | 'ato_isolado';
  cobraIva: boolean;
  isencao: string;
  retencao: 'nao_sujeito' | 'sujeito' | 'dispensa' | null;
} | null;

/** Os dados para receber: só desta pessoa, e validados pela plataforma antes do primeiro resgate. */
export function DadosDePagamento({ inicial }: { inicial: DadosIniciais }) {
  const { state, pending, formProps } = useFormAction<FormState>(guardarDadosDePagamento, { errors: {} });
  const [iva, setIva] = useState(inicial?.cobraIva ? 'normal' : 'isento');
  const e = state.errors;
  return (
    <form {...formProps} autoComplete="off" className="space-y-4">
      <Field name="nif" label="NIF pessoal" error={e.nif}>
        <input id="nif" name="nif" inputMode="numeric" defaultValue={inicial?.nif ?? ''} placeholder="123 456 789" className="campo mt-1 max-w-[12rem]" />
      </Field>
      <Field name="titular" label="Nome completo" hint="Como aparece nas Finanças e na conta bancária." error={e.titular}>
        <input id="titular" name="titular" autoComplete="name" defaultValue={inicial?.titular ?? ''} className="campo mt-1 max-w-[28rem]" />
      </Field>
      <Field name="iban" label="IBAN" error={e.iban}>
        <input id="iban" name="iban" defaultValue={inicial?.iban ?? ''} placeholder="PT50 …" className="campo mt-1 max-w-[28rem]" />
      </Field>

      <fieldset>
        <legend className="text-[17px] font-medium text-slate-900">Documento que emite nas Finanças</legend>
        <div className="mt-1 space-y-1">
          <label className="flex min-h-[44px] items-center gap-3 text-[17px] text-slate-900">
            <input type="radio" name="documento" value="recibo_verde" defaultChecked={inicial?.documento === 'recibo_verde'} className="h-5 w-5 text-tinta-600" />
            Fatura-recibo (tem atividade aberta)
          </label>
          <label className="flex min-h-[44px] items-center gap-3 text-[17px] text-slate-900">
            <input type="radio" name="documento" value="ato_isolado" defaultChecked={inicial?.documento === 'ato_isolado'} className="h-5 w-5 text-tinta-600" />
            Ato isolado (sem atividade aberta)
          </label>
        </div>
        {e.documento && <p className="mt-1 text-[15px] text-red-700">{e.documento}</p>}
      </fieldset>

      <fieldset>
        <legend className="text-[17px] font-medium text-slate-900">IVA</legend>
        <div className="mt-1 space-y-1">
          <label className="flex min-h-[44px] items-center gap-3 text-[17px] text-slate-900">
            <input type="radio" name="iva" value="isento" checked={iva === 'isento'} onChange={() => setIva('isento')} className="h-5 w-5 text-tinta-600" />
            Isento de IVA
          </label>
          <label className="flex min-h-[44px] items-center gap-3 text-[17px] text-slate-900">
            <input type="radio" name="iva" value="normal" checked={iva === 'normal'} onChange={() => setIva('normal')} className="h-5 w-5 text-tinta-600" />
            Liquida IVA no recibo (taxa normal)
          </label>
        </div>
      </fieldset>
      {iva === 'isento' && (
        <Field name="isencao" label="Fundamento da isenção" hint="Por exemplo, art. 53.º do CIVA." error={e.isencao}>
          <input id="isencao" name="isencao" defaultValue={inicial?.isencao ?? ''} className="campo mt-1 max-w-[28rem]" />
        </Field>
      )}

      <Field name="retencao" label="Retenção na fonte de IRS" error={e.retencao}>
        <select id="retencao" name="retencao" defaultValue={inicial?.retencao ?? ''} className="campo mt-1 max-w-[28rem]">
          <option value="" disabled>
            Escolher…
          </option>
          <option value="sujeito">Sujeito a retenção</option>
          <option value="dispensa">Dispensado de retenção (declarado no recibo)</option>
          <option value="nao_sujeito">Não sujeito a retenção</option>
        </select>
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
          {pending ? 'A guardar…' : 'Guardar'}
        </button>
        <Nota s={state} />
      </div>
    </form>
  );
}

export function PedirResgate({ valor }: { valor: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(async () => pedirResgate(), { errors: {} });
  return (
    <form {...formProps} className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
        {pending ? 'A pedir…' : `Resgatar ${valor}`}
      </button>
      <Nota s={state} />
    </form>
  );
}

export function EnviarRecibo({ resgateId }: { resgateId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(enviarRecibo.bind(null, resgateId), { errors: {} });
  const anular = useFormAction<FormState>(async () => anularResgate(resgateId), { errors: {} });
  return (
    <div className="space-y-3">
      <form {...formProps} className="space-y-3">
        <Field name="numero" label="Número do recibo" error={state.errors.numero}>
          <input id="numero" name="numero" className="campo mt-1 max-w-[16rem]" />
        </Field>
        <Field name="ficheiro" label="Recibo em PDF" error={state.errors.ficheiro}>
          <input id="ficheiro" name="ficheiro" type="file" accept="application/pdf" className="mt-1 block min-h-[44px] text-[16px]" />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
            {pending ? 'A enviar…' : 'Enviar recibo'}
          </button>
          <Nota s={state} />
        </div>
      </form>
      <form {...anular.formProps}>
        <button type="submit" disabled={anular.pending} className="btn-quiet btn-sm">
          Anular o pedido
        </button>
        <Nota s={anular.state} />
      </form>
    </div>
  );
}
