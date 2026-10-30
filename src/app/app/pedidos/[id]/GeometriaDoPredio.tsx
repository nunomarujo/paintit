'use client';

import { useState } from 'react';
import { BuildingVolume } from '@/components/BuildingVolume';
import { Field, selectClass } from '@/components/Field';
import { EstadoDeGravacao } from '@/components/EstadoDeGravacao';
import { useFormAction } from '@/components/useFormAction';
import type { FormState } from '@/app/app/actions';
import { guardarMedidasDoPredio } from '@/app/app/pedidos/actions';
import {
  alturaDoPredio,
  cotasDoPredio,
  dimensao,
  porqueNaoTemEscala,
  textoDaCota,
  type Certeza,
  type GeometriaDoPredio as Geometria,
} from '@/domain/geometria';
import type { FaceKind, Forma } from '@/domain/volume';

/**
 * O prédio como modelo, e não como ilustração.
 *
 * ## O que mudou
 *
 * «Separar a geometria do edifício das superfícies de intervenção»; «a alteração de largura,
 * profundidade ou altura deve atualizar o modelo»; «assinalar a zona selecionada»; «tornar
 * explícitas as dimensões estimadas ou desconhecidas e mostrar cotas»; «não inferir geometria a
 * partir de áreas insuficientes» (promotor, 30/10/2026).
 *
 * O desenho existia desde o início, mas com proporções canónicas: o mesmo prédio para toda a gente,
 * mudando só o número de pisos. Agora as medidas são as do prédio, escrevem-se aqui, e o volume
 * muda enquanto se escreve — não depois de gravar, que é quando já não se está a olhar para ele.
 *
 * ## O que ele não faz
 *
 * Não adivinha. Um campo em branco fica em branco, a cota desse eixo não se desenha, e diz-se o que
 * falta. Havia uma tentação óbvia — dividir a área de uma fachada por uma altura e anunciar a
 * frente — e é precisamente isso que a regra proíbe: o resultado tem a cara de uma medida e é um
 * palpite.
 *
 * ## O realce
 *
 * A zona que estiver aberta na lista acende as partes do volume que lhe correspondem. Onde o
 * modelo não consegue ser preciso — uma «fachada» pode ser qualquer uma das quatro, porque o pedido
 * nunca teve esse campo — acende as que se veem **e diz que não sabe qual**.
 */
export function GeometriaDoPredio({
  buildingId,
  requestId,
  inicial,
  podeEditar,
  pisos,
  fachadas,
  temVarandas,
  moradia,
  forma,
  janelas,
  elementos,
  realce,
  avisoDoRealce,
}: {
  buildingId: string;
  requestId: string;
  inicial: { larguraM: number | null; profundidadeM: number | null; peDireitoM: number | null; origem: string };
  podeEditar: boolean;
  pisos: number | null;
  fachadas: number | null;
  temVarandas: boolean;
  moradia: boolean;
  forma: Forma | null;
  janelas?: Partial<Record<'frente' | 'esquerda' | 'direita' | 'tras', number | null>>;
  /** O que o prédio tem — muro, grades, beirais. Vem de quem chama, que o deduz das zonas. */
  elementos?: { muro?: boolean; metalicos?: boolean; beirais?: boolean; palas?: boolean };
  realce?: readonly FaceKind[];
  avisoDoRealce?: string | null;
}) {
  const { state, pending, repetir, formProps } = useFormAction<FormState>(
    guardarMedidasDoPredio.bind(null, buildingId, requestId),
    { errors: {} },
  );
  // O modelo acompanha os campos: o que se escreve vê-se logo no volume, antes de gravar.
  const [largura, setLargura] = useState(texto(inicial.larguraM));
  const [profundidade, setProfundidade] = useState(texto(inicial.profundidadeM));
  const [peDireito, setPeDireito] = useState(texto(inicial.peDireitoM));
  const [origem, setOrigem] = useState(inicial.origem || 'estimativa');

  const certeza: Certeza = origem === 'estimativa' ? 'estimada' : 'declarada';
  const g: Geometria = {
    forma,
    pisos,
    largura: dimensao(numero(largura), certeza),
    profundidade: dimensao(numero(profundidade), certeza),
    peDireito: dimensao(numero(peDireito), certeza),
  };
  const altura = alturaDoPredio(g);
  const cotas = cotasDoPredio(g);
  const semEscala = porqueNaoTemEscala(g);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <BuildingVolume
          pisos={pisos}
          fachadas={fachadas}
          temVarandas={temVarandas}
          moradia={moradia}
          forma={forma}
          janelas={janelas}
          elementos={elementos}
          angulo={25}
          realce={realce}
          escala={
            g.largura.metros !== null && g.peDireito.metros !== null
              ? {
                  larguraM: g.largura.metros,
                  profundidadeM: g.profundidade.metros,
                  peDireitoM: g.peDireito.metros,
                }
              : null
          }
          cotas={{
            largura: g.largura.metros !== null ? textoDaCota(g.largura) : undefined,
            profundidade: g.profundidade.metros !== null ? textoDaCota(g.profundidade) : undefined,
            altura: altura.metros !== null ? textoDaCota(altura) : undefined,
          }}
          className="h-56 w-full"
        />
      </div>

      {avisoDoRealce && <p className="text-[15px] text-slate-600">{avisoDoRealce}</p>}

      <dl className="flex flex-wrap gap-x-6 gap-y-1">
        {cotas.map((c) => (
          <div key={c.eixo} className="text-[15px]">
            <dt className="inline text-slate-600">{c.rotulo}: </dt>
            <dd className={`inline ${c.dimensao.metros === null ? 'text-amber-800' : ''}`}>{c.texto}</dd>
          </div>
        ))}
      </dl>

      {semEscala && <p className="text-[15px] text-slate-600">{semEscala}</p>}

      {podeEditar && (
        <form {...formProps} className="space-y-4 border-t border-slate-100 pt-4">
          <p className="text-[15px] text-slate-600">
            Em metros. O que não souber, deixe em branco — fica <strong>por medir</strong>, e o levantamento trata
            disso. Nada se calcula a partir das áreas.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              name="largura"
              label="Frente"
              error={state.errors.largura}
              hint="Ao longo da fachada principal."
            >
              <input
                name="largura"
                inputMode="decimal"
                autoComplete="off"
                value={largura}
                onChange={(ev) => setLargura(ev.target.value)}
                className="mt-1 campo"
              />
            </Field>
            <Field
              name="profundidade"
              label="Fundo"
              error={state.errors.profundidade}
              hint="Da frente ao tardoz."
            >
              <input
                name="profundidade"
                inputMode="decimal"
                autoComplete="off"
                value={profundidade}
                onChange={(ev) => setProfundidade(ev.target.value)}
                className="mt-1 campo"
              />
            </Field>
            <Field
              name="peDireito"
              label="Pé-direito de um piso"
              error={state.errors.peDireito}
              hint={pisos ? `A altura passa a ser ${pisos} × este valor.` : 'Falta dizer quantos pisos tem o prédio.'}
            >
              <input
                name="peDireito"
                inputMode="decimal"
                autoComplete="off"
                value={peDireito}
                onChange={(ev) => setPeDireito(ev.target.value)}
                className="mt-1 campo"
              />
            </Field>
          </div>
          <Field
            name="origem"
            label="De onde vêm estas medidas"
            error={state.errors.origem}
            info="É o que distingue uma medida de uma estimativa no desenho e nas propostas. De olho não é defeito nenhum — só não se apresenta como medição."
          >
            <select name="origem" value={origem} onChange={(ev) => setOrigem(ev.target.value)} className={selectClass}>
              <option value="estimativa">De olho</option>
              <option value="medicao">Medidas no local</option>
              <option value="planta">Lidas numa planta</option>
            </select>
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pending} className="btn-secondary">
              Guardar medidas
            </button>
          </div>
          <EstadoDeGravacao pending={pending} ok={state.ok} mensagem={state.message} repetir={repetir} />
        </form>
      )}
    </div>
  );
}

const texto = (m: number | null) => (m === null ? '' : String(m).replace('.', ','));
const numero = (v: string): number | null => {
  const t = v.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
};
