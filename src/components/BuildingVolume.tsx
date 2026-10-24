import { buildingVolume, type FaceKind, type VolumeInput } from '@/domain/volume';

const FILL: Record<FaceKind, string> = {
  frente: 'fill-tinta-100 stroke-tinta-700',
  lado: 'fill-tinta-500/40 stroke-tinta-700',
  topo: 'fill-tinta-50 stroke-tinta-700',
  varanda: 'fill-slate-300 stroke-slate-600',
  vizinho: 'fill-slate-100 stroke-slate-300',
  // Pormenores caracterizados: cinzentos, para lerem como pormenor e não competirem com o volume.
  janela: 'fill-slate-500/70 stroke-slate-700',
  grade: 'fill-slate-400/50 stroke-slate-700',
  muro: 'fill-slate-200 stroke-slate-500',
  beiral: 'fill-slate-200 stroke-slate-600',
  pala: 'fill-slate-200 stroke-slate-600',
};

/** Volume genérico do prédio, desenhado a partir dos dados declarados. Nunca de fotografias. */
export function BuildingVolume(props: VolumeInput & { className?: string }) {
  const v = buildingVolume(props);
  return (
    <svg
      viewBox={v.viewBox.join(' ')}
      role="img"
      aria-label={`Volume genérico: ${v.pisosDesenhados} pisos, ${v.fachadasLivres} fachadas livres`}
      className={props.className ?? 'h-48 w-full'}
    >
      {v.faces.map((f, i) => (
        <polygon
          key={i}
          points={f.points.map((p) => p.join(',')).join(' ')}
          className={FILL[f.kind]}
          strokeWidth={0.15}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
