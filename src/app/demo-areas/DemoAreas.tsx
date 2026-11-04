'use client';

import { useMemo, useState } from 'react';
import { VolumeViewer } from '@/components/VolumeViewer';
import { areasDoVolume } from '@/domain/volumeAreas';
import { FORMA_LABELS, FORMAS, type Forma, type VolumeInput } from '@/domain/volume';
import { MedirZona } from './MedirZona';

type Varandas = 'nenhuma' | 'aberta' | 'marquise';

const CORES: Record<string, string> = {
  fachadas: 'bg-tinta-500',
  empenas: 'bg-slate-400',
  varandas: 'bg-slate-500',
  marquises: 'bg-sky-400',
};

const numero = (v: string): number | null => {
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || !Number.isFinite(n) ? null : n;
};

/**
 * Ecrã de teste (pedido do promotor, 03/11/2026): dimensões reais declaradas (não tiradas de uma
 * fotografia) → volume 3D + área por categoria, para comparar visualmente contra fotografias reais.
 * Tudo em estado local, sem gravar nada — é só para experimentar.
 */
export function DemoAreas() {
  const [forma, setForma] = useState<Forma>('I');
  const [moradia, setMoradia] = useState(false);
  const [pisos, setPisos] = useState('4');
  const [fachadas, setFachadas] = useState('4');
  const [largura, setLargura] = useState('14');
  const [profundidade, setProfundidade] = useState('13');
  const [peDireito, setPeDireito] = useState('3');
  const [janelasPorPiso, setJanelasPorPiso] = useState('2');
  const [varandas, setVarandas] = useState<Varandas>('nenhuma');

  type Alvo = 'nenhum' | 'frente' | 'fundo' | 'peDireito';
  const [alvoLargura, setAlvoLargura] = useState<Alvo>('frente');
  const [alvoAltura, setAlvoAltura] = useState<Alvo>('peDireito');
  const aplicarAoAlvo = (alvo: Alvo, valor: number) => {
    const texto = valor.toLocaleString('pt-PT', { maximumFractionDigits: 2 }).replace('.', ',');
    if (alvo === 'frente') setLargura(texto);
    else if (alvo === 'fundo') setProfundidade(texto);
    else if (alvo === 'peDireito') setPeDireito(texto);
  };

  const input: VolumeInput = useMemo(() => {
    const j = numero(janelasPorPiso);
    return {
      forma,
      moradia,
      pisos: numero(pisos),
      fachadas: numero(fachadas),
      temVarandas: varandas === 'aberta',
      temMarquises: varandas === 'marquise',
      escala: {
        larguraM: numero(largura) ?? 14,
        profundidadeM: numero(profundidade),
        peDireitoM: numero(peDireito) ?? 3,
      },
      janelas: { frente: j, tras: j, esquerda: j, direita: j },
    };
  }, [forma, moradia, pisos, fachadas, largura, profundidade, peDireito, janelasPorPiso, varandas]);

  const areas = useMemo(() => areasDoVolume(input), [input]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[15px] font-medium text-slate-700">Forma em planta</span>
            <select className="campo" value={forma} onChange={(e) => setForma(e.target.value as Forma)}>
              {FORMAS.map((f) => (
                <option key={f} value={f}>
                  {FORMA_LABELS[f]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2">
            <input type="checkbox" checked={moradia} onChange={(e) => setMoradia(e.target.checked)} className="h-5 w-5" />
            <span className="text-[15px] text-slate-700">É uma moradia</span>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[15px] font-medium text-slate-700">Pisos acima do solo</span>
            <input className="campo" inputMode="numeric" value={pisos} onChange={(e) => setPisos(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[15px] font-medium text-slate-700">Fachadas livres (1-4)</span>
            <input className="campo" inputMode="numeric" value={fachadas} onChange={(e) => setFachadas(e.target.value)} />
          </label>
        </div>

        <div>
          <h3 className="text-[15px] font-semibold text-slate-900">Dimensões reais, em metros</h3>
          <p className="text-[13px] text-slate-500">Medidas com fita, lidas de uma planta, ou tiradas de uma fotografia (secção abaixo).</p>
          <div className="mt-2 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[15px] font-medium text-slate-700">Frente (m)</span>
              <input className="campo" inputMode="decimal" value={largura} onChange={(e) => setLargura(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[15px] font-medium text-slate-700">Fundo (m)</span>
              <input className="campo" inputMode="decimal" value={profundidade} onChange={(e) => setProfundidade(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[15px] font-medium text-slate-700">Pé-direito (m)</span>
              <input className="campo" inputMode="decimal" value={peDireito} onChange={(e) => setPeDireito(e.target.value)} />
            </label>
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-[15px] font-medium text-slate-700">Janelas por piso, em cada fachada</span>
          <input className="campo max-w-[120px]" inputMode="numeric" value={janelasPorPiso} onChange={(e) => setJanelasPorPiso(e.target.value)} />
        </label>

        <fieldset>
          <legend className="mb-1 text-[15px] font-medium text-slate-700">Varandas</legend>
          <div className="flex flex-wrap gap-4">
            {([
              ['nenhuma', 'Nenhuma'],
              ['aberta', 'Abertas (pintadas por dentro)'],
              ['marquise', 'Marquises (fechadas, não pintadas)'],
            ] as const).map(([v, label]) => (
              <label key={v} className="flex items-center gap-2 text-[15px] text-slate-700">
                <input type="radio" name="varandas" checked={varandas === v} onChange={() => setVarandas(v)} className="h-5 w-5" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <VolumeViewer {...input} className="h-72 w-full" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-[15px] font-semibold text-slate-900">Área por categoria</h3>
          <ul className="mt-3 space-y-2">
            {areas.categorias.map((c) => (
              <li key={c.categoria} className="flex items-center justify-between text-[17px]">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className={`inline-block h-3 w-3 rounded-full ${CORES[c.categoria]}`} />
                  {c.rotulo}
                  {!c.pintavel && <span className="text-[13px] text-slate-500">(não entra no total)</span>}
                </span>
                <span className="font-mono tabular-nums text-slate-900">{c.areaM2.toLocaleString('pt-PT')} m²</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-[17px] font-semibold">
            <span>Total a pintar</span>
            <span className="font-mono tabular-nums">{areas.totalPintavelM2.toLocaleString('pt-PT')} m²</span>
          </div>
          {areas.vaosDescontadosCount > 0 && (
            <p className="mt-2 text-[13px] text-slate-500">
              {areas.vaosDescontadosCount} vão(s) com mais de 1 m² descontados às fachadas ({areas.vaosDescontadosM2.toLocaleString('pt-PT')} m², de{' '}
              {areas.fachadasBrutoM2.toLocaleString('pt-PT')} m² brutos).
            </p>
          )}
        </div>
      </div>
      <div className="lg:col-span-2 space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1 block text-[15px] font-medium text-slate-700">A largura medida (A–B) vai para</span>
            <select className="campo" value={alvoLargura} onChange={(e) => setAlvoLargura(e.target.value as Alvo)}>
              <option value="nenhum">Não aplicar</option>
              <option value="frente">Frente</option>
              <option value="fundo">Fundo</option>
              <option value="peDireito">Pé-direito</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[15px] font-medium text-slate-700">A altura medida vai para</span>
            <select className="campo" value={alvoAltura} onChange={(e) => setAlvoAltura(e.target.value as Alvo)}>
              <option value="nenhum">Não aplicar</option>
              <option value="frente">Frente</option>
              <option value="fundo">Fundo</option>
              <option value="peDireito">Pé-direito</option>
            </select>
          </label>
        </div>
        <MedirZona
          onMedido={({ largura: l, altura: a }) => {
            if (alvoLargura !== 'nenhum') aplicarAoAlvo(alvoLargura, l);
            if (alvoAltura !== 'nenhum') aplicarAoAlvo(alvoAltura, a);
          }}
        />
      </div>
    </div>
  );
}
