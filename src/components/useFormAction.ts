'use client';

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from 'react';

/**
 * Como `useActionState`, mas sem apagar o que a pessoa escreveu quando a resposta traz erros.
 * Num `<form action={…}>`, o React 19 repõe todos os campos depois de cada envio, e um NIF mal
 * escrito obrigava a preencher o formulário inteiro de novo. Aqui o envio passa por `onSubmit`,
 * e o formulário só é limpo quando se pede (`resetOnSuccess`) e a resposta é `ok`.
 */
export function useFormAction<S extends object>(
  submit: (state: S, form: FormData) => Promise<S>,
  initial: S,
  { resetOnSuccess = false }: { resetOnSuccess?: boolean } = {},
) {
  const [state, dispatch, pending] = useActionState<S, FormData>(submit, initial as Awaited<S>);
  const ok = 'ok' in state && state.ok === true;
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && ok) ref.current?.reset();
  }, [state, ok, resetOnSuccess]);

  // Aviso por tentar partilhar contactos: o StrikeDialog (no layout da área reservada) mostra-o.
  useEffect(() => {
    const strike = (state as { strike?: unknown }).strike;
    if (strike) window.dispatchEvent(new CustomEvent('qp:strike', { detail: strike }));
  }, [state]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // O botão carregado conta (ex.: Aprovar ou Rejeitar).
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(data));
  }

  return { state, pending, formProps: { ref, onSubmit } };
}
