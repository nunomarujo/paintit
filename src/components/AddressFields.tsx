'use client';

import { useEffect, useId, useState } from 'react';

const inputClass = 'mt-1 campo';

interface Props {
  moradaName: string;
  moradaLabel: string;
  required?: boolean;
  withConcelho?: boolean;
  initial?: { morada?: string | null; codigoPostal?: string | null; localidade?: string | null; concelho?: string | null };
  errors: Record<string, string | undefined>;
}

/**
 * Código postal primeiro: a app vai buscar a localidade, o concelho e as ruas desse código
 * e sugere-as enquanto se escreve a morada. O servidor volta a validar ao guardar.
 */
export function AddressFields({ moradaName, moradaLabel, required, withConcelho, initial, errors }: Props) {
  const listId = useId();
  const [cp, setCp] = useState(initial?.codigoPostal ?? '');
  const [localidade, setLocalidade] = useState(initial?.localidade ?? '');
  const [concelho, setConcelho] = useState(initial?.concelho ?? '');
  const [ruas, setRuas] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!/^\d{4}-\d{3}$/.test(cp)) {
      setRuas([]);
      setAviso(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/codigo-postal?cp=${cp}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.estado === 'inexistente') return setAviso('Este código postal não existe.');
        if (j.estado !== 'ok') return setAviso(null);
        setAviso(null);
        setRuas(j.ruas ?? []);
        setLocalidade(j.localidade);
        setConcelho(j.concelho);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [cp]);

  const err = (k: string) => errors[k] && <span className="mt-1 block text-[15px] font-normal text-red-700">{errors[k]}</span>;
  return (
    <div className="space-y-4">
      <div className={`grid gap-4 ${withConcelho ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <label className="block text-[17px] font-medium text-slate-700">
          Código postal{required && <span className="text-red-700"> *</span>}
          <input
            name="codigoPostal"
            required={required}
            placeholder="0000-000"
            inputMode="numeric"
            value={cp}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, '').slice(0, 7);
              setCp(d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d);
            }}
            className={inputClass}
          />
          {aviso && <span className="mt-1 block text-[15px] font-normal text-red-700">{aviso}</span>}
          {err('codigoPostal')}
        </label>
        <label className="block text-[17px] font-medium text-slate-700">
          Localidade{required && <span className="text-red-700"> *</span>}
          <input name="localidade" required={required} value={localidade} onChange={(e) => setLocalidade(e.target.value)} className={inputClass} />
          {err('localidade')}
        </label>
        {withConcelho && (
          <label className="block text-[17px] font-medium text-slate-700">
            Concelho{required && <span className="text-red-700"> *</span>}
            <input name="concelho" required={required} value={concelho} onChange={(e) => setConcelho(e.target.value)} className={inputClass} />
            {err('concelho')}
          </label>
        )}
      </div>
      <label className="block text-[17px] font-medium text-slate-700">
        {moradaLabel}
        {required && <span className="text-red-700"> *</span>}
        <input
          name={moradaName}
          required={required}
          list={listId}
          defaultValue={initial?.morada ?? ''}
          placeholder={ruas.length ? 'Comece a escrever o nome da rua…' : 'Indique primeiro o código postal'}
          className={inputClass}
        />
        <datalist id={listId}>
          {ruas.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
        <span className="mt-1 block text-[15px] font-normal text-slate-500">Escolha a rua da lista e acrescente o número e o andar.</span>
        {err(moradaName)}
      </label>
    </div>
  );
}
