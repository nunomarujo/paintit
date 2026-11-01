'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Seis momentos reais do comparador de propostas, gerados em build-time pelos componentes e dados
 * reais (`scripts/gerar-demo-comparador.mjs`) e servidos aqui como `src` de um `<iframe>`
 * `sandbox="allow-same-origin"` — sem `allow-scripts`: o que se vê é HTML/CSS real, nunca uma
 * simulação visual, e nenhum dos seis ficheiros faz qualquer chamada de rede.
 *
 * Estado 6 (relatório A4): o documento é desenhado para impressão, numa largura própria de
 * 900px. Em telemóvel (≤640px) a janela normal dá lugar a uma miniatura com a proporção de uma
 * folha A4 (210:297) do mesmo ficheiro, reduzida por `transform: scale()` — nunca espremida à
 * largura do ecrã. Nada aqui simula um descarregamento real.
 */
const ESTADOS = [
  {
    ficheiro: 'estado-1-sintese.html',
    url: 'app.quempinta.pt/pedidos/.../propostas',
    largura: 900,
    frase: 'O preço mais baixo não conta a história toda.',
  },
  {
    ficheiro: 'estado-2-detalhe.html',
    url: 'app.quempinta.pt/pedidos/.../propostas',
    largura: 900,
    frase: 'Veja o que cada pintor inclui, exclui ou deixa por esclarecer.',
  },
  {
    ficheiro: 'estado-3-diferencas.html',
    url: 'app.quempinta.pt/pedidos/.../propostas',
    largura: 700,
    frase: 'Compare os trabalhos e os materiais que estão realmente previstos.',
  },
  {
    ficheiro: 'estado-4-reconciliacao.html',
    url: 'app.quempinta.pt/pedidos/.../propostas/reconciliacao',
    largura: 820,
    frase: 'Perceba que parte da diferença tem causa identificada: âmbito, quantidade e preço, trabalho a trabalho.',
  },
  {
    ficheiro: 'estado-5-nao-decomposta.html',
    url: 'app.quempinta.pt/pedidos/.../propostas/reconciliacao',
    largura: 820,
    frase: 'Quando não é possível explicar uma diferença com rigor, mostramos o que falta esclarecer.',
  },
  {
    ficheiro: 'estado-6-relatorio.html',
    url: 'app.quempinta.pt/pedidos/.../propostas/relatorio',
    largura: 900,
    frase: 'Leve a comparação organizada à reunião de condomínio.',
  },
] as const;

const DOC_INDEX = 5; // estado-6-relatorio.html — desenhado para A4/impressão, não para telemóvel.

export function ComparadorDemo() {
  const [atual, setAtual] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [emDocumento, setEmDocumento] = useState(false);
  const [escalaDoc, setEscalaDoc] = useState(1);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const janelaRef = useRef<HTMLDivElement>(null);
  const docPageRef = useRef<HTMLDivElement>(null);
  const docFrameRef = useRef<HTMLIFrameElement>(null);
  const estagioRef = useRef<HTMLDivElement>(null);

  const estado = ESTADOS[atual]!;

  const actualizarAfordancia = () => {
    const sc = scrollerRef.current;
    if (!sc) return;
    setTemMais(sc.scrollHeight - sc.clientHeight - sc.scrollTop > 4);
  };

  const ajustarAlturaFrame = () => {
    const frame = frameRef.current;
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      const h = doc?.documentElement?.scrollHeight ?? 0;
      frame.style.height = `${h > 0 ? h : 1200}px`;
    } catch {
      frame.style.height = '1200px';
    }
  };

  const ajustarPreVisualizacaoDoc = () => {
    const page = docPageRef.current;
    const frame = docFrameRef.current;
    if (!page || !frame) return;
    const w = page.clientWidth;
    if (!w) return;
    setEscalaDoc(w / 900);
  };

  useEffect(() => {
    const doc = atual === DOC_INDEX && window.innerWidth <= 640;
    setEmDocumento(doc);
    if (doc) requestAnimationFrame(ajustarPreVisualizacaoDoc);
  }, [atual]);

  useEffect(() => {
    const onResize = () => {
      const doc = atual === DOC_INDEX && window.innerWidth <= 640;
      setEmDocumento(doc);
      if (doc) ajustarPreVisualizacaoDoc();
      else {
        requestAnimationFrame(() => {
          ajustarAlturaFrame();
          actualizarAfordancia();
        });
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [atual]);

  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    sc.addEventListener('scroll', actualizarAfordancia, { passive: true });
    return () => sc.removeEventListener('scroll', actualizarAfordancia);
  }, []);

  const irPara = (i: number) => {
    const n = ESTADOS.length;
    setAtual(((i % n) + n) % n);
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
  };

  useEffect(() => {
    const estagio = estagioRef.current;
    if (!estagio) return;
    let startX: number | null = null;
    const onDown = (e: TouchEvent) => {
      startX = e.touches[0]?.clientX ?? null;
    };
    const onUp = (e: TouchEvent) => {
      if (startX === null) return;
      const dx = (e.changedTouches[0]?.clientX ?? startX) - startX;
      if (Math.abs(dx) > 40) irPara(atual + (dx < 0 ? 1 : -1));
      startX = null;
    };
    estagio.addEventListener('touchstart', onDown, { passive: true });
    estagio.addEventListener('touchend', onUp, { passive: true });
    return () => {
      estagio.removeEventListener('touchstart', onDown);
      estagio.removeEventListener('touchend', onUp);
    };
  }, [atual]);

  const larguraJanela = emDocumento ? undefined : Math.min(900, Math.max(560, estado.largura));

  return (
    <div className="mt-10">
      <div className="relative mx-auto max-w-[960px]">
        <div
          ref={estagioRef}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') irPara(atual + 1);
            if (e.key === 'ArrowLeft') irPara(atual - 1);
          }}
          className="mx-auto"
          style={{ maxWidth: larguraJanela, transition: 'max-width .3s ease' }}
        >
          <div
            ref={janelaRef}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_56px_-22px_rgba(23,63,66,.38),0_2px_10px_rgba(23,63,66,.08)]"
          >
            {/* Janela de app: barra de chrome com três pontos e URL simulada */}
            <div className="flex h-10 flex-none items-center gap-[7px] border-b border-slate-200 bg-slate-100 px-3.5" aria-hidden>
              <span className="h-[9px] w-[9px] rounded-full bg-slate-300" />
              <span className="h-[9px] w-[9px] rounded-full bg-slate-300" />
              <span className="h-[9px] w-[9px] rounded-full bg-slate-300" />
              <span className="ml-2 max-w-[72%] truncate rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] text-slate-500">
                {estado.url}
              </span>
            </div>

            <div className="relative h-[72vh] max-h-[620px] min-h-[420px] overflow-hidden bg-slate-100 sm:h-[560px]">
              {!emDocumento && (
                <>
                  <div ref={scrollerRef} className="absolute inset-0 overflow-y-auto [scrollbar-width:thin]">
                    <iframe
                      key={estado.ficheiro}
                      ref={frameRef}
                      src={`/demo-comparador/${estado.ficheiro}`}
                      title={`Comparador de propostas — ${estado.frase}`}
                      scrolling="no"
                      sandbox="allow-same-origin"
                      className="block w-full border-0 bg-white"
                      onLoad={() => {
                        ajustarAlturaFrame();
                        actualizarAfordancia();
                      }}
                    />
                  </div>
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[52px] transition-opacity duration-200"
                    style={{
                      background: 'linear-gradient(to bottom, rgba(236,234,225,0), rgba(236,234,225,.96))',
                      opacity: temMais ? 1 : 0,
                    }}
                  />
                  <div
                    className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-bold text-tinta-700 shadow-[0_6px_16px_-8px_rgba(23,63,66,.3)] transition-opacity duration-200"
                    style={{ opacity: temMais ? 1 : 0 }}
                  >
                    <span>Role para ver mais</span>
                    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </>
              )}

              {emDocumento && (
                <div className="flex h-full flex-col items-center justify-center gap-3.5 px-4 py-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-bold text-tinta-700 shadow-[0_4px_14px_-8px_rgba(23,63,66,.3)]">
                    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    Documento A4
                  </span>
                  <div ref={docPageRef} className="w-full max-w-[230px]">
                    <div className="relative aspect-[210/297] w-full overflow-hidden rounded-md bg-white shadow-[0_20px_44px_-18px_rgba(23,63,66,.42),0_0_0_1px_rgba(23,63,66,.07)]">
                      <iframe
                        ref={docFrameRef}
                        src={`/demo-comparador/${estado.ficheiro}`}
                        title="Pré-visualização reduzida do relatório para a assembleia"
                        scrolling="no"
                        sandbox="allow-same-origin"
                        tabIndex={-1}
                        aria-hidden
                        className="pointer-events-none absolute left-0 top-0 border-0 bg-white"
                        style={{ width: 900, height: 1600, transformOrigin: 'top left', transform: `scale(${escalaDoc})` }}
                        onLoad={ajustarPreVisualizacaoDoc}
                      />
                    </div>
                  </div>
                  <p className="max-w-[280px] text-center text-[15px] leading-snug text-slate-600">
                    Este estado gera um documento pronto para imprimir ou descarregar — em telemóvel mostramos uma
                    pré-visualização reduzida em vez de espremer a tabela. O documento completo (A4) está disponível a
                    partir da aplicação.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mx-auto mt-5 max-w-[620px] text-center">
            <p className="text-[13px] font-bold uppercase tracking-[.04em] text-tinta-700">
              Estado {atual + 1} de {ESTADOS.length}
            </p>
            <p className="mt-1.5 text-[20px] font-bold leading-snug text-tinta-900">{estado.frase}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3.5">
          <button
            type="button"
            aria-label="Estado anterior"
            onClick={() => irPara(atual - 1)}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-300 bg-white text-tinta-700 hover:bg-slate-100"
          >
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div role="tablist" aria-label="Estados da demonstração" className="flex gap-2">
            {ESTADOS.map((e, i) => (
              <button
                key={e.ficheiro}
                type="button"
                role="tab"
                aria-current={i === atual}
                aria-label={`Estado ${i + 1} de ${ESTADOS.length}`}
                onClick={() => irPara(i)}
                className="flex min-h-[44px] min-w-[28px] items-center justify-center px-0.5"
              >
                <span
                  className={
                    'h-[9px] rounded-full transition-all ' + (i === atual ? 'w-[22px] bg-tinta-900' : 'w-[9px] bg-slate-300')
                  }
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Próximo estado"
            onClick={() => irPara(atual + 1)}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-300 bg-white text-tinta-700 hover:bg-slate-100"
          >
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        <p className="mt-2.5 text-center text-[13px] text-slate-500 sm:hidden">
          Deslize para o lado para percorrer os estados · dentro da janela, role para ver o ecrã completo.
        </p>
      </div>
    </div>
  );
}
