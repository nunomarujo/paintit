'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { FASES, FASE_LABELS, FASE_PORQUE } from '@/domain/worksiteDiary';
import { addDiaryPhoto, removeDiaryPhoto } from '@/app/app/obras/actions';

const input = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';

/** Juntar uma fotografia ao diário. A fase é o campo que dá sentido à fotografia, por isso vem primeiro. */
export function AddDiaryPhoto({ worksiteId }: { worksiteId: string }) {
  const { state, pending, formProps } = useFormAction<FormState>(addDiaryPhoto.bind(null, worksiteId), { errors: {} }, { resetOnSuccess: true });
  const msg = Object.values(state.errors)[0] ?? state.message;
  return (
    <form {...formProps} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Fase da obra
          <select name="fase" defaultValue="antes" className={input}>
            {FASES.map((f) => (
              <option key={f} value={f}>
                {FASE_LABELS[f]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Fotografia
          <input type="file" name="ficheiro" accept="image/jpeg,image/png" capture="environment" className={input} />
        </label>
        <label className="text-sm">
          Zona (opcional)
          <input name="zona" placeholder="Alçado nascente, 2.º piso" className={input} />
        </label>
        <label className="text-sm">
          Produto aplicado (opcional)
          <input name="produto" placeholder="CIN Vinylmatt, branco gelo" className={input} />
        </label>
        <label className="text-sm sm:col-span-2">
          Nota (opcional)
          <input name="legenda" placeholder="Fissura junto ao peitoril, antes de tratar" className={input} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-secondary">
          {pending ? 'A carregar…' : 'Juntar ao diário'}
        </button>
        {msg && <span className="text-[12px] text-slate-600">{msg}</span>}
      </div>
      <p className="text-[11.5px] text-slate-500">
        A data que fica registada é a do momento em que carrega a fotografia, não a do telemóvel — é essa que serve de
        prova. Os dados de localização e de aparelho são apagados antes de guardar.
      </p>
    </form>
  );
}

export function RemoveDiaryPhoto({ worksiteId, photoId }: { worksiteId: string; photoId: string }) {
  const { pending, formProps } = useFormAction<FormState>(removeDiaryPhoto.bind(null, worksiteId, photoId), { errors: {} });
  return (
    <form {...formProps}>
      <button type="submit" disabled={pending} className="text-[11px] text-slate-400 underline underline-offset-2 hover:text-slate-700">
        {pending ? '…' : 'Apagar'}
      </button>
    </form>
  );
}

export { FASE_PORQUE };
