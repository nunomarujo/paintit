'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormState } from '@/app/app/actions';

type Guardar = (prev: FormState, form: FormData) => Promise<FormState>;
type Estado = 'parado' | 'a_guardar' | 'guardado' | 'erro';

const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[17px]';

/**
 * Campo que se grava sozinho, sem botão (pedido do promotor, 24/10/2026). Grava quando a pessoa sai do
 * campo, e também 1,2 s depois de parar de escrever — quem preenche e fecha o separador não perde o que
 * escreveu.
 *
 * Não usa `useFormAction` de propósito: aquele existe para um envio por formulário, com a resposta a
 * repor erros em todos os campos. Aqui cada campo é independente e tem de dizer o seu próprio estado
 * ("Guardado", ou o erro) sem mexer nos vizinhos.
 */
export function AutoSaveField({
  label,
  info,
  valorInicial,
  guardar,
  tipo = 'texto',
  inputMode,
}: {
  label: string;
  info?: string;
  valorInicial: string;
  guardar: Guardar;
  tipo?: 'texto' | 'checkbox';
  inputMode?: 'numeric' | 'text';
}) {
  const [valor, setValor] = useState(valorInicial);
  const [estado, setEstado] = useState<Estado>('parado');
  const [erro, setErro] = useState<string | null>(null);
  const gravado = useRef(valorInicial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // O valor que veio do servidor manda, se mudou por fora (ex.: outra pessoa da equipa alterou).
  useEffect(() => {
    setValor(valorInicial);
    gravado.current = valorInicial;
  }, [valorInicial]);

  async function enviar(v: string) {
    if (v === gravado.current) return;
    if (timer.current) clearTimeout(timer.current);
    setEstado('a_guardar');
    const form = new FormData();
    form.set('valor', v);
    const r = await guardar({ errors: {} }, form);
    const mensagem = Object.values(r.errors)[0] ?? (r.ok ? null : r.message ?? 'Não foi possível guardar.');
    if (r.ok) {
      gravado.current = v;
      setErro(null);
      setEstado('guardado');
    } else {
      setErro(mensagem ?? 'Não foi possível guardar.');
      setEstado('erro');
    }
  }

  function aoEscrever(v: string) {
    setValor(v);
    setEstado('parado');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void enviar(v), 1200);
  }

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  if (tipo === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-[17px]">
        <input
          type="checkbox"
          checked={valor === 'sim'}
          onChange={(ev) => {
            const v = ev.target.checked ? 'sim' : 'nao';
            setValor(v);
            void enviar(v);
          }}
        />
        {label}
        <Marca estado={estado} erro={erro} />
      </label>
    );
  }

  return (
    <label className="block text-[17px] font-medium text-slate-700">
      <span className="inline-flex items-baseline gap-2">
        {label}
        <Marca estado={estado} erro={erro} />
      </span>
      <input
        value={valor}
        inputMode={inputMode}
        onChange={(ev) => aoEscrever(ev.target.value)}
        onBlur={() => void enviar(valor)}
        aria-invalid={estado === 'erro' ? true : undefined}
        className={inputClass}
      />
      {info && !erro && <span className="mt-1 block text-[15px] font-normal text-slate-500">{info}</span>}
      {erro && (
        <span className="mt-1 block text-[15px] font-normal text-red-700" role="alert">
          {erro}
        </span>
      )}
    </label>
  );
}

function Marca({ estado, erro }: { estado: Estado; erro: string | null }) {
  if (estado === 'a_guardar') return <span className="text-[15px] font-normal text-slate-500">a guardar…</span>;
  if (estado === 'guardado' && !erro) return <span className="text-[15px] font-normal text-tinta-700">guardado</span>;
  return null;
}
