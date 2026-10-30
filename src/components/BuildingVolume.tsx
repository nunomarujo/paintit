import { buildingVolume, type FaceKind, type Volume, type VolumeInput } from '@/domain/volume';

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
  // A entrada, no rés-do-chão da fachada principal: mais escura do que uma janela, para se perceber
  // de que lado se entra sem precisar de legenda.
  porta: 'fill-slate-700 stroke-slate-800',
  grade: 'fill-slate-400 stroke-slate-700',
  muro: 'fill-slate-200 stroke-slate-500',
  beiral: 'fill-slate-200 stroke-slate-600',
  pala: 'fill-slate-200 stroke-slate-600',
};

/**
 * Realce de uma zona: a mesma tinta do sistema, mais saturada, com o contorno mais grosso. Não é
 * âmbar nem vermelho — regra 13: cor de aviso não se usa para selecção, senão ensina-se a ignorar
 * o aviso.
 */
const REALCE = 'fill-tinta-500 stroke-tinta-800';

/**
 * Volume do prédio, desenhado a partir dos dados declarados. Nunca de fotografias.
 *
 * As faces do prédio da obra são opacas de propósito: com a rotação, qualquer transparência deixaria
 * ver o que está escondido atrás do volume. Os prédios encostados são a exceção — desenham-se a
 * cinzento e desvanecem-se a partir da empena para fora, para se perceber que o alçado está encostado
 * sem esconder a empena, que é o que o pintor precisa de ver (pedido do promotor, 24/10/2026).
 *
 * Com `escala` (as medidas reais) e `cotas`, deixa de ser uma ilustração genérica e passa a ser o
 * modelo do prédio — é assim que aparece ao cliente e no levantamento. No anúncio continua sem
 * medidas, que é o que a regra 6 do CLAUDE.md exige.
 */
export function BuildingVolume({
  realce,
  cotas,
  ...props
}: VolumeInput & {
  className?: string;
  /** Faces a acender, por tipo. Vem de `facesDaZona`, em `src/domain/geometria.ts`. */
  realce?: readonly FaceKind[];
  /** Cotas a desenhar. Só se devem passar as dos eixos que alguém mediu. */
  cotas?: { largura?: string; profundidade?: string; altura?: string };
}) {
  const v = buildingVolume(props);
  const aceso = (k: FaceKind) => (realce ?? []).includes(k);
  // As cotas desenham-se **fora** do volume, e o `viewBox` só conhece as faces: sem alargar, a
  // altura ficava cortada à direita e a frente cortada em baixo (visto no banco de ensaio, 30/10).
  const letra = letraDaCota(v);
  const caixa: [number, number, number, number] = cotas
    ? [v.viewBox[0], v.viewBox[1], v.viewBox[2] + letra * 7, v.viewBox[3] + letra * 3.5]
    : v.viewBox;
  const base = `vz-${v.pisosDesenhados}-${v.fachadasLivres}-${props.forma ?? 'I'}-${Math.round(v.angulo)}`;
  return (
    <svg
      viewBox={caixa.join(' ')}
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
            className={aceso(f.kind) ? REALCE : FILL[f.kind]}
            strokeWidth={0.15}
            strokeLinejoin="round"
          />
        ),
      )}
      {cotas && <Cotas v={v} textos={cotas} />}
    </svg>
  );
}

/**
 * As cotas, desenhadas sobre as arestas verdadeiras do volume — as que `buildingVolume` devolve já
 * rodadas e projetadas. Desenhar uma cota na caixa que envolve o desenho era mais fácil e seria uma
 * mentira: com o volume rodado, a caixa é maior do que o prédio.
 *
 * Só aparece a cota de quem tem medida. Um eixo por medir não leva linha nenhuma: uma seta sem
 * número parece um número que não coube.
 */
/** O corpo da letra das cotas, proporcional ao desenho: o mesmo tamanho aparente em qualquer prédio. */
const letraDaCota = (v: Volume) => Math.max(1, (Math.max(v.viewBox[2], v.viewBox[3]) / 100) * 5.5);

function Cotas({ v, textos }: { v: Volume; textos: { largura?: string; profundidade?: string; altura?: string } }) {
  const traco = Math.max(0.1, (Math.max(v.viewBox[2], v.viewBox[3]) / 100) * 0.9);
  const letra = letraDaCota(v);

  const linha = (
    chave: 'largura' | 'profundidade' | 'altura',
    [a, b]: [[number, number], [number, number]],
    texto: string | undefined,
  ) => {
    if (!texto) return null;
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    // Afasta a cota do volume, para fora: para baixo nas horizontais, para a direita na vertical.
    // Cada cota afasta-se para o seu lado: a altura para a direita, a frente para baixo, e o fundo
    // para baixo-direita, que é a direcção em que ele foge na axonometria. Sem isto, os três
    // rótulos cruzavam-se na mesma esquina do volume.
    const [fx, fy] =
      chave === 'altura'
        ? ([letra * 2.2, 0] as const)
        : chave === 'profundidade'
          ? ([letra * 1.6, letra * 1.9] as const)
          : ([0, letra * 1.2] as const);
    const d = (p: [number, number]) => `${p[0] + fx},${p[1] + fy}`;
    return (
      <g key={chave} className="stroke-slate-500 fill-slate-600">
        <polyline points={`${d(a)} ${d(b)}`} strokeWidth={traco} fill="none" />
        <polyline points={`${a[0]},${a[1]} ${d(a)}`} strokeWidth={traco * 0.6} fill="none" opacity={0.5} />
        <polyline points={`${b[0]},${b[1]} ${d(b)}`} strokeWidth={traco * 0.6} fill="none" opacity={0.5} />
        <text
          x={mx + fx + (chave === 'altura' ? letra * 0.4 : 0)}
          y={my + fy + (chave === 'altura' ? 0 : letra * 0.95)}
          fontSize={letra}
          textAnchor={chave === 'altura' ? 'start' : 'middle'}
          dominantBaseline={chave === 'altura' ? 'middle' : 'auto'}
          // Auréola branca por baixo da letra: a cota da frente passa por cima do muro, e um número
          // cinzento sobre a tinta do muro não se lê.
          className="fill-slate-700 stroke-white"
          strokeWidth={letra * 0.1}
          paintOrder="stroke"
        >
          {texto}
        </text>
      </g>
    );
  };

  return (
    <>
      {linha('largura', v.cotas.largura, textos.largura)}
      {linha('profundidade', v.cotas.profundidade, textos.profundidade)}
      {linha('altura', v.cotas.altura, textos.altura)}
    </>
  );
}
