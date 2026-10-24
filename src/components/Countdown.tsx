'use client';

import { useEffect, useState } from 'react';

/**
 * Tempo que falta até um prazo, a contar à vista (pedido do promotor, 24/10/2026: "onde aparece a
 * contagem do tempo para fazer cada etapa"). Uma data escrita por extenso obriga a pessoa a fazer a
 * conta de cabeça; o que ela precisa de saber é se tem horas ou minutos.
 *
 * Renderiza do lado do cliente com o relógio do próprio aparelho, e por isso arranca só depois de
 * montar (sem isto, o servidor escreveria um valor e o navegador outro logo a seguir — erro de
 * hidratação). Enquanto não arranca, mostra a data, que é correta nos dois lados.
 */
export function Countdown({ deadline, className }: { deadline: string; className?: string }) {
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    const alvo = new Date(deadline).getTime();
    const tick = () => setRestante(alvo - Date.now());
    tick();
    // De minuto a minuto: a precisão ao segundo não acrescenta nada e só faz a página trabalhar.
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [deadline]);

  const dataPorExtenso = new Date(deadline).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (restante === null) return <span className={className}>até {dataPorExtenso}</span>;
  if (restante <= 0) return <span className={`font-semibold text-red-700 ${className ?? ''}`}>prazo terminado</span>;

  const horas = Math.floor(restante / 3_600_000);
  const minutos = Math.floor((restante % 3_600_000) / 60_000);
  const texto = horas >= 1 ? `${horas}h${String(minutos).padStart(2, '0')}` : `${minutos} min`;
  // Menos de duas horas: deixa de ser informação e passa a ser urgência.
  const urgente = restante < 2 * 3_600_000;

  return (
    <span className={className}>
      faltam <strong className={urgente ? 'text-red-700' : undefined}>{texto}</strong>{' '}
      <span className="text-slate-500">(até {dataPorExtenso})</span>
    </span>
  );
}
