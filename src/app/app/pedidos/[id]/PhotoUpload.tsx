'use client';

import { useState } from 'react';
import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { uploadPhoto } from '@/app/app/pedidos/actions';
import { Field, selectClass } from '@/components/Field';
import { PHOTO_KINDS, PHOTO_KIND_LABELS } from '@/domain/photo';
import { PhotoInstructions } from './PhotoInstructions';

export function PhotoUpload({ requestId }: { requestId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(uploadPhoto.bind(null, requestId), { errors: {} }, { resetOnSuccess: true });
  const e = state.errors;
  // O aviso segue a escolha, e não o ecrã: só as de pormenor podem sair daqui.
  const [kind, setKind] = useState<string>('geral');

  return (
    <form {...formProps} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[17px] font-semibold">Acrescentar fotografia</h3>
        <PhotoInstructions />
      </div>

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
          <select
            name="kind"
            required
            value={kind}
            onChange={(ev) => setKind(ev.target.value)}
            className={selectClass}
          >
            {PHOTO_KINDS.map((k) => (
              <option key={k} value={k}>
                {PHOTO_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        {kind === 'pormenor' && (
          <p className="text-[15px] text-amber-900 sm:col-span-2">
            Esta pode ir para o anúncio. <strong>Não pode ter nada que identifique o prédio</strong> — números de porta,
            placas com nomes de rua, caixas de correio, matrículas ou pessoas. Alguém da equipa confirma antes de a
            publicar.
          </p>
        )}
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
        <input name="ficheiro" type="file" required accept="image/jpeg,image/png" className="mt-1 block w-full text-[17px]" />
      </Field>
      {state.message && (
        <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-secondary"
      >
        {pending ? 'A enviar…' : 'Enviar fotografia'}
      </button>
    </form>
  );
}
