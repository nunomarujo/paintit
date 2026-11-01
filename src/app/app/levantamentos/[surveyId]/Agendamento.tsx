'use client';

import { useEffect, useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { useFormAction } from '@/components/useFormAction';
import { HORARIO_UTIL, contagemDoContacto, contagemDoPrazo, horaExata } from '@/domain/contagem';
import { registerContact } from '../actions';

/**
 * Contacto e agendamento, do lado do avaliador (31/10/2026).
 *
 * O que esta secção tem de fazer, por decisão do promotor:
 *
 *   · mostrar a data e a hora exatas do prazo **e** o tempo que falta — a hora exata escreve-se na agenda, o
 *     tempo que falta ajuda a decidir agora;
 *   · deixar registar a data acordada, mas **nunca** para além das 48 horas: a extensão é só da cliente, e
 *     essa assimetria é verificada na base, não aqui;
 *   · quando se aguarda a confirmação da cliente, mostrar o estado **ao lado do prazo que continua a
 *     correr** — nunca sugerir que a contagem parou.
 *
 * A contagem vive em `src/domain/contagem.ts` e atualiza-se de minuto a minuto. O primeiro desenho é feito no
 * servidor com a hora do servidor; o relógio só arranca no cliente, para não haver diferença visível entre o
 * que vem do servidor e o primeiro desenho do navegador.
 */

type Prazos = {
  attemptId: string;
  prazoContacto: string;
  prazoConclusao: string;
  limiteAdiamento: string;
  contactoRegistadoEm: string | null;
  contactoNotas: string;
  agendadoPara: string | null;
  respostaCliente: 'agendado_48h' | 'adiado' | 'nao_contactado' | null;
  adiadoPara: string | null;
  estado: 'ativa' | 'concluida' | 'libertada' | 'em_revisao';
};

type Contacto = {
  nome: string | null;
  telefone: string | null;
  email: string | null;
  morada: string;
  codigoPostal: string | null;
  localidade: string | null;
};

/**
 * Um relógio ancorado na hora do **servidor**, que avança com o tempo decorrido medido no dispositivo.
 *
 * A tentação era `new Date()` e pronto. Mas um telemóvel com o relógio desacertado — e há muitos — mostraria
 * um prazo errado a quem tem um trabalho dependente dele. Aqui o dispositivo só é usado para medir **quanto
 * tempo passou desde que a página abriu**, que é a parte em que é de confiança; a hora absoluta vem do
 * servidor, que é quem manda nos prazos.
 */
function useAgora(doServidor: Date): Date {
  const [agora, setAgora] = useState(doServidor);
  useEffect(() => {
    const abertura = Date.now();
    const base = doServidor.getTime();
    const tique = () => setAgora(new Date(base + (Date.now() - abertura)));
    tique();
    const t = setInterval(tique, 30_000);
    return () => clearInterval(t);
  }, [doServidor]);
  return agora;
}

export function Agendamento({ prazos, contacto, agoraIso }: { prazos: Prazos; contacto: Contacto | null; agoraIso: string }) {
  const agora = useAgora(new Date(agoraIso));
  const concluida = prazos.estado === 'concluida';
  const porContactar = prazos.contactoRegistadoEm === null;
  const prazoEfetivo = new Date(prazos.adiadoPara ?? prazos.prazoConclusao);
  const contagemContacto = contagemDoContacto(agora, new Date(prazos.prazoContacto));
  const contagemConclusao = contagemDoPrazo(agora, prazoEfetivo);
  const aguardaCliente = !porContactar && prazos.respostaCliente === null && prazos.estado === 'ativa';

  if (concluida) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="font-semibold text-slate-900">Como se chegou à visita</h3>
        <p className="mt-1 whitespace-pre-line text-[17px] text-slate-700">{prazos.contactoNotas || 'Sem registo de contacto.'}</p>
        {prazos.agendadoPara && (
          <p className="mt-2 text-[17px] text-slate-700">Visita combinada para {horaExata(new Date(prazos.agendadoPara))}.</p>
        )}
        {prazos.respostaCliente && (
          <p className="mt-1 text-[15px] text-slate-600">
            {prazos.respostaCliente === 'nao_contactado'
              ? 'A cliente declarou não ter sido contactada.'
              : 'A cliente confirmou a visita.'}
          </p>
        )}
        <p className="mt-2 text-[15px] text-slate-600">
          O levantamento está concluído: não há prazos a correr nem nada por registar.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {/* A única banda com fundo de cor, e vai no topo: é o que exige atenção agora (regra 13). */}
      {porContactar ? (
        <section aria-labelledby="prazo-contacto" className="rounded-2xl border border-tinta-200 bg-tinta-50 p-4">
          <h3 id="prazo-contacto" className="font-semibold text-slate-900">
            Contactar a cliente até {horaExata(new Date(prazos.prazoContacto))}
          </h3>
          <p className={`mt-1 text-[17px] ${contagemContacto.vencido ? 'font-semibold text-amber-800' : 'text-slate-700'}`}>
            {contagemContacto.vencido
              ? 'O prazo de contacto passou. A reserva pode ser libertada a qualquer momento.'
              : `${contagemContacto.texto} — o relógio conta ${HORARIO_UTIL}.`}
          </p>
          <p className="mt-2 text-[15px] text-slate-600">
            Sem contacto registado neste prazo, a reserva volta à praça e a oportunidade reabre aos restantes
            avaliadores.
          </p>
        </section>
      ) : (
        <section aria-labelledby="prazo-conclusao" className="rounded-2xl border border-tinta-200 bg-tinta-50 p-4">
          <h3 id="prazo-conclusao" className="font-semibold text-slate-900">
            Concluir o levantamento até {horaExata(prazoEfetivo)}
          </h3>
          <p className={`mt-1 text-[17px] ${contagemConclusao.vencido ? 'font-semibold text-amber-800' : 'text-slate-700'}`}>
            {contagemConclusao.vencido ? 'O prazo passou.' : contagemConclusao.texto}
          </p>
          {prazos.adiadoPara && (
            <p className="mt-2 text-[15px] text-slate-600">
              A cliente pediu data posterior, e esta passou a ser a data de conclusão.
            </p>
          )}
        </section>
      )}

      {/* O estado da espera, ao lado do prazo que continua a correr. */}
      {aguardaCliente && (
        <section aria-labelledby="espera" className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="h-[9px] w-[9px] rounded-full border-2 border-slate-500" />
            <h3 id="espera" className="font-semibold text-slate-900">A aguardar confirmação da cliente</h3>
          </div>
          <p className="mt-1 text-[17px] text-slate-700">
            O seu prazo <strong>continua a contar</strong>: {contagemConclusao.texto} para concluir o
            levantamento.
          </p>
        </section>
      )}

      {prazos.respostaCliente === 'nao_contactado' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-900">Em análise pela plataforma</h3>
          <p className="mt-1 text-[17px] text-slate-700">
            A cliente declarou não ter sido contactada. O seu registo e a resposta dela ficaram guardados, e a
            equipa da plataforma vai ver os dois. Entretanto não perde a reserva nem a comissão.
          </p>
        </section>
      )}

      {/* Os dados da cliente: só aparecem a quem tem reserva válida e confidencialidade aceite. */}
      {contacto && (
        <section aria-labelledby="cliente" className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 id="cliente" className="text-[15px] font-semibold text-slate-600">Cliente</h3>
          {contacto.nome && <p className="mt-1 text-[20px] font-semibold text-slate-900">{contacto.nome}</p>}
          {contacto.telefone && <p className="mt-1 text-[17px] text-slate-700">{contacto.telefone}</p>}
          {contacto.email && <p className="text-[17px] text-slate-700">{contacto.email}</p>}
          <p className="mt-2 text-[17px] text-slate-700">
            {contacto.morada}
            {contacto.codigoPostal ? ` · ${contacto.codigoPostal}` : ''}
            {contacto.localidade ? ` ${contacto.localidade}` : ''}
          </p>
          <p className="mt-2 text-[15px] text-slate-600">
            Dados confidenciais, para combinar esta visita e mais nada. Não os partilhe fora da plataforma.
          </p>
          {contacto.telefone && (
            <a href={`tel:${contacto.telefone.replace(/\s+/g, '')}`} className="btn-primary mt-3 inline-flex">
              Ligar
            </a>
          )}
        </section>
      )}

      {prazos.estado === 'ativa' ? (
        <FormularioDoContacto prazos={prazos} />
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-900">O que ficou registado</h3>
          <p className="mt-1 whitespace-pre-line text-[17px] text-slate-700">{prazos.contactoNotas || '—'}</p>
          <p className="mt-2 text-[15px] text-slate-600">
            Enquanto o caso estiver em análise, o registo não se altera: é ele a prova do que aconteceu.
          </p>
        </section>
      )}
    </div>
  );
}

function FormularioDoContacto({ prazos }: { prazos: Prazos }) {
  const { state, pending, formProps } = useFormAction<FormState>(registerContact.bind(null, prazos.attemptId), { errors: {} });
  const limite = new Date(prazos.prazoConclusao);
  // O campo não deixa escolher além das 48 horas — e a base recusa de qualquer maneira, que é onde a regra
  // vive. Isto é só para não deixar ninguém escrever uma data que vai ser recusada.
  const maximo = new Date(limite.getTime() - limite.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

  return (
    <form {...formProps} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-[17px]">
      <h3 className="font-semibold text-slate-900">
        {prazos.contactoRegistadoEm ? 'Corrigir o registo do contacto' : 'Registar o contacto'}
      </h3>
      <label className="block">
        O que ficou combinado
        <textarea
          name="notas"
          rows={3}
          defaultValue={prazos.contactoNotas}
          placeholder="Ex.: falei com a D. Ana às 9h40, ficou combinada a visita."
          aria-describedby={state.errors.notas ? 'erro-notas' : undefined}
          className="campo mt-1"
        />
      </label>
      {state.errors.notas && (
        <p id="erro-notas" className="text-[17px] text-red-700" role="alert">{state.errors.notas}</p>
      )}
      <label className="block">
        Visita acordada para
        <input
          name="agendado"
          type="datetime-local"
          max={maximo}
          defaultValue={prazos.agendadoPara ? prazos.agendadoPara.slice(0, 16) : ''}
          aria-describedby="ajuda-agendado"
          className="campo mt-1 w-auto"
        />
      </label>
      <p id="ajuda-agendado" className="text-[15px] text-slate-600">
        Até {horaExata(limite)}. Só a cliente pode pedir data posterior, e tem de o fazer na confirmação —
        até sete dias úteis, no máximo.
      </p>
      {state.errors.agendado && (
        <p className="text-[17px] text-red-700" role="alert">{state.errors.agendado}</p>
      )}
      {state.message && (
        <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role={state.ok ? undefined : 'alert'}>
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? 'A registar…' : 'Enviar para confirmação da cliente'}
      </button>
    </form>
  );
}
