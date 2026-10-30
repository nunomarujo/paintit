import { VEZ_LABELS, etapaAtingida, etapasDoPedido, type AlvoDaAccao, type EstadoDoPercurso } from '@/domain/percurso';
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
  houveLevantamento = true,
}: {
  estado: EstadoDoPercurso;
  requestId: string;
  marcadoPara?: string | null;
  /** Houve pedido de visita? Sem ele, a régua não mostra as etapas que nunca vão acontecer. */
  houveLevantamento?: boolean;
}) {
  const etapas = etapasDoPedido(houveLevantamento);
  const actual = etapaAtingida(estado.fase, etapas);
  const vez = VEZ_LABELS[estado.vez];
  // O domínio escolhe o destino; o endereço monta-se aqui, que é onde se sabe como se chamam as
  // secções e as rotas.
  const endereco: Record<AlvoDaAccao, string> = {
    pedido_de_visita: '#pedido-de-visita',
    levantamento: '#levantamento-da-obra',
    publicar: '#publicar',
    propostas: `/app/pedidos/${requestId}/propostas`,
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[20px] font-semibold">{estado.titulo}</h2>
        {vez && <p className="text-[15px] text-slate-500">{vez}</p>}
      </div>
      <p className="mt-1 max-w-[54ch] text-[17px] text-slate-700">{estado.explicacao}</p>
      {marcadoPara && (
        <p className="mt-1 text-[17px] font-medium">
          {new Date(marcadoPara).toLocaleString('pt-PT', {
            timeZone: 'Europe/Lisbon',
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}

      <ol className="mt-4 flex flex-wrap gap-x-2 gap-y-2 text-[15px]">
        {etapas.map((e, i) => {
          const feita = i < actual;
          const agora = i === actual;
          return (
            <li key={e.fase} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[13px] ${
                  feita ? 'bg-tinta-600 text-white' : agora ? 'border-2 border-tinta-600 bg-white' : 'border border-slate-300 bg-white'
                }`}
              >
                {feita ? '✓' : ''}
              </span>
              <span className={agora ? 'font-semibold text-tinta-900' : feita ? 'text-slate-700' : 'text-slate-500'}>
                {e.nome}
                {agora && <span className="sr-only"> — etapa actual</span>}
              </span>
              {i < etapas.length - 1 && (
                <span aria-hidden="true" className="ml-1 hidden text-slate-300 sm:inline">
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {estado.accao && (
        <p className="mt-4">
          <Link href={endereco[estado.accao.alvo]} className="btn-primary">
            {estado.accao.texto}
          </Link>
        </p>
      )}
    </section>
  );
}
