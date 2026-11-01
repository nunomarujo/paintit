import Link from 'next/link';
import { contagemDoContacto, contagemDoPrazo, quandoCurto } from '@/domain/contagem';

/**
 * Um levantamento numa lista, com a anatomia que o promotor fixou a 01/11/2026: **referência, concelho,
 * estado, próxima obrigação e o prazo certo**, e o que fazer a seguir à direita.
 *
 * O prazo certo é a parte que estava errada antes: a lista mostrava sempre as 48 horas, mesmo a quem ainda
 * não tinha telefonado e tem uma hora útil a correr. Aqui mostra-se o prazo da obrigação que está por
 * cumprir — com a hora exata ao lado do tempo que falta, porque uma escreve-se na agenda e a outra ajuda a
 * decidir agora.
 *
 * A linha inteira é **um** destino: a etiqueta da ação à direita é um `<span>` com o aspeto de botão, não um
 * botão dentro de um link (HTML inválido, e dois alvos a disputar o mesmo toque). Assim a área de toque é a
 * linha toda, muito acima dos 44px da regra 17.
 *
 * Alarme em texto, nunca fundo de cor: isto vive dentro de uma lista (regra 13 do CLAUDE.md).
 */

export type LevantamentoNaLista = {
  id: string;
  ref: string;
  concelho: string;
  tipoObra: string;
  estado: 'por_contactar' | 'aguarda_cliente' | 'agendado' | 'em_revisao' | 'concluido';
  /** O instante que conta para a obrigação em curso. Nulo num levantamento concluído. */
  prazo: string | null;
  /** O prazo em curso conta-se no relógio útil (contacto) ou no de calendário (conclusão). */
  prazoUtil?: boolean;
  agendadoPara?: string | null;
};

const PROXIMA_OBRIGACAO: Record<LevantamentoNaLista['estado'], { titulo: string; nota: string; acao: string }> = {
  por_contactar: { titulo: 'Contactar o cliente', nota: 'Confirmar disponibilidade e agendar a visita.', acao: 'Abrir' },
  aguarda_cliente: { titulo: 'A aguardar confirmação', nota: 'O prazo continua a contar.', acao: 'Ver' },
  agendado: { titulo: 'Visita confirmada', nota: 'Medir e registar no local.', acao: 'Preparar visita' },
  em_revisao: { titulo: 'Em análise pela plataforma', nota: 'Nada a fazer de momento.', acao: 'Ver' },
  concluido: { titulo: 'Entregue', nota: 'Levantamento fechado.', acao: 'Ver' },
};

const ESTADO: Record<LevantamentoNaLista['estado'], string> = {
  por_contactar: 'bg-tinta-600',
  aguarda_cliente: 'border-2 border-slate-500',
  agendado: 'bg-tinta-400',
  em_revisao: 'bg-amber-700',
  concluido: 'bg-slate-400',
};

export function LinhaDeLevantamento({ l, agoraIso }: { l: LevantamentoNaLista; agoraIso: string }) {
  const agora = new Date(agoraIso);
  const o = PROXIMA_OBRIGACAO[l.estado];
  const contagem = l.prazo
    ? l.prazoUtil
      ? contagemDoContacto(agora, new Date(l.prazo))
      : contagemDoPrazo(agora, new Date(l.prazo))
    : null;
  const quando = l.prazo ? quandoCurto(agora, new Date(l.prazo)) : null;
  const agendado = l.agendadoPara ? quandoCurto(agora, new Date(l.agendadoPara)) : null;
  const alarme = !!contagem && (contagem.vencido || !!quando?.hoje);

  const ponto = <span aria-hidden="true" className={`h-[9px] w-[9px] shrink-0 rounded-full ${ESTADO[l.estado]}`} />;

  /* O prazo, em duas linhas: o quando (que decide) e o quanto falta (que ajuda a escolher). */
  const prazo = contagem && quando ? (
    <>
      <span className={`block text-[17px] ${alarme ? 'font-semibold text-amber-800' : 'font-medium text-slate-900'}`}>
        {quando.dia} · {quando.hora}
      </span>
      <span className={`block text-[15px] ${contagem.vencido ? 'font-semibold text-amber-800' : 'text-slate-600'}`}>
        {contagem.vencido ? 'o prazo passou' : contagem.texto}
      </span>
    </>
  ) : agendado ? (
    <>
      <span className="block text-[17px] font-medium text-slate-900">
        {agendado.dia} · {agendado.hora}
      </span>
      <span className="block text-[15px] text-slate-600">visita feita</span>
    </>
  ) : (
    <span className="block text-[15px] text-slate-600">Sem prazo a correr</span>
  );

  return (
    <li className="border-t border-slate-200 first:border-t-0">
      <Link
        href={`/app/levantamentos/${l.id}`}
        className="group block min-h-[44px] rounded-lg px-2 py-3 hover:bg-tinta-50/70"
      >
        {/* Telemóvel: três linhas, cada uma com o seu par. Uma coluna fixa à direita espremia o texto
            da esquerda para duas e três linhas — a 390px não há largura para colunas. */}
        <span className="block sm:hidden">
          <span className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-baseline gap-2">
              {ponto}
              <span className="truncate font-semibold text-slate-900">{l.ref}</span>
            </span>
            <span className={`shrink-0 text-[17px] ${alarme ? 'font-semibold text-amber-800' : 'font-medium text-slate-900'}`}>
              {quando ? `${quando.dia} · ${quando.hora}` : agendado ? `${agendado.dia} · ${agendado.hora}` : ''}
            </span>
          </span>
          <span className="mt-0.5 flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-[17px] text-slate-700">{o.titulo}</span>
            <span className={`shrink-0 text-[15px] ${contagem?.vencido ? 'font-semibold text-amber-800' : 'text-slate-600'}`}>
              {contagem ? (contagem.vencido ? 'o prazo passou' : contagem.texto) : agendado ? 'visita feita' : 'sem prazo'}
            </span>
          </span>
          <span className="mt-0.5 block text-[15px] text-slate-600">{l.concelho}</span>
        </span>

        {/* Ecrã largo: colunas alinhadas, para a lista se ler na vertical. */}
        <span className="hidden sm:flex sm:items-center sm:gap-4">
          <span className="flex items-baseline gap-2 sm:w-[12rem] sm:shrink-0">
            {ponto}
            <span>
              <span className="block font-semibold text-slate-900">{l.ref}</span>
              <span className="block text-[15px] text-slate-600">{l.concelho}</span>
            </span>
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-medium text-slate-900">{o.titulo}</span>
            <span className="block text-[15px] text-slate-600">{o.nota}</span>
          </span>

          <span className="w-[9rem] shrink-0 text-right">{prazo}</span>

          {/* Aspeto de botão, sem ser um: ver o cabeçalho. */}
          <span
            aria-hidden="true"
            className="inline-flex h-[38px] w-[9.5rem] shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-[15px] font-medium text-tinta-700 group-hover:border-tinta-600"
          >
            {o.acao}
          </span>
        </span>
      </Link>
    </li>
  );
}
