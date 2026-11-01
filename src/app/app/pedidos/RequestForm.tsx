'use client';

import { useState, type ReactNode } from 'react';
import type { FormState } from '@/app/app/actions';
import { Field, selectClass } from '@/components/Field';
import {
  DATA_FLEXIVEL_LABELS,
  DESIRED_WORKS,
  DESIRED_WORK_LABELS,
  VIA_PUBLICA,
  VIA_PUBLICA_LABELS,
  WORKS_MODES,
  WORKS_MODE_LABELS,
  WORK_TYPES,
  WORK_TYPE_LABELS,
  type DataFlexivel,
} from '@/domain/request';
import { useFormAction } from '@/components/useFormAction';
import { EstadoDeGravacao } from '@/components/EstadoDeGravacao';
import { useSeccaoActiva } from '@/app/app/pedidos/[id]/PedidoEmSeccoes';
import { EscolherProdutos, type ProdutoEscolhivel } from '@/components/EscolherProdutos';
import type { Preference } from '@/domain/reference';

export interface RequestInitial {
  building_id: string;
  titulo: string;
  tipo_obra: string;
  tipos_obra?: string[] | null;
  datas_flexiveis?: string[] | null;
  descricao: string;
  trabalhos: string[];
  cor_acabamento: string | null;
  prazo_propostas: string | null;
  execucao_desde: string | null;
  execucao_ate: string | null;
  ocupacao_via_publica?: string;
  produtos_preferidos?: Preference[];
  trabalhos_modo?: string;
}

interface Props {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  buildings: { id: string; nome_interno: string }[];
  initial?: RequestInitial;
  disabled?: boolean;
  /** Mostra o «Guardar e publicar» ao lado do «Guardar». Só num rascunho, e só a quem o gere. */
  podePublicar?: boolean;
  references?: ProdutoEscolhivel[];
}

const DESCRICAO_MAX = 1500;

/**
 * O formulário do pedido em grelha de quadros (promotor, 01/11/2026: «tudo no mesmo ecrã, ocupando a
 * largura disponível, quadros bonitos, ambiente clean»). Cinco quadros numerados — local, o que
 * pretende, prazos, descrição, preferências — na mesma página, em vez de uma coluna de campos.
 *
 * Os mesmos campos, com os mesmos nomes, vão para a mesma acção: o servidor não mudou. Em modo de
 * secções (`PedidoEmSeccoes`, no rascunho já criado) cada quadro só aparece na sua secção, e perde
 * a moldura porque a secção já tem a sua. Esconde-se, não se desmonta: mudar de secção não perde
 * o que está escrito.
 */
export function RequestForm({ action: submit, buildings, initial, disabled, podePublicar = false, references = [] }: Props) {
  const seccao = useSeccaoActiva();
  // Desde 01/11/2026 o formulário é sempre a grelha: na criação e no passo «O essencial» do rascunho.
  const grelha = true;
  const { state, pending, repetir, formProps } = useFormAction<FormState>(submit, { errors: {} });
  const e = state.errors;
  // Pedidos criados antes de 28/10/2026 só têm o tipo principal; valem por uma escolha de um só tipo.
  const tiposIniciais = initial?.tipos_obra?.length ? initial.tipos_obra : initial ? [initial.tipo_obra] : ['fachadas'];
  const flexiveisIniciais = initial?.datas_flexiveis ?? [];
  const [descricao, setDescricao] = useState(initial?.descricao ?? '');

  const flexivel = (d: DataFlexivel) => (
    <label className="flex min-h-[44px] items-start gap-2 text-[15px] text-slate-600">
      <input type="checkbox" name="dataFlexivel" value={d} defaultChecked={flexiveisIniciais.includes(d)} className="mt-1" />
      {DATA_FLEXIVEL_LABELS[d]}
    </label>
  );

  return (
    <form {...formProps} className="space-y-5">
      <fieldset disabled={disabled} className={grelha ? 'grid gap-5 lg:grid-cols-12' : 'space-y-6'}>
        {/* 01 · Local e identificação */}
        <Quadro n="01" titulo="Local e identificação" sub="O prédio e um nome para este pedido." moldura={grelha} className="lg:col-span-3">
          <div className="space-y-4">
            <Field name="buildingId" label="Prédio" required error={e.buildingId}>
              <select name="buildingId" required defaultValue={initial?.building_id ?? buildings[0]?.id} className={selectClass}>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome_interno}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="titulo" label="Nome interno do pedido" required defaultValue={initial?.titulo} error={e.titulo} hint="Só a sua equipa o vê. Por exemplo: Fachadas 2027." />
          </div>
        </Quadro>

        {/* 02 · O que pretende fazer */}
        <Quadro n="02" titulo="O que pretende fazer?" sub="Os tipos de obra e o principal objetivo." moldura={grelha} className="lg:col-span-6">
          <fieldset>
            <legend className="text-[15px] font-semibold text-slate-700">
              Tipos de obra <span className="font-normal text-slate-500">(pode escolher vários)</span>
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {WORK_TYPES.map((t) => (
                <Pastilha key={t}>
                  <input type="checkbox" name="tipoObra" value={t} defaultChecked={tiposIniciais.includes(t)} className="sr-only" />
                  <Visto />
                  {WORK_TYPE_LABELS[t]}
                </Pastilha>
              ))}
            </div>
            {e.tipoObra && (
              <p className="mt-1 text-[15px] text-red-700" role="alert">
                {e.tipoObra}
              </p>
            )}
          </fieldset>
          <Objectivos descricao={descricao} setDescricao={setDescricao} />
        </Quadro>

        {/* 03 · Prazos */}
        <Quadro n="03" titulo="Prazos" sub="Até quando recebe propostas e quando quer a obra." moldura={grelha} className="lg:col-span-3">
          <div className={grelha ? 'space-y-4' : 'grid gap-5 sm:grid-cols-3'}>
            <div>
              <Field name="prazoPropostas" label="Receber propostas até" type="date" defaultValue={initial?.prazo_propostas ?? undefined} error={e.prazoPropostas} hint="Pelo menos 7 dias." />
              {flexivel('propostas')}
            </div>
            <div>
              <Field name="execucaoDesde" label="Obra a partir de" type="date" defaultValue={initial?.execucao_desde ?? undefined} error={e.execucaoDesde} />
              {flexivel('execucao_desde')}
            </div>
            <div>
              <Field name="execucaoAte" label="Obra até" type="date" defaultValue={initial?.execucao_ate ?? undefined} error={e.execucaoAte} />
              {flexivel('execucao_ate')}
            </div>
          </div>
        </Quadro>

        {/* 04 · Descrição */}
        <Quadro n="04" titulo="Descrição da obra" sub="O que os pintores vão ler." moldura={grelha} className="lg:col-span-8">
          <Field
            name="descricao"
            label="Descrição para os pintores"
            error={e.descricao}
            hint="Estado atual, problemas observados, o que pretende. Sem morada, nomes nem contactos: são revelados só depois da escolha."
          >
            <textarea
              name="descricao"
              rows={grelha ? 6 : 5}
              value={descricao}
              onChange={(ev) => setDescricao(ev.target.value)}
              maxLength={DESCRICAO_MAX}
              className="mt-1 campo"
            />
          </Field>
          <p className="mt-1 text-right text-[13px] text-slate-500">
            {descricao.length}/{DESCRICAO_MAX}
          </p>

          {/*
            As opções técnicas recolhem-se até serem precisas (promotor, 30/10/2026): primário,
            impermeabilização e regras entre zonas não são perguntas para quem só sabe que a tinta
            está a descascar. Quem as conhece abre isto; quem não as conhece não tropeça nelas.
          */}
          <details className="mt-3 rounded-lg border border-slate-200 px-4">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between text-[15px] font-semibold text-tinta-800">
              Especificar trabalhos
              <span className="text-[13px] font-normal text-slate-500">Opcional</span>
            </summary>
            <div className="space-y-5 pb-4 pt-2">
              <fieldset>
                <legend className="text-[15px] font-semibold text-slate-700">Trabalhos pretendidos</legend>
                <div className="mt-2 grid gap-2 text-[17px] sm:grid-cols-3">
                  {DESIRED_WORKS.map((w) => (
                    <label key={w} className="flex min-h-[44px] items-center gap-2">
                      <input type="checkbox" name="trabalhos" value={w} defaultChecked={initial?.trabalhos.includes(w)} />
                      {DESIRED_WORK_LABELS[w]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-[15px] font-semibold text-slate-700">Os trabalhos são iguais em todas as fachadas ou zonas?</legend>
                <div className="mt-2 space-y-1 text-[17px]">
                  {WORKS_MODES.map((m) => (
                    // Regra 17: o alvo é a etiqueta inteira, e tem 44px — o círculo do rádio tem 20 e
                    // ninguém o acerta com o dedo numa obra.
                    <label key={m} className="flex min-h-[44px] items-center gap-2">
                      <input type="radio" name="trabalhosModo" value={m} defaultChecked={(initial?.trabalhos_modo ?? 'iguais') === m} />
                      {WORKS_MODE_LABELS[m]}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-[15px] text-slate-500">
                  Com diferenças, é possível indicar, em cada zona, os trabalhos que só nela se aplicam (depois de guardar, ao acrescentar zonas).
                </p>
              </fieldset>
            </div>
          </details>
        </Quadro>

        {/* 05 · Preferências opcionais */}
        <Quadro n="05" titulo="Preferências" sub="Opcional. Cor, produtos e via pública." moldura={grelha} className="lg:col-span-4">
          <div className="space-y-4">
            <Field name="corAcabamento" label="Cor e acabamento" defaultValue={initial?.cor_acabamento ?? undefined} error={e.corAcabamento} hint="Por exemplo: manter as cores atuais, acabamento mate." />
            {references.length > 0 && <EscolherProdutos produtos={references} inicial={initial?.produtos_preferidos ?? []} />}
            <Field
              name="ocupacaoViaPublica"
              label="Ocupação da via pública"
              error={e.ocupacaoViaPublica}
              info="As licenças camarárias dos trabalhos (incluindo a via pública) são obtidas pelo pintor. Licenciamento especial, como alterar janelas ou a fachada, é da responsabilidade do cliente."
            >
              <select name="ocupacaoViaPublica" defaultValue={initial?.ocupacao_via_publica ?? 'a_avaliar'} className={selectClass}>
                {VIA_PUBLICA.map((v) => (
                  <option key={v} value={v}>
                    {VIA_PUBLICA_LABELS[v]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Quadro>
      </fieldset>

      <EstadoDeGravacao pending={pending} ok={state.ok} mensagem={state.message} repetir={repetir} />
      {/*
        Os botões sabem em que secção estão. Nas secções de dados, guarda-se; na de publicar,
        guarda-se **e** publica-se, que é o mesmo gesto. Mostrar os dois em todo o lado punha duas
        acções principais no mesmo ecrã e deixava o cliente a escolher entre elas sem saber a
        diferença.
      */}
      {!disabled && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {seccao !== 'publicar' && (
            <button type="submit" disabled={pending} className="btn-primary btn-lg">
              {pending ? 'A guardar…' : initial ? 'Guardar e continuar' : 'Criar pedido e continuar para as medidas'}
            </button>
          )}
          {/*
            Um segundo `submit` **deste mesmo formulário**, e não um botão noutro sítio da página.
            É a correcção do defeito de 30/10/2026: o texto novo vivia aqui, o botão de publicar
            vivia noutro formulário, e ao ser carregado só enviava o seu — o servidor validava a
            descrição antiga e recusava com razão, enquanto do lado de cá o botão parecia avariado.
            `useFormAction` já inclui o botão carregado nos dados enviados.
          */}
          {podePublicar && seccao === 'publicar' && (
            <button type="submit" name="accao" value="publicar" disabled={pending} className="btn-primary">
              {pending ? 'A guardar e publicar…' : 'Guardar e publicar'}
            </button>
          )}
        </div>
      )}
    </form>
  );
}

/** Um quadro numerado da grelha. Sem moldura dentro de uma secção, que já tem a sua. */
function Quadro({
  n,
  titulo,
  sub,
  moldura,
  className,
  children,
}: {
  n: string;
  titulo: string;
  sub: string;
  moldura: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={moldura ? `rounded-2xl border border-slate-200 bg-white p-5 ${className ?? ''}` : ''}>
      <header className="flex items-baseline gap-2">
        <span className="text-[15px] font-semibold text-tinta-600">{n}</span>
        <span className="text-[15px] text-slate-400">·</span>
        <h2 className="text-[17px] font-semibold text-tinta-900">{titulo}</h2>
      </header>
      <p className="mt-0.5 text-[15px] text-slate-500">{sub}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Pastilha seleccionável (checkbox escondido): a etiqueta inteira é o alvo, com 44px. */
function Pastilha({ children }: { children: ReactNode }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px] font-medium text-slate-700 hover:border-tinta-600 has-[:checked]:border-tinta-600 has-[:checked]:bg-selected has-[:checked]:text-tinta-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-tinta-600">
      {children}
    </label>
  );
}

/** O visto da pastilha: só aparece quando o checkbox irmão está marcado. */
function Visto() {
  return (
    <span aria-hidden className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[13px] text-white [label:has(:checked)_&]:border-tinta-600 [label:has(:checked)_&]:bg-tinta-600">
      ✓
    </span>
  );
}

/**
 * Começar pelo que o cliente sabe responder.
 *
 * A secção abria em primários, impermeabilizações e regras de aplicação entre zonas — perguntas
 * para quem é do ofício. O promotor mandou começar pelo objectivo e pelos sintomas (30/10/2026),
 * e tem razão: quem telefona a um pintor não diz «quero primário», diz «a tinta está a descascar».
 *
 * **Isto não converte um sintoma numa solução técnica.** Era instrução expressa, e por isso estas
 * opções não marcam trabalhos nenhuns: escrevem uma frase na descrição, que o cliente revê e
 * corrige. A solução decide-se depois — por ele, em «Especificar trabalhos», ou pelo profissional
 * no levantamento. A pastilha fica assinalada enquanto a frase estiver na descrição.
 */
const OBJECTIVOS = [
  ['Renovar pintura', 'Queremos renovar a pintura.'],
  ['Fissuras', 'Há fissuras e tinta a descascar.'],
  ['Humidade', 'Há sinais de humidade.'],
  ['Isolamento', 'Gostaríamos de melhorar o isolamento.'],
  ['Não sei', 'Ainda não sabemos qual é a solução e precisamos de aconselhamento.'],
] as const;

function Objectivos({ descricao, setDescricao }: { descricao: string; setDescricao: (v: string) => void }) {
  const alterna = (frase: string) => {
    if (descricao.includes(frase)) {
      setDescricao(descricao.replace(frase, '').replace(/\s{2,}/g, ' ').trim());
    } else {
      setDescricao(descricao.trim() ? `${descricao.trim()} ${frase}` : frase);
    }
  };
  return (
    <fieldset className="mt-4">
      <legend className="text-[15px] font-semibold text-slate-700">
        Qual é o principal objetivo? <span className="font-normal text-slate-500">(pode escolher vários)</span>
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {OBJECTIVOS.map(([rotulo, frase]) => {
          const activo = descricao.includes(frase);
          return (
            <button
              key={rotulo}
              type="button"
              aria-pressed={activo}
              onClick={() => alterna(frase)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-3 py-2 text-[15px] font-medium ${
                activo ? 'border-tinta-600 bg-selected text-tinta-900' : 'border-slate-300 bg-white text-slate-700 hover:border-tinta-600'
              }`}
            >
              {activo && (
                <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-tinta-600 text-[13px] text-white">
                  ✓
                </span>
              )}
              {rotulo}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[13px] text-slate-500">Cada escolha escreve uma frase na descrição, para a rever e completar.</p>
    </fieldset>
  );
}
