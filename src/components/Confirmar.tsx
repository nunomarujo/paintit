'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Pedido {
  titulo: string;
  texto?: string;
  confirmar?: string;
  cancelar?: string;
  /** Acção destrutiva: o botão de confirmar fica vermelho. */
  destrutivo?: boolean;
}

/**
 * Pedir confirmação sem sair da linguagem da casa.
 *
 * Havia dois `window.confirm()` no editor de orçamento, e o que aparecia era a caixa do navegador:
 * tipo de letra do sistema, botões azuis, "quempinta.pt diz" por cima (queixa do promotor,
 * 28/10/2026). Numa aplicação que um administrador de condomínio vai avaliar, essa caixa é o
 * momento em que o produto deixa de parecer um produto.
 *
 * Usa o `<dialog>` nativo, como `PhotoInstructions`: o Escape, o foco preso lá dentro e o fundo
 * escurecido vêm do navegador, e o desenho é nosso. A API devolve uma promessa, para o chamador
 * poder manter o `if (!await pedir(...)) return;` que já tinha com o `confirm`.
 *
 * ```tsx
 * const [pedir, dialogo] = useConfirmacao();
 * // …
 * if (!(await pedir({ titulo: 'Apagar o método?' }))) return;
 * // …
 * return <>{dialogo}…</>;
 * ```
 */
export function useConfirmacao(): [(p: Pedido) => Promise<boolean>, React.ReactNode] {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const pedir = useCallback((p: Pedido) => {
    setPedido(p);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const responder = useCallback((ok: boolean) => {
    ref.current?.close();
    setPedido(null);
    resolver.current?.(ok);
    resolver.current = null;
  }, []);

  useEffect(() => {
    if (pedido) ref.current?.showModal();
  }, [pedido]);

  // Fechar pelo Escape ou pelo fundo é o mesmo que cancelar — e sem isto a promessa ficava por
  // resolver, com o chamador à espera para sempre.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const aoFechar = () => {
      if (resolver.current) {
        setPedido(null);
        resolver.current(false);
        resolver.current = null;
      }
    };
    el.addEventListener('close', aoFechar);
    return () => el.removeEventListener('close', aoFechar);
  }, [pedido]);

  const dialogo = (
    <dialog
      ref={ref}
      className="w-[min(28rem,92vw)] rounded-2xl p-0 text-[17px] text-slate-900 backdrop:bg-slate-900/40"
      aria-labelledby="confirmar-titulo"
    >
      {pedido && (
        <div className="space-y-4 p-6">
          <h2 id="confirmar-titulo" className="text-[20px] leading-snug font-semibold text-tinta-900">
            {pedido.titulo}
          </h2>
          {pedido.texto && <p className="leading-snug text-slate-600">{pedido.texto}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => responder(false)} className="btn-secondary">
              {pedido.cancelar ?? 'Cancelar'}
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => responder(true)}
              className={pedido.destrutivo ? 'btn-base bg-red-700 text-white hover:bg-red-800' : 'btn-primary'}
            >
              {pedido.confirmar ?? 'Continuar'}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );

  return [pedir, dialogo];
}
