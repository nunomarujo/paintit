'use client';

import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { FASES, FASE_LABELS, FASE_PORQUE } from '@/domain/worksiteDiary';
import { addDiaryPhoto, removeDiaryPhoto } from '@/app/app/obras/actions';
import { CampoDeProduto } from '@/components/CampoDeProduto';
import type { ProdutoSugerivel } from '@/domain/produtoSugerido';

const input = 'mt-1 campo';

/** Juntar uma fotografia ao diário. A fase é o campo que dá sentido à fotografia, por isso vem primeiro. */
export function AddDiaryPhoto({ worksiteId, produtos = [] }: { worksiteId: string; produtos?: ProdutoSugerivel[] }) {
  const { state, pending, formProps } = useFormAction<FormState>(addDiaryPhoto.bind(null, worksiteId), { errors: {} }, { resetOnSuccess: true });
  const msg = Object.values(state.errors)[0] ?? state.message;
  return (
    <form {...formProps} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[17px]">
          Fase da obra
          <select name="fase" defaultValue="antes" className={input}>
            {FASES.map((f) => (
              <option key={f} value={f}>
                {FASE_LABELS[f]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[17px]">
          Fotografia
          <input type="file" name="ficheiro" accept="image/jpeg,image/png" capture="environment" className={input} />
        </label>
        <label className="text-[17px]">
          Zona (opcional)
          <input name="zona" placeholder="Alçado nascente, 2.º piso" className={input} />
        </label>
        <CampoDeProduto
          name="produto"
          label="Produto aplicado (opcional)"
          placeholder="Comece a escrever: o catálogo sugere"
          candidatos={produtos}
        />
        <label className="text-[17px] sm:col-span-2">
          Nota (opcional)
          <input name="legenda" placeholder="Fissura junto ao peitoril, antes de tratar" className={input} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-secondary">
          {pending ? 'A carregar…' : 'Juntar ao diário'}
        </button>
        {msg && <span className="text-[15px] text-slate-600">{msg}</span>}
      </div>
      <p className="text-[15px] text-slate-500">
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
      <button type="submit" disabled={pending} className="text-[15px] text-slate-600 underline underline-offset-2 hover:text-slate-700">
        {pending ? '…' : 'Apagar'}
      </button>
    </form>
  );
}

export { FASE_PORQUE };
