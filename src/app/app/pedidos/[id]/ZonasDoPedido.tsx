'use client';

import { useCallback, useState, type ReactNode } from 'react';
import type { FormState } from '@/app/app/actions';
import { addSurface, deleteSurface, setParticipacaoDaZona, updateSurface } from '@/app/app/pedidos/actions';
import { useFormAction } from '@/components/useFormAction';
import { useConfirmacao } from '@/components/Confirmar';
import { EstadoDeGravacao } from '@/components/EstadoDeGravacao';
import { Dica } from '@/components/Dica';
import {
  COMO_MEDIR,
  COMO_MEDIR_LABELS,
  CONFIRMACAO_LABELS,
  DESIRED_WORKS,
  PARTICIPACOES,
  DESIRED_WORK_LABELS,
  ORIGEM_DA_QUANTIDADE_LABELS,
  ORIGENS_ESCOLHIVEIS,
  SURFACE_KINDS,
  SURFACE_KIND_LABELS,
  confirmacaoDaOrigem,
  formatArea,
  parseHundredths,
  type ComoMedir,
  type Confirmacao,
  type OrigemDaQuantidade,
  type Participacao,
  type SurfaceKind,
  type WorksMode,
} from '@/domain/request';
import { aceitaMedicaoDaFotografia, medeSeNaFotografia, origemEmTexto } from '@/domain/medicaoDaFotografia';
import { contaDaZona, nomeDaZona } from '@/domain/respostaDasZonas';

/**
 * As zonas do pedido: o cartão de cada uma (no quadro do passo 2) e o editor que se abre na gaveta.
 *
 * ## O editor
 *
 * A primeira pergunta é a que decide o resto: **como indicar as dimensões** — a área, a largura e a
 * altura, ou «não sei as medidas». Respondida, mostram-se só os campos que ela pede (promotor,
 * 30/10/2026: cinco campos ao mesmo tempo eram três maneiras de dizer a mesma coisa). «Não sei as
 * medidas» é a resposta mais importante das três: a zona fica registada, por levantar.
 *
 * Desde 05/11/2026 (proposta A, trazida para a B) o editor faz a conta à vista: «10 × 11,2 − 14 =
 * 98 m²», e diz logo se o número fica por confirmar. A conta é a de `surfaceArea`, escrita por
 * `contaDaZona` — o cartão e o editor nunca dão números diferentes.
 *
 * ## Um só modo de gravar
 *
 * Tudo o que se muda na gaveta grava com «Guardar zona» — as medidas e também se a zona entra no
 * pedido (incluída, por decidir, fora). Até 05/11/2026 a participação gravava ao toque, ao lado de um
 * formulário que esperava pelo «Guardar» (guia, §8.2: nunca os dois modos na mesma vista). O
 * «Guardar» chama as duas ações de sempre, `updateSurface` e, se a participação mudou,
 * `setParticipacaoDaZona` — sem lhes mudar a assinatura. «Remover a zona», que apaga, fica à parte, no
 * fim, e pede confirmação com o nome da zona; depois de remover, a gaveta fecha.
 *
 * ## Dois vocabulários
 *
 * «Vãos» é palavra de ofício: o editor diz **janelas e portas a descontar** e só na ajuda lembra o
 * termo. E os textos tratam o leitor sem «tu» nem «você» (regra 12): «Nome da zona», «De onde vem
 * este número», «Como indicar as dimensões».
 */

export interface ZonaNaLista {
  id: string;
  kind: SurfaceKind;
  descricao: string | null;
  areaCm2: number;
  areaDiretaCm2: number | null;
  larguraCm: number | null;
  alturaCm: number | null;
  vaosCm2: number | null;
  quantidade: number;
  participacao: Participacao;
  origemDaQuantidade: OrigemDaQuantidade | null;
  confirmacao: Confirmacao;
  trabalhos: string[] | null;
  /** Margem de erro em pontos-base: só nas zonas medidas pelo cliente na fotografia (06/11/2026). */
  margemBps?: number | null;
}

/** Como a zona foi medida, deduzido do que lá está. Decide que campos o editor abre. */
export const comoFoiMedida = (z: Pick<ZonaNaLista, 'areaDiretaCm2' | 'larguraCm' | 'alturaCm'>): ComoMedir =>
  z.areaDiretaCm2 !== null ? 'area' : z.larguraCm !== null && z.alturaCm !== null ? 'largura_altura' : 'nao_sei';

/** A conta da zona, na forma do cartão: «12 × 11,5 m − 20 m²», «6 × 1 m²». */
export const contaNoCartao = (z: ZonaNaLista) =>
  contaDaZona(
    { areaDireta: z.areaDiretaCm2, larguraCm: z.larguraCm, alturaCm: z.alturaCm, vaosCm2: z.vaosCm2, quantidade: z.quantidade },
    { unidades: true },
  );

// --- O que se vê de uma zona no desenho, e a sua amostra -------------------------------------------

/**
 * O estado de uma zona no desenho. O cobalto cheio é só da zona aberta ou apontada; uma zona a pintar
 * leva o cobalto pálido; uma por decidir, um contorno tracejado sobre fundo pálido; uma fora do
 * pedido, cinzento (juiz, 05/11/2026: a hachura grossa da maqueta lia-se como cobalto cheio).
 */
export type EstadoNoDesenho = 'aberta' | 'incluida' | 'por_decidir' | 'excluida';

export const CLASSE_DO_ESTADO: Record<EstadoNoDesenho, string> = {
  aberta: 'fill-tinta-500 stroke-tinta-800',
  incluida: 'fill-tinta-200 stroke-tinta-700',
  por_decidir: 'fill-tinta-100 stroke-tinta-700',
  excluida: 'fill-slate-100 stroke-slate-400',
};
export const TRACEJADO_DO_ESTADO: Partial<Record<EstadoNoDesenho, string>> = { por_decidir: '4 3' };

const NOME_DO_ESTADO: Record<EstadoNoDesenho, string> = {
  aberta: 'aberta',
  incluida: 'a pintar',
  por_decidir: 'por decidir',
  excluida: 'fora do pedido',
};

/** A marca da zona no desenho, em pequeno: a legenda do desenho, posta ao lado da zona que explica. */
export function Amostra({ estado }: { estado: EstadoNoDesenho }) {
  return (
    <svg
      width="14"
      height="12"
      viewBox="0 0 14 12"
      role="img"
      aria-label={`No desenho: ${NOME_DO_ESTADO[estado]}`}
      className="mr-1.5 inline-block shrink-0 align-[-1px]"
    >
      <rect
        x="0.75"
        y="0.75"
        width="12.5"
        height="10.5"
        rx="2"
        className={CLASSE_DO_ESTADO[estado]}
        strokeWidth="1.2"
        strokeDasharray={TRACEJADO_DO_ESTADO[estado] ? '2.5 1.8' : undefined}
      />
    </svg>
  );
}

/** O número de uma zona: o mesmo no desenho, no cartão e nas fotografias. */
export function Pino({
  n,
  fora,
  aceso,
  pequeno,
  className,
}: {
  n: number;
  fora?: boolean;
  aceso?: boolean;
  pequeno?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] text-[13px] font-semibold tabular-nums ${
        pequeno ? 'h-[22px] w-[22px]' : 'h-[26px] w-[26px]'
      } ${aceso ? 'border-tinta-800 bg-tinta-800 text-white' : fora ? 'border-slate-400 bg-white text-slate-600' : 'border-tinta-900 bg-white text-tinta-900'} ${className ?? ''}`}
    >
      {n}
    </span>
  );
}

// --- O cartão de uma zona ---------------------------------------------------------------------------

/**
 * O estado de uma zona numa linha, em partes: o que é, de onde vem o número e o que falta. Âmbar só no
 * que falta (regra 13) — e «por confirmar» só falta numa zona incluída: nas varandas por decidir, a
 * decisão vem primeiro.
 */
export function partesDoEstado(z: ZonaNaLista): { texto: string; falta: boolean }[] {
  const partes: { texto: string; falta: boolean }[] = [];
  const semArea = z.areaCm2 <= 0;
  if (z.participacao === 'excluida') {
    partes.push({ texto: 'Fora do pedido', falta: false });
    partes.push({ texto: semArea ? 'sem medidas' : `${formatArea(z.areaCm2)} fora do total`, falta: false });
    return partes;
  }
  if (z.participacao === 'por_decidir') partes.push({ texto: 'Por decidir', falta: true });
  if (semArea) {
    partes.push({ texto: partes.length > 0 ? 'por levantar' : 'Por levantar', falta: z.participacao === 'incluida' });
    return partes;
  }
  if (z.origemDaQuantidade) {
    // «Medida pelo cliente ± 1,7 %»: a margem vai sempre com a medição da fotografia.
    const o = origemEmTexto(z.origemDaQuantidade, z.margemBps);
    partes.push({ texto: partes.length > 0 ? o.toLowerCase() : o, falta: false });
  }
  partes.push({
    texto: CONFIRMACAO_LABELS[z.confirmacao].toLowerCase(),
    falta: z.confirmacao === 'por_confirmar' && z.participacao === 'incluida',
  });
  return partes;
}

function EstadoDaZona({ z }: { z: ZonaNaLista }) {
  return (
    <>
      {partesDoEstado(z).map((p, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          <span className={p.falta ? 'text-amber-800' : undefined}>{p.texto}</span>
        </span>
      ))}
    </>
  );
}

export function estadoNoDesenho(z: Pick<ZonaNaLista, 'participacao'>, aberta: boolean): EstadoNoDesenho {
  if (aberta) return 'aberta';
  return z.participacao;
}

/**
 * Uma zona como cartão: o número, o nome, a área e o estado. Carregar no nome abre o editor; o cartão
 * inteiro é a área do clique (o `after` do botão estica-se a ele), e as decisões que faltam — incluir
 * as varandas, voltar a incluir o muro — ficam por cima, com botões seus.
 *
 * `compacto` é para as chamadas, à volta do desenho: a coluna é estreita e a altura tem de ser
 * previsível, por isso o nome e o estado cortam a duas linhas e a conta a uma.
 */
export function CartaoDaZona({
  requestId,
  zona: z,
  n,
  aberta,
  apontada,
  podeEditar,
  compacto = false,
  aoAbrir,
  aoApontar,
}: {
  requestId: string;
  zona: ZonaNaLista;
  /** O número no desenho; nulo para as zonas que o desenho não mostra. */
  n: number | null;
  aberta: boolean;
  apontada: boolean;
  podeEditar: boolean;
  compacto?: boolean;
  aoAbrir: () => void;
  aoApontar: (sim: boolean) => void;
}) {
  const fora = z.participacao === 'excluida';
  const conta = contaNoCartao(z);
  const nome = nomeDaZona(z);
  const corta = compacto ? 'line-clamp-2' : '';
  return (
    <div
      data-zona={z.id}
      onMouseEnter={() => aoApontar(true)}
      onMouseLeave={() => aoApontar(false)}
      onFocus={() => aoApontar(true)}
      onBlur={() => aoApontar(false)}
      className={`relative rounded-lg border bg-white py-2.5 transition-colors ${compacto ? 'px-3' : 'px-3.5'} ${
        aberta ? 'border-tinta-600 bg-tinta-50' : apontada ? 'border-tinta-600' : 'border-slate-200'
      }`}
    >
      <div className={`flex items-start ${compacto ? 'gap-2.5' : 'gap-3'}`}>
        {n !== null && <Pino n={n} fora={fora} aceso={aberta || apontada} className="mt-px" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            {podeEditar ? (
              <button
                type="button"
                onClick={aoAbrir}
                aria-label={`${nome}: editar`}
                className={`min-w-0 text-left text-[17px] font-medium leading-snug after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-[3px] focus-visible:after:outline-tinta-600 ${fora ? 'text-slate-600' : 'text-tinta-900'}`}
              >
                <span className={corta}>{nome}</span>
              </button>
            ) : (
              <p className={`min-w-0 text-[17px] font-medium leading-snug ${fora ? 'text-slate-600' : 'text-tinta-900'}`}>
                <span className={corta}>{nome}</span>
              </p>
            )}
            <span
              className={`shrink-0 text-[17px] tabular-nums ${z.participacao === 'incluida' && z.areaCm2 > 0 ? 'font-semibold text-tinta-900' : 'text-slate-600'}`}
            >
              {fora || z.areaCm2 <= 0 ? <span aria-label="sem área no total">—</span> : formatArea(z.areaCm2)}
            </span>
          </div>
          <p className={`text-[15px] leading-snug text-slate-600 ${corta}`}>
            {n !== null && <Amostra estado={z.participacao} />}
            <EstadoDaZona z={z} />
          </p>
          {conta?.expressao && (
            <p className={`text-[15px] leading-snug tabular-nums text-slate-600 ${compacto ? 'truncate' : ''}`}>{conta.expressao}</p>
          )}
          {podeEditar && z.participacao !== 'incluida' && (
            // Só a decisão que falta tem botões à vista; mudar a participação de uma zona incluída e
            // remover vivem no editor. Por cima do `after` do nome: z-10.
            <div className="relative z-10 -mb-1 -ml-4 mt-0.5 flex flex-wrap">
              {z.participacao === 'por_decidir' ? (
                <>
                  <form action={setParticipacaoDaZona.bind(null, requestId, z.id, 'incluida')}>
                    <button type="submit" className="btn-quiet btn-sm">
                      Incluir
                    </button>
                  </form>
                  <form action={setParticipacaoDaZona.bind(null, requestId, z.id, 'excluida')}>
                    <button type="submit" className="btn-quiet btn-sm">
                      Deixar de fora
                    </button>
                  </form>
                </>
              ) : (
                <form action={setParticipacaoDaZona.bind(null, requestId, z.id, 'incluida')}>
                  <button type="submit" className="btn-quiet btn-sm">
                    Voltar a incluir
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- O editor de uma zona ----------------------------------------------------------------------------

/**
 * Um campo com o rótulo por cima, a ajuda por baixo e o erro em âmbar (regra 13: resolve-se). O (i)
 * fica fora do `<label>`: um `<details>` dentro de uma etiqueta abria a ajuda e punha o cursor no campo
 * ao mesmo tempo.
 */
function Campo({
  id,
  rotulo,
  erro,
  ajuda,
  info,
  sufixo,
  children,
}: {
  id: string;
  rotulo: string;
  erro?: string;
  ajuda?: ReactNode;
  info?: ReactNode;
  sufixo?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex min-h-[22px] items-center gap-2">
        <label htmlFor={id} className="text-[15px] font-medium text-slate-700">
          {rotulo}
        </label>
        {info && <Dica rotulo={`Sobre «${rotulo}»`}>{info}</Dica>}
      </div>
      <div className="relative mt-1">
        {children}
        {sufixo && (
          <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-slate-600">
            {sufixo}
          </span>
        )}
      </div>
      {ajuda && !erro && <p className="mt-1 text-[13px] text-slate-600">{ajuda}</p>}
      {erro && (
        <p className="mt-1 text-[15px] text-amber-800" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}

const emMetros = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v / 100).replace('.', ','));
const lido = (s: string) => {
  const v = parseHundredths(s);
  return v === null || Number.isNaN(v) ? null : v;
};

/**
 * O editor de uma zona, para a gaveta. `zona` nula é uma zona nova (com `tipo` já escolhido, quando
 * se chega pelo «Acrescentar» de um tipo).
 */
export function EditorDaZona({
  requestId,
  zona,
  tipo,
  modo,
  idDoFormulario,
  aoFechar,
  medir,
}: {
  requestId: string;
  zona: ZonaNaLista | null;
  tipo?: SurfaceKind;
  modo: WorksMode;
  idDoFormulario: string;
  aoFechar: () => void;
  /** Abre a ferramenta de levantamento já com esta zona escolhida (quem pode editar o pedido); numa zona
   * nova, leva o tipo e o nome já escritos aqui. */
  medir?: (doEditor: { tipo?: SurfaceKind; nome?: string }) => void;
}) {
  const zonaId = zona?.id ?? null;
  const participacaoAntes = zona?.participacao ?? null;
  // Guardar uma zona que já existe: as medidas e, se mudou, a participação — duas ações, um botão.
  const accao = useCallback(
    async (prev: FormState, form: FormData): Promise<FormState> => {
      if (!zonaId) return addSurface(requestId, prev, form);
      const r = await updateSurface(requestId, zonaId, prev, form);
      const nova = String(form.get('participacao') ?? '');
      if (r.ok && nova && nova !== participacaoAntes) await setParticipacaoDaZona(requestId, zonaId, nova);
      return r;
    },
    [requestId, zonaId, participacaoAntes],
  );
  const { state, pending, repetir, formProps } = useFormAction<FormState>(accao, { errors: {} });
  const [pedir, confirmacao] = useConfirmacao();
  const [aRemover, setARemover] = useState(false);
  const [participacao, setParticipacao] = useState<Participacao>(zona?.participacao ?? 'incluida');
  const [como, setComo] = useState<ComoMedir>(zona ? comoFoiMedida(zona) : 'area');
  const [area, setArea] = useState(emMetros(zona?.areaDiretaCm2));
  const [largura, setLargura] = useState(emMetros(zona?.larguraCm));
  const [altura, setAltura] = useState(emMetros(zona?.alturaCm));
  const [vaos, setVaos] = useState(emMetros(zona?.vaosCm2));
  const [quantidade, setQuantidade] = useState(String(zona?.quantidade ?? 1));
  // A medição pela fotografia não se escolhe à mão: vem da ferramenta, com a margem. Numa zona medida assim,
  // «manter» guarda-a como está desde que a área não mude (updateSurface, 06/11/2026).
  const medidaPeloCliente = zona?.origemDaQuantidade === 'medida_pelo_cliente';
  const [origem, setOrigem] = useState<OrigemDaQuantidade | 'manter'>(
    medidaPeloCliente ? 'manter' : (zona?.origemDaQuantidade ?? 'estimativa'),
  );
  const origemEfetiva: OrigemDaQuantidade = origem === 'manter' ? 'medida_pelo_cliente' : origem;
  const e = state.errors;
  // Fecha-se sozinho quando gravou: ficar aberto depois de guardar parece que não guardou.
  if (state.ok && !pending) setTimeout(aoFechar, 0);

  const q = /^\d+$/.test(quantidade.trim()) && Number(quantidade) >= 1 ? Number(quantidade) : 1;
  const conta =
    como === 'area'
      ? lido(area) !== null
        ? contaDaZona({ areaDireta: lido(area), larguraCm: null, alturaCm: null, vaosCm2: null, quantidade: q })
        : null
      : como === 'largura_altura'
        ? contaDaZona({ areaDireta: null, larguraCm: lido(largura), alturaCm: lido(altura), vaosCm2: lido(vaos), quantidade: q })
        : null;
  const confirmada = confirmacaoDaOrigem(origemEfetiva) === 'confirmada';

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <form id={idDoFormulario} {...formProps} className="space-y-5 px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id={`${idDoFormulario}-kind`} rotulo="Que zona é" erro={e.kind}>
              <select
                id={`${idDoFormulario}-kind`}
                name="kind"
                required
                defaultValue={zona?.kind ?? tipo ?? 'fachada'}
                className="campo bg-white"
              >
                {SURFACE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {SURFACE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo
              id={`${idDoFormulario}-descricao`}
              rotulo="Nome da zona"
              erro={e.descricao}
              ajuda="Ex.: fachada da frente; tardoz, com fissuras."
              info="Como o pintor vai reconhecer esta zona na lista e nas fotografias. Nunca a morada nem o número de porta."
            >
              <input
                id={`${idDoFormulario}-descricao`}
                name="descricao"
                defaultValue={zona?.descricao ?? ''}
                autoComplete="off"
                className="campo"
              />
            </Campo>
          </div>

          {/* A pergunta que decide o resto do editor. */}
          <fieldset>
            <legend className="text-[15px] font-medium text-slate-700">Como indicar as dimensões</legend>
            <div className="mt-1.5 grid gap-1.5">
              {COMO_MEDIR.map((c) => (
                <label
                  key={c}
                  className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-[17px] ${
                    como === c ? 'border-tinta-600 bg-tinta-50 font-medium text-tinta-900' : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <input type="radio" name="comoMedir" value={c} checked={como === c} onChange={() => setComo(c)} />
                  {COMO_MEDIR_LABELS[c]}
                </label>
              ))}
            </div>
          </fieldset>

          {como === 'area' && (
            <div className="grid grid-cols-2 gap-4">
              <Campo id={`${idDoFormulario}-area`} rotulo="Área" erro={e.area} sufixo="m²">
                <input
                  id={`${idDoFormulario}-area`}
                  name="area"
                  inputMode="decimal"
                  autoComplete="off"
                  value={area}
                  onChange={(ev) => setArea(ev.target.value)}
                  className="campo pr-10 tabular-nums"
                />
              </Campo>
              <Campo
                id={`${idDoFormulario}-quantidade`}
                rotulo="Quantas iguais"
                erro={e.quantidade}
                ajuda="Ex.: 6 varandas com a mesma medida."
              >
                <input
                  id={`${idDoFormulario}-quantidade`}
                  name="quantidade"
                  inputMode="numeric"
                  autoComplete="off"
                  value={quantidade}
                  onChange={(ev) => setQuantidade(ev.target.value)}
                  className="campo tabular-nums"
                />
              </Campo>
            </div>
          )}

          {como === 'largura_altura' && (
            <div className="grid grid-cols-2 gap-4">
              <Campo id={`${idDoFormulario}-largura`} rotulo="Largura" erro={e.largura} sufixo="m">
                <input
                  id={`${idDoFormulario}-largura`}
                  name="largura"
                  inputMode="decimal"
                  autoComplete="off"
                  value={largura}
                  onChange={(ev) => setLargura(ev.target.value)}
                  className="campo pr-9 tabular-nums"
                />
              </Campo>
              <Campo id={`${idDoFormulario}-altura`} rotulo="Altura" erro={e.altura} sufixo="m" ajuda="Do chão ao remate da zona.">
                <input
                  id={`${idDoFormulario}-altura`}
                  name="altura"
                  inputMode="decimal"
                  autoComplete="off"
                  value={altura}
                  onChange={(ev) => setAltura(ev.target.value)}
                  className="campo pr-9 tabular-nums"
                />
              </Campo>
              <Campo
                id={`${idDoFormulario}-vaos`}
                rotulo="Janelas e portas"
                erro={e.vaos}
                sufixo="m²"
                ajuda="A área a descontar. Opcional."
                info="A soma das áreas das janelas e portas desta zona, que se desconta do total. Nos orçamentos chamam-lhe «vãos»."
              >
                <input
                  id={`${idDoFormulario}-vaos`}
                  name="vaos"
                  inputMode="decimal"
                  autoComplete="off"
                  value={vaos}
                  onChange={(ev) => setVaos(ev.target.value)}
                  className="campo pr-10 tabular-nums"
                />
              </Campo>
              <Campo id={`${idDoFormulario}-quantidade2`} rotulo="Quantas iguais" erro={e.quantidade}>
                <input
                  id={`${idDoFormulario}-quantidade2`}
                  name="quantidade"
                  inputMode="numeric"
                  autoComplete="off"
                  value={quantidade}
                  onChange={(ev) => setQuantidade(ev.target.value)}
                  className="campo tabular-nums"
                />
              </Campo>
            </div>
          )}

          {como === 'nao_sei' && (
            <p className="text-[17px] text-slate-700">
              A zona fica registada <strong className="font-semibold">por levantar</strong>. É disso que o profissional precisa para saber o
              que vai medir — e não entra no total enquanto não houver um número.
            </p>
          )}

          {como !== 'nao_sei' && (
            <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Campo
                id={`${idDoFormulario}-origem`}
                rotulo="De onde vem este número"
                erro={e.origemQuantidade}
                info="O pintor usa isto para saber com que margem pode contar. Uma estimativa honesta vale mais do que uma medida inventada."
              >
                <select
                  id={`${idDoFormulario}-origem`}
                  name="origemQuantidade"
                  value={origem}
                  onChange={(ev) => setOrigem(ev.target.value as OrigemDaQuantidade | 'manter')}
                  className="campo bg-white"
                >
                  {medidaPeloCliente && <option value="manter">{origemEmTexto('medida_pelo_cliente', zona?.margemBps)}, na fotografia</option>}
                  {ORIGENS_ESCOLHIVEIS.map((o) => (
                    <option key={o} value={o}>
                      {ORIGEM_DA_QUANTIDADE_LABELS[o]}
                    </option>
                  ))}
                </select>
              </Campo>
              {/* A conta ao lado do que se escreve: o resultado vê-se logo em m². */}
              <p className="text-[15px] text-slate-600 sm:pb-2.5 sm:text-right" aria-live="polite">
                {conta ? (
                  <>
                    {conta.expressao && <span className="tabular-nums">{conta.expressao} = </span>}
                    <span className="text-[20px] font-semibold tabular-nums text-tinta-900">{formatArea(conta.resultadoCm2)}</span>
                    <span className={`block text-[13px] ${confirmada ? 'text-slate-600' : 'text-amber-800'}`}>
                      {confirmada
                        ? 'medição, conta como confirmada'
                        : `${origemEmTexto(origemEfetiva, origem === 'manter' ? zona?.margemBps : null).toLowerCase()}, fica por confirmar`}
                    </span>
                  </>
                ) : (
                  <span className="text-[15px] text-slate-600">A área aparece aqui</span>
                )}
              </p>
            </div>
          )}

          {/* Também sem medidas: uma zona por levantar pode ter o primeiro número pela fotografia. Nunca numa
              zona já confirmada (vale o que está gravado, não a origem escolhida agora no campo) nem num tipo
              que a ferramenta não mede. */}
          {medir && !confirmada && aceitaMedicaoDaFotografia(zona?.confirmacao) && (!zona || medeSeNaFotografia(zona.kind)) && (
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[15px] text-slate-600">
                {como === 'nao_sei' ? (
                  'Sem as medidas da zona: uma fachada mede-se pela fotografia e por uma medida tirada com fita (uma porta, uma janela). Fica medida pelo cliente, com a margem de erro, e por confirmar no local.'
                ) : (
                  <>
                    Um número <span className="text-amber-800">por confirmar</span> confirma-se medindo no local. Na fotografia sai uma
                    medida com margem, que continua por confirmar.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={(ev) => {
                  // Numa zona nova, o tipo e o nome já escritos aqui seguem para a ferramenta.
                  const f = ev.currentTarget.form ? new FormData(ev.currentTarget.form) : null;
                  const tipo = String(f?.get('kind') ?? '');
                  medir({
                    tipo: (SURFACE_KINDS as readonly string[]).includes(tipo) ? (tipo as SurfaceKind) : undefined,
                    nome: String(f?.get('descricao') ?? '').trim() || undefined,
                  });
                }}
                className="btn-secondary btn-sm mt-2"
              >
                Medir por fotografia
              </button>
            </div>
          )}

          {zona && (
            // Se a zona entra no pedido: grava com o resto, no «Guardar zona». Excluir não apaga.
            <fieldset>
              <legend className="text-[15px] font-medium text-slate-700">No pedido</legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {PARTICIPACOES.map((p) => (
                  <label
                    key={p}
                    className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-3 text-[17px] ${
                      participacao === p ? 'border-tinta-600 bg-tinta-50 font-medium text-tinta-900' : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="participacao"
                      value={p}
                      checked={participacao === p}
                      onChange={() => setParticipacao(p)}
                    />
                    {PARTICIPACAO_NO_EDITOR[p]}
                  </label>
                ))}
              </div>
              {participacao === 'excluida' && (
                <p className="mt-1 text-[13px] text-slate-600">Fica registada, com o que já tiver, mas não conta para o total.</p>
              )}
            </fieldset>
          )}

          {modo === 'diferencas' && (
            <fieldset>
              <legend className="text-[15px] font-medium text-slate-700">Trabalhos só desta zona</legend>
              <p className="text-[13px] text-slate-600">Opcional. Só se esta zona levar trabalhos diferentes dos do resto do pedido.</p>
              <div className="mt-1.5 grid gap-x-4 sm:grid-cols-2">
                {DESIRED_WORKS.map((w) => (
                  <label key={w} className="flex min-h-[44px] items-center gap-2.5 text-[17px]">
                    <input type="checkbox" name="trabalhosZona" value={w} defaultChecked={zona?.trabalhos?.includes(w) ?? false} />
                    {DESIRED_WORK_LABELS[w]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <EstadoDeGravacao pending={pending} ok={state.ok} mensagem={state.message} repetir={repetir} />
        </form>
        {zona && (
          // O que apaga fica à parte, no fim, e pede confirmação com o nome da zona (guia, §8.2).
          <section aria-label="Remover a zona" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-200 px-5 py-3">
            <p className="text-[15px] text-slate-600">Remover apaga a zona e as medidas dela.</p>
            <button
              type="button"
              disabled={aRemover || pending}
              onClick={async () => {
                const ok = await pedir({
                  titulo: `Remover «${nomeDaZona(zona)}»?`,
                  texto:
                    'A zona sai do pedido, com as medidas e os trabalhos. Para a deixar registada sem a pintar, escolher «Fora do pedido» e guardar.',
                  confirmar: 'Remover a zona',
                });
                if (!ok) return;
                setARemover(true);
                await deleteSurface(requestId, zona.id);
                aoFechar();
              }}
              className="btn-quiet btn-sm -mr-4 font-normal text-slate-700"
            >
              {aRemover ? 'A remover…' : 'Remover a zona'}
            </button>
          </section>
        )}
      </div>
      <footer className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-3">
        <button type="submit" form={idDoFormulario} disabled={pending || aRemover} className="btn-primary">
          Guardar zona
        </button>
        <button type="button" onClick={aoFechar} className="btn-quiet">
          Cancelar
        </button>
      </footer>
      {confirmacao}
    </>
  );
}

const PARTICIPACAO_NO_EDITOR: Record<Participacao, string> = {
  incluida: 'Incluída',
  por_decidir: 'Por decidir',
  excluida: 'Fora do pedido',
};
