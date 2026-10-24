import { ISOLANTE_INFO, type Isolante } from '@/domain/etics';

/**
 * Figuras do capoto, desenhadas: um corte da parede com as camadas, e uma amostra por isolante.
 * São esquemas, não fotografias — mostram o que o material é e como o sistema se monta, que é o que
 * o cliente precisa de perceber, e não dependem de imagens de marca nenhuma.
 */

const TEXTURA: Record<Isolante, { fundo: string; traco: string; grao: 'esferas' | 'liso' | 'fibras' | 'granulos' }> = {
  eps: { fundo: '#f8fafc', traco: '#94a3b8', grao: 'esferas' },
  eps_grafitado: { fundo: '#64748b', traco: '#334155', grao: 'esferas' },
  xps: { fundo: '#cfe3f7', traco: '#5b8db8', grao: 'liso' },
  la_mineral: { fundo: '#e7e2d6', traco: '#a89a7c', grao: 'fibras' },
  icb: { fundo: '#c8a06a', traco: '#8a6436', grao: 'granulos' },
};

function Grao({ isolante, x, y, w, h }: { isolante: Isolante; x: number; y: number; w: number; h: number }) {
  const t = TEXTURA[isolante];
  const marcas: React.ReactNode[] = [];
  // Padrão fixo, calculado dos limites: o mesmo material dá sempre o mesmo desenho.
  if (t.grao === 'esferas') {
    for (let i = 0; i < 7; i++)
      for (let j = 0; j < 5; j++)
        marcas.push(<circle key={`${i}-${j}`} cx={x + ((i + 0.5) * w) / 7} cy={y + ((j + 0.5) * h) / 5} r={Math.min(w, h) / 16} fill="none" stroke={t.traco} strokeWidth={0.5} />);
  } else if (t.grao === 'fibras') {
    for (let j = 0; j < 9; j++)
      marcas.push(<path key={j} d={`M${x + 1} ${y + ((j + 0.5) * h) / 9} q ${w / 3} -3 ${w / 2} 0 t ${w / 2 - 2} 0`} fill="none" stroke={t.traco} strokeWidth={0.5} />);
  } else if (t.grao === 'granulos') {
    for (let i = 0; i < 9; i++)
      for (let j = 0; j < 6; j++)
        marcas.push(
          <rect key={`${i}-${j}`} x={x + ((i + 0.2) * w) / 9} y={y + ((j + 0.2) * h) / 6} width={w / 18} height={h / 12} rx={0.6} fill={t.traco} opacity={0.45} />,
        );
  }
  return <>{marcas}</>;
}

/** Amostra do isolante, para acompanhar a escolha na lista. */
export function IsolanteSwatch({ isolante, className }: { isolante: Isolante; className?: string }) {
  const t = TEXTURA[isolante];
  return (
    <svg viewBox="0 0 60 40" className={className ?? 'h-10 w-16'} role="img" aria-label={`Amostra de ${ISOLANTE_INFO[isolante].label}`}>
      <rect x={1} y={1} width={58} height={38} rx={2} fill={t.fundo} stroke={t.traco} strokeWidth={1} />
      <Grao isolante={isolante} x={3} y={3} w={54} h={34} />
    </svg>
  );
}

const CAMADA_COR = {
  parede: '#e2e8f0',
  cola: '#cbd5e1',
  base: '#d6d3d1',
  acabamento: '#bfdbfe',
};

/**
 * Corte da parede com as camadas do sistema, da esquerda (interior) para a direita (rua). A espessura
 * do isolante no desenho acompanha a escolhida, para se ver quanto a fachada avança.
 */
export function CapotoCorte({
  isolante,
  espessuraMm,
  manutencao = false,
  className,
}: {
  isolante: Isolante | null;
  espessuraMm: number | null;
  manutencao?: boolean;
  className?: string;
}) {
  const esp = Math.max(20, Math.min(160, espessuraMm ?? 60));
  // 60 mm desenham-se com 24 unidades; o resto é proporcional, para a diferença entre 40 e 120 se ver.
  const largIso = (esp / 60) * 24;
  const x0 = 6;
  const parede = 34;
  const cola = manutencao ? 0 : 4;
  const iso = manutencao ? 0 : largIso;
  const base = manutencao ? 0 : 5;
  const acab = 4;
  const total = x0 + parede + cola + iso + base + acab + 54;
  let x = x0;
  const faixa = (w: number, fill: string, label: string, pattern?: Isolante) => {
    const el = (
      <g key={label}>
        <rect x={x} y={14} width={w} height={62} fill={fill} stroke="#64748b" strokeWidth={0.6} />
        {pattern && <Grao isolante={pattern} x={x + 1} y={15} w={w - 2} h={60} />}
      </g>
    );
    x += w;
    return el;
  };
  const faixas = [
    faixa(parede, CAMADA_COR.parede, 'parede'),
    ...(manutencao ? [] : [faixa(cola, CAMADA_COR.cola, 'cola')]),
    ...(manutencao || !isolante ? [] : [faixa(iso, TEXTURA[isolante].fundo, 'isolante', isolante)]),
    ...(manutencao ? [] : [faixa(base, CAMADA_COR.base, 'base')]),
    faixa(acab, CAMADA_COR.acabamento, 'acabamento'),
  ];
  const xFim = x;

  return (
    <svg viewBox={`0 0 ${total} 96`} className={className ?? 'h-32 w-full'} role="img" aria-label="Corte da parede com as camadas do capoto">
      {faixas}
      {/* Cota da espessura do isolante */}
      {!manutencao && isolante && (
        <g stroke="#1d4ed8" strokeWidth={0.6} fill="#1d4ed8">
          <line x1={x0 + parede + cola} y1={8} x2={x0 + parede + cola + iso} y2={8} />
          <line x1={x0 + parede + cola} y1={5} x2={x0 + parede + cola} y2={11} />
          <line x1={x0 + parede + cola + iso} y1={5} x2={x0 + parede + cola + iso} y2={11} />
          <text x={x0 + parede + cola + iso / 2} y={4} fontSize={5} textAnchor="middle" stroke="none">
            {esp} mm
          </text>
        </g>
      )}
      {/* Legendas à direita, com uma linha fina a apontar à camada. */}
      <g fontSize={4.6} fill="#475569">
        <text x={x0 + parede / 2} y={86} textAnchor="middle">
          parede
        </text>
        {(manutencao
          ? ([[30, manutencao ? 'acabamento novo' : 'acabamento', xFim - acab / 2]] as [number, string, number][])
          : ([
              [26, 'acabamento', xFim - acab / 2],
              [40, 'base com rede', xFim - acab - base / 2],
              [54, 'isolante', xFim - acab - base - iso / 2],
              [68, 'colagem', x0 + parede + cola / 2],
            ] as [number, string, number][])
        ).map(([y, texto, xCamada]) => (
          <g key={texto}>
            <path d={`M${xCamada} ${y - 1.5} L${xFim + 2} ${y - 1.5}`} stroke="#94a3b8" strokeWidth={0.3} fill="none" />
            <text x={xFim + 3.5} y={y}>
              {texto}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
