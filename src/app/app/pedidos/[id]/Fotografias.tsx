'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, selectClass } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { EstadoDeGravacao } from '@/components/EstadoDeGravacao';
import type { FormState } from '@/app/app/actions';
import { corrigirFotografia, deletePhoto, enviarFotografia } from '@/app/app/pedidos/actions';
import {
  MAX_PHOTOS_PER_REQUEST,
  PHOTO_KINDS,
  PHOTO_KIND_LABELS,
  PHOTO_REVIEW_LABELS,
  type PhotoReview,
} from '@/domain/photo';
import {
  ESTADO_DO_FICHEIRO_LABELS,
  cabem,
  proximoAEnviar,
  resumoDaFila,
  type FicheiroNaFila,
} from '@/domain/fila';
import { PhotoInstructions } from './PhotoInstructions';

/**
 * A galeria de fotografias do pedido: miniaturas, **Adicionar fotografias** e uma fila de envio.
 *
 * ## O que o promotor pediu, e o que estava lá
 *
 * «Apresentar uma galeria com miniaturas e botão *Adicionar fotografias*. Permitir selecionar
 * várias imagens, mostrar progresso, sucesso ou falha por ficheiro e associar imagens às zonas»
 * (30/10/2026). O que havia era um formulário de **uma** fotografia: escolher tipo, escrever
 * legenda, escolher ficheiro, enviar, esperar, repetir. Para doze fotografias de um prédio são doze
 * voltas ao mesmo formulário.
 *
 * ## Como está agora
 *
 * Escolhe-se **o que são** (gerais ou de pormenor) e **de que zona são** — uma vez, não doze —, e
 * depois escolhem-se as imagens todas de uma vez. Cada ficheiro fica numa linha com o seu estado, e
 * um que falhe tem o seu próprio **Tentar de novo**: um erro na sexta não desfaz as cinco
 * primeiras, que é exactamente o que acontecia quando tudo ia num envio só.
 *
 * As legendas escrevem-se depois, por baixo da miniatura. Ninguém escreve oito legendas antes de ver
 * as fotografias, e a zona de cada uma percebe-se melhor a olhar para ela.
 *
 * ## O que não se finge
 *
 * Não há barra de progresso. Um envio feito por uma *server action* não devolve bytes
 * transferidos, e uma barra que anda sozinha é uma mentira animada. Diz-se a posição na fila — «a
 * enviar a 3.ª de 7» —, que é verdade, e o resultado de cada ficheiro quando chega
 * (`src/domain/fila.ts`).
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
}

interface Pendente {
  file: File;
  kind: string;
  zona: string;
}

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
  const [kind, setKind] = useState<string>('geral');
  const [zona, setZona] = useState<string>('');
  const [fila, mostrarFila] = useState<FicheiroNaFila[]>([]);
  const [recusadas, setRecusadas] = useState(0);
  // Um editor de cada vez, como nas zonas: vinte miniaturas com campos abertos ao mesmo tempo são
  // um muro de formulário, e a miniatura deixa de se ver, que é o que importa numa galeria.
  const [aEditar, setAEditar] = useState<string | null>(null);
  const [concluido, setConcluido] = useState('');
  const filaRef = useRef<FicheiroNaFila[]>([]);
  const pendentes = useRef(new Map<string, Pendente>());
  const aEnviar = useRef(false);
  const escolher = useRef<HTMLInputElement>(null);

  // A fila vive numa referência e espelha-se no estado: a bomba de envio tem de a ler no meio de um
  // `await`, onde o valor do estado é sempre o da renderização em que a função nasceu.
  const aplicar = useCallback((fn: (f: FicheiroNaFila[]) => FicheiroNaFila[]) => {
    filaRef.current = fn(filaRef.current);
    mostrarFila([...filaRef.current]);
  }, []);

  const marcar = (id: string, estado: FicheiroNaFila['estado'], erro?: string) =>
    aplicar((f) => f.map((x) => (x.id === id ? { ...x, estado, erro } : x)));

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
  }, [aplicar, requestId, router]);

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

  const resumo = resumoDaFila(fila);
  const semEspaco = fotografias.length >= MAX_PHOTOS_PER_REQUEST;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[17px] text-slate-600">
          {fotografias.length === 0
            ? 'Ainda não há fotografias.'
            : `${fotografias.length} ${fotografias.length === 1 ? 'fotografia' : 'fotografias'} neste pedido.`}
        </p>
        <PhotoInstructions />
      </div>

      {fotografias.length > 0 && (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fotografias.map((p) => (
            <li key={p.id}>
              <NaGaleria
                requestId={requestId}
                foto={p}
                zonas={zonas}
                podeEditar={podeEditar}
                porZona={porZona}
                aberta={aEditar === p.id}
                abrir={() => setAEditar(p.id)}
                fechar={() => setAEditar(null)}
              />
            </li>
          ))}
        </ul>
      )}

      {podeEditar && (
        <div className="border-t border-slate-100 pt-5">
          <h3 className="text-[17px] font-semibold">Acrescentar fotografias</h3>
          <p className="mt-1 text-[15px] text-slate-600">
            Pode escolher várias de uma vez. As legendas escrevem-se depois, debaixo de cada miniatura.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              name="kind"
              label="O que são estas fotografias"
              info={
                <>
                  <strong>Geral</strong>: fica privada, serve só para a equipa da plataforma confirmar o pedido — nunca
                  chega aos pintores. <strong>Pormenor</strong>: pode ir para o anúncio, depois de alguém da equipa
                  confirmar que não identifica o prédio.
                </>
              }
            >
              <select value={kind} onChange={(ev) => setKind(ev.target.value)} className={selectClass}>
                {PHOTO_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {PHOTO_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>
            {porZona && (
              <Field
                name="zona"
                label="De que zona são"
                hint={zonas.length === 0 ? 'Ainda não há zonas registadas.' : 'Pode mudar a zona de cada uma depois.'}
              >
                <select
                  value={zona}
                  onChange={(ev) => setZona(ev.target.value)}
                  disabled={zonas.length === 0}
                  className={selectClass}
                >
                  <option value="">Do pedido todo</option>
                  {zonas.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nome}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          {kind === 'pormenor' && (
            <p className="mt-3 text-[15px] text-amber-900">
              Estas podem ir para o anúncio. <strong>Não podem ter nada que identifique o prédio</strong> — números de
              porta, placas com nomes de rua, caixas de correio, matrículas ou pessoas. Alguém da equipa confirma antes
              de as publicar.
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
          />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => escolher.current?.click()}
              disabled={semEspaco}
              className="btn-secondary"
            >
              Adicionar fotografias
            </button>
            <p className="text-[15px] text-slate-600">
              {semEspaco
                ? `Este pedido já tem as ${MAX_PHOTOS_PER_REQUEST} fotografias que cabem.`
                : `JPG ou PNG, até 10 MB cada. Até ${MAX_PHOTOS_PER_REQUEST} por pedido.`}
            </p>
          </div>

          {recusadas > 0 && (
            <p className="mt-3 text-[15px] text-amber-900">
              {recusadas === 1
                ? 'Uma das imagens escolhidas ficou de fora: o pedido chegou ao limite.'
                : `${recusadas} das imagens escolhidas ficaram de fora: o pedido chegou ao limite.`}
            </p>
          )}

          {(fila.length > 0 || concluido) && (
            <div className="mt-4" aria-live="polite">
              <p className="text-[17px] font-medium">{concluido || resumo.texto}</p>
              {fila.length > 0 && (
                <ul className="mt-2 divide-y divide-slate-100">
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
    </div>
  );
}

/** Uma miniatura: o que se sabe dela e, a pedido, o que se pode corrigir. */
function NaGaleria({
  requestId,
  foto,
  zonas,
  podeEditar,
  porZona,
  aberta,
  abrir,
  fechar,
}: {
  requestId: string;
  foto: FotoDaGaleria;
  zonas: ZonaParaFotografia[];
  podeEditar: boolean;
  porZona: boolean;
  aberta: boolean;
  abrir: () => void;
  fechar: () => void;
}) {
  const { state, pending, repetir, formProps } = useFormAction<FormState>(
    corrigirFotografia.bind(null, requestId, foto.id),
    { errors: {} },
  );
  const zonaDaFoto = zonas.find((z) => z.id === foto.zonaId);

  return (
    <div className="space-y-2">
      <a href={`/app/fotos/${foto.id}`} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element -- link temporário assinado */}
        <img
          src={`/app/fotos/${foto.id}`}
          alt={foto.legenda ?? 'Fotografia do pedido'}
          className="aspect-square w-full rounded-lg bg-slate-100 object-cover"
        />
      </a>
      <p className="text-[17px]">{foto.legenda?.trim() || <span className="text-slate-500">Sem legenda</span>}</p>
      <p className="text-[15px] text-slate-600">
        {foto.kind === 'geral' ? 'Privada' : PHOTO_REVIEW_LABELS[foto.revisao ?? 'pendente']}
        {porZona ? ` · ${zonaDaFoto ? zonaDaFoto.nome : 'Do pedido todo'}` : ''}
      </p>
      {foto.revisao === 'rejeitada' && foto.notas_revisao && (
        <p className="text-[15px] text-amber-800">{foto.notas_revisao}</p>
      )}

      {podeEditar &&
        (aberta ? (
          <form {...formProps} className="space-y-2 border-t border-slate-100 pt-2">
            <Field
              name="legenda"
              label="Legenda"
              error={state.errors.legenda}
              hint="Diga o que se vê e onde, sem a morada nem o nome do prédio."
              defaultValue={foto.legenda ?? ''}
            />
            {porZona && (
              <Field name="zona" label="Zona">
                <select name="zona" defaultValue={foto.zonaId ?? ''} className={selectClass}>
                  <option value="">Do pedido todo</option>
                  {zonas.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nome}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={pending} className="btn-secondary btn-sm">
                Guardar
              </button>
              <button type="button" onClick={fechar} className="btn-quiet btn-sm">
                Fechar
              </button>
            </div>
            <EstadoDeGravacao pending={pending} ok={state.ok} mensagem={state.message} repetir={repetir} />
          </form>
        ) : (
          <button type="button" onClick={abrir} className="btn-quiet btn-sm">
            Legenda e zona
          </button>
        ))}

      {/* Fora do formulário acima: um `<form>` dentro de outro é HTML inválido e o navegador
          desfaz-no sozinho, levando com ele o botão de gravar. */}
      {podeEditar && aberta && (
        <form action={deletePhoto.bind(null, requestId, foto.id)}>
          <button type="submit" className="btn-quiet btn-sm text-red-700">
            Remover esta fotografia
          </button>
        </form>
      )}
    </div>
  );
}
