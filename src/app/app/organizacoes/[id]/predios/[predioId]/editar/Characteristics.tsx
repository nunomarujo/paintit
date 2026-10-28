'use client';

import { saveBuildingCharacteristic } from '@/app/app/actions';
import { AutoSaveField } from '@/components/AutoSaveField';
import { FormaWizard } from '@/components/FormaWizard';
import { FACHADAS, FACHADA_LABELS, type Forma } from '@/domain/volume';

export interface BuildingCharacteristics {
  pisos: number | null;
  fracoes: number | null;
  fachadas: number | null;
  ano_construcao: number | null;
  tem_varandas: boolean;
  tem_elevador: boolean;
  acessos: string | null;
  forma_implantacao?: string | null;
  janelas_frente: number | null;
  janelas_esquerda: number | null;
  janelas_direita: number | null;
  janelas_tras: number | null;
  tipo?: string | null;
  artigo_matricial: string | null;
}

const str = (n: number | null) => (n === null ? '' : String(n));

/** O assistente devolve a forma escolhida; a acção de gravação espera um formulário, como os restantes campos. */
const formData = (valor: string) => {
  const f = new FormData();
  f.set('valor', valor);
  return f;
};

/**
 * Características do prédio, gravadas à medida que se escrevem — sem botão (pedido do promotor,
 * 24/10/2026). Ficam fora do formulário da morada de propósito: a morada tem validação dura (confirmada
 * contra o código postal real) e não se pode gravar a meio; estes campos, sim.
 */
export function Characteristics({
  orgId,
  buildingId,
  initial,
  areaAproximadaCm2,
  semAreaAproximada,
}: {
  orgId: string;
  buildingId: string;
  initial: BuildingCharacteristics;
  /** Centésimos de m², como o resto do projeto. Mostra-se em m². */
  areaAproximadaCm2?: number | null;
  /** A coluna da área ainda não existe na base real (migração 20261024034142 por aplicar). */
  semAreaAproximada?: boolean;
}) {
  const campo = (nome: string) => saveBuildingCharacteristic.bind(null, orgId, buildingId, nome);
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold">Características</h2>
        <p className="mt-1 text-[17px] text-slate-600">
          Quanto mais completo, menos perguntas o pintor tem de fazer depois. Grava-se sozinho: não há botão.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <AutoSaveField label="Pisos" inputMode="numeric" valorInicial={str(initial.pisos)} guardar={campo('pisos')} />
        <AutoSaveField
          label="Frações"
          inputMode="numeric"
          valorInicial={str(initial.fracoes)}
          guardar={campo('fracoes')}
          info="Nº de frações do condomínio."
        />
        <AutoSaveField label="Fachadas" inputMode="numeric" valorInicial={str(initial.fachadas)} guardar={campo('fachadas')} />
        <AutoSaveField label="Ano de construção" inputMode="numeric" valorInicial={str(initial.ano_construcao)} guardar={campo('ano_construcao')} />
      </div>
      <FormaWizard
        valorInicial={(initial.forma_implantacao as Forma | null) ?? null}
        fachadasLivres={initial.fachadas}
        moradia={initial.tipo === 'moradia'}
        pisos={initial.pisos}
        guardar={async (forma) => {
          await campo('forma_implantacao')({ errors: {} }, formData(forma));
        }}
      />
      {/*
        Janelas por piso, uma fachada de cada vez (pedido do promotor, 28/10/2026). O desenho do
        anúncio mostrava vãos só à frente e em número fixo; o pintor precisa do número real para
        descontar área e contar protecções, e quem descreve a obra sabe-o de cor por piso.
        Deixar em branco é diferente de escrever zero: em branco o desenho usa um número genérico,
        zero desenha a fachada cega.
      */}
      <div>
        <h3 className="font-semibold text-slate-900">Janelas por piso, em cada fachada</h3>
        <p className="mt-1 text-[17px] text-slate-600">
          Quantas janelas tem cada piso, de cada lado. Em branco se não souber; zero se a fachada não tiver nenhuma.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-4">
          {FACHADAS.map((f) => (
            <AutoSaveField
              key={f}
              label={FACHADA_LABELS[f]}
              inputMode="numeric"
              valorInicial={str(initial[`janelas_${f}` as const])}
              guardar={campo(`janelas_${f}`)}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-6">
        <AutoSaveField label="Tem varandas" tipo="checkbox" valorInicial={initial.tem_varandas ? 'sim' : 'nao'} guardar={campo('tem_varandas')} />
        <AutoSaveField label="Tem elevador" tipo="checkbox" valorInicial={initial.tem_elevador ? 'sim' : 'nao'} guardar={campo('tem_elevador')} />
      </div>
      {!semAreaAproximada && (
        <AutoSaveField
          label="Área aproximada a pintar (m²)"
          inputMode="numeric"
          valorInicial={areaAproximadaCm2 == null ? '' : String(areaAproximadaCm2 / 100).replace('.', ',')}
          guardar={campo('area_aproximada')}
          info="Um valor a olho chega. Serve para dar escala ao pintor antes do levantamento; as áreas certas são medidas depois, zona a zona."
        />
      )}
      <AutoSaveField
        label="Acessos e condicionantes"
        valorInicial={initial.acessos ?? ''}
        guardar={campo('acessos')}
        info="Por exemplo: rua estreita, prédios contíguos, telhado sem acesso."
      />
      <AutoSaveField
        label="Artigo matricial"
        valorInicial={initial.artigo_matricial ?? ''}
        guardar={campo('artigo_matricial')}
        info="Opcional; útil para o contrato."
      />
    </div>
  );
}
