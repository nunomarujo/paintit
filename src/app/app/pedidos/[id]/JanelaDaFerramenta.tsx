'use client';

import dynamic from 'next/dynamic';
import { Component, useState, type ReactNode } from 'react';
import { CONFIRMACAO_LABELS, ORIGEM_DA_QUANTIDADE_LABELS, formatArea } from '@/domain/request';
import { BotaoFechar, Janela } from './Janela';
import type { ZonaNaLista } from './ZonasDoPedido';
import { nomeDaZona } from '@/domain/respostaDasZonas';

/**
 * A ferramenta de levantamento da área da obra, numa janela grande por cima do passo 2.
 *
 * «Uma opção que abre um popup grande com a ferramenta de levantamento de área de obra» (promotor,
 * 05/11/2026). A ferramenta é a verdadeira — a de `/demo-areas`, importada sem a mexer, só no
 * navegador (é uma fotografia, um canvas e contas no aparelho; nada disto se desenha no servidor) e
 * só quando a janela abre: são três mil linhas que quem não a abre não precisa de descarregar.
 *
 * ## O que ainda não faz
 *
 * O resultado não volta para o pedido. Quando voltar (próxima tarefa, com migração), a zona medida
 * aqui fica com origem própria, **medida pelo cliente**, e com a margem de erro da medição (± %) —
 * nunca «confirmada»: é uma medição a partir de uma fotografia, e a margem diz quanto vale (decisão do
 * promotor, 05/11/2026, em `docs/DECISOES.md`). Até lá, a entrada só aparece à equipa da plataforma, e
 * a janela di-lo numa linha, com o botão de usar a medição desativado e a razão ao lado.
 */

const MedirFachada = dynamic(() => import('@/app/demo-areas/MedirFachada').then((m) => m.MedirFachada), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[18rem] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6" role="status">
      <p className="text-[15px] text-slate-600">A abrir a ferramenta…</p>
    </div>
  ),
});

/** Se a ferramenta não carregar (rede em baixo a meio), diz-se isso no sítio dela, com nova tentativa. */
class SeFalhar extends Component<{ children: ReactNode }, { falhou: boolean; tentativa: number }> {
  state = { falhou: false, tentativa: 0 };
  static getDerivedStateFromError() {
    return { falhou: true };
  }
  render() {
    if (this.state.falhou) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6" role="alert">
          <p className="text-[17px] text-tinta-900">Não foi possível abrir a ferramenta.</p>
          <p className="mt-1 text-[15px] text-slate-600">Verifique a ligação e tente de novo. Nada do pedido se perdeu.</p>
          <button
            type="button"
            onClick={() => this.setState((s) => ({ falhou: false, tentativa: s.tentativa + 1 }))}
            className="btn-secondary btn-sm mt-3"
          >
            Tentar de novo
          </button>
        </div>
      );
    }
    return <div key={this.state.tentativa}>{this.props.children}</div>;
  }
}

export interface PredioParaConferir {
  frente: string | null;
  fundo: string | null;
  altura: string | null;
}

export function JanelaDaFerramenta({
  aberta,
  aoFechar,
  zonas,
  numero,
  zonaInicial,
  predio,
}: {
  aberta: boolean;
  aoFechar: () => void;
  zonas: ZonaNaLista[];
  numero: Record<string, number | null>;
  /** A zona que se vai medir, quando se chega por ela («confirmar a empena»). */
  zonaInicial: string | null;
  predio: PredioParaConferir;
}) {
  return (
    <Janela aberta={aberta} aoFechar={aoFechar} forma="grande" idDoTitulo="ferramenta-titulo">
      <Conteudo aoFechar={aoFechar} zonas={zonas} numero={numero} zonaInicial={zonaInicial} predio={predio} />
    </Janela>
  );
}

function Conteudo({
  aoFechar,
  zonas,
  numero,
  zonaInicial,
  predio,
}: {
  aoFechar: () => void;
  zonas: ZonaNaLista[];
  numero: Record<string, number | null>;
  zonaInicial: string | null;
  predio: PredioParaConferir;
}) {
  const [zonaId, setZonaId] = useState(
    zonaInicial ?? zonas.find((z) => z.participacao === 'incluida' && z.confirmacao === 'por_confirmar')?.id ?? '',
  );
  const zona = zonas.find((z) => z.id === zonaId) ?? null;
  const conferir: [string, string | null][] = [
    ['Frente', predio.frente],
    ['Fundo', predio.fundo],
    ['Altura', predio.altura],
  ];
  return (
    <>
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <h2 id="ferramenta-titulo" className="text-[20px] font-semibold leading-tight text-tinta-900">
            Levantamento da área da obra
          </h2>
          <p className="mt-0.5 text-[15px] text-slate-600">Medir uma fachada pela fotografia e por uma medida tirada com fita.</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <label htmlFor="ferramenta-zona" className="text-[15px] font-medium text-slate-700">
              Para que zona
            </label>
            <select
              id="ferramenta-zona"
              value={zonaId}
              onChange={(ev) => setZonaId(ev.target.value)}
              className="campo w-auto min-w-[15rem] max-w-full bg-white"
            >
              {zonas.map((z) => (
                <option key={z.id} value={z.id}>
                  {numero[z.id] ? `${numero[z.id]} · ` : ''}
                  {nomeDaZona(z)}
                </option>
              ))}
              <option value="">Uma zona nova</option>
            </select>
            {zona && zona.areaCm2 > 0 && (
              <p className="text-[15px] tabular-nums text-slate-600">
                Hoje: {formatArea(zona.areaCm2)}
                {zona.origemDaQuantidade && `, ${ORIGEM_DA_QUANTIDADE_LABELS[zona.origemDaQuantidade].toLowerCase()}`}
                {zona.confirmacao === 'por_confirmar' ? (
                  <span className="text-amber-800"> · {CONFIRMACAO_LABELS.por_confirmar.toLowerCase()}</span>
                ) : (
                  ` · ${CONFIRMACAO_LABELS.confirmada.toLowerCase()}`
                )}
              </p>
            )}
          </div>
        </div>
        <BotaoFechar rotulo="Fechar a ferramenta" aoCarregar={aoFechar} />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0">
            <SeFalhar>
              <MedirFachada />
            </SeFalhar>
          </div>
          {/* No telemóvel fica por baixo da área de trabalho: primeiro mede-se, depois confere-se. */}
          <aside aria-labelledby="ferramenta-conferir" className="lg:border-l lg:border-slate-200 lg:pl-5">
            <h3 id="ferramenta-conferir" className="text-[15px] font-semibold text-tinta-900">
              Do prédio, para conferir
            </h3>
            <p className="text-[13px] text-slate-600">As medidas indicadas no pedido. Uma fachada medida aqui deve bater com elas.</p>
            <dl className="mt-2 text-[15px]">
              {conferir.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 border-t border-slate-100 py-1.5">
                  <dt className="text-slate-600">{k}</dt>
                  <dd className={`tabular-nums ${v ? 'text-tinta-900' : 'text-slate-600'}`}>
                    {v ?? <span aria-label="por medir">—</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-slate-200 px-4 py-3 sm:px-6">
        <p className="max-w-[62ch] text-[15px] text-slate-600">
          O resultado ainda não volta para o pedido. Quando voltar, a zona fica <span className="text-tinta-900">medida pelo cliente</span>,
          com a margem de erro da medição (± %).
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button type="button" onClick={aoFechar} className="btn-quiet">
            Fechar
          </button>
          <button type="button" disabled aria-describedby="ferramenta-porque" className="btn-primary btn-desativado">
            Usar esta medição
          </button>
          <span id="ferramenta-porque" className="text-[15px] text-slate-600">
            Ainda não disponível
          </span>
        </div>
      </footer>
    </>
  );
}
