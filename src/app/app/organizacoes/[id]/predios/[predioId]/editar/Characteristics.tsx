'use client';

import { saveBuildingCharacteristic } from '@/app/app/actions';
import { AutoSaveField } from '@/components/AutoSaveField';

export interface BuildingCharacteristics {
  pisos: number | null;
  fracoes: number | null;
  fachadas: number | null;
  ano_construcao: number | null;
  tem_varandas: boolean;
  tem_elevador: boolean;
  acessos: string | null;
  artigo_matricial: string | null;
}

const str = (n: number | null) => (n === null ? '' : String(n));

/**
 * Características do prédio, gravadas à medida que se escrevem — sem botão (pedido do promotor,
 * 24/10/2026). Ficam fora do formulário da morada de propósito: a morada tem validação dura (confirmada
 * contra o código postal real) e não se pode gravar a meio; estes campos, sim.
 */
export function Characteristics({ orgId, buildingId, initial }: { orgId: string; buildingId: string; initial: BuildingCharacteristics }) {
  const campo = (nome: string) => saveBuildingCharacteristic.bind(null, orgId, buildingId, nome);
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold">Características</h2>
        <p className="mt-1 text-sm text-slate-600">
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
      <div className="flex flex-wrap gap-6">
        <AutoSaveField label="Tem varandas" tipo="checkbox" valorInicial={initial.tem_varandas ? 'sim' : 'nao'} guardar={campo('tem_varandas')} />
        <AutoSaveField label="Tem elevador" tipo="checkbox" valorInicial={initial.tem_elevador ? 'sim' : 'nao'} guardar={campo('tem_elevador')} />
      </div>
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
