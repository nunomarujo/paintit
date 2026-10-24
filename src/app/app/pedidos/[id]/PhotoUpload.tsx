'use client';

import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { uploadPhoto } from '@/app/app/pedidos/actions';
import { Field, selectClass } from '@/components/Field';
import { PHOTO_KINDS, PHOTO_KIND_LABELS } from '@/domain/photo';
import { PhotoInstructions } from './PhotoInstructions';

export function PhotoUpload({ requestId }: { requestId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(uploadPhoto.bind(null, requestId), { errors: {} }, { resetOnSuccess: true });
  const e = state.errors;

  return (
    <form {...formProps} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Acrescentar fotografia</h3>
        <PhotoInstructions />
      </div>
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>As fotografias não podem ter nada que identifique o prédio</strong> — números de porta, portas, placas
        com nomes de rua, caixas de correio, matrículas ou pessoas. Veja as instruções antes da primeira.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="kind"
          label="Tipo"
          required
          error={e.kind}
          info={
            <>
              <strong>Geral</strong>: fica privada, serve só para a equipa da plataforma confirmar o pedido — nunca
              chega aos pintores. <strong>Pormenor</strong>: pode ir para o anúncio, depois de alguém da equipa
              confirmar que não identifica o prédio.
            </>
          }
        >
          <select name="kind" required defaultValue="geral" className={selectClass}>
            {PHOTO_KINDS.map((k) => (
              <option key={k} value={k}>
                {PHOTO_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          name="legenda"
          label="Legenda"
          error={e.legenda}
          hint="Opcional. Ex.: fissura no teto de uma varanda."
          info="Diga o que se vê e onde, sem indicar a morada nem o nome do prédio. É o que o pintor lê por baixo da fotografia."
        />
      </div>
      <Field
        name="ficheiro"
        label="Fotografia"
        required
        error={e.ficheiro}
        hint="JPG ou PNG, até 10 MB."
        info="A aplicação retira a localização e a data guardadas dentro do ficheiro antes de o gravar. O que estiver dentro da imagem não se consegue retirar."
      >
        <input name="ficheiro" type="file" required accept="image/jpeg,image/png" className="mt-1 block w-full text-sm" />
      </Field>
      {state.message && (
        <p className={`text-sm ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? 'A enviar…' : 'Enviar fotografia'}
      </button>
    </form>
  );
}
