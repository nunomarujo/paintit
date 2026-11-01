'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ICONES } from '@/components/NavIcons';

/**
 * «Voltar» das páginas públicas que não são a inicial (Transparência, legais, artigo de obra
 * pública, páginas de perfil). Pedido do promotor, 01/11/2026: uma subpágina tem de devolver a
 * pessoa **ao sítio exato de onde saiu** — à secção da página inicial, ao ecrã da aplicação, ao
 * email — e não ao topo da página inicial.
 *
 * Por isso usa o histórico do navegador quando a página anterior é do próprio site, e só cai
 * para a página inicial quando se chegou aqui de fora (um link partilhado, um motor de busca):
 * nesse caso não há «sítio exato» a que voltar, e `history.back()` levaria para fora do site.
 *
 * `useEffect` e não `document.referrer` na renderização: no servidor não há `document`, e a
 * decisão tem de ser a mesma nas duas passagens para o React não se queixar.
 */
export function VoltarAtras({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [temHistorico, setTemHistorico] = useState(false);
  const Seta = ICONES.voltar;

  useEffect(() => {
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      setTemHistorico(!!ref && ref.origin === window.location.origin && window.history.length > 1);
    } catch {
      setTemHistorico(false);
    }
  }, []);

  if (!temHistorico) {
    return (
      <Link href="/" className={`inline-flex min-h-[44px] items-center gap-1.5 text-[17px] font-semibold text-tinta-700 hover:underline ${className}`}>
        <Seta className="h-4 w-4 shrink-0" />
        Página inicial
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`inline-flex min-h-[44px] items-center gap-1.5 text-[17px] font-semibold text-tinta-700 hover:underline ${className}`}
    >
      <Seta className="h-4 w-4 shrink-0" />
      Voltar
    </button>
  );
}
