'use client';

import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { alturaDoPredio, dimensao, type Certeza, type Dimensao } from '@/domain/geometria';
import { entradaDoVolume, lugaresDasZonas, numerarZonas, type EixoDaCota } from '@/domain/prancheta';
import { formatArea, type SurfaceKind, type WorksMode } from '@/domain/request';
import {
  fraseDoQueFalta,
  nomeDaZona,
  respostaDasZonas,
  tituloDaResposta,
  tituloNumaFrase,
  type Falta,
} from '@/domain/respostaDasZonas';
import { buildingVolume, type Forma } from '@/domain/volume';
import { GeometriaDoPredio, type MedidasEmTexto } from './GeometriaDoPredio';
import { BotaoFechar, Janela } from './Janela';
import { JanelaDaFerramenta } from './JanelaDaFerramenta';
import { QuadroDasZonas } from './Prancheta';
import { EditorDaZona, Pino, type ZonaNaLista } from './ZonasDoPedido';
import { ZonasRecolhiveis } from './ZonasRecolhiveis';

/**
 * O passo 2 do pedido, «Medidas e fotografias» — a parte das zonas: a proposta B, «o prédio ao
 * centro», escolhida pelo promotor a 05/11/2026 entre duas maquetas («construir algo bonito e fácil
 * de trabalhar, prático, respirável, preferencialmente tudo num só ecrã»).
 *
 * De cima para baixo:
 *
 * 1. **A resposta**: quanto se vai pintar («216 m² a pintar, em 2 das 4 zonas»), a barra fina do que
 *    está medido, do que é estimativa e das zonas ainda sem número, e o que falta, em âmbar, com cada
 *    zona a levar ao sítio onde se resolve. Os dois botões — acrescentar uma zona, medir na fotografia
 *    — vão nessa linha no computador, para não gastarem altura (juiz, 05/11/2026); no telemóvel, por
 *    baixo do desenho, para o desenho vir logo a seguir ao total (cético, 05/11/2026).
 * 2. **O quadro** (`Prancheta.tsx`): o desenho do prédio com as zonas pintadas e numeradas, e os
 *    cartões. Abrir um cartão, um número ou uma face abre a gaveta do editor, com o desenho à vista e
 *    a zona acesa.
 * 3. **O prédio**: as medidas (frente, fundo, pé-direito), que mudam o desenho enquanto se escrevem.
 *
 * Com uma visita pedida, os campos de medição recolhem-se (`ZonasRecolhiveis`): não são tarefa do
 * cliente. Sem gestão do pedido (publicado, ou sem permissão), tudo é só de leitura.
 */

const texto = (m: number | null) => (m === null ? '' : String(m).replace('.', ','));
const numero = (v: string): number | null => {
  const t = v.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const emMetros = (n: number) => `${n.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} m`;
/**
 * O texto de uma cota no desenho: curto, porque vive ao lado do prédio. Uma medida de olho leva «≈»
 * — diz o mesmo que «(estimada)» na linha do prédio, em três caracteres em vez de onze.
 */
const textoDaCota = (d: Dimensao) => (d.metros === null ? undefined : `${d.certeza === 'estimada' ? '≈ ' : ''}${emMetros(d.metros)}`);

export function ZonasComVolume({
  requestId,
  zonas,
  modo,
  podeEditar,
  doCliente,
  predio,
  recolhido = false,
  daEquipa = false,
}: {
  requestId: string;
  zonas: ZonaNaLista[];
  modo: WorksMode;
  podeEditar: boolean;
  /** As medidas são tarefa do cliente? Falso enquanto houver um levantamento a caminho. */
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
  /** Com visita pedida: o quadro fica recolhido atrás de «Acrescentar informação que já sei». */
  recolhido?: boolean;
  /**
   * Quem vê é da equipa da plataforma (`platform_admins`)? Só a equipa tem, por agora, a entrada da
   * ferramenta de levantamento: o resultado ainda não volta para o pedido.
   */
  daEquipa?: boolean;
}) {
  const [aberto, setAberto] = useState<{ id: string | null; tipo?: SurfaceKind } | null>(null);
  const [apontada, setApontada] = useState<string | null>(null);
  // `zonaId` nulo: abriu-se pelo botão do topo (sugere-se a primeira por confirmar); vazio: uma zona nova.
  const [ferramenta, setFerramenta] = useState<{ zonaId: string | null } | null>(null);
  const [medidas, setMedidas] = useState<MedidasEmTexto>({
    largura: texto(predio.medidas.larguraM),
    profundidade: texto(predio.medidas.profundidadeM),
    peDireito: texto(predio.medidas.peDireitoM),
    origem: predio.medidas.origem || 'estimativa',
  });

  // O prédio, à medida do que está escrito nos campos — antes de gravar.
  const certeza: Certeza = medidas.origem === 'estimativa' ? 'estimada' : 'declarada';
  const g = {
    forma: predio.forma,
    pisos: predio.pisos,
    largura: dimensao(numero(medidas.largura), certeza),
    profundidade: dimensao(numero(medidas.profundidade), certeza),
    peDireito: dimensao(numero(medidas.peDireito), certeza),
  };
  const altura = alturaDoPredio(g);
  const emEscala = g.largura.metros !== null && g.peDireito.metros !== null;
  // O volume e as cotas só mudam com o prédio e com as zonas — não a cada passagem do rato.
  const lM = g.largura.metros;
  const pM = g.profundidade.metros;
  const hM = g.peDireito.metros;
  const volume = useMemo(
    () =>
      buildingVolume(
        entradaDoVolume(predio, zonas, lM !== null && hM !== null ? { larguraM: lM, profundidadeM: pM, peDireitoM: hM } : null),
      ),
    [predio, zonas, lM, pM, hM],
  );
  const textos = useMemo<Partial<Record<EixoDaCota, string>>>(() => {
    if (lM === null || hM === null) return {};
    const alto = alturaDoPredio({
      forma: null,
      pisos: predio.pisos,
      largura: dimensao(lM, certeza),
      profundidade: dimensao(pM, certeza),
      peDireito: dimensao(hM, certeza),
    });
    return { frente: textoDaCota(dimensao(lM, certeza)), fundo: textoDaCota(dimensao(pM, certeza)), altura: textoDaCota(alto) };
  }, [lM, pM, hM, certeza, predio.pisos]);
  const numeracao = useMemo(() => numerarZonas(zonas, lugaresDasZonas(volume, zonas)), [volume, zonas]);
  const numeroDe = useMemo(() => Object.fromEntries(numeracao.map((n) => [n.id, n.n])), [numeracao]);
  const r = respostaDasZonas(zonas);
  const zonaAberta = aberto?.id ? (zonas.find((z) => z.id === aberto.id) ?? null) : null;
  // A zona aberta deixou de existir (removida aqui, ou noutro separador): a gaveta fecha. Ficar aberta
  // era passar a «Nova zona» com os números da apagada, e «Guardar» voltava a criá-la (cético, 05/11/2026).
  const desapareceu = !!aberto?.id && !zonaAberta;
  useEffect(() => {
    if (desapareceu) setAberto(null);
  }, [desapareceu]);

  const abrir = (id: string | null, tipo?: SurfaceKind) => setAberto({ id, tipo });
  const medir = (zonaId: string | null) => setFerramenta({ zonaId });
  /** Levar a um cartão: o que está à vista (há dois quadros no HTML, um escondido). */
  const irAoCartao = (id: string) => {
    const el = Array.from(document.querySelectorAll<HTMLElement>(`[data-zona="${id}"]`)).find((x) => x.offsetParent !== null);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
    setApontada(id);
  };

  const descricao = `Desenho do prédio${predio.pisos ? `, ${predio.pisos} pisos` : ''}${
    zonas.length > 0 ? `, com ${numeracao.filter((n) => n.n !== null).length} zonas numeradas` : ''
  }${emEscala ? '' : ', em proporções genéricas'}`;

  const botaoAcrescentar = podeEditar && (
    <button type="button" onClick={() => abrir(null)} className="btn-secondary btn-sm">
      + Acrescentar zona
    </button>
  );
  const botaoMedir = daEquipa && (
    <button type="button" onClick={() => medir(null)} className="btn-secondary btn-sm gap-2">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 15l5-5 4 4 3-3 6 6" />
      </svg>
      Medir na fotografia
    </button>
  );

  const accoes = !recolhido && (botaoAcrescentar || botaoMedir) && (
    <>
      {zonas.length > 0 && botaoAcrescentar}
      {botaoMedir}
    </>
  );

  return (
    <>
      <div className="space-y-4">
        <Resposta
          r={r}
          vazio={zonas.length === 0}
          recolhido={recolhido}
          accoes={accoes || null}
          aoResolver={(f, id) => {
            // Decidir faz-se no cartão (os botões estão lá); confirmar e levantar, no editor da zona —
            // e é lá que a equipa tem a ferramenta, já com a zona escolhida. Sem edição, a equipa vai
            // direta à ferramenta; os outros, ao cartão.
            if (f.tipo === 'decidir') return irAoCartao(id);
            if (podeEditar) return abrir(id);
            if (daEquipa && f.tipo === 'confirmar') return medir(id);
            irAoCartao(id);
          }}
        />

        <ZonasRecolhiveis recolhido={recolhido}>
          {recolhido && (botaoAcrescentar || botaoMedir) && zonas.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {botaoAcrescentar}
              {botaoMedir}
            </div>
          )}
          <QuadroDasZonas
            requestId={requestId}
            volume={volume}
            zonas={zonas}
            numeracao={numeracao}
            textos={textos}
            aberta={aberto?.id ?? null}
            apontada={apontada}
            podeEditar={podeEditar}
            aoAbrir={(id) => abrir(id)}
            aoApontar={setApontada}
            descricao={descricao}
            accoes={accoes || undefined}
            vazio={
              zonas.length === 0
                ? {
                    lista: <ZonasVazias podeEditar={podeEditar} doCliente={doCliente} aoAcrescentar={(tipo) => abrir(null, tipo)} />,
                    aoAcrescentar: podeEditar ? (tipo) => abrir(null, tipo) : undefined,
                  }
                : undefined
            }
          />
          <div className="mt-4 border-t border-slate-100 pt-4">
            <GeometriaDoPredio
              buildingId={predio.buildingId}
              requestId={requestId}
              pisos={predio.pisos}
              fachadas={predio.fachadas}
              medidas={medidas}
              altura={altura.metros !== null ? `${altura.certeza === 'estimada' ? '≈ ' : ''}${emMetros(altura.metros)}` : null}
              aoMudar={setMedidas}
              podeEditar={podeEditar}
              podeMedir={predio.podeMedir}
            />
          </div>
        </ZonasRecolhiveis>
      </div>

      {/* As janelas fora da coluna de cima: um `<dialog>` dentro de um `space-y-*` herdava a margem. */}
      <Janela aberta={aberto !== null && !desapareceu} aoFechar={() => setAberto(null)} forma="gaveta" idDoTitulo="gaveta-titulo">
        {aberto && !desapareceu && (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                {zonaAberta && numeroDe[zonaAberta.id] && <Pino n={numeroDe[zonaAberta.id]!} aceso />}
                <h2 id="gaveta-titulo" className="truncate text-[20px] font-semibold text-tinta-900">
                  {zonaAberta ? nomeDaZona(zonaAberta) : 'Nova zona'}
                </h2>
              </div>
              <BotaoFechar rotulo="Fechar sem guardar" aoCarregar={() => setAberto(null)} />
            </header>
            <EditorDaZona
              key={aberto.id ?? `nova-${aberto.tipo ?? ''}`}
              requestId={requestId}
              zona={zonaAberta}
              tipo={aberto.tipo}
              modo={modo}
              idDoFormulario="editor-da-zona"
              aoFechar={() => setAberto(null)}
              medir={daEquipa ? () => medir(zonaAberta?.id ?? '') : undefined}
            />
          </>
        )}
      </Janela>

      {daEquipa && (
        <JanelaDaFerramenta
          aberta={ferramenta !== null}
          aoFechar={() => setFerramenta(null)}
          zonas={zonas}
          numero={numeroDe}
          zonaInicial={ferramenta?.zonaId ?? null}
          predio={{
            frente: g.largura.metros !== null ? emMetros(g.largura.metros) : null,
            fundo: g.profundidade.metros !== null ? emMetros(g.profundidade.metros) : null,
            altura: altura.metros !== null ? emMetros(altura.metros) : null,
          }}
        />
      )}
    </>
  );
}

/**
 * A resposta do passo: o total, a barra do medido, do estimado e do que ainda não tem número, e o que
 * falta. A gramática do que falta vive no domínio (`fraseDoQueFalta`, testada); aqui cada nome de zona
 * passa a botão para o sítio onde se resolve: «decidir as varandas» leva ao cartão; «confirmar» e
 * «levantar» abrem a edição da zona (e, nela, a equipa tem a ferramenta já com essa zona).
 */
function Resposta({
  r,
  vazio,
  recolhido,
  accoes,
  aoResolver,
}: {
  r: ReturnType<typeof respostaDasZonas>;
  vazio: boolean;
  recolhido: boolean;
  accoes: ReactNode;
  aoResolver: (f: Pick<Falta, 'tipo'>, id: string) => void;
}) {
  if (recolhido) {
    return (
      <p className="text-[15px] text-slate-600">
        O avaliador regista as zonas e as medidas durante a visita.
        {r.total > 0 && ` Até agora: ${tituloNumaFrase(r)}.`}
      </p>
    );
  }
  // No computador as ações vão ao lado do total; no telemóvel, por baixo do desenho (`QuadroDasZonas`).
  const ladoDoTotal = accoes && <div className="hidden flex-wrap gap-2 sm:flex">{accoes}</div>;
  if (vazio) {
    return (
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-[20px] font-semibold leading-tight text-slate-600">Área por levantar</p>
          <p className="mt-1 max-w-[54ch] text-[15px] text-slate-600">
            Primeiro, dizer o que se vai pintar — mesmo sem medidas. Cada zona soma aqui quando tiver um número.
          </p>
        </div>
        {ladoDoTotal}
      </div>
    );
  }

  const t = tituloDaResposta(r);
  const falta = fraseDoQueFalta(r.falta);
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 grow basis-[22rem]">
        <p className="flex flex-wrap items-baseline gap-x-2.5">
          <span
            className={`whitespace-nowrap text-[34px] font-semibold leading-none tracking-[-0.02em] tabular-nums ${t.numero ? 'text-tinta-900' : 'text-slate-600'}`}
          >
            {t.destaque}
          </span>
          <span className="text-[17px] text-slate-600">{t.frase}</span>
        </p>
        {r.totalCm2 > 0 && (
          <div className="mt-3 max-w-[26rem]">
            {/* A barra é o total: o que alguém mediu, em cobalto; o estimado, pálido (proposta A); e, no
                fim, as zonas ainda sem número — um troço aberto, a tracejado, que não está à escala
                porque a área delas não se sabe (cético, 05/11/2026). */}
            <div
              role="img"
              aria-label={[
                r.medidaCm2 > 0 && `${formatArea(r.medidaCm2)} medidos`,
                r.porConfirmarCm2 > 0 && `${formatArea(r.porConfirmarCm2)} por confirmar`,
                r.porLevantar > 0 && `${r.porLevantar === 1 ? '1 zona' : `${r.porLevantar} zonas`} ainda sem medidas`,
              ]
                .filter(Boolean)
                .join(', ')}
              className="flex h-2 w-full gap-0.5"
            >
              {r.medidaCm2 > 0 && <span className="rounded-full bg-tinta-600" style={{ flex: `${r.medidaCm2} 1 0%` }} />}
              {r.porConfirmarCm2 > 0 && <span className="rounded-full bg-tinta-300" style={{ flex: `${r.porConfirmarCm2} 1 0%` }} />}
              {r.porLevantar > 0 && (
                <span className="rounded-full border border-dashed border-slate-500" style={{ flex: `0 0 ${Math.min(40, 14 * r.porLevantar)}%` }} />
              )}
            </div>
            <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-600">
              {r.medidaCm2 > 0 && (
                <li className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2 w-3 rounded-full bg-tinta-600" />
                  <span>
                    <span className="tabular-nums">{formatArea(r.medidaCm2)}</span> medidos
                  </span>
                </li>
              )}
              {r.porConfirmarCm2 > 0 && (
                <li className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2 w-3 rounded-full bg-tinta-300" />
                  <span>
                    <span className="tabular-nums">{formatArea(r.porConfirmarCm2)}</span> {r.soEstimativas ? 'estimados' : 'por confirmar'}
                  </span>
                </li>
              )}
              {r.porLevantar > 0 && (
                <li className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2 w-3 rounded-full border border-dashed border-slate-500" />
                  <span>
                    <span className="tabular-nums">{r.porLevantar}</span> {r.porLevantar === 1 ? 'zona sem medidas' : 'zonas sem medidas'}
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}
        {falta.length > 0 && (
          <p className="mt-3 text-[15px] leading-relaxed text-amber-800">
            {falta.map((pd, i) =>
              pd.tipo === 'texto' ? (
                <Fragment key={i}>{pd.numero ? <span className="tabular-nums">{pd.texto}</span> : pd.texto}</Fragment>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => aoResolver({ tipo: pd.falta }, pd.id)}
                  className="-my-[11px] inline-flex min-h-[44px] items-center font-medium underline decoration-amber-700/50 underline-offset-4 hover:text-amber-900"
                >
                  {pd.texto}
                </button>
              ),
            )}
          </p>
        )}
      </div>
      {ladoDoTotal}
    </div>
  );
}

/**
 * O pedido sem zonas: o que se vai pintar, por tipo, cada um com a frase que o explica — quem não é do
 * ofício não sabe o que é uma empena (juiz, 05/11/2026, trazido da proposta A). Um toque abre o editor
 * já com o tipo escolhido; as medidas escrevem-se a seguir, ou a zona fica por levantar. A fachada, a
 * empena e as varandas também se acrescentam tocando no próprio desenho (`QuadroDasZonas`).
 *
 * Só de leitura (o pedido publicado), não há nada a escolher: a moldura e uma frase.
 */
function ZonasVazias({
  podeEditar,
  doCliente,
  aoAcrescentar,
}: {
  podeEditar: boolean;
  doCliente: boolean;
  aoAcrescentar: (tipo: SurfaceKind) => void;
}) {
  if (!podeEditar) {
    return <p className="min-w-0 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-[15px] text-slate-600">Sem zonas registadas.</p>;
  }
  const tipos: [SurfaceKind, string, string][] = [
    ['fachada', 'Fachada', 'As paredes exteriores com janelas: a da rua, o tardoz.'],
    ['empena', 'Empena', 'A parede lateral sem janelas, à vista ou encostada ao prédio do lado.'],
    ['varandas', 'Varandas', 'Os tetos e as guardas das varandas.'],
    ['muro', 'Muro', 'Muros de vedação e da entrada.'],
    ['outro', 'Outra zona', 'Escadas e átrio, beirais, grades e portões, interiores.'],
  ];
  return (
    <div className="min-w-0">
      <p className="text-[17px] font-medium text-tinta-900">Que partes do prédio vão ser pintadas?</p>
      <p className="mt-0.5 text-[15px] text-slate-600">
        {doCliente
          ? 'Tocar na parte do prédio, ou escolher aqui. Uma zona sem números fica por levantar.'
          : 'As zonas são registadas no levantamento. Pode acrescentar as que já souber.'}
      </p>
      <ul className="mt-2">
        {tipos.map(([k, nome, frase]) => (
          <li key={k} className="flex items-center justify-between gap-4 border-t border-slate-200 py-2">
            <div className="min-w-0">
              <p className="text-[17px] font-medium text-tinta-900">{nome}</p>
              <p className="text-[13px] text-slate-600">{frase}</p>
            </div>
            <button type="button" onClick={() => aoAcrescentar(k)} aria-label={`Acrescentar: ${nome}`} className="btn-quiet btn-sm shrink-0">
              Acrescentar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
