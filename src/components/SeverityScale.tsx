'use client';

import { SEVERITY_BAND_LABELS, SEVERITY_MAX, severityBand, type Pathology, type Severity } from '@/domain/condition';

/**
 * A escala de 0 a 10 do promotor, com o desenho a acompanhar: ao mexer no nível, o desenho mostra o que
 * esse nível quer dizer. Um desenho **paramétrico**, não dez desenhos à mão — o nível alimenta a
 * densidade, a espessura e a extensão do defeito, por isso a escala é coerente de ponta a ponta e
 * mantém-se se amanhã se mudarem as bandas.
 *
 * Serve para duas pessoas que nunca se vão encontrar concordarem no que viram: o avaliador que esteve
 * na obra e o pintor que vai orçamentar sem lá ir.
 */
export function SeverityScale({
  pathology,
  valor,
  onChange,
  id,
}: {
  pathology: Pathology;
  valor: Severity;
  onChange: (n: Severity) => void;
  id: string;
}) {
  const band = severityBand(valor);
  const cor = band === 'grave' ? 'text-red-700' : band === 'moderado' ? 'text-amber-800' : band === 'ligeiro' ? 'text-slate-700' : 'text-slate-500';

  return (
    <div className="flex flex-wrap items-center gap-4">
      <PathologyDrawing pathology={pathology} nivel={valor} />
      <div className="min-w-[14rem] flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={id} className="text-sm font-medium text-slate-700">
            Gravidade
          </label>
          <span className={`text-sm font-semibold ${cor}`}>
            {valor} — {SEVERITY_BAND_LABELS[band]}
          </span>
        </div>
        <input
          id={id}
          type="range"
          min={0}
          max={SEVERITY_MAX}
          step={1}
          value={valor}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-2 w-full"
          aria-describedby={`${id}-escala`}
        />
        <p id={`${id}-escala`} className="mt-1 flex justify-between text-xs text-slate-500">
          <span>0 · nenhum</span>
          <span>1 · suave</span>
          <span>10 · tremendo</span>
        </p>
      </div>
    </div>
  );
}

/** Desenho do defeito, com a intensidade do nível. Esquema, não fotografia. */
function PathologyDrawing({ pathology, nivel }: { pathology: Pathology; nivel: number }) {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden className="shrink-0 rounded-lg border border-slate-200 bg-slate-50">
      <rect x="0" y="0" width="96" height="96" className="fill-slate-100" />
      {nivel === 0 ? (
        <text x="48" y="52" textAnchor="middle" className="fill-slate-400 text-[10px]">
          sem ocorrência
        </text>
      ) : (
        <Defeito pathology={pathology} nivel={nivel} />
      )}
    </svg>
  );
}

function Defeito({ pathology, nivel }: { pathology: Pathology; nivel: number }) {
  // 1 → quase nada; 10 → por todo o lado. Tudo o que se segue deriva daqui.
  const t = nivel / SEVERITY_MAX;
  const quantidade = Math.max(1, Math.round(t * 7));
  const espessura = 0.6 + t * 2.6;
  const opacidade = 0.25 + t * 0.6;

  if (pathology === 'fissuras' || pathology === 'reboco_degradado') {
    return (
      <g className="stroke-slate-800" fill="none" strokeLinecap="round">
        {Array.from({ length: quantidade }).map((_, i) => {
          const x = 12 + (i * 72) / Math.max(1, quantidade - 1 || 1);
          const desvio = 6 + t * 10;
          return (
            <path
              key={i}
              d={`M${x} 10 q${desvio} 20 ${-desvio / 2} 34 q${-desvio} 14 ${desvio / 2} 32`}
              strokeWidth={espessura}
              strokeOpacity={opacidade}
            />
          );
        })}
        {pathology === 'reboco_degradado' &&
          Array.from({ length: quantidade }).map((_, i) => (
            <circle key={`p${i}`} cx={18 + i * 9} cy={70 - (i % 3) * 12} r={2 + t * 4} className="fill-slate-400 stroke-none" fillOpacity={opacidade} />
          ))}
      </g>
    );
  }

  if (pathology === 'humidade' || pathology === 'fungos_algas' || pathology === 'eflorescencias') {
    const cor = pathology === 'fungos_algas' ? 'fill-emerald-800' : pathology === 'eflorescencias' ? 'fill-slate-50' : 'fill-slate-500';
    return (
      <g className={cor}>
        {Array.from({ length: quantidade }).map((_, i) => (
          <ellipse
            key={i}
            cx={20 + ((i * 23) % 60)}
            cy={24 + ((i * 29) % 52)}
            rx={8 + t * 16}
            ry={6 + t * 12}
            fillOpacity={opacidade * 0.8}
          />
        ))}
        {pathology === 'eflorescencias' && <rect x="0" y="0" width="96" height="96" className="fill-none stroke-slate-300" strokeWidth="1" />}
      </g>
    );
  }

  if (pathology === 'tinta_destacada') {
    return (
      <g>
        {Array.from({ length: quantidade }).map((_, i) => (
          <path
            key={i}
            d={`M${14 + ((i * 21) % 62)} ${20 + ((i * 27) % 54)} l${10 + t * 12} 2 l-3 ${8 + t * 8} l${-9 - t * 6} -3 z`}
            className="fill-slate-300 stroke-slate-600"
            strokeWidth="1"
            fillOpacity={opacidade}
          />
        ))}
      </g>
    );
  }

  // ferrugem
  return (
    <g>
      <rect x="20" y="14" width="8" height="68" className="fill-slate-400" />
      <rect x="68" y="14" width="8" height="68" className="fill-slate-400" />
      <rect x="20" y="44" width="56" height="7" className="fill-slate-400" />
      {Array.from({ length: quantidade }).map((_, i) => (
        <circle key={i} cx={24 + ((i * 17) % 50)} cy={20 + ((i * 23) % 58)} r={3 + t * 5} className="fill-amber-800" fillOpacity={opacidade} />
      ))}
    </g>
  );
}
