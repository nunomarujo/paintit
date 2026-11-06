'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Component, useState, useTransition, type ReactNode } from 'react';
import { gravarMedicaoDaFotografia } from '@/app/app/pedidos/actions';
import {
  TIPOS_MEDIVEIS_NA_FOTOGRAFIA,
  aceitaMedicaoDaFotografia,
  estadoNaFerramenta,
  fraseDaGravacao,
  medeSeNaFotografia,
  origemEmTexto,
  zonaDaMedicao,
  type MedicaoDaFotografia,
} from '@/domain/medicaoDaFotografia';
import { CONFIRMACAO_LABELS, SURFACE_KIND_LABELS, formatArea, type SurfaceKind } from '@/domain/request';
import { nomeDaZona } from '@/domain/respostaDasZonas';
import { BotaoFechar, Janela } from './Janela';
import type { ZonaNaLista } from './ZonasDoPedido';

/**
 * A ferramenta de levantamento da área da obra, numa janela grande por cima do passo 2.
 *
 * «Uma opção que abre um popup grande com a ferramenta de levantamento de área de obra» (promotor,
 * 05/11/2026). A ferramenta é a verdadeira — a de `/demo-areas`, importada sem a mexer, só no
 * navegador (é uma fotografia, um canvas e contas no aparelho; nada disto se desenha no servidor) e
 * só quando a janela abre: são três mil linhas que quem não a abre não precisa de descarregar.
 *
 * ## O que volta para o pedido (06/11/2026)
 *
 * «Usar esta medição» grava na zona escolhida — ou numa zona nova, com o tipo e o nome — a área a pintar
 * e a margem de erro (± %), com a origem **medida pelo cliente** e sempre por confirmar: é uma medição a
 * partir de uma fotografia, e confirma-a quem mede no local (decisão do promotor, 05/11/2026). Vai só o
 * número e a margem, nunca a fotografia nem o desenho (regra 6). As regras de quando uma medição serve
 * vivem em `zonaDaMedicao`: o botão fica desativado com a razão que ela dá, e o servidor volta a
 * perguntar-lhe o mesmo antes de gravar.
 *
 * A entrada aparece a quem pode editar o pedido; quem só o lê nunca a vê (`ZonasComVolume`).
 *
 * Uma zona já confirmada no local não se oferece: trocar a medida de quem lá foi por uma tirada da
 * fotografia era perder certeza sem ninguém o decidir (`aceitaMedicaoDaFotografia`; a ação do servidor
 * volta a perguntar). Só se oferecem as zonas que a ferramenta mede — fachadas, empenas, muros
 * (`medeSeNaFotografia`) — e o tipo da zona nova fica pelos mesmos. Quem chega pelo editor de uma zona
 * que não serve não é levado em silêncio para outra: a janela abre sem zona escolhida e diz porquê.
 * Dentro do pedido, a ferramenta não tem «Guardar»: quem grava é «Usar esta medição» (`noPedido`).
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

/** O que se diz depois de gravar: em que zona e o que ficou (a frase do servidor). */
export interface MedicaoGravada {
  /** A zona onde ficou (para a linha sair quando a zona muda por outro caminho). */
  zonaId: string;
  zona: string;
  mensagem: string;
  areaCm2: number;
}

/**
 * De onde se abriu a ferramenta. `zonaId` nulo: pelo botão do topo; vazio: uma zona nova, com o tipo e o
 * nome já escritos no editor, se os houver.
 */
export interface InicioDaFerramenta {
  zonaId: string | null;
  tipo?: SurfaceKind;
  nome?: string;
}

/** O valor de «Para que zona» enquanto não há zona escolhida. */
const ESCOLHER = '-';

export function JanelaDaFerramenta({
  aberta,
  aoFechar,
  aoGravar,
  requestId,
  podeEditar,
  zonas,
  numero,
  inicio,
  predio,
}: {
  aberta: boolean;
  aoFechar: () => void;
  /** Depois de gravar: a janela fecha, e quem a abriu diz o que ficou gravado. */
  aoGravar: (g: MedicaoGravada) => void;
  requestId: string;
  /** Sem edição a janela só mede, não grava (não devia abrir-se: a entrada só aparece a quem edita). */
  podeEditar: boolean;
  zonas: ZonaNaLista[];
  numero: Record<string, number | null>;
  inicio: InicioDaFerramenta;
  predio: PredioParaConferir;
}) {
  return (
    <Janela aberta={aberta} aoFechar={aoFechar} forma="grande" idDoTitulo="ferramenta-titulo">
      <Conteudo
        aoFechar={aoFechar}
        aoGravar={aoGravar}
        requestId={requestId}
        podeEditar={podeEditar}
        zonas={zonas}
        numero={numero}
        inicio={inicio}
        predio={predio}
      />
    </Janela>
  );
}

/** Pode receber a medição? Uma zona confirmada no local, não. */
const aceitaMedicao = (z: ZonaNaLista) => aceitaMedicaoDaFotografia(z.confirmacao);

function Conteudo({
  aoFechar,
  aoGravar,
  requestId,
  podeEditar,
  zonas,
  numero,
  inicio,
  predio,
}: {
  aoFechar: () => void;
  aoGravar: (g: MedicaoGravada) => void;
  requestId: string;
  podeEditar: boolean;
  zonas: ZonaNaLista[];
  numero: Record<string, number | null>;
  inicio: InicioDaFerramenta;
  predio: PredioParaConferir;
}) {
  const router = useRouter();
  // Só as zonas que a ferramenta mede; as confirmadas aparecem, desativadas, para se ver porque não.
  const mediveis = zonas.filter((z) => medeSeNaFotografia(z.kind));
  const inicial = inicio.zonaId ? zonas.find((z) => z.id === inicio.zonaId) : undefined;
  // Chegou-se pelo editor de uma zona que não pode receber esta medição: não se escolhe outra em silêncio.
  const avisoInicial = inicial
    ? !aceitaMedicao(inicial)
      ? `${nomeDaZona(inicial)} já está confirmada no local: a medição da fotografia não a substitui. Escolher outra zona, ou uma zona nova.`
      : !medeSeNaFotografia(inicial.kind)
        ? `${nomeDaZona(inicial)} não se mede na fotografia: a ferramenta mede fachadas, empenas e muros. Escolher outra zona, ou uma zona nova.`
        : null
    : inicio.zonaId === '' && inicio.tipo && !medeSeNaFotografia(inicio.tipo)
      ? `${SURFACE_KIND_LABELS[inicio.tipo]} não se mede na fotografia: a ferramenta mede fachadas, empenas e muros. Escolher o tipo da zona nova.`
      : null;
  const valorInicial =
    inicio.zonaId === ''
      ? ''
      : inicial
        ? avisoInicial
          ? ESCOLHER
          : inicial.id
        : // Pelo botão do topo: a primeira incluída que ainda precisa de número certo — por confirmar ou por levantar.
          (mediveis.find((z) => z.participacao === 'incluida' && aceitaMedicao(z))?.id ?? '');
  const [zonaId, setZonaId] = useState(valorInicial);
  const [tipoNovo, setTipoNovo] = useState<SurfaceKind>(() => (inicio.tipo && medeSeNaFotografia(inicio.tipo) ? inicio.tipo : 'fachada'));
  const [nomeNovo, setNomeNovo] = useState(inicio.nome ?? '');
  const [medicao, setMedicao] = useState<MedicaoDaFotografia | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aGravar, comecar] = useTransition();
  const zona = zonas.find((z) => z.id === zonaId) ?? null;
  const porEscolher = zonaId === ESCOLHER;
  const conferir: [string, string | null][] = [
    ['Frente', predio.frente],
    ['Fundo', predio.fundo],
    ['Altura', predio.altura],
  ];

  // A razão de não poder gravar, de uma fonte só: `zonaDaMedicao` (a mesma que o servidor usa).
  const convertida = medicao ? zonaDaMedicao(medicao) : null;
  const razao = !podeEditar
    ? 'O pedido já não se pode alterar.'
    : porEscolher
      ? 'Escolher, em cima, para que zona vai a medição.'
      : !convertida
        ? 'Primeiro, medir a fachada até ao fim, no passo\u00a04.'
        : !convertida.ok
          ? convertida.motivo
          : null;

  const usar = () => {
    if (!medicao || razao) return;
    setErro(null);
    const nome = zona ? nomeDaZona(zona) : nomeNovo.trim() || SURFACE_KIND_LABELS[tipoNovo];
    const alvo = zona ? { id: zona.id } : { nova: { kind: tipoNovo, descricao: nomeNovo.trim() || null } };
    comecar(async () => {
      // Sem rede, ou com o servidor em baixo, a ação rebenta em vez de responder: diz-se aqui, com a medição
      // ainda na ferramenta para tentar de novo — e não na página inteira, que perdia a medição.
      const r = await gravarMedicaoDaFotografia(requestId, alvo, medicao).catch(() => null);
      if (!r) {
        setErro('Não foi possível gravar a medição. Verifique a ligação e tente de novo: a medição continua aqui.');
        return;
      }
      // Aviso por tentar partilhar contactos no nome da zona: o mesmo diálogo dos formulários (useFormAction).
      if (r.strike) window.dispatchEvent(new CustomEvent('qp:strike', { detail: r.strike }));
      if (!r.ok) {
        setErro(r.message ?? 'Não foi possível gravar a medição.');
        return;
      }
      router.refresh();
      aoGravar({
        zonaId: r.zonaId ?? zona?.id ?? '',
        zona: nome,
        mensagem: r.message ?? 'Gravado.',
        areaCm2: convertida?.ok ? convertida.areaDiretaCm2 : 0,
      });
    });
  };

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
              onChange={(ev) => {
                setZonaId(ev.target.value);
                setErro(null);
              }}
              className="campo w-auto min-w-[15rem] max-w-full bg-white"
            >
              {porEscolher && (
                <option value={ESCOLHER} disabled>
                  Escolher a zona
                </option>
              )}
              {mediveis.map((z) => {
                const estado = estadoNaFerramenta(z);
                return (
                  <option key={z.id} value={z.id} disabled={!aceitaMedicao(z)}>
                    {numero[z.id] ? `${numero[z.id]} · ` : ''}
                    {nomeDaZona(z)}
                    {estado && ` — ${estado}`}
                  </option>
                );
              })}
              <option value="">Uma zona nova</option>
            </select>
            {zona && zona.areaCm2 > 0 && (
              <p className="text-[15px] tabular-nums text-slate-600">
                Hoje: {formatArea(zona.areaCm2)}
                {zona.origemDaQuantidade && `, ${origemEmTexto(zona.origemDaQuantidade, zona.margemBps).toLowerCase()}`}
                {zona.confirmacao === 'por_confirmar' ? (
                  <span className="text-amber-800"> · {CONFIRMACAO_LABELS.por_confirmar.toLowerCase()}</span>
                ) : (
                  ` · ${CONFIRMACAO_LABELS.confirmada.toLowerCase()}`
                )}
              </p>
            )}
            {zona && zona.areaCm2 <= 0 && <p className="text-[15px] text-slate-600">Hoje: sem medidas.</p>}
          </div>
          {avisoInicial && zonaId === valorInicial && <p className="mt-2 max-w-[54ch] text-[15px] text-amber-800">{avisoInicial}</p>}
          {!zona && !porEscolher && (
            <div className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-[auto_minmax(0,14rem)_auto_minmax(0,18rem)] sm:items-center">
              <label htmlFor="ferramenta-tipo" className="text-[15px] font-medium text-slate-700">
                Tipo
              </label>
              <select
                id="ferramenta-tipo"
                value={tipoNovo}
                onChange={(ev) => setTipoNovo(ev.target.value as SurfaceKind)}
                className="campo bg-white"
              >
                {TIPOS_MEDIVEIS_NA_FOTOGRAFIA.map((k) => (
                  <option key={k} value={k}>
                    {SURFACE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
              <label htmlFor="ferramenta-nome" className="text-[15px] font-medium text-slate-700">
                Nome da zona
              </label>
              <input
                id="ferramenta-nome"
                value={nomeNovo}
                onChange={(ev) => setNomeNovo(ev.target.value)}
                maxLength={200}
                placeholder={`Por exemplo, ${tipoNovo === 'fachada' ? 'Tardoz' : SURFACE_KIND_LABELS[tipoNovo]}`}
                className="campo"
              />
            </div>
          )}
        </div>
        <BotaoFechar rotulo="Fechar a ferramenta" aoCarregar={aoFechar} />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0">
            <SeFalhar>
              <MedirFachada aoMudarMedicao={setMedicao} noPedido />
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
        <div className="max-w-[62ch] text-[15px]" aria-live="polite">
          {erro ? (
            <p className="text-amber-800" role="alert">
              {erro}
            </p>
          ) : convertida?.ok && !porEscolher ? (
            // O que «Usar esta medição» faz, antes de se carregar: numa zona com número, diz que o substitui.
            <p className="tabular-nums text-slate-700">
              {fraseDaGravacao(convertida, zona && { ...zona, nome: nomeDaZona(zona) }, nomeNovo)}
            </p>
          ) : (
            <p className="text-slate-600">
              A zona fica <span className="text-tinta-900">medida pelo cliente</span>, com a margem de erro da medição (± %), e por
              confirmar no local.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button type="button" onClick={aoFechar} className="btn-quiet">
            Fechar
          </button>
          <button
            type="button"
            onClick={usar}
            disabled={!!razao || aGravar}
            aria-describedby={razao ? 'ferramenta-porque' : undefined}
            className="btn-primary btn-desativado"
          >
            {aGravar ? 'A gravar…' : 'Usar esta medição'}
          </button>
          {razao && (
            <span id="ferramenta-porque" className="max-w-[44ch] text-[15px] text-slate-600">
              {razao}
            </span>
          )}
        </div>
      </footer>
    </>
  );
}
