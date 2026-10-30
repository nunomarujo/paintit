'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendMessage } from '@/app/app/oportunidades/actions';
import type { Pergunta } from '@/domain/reconciliacao';
import { proximoAEnviar, type EstadoDoFicheiro } from '@/domain/fila';

/**
 * As perguntas da conta, enviadas daqui.
 *
 * ## O que estava mal
 *
 * A reconciliação já escrevia as perguntas certas — pelo critério e não pelo número, aos dois
 * quando a divergência é de medição — e depois dizia: «Pode enviá-las nas mensagens de cada
 * proposta.» Ou seja: seleccionar, copiar, abrir outro ecrã, escolher a proposta, colar, enviar, e
 * outra vez para a seguinte. Para quatro perguntas são vinte e quatro gestos, e o resultado
 * previsível é não se perguntar nada.
 *
 * «O que precisamos desta app é não-manualidades, tudo automatizado» (promotor). Isto é uma delas.
 *
 * ## O que não se automatiza
 *
 * O envio. Cada pergunta chega a uma empresa de verdade, e quem decide fazê-la é quem a vai ler em
 * assembleia — por isso vêm todas escolhidas, mas é preciso carregar. Desmarca-se o que não
 * interessa, e o que seguir vai uma a uma, cada uma para a sua proposta, com o resultado à vista.
 *
 * O texto não se edita aqui, e é de propósito: foi escrito para não identificar ninguém nem acusar
 * ninguém de erro, e esse cuidado perde-se na primeira reescrita à pressa. Quem quiser perguntar
 * outra coisa continua a ter as mensagens da proposta, onde as palavras são suas.
 */
export function PerguntasASeguir({ perguntas, caminho }: { perguntas: Pergunta[]; caminho: string }) {
  const router = useRouter();
  const [escolhidas, setEscolhidas] = useState<Set<number>>(() => new Set(perguntas.map((_, i) => i)));
  const [estados, mostrarEstados] = useState<Record<number, EstadoDoFicheiro | undefined>>({});
  const [erros, setErros] = useState<Record<number, string | undefined>>({});
  const estadosRef = useRef<Record<number, EstadoDoFicheiro | undefined>>({});
  const aEnviar = useRef(false);

  const marcar = useCallback((i: number, estado: EstadoDoFicheiro, erro?: string) => {
    estadosRef.current = { ...estadosRef.current, [i]: estado };
    mostrarEstados(estadosRef.current);
    setErros((e) => ({ ...e, [i]: erro }));
  }, []);

  const bombear = useCallback(async () => {
    if (aEnviar.current) return;
    aEnviar.current = true;
    try {
      for (;;) {
        // A mesma regra de sequência dos envios de fotografias: uma de cada vez, e uma que falhe
        // não volta à fila sozinha.
        const fila = perguntas.map((_, i) => ({
          id: String(i),
          nome: String(i),
          estado: estadosRef.current[i] ?? 'na_fila',
        }));
        const proximo = proximoAEnviar(fila.filter((f) => escolhidas.has(Number(f.id))));
        if (!proximo) break;
        const i = Number(proximo.id);
        const q = perguntas[i]!;
        marcar(i, 'a_enviar');
        try {
          const form = new FormData();
          form.set('texto', q.texto);
          const r = await sendMessage(q.propostaId, 'cliente', caminho, { errors: {} }, form);
          if (r.ok) marcar(i, 'enviado');
          else marcar(i, 'falhou', Object.values(r.errors)[0] ?? r.message ?? 'Não foi possível enviar.');
        } catch {
          marcar(i, 'falhou', 'Não foi possível enviar. Verifique a ligação e tente de novo.');
        }
      }
    } finally {
      aEnviar.current = false;
    }
    router.refresh();
  }, [caminho, escolhidas, marcar, perguntas, router]);

  const enviadas = perguntas.filter((_, i) => estados[i] === 'enviado').length;
  const falhadas = perguntas.filter((_, i) => escolhidas.has(i) && estados[i] === 'falhou').length;
  const novas = perguntas.filter((_, i) => escolhidas.has(i) && (estados[i] ?? 'na_fila') === 'na_fila').length;
  const porEnviar = novas + falhadas;
  const aMeio = perguntas.some((_, i) => estados[i] === 'a_enviar');

  /**
   * Carregar outra vez devolve as falhadas à fila.
   *
   * Uma que falha não volta sozinha — é a regra dos envios (`proximoAEnviar`), e é a certa: repetir
   * sozinho um envio que falhou é a maneira de mandar a mesma pergunta quatro vezes a quem já a
   * recebeu. Quem decide repetir é quem está a ver. Sem isto, o botão ficava a dizer «Nada por
   * enviar» com uma pergunta por enviar à vista — foi o que o banco de ensaio mostrou.
   */
  const enviar = () => {
    for (const [i] of perguntas.entries()) {
      if (escolhidas.has(i) && estadosRef.current[i] === 'falhou') marcar(i, 'na_fila');
    }
    void bombear();
  };

  return (
    <div>
      <ul className="mt-1 space-y-3 text-[17px] text-slate-700">
        {perguntas.map((q, i) => {
          const estado = estados[i];
          const enviada = estado === 'enviado';
          return (
            <li key={`${q.propostaId}-${q.texto}`} className="border-b border-slate-100 pb-3 last:border-0">
              <label className="flex min-h-[44px] items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1.5"
                  checked={escolhidas.has(i)}
                  disabled={enviada || aMeio}
                  onChange={(ev) =>
                    setEscolhidas((s) => {
                      const novo = new Set(s);
                      if (ev.target.checked) novo.add(i);
                      else novo.delete(i);
                      return novo;
                    })
                  }
                />
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium text-slate-500">
                    A perguntar a {q.alias}
                    {enviada && <span className="text-tinta-700"> · enviada</span>}
                    {estado === 'a_enviar' && <span> · a enviar…</span>}
                  </span>
                  {q.texto}
                  {estado === 'falhou' && <span className="mt-1 block text-[15px] text-amber-800">{erros[i]}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="button" onClick={enviar} disabled={aMeio || porEnviar === 0} className="btn-secondary">
          {aMeio
            ? 'A enviar…'
            : porEnviar === 0
              ? 'Nada por enviar'
              : novas === 0
                ? falhadas === 1
                  ? 'Tentar de novo'
                  : `Tentar de novo as ${falhadas}`
                : porEnviar === 1
                  ? 'Enviar a pergunta'
                  : `Enviar as ${porEnviar} perguntas`}
        </button>
        <p className="text-[15px] text-slate-600" aria-live="polite">
          {enviadas > 0 && `${enviadas} ${enviadas === 1 ? 'enviada' : 'enviadas'}. `}
          {falhadas > 0 && `${falhadas} por enviar outra vez. `}
          {enviadas === 0 && falhadas === 0 && 'Vão nas mensagens de cada proposta, sem o identificar.'}
        </p>
      </div>
    </div>
  );
}
