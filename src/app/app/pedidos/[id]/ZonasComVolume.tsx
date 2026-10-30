'use client';

import { useState } from 'react';
import { GeometriaDoPredio } from './GeometriaDoPredio';
import { ZonasDoPedido, type ZonaNaLista } from './ZonasDoPedido';
import { avisoDoRealce, facesDaZona } from '@/domain/geometria';
import type { WorksMode } from '@/domain/request';
import type { Forma } from '@/domain/volume';

/**
 * As zonas ao lado do prédio, e o prédio a responder às zonas.
 *
 * Abrir uma zona acende no volume as partes que lhe correspondem. É o que faltava para o desenho
 * servir para alguma coisa na preparação: até aqui era uma ilustração ao lado de uma lista, e nada
 * ligava uma coisa à outra — quem lesse «Fachada tardoz, 74 m²» não tinha como confirmar, a olhar
 * para o desenho, que estava a falar da mesma parede.
 *
 * No computador ficam lado a lado, com o volume à direita e a seguir a si próprio enquanto se
 * percorre a lista. No telemóvel o volume vai para cima da lista: é a ordem em que se lê, e pô-lo
 * em baixo obrigava a saltar para trás e para a frente a cada zona.
 */
export function ZonasComVolume({
  requestId,
  zonas,
  modo,
  podeEditar,
  doCliente,
  predio,
}: {
  requestId: string;
  zonas: ZonaNaLista[];
  modo: WorksMode;
  podeEditar: boolean;
  doCliente: boolean;
  predio: {
    buildingId: string;
    pisos: number | null;
    fachadas: number | null;
    temVarandas: boolean;
    moradia: boolean;
    forma: Forma | null;
    janelas?: Partial<Record<'frente' | 'esquerda' | 'direita' | 'tras', number | null>>;
    medidas: { larguraM: number | null; profundidadeM: number | null; peDireitoM: number | null; origem: string };
    /** A migração das medidas pode ainda não estar aplicada; sem ela, não se oferece o que não grava. */
    podeMedir: boolean;
  };
}) {
  const [zona, setZona] = useState<ZonaNaLista | null>(null);

  /**
   * O que o prédio **tem**, deduzido do que foi declarado — e não do que vai ser pintado.
   *
   * É a parte da separação que não dá para fazer de outra maneira hoje: não há nenhum sítio onde
   * alguém diga «este prédio tem muro». A única pista é haver uma zona de muro, e isso é uma pista
   * boa. Repare-se no que **não** entra na conta: a participação. Uma zona deixada de fora do
   * trabalho continua a existir no prédio, e tirá-la do desenho era confundir «não vai ser pintado»
   * com «não está lá».
   */
  const temZona = (k: ZonaNaLista['kind']) => zonas.some((z) => z.kind === k);
  const elementos = {
    muro: temZona('muro'),
    metalicos: temZona('elementos_metalicos'),
    beirais: temZona('beirais_cobertura'),
  };
  const varandas = predio.temVarandas || temZona('varandas');

  return (
    <div className="lg:flex lg:items-start lg:gap-6">
      <div className="lg:order-2 lg:w-[22rem] lg:shrink-0">
        <GeometriaDoPredio
          buildingId={predio.buildingId}
          requestId={requestId}
          inicial={predio.medidas}
          podeEditar={podeEditar && predio.podeMedir}
          pisos={predio.pisos}
          fachadas={predio.fachadas}
          temVarandas={varandas}
          elementos={elementos}
          moradia={predio.moradia}
          forma={predio.forma}
          janelas={predio.janelas}
          realce={zona ? facesDaZona(zona.kind) : undefined}
          avisoDoRealce={zona ? avisoDoRealce(zona.kind) : null}
        />
      </div>
      <div className="mt-5 min-w-0 flex-1 lg:order-1 lg:mt-0">
        <ZonasDoPedido
          requestId={requestId}
          zonas={zonas}
          modo={modo}
          podeEditar={podeEditar}
          doCliente={doCliente}
          aoRealcar={setZona}
        />
      </div>
    </div>
  );
}
