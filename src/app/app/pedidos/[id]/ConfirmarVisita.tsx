'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { horaExata } from '@/domain/contagem';
import { answerSchedule } from '@/app/app/levantamentos/actions';

/**
 * A confirmação do agendamento, pela cliente (31/10/2026).
 *
 * Regras do promotor, e cada uma tem uma razão que convém não esquecer ao mexer nisto:
 *
 *   · **o aviso não se fecha sozinho** — sem «X», sem fechar por clique fora, sem Escape. Enquanto não
 *     responder, o prazo do avaliador continua a correr, e o silêncio dela custa-lhe o trabalho;
 *   · **a ordem das opções** é agendamento primeiro, «não fui contactada» **por último**. Quem só quer
 *     fechar o aviso escolhe a primeira que vê; se a primeira fosse a acusação, acusaria por preguiça;
 *   · **nenhuma vem pré-selecionada**, e a última **pede confirmação expressa** antes de enviar. Dizer que
 *     alguém não ligou tem de ser um ato deliberado;
 *   · o botão é um só, «Confirmar resposta» — não três botões a competir.
 *
 * Fechar por Escape é um hábito tão enraizado que o navegador o faz por nós: é preciso tirá-lo à mão no
 * evento `cancel`. O diálogo nativo trata do resto — prende o foco lá dentro e devolve-o ao sair.
 */

type Agendamento = {
  attemptId: string;
  agendadoPara: string | null;
  limiteAdiamento: string;
};

type Resposta = 'agendado_48h' | 'adiado' | 'nao_contactado';

export function ConfirmarVisita({ agendamento }: { agendamento: Agendamento }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [escolha, setEscolha] = useState<Resposta | ''>('');
  const [confirmaAcusacao, setConfirmaAcusacao] = useState(false);
  const { state, pending, formProps } = useFormAction<FormState>(answerSchedule.bind(null, agendamento.attemptId), {
    errors: {},
  });

  useEffect(() => {
    const d = dialogo.current;
    if (!d || d.open) return;
    d.showModal();
    // Sem isto, Escape fecha — e o aviso deixava de ser obrigatório.
    const naoFechar = (e: Event) => e.preventDefault();
    d.addEventListener('cancel', naoFechar);
    return () => d.removeEventListener('cancel', naoFechar);
  }, []);

  useEffect(() => {
    if (state.ok) dialogo.current?.close();
  }, [state.ok]);

  const limite = horaExata(new Date(agendamento.limiteAdiamento));
  const maximo = (() => {
    const d = new Date(agendamento.limiteAdiamento);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  })();
  const podeEnviar = escolha !== '' && (escolha !== 'nao_contactado' || confirmaAcusacao);

  return (
    <dialog
      ref={dialogo}
      aria-labelledby="confirmar-visita"
      className="w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 backdrop:bg-slate-900/40"
      // Clicar fora não fecha: o clique no fundo cai no próprio <dialog>, e aqui não se faz nada com ele.
      onClick={(e) => e.stopPropagation()}
    >
      <form {...formProps} className="space-y-4 p-5">
        <div>
          <h2 id="confirmar-visita" className="text-[20px] font-semibold">Confirmar a visita ao prédio</h2>
          <p className="mt-1 text-[17px] text-slate-700">
            Um profissional registou o contacto consigo para fazer o levantamento. Confirme o que combinaram —
            sem a sua resposta, não se sabe se a visita está mesmo marcada.
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="sr-only">O que combinou</legend>

          <Opcao
            valor="agendado_48h"
            escolha={escolha}
            aoEscolher={setEscolha}
            titulo="Fui contactada e a visita ficou agendada"
            detalhe={
              agendamento.agendadoPara
                ? `Para ${horaExata(new Date(agendamento.agendadoPara))}. Confirme que corresponde ao que combinaram.`
                : 'Dentro das próximas 48 horas.'
            }
          />

          <Opcao
            valor="adiado"
            escolha={escolha}
            aoEscolher={setEscolha}
            titulo="Combinámos a visita para uma data posterior"
            detalhe={`Até ${limite}, no máximo.`}
          />

          {escolha === 'adiado' && (
            <div className="ml-7 space-y-1">
              <label className="block text-[17px]">
                Data e hora combinadas
                <input
                  name="data"
                  type="datetime-local"
                  max={maximo}
                  defaultValue={agendamento.agendadoPara ? agendamento.agendadoPara.slice(0, 16) : ''}
                  className="campo mt-1 w-auto"
                />
              </label>
              {state.errors.data && <p className="text-[17px] text-red-700" role="alert">{state.errors.data}</p>}
            </div>
          )}

          {/* Por último, e de propósito. */}
          <Opcao
            valor="nao_contactado"
            escolha={escolha}
            aoEscolher={(v) => {
              setEscolha(v);
              setConfirmaAcusacao(false);
            }}
            titulo="Não fui contactada"
            detalhe="Ninguém falou consigo sobre esta visita."
          />

          {escolha === 'nao_contactado' && (
            <div className="ml-7 rounded-2xl border border-slate-300 bg-paper p-3">
              <label className="flex min-h-[44px] items-center gap-3 text-[17px]">
                <input
                  type="checkbox"
                  checked={confirmaAcusacao}
                  onChange={(e) => setConfirmaAcusacao(e.target.checked)}
                  className="h-5 w-5 shrink-0 accent-tinta-600"
                />
                <span>
                  Confirmo que ninguém me contactou. A plataforma vai analisar o caso com os registos dos dois
                  lados.
                </span>
              </label>
            </div>
          )}
        </fieldset>

        <input type="hidden" name="resposta" value={escolha} />
        {state.errors.resposta && <p className="text-[17px] text-red-700" role="alert">{state.errors.resposta}</p>}
        {state.message && !state.ok && <p className="text-[17px] text-red-700" role="alert">{state.message}</p>}

        <button type="submit" disabled={pending || !podeEnviar} className="btn-primary w-full">
          {pending ? 'A enviar…' : 'Confirmar resposta'}
        </button>
      </form>
    </dialog>
  );
}

/** Uma escolha grande e legível, com a área de toque toda clicável (regra 17). */
function Opcao({
  valor,
  escolha,
  aoEscolher,
  titulo,
  detalhe,
}: {
  valor: Resposta;
  escolha: Resposta | '';
  aoEscolher: (v: Resposta) => void;
  titulo: string;
  detalhe: string;
}) {
  const escolhida = escolha === valor;
  return (
    <label
      className={`flex min-h-[44px] cursor-pointer gap-3 rounded-2xl border p-3 ${
        escolhida ? 'border-tinta-600 bg-tinta-50' : 'border-slate-300 bg-white'
      }`}
    >
      <input
        type="radio"
        name="escolha"
        value={valor}
        checked={escolhida}
        onChange={() => aoEscolher(valor)}
        className="mt-1 h-5 w-5 shrink-0 accent-tinta-600"
      />
      <span>
        <span className="block text-[17px] font-semibold">{titulo}</span>
        <span className="block text-[15px] text-slate-600">{detalhe}</span>
      </span>
    </label>
  );
}
