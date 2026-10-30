'use client';

import { seccaoDoBloqueio, SECCOES, type SeccaoId } from '@/domain/seccoes';
import type { Bloqueio } from '@/domain/request';
import { useIrParaSeccao } from './PedidoEmSeccoes';

/**
 * «Faltam 2 pontos para publicar», e cada ponto com a sua acção.
 *
 * ## O que estava mal
 *
 * A lista de bloqueios aparecia numa caixa âmbar ao lado de um botão desactivado, sem dizer onde é
 * que cada coisa se resolvia. Quem lesse «Indique pelo menos uma superfície com área» tinha de
 * procurar pela página até encontrar onde se acrescentam superfícies — e, se houvesse um
 * levantamento a caminho, nem sequer era com ele.
 *
 * ## O que há agora
 *
 * Cada ponto sabe a que secção pertence e leva lá. **Completar** quando a secção está por
 * preencher, **Rever** quando já tem alguma coisa e falta acertá-la — são palavras diferentes
 * porque são situações diferentes, e dizer «completar» a quem já escreveu soa a que o que escreveu
 * não conta.
 *
 * As medições ficam de fora desta lista enquanto houver visita a caminho: não são tarefa do
 * cliente, e dizem-se noutra frase.
 */
export function RevisaoEPublicacao({
  bloqueios,
  aguardaLevantamento,
  publicar,
}: {
  bloqueios: Bloqueio[];
  aguardaLevantamento: boolean;
  /** O que fica por baixo da lista: a pré-visualização e o botão. */
  publicar: React.ReactNode;
}) {
  const irPara = useIrParaSeccao();
  const doCliente = aguardaLevantamento ? bloqueios.filter((b) => b.de === 'cliente') : bloqueios;
  const doLevantamento = aguardaLevantamento ? bloqueios.filter((b) => b.de === 'levantamento') : [];
  const nome = (s: SeccaoId) => SECCOES.find((x) => x.id === s)!.nome;

  return (
    <div className="space-y-4">
      {doCliente.length === 0 ? (
        <p className="text-[17px]">
          <strong>Está tudo o que os pintores precisam de saber.</strong> Publique para começar a receber propostas —
          chegam todas no fim do prazo, para se compararem lado a lado.
        </p>
      ) : (
        <div>
          <p className="text-[17px] font-semibold">
            {doCliente.length === 1 ? 'Falta 1 ponto para publicar' : `Faltam ${doCliente.length} pontos para publicar`}
          </p>
          <ul className="mt-2 space-y-2">
            {doCliente.map((b) => {
              const s = seccaoDoBloqueio(b);
              return (
                <li
                  key={b.texto}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-slate-100 py-2"
                >
                  <span className="text-[17px]">{b.texto}</span>
                  <button type="button" onClick={() => irPara(s)} className="btn-quiet shrink-0">
                    Rever em {nome(s).toLocaleLowerCase('pt-PT')}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {doLevantamento.length > 0 && (
        <p className="text-[17px] text-slate-700">
          As medições serão preenchidas no levantamento. Não precisa de as indicar agora.
        </p>
      )}

      {publicar}
    </div>
  );
}
