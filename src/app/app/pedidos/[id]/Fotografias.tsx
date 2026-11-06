'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormAction } from '@/components/useFormAction';
import { EstadoDeGravacao } from '@/components/EstadoDeGravacao';
import { Dica } from '@/components/Dica';
import type { FormState } from '@/app/app/actions';
import { corrigirFotografia, deletePhoto, enviarFotografia } from '@/app/app/pedidos/actions';
import { MAX_PHOTOS_PER_REQUEST, PHOTO_KINDS, PHOTO_KIND_LABELS, PHOTO_REVIEW_LABELS, type PhotoReview } from '@/domain/photo';
import { ESTADO_DO_FICHEIRO_LABELS, cabem, proximoAEnviar, resumoDaFila, type FicheiroNaFila } from '@/domain/fila';
import { PhotoInstructions } from './PhotoInstructions';
import { BotaoFechar, Janela } from './Janela';
import { Pino } from './ZonasDoPedido';

/**
 * As fotografias do pedido, agrupadas pela zona — com o mesmo número do desenho.
 *
 * ## O que o promotor pediu, e como está
 *
 * «Uma galeria com miniaturas e botão *Adicionar fotografias*. Selecionar várias imagens, mostrar
 * progresso, sucesso ou falha por ficheiro e associar imagens às zonas» (30/10/2026). Escolhe-se **o
 * que são** (gerais ou de pormenor) e **de que zona são** — uma vez, não doze —, e depois as imagens
 * todas de uma vez; cada ficheiro fica numa linha com o seu estado, e um que falhe tem o seu próprio
 * «Tentar de novo».
 *
 * Na proposta B (05/11/2026) a galeria passou a ser agrupada por zona: o número e o nome da zona e,
 * por baixo, cada fotografia numa linha — a miniatura, a legenda e o que se sabe dela («geral,
 * privada»; «pormenor, não vai para o anúncio», com a nota da revisão). Uma linha por fotografia, e
 * não um resumo por zona: com duas fotografias na zona, o resumo («2 fotografias · uma não vai para o
 * anúncio») escondia qual, e a nota, e no pedido publicado (só de leitura) não havia outra maneira de
 * as ver (cético, 05/11/2026). A legenda, a zona e a remoção abrem numa janela, ao tocar na miniatura:
 * vinte miniaturas com campos abertos eram um muro de formulário.
 *
 * ## O que não se finge
 *
 * Não há barra de progresso: um envio por *server action* não devolve bytes transferidos, e uma barra
 * que anda sozinha é uma mentira animada. Diz-se a posição na fila — «a enviar a 3.ª de 7» —, que é
 * verdade, e o resultado de cada ficheiro quando chega (`src/domain/fila.ts`).
 */

export interface FotoDaGaleria {
  id: string;
  kind: string;
  legenda: string | null;
  revisao: PhotoReview | null;
  notas_revisao: string | null;
  zonaId: string | null;
}

export interface ZonaParaFotografia {
  id: string;
  nome: string;
  /** O número da zona no desenho, quando o tem (o mesmo do quadro das zonas). */
  n?: number | null;
  /** Zona excluída do pedido: só aparece se tiver fotografias. */
  fora?: boolean;
}

interface Pendente {
  file: File;
  kind: string;
  zona: string;
}

/** O que se sabe de uma fotografia, numa linha: a geral diz que é privada; a de pormenor, o estado da revisão. */
const sobreAFoto = (f: FotoDaGaleria) =>
  f.kind === 'geral' ? 'geral, privada' : `pormenor, ${PHOTO_REVIEW_LABELS[f.revisao ?? 'pendente'].toLowerCase()}`;
/** Recusada para o anúncio: resolve-se (outra fotografia, ou outro enquadramento) — âmbar, regra 13. */
const recusada = (f: FotoDaGaleria) => f.kind !== 'geral' && f.revisao === 'rejeitada';

export function Fotografias({
  requestId,
  fotografias,
  zonas,
  podeEditar,
  /**
   * As fotografias podem ser associadas a zonas. Falso enquanto a coluna `zona_id` não existir na
   * base — melhor não ter o seletor do que ter um que rebenta ao gravar. Sai daqui quando a
   * migração `fotografias_por_zona` estiver aplicada em todos os ambientes.
   */
  porZona,
}: {
  requestId: string;
  fotografias: FotoDaGaleria[];
  zonas: ZonaParaFotografia[];
  podeEditar: boolean;
  porZona: boolean;
}) {
  const router = useRouter();
  const [painel, setPainel] = useState(false);
  const [kind, setKind] = useState<string>('geral');
  const [zona, setZona] = useState<string>('');
  const [fila, mostrarFila] = useState<FicheiroNaFila[]>([]);
  const [recusadas, setRecusadas] = useState(0);
  const [aEditar, setAEditar] = useState<string | null>(null);
  const [concluido, setConcluido] = useState('');
  const filaRef = useRef<FicheiroNaFila[]>([]);
  const pendentes = useRef(new Map<string, Pendente>());
  const aEnviar = useRef(false);
  const escolher = useRef<HTMLInputElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  // A fila vive numa referência e espelha-se no estado: a bomba de envio tem de a ler no meio de um
  // `await`, onde o valor do estado é sempre o da renderização em que a função nasceu.
  const aplicar = useCallback((fn: (f: FicheiroNaFila[]) => FicheiroNaFila[]) => {
    filaRef.current = fn(filaRef.current);
    mostrarFila([...filaRef.current]);
  }, []);

  const marcar = useCallback(
    (id: string, estado: FicheiroNaFila['estado'], erro?: string) =>
      aplicar((f) => f.map((x) => (x.id === id ? { ...x, estado, erro } : x))),
    [aplicar],
  );

  const bombear = useCallback(async () => {
    if (aEnviar.current) return;
    aEnviar.current = true;
    try {
      for (;;) {
        const proximo = proximoAEnviar(filaRef.current);
        if (!proximo) break;
        const p = pendentes.current.get(proximo.id);
        if (!p) {
          marcar(proximo.id, 'falhou', 'O ficheiro já não está disponível. Escolha-o de novo.');
          continue;
        }
        marcar(proximo.id, 'a_enviar');
        const form = new FormData();
        form.set('ficheiro', p.file);
        form.set('kind', p.kind);
        if (p.zona) form.set('zona', p.zona);
        try {
          const r = await enviarFotografia(requestId, form);
          if (r.ok) {
            marcar(proximo.id, 'enviado');
            pendentes.current.delete(proximo.id);
          } else {
            marcar(proximo.id, 'falhou', r.erro);
          }
        } catch {
          // Rede abaixo a meio do envio. O ficheiro continua escolhido, e o botão repete-o.
          marcar(proximo.id, 'falhou', 'Não foi possível enviar. Verifique a ligação e tente de novo.');
        }
      }
    } finally {
      aEnviar.current = false;
    }
    // Só no fim: a galeria é a confirmação, e redesenhar o ecrã a cada envio punha-o a tremer.
    const resumo = resumoDaFila(filaRef.current);
    setConcluido(resumo.texto);
    aplicar((f) => f.filter((x) => x.estado !== 'enviado'));
    router.refresh();
  }, [aplicar, marcar, requestId, router]);

  function aoEscolher(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const naFila = filaRef.current.filter((f) => f.estado !== 'falhou').length;
    const { aceitas, recusadas: fora } = cabem(fotografias.length + naFila, lista.length, MAX_PHOTOS_PER_REQUEST);
    setRecusadas(fora);
    setConcluido('');
    const novos: FicheiroNaFila[] = [];
    for (const file of Array.from(lista).slice(0, aceitas)) {
      const id = `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
      pendentes.current.set(id, { file, kind, zona });
      novos.push({ id, nome: file.name, estado: 'na_fila' });
    }
    aplicar((f) => [...f, ...novos]);
    // O mesmo ficheiro escolhido duas vezes seguidas não dispara `change` sem isto.
    if (escolher.current) escolher.current.value = '';
    void bombear();
  }

  /** Abrir o envio já com a zona escolhida (o «+» de uma zona). */
  const acrescentarA = (zonaId: string) => {
    setZona(zonaId);
    setPainel(true);
    requestAnimationFrame(() => painelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  };

  const resumo = resumoDaFila(fila);
  const semEspaco = fotografias.length >= MAX_PHOTOS_PER_REQUEST;
  const doPedido = (f: FotoDaGaleria) => !f.zonaId || !zonas.some((z) => z.id === f.zonaId);
  const grupos = porZona
    ? [
        ...zonas
          .map((z) => ({
            chave: z.id,
            zonaId: z.id,
            n: z.n ?? null,
            nome: z.nome,
            fora: !!z.fora,
            fotos: fotografias.filter((f) => f.zonaId === z.id),
          }))
          .filter((g) => g.fotos.length > 0 || (podeEditar && !g.fora)),
        { chave: 'pedido', zonaId: null, n: null, nome: 'Do pedido todo', fora: false, fotos: fotografias.filter(doPedido) },
      ].filter((g) => g.fotos.length > 0 || g.zonaId !== null)
    : [{ chave: 'todas', zonaId: null, n: null, nome: null, fora: false, fotos: fotografias }];
  const aberta = fotografias.find((f) => f.id === aEditar) ?? null;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {/* Um `<div>` e não um `<p>`: o (i) é um `<details>`, que não pode viver dentro de um parágrafo
            (era o erro de hidratação desta linha até 05/11/2026). */}
          <div className="flex flex-wrap items-center gap-x-2 text-[15px] text-slate-600">
            {fotografias.length > 0 && <span className="tabular-nums">{`${fotografias.length} de ${MAX_PHOTOS_PER_REQUEST} ·`}</span>}
            <span>Opcionais. Ajudam o avaliador a perceber o estado atual.</span>
            <Dica rotulo="Quem vê as fotografias">
              Só as de pormenor aprovadas para divulgação são mostradas aos pintores; as gerais ficam privadas. A localização e os dados do
              aparelho são retirados de todas.
            </Dica>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PhotoInstructions />
            {podeEditar && (
              <button
                type="button"
                onClick={() => setPainel((v) => !v)}
                aria-expanded={painel}
                aria-controls="envio-de-fotografias"
                disabled={semEspaco}
                className="btn-secondary btn-sm btn-desativado"
              >
                Adicionar fotografias
              </button>
            )}
          </div>
        </div>
        {podeEditar && semEspaco && (
          <p className="text-[15px] text-slate-600">Este pedido já tem as {MAX_PHOTOS_PER_REQUEST} fotografias que cabem.</p>
        )}

        {podeEditar && (painel || fila.length > 0 || !!concluido) && (
          <div id="envio-de-fotografias" ref={painelRef} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="flex min-h-[22px] items-center gap-2">
                  <label htmlFor="fotos-tipo" className="text-[15px] font-medium text-slate-700">
                    O que são estas fotografias
                  </label>
                  <Dica rotulo="Geral ou pormenor">
                    <strong>Geral</strong>: fica privada, serve só para a equipa da plataforma confirmar o pedido — nunca chega aos
                    pintores. <strong>Pormenor</strong>: pode ir para o anúncio, depois de alguém da equipa confirmar que não identifica o
                    prédio.
                  </Dica>
                </div>
                <select id="fotos-tipo" value={kind} onChange={(ev) => setKind(ev.target.value)} className="campo mt-1 bg-white">
                  {PHOTO_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {PHOTO_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              {porZona && (
                <div>
                  <label htmlFor="fotos-zona" className="block min-h-[22px] text-[15px] font-medium text-slate-700">
                    De que zona são
                  </label>
                  <select
                    id="fotos-zona"
                    value={zona}
                    onChange={(ev) => setZona(ev.target.value)}
                    disabled={zonas.length === 0}
                    className="campo mt-1 bg-white"
                  >
                    <option value="">Do pedido todo</option>
                    {zonas.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.n ? `${z.n} · ` : ''}
                        {z.nome}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[13px] text-slate-600">
                    {zonas.length === 0 ? 'Ainda não há zonas registadas.' : 'A zona de cada uma pode mudar-se depois.'}
                  </p>
                </div>
              )}
            </div>

            {kind === 'pormenor' && (
              <p className="mt-3 text-[15px] text-amber-800">
                Estas podem ir para o anúncio. <strong className="font-semibold">Não podem ter nada que identifique o prédio</strong> —
                números de porta, placas com nomes de rua, caixas de correio, matrículas ou pessoas. Alguém da equipa confirma antes de as
                publicar.
              </p>
            )}

            <input
              ref={escolher}
              type="file"
              multiple
              accept="image/jpeg,image/png"
              onChange={(ev) => aoEscolher(ev.target.files)}
              className="sr-only"
              id="escolher-fotografias"
              tabIndex={-1}
            />
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={() => escolher.current?.click()}
                disabled={semEspaco}
                className="btn-primary btn-sm btn-desativado"
              >
                Escolher as imagens
              </button>
              <p className="text-[15px] text-slate-600">Várias de uma vez. JPG ou PNG, até 10 MB cada. As legendas escrevem-se depois.</p>
            </div>

            {recusadas > 0 && (
              <p className="mt-3 text-[15px] text-amber-800">
                {recusadas === 1
                  ? 'Uma das imagens escolhidas ficou de fora: o pedido chegou ao limite.'
                  : `${recusadas} das imagens escolhidas ficaram de fora: o pedido chegou ao limite.`}
              </p>
            )}

            {(fila.length > 0 || concluido) && (
              <div className="mt-4" aria-live="polite">
                <p className="text-[17px] font-medium">{concluido || resumo.texto}</p>
                {fila.length > 0 && (
                  <ul className="mt-2 divide-y divide-slate-200">
                    {fila.map((f) => (
                      <li key={f.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
                        <span className="min-w-0 flex-1 truncate text-[15px]">{f.nome}</span>
                        {f.estado === 'falhou' ? (
                          <>
                            <span className="text-[15px] text-amber-800">{f.erro}</span>
                            <button
                              type="button"
                              onClick={() => {
                                marcar(f.id, 'na_fila');
                                void bombear();
                              }}
                              className="btn-quiet btn-sm shrink-0"
                            >
                              Tentar de novo
                            </button>
                          </>
                        ) : (
                          <span className="text-[15px] text-slate-600">{ESTADO_DO_FICHEIRO_LABELS[f.estado]}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {fotografias.length === 0 ? (
          // O estado vazio guarda a moldura e diz uma frase (guia, §11).
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-[15px] text-slate-600">
            Ainda não há fotografias. Uma vista geral de cada fachada e fotografias de perto de cada fissura ou humidade chegam.
          </p>
        ) : (
          <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {grupos.map((g) => (
              <li key={g.chave} className="min-w-0">
                {g.nome && (
                  <p className={`flex items-center gap-1.5 text-[15px] font-medium ${g.fora ? 'text-slate-600' : 'text-tinta-900'}`}>
                    {g.n !== null && <Pino n={g.n} pequeno fora={g.fora} />}
                    <span className="truncate">{g.nome}</span>
                  </p>
                )}
                <ul className={`space-y-2 ${g.nome ? 'mt-2' : ''}`}>
                  {g.fotos.map((f) => (
                    <li key={f.id} className="flex items-start gap-3">
                      {podeEditar ? (
                        <button
                          type="button"
                          onClick={() => setAEditar(f.id)}
                          aria-label={`${f.legenda?.trim() || 'Fotografia sem legenda'}: legenda e zona`}
                          className="shrink-0 rounded-lg"
                        >
                          <Miniatura foto={f} />
                        </button>
                      ) : (
                        <a
                          href={`/app/fotos/${f.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-lg"
                          aria-label={`${f.legenda?.trim() || 'Fotografia'} (abre noutra janela)`}
                        >
                          <Miniatura foto={f} />
                        </a>
                      )}
                      <div className="min-w-0 pt-0.5">
                        <p className={`text-[15px] leading-snug ${f.legenda?.trim() ? 'text-tinta-900' : 'text-slate-600'}`}>
                          {f.legenda?.trim() || 'Sem legenda'}
                        </p>
                        <p className={`text-[13px] leading-snug ${recusada(f) ? 'text-amber-800' : 'text-slate-600'}`}>
                          {sobreAFoto(f).replace(/^./, (c) => c.toUpperCase())}
                        </p>
                        {recusada(f) && f.notas_revisao && <p className="text-[13px] leading-snug text-amber-800">{f.notas_revisao}</p>}
                      </div>
                    </li>
                  ))}
                  {g.fotos.length === 0 && !(podeEditar && g.zonaId && !semEspaco) && (
                    <li className="text-[13px] text-slate-600">Ainda sem fotografia desta zona</li>
                  )}
                  {podeEditar && g.zonaId && !semEspaco && (
                    <li>
                      <button
                        type="button"
                        onClick={() => acrescentarA(g.zonaId!)}
                        className="group flex min-h-[44px] items-center gap-3 text-left text-[15px] text-tinta-700"
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-[20px] text-slate-600 group-hover:border-tinta-600 group-hover:text-tinta-700"
                        >
                          +
                        </span>
                        <span>
                          {g.fotos.length === 0 && <span className="text-slate-600">Ainda sem fotografia desta zona. </span>}
                          <span className="font-medium underline-offset-4 group-hover:underline">Acrescentar</span>
                          <span className="sr-only"> fotografias de {g.nome}</span>
                        </span>
                      </button>
                    </li>
                  )}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Fora da coluna de cima: um `<dialog>` dentro de um `space-y-*` herdava a margem. */}
      {podeEditar && (
        <Janela aberta={aberta !== null} aoFechar={() => setAEditar(null)} forma="centro" idDoTitulo="foto-titulo">
          {aberta && (
            <EditarFotografia
              key={aberta.id}
              requestId={requestId}
              foto={aberta}
              zonas={zonas}
              porZona={porZona}
              aoFechar={() => setAEditar(null)}
            />
          )}
        </Janela>
      )}
    </>
  );
}

/** Uma miniatura de 64 px: o que se reconhece numa faixa, sem a imagem tomar o ecrã. */
function Miniatura({ foto }: { foto: FotoDaGaleria }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- link temporário assinado
    <img
      src={`/app/fotos/${foto.id}`}
      alt={foto.legenda ?? 'Fotografia do pedido'}
      className="h-16 w-16 rounded-lg bg-slate-100 object-cover"
    />
  );
}

/** A legenda e a zona de uma fotografia, e removê-la — numa janela, com a imagem à vista. */
function EditarFotografia({
  requestId,
  foto,
  zonas,
  porZona,
  aoFechar,
}: {
  requestId: string;
  foto: FotoDaGaleria;
  zonas: ZonaParaFotografia[];
  porZona: boolean;
  aoFechar: () => void;
}) {
  const { state, pending, repetir, formProps } = useFormAction<FormState>(corrigirFotografia.bind(null, requestId, foto.id), {
    errors: {},
  });
  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <h2 id="foto-titulo" className="truncate text-[20px] font-semibold text-tinta-900">
          {foto.legenda?.trim() || 'Fotografia sem legenda'}
        </h2>
        <BotaoFechar rotulo="Fechar" aoCarregar={aoFechar} />
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <a
          href={`/app/fotos/${foto.id}`}
          target="_blank"
          rel="noreferrer"
          className="block rounded-lg"
          aria-label="Abrir a fotografia em tamanho real (noutra janela)"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- link temporário assinado */}
          <img
            src={`/app/fotos/${foto.id}`}
            alt={foto.legenda ?? 'Fotografia do pedido'}
            className="max-h-[45vh] w-full rounded-lg bg-slate-100 object-contain"
          />
        </a>
        <p className="text-[15px] text-slate-600">
          {sobreAFoto(foto).replace(/^./, (c) => c.toUpperCase())}
          {foto.revisao === 'rejeitada' && foto.notas_revisao && <span className="block text-amber-800">{foto.notas_revisao}</span>}
        </p>
        <form id="foto-formulario" {...formProps} className="space-y-4">
          <div>
            <label htmlFor="foto-legenda" className="block text-[15px] font-medium text-slate-700">
              Legenda
            </label>
            <input id="foto-legenda" name="legenda" defaultValue={foto.legenda ?? ''} autoComplete="off" className="campo mt-1" />
            {state.errors.legenda ? (
              <p className="mt-1 text-[15px] text-amber-800" role="alert">
                {state.errors.legenda}
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-slate-600">O que se vê e onde, sem a morada nem o nome do prédio.</p>
            )}
          </div>
          {porZona && (
            <div>
              <label htmlFor="foto-zona" className="block text-[15px] font-medium text-slate-700">
                Zona
              </label>
              <select id="foto-zona" name="zona" defaultValue={foto.zonaId ?? ''} className="campo mt-1 bg-white">
                <option value="">Do pedido todo</option>
                {zonas.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.n ? `${z.n} · ` : ''}
                    {z.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
          <EstadoDeGravacao pending={pending} ok={state.ok} mensagem={state.message} repetir={repetir} />
        </form>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" form="foto-formulario" disabled={pending} className="btn-primary">
            Guardar
          </button>
          <button type="button" onClick={aoFechar} className="btn-quiet">
            Fechar
          </button>
        </div>
        {/* Fora do formulário acima: um `<form>` dentro de outro é HTML inválido. */}
        <form action={deletePhoto.bind(null, requestId, foto.id)}>
          <button type="submit" className="btn-quiet btn-sm font-normal text-slate-600">
            Remover esta fotografia
          </button>
        </form>
      </footer>
    </>
  );
}
