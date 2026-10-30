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
 * Lado a lado só a partir de 1280px, e não de 1024 como estava. **Isto foi um defeito a sério**,
 * visto em produção a 30/10/2026: a 1024 a coluna do conteúdo tem 363px, porque a aplicação já
 * gasta largura na sua barra lateral e a página do pedido gasta mais 224 na navegação das secções.
 * Pedir 352 fixos para o volume não deixava nada para a lista, e as duas colunas apareciam
 * sobrepostas — o texto das zonas a passar por baixo do cartão do desenho.
 *
 * O banco de ensaio não o apanhou porque desenha os componentes sozinhos, sem a barra lateral nem
 * a navegação das secções: a 1280 sobrava-lhe largura que na aplicação verdadeira não sobra. Fica
 * dito, porque é a limitação do banco e não um descuido pontual.
 *
 * Abaixo de 1280 o volume fica por cima da lista — é a ordem em que se lê, e pô-lo em baixo
 * obrigava a saltar para trás e para a frente a cada zona.
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
    <div className="xl:flex xl:items-start xl:gap-6">
      <div className="xl:order-2 xl:w-[20rem] xl:shrink-0">
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
      <div className="mt-5 min-w-0 flex-1 xl:order-1 xl:mt-0">
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
