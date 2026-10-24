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

  // Erro de validação num campo fora do ecrã: sem isto, carregar no botão não mexe nada à vista e
  // parece que o formulário "não grava e não dá erro" (relatado pelo promotor em 24/10/2026, com o
  // código postal incompleto num formulário longo — mesma família do bug "Nova entidade" de d09ee3e).
  // Salta para o primeiro campo com erro **pela ordem do formulário**, não pela ordem das chaves do
  // objeto de erros, e põe-lhe o cursor.
  useEffect(() => {
    const errors = (state as { errors?: Record<string, string | undefined> }).errors;
    const form = ref.current;
    if (!form || ok || !errors) return;
    const named = Object.keys(errors).filter((k) => errors[k]);
    if (named.length === 0) return;
    for (const el of Array.from(form.elements)) {
      if (!(el instanceof HTMLElement)) continue;
      const name = (el as { name?: string }).name;
      if (!name || !named.includes(name)) continue;
      // `preventScroll`: o foco não volta a deslocar a página por cima do deslocamento suave acima.
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.focus({ preventScroll: true });
      return;
    }
  }, [state, ok]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // O botão carregado conta (ex.: Aprovar ou Rejeitar).
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(data));
  }

  return { state, pending, formProps: { ref, onSubmit } };
}
