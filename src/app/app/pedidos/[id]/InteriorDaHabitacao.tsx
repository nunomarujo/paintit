'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { FormState } from '@/app/app/actions';
import { EscolherCor, type CorDeFabricante } from '@/components/EscolherCor';
import { EstadoDeGravacao } from '@/components/EstadoDeGravacao';
import { ListaDeMateriais, type MaterialDeReferencia } from '@/components/ListaDeMateriais';
import { useFormAction } from '@/components/useFormAction';
import { AVISO_DA_COR, type CorDaPaleta } from '@/domain/corDaPintura';
import { CERTEZA_LABELS, PE_DIREITO_CORRENTE } from '@/domain/geometria';
import {
  MODOS_INTERIOR,
  MODO_INTERIOR_LABELS,
  TIPOS_DE_DIVISAO,
  TIPO_DE_DIVISAO_LABELS,
  VAO_MINIMO_INTERIOR_M2,
  areasDaDivisao,
  vaoDesconta,
  divisaoDaPlanta,
  escalaDaPlanta,
  lerMetros,
  nomeDaDivisao,
  proximoNumero,
  totalDoInterior,
  type DivisaoEnviada,
  type ModoInterior,
  type PontoPx,
  type TipoDeDivisao,
} from '@/domain/interior';
import { guardarInterior } from '../interior-actions';

export interface InteriorInicial {
  modo: ModoInterior | null;
  peDireitoM: number | null;
  aceiteComoCorrente: boolean;
  divisoes: DivisaoEnviada[];
}

const m2 = (n: number) => `${n.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} m²`;
const txt = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));
const num = (s: string) => {
  const v = lerMetros(s);
  return v === null || Number.isNaN(v) ? null : v;
};

function novaDivisao(tipo: TipoDeDivisao, numero: number): DivisaoEnviada {
  return {
    tipo,
    numero,
    comprimentoM: null,
    larguraM: null,
    perimetroM: null,
    peDireitoM: null,
    vaos: [],
    pintarParedes: true,
    pintarTeto: false,
    areaParedesManualM2: null,
    areaTetoManualM2: null,
    corReferencia: null,
    corHex: null,
    margem: null,
  };
}

/** Um campo de metros: aceita vírgula; vazio é «por medir». */
function Metros({ rotulo, valor, onChange, max = 100 }: { rotulo: string; valor: number | null; onChange: (v: number | null) => void; max?: number }) {
  const [texto, setTexto] = useState(txt(valor));
  useEffect(() => setTexto(txt(valor)), [valor]);
  const invalido = texto.trim() !== '' && (num(texto) === null || (num(texto) ?? 0) > max);
  return (
    <label className="block text-[15px] font-medium text-slate-700">
      {rotulo}
      <input
        inputMode="decimal"
        className="campo mt-1"
        value={texto}
        aria-invalid={invalido || undefined}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => onChange(invalido ? null : num(texto))}
      />
      {invalido && <span className="mt-1 block text-[13px] text-red-700">Número em metros, até {max}.</span>}
    </label>
  );
}

/**
 * Interior da habitação (06/11/2026). Três modos: as divisões com as medidas, a planta da casa como fundo
 * com a escala dada por uma medida conhecida, ou as áreas escritas. A planta **fica neste aparelho**: lê-se
 * com `URL.createObjectURL` e não é enviada a lado nenhum; só os números se gravam. As contas são as do
 * domínio (`interior.ts`), e o servidor refá-las ao gravar.
 */
export function InteriorDaHabitacao({
  requestId,
  inicial,
  paleta,
  coresDeFabricante,
  materiais,
  podeEditar,
  oferecer = [...TIPOS_DE_DIVISAO],
}: {
  requestId: string;
  inicial: InteriorInicial;
  paleta: CorDaPaleta[];
  coresDeFabricante: CorDeFabricante[];
  materiais: MaterialDeReferencia[];
  podeEditar: boolean;
  /** As divisões que se podem acrescentar: as da habitação, as das zonas comuns, ou ambas (`divisoesAOferecer`). */
  oferecer?: TipoDeDivisao[];
}) {
  const [modo, setModo] = useState<ModoInterior>(inicial.modo ?? 'desenho');
  const [pe, setPe] = useState<number | null>(inicial.peDireitoM);
  const [corrente, setCorrente] = useState(inicial.aceiteComoCorrente);
  const [divisoes, setDivisoes] = useState<DivisaoEnviada[]>(inicial.divisoes);
  const [tipoNovo, setTipoNovo] = useState<TipoDeDivisao>(oferecer[0] ?? 'sala');
  const chave = (d: Pick<DivisaoEnviada, 'tipo' | 'numero'>) => `${d.tipo}.${d.numero}`;
  // Divisões irregulares: indicam o perímetro em vez de comprimento × largura.
  const [irregulares, setIrregulares] = useState(() => new Set(inicial.divisoes.filter((d) => d.perimetroM !== null && d.comprimentoM === null).map(chave)));
  const { state, pending, repetir, formProps } = useFormAction<FormState>(guardarInterior.bind(null, requestId), { errors: {} });

  const geral = { metros: pe, aceiteComoCorrente: corrente };
  const total = totalDoInterior(divisoes, geral, modo);
  const contagem = useMemo(() => {
    const c = new Map<string, number>();
    for (const d of divisoes) c.set(d.tipo, (c.get(d.tipo) ?? 0) + 1);
    return c;
  }, [divisoes]);
  const nome = (d: DivisaoEnviada) => nomeDaDivisao(d, (contagem.get(d.tipo) ?? 0) > 1);
  const mudar = (i: number, p: Partial<DivisaoEnviada>) => setDivisoes((ds) => ds.map((d, j) => (j === i ? { ...d, ...p } : d)));

  // Planta à escala, só neste aparelho.
  const [planta, setPlanta] = useState<string | null>(null);
  const [fase, setFase] = useState<'escala' | 'divisao' | null>(null);
  const [toques, setToques] = useState<PontoPx[]>([]);
  const [referenciaPx, setReferenciaPx] = useState<number | null>(null);
  const [escala, setEscala] = useState<number | null>(null);
  const [metrosRef, setMetrosRef] = useState('');
  const [aDesenhar, setADesenhar] = useState<number | null>(null);
  const [retangulos, setRetangulos] = useState<Record<string, { a: PontoPx; b: PontoPx }>>({});
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => () => void (planta && URL.revokeObjectURL(planta)), [planta]);

  const tocar = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!fase || !imgRef.current) return;
    const caixa = imgRef.current.getBoundingClientRect();
    const p = { x: e.clientX - caixa.left, y: e.clientY - caixa.top };
    const t = [...toques, p];
    if (t.length < 2) return setToques(t);
    setToques([]);
    if (fase === 'escala') {
      setReferenciaPx(Math.hypot(t[1]!.x - t[0]!.x, t[1]!.y - t[0]!.y));
      setToques(t);
      setFase(null);
      return;
    }
    if (fase === 'divisao' && aDesenhar !== null && escala && referenciaPx) {
      const r = divisaoDaPlanta(t[0]!, t[1]!, escala, referenciaPx);
      if (r) {
        mudar(aDesenhar, { comprimentoM: r.comprimentoM, larguraM: r.larguraM, perimetroM: null, margem: r.margem });
        setRetangulos((rs) => ({ ...rs, [chave(divisoes[aDesenhar]!)]: { a: t[0]!, b: t[1]! } }));
        setIrregulares((s) => {
          const n = new Set(s);
          n.delete(chave(divisoes[aDesenhar]!));
          return n;
        });
      }
      setFase(null);
      setADesenhar(null);
    }
  };
  const confirmarEscala = () => {
    if (toques.length !== 2) return;
    const s = escalaDaPlanta(toques[0]!, toques[1]!, num(metrosRef) ?? 0);
    if (s) {
      setEscala(s);
      setToques([]);
    }
  };

  return (
    <div className="space-y-5">
      <fieldset disabled={!podeEditar}>
        <legend className="text-[15px] font-semibold text-slate-700">Como medir</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {MODOS_INTERIOR.map((m) => (
            <label key={m} className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-3 text-[15px] has-[:checked]:border-tinta-600 has-[:checked]:bg-tinta-50">
              <input type="radio" name="modoInterior" checked={modo === m} onChange={() => setModo(m)} />
              {MODO_INTERIOR_LABELS[m]}
            </label>
          ))}
        </div>
      </fieldset>

      {modo !== 'manual' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Metros rotulo="Pé-direito da casa (m)" valor={pe} max={10} onChange={(v) => { setPe(v); setCorrente(false); }} />
          <div className="flex items-end">
            {pe === null ? (
              <button type="button" className="btn-quiet btn-sm" disabled={!podeEditar} onClick={() => { setPe(PE_DIREITO_CORRENTE); setCorrente(true); }}>
                Não sei: usar {String(PE_DIREITO_CORRENTE).replace('.', ',')} m como estimativa
              </button>
            ) : (
              corrente && <p className="text-[15px] text-amber-800">Pé-direito estimado ({String(PE_DIREITO_CORRENTE).replace('.', ',')} m): as áreas ficam estimadas.</p>
            )}
          </div>
        </div>
      )}

      {modo === 'planta' && (
        <section className="space-y-3 rounded-lg border border-slate-200 p-4">
          <h3 className="text-[15px] font-semibold text-slate-700">Planta da casa</h3>
          <p className="max-w-[54ch] text-[15px] text-slate-600">
            A imagem fica neste aparelho e não é enviada: só as medidas se guardam. Um PDF exporta-se primeiro como imagem (por exemplo, uma captura
            de ecrã da página).
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block min-h-[44px] text-[17px]"
            disabled={!podeEditar}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setPlanta(URL.createObjectURL(f));
              setEscala(null);
              setReferenciaPx(null);
              setRetangulos({});
            }}
          />
          {planta && (
            <>
              <div className="flex flex-wrap items-end gap-2">
                <button type="button" className="btn-secondary btn-sm" onClick={() => { setFase('escala'); setToques([]); setEscala(null); }}>
                  {escala ? 'Refazer a escala' : '1. Tocar nas duas pontas de uma medida conhecida'}
                </button>
                {referenciaPx && !escala && (
                  <>
                    <label className="text-[15px] font-medium text-slate-700">
                      Essa medida tem (m)
                      <input inputMode="decimal" className="campo mt-1 w-32" value={metrosRef} onChange={(e) => setMetrosRef(e.target.value)} />
                    </label>
                    <button type="button" className="btn-primary btn-sm" onClick={confirmarEscala}>
                      Confirmar a escala
                    </button>
                  </>
                )}
                {escala && <span className="text-[15px] text-slate-700">Escala dada. 2. Escolher uma divisão abaixo e tocar em dois cantos opostos.</span>}
              </div>
              {fase && <p className="text-[15px] font-semibold text-amber-800">{fase === 'escala' ? 'Toque nas duas pontas da medida.' : 'Toque em dois cantos opostos da divisão.'} ({toques.length}/2)</p>}
              <div className="relative touch-none overflow-hidden rounded-lg border border-slate-200" onPointerDown={tocar}>
                {/* eslint-disable-next-line @next/next/no-img-element -- imagem local do aparelho (blob:), nunca enviada */}
                <img ref={imgRef} src={planta} alt="Planta da casa (só neste aparelho)" className="block w-full select-none" draggable={false} />
                <svg className="pointer-events-none absolute inset-0 h-full w-full">
                  {Object.entries(retangulos).map(([k, r]) => (
                    <rect key={k} x={Math.min(r.a.x, r.b.x)} y={Math.min(r.a.y, r.b.y)} width={Math.abs(r.b.x - r.a.x)} height={Math.abs(r.b.y - r.a.y)} fill="rgba(45,91,255,0.12)" stroke="#2d5bff" strokeWidth={2} />
                  ))}
                  {toques.map((t, i) => (
                    <circle key={i} cx={t.x} cy={t.y} r={6} fill="#c2410c" />
                  ))}
                </svg>
              </div>
            </>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-[15px] font-semibold text-slate-700">Divisões</h3>
        {divisoes.length === 0 && <p className="rounded-lg border border-slate-200 px-4 py-3 text-[17px] text-slate-600">Ainda não há divisões. Acrescentar as que a obra tem.</p>}
        {modo === 'manual' && divisoes.length > 0 && <p className="text-[15px] text-slate-600">Para indicar só o total das paredes, uma divisão chega.</p>}
        {modo === 'manual' && divisoes.some((d) => d.tipo === 'escadas') && (
          <p className="text-[15px] text-slate-600">As escadas não têm regra de medição: a área escrita fica como estimativa.</p>
        )}
        <ul className="space-y-3">
          {divisoes.map((d, i) => {
            const a = areasDaDivisao(d, geral, modo);
            return (
              <li key={chave(d)} className="rounded-2xl border border-slate-200 bg-white p-4">
                <fieldset disabled={!podeEditar} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <legend className="text-[17px] font-semibold">{nome(d)}</legend>
                    <span className="text-[15px] [font-variant-numeric:tabular-nums]">
                      {a.paredesM2 !== null ? `Paredes ${m2(a.paredesM2)}` : d.pintarParedes ? 'Paredes por medir' : 'Paredes não se pintam'}
                      {d.pintarTeto && ` · Teto ${a.tetoM2 !== null ? m2(a.tetoM2) : 'por medir'}`}
                      {(a.paredesM2 !== null || a.tetoM2 !== null) && ` · ${CERTEZA_LABELS[a.certeza]}`}
                      {d.margem !== null && modo === 'planta' && ` ± ${Math.round(d.margem * 100)} %`}
                    </span>
                  </div>
                  {a.falta.length > 0 && <p className="text-[15px] text-amber-800">Falta: {a.falta.join(', ')}.</p>}
                  <div className="flex flex-wrap gap-x-5">
                    <label className="flex min-h-[44px] items-center gap-2 text-[15px]">
                      <input type="checkbox" checked={d.pintarParedes} onChange={(e) => mudar(i, { pintarParedes: e.target.checked })} />
                      Pintar as paredes
                    </label>
                    <label className="flex min-h-[44px] items-center gap-2 text-[15px]">
                      <input type="checkbox" checked={d.pintarTeto} onChange={(e) => mudar(i, { pintarTeto: e.target.checked })} />
                      Pintar o teto
                    </label>
                  </div>
                  {modo === 'manual' ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Metros rotulo="Área das paredes (m²)" valor={d.areaParedesManualM2} max={5000} onChange={(v) => mudar(i, { areaParedesManualM2: v })} />
                      {d.pintarTeto && <Metros rotulo="Área do teto (m²)" valor={d.areaTetoManualM2} max={5000} onChange={(v) => mudar(i, { areaTetoManualM2: v })} />}
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {!irregulares.has(chave(d)) ? (
                          <>
                            <Metros rotulo="Comprimento (m)" valor={d.comprimentoM} onChange={(v) => mudar(i, { comprimentoM: v, margem: null })} />
                            <Metros rotulo="Largura (m)" valor={d.larguraM} onChange={(v) => mudar(i, { larguraM: v, margem: null })} />
                          </>
                        ) : (
                          <Metros rotulo="Perímetro (m)" valor={d.perimetroM} max={400} onChange={(v) => mudar(i, { perimetroM: v })} />
                        )}
                        <Metros rotulo="Pé-direito desta divisão (opcional)" valor={d.peDireitoM} max={10} onChange={(v) => mudar(i, { peDireitoM: v })} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-quiet btn-sm"
                          onClick={() => {
                            const k = chave(d);
                            const passaAIrregular = !irregulares.has(k);
                            setIrregulares((s) => {
                              const n = new Set(s);
                              if (passaAIrregular) n.add(k);
                              else n.delete(k);
                              return n;
                            });
                            mudar(i, passaAIrregular ? { comprimentoM: null, larguraM: null, margem: null } : { perimetroM: null });
                          }}
                        >
                          {!irregulares.has(chave(d)) ? 'Divisão irregular: indicar o perímetro' : 'Indicar comprimento e largura'}
                        </button>
                        {modo === 'planta' && escala && (
                          <button type="button" className="btn-secondary btn-sm" onClick={() => { setADesenhar(i); setFase('divisao'); setToques([]); }}>
                            Desenhar na planta
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[15px] font-medium text-slate-700">
                          Portas e janelas{' '}
                          <span className="font-normal text-slate-600">
                            (só se descontam as indicadas; sozinhas, as maiores do que {String(VAO_MINIMO_INTERIOR_M2).replace('.', ',')} m²)
                          </span>
                        </p>
                        {a.vaosDescontadosM2 > 0 && (
                          <p className="text-[15px] text-slate-700 [font-variant-numeric:tabular-nums]">Descontado das paredes: {m2(a.vaosDescontadosM2)}.</p>
                        )}
                        {d.vaos.map((v, k) => (
                          <div key={k} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
                            <Metros rotulo="Largura" valor={v.larguraM} max={20} onChange={(x) => mudar(i, { vaos: d.vaos.map((w, j) => (j === k ? { ...w, larguraM: x ?? 0 } : w)) })} />
                            <Metros rotulo="Altura" valor={v.alturaM} max={10} onChange={(x) => mudar(i, { vaos: d.vaos.map((w, j) => (j === k ? { ...w, alturaM: x ?? 0 } : w)) })} />
                            <label className="block text-[15px] font-medium text-slate-700">
                              Quantos
                              <input
                                type="number"
                                min={1}
                                max={50}
                                className="campo mt-1"
                                value={v.quantidade}
                                onChange={(e) => mudar(i, { vaos: d.vaos.map((w, j) => (j === k ? { ...w, quantidade: Math.max(1, Math.min(50, Number(e.target.value) || 1)) } : w)) })}
                              />
                            </label>
                            <button type="button" className="btn-quiet btn-sm" onClick={() => mudar(i, { vaos: d.vaos.filter((_, j) => j !== k) })}>
                              Tirar
                            </button>
                            <label className="col-span-4 flex flex-wrap items-center gap-2 text-[15px] text-slate-700">
                              Descontar este vão:
                              <select
                                className="campo w-auto"
                                value={v.descontar ?? 'auto'}
                                onChange={(e) => mudar(i, { vaos: d.vaos.map((w, j) => (j === k ? { ...w, descontar: e.target.value as 'auto' | 'sim' | 'nao' } : w)) })}
                              >
                                <option value="auto">Automático (maior do que {String(VAO_MINIMO_INTERIOR_M2).replace('.', ',')} m²)</option>
                                <option value="sim">Sim</option>
                                <option value="nao">Não</option>
                              </select>
                              <span className="text-slate-600">{vaoDesconta(v) ? 'descontado' : 'não descontado'}</span>
                            </label>
                          </div>
                        ))}
                        <button type="button" className="btn-quiet btn-sm" onClick={() => mudar(i, { vaos: [...d.vaos, { larguraM: 0.8, alturaM: 2, quantidade: 1 }] })}>
                          Acrescentar porta ou janela
                        </button>
                      </div>
                    </>
                  )}
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="block min-w-[14rem] flex-1 text-[15px] font-medium text-slate-700">
                      Cor
                      <span className="mt-1 flex items-center gap-2">
                        {d.corHex && <span className="h-8 w-8 shrink-0 rounded-full border border-slate-300" style={{ backgroundColor: d.corHex }} aria-hidden />}
                        <input
                          className="campo"
                          value={d.corReferencia ?? ''}
                          maxLength={120}
                          placeholder="Por exemplo: branco, ou RAL 9010"
                          onChange={(e) => mudar(i, { corReferencia: e.target.value || null, corHex: null })}
                        />
                      </span>
                    </label>
                    <EscolherCor paleta={paleta} fabricante={coresDeFabricante} onConfirmar={(r, h) => mudar(i, { corReferencia: r, corHex: h })} />
                  </div>
                  <button type="button" className="btn-quiet btn-sm" onClick={() => setDivisoes((ds) => ds.filter((_, j) => j !== i))}>
                    Tirar esta divisão
                  </button>
                </fieldset>
              </li>
            );
          })}
        </ul>
        {podeEditar && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[15px] font-medium text-slate-700">
              Divisão
              <select className="campo mt-1" value={tipoNovo} onChange={(e) => setTipoNovo(e.target.value as TipoDeDivisao)}>
                {oferecer.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_DE_DIVISAO_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setDivisoes((ds) => [...ds, novaDivisao(tipoNovo, proximoNumero(ds, tipoNovo))])}>
              Acrescentar divisão
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-paper p-4">
        <p className="text-[17px] [font-variant-numeric:tabular-nums]">
          <strong>Paredes: {m2(total.paredesM2)}</strong>
          {total.tetosM2 > 0 && <> · Tetos: {m2(total.tetosM2)}</>}
          {total.certeza === 'estimada' && ' · estimado'}
        </p>
        {total.porMedir > 0 && (
          <p className="text-[15px] text-amber-800">
            {total.porMedir} {total.porMedir === 1 ? 'divisão por medir' : 'divisões por medir'}: o total ainda não as conta.
          </p>
        )}
        <p className="mt-1 text-[15px] text-slate-600">Os tetos contam à parte, nunca nas paredes. {AVISO_DA_COR}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <form {...formProps}>
            <input type="hidden" name="interior" value={JSON.stringify({ modo, peDireitoM: pe, aceiteComoCorrente: corrente, divisoes })} />
            <button type="submit" className="btn-primary" disabled={pending || !podeEditar}>
              Guardar o interior
            </button>
          </form>
          <ListaDeMateriais materiais={materiais} areaM2={total.paredesM2 > 0 ? total.paredesM2 : null} />
        </div>
        <EstadoDeGravacao pending={pending} ok={state.ok} mensagem={state.message} repetir={repetir} />
      </section>
    </div>
  );
}
