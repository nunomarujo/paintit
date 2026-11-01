'use client';

import { VEZ_LABELS, type AlvoDaAccao, type EstadoDoPercurso } from '@/domain/percurso';
import type { SeccaoId } from '@/domain/seccoes';
import { useState, type ReactNode } from 'react';
import { useIrParaSeccao } from './PedidoEmSeccoes';
import { Dica } from '@/components/Dica';
import Link from 'next/link';

/**
 * O estado do pedido, no topo da página: o que já aconteceu, quem actua agora, e o que vem a
 * seguir.
 *
 * **Sem fundo de cor.** A regra 13 do CLAUDE.md dá uma banda de cor por ecrã, e essa está reservada
 * ao alarme — aqui não há alarme nenhum, há informação. O destaque vem da posição (é a primeira
 * coisa da página) e do tamanho da frase, não de pintar o fundo.
 *
 * **A régua não é decoração.** O promotor pediu o percurso à vista — «Pedido de visita → Visita →
 * Levantamento → Revisão → Recepção de propostas» — porque quem abre a página a meio não sabe
 * quanto falta nem a quem toca mexer-se. Uma etapa cumprida leva um sinal; a que está a decorrer
 * fica em texto cheio; as que faltam ficam cinzentas.
 */
export function Percurso({
  estado,
  requestId,
  marcadoPara,
  pendencia,
  houveLevantamento = true,
  detalheDaVisita,
  escuro = false,
}: {
  estado: EstadoDoPercurso;
  requestId: string;
  marcadoPara?: string | null;
  /** A primeira secção com alguma coisa por fazer, para onde «Continuar preparação» leva. */
  pendencia?: SeccaoId | null;
  /** Houve pedido de visita? Sem ele, a régua não mostra as etapas que nunca vão acontecer. */
  houveLevantamento?: boolean;
  /** O cartão do pedido de visita (pedir, ver, desistir). Abre por baixo da faixa quando a ação é
   * «Ver pedido de visita» — a faixa vive fora dos passos, e um salto para uma secção escondida
   * não fazia nada (promotor, 01/11/2026: «o botão não faz nada»). */
  detalheDaVisita?: ReactNode;
  /** Dentro de um cartão marinho (obra publicada): faixa translúcida e texto claro. */
  escuro?: boolean;
}) {
  // `houveLevantamento` já não desenha nada aqui (a régua saiu); fica na assinatura para não mexer em quem chama.
  void houveLevantamento;
  const vez = VEZ_LABELS[estado.vez];
  const irPara = useIrParaSeccao();
  const [visitaAberta, setVisitaAberta] = useState(false);
  // A ação principal da faixa é a da visita quando o percurso a pede; senão, a visita fica num
  // segundo botão discreto (quem nunca pediu, ou desistiu, tem de a poder pedir daqui).
  const accaoEhVisita = estado.accao?.alvo === 'pedido_de_visita';
  const abreVisita = !!detalheDaVisita;
  /*
   * O domínio escolhe o destino; aqui sabe-se o que ele é no ecrã.
   *
   * Eram âncoras — `#levantamento-da-obra` — e deixaram de poder ser quando a página passou a ter
   * secções: a âncora apontava para dentro de uma secção escondida, e carregar no botão não fazia
   * nada. «Não deve depender de uma âncora que pode não existir ou estar oculta», e tinha razão
   * duas vezes. Agora abre-se a secção.
   */
  const seccaoDoAlvo: Partial<Record<AlvoDaAccao, SeccaoId>> = {
    pedido_de_visita: 'resumo',
    levantamento: 'zonas',
    publicar: 'publicar',
    pendencia: pendencia ?? 'pretende',
  };

  // Uma faixa de uma linha (promotor, 01/11/2026): o título, a frase curta, a data quando há, e a
  // acção à direita. A explicação longa fica atrás do (i). A régua de etapas que aqui estava saiu:
  // duplicava os passos do pedido e lia-se como um segundo percurso.
  const longa = estado.explicacao.length > 90;
  const quando = marcadoPara
    ? new Date(marcadoPara).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })
    : null;
  return (
    <section className={`rounded-2xl px-5 py-3 ${escuro ? 'bg-white/10' : 'bg-tinta-50'}`} aria-live="polite">
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-[17px]">
          <span className={`font-semibold ${escuro ? 'text-white' : 'text-tinta-900'}`}>{estado.titulo}</span>
          {quando && <span className={escuro ? 'text-tinta-100' : 'text-slate-700'}>· {quando}</span>}
          {vez && <span className={`text-[13px] ${escuro ? 'text-tinta-200' : 'text-slate-600'}`}>· {vez}</span>}
        </p>
        <p className={`mt-0.5 flex items-center gap-2 text-[15px] ${escuro ? 'text-tinta-100' : 'text-slate-700'}`}>
          <span className={longa ? 'truncate' : ''}>{longa ? `${estado.explicacao.slice(0, 88).trimEnd()}…` : estado.explicacao}</span>
          {longa && <Dica rotulo="Ler a explicação completa">{estado.explicacao}</Dica>}
        </p>
      </div>
      {estado.accao &&
        (estado.accao.alvo === 'propostas' ? (
          <Link href={`/app/pedidos/${requestId}/propostas`} className="btn-secondary shrink-0">
            {estado.accao.texto}
          </Link>
        ) : accaoEhVisita && abreVisita ? (
          <button type="button" aria-expanded={visitaAberta} onClick={() => setVisitaAberta((v) => !v)} className="btn-secondary shrink-0">
            {visitaAberta ? 'Fechar' : estado.accao.texto}
          </button>
        ) : (
          <button type="button" onClick={() => irPara(seccaoDoAlvo[estado.accao!.alvo] ?? 'resumo')} className="btn-secondary shrink-0">
            {estado.accao.texto}
          </button>
        ))}
      {abreVisita && !accaoEhVisita && (
        <button type="button" aria-expanded={visitaAberta} onClick={() => setVisitaAberta((v) => !v)} className="btn-quiet shrink-0">
          {visitaAberta ? 'Fechar' : 'Ajuda de um avaliador'}
        </button>
      )}
    </div>
    {abreVisita && visitaAberta && <div className="mt-3 border-t border-tinta-100 pt-3">{detalheDaVisita}</div>}
    </section>
  );
}
