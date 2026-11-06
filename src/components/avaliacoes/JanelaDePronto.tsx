'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Janela } from '@/app/app/pedidos/[id]/Janela';
import { chaveDaJanelaDePronto } from '@/domain/prontidaoDoAvaliador';

/**
 * A janela «Tudo pronto para receber levantamentos» (promotor, 06/11/2026): aparece uma vez, na primeira
 * abertura de «Hoje» depois de a inscrição e as zonas estarem feitas, e não volta depois de fechada.
 *
 * Lembrar que já foi vista é uma conveniência deste navegador (`localStorage`), não um dado a guardar:
 * num navegador novo, ou com os dados apagados, pode aparecer outra vez, e o cartão no topo de «Hoje»
 * diz o mesmo. Sem acesso ao armazenamento (janela privada, bloqueado), não abre — melhor não mostrar
 * do que mostrar sempre.
 */
export function JanelaDePronto({
  userId,
  intervalo,
  exemplo,
  banda,
  whatsappLigado,
  recomendacao,
}: {
  userId: string;
  /** «450 € a 1215 €». */
  intervalo: string;
  /** «Numa obra adjudicada por 45 000 €, sem IVA.» */
  exemplo: string;
  /** «Entre 1% e 2,7% do valor adjudicado» — vem do domínio, nunca escrito aqui. */
  banda: string;
  whatsappLigado: boolean;
  recomendacao: string;
}) {
  const [aberta, setAberta] = useState(false);
  const chave = chaveDaJanelaDePronto(userId);

  useEffect(() => {
    try {
      if (!localStorage.getItem(chave)) setAberta(true);
    } catch {
      // sem armazenamento: não abre
    }
  }, [chave]);

  const fechar = () => {
    try {
      localStorage.setItem(chave, new Date().toISOString());
    } catch {
      // nada a fazer
    }
    setAberta(false);
  };

  return (
    <Janela aberta={aberta} aoFechar={fechar} forma="centro" idDoTitulo="pronto-titulo">
      <div className="overflow-y-auto p-6">
        <p className="text-[13px] font-semibold text-tinta-700">Inscrição e zonas feitas</p>
        <h2 id="pronto-titulo" className="mt-1 text-[26px] font-bold leading-tight text-slate-900">
          Tudo pronto para receber levantamentos
        </h2>
        <p className="mt-4 text-[15px] font-semibold text-slate-600">Quanto pode ganhar</p>
        <p className="mt-1 text-[34px] font-bold leading-[1.1] tracking-[-0.02em] tabular-nums text-slate-900">{intervalo}</p>
        <p className="mt-1 max-w-[54ch] text-[15px] text-slate-600">{exemplo}</p>
        <p className="mt-3 max-w-[54ch] text-[17px] text-slate-700">
          {banda}, conforme a qualificação. Recebe quando a obra for adjudicada,
          seja qual for o pintor escolhido.
        </p>
        {!whatsappLigado && <p className="mt-3 max-w-[54ch] text-[17px] text-slate-700">{recomendacao}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          {whatsappLigado ? (
            <Link href="/app/avaliacoes/oportunidades" className="btn-primary" onClick={fechar}>
              Ver oportunidades
            </Link>
          ) : (
            <Link href="/app/avaliacoes/inscricao#avisos" className="btn-primary" onClick={fechar}>
              Ligar os avisos por WhatsApp
            </Link>
          )}
          <button type="button" className="btn-secondary" onClick={fechar}>
            Fechar
          </button>
        </div>
      </div>
    </Janela>
  );
}
