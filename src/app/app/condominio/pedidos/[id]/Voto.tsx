'use client';

import { useState, useTransition } from 'react';
import { votar } from './actions';

export function Voto({
  requestId,
  proposalId,
  alias,
  meuVoto,
  aberto,
}: {
  requestId: string;
  proposalId: string;
  alias: string;
  /** Proposta em que esta fração votou, ou null. */
  meuVoto: string | null;
  aberto: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const escolhida = meuVoto === proposalId;

  if (!aberto) {
    return escolhida ? <p className="text-[15px] font-semibold text-tinta-900">O seu voto foi nesta proposta.</p> : null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pendente || escolhida}
        className={escolhida ? 'btn-secondary' : 'btn-primary'}
        aria-pressed={escolhida}
        onClick={() =>
          iniciar(async () => {
            setErro(null);
            const r = await votar(requestId, proposalId);
            if (!r.ok) setErro(r.message ?? 'Não foi possível registar o voto.');
          })
        }
      >
        {escolhida ? 'O meu voto' : meuVoto ? `Mudar o voto para ${alias}` : `Votar em ${alias}`}
      </button>
      {escolhida && <span className="text-[15px] text-slate-600">Pode mudar enquanto a votação estiver aberta.</span>}
      {erro && (
        <span className="text-[15px] text-red-700" role="alert">
          {erro}
        </span>
      )}
    </div>
  );
}
