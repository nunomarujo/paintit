'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
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
import { CamposDasCaleiras } from './CamposDasCaleiras';
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
  caleiras_estado?: string | null;
  caleiras_intervencao?: string | null;
  caleiras_metros_substituir_cm?: number | null;
  caleiras_comprimento_cm?: number | null;
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
const FRAC_MIN = 0.35;
const FRAC_MAX = 0.75;

export function RequestForm({ action: submit, buildings, initial, disabled, podePublicar = false, references = [] }: Props) {
  const seccao = useSeccaoActiva();
  const { state, pending, repetir, formProps } = useFormAction<FormState>(submit, { errors: {} });
  const e = state.errors;
  // Pedidos criados antes de 28/10/2026 só têm o tipo principal; valem por uma escolha de um só tipo.
  const tiposIniciais = initial?.tipos_obra?.length ? initial.tipos_obra : initial ? [initial.tipo_obra] : ['fachadas'];
  const flexiveisIniciais = initial?.datas_flexiveis ?? [];
  const [descricao, setDescricao] = useState(initial?.descricao ?? '');
  // O campo das caleiras só aparece com o tipo marcado (como o capoto dentro de Trabalhos).
  const [temCaleiras, setTemCaleiras] = useState(tiposIniciais.includes('caleiras'));
  // Execução: «datas flexíveis» (o caso comum) ou datas indicadas. Com datas flexíveis não se pedem
  // datas nenhumas; marcam-se as duas como indicativas, que é o que o servidor já entende.
  const [indicarDatas, setIndicarDatas] = useState(!!(initial?.execucao_desde || initial?.execucao_ate));
  const [cor, setCor] = useState(initial?.cor_acabamento ?? '');
  const [via, setVia] = useState(initial?.ocupacao_via_publica ?? 'a_avaliar');
  const [nProdutos, setNProdutos] = useState(initial?.produtos_preferidos?.length ?? 0);
  // Largura da Descrição face às Preferências (fração do par), ajustável pelo puxador entre as duas
  // (promotor, 01/11/2026). Lembrada neste navegador; sem armazenamento, fica a predefinição.
  const [fracDescricao, setFracDescricao] = useState(2 / 3);
  const parRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem('pedido.fracDescricao'));
      if (v >= FRAC_MIN && v <= FRAC_MAX) setFracDescricao(v);
    } catch {}
  }, []);
  const arrastar = (ev: React.PointerEvent<HTMLDivElement>) => {
    const par = parRef.current;
    if (!par) return;
    ev.preventDefault();
    const caixa = par.getBoundingClientRect();
    const mover = (m: PointerEvent) => {
      const f = Math.min(FRAC_MAX, Math.max(FRAC_MIN, (m.clientX - caixa.left) / caixa.width));
      setFracDescricao(f);
    };
    const largar = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', largar);
      setFracDescricao((f) => {
        try { localStorage.setItem('pedido.fracDescricao', String(f)); } catch {}
        return f;
      });
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', largar);
  };

  const flexivel = (d: DataFlexivel) => (
    <label className="flex min-h-[44px] items-start gap-2 text-[15px] text-slate-600">
      <input type="checkbox" name="dataFlexivel" value={d} defaultChecked={flexiveisIniciais.includes(d)} className="mt-1" />
      {DATA_FLEXIVEL_LABELS[d]}
    </label>
  );

  return (
    <form {...formProps} className="space-y-5">
      <fieldset disabled={disabled} className="grid gap-5 lg:grid-cols-12">
        {/* 01 · Local e identificação */}
        <Quadro icone="local" titulo="Local e identificação" sub="O prédio e um nome para este pedido." className="lg:col-span-4">
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
          <div className="mt-auto flex items-start gap-3 rounded-lg bg-paper p-3 pt-4">
            <Icone nome="regua" className="mt-0.5 h-5 w-5 shrink-0 text-tinta-600" />
            <p className="text-[13px] text-slate-600">
              <span className="font-semibold text-tinta-900">Não precisa de saber medir.</span> No passo seguinte pode pedir a visita de um
              avaliador, sem custo.
            </p>
          </div>
        </Quadro>

        {/* 02 · O que pretende fazer */}
        <Quadro icone="pincel" titulo="O que pretende fazer?" sub="Os tipos de obra e o principal objetivo." className="lg:col-span-8">
          <fieldset>
            <legend className="text-[15px] font-semibold text-slate-700">
              Tipos de obra <span className="font-normal text-slate-500">(pode escolher vários)</span>
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {WORK_TYPES.map((t) => (
                <Pastilha key={t}>
                  <input
                    type="checkbox"
                    name="tipoObra"
                    value={t}
                    defaultChecked={tiposIniciais.includes(t)}
                    onChange={t === 'caleiras' ? (ev) => setTemCaleiras(ev.target.checked) : undefined}
                    className="sr-only"
                  />
                  <Icone nome={ICONE_DO_TIPO[t]} className="h-5 w-5 shrink-0 text-slate-500 [label:has(:checked)_&]:text-tinta-600" />
                  <span className="flex-1">{WORK_TYPE_LABELS[t]}</span>
                  <Visto />
                </Pastilha>
              ))}
            </div>
            {e.tipoObra && (
              <p className="mt-1 text-[15px] text-red-700" role="alert">
                {e.tipoObra}
              </p>
            )}
          </fieldset>
          {initial?.caleiras_intervencao && <input type="hidden" name="caleirasAntes" value="1" />}
          {temCaleiras && <CamposDasCaleiras initial={initial} errors={e} />}
          <Objectivos descricao={descricao} setDescricao={setDescricao} />
        </Quadro>

        {/* 03 · Prazos */}
        <Quadro icone="calendario" titulo="Prazos" sub="Até quando recebe propostas e quando quer a obra." className="lg:col-span-3">
          <div className="space-y-4">
            <div>
              <Field name="prazoPropostas" label="Receber propostas até" type="date" defaultValue={initial?.prazo_propostas ?? undefined} error={e.prazoPropostas} hint="Pelo menos 7 dias. Abrem todas no dia seguinte." />
              {flexivel('propostas')}
            </div>
            <fieldset>
              <legend className="text-[17px] font-medium text-slate-700">Execução da obra</legend>
              <div className="mt-1 grid gap-2">
                <Opcao activa={!indicarDatas} onClick={() => setIndicarDatas(false)} titulo="Datas flexíveis" sub="Sem datas definidas" />
                <Opcao activa={indicarDatas} onClick={() => setIndicarDatas(true)} titulo="Indicar datas" sub="Um período específico" />
              </div>
              {indicarDatas ? (
                <div className="mt-3 space-y-3">
                  <div>
                    <Field name="execucaoDesde" label="A partir de" type="date" defaultValue={initial?.execucao_desde ?? undefined} error={e.execucaoDesde} />
                    {flexivel('execucao_desde')}
                  </div>
                  <div>
                    <Field name="execucaoAte" label="Até" type="date" defaultValue={initial?.execucao_ate ?? undefined} error={e.execucaoAte} />
                    {flexivel('execucao_ate')}
                  </div>
                </div>
              ) : (
                <>
                  {/* Sem datas: fica registado que são flexíveis, que é o que o servidor já entende. */}
                  <input type="hidden" name="dataFlexivel" value="execucao_desde" />
                  <input type="hidden" name="dataFlexivel" value="execucao_ate" />
                  <p className="mt-2 text-[13px] text-slate-500">Os pintores propõem a data; decide-se ao comparar.</p>
                </>
              )}
            </fieldset>
          </div>
        </Quadro>

        {/* Descrição + Preferências: um par com puxador no meio para repartir a largura. */}
        <div
          ref={parRef}
          className="grid gap-5 lg:col-span-9 lg:gap-0"
          style={{ ['--frac' as string]: fracDescricao }}
          data-par-redimensionavel
        >
        <Quadro icone="texto" titulo="Descrição da obra" sub="O que os pintores vão ler. Sem morada, nomes nem contactos — são revelados só depois da escolha." className="lg:[grid-area:a]">
          <div className="relative">
            <textarea
              name="descricao"
              aria-label="Descrição para os pintores"
              aria-invalid={e.descricao ? true : undefined}
              rows={4}
              value={descricao}
              onChange={(ev) => setDescricao(ev.target.value)}
              maxLength={DESCRICAO_MAX}
              placeholder="Estado atual, problemas observados, o que pretende. Por exemplo: a tinta das fachadas está a descascar do lado norte e há fissuras junto às varandas."
              className="campo pb-8"
            />
            <span className="pointer-events-none absolute bottom-2 right-3 text-[13px] text-slate-500">
              {descricao.length}/{DESCRICAO_MAX}
            </span>
          </div>
          {e.descricao && (
            <p className="mt-1 text-[15px] text-red-700" role="alert">
              {e.descricao}
            </p>
          )}

          {/*
            As opções técnicas recolhem-se até serem precisas (promotor, 30/10/2026): primário,
            impermeabilização e regras entre zonas não são perguntas para quem só sabe que a tinta
            está a descascar. Quem as conhece abre isto; quem não as conhece não tropeça nelas.
          */}
          <details className="mt-4 rounded-lg border border-slate-200">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-3 px-4 text-[15px]">
              <Icone nome="ferramenta" className="h-5 w-5 text-slate-500" />
              <span className="flex-1 font-semibold text-tinta-900">Especificar trabalhos</span>
              <span className="text-[13px] text-slate-500">Opcional</span>
              <Seta />
            </summary>
            <div className="space-y-5 border-t border-slate-200 px-4 pb-4 pt-4">
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

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Ajustar a largura entre Descrição e Preferências"
          title="Arrastar para ajustar a largura"
          onPointerDown={arrastar}
          onDoubleClick={() => { setFracDescricao(2 / 3); try { localStorage.removeItem('pedido.fracDescricao'); } catch {} }}
          className="group hidden cursor-col-resize touch-none items-center justify-center lg:flex lg:[grid-area:h]"
        >
          <span className="h-10 w-1 rounded-full bg-slate-300 group-hover:bg-tinta-600 group-active:bg-tinta-600" />
        </div>

        {/* Preferências: linhas recolhíveis com o valor actual à vista. */}
        <Quadro icone="ajustes" titulo="Preferências" sub="Opcional. Pode deixar tudo em aberto." className="lg:[grid-area:b]">
          <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200">
            <Linha icone="cor" titulo="Cor e acabamento" valor={cor.trim() || 'Por definir'} definido={!!cor.trim()}>
              <label className="block text-[17px] font-medium text-slate-700">
                Cor e acabamento
                <input name="corAcabamento" value={cor} onChange={(ev) => setCor(ev.target.value)} aria-invalid={e.corAcabamento ? true : undefined} className="campo mt-1" />
                <span className="mt-1 block text-[15px] font-normal text-slate-500">{e.corAcabamento ?? 'Por exemplo: manter as cores atuais, acabamento mate.'}</span>
              </label>
            </Linha>
            {references.length > 0 && (
              <Linha icone="lata" titulo="Produtos preferidos" valor={nProdutos > 0 ? `${nProdutos} ${nProdutos === 1 ? 'escolhido' : 'escolhidos'}` : 'Sem preferência'} definido={nProdutos > 0}>
                <EscolherProdutos produtos={references} inicial={initial?.produtos_preferidos ?? []} compacto onChange={(e) => setNProdutos(e.length)} />
              </Linha>
            )}
            <Linha icone="estrada" titulo="Acesso e via pública" valor={via === 'sim' ? 'Prevista' : via === 'nao' ? 'Não prevista' : 'A avaliar'} definido={via !== 'a_avaliar'}>
              <Field
                name="ocupacaoViaPublica"
                label="Ocupação da via pública"
                error={e.ocupacaoViaPublica}
                info="As licenças camarárias dos trabalhos (incluindo a via pública) são obtidas pelo pintor. Licenciamento especial, como alterar janelas ou a fachada, é da responsabilidade do cliente."
              >
                <select name="ocupacaoViaPublica" value={via} onChange={(ev) => setVia(ev.target.value)} className={selectClass}>
                  {VIA_PUBLICA.map((v) => (
                    <option key={v} value={v}>
                      {VIA_PUBLICA_LABELS[v]}
                    </option>
                  ))}
                </select>
              </Field>
            </Linha>
          </div>
        </Quadro>
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
        <div className="flex flex-wrap items-center justify-end gap-3">
          {seccao !== 'publicar' && (
            <button type="submit" disabled={pending} className="btn-primary btn-lg">
              {pending ? 'A guardar…' : initial ? 'Guardar e continuar' : 'Continuar para medidas e fotografias'}
              {!pending && <span aria-hidden>→</span>}
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

const ICONE_DO_TIPO: Record<(typeof WORK_TYPES)[number], NomeDoIcone> = {
  fachadas: 'predio',
  zonas_comuns: 'escadas',
  muros: 'muro',
  moradia: 'casa',
  interior: 'porta',
  caleiras: 'caleira',
};

/** Um quadro numerado da grelha: ícone, número, título, subtítulo e o conteúdo a esticar. */
function Quadro({ icone, titulo, sub, className, children }: { icone: NomeDoIcone; titulo: string; sub: string; className?: string; children: ReactNode }) {
  return (
    // Sem número de índice, sem ícone em quadrado tintado, sem sombra em repouso: o ícone é um
    // traço cinzento ao lado do título, e a separação é a borda (guia de desenho, 01/11/2026).
    <section className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-5 ${className ?? ''}`}>
      <header className="flex items-start gap-3">
        <Icone nome={icone} className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-tinta-900">{titulo}</h2>
          <p className="mt-0.5 text-[15px] text-slate-600">{sub}</p>
        </div>
      </header>
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
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
    <span aria-hidden className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-white [label:has(:checked)_&]:border-tinta-600 [label:has(:checked)_&]:bg-tinta-600">
      <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3 7-7" /></svg>
    </span>
  );
}

/** Uma de duas opções, em cartão (rádio visual; o valor que conta vai nos campos que ela revela). */
function Opcao({ activa, onClick, titulo, sub }: { activa: boolean; onClick: () => void; titulo: string; sub: string }) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={`flex min-h-[44px] flex-col items-start rounded-lg border px-3 py-2 text-left ${
        activa ? 'border-tinta-600 bg-selected' : 'border-slate-300 bg-white hover:border-tinta-600'
      }`}
    >
      <span className="flex items-center gap-2 text-[15px] font-semibold text-tinta-900">
        <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${activa ? 'border-tinta-600' : 'border-slate-400'}`}>
          {activa && <span className="h-2 w-2 rounded-full bg-tinta-600" />}
        </span>
        {titulo}
      </span>
      <span className="pl-6 text-[13px] text-slate-500">{sub}</span>
    </button>
  );
}

/** Linha recolhível das preferências: ícone, título, valor actual e seta; abre para editar. */
function Linha({ icone, titulo, valor, definido, children }: { icone: NomeDoIcone; titulo: string; valor: string; definido: boolean; children: ReactNode }) {
  return (
    <details className="group bg-white">
      <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 px-4 py-2 hover:bg-paper">
        <Icone nome={icone} className="h-5 w-5 shrink-0 text-slate-500" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-tinta-900">{titulo}</span>
          <span className={`block truncate text-[13px] ${definido ? 'text-tinta-700' : 'text-slate-500'}`}>{valor}</span>
        </span>
        <Seta />
      </summary>
      <div className="border-t border-slate-100 bg-paper/60 px-4 pb-4 pt-3">{children}</div>
    </details>
  );
}

function Seta() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90 [details[open]>summary_&]:rotate-90" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type NomeDoIcone = 'local' | 'pincel' | 'calendario' | 'texto' | 'ajustes' | 'regua' | 'ferramenta' | 'cor' | 'lata' | 'estrada' | 'predio' | 'escadas' | 'muro' | 'casa' | 'porta' | 'caleira';

/** Ícones de traço, 24×24, só os deste ecrã. */
function Icone({ nome, className }: { nome: NomeDoIcone; className?: string }) {
  const d: Record<NomeDoIcone, ReactNode> = {
    local: (
      <>
        <path d="M12 21s-6-5.3-6-11a6 6 0 1 1 12 0c0 5.7-6 11-6 11z" />
        <circle cx="12" cy="10" r="2.2" />
      </>
    ),
    pincel: (
      <>
        <path d="M14 3l7 7-8.5 8.5a3 3 0 0 1-4.2 0L7 17.2a3 3 0 0 1 0-4.2L14 3z" />
        <path d="M5 21l3.5-3.5" />
      </>
    ),
    calendario: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
    texto: (
      <>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v4h4M9 12h6M9 16h6" />
      </>
    ),
    ajustes: (
      <>
        <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="10" cy="17" r="2" />
      </>
    ),
    regua: (
      <>
        <rect x="3" y="8" width="18" height="8" rx="1.5" transform="rotate(-45 12 12)" />
        <path d="M8.5 10.5l1.5 1.5M11 8l1.5 1.5M13.5 5.5L15 7" />
      </>
    ),
    ferramenta: (
      <>
        <path d="M14.7 6.3a4 4 0 0 0 4.9 5.2L21 10l-2-2-1.5 1.5L15 7l1.5-1.5-2-2-1.5 1.5a4 4 0 0 0 1.7 1.3z" />
        <path d="M3 21l8-8" />
      </>
    ),
    cor: (
      <>
        <path d="M12 3C7 3 3 6.6 3 11c0 2.2 1.8 4 4 4h1.5a1.5 1.5 0 0 1 1 2.6A2 2 0 0 0 11 21c5.5 0 10-3.6 10-8s-4-10-9-10z" />
        <circle cx="8" cy="10" r="1" />
        <circle cx="12" cy="7" r="1" />
        <circle cx="16" cy="10" r="1" />
      </>
    ),
    lata: (
      <>
        <rect x="5" y="7" width="14" height="14" rx="1.5" />
        <path d="M5 11h14M8 7V5a4 4 0 0 1 8 0v2" />
      </>
    ),
    estrada: (
      <>
        <path d="M5 21L9 3h6l4 18" />
        <path d="M12 7v2M12 12v2M12 17v2" />
      </>
    ),
    predio: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="1" />
        <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3" />
      </>
    ),
    escadas: <path d="M3 21h4v-4h4v-4h4V9h4V5h2" />,
    muro: (
      <>
        <rect x="3" y="8" width="18" height="12" rx="1" />
        <path d="M3 12h18M3 16h18M9 8v4M15 8v4M6 12v4M12 12v4M18 12v4M9 16v4M15 16v4" />
      </>
    ),
    casa: (
      <>
        <path d="M3 11l9-7 9 7" />
        <path d="M5 10v10h14V10M10 20v-5h4v5" />
      </>
    ),
    porta: (
      <>
        <rect x="6" y="3" width="12" height="18" rx="1" />
        <circle cx="15" cy="12" r="1" />
      </>
    ),
    // Uma caleira em corte (meia-cana) presa ao beiral, com o tubo de queda.
    caleira: (
      <>
        <path d="M3 6h18" />
        <path d="M5 9a7 3 0 0 0 14 0" />
        <path d="M16 11v10" />
      </>
    ),
  };
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {d[nome]}
    </svg>
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
                <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-tinta-600 text-white">
                  <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3 7-7" /></svg>
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
