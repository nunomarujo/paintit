'use client';

import { useState } from 'react';
import type { FormState } from '@/app/app/actions';
import { addSurface, deleteSurface, setParticipacaoDaZona, updateSurface } from '@/app/app/pedidos/actions';
import { Field, selectClass } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { EstadoDeGravacao } from '@/components/EstadoDeGravacao';
import {
  COMO_MEDIR,
  COMO_MEDIR_LABELS,
  CONFIRMACAO_LABELS,
  DESIRED_WORKS,
  DESIRED_WORK_LABELS,
  ORIGEM_DA_QUANTIDADE_LABELS,
  ORIGENS_DA_QUANTIDADE,
  PARTICIPACAO_LABELS,
  SURFACE_KINDS,
  SURFACE_KIND_LABELS,
  formatArea,
  type ComoMedir,
  type Confirmacao,
  type OrigemDaQuantidade,
  type Participacao,
  type SurfaceKind,
  type WorksMode,
} from '@/domain/request';

/**
 * As zonas do pedido: uma lista compacta, e um editor que se abre para uma de cada vez.
 *
 * ## O que estava mal
 *
 * O formulário mostrava ao mesmo tempo área, largura, altura, vãos e quantidade, sempre aberto por
 * baixo da lista. «O cliente não percebe o que deve preencher nem como esses campos se relacionam»
 * (promotor, 30/10/2026) — e tinha razão: aqueles cinco campos são três maneiras alternativas de
 * dizer a mesma coisa, e nada no ecrã dizia isso.
 *
 * ## O que passa a haver
 *
 * A lista mostra o essencial de cada zona numa linha — área, origem, confirmação — com **Editar**.
 * Acrescentar ou editar abre um editor, e a primeira pergunta é a que decide tudo o resto:
 * **como quer indicar as dimensões?** Respondida, mostram-se só os campos que ela pede.
 *
 * «Não sei as medidas» é a resposta mais importante das três: a zona fica registada, por levantar,
 * e é disso que o profissional precisa para saber o que vai medir. Sem ela, quem não sabe medir não
 * conseguia sequer dizer que a fachada existe.
 *
 * ## Dois vocabulários
 *
 * «Vãos» é palavra de ofício. O editor diz **janelas e portas a descontar**, e só entre parênteses
 * lembra o termo — quem o conhece reconhece-o, quem não o conhece não precisa dele.
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
}

const cartao = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';

/** Como a zona foi medida, deduzido do que lá está. Decide que campos o editor abre. */
const comoFoiMedida = (z: ZonaNaLista): ComoMedir =>
  z.areaDiretaCm2 !== null ? 'area' : z.larguraCm !== null && z.alturaCm !== null ? 'largura_altura' : 'nao_sei';

export function ZonasDoPedido({
  requestId,
  zonas,
  modo = 'iguais',
  podeEditar,
  doCliente,
  aoRealcar,
}: {
  requestId: string;
  zonas: ZonaNaLista[];
  modo?: WorksMode;
  podeEditar: boolean;
  /** As medidas são tarefa do cliente? Falso enquanto houver um levantamento a caminho. */
  doCliente: boolean;
  /**
   * A zona que está aberta, para quem desenhar o volume a poder acender. Nulo quando se fecha o
   * editor: o realce segue a atenção, e não fica preso à última coisa em que se tocou.
   */
  aoRealcar?: (z: ZonaNaLista | null) => void;
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  const abrir = (z: ZonaNaLista | null, id: string | null) => {
    setAberto(id);
    aoRealcar?.(z);
  };

  return (
    <div className="space-y-3">
      {zonas.length === 0 && (
        <p className="text-[17px] text-slate-600">
          {doCliente
            ? 'Ainda não há zonas. Acrescente as fachadas, muros ou outras zonas que quer pintar — mesmo que não saiba as medidas.'
            : 'As zonas serão registadas no levantamento. Pode acrescentar as que já souber.'}
        </p>
      )}

      <ul className="space-y-3">
        {zonas.map((z) => (
          <li key={z.id}>
            {aberto === z.id ? (
              <EditorDaZona
                requestId={requestId}
                zona={z}
                modo={modo}
                aoFechar={() => abrir(null, null)}
              />
            ) : (
              <LinhaDaZona
                requestId={requestId}
                zona={z}
                podeEditar={podeEditar}
                aoEditar={() => abrir(z, z.id)}
              />
            )}
          </li>
        ))}
      </ul>

      {podeEditar &&
        (aberto === 'nova' ? (
          <EditorDaZona requestId={requestId} zona={null} modo={modo} aoFechar={() => abrir(null, null)} />
        ) : (
          <button type="button" onClick={() => abrir(null, 'nova')} className="btn-secondary">
            Adicionar zona
          </button>
        ))}
    </div>
  );
}

function LinhaDaZona({
  requestId,
  zona: z,
  podeEditar,
  aoEditar,
}: {
  requestId: string;
  zona: ZonaNaLista;
  podeEditar: boolean;
  aoEditar: () => void;
}) {
  const fora = z.participacao === 'excluida';
  const porLevantar = comoFoiMedida(z) === 'nao_sei';
  return (
    <div className={`${cartao} flex flex-wrap items-start justify-between gap-3`}>
      <div className={fora ? 'text-slate-500' : undefined}>
        <p className="text-[17px] font-medium">
          {z.descricao?.trim() || SURFACE_KIND_LABELS[z.kind]}
          {z.quantidade > 1 && <span className="font-normal text-slate-600"> × {z.quantidade}</span>}
        </p>
        <p className="text-[15px] text-slate-600">
          {porLevantar ? (
            <span className="text-amber-800">Por levantar</span>
          ) : (
            <>
              {formatArea(z.areaCm2)}
              {z.origemDaQuantidade && ` · ${ORIGEM_DA_QUANTIDADE_LABELS[z.origemDaQuantidade]}`}
              {z.confirmacao === 'por_confirmar' && (
                <span className="text-amber-800"> · {CONFIRMACAO_LABELS.por_confirmar}</span>
              )}
            </>
          )}
          {z.participacao !== 'incluida' && (
            <span className={z.participacao === 'por_decidir' ? 'text-amber-800' : ''}>
              {' '}
              · {PARTICIPACAO_LABELS[z.participacao]}
            </span>
          )}
        </p>
      </div>
      {/* «Editar» é a acção da linha; as outras duas são secundárias e lêem-se como tal. Três
          botões do mesmo tamanho faziam a lista parecer uma barra de ferramentas, e o promotor
          pediu «Editar e uma acção secundária de remoção». */}
      {podeEditar && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <button type="button" onClick={aoEditar} className="btn-quiet">
            Editar
          </button>
          <form action={setParticipacaoDaZona.bind(null, requestId, z.id, fora ? 'incluida' : 'excluida')}>
            <button type="submit" className="min-h-[44px] text-[15px] text-slate-600 hover:underline">
              {fora ? 'Voltar a incluir' : 'Deixar de fora'}
            </button>
          </form>
          <form action={deleteSurface.bind(null, requestId, z.id)}>
            <button type="submit" className="min-h-[44px] text-[15px] text-slate-600 hover:text-red-700 hover:underline">
              Remover
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function EditorDaZona({
  requestId,
  zona,
  modo,
  aoFechar,
}: {
  requestId: string;
  zona: ZonaNaLista | null;
  modo: WorksMode;
  aoFechar: () => void;
}) {
  const accao = zona ? updateSurface.bind(null, requestId, zona.id) : addSurface.bind(null, requestId);
  const { state, pending, repetir, formProps } = useFormAction<FormState>(accao, { errors: {} });
  const [como, setComo] = useState<ComoMedir>(zona ? comoFoiMedida(zona) : 'area');
  const e = state.errors;
  // Fecha-se sozinho quando gravou: ficar aberto depois de guardar parece que não guardou.
  if (state.ok && !pending) setTimeout(aoFechar, 0);

  const cm = (v: number | null) => (v === null ? undefined : String(v / 100).replace('.', ','));

  return (
    <form {...formProps} className={`${cartao} space-y-4`}>
      <h3 className="text-[17px] font-semibold">{zona ? 'Editar zona' : 'Nova zona'}</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="kind" label="Que zona é" required error={e.kind}>
          <select name="kind" required defaultValue={zona?.kind ?? 'fachada'} className={selectClass}>
            {SURFACE_KINDS.map((k) => (
              <option key={k} value={k}>
                {SURFACE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          name="descricao"
          label="Como lhe chama"
          error={e.descricao}
          hint="Ex.: fachada da frente; tardoz, com fissuras."
          defaultValue={zona?.descricao ?? undefined}
          info="Como o pintor vai reconhecer esta zona na lista e nas fotografias. Nunca a morada nem o número de porta."
        />
      </div>

      {/* A pergunta que decide o resto do editor. */}
      <fieldset>
        <legend className="text-[17px] font-medium">Como quer indicar as dimensões?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {COMO_MEDIR.map((c) => (
            <label
              key={c}
              className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[17px] ${
                como === c ? 'border-tinta-600 bg-tinta-50 font-medium' : 'border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="comoMedir"
                value={c}
                checked={como === c}
                onChange={() => setComo(c)}
              />
              {COMO_MEDIR_LABELS[c]}
            </label>
          ))}
        </div>
      </fieldset>

      {como === 'area' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="area"
            label="Área (m²)"
            inputMode="text"
            error={e.area}
            defaultValue={cm(zona?.areaDiretaCm2 ?? null)}
          />
          <Quantidade zona={zona} erro={e.quantidade} />
        </div>
      )}

      {como === 'largura_altura' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="largura" label="Largura (m)" inputMode="text" error={e.largura} defaultValue={cm(zona?.larguraCm ?? null)} />
          <Field
            name="altura"
            label="Altura (m)"
            inputMode="text"
            error={e.altura}
            hint="Do chão ao remate da zona, não do prédio inteiro."
            defaultValue={cm(zona?.alturaCm ?? null)}
          />
          <Field
            name="vaos"
            label="Janelas e portas a descontar (m²)"
            inputMode="text"
            error={e.vaos}
            hint="Opcional. Some a área das janelas e portas desta zona; é descontada do total. (Nos orçamentos chamam-lhe «vãos».)"
            defaultValue={cm(zona?.vaosCm2 ?? null)}
          />
          <Quantidade zona={zona} erro={e.quantidade} />
        </div>
      )}

      {como === 'nao_sei' && (
        <p className="text-[17px] text-slate-700">
          A zona fica registada <strong>por levantar</strong>. É disso que o profissional precisa para saber o que vai
          medir — e não entra no total enquanto não houver um número.
        </p>
      )}

      {como !== 'nao_sei' && (
        <Field
          name="origemQuantidade"
          label="Como chegou a este número?"
          error={e.origemQuantidade}
          info="O pintor usa isto para saber com que margem pode contar. Uma estimativa honesta vale mais do que uma medida inventada."
        >
          <select
            name="origemQuantidade"
            defaultValue={zona?.origemDaQuantidade ?? 'estimativa'}
            className={selectClass}
          >
            {ORIGENS_DA_QUANTIDADE.map((o) => (
              <option key={o} value={o}>
                {ORIGEM_DA_QUANTIDADE_LABELS[o]}
              </option>
            ))}
          </select>
        </Field>
      )}

      {modo === 'diferencas' && (
        <fieldset>
          <legend className="text-[17px] font-medium">Trabalhos só desta zona</legend>
          <p className="text-[15px] text-slate-600">
            Opcional. Só se esta zona levar trabalhos diferentes dos do resto do pedido.
          </p>
          <div className="mt-2 grid gap-2 text-[17px] sm:grid-cols-3">
            {DESIRED_WORKS.map((w) => (
              <label key={w} className="flex min-h-[44px] items-center gap-2">
                <input
                  type="checkbox"
                  name="trabalhosZona"
                  value={w}
                  defaultChecked={zona?.trabalhos?.includes(w) ?? false}
                />
                {DESIRED_WORK_LABELS[w]}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <EstadoDeGravacao pending={pending} ok={state.ok} mensagem={state.message} repetir={repetir} />

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          Guardar zona
        </button>
        <button type="button" onClick={aoFechar} className="btn-quiet">
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** A quantidade só aparece onde tem significado: zonas repetidas e iguais. */
function Quantidade({ zona, erro }: { zona: ZonaNaLista | null; erro?: string }) {
  return (
    <Field
      name="quantidade"
      label="Quantas zonas iguais a esta"
      inputMode="numeric"
      defaultValue={String(zona?.quantidade ?? 1)}
      error={erro}
      hint="Ex.: 8 varandas com a mesma medida. Deixe 1 se for uma só."
    />
  );
}
