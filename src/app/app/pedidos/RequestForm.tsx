'use client';

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

export function RequestForm({ action: submit, buildings, initial, disabled, podePublicar = false, references = [] }: Props) {
  const seccao = useSeccaoActiva();
  const { state, pending, repetir, formProps } = useFormAction<FormState>(submit, { errors: {} });
  const e = state.errors;
  // Pedidos criados antes de 28/10/2026 só têm o tipo principal; valem por uma escolha de um só tipo.
  const tiposIniciais = initial?.tipos_obra?.length ? initial.tipos_obra : initial ? [initial.tipo_obra] : ['fachadas'];
  const flexiveisIniciais = initial?.datas_flexiveis ?? [];
  const flexivel = (d: DataFlexivel) => (
    <label className="mt-2 flex min-h-[44px] items-start gap-2 text-[15px] font-normal text-slate-600">
      <input type="checkbox" name="dataFlexivel" value={d} defaultChecked={flexiveisIniciais.includes(d)} className="mt-0.5" />
      {DATA_FLEXIVEL_LABELS[d]}
    </label>
  );

  return (
    <form {...formProps} className="space-y-5">
      <fieldset disabled={disabled} className="space-y-5">
        {/* Grupo «O que pretende». Escondido, e não desmontado: é o que faz com que mudar de
            secção não perca nada do que está escrito. */}
        <div hidden={seccao !== 'pretende'} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="buildingId" label="Prédio" required error={e.buildingId}>
            <select name="buildingId" required defaultValue={initial?.building_id ?? buildings[0]?.id} className={selectClass}>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome_interno}
                </option>
              ))}
            </select>
          </Field>
          <Field
            name="titulo"
            label="Nome interno do pedido"
            required
            defaultValue={initial?.titulo}
            error={e.titulo}
            hint="Só a sua equipa o vê. Por exemplo: Fachadas 2027."
          />
        </div>

        <fieldset>
          <legend className="text-[17px] font-medium text-slate-700">
            Tipo de obra <span className="text-red-700">*</span>
          </legend>
          <p className="mt-1 text-[15px] text-slate-500">
            Assinale todos os que se aplicam. Uma obra pode ser exterior e interior ao mesmo tempo.
          </p>
          <div className="mt-2 grid gap-2 text-[17px] sm:grid-cols-2">
            {WORK_TYPES.map((t) => (
              <label key={t} className="flex min-h-[44px] items-center gap-2">
                <input type="checkbox" name="tipoObra" value={t} defaultChecked={tiposIniciais.includes(t)} />
                {WORK_TYPE_LABELS[t]}
              </label>
            ))}
          </div>
          {e.tipoObra && (
            <p className="mt-1 text-[15px] text-red-700" role="alert">
              {e.tipoObra}
            </p>
          )}
        </fieldset>

        <Objectivos />

        <Field
          name="descricao"
          label="Descrição para os pintores"
          error={e.descricao}
          hint="Estado atual, problemas observados, o que pretende. Não indique morada, nomes nem contactos: são revelados só depois da escolha."
        >
          <textarea
            name="descricao"
            rows={5}
            defaultValue={initial?.descricao}
            className="mt-1 campo"
          />
        </Field>

        {/*
          As opções técnicas recolhem-se até serem precisas (promotor, 30/10/2026): primário,
          impermeabilização e regras entre zonas não são perguntas para quem só sabe que a tinta
          está a descascar. Quem as conhece abre isto; quem não as conhece não tropeça nelas.
        */}
        <details className="rounded-2xl border border-slate-200 p-4">
        <summary className="min-h-[44px] cursor-pointer text-[17px] font-medium text-tinta-800">
          Especificar trabalhos
          <span className="block text-[15px] font-normal text-slate-500">
            Opcional. Se souber que trabalhos quer — lavagem, primário, impermeabilização —, indique-os aqui.
          </span>
        </summary>
        <div className="mt-4 space-y-5">
        <fieldset>
          <legend className="text-[17px] font-medium text-slate-700">Trabalhos pretendidos</legend>
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
          <legend className="text-[17px] font-medium text-slate-700">Os trabalhos são iguais em todas as fachadas ou zonas?</legend>
          <div className="mt-2 space-y-2 text-[17px]">
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
            Fotografias e problemas observados ficam sempre associados à zona.
          </p>
        </fieldset>
        </div>
        </details>
        </div>

        {/* Grupo «Preferências e prazos». */}
        <div hidden={seccao !== 'preferencias'} className="space-y-5">
        <Field
          name="corAcabamento"
          label="Cor e acabamento"
          defaultValue={initial?.cor_acabamento ?? undefined}
          error={e.corAcabamento}
          hint="Por exemplo: manter as cores atuais, acabamento mate. Pode deixar em aberto."
        />

        {references.length > 0 && (
          <EscolherProdutos produtos={references} inicial={initial?.produtos_preferidos ?? []} />
        )}

        <Field
          name="ocupacaoViaPublica"
          label="A obra prevê ocupação da via pública?"
          error={e.ocupacaoViaPublica}
          hint="As licenças camarárias dos trabalhos (incluindo a via pública) são obtidas pelo pintor. Licenciamento especial, como alterar janelas ou a fachada, é da responsabilidade do cliente."
        >
          <select name="ocupacaoViaPublica" defaultValue={initial?.ocupacao_via_publica ?? 'a_avaliar'} className={selectClass}>
            {VIA_PUBLICA.map((v) => (
              <option key={v} value={v}>
                {VIA_PUBLICA_LABELS[v]}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <Field
              name="prazoPropostas"
              label="Propostas até"
              type="date"
              defaultValue={initial?.prazo_propostas ?? undefined}
              error={e.prazoPropostas}
              hint="Pelo menos 7 dias."
            />
            {flexivel('propostas')}
          </div>
          <div>
            <Field
              name="execucaoDesde"
              label="Execução a partir de"
              type="date"
              defaultValue={initial?.execucao_desde ?? undefined}
              error={e.execucaoDesde}
            />
            {flexivel('execucao_desde')}
          </div>
          <div>
            <Field
              name="execucaoAte"
              label="Execução até"
              type="date"
              defaultValue={initial?.execucao_ate ?? undefined}
              error={e.execucaoAte}
            />
            {flexivel('execucao_ate')}
          </div>
        </div>
        </div>
      </fieldset>

      <EstadoDeGravacao pending={pending} ok={state.ok} mensagem={state.message} repetir={repetir} />
      {/*
        Os botões sabem em que secção estão. Nas secções de dados, guarda-se; na de publicar,
        guarda-se **e** publica-se, que é o mesmo gesto. Mostrar os dois em todo o lado punha duas
        acções principais no mesmo ecrã e deixava o cliente a escolher entre elas sem saber a
        diferença.
      */}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-3">
          {seccao !== 'publicar' && (
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? 'A guardar…' : initial ? 'Guardar e continuar' : 'Criar pedido'}
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
 * no levantamento.
 *
 * Por não serem guardadas, não ficam assinaladas quando se volta: o que fica é o texto que
 * produziram. Guardá-las exigiria uma coluna nova, e fica para quando o promotor quiser que o
 * pedido se lembre dos sintomas em separado da descrição.
 */
const OBJECTIVOS = [
  ['Renovar a pintura', 'Queremos renovar a pintura.'],
  ['Resolver fissuras ou tinta a descascar', 'Há fissuras e tinta a descascar.'],
  ['Resolver sinais de humidade', 'Há sinais de humidade.'],
  ['Melhorar o isolamento', 'Gostaríamos de melhorar o isolamento.'],
  ['Ainda não sei qual é a solução', 'Ainda não sabemos qual é a solução e precisamos de aconselhamento.'],
] as const;

function Objectivos() {
  const acrescenta = (frase: string) => {
    const campo = document.querySelector<HTMLTextAreaElement>('textarea[name="descricao"]');
    if (!campo || campo.value.includes(frase)) return;
    campo.value = campo.value.trim() ? `${campo.value.trim()} ${frase}` : frase;
    campo.focus();
    campo.setSelectionRange(campo.value.length, campo.value.length);
  };
  return (
    <fieldset>
      <legend className="text-[17px] font-medium text-slate-700">O que pretende fazer?</legend>
      <p className="mt-1 text-[15px] text-slate-500">
        Opcional. Carregue no que se aplica e a frase entra na descrição abaixo, para a rever e completar.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {OBJECTIVOS.map(([rotulo, frase]) => (
          <button
            key={rotulo}
            type="button"
            onClick={() => acrescenta(frase)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-[17px] hover:border-tinta-600 hover:bg-tinta-50"
          >
            {rotulo}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
