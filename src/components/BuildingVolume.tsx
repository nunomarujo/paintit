import { buildingVolume, type FaceKind, type VolumeInput } from '@/domain/volume';

const FILL: Record<FaceKind, string> = {
  frente: 'fill-tinta-100 stroke-tinta-700',
  lado: 'fill-tinta-200 stroke-tinta-700',
  // Empena encostada a um vizinho: cinzenta, para se ler que existe mas não é fachada à vista.
  empena: 'fill-slate-300 stroke-slate-500',
  topo: 'fill-tinta-50 stroke-tinta-700',
  varanda: 'fill-slate-300 stroke-slate-600',
  vizinho: 'fill-slate-100 stroke-slate-300',
  // Pormenores caracterizados: cinzentos, para lerem como pormenor e não competirem com o volume.
  janela: 'fill-slate-500 stroke-slate-700',
  grade: 'fill-slate-400 stroke-slate-700',
  muro: 'fill-slate-200 stroke-slate-500',
  beiral: 'fill-slate-200 stroke-slate-600',
  pala: 'fill-slate-200 stroke-slate-600',
};

/**
 * Volume genérico do prédio, desenhado a partir dos dados declarados. Nunca de fotografias.
 *
 * As faces do prédio da obra são opacas de propósito: com a rotação, qualquer transparência deixaria
 * ver o que está escondido atrás do volume. Os prédios encostados são a exceção — desenham-se a
 * cinzento e desvanecem-se a partir da empena para fora, para se perceber que o alçado está encostado
 * sem esconder a empena, que é o que o pintor precisa de ver (pedido do promotor, 24/10/2026).
 */
export function BuildingVolume(props: VolumeInput & { className?: string }) {
  const v = buildingVolume(props);
  const base = `vz-${v.pisosDesenhados}-${v.fachadasLivres}-${props.forma ?? 'I'}-${Math.round(v.angulo)}`;
  return (
    <svg
      viewBox={v.viewBox.join(' ')}
      role="img"
      aria-label={`Volume genérico: ${v.pisosDesenhados} pisos, ${v.fachadasLivres} fachadas livres${
        v.fachadasLivres < 4 ? ', com prédios encostados' : ''
      }`}
      className={props.className ?? 'h-48 w-full'}
    >
      <defs>
        {v.faces.map((f, i) =>
          f.fade ? (
            <linearGradient
              key={i}
              id={`${base}-${i}`}
              gradientUnits="userSpaceOnUse"
              x1={f.fade.de[0]}
              y1={f.fade.de[1]}
              x2={f.fade.ate[0]}
              y2={f.fade.ate[1]}
            >
              <stop offset="0" stopColor="#94a3b8" stopOpacity="0.75" />
              <stop offset="0.55" stopColor="#cbd5e1" stopOpacity="0.3" />
              <stop offset="1" stopColor="#cbd5e1" stopOpacity="0" />
            </linearGradient>
          ) : null,
        )}
      </defs>
      {v.faces.map((f, i) =>
        f.fade ? (
          <polygon key={i} points={f.points.map((p) => p.join(',')).join(' ')} fill={`url(#${base}-${i})`} stroke="none" />
        ) : (
          <polygon
            key={i}
            points={f.points.map((p) => p.join(',')).join(' ')}
            className={FILL[f.kind]}
            strokeWidth={0.15}
            strokeLinejoin="round"
          />
        ),
      )}
    </svg>
  );
}
