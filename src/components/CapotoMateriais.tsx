import { CapotoCorte, IsolanteSwatch } from '@/components/CapotoFigure';
import {
  ACABAMENTO_INFO,
  CAMADAS,
  ISOLANTE_INFO,
  SITUACAO_LABELS,
  camadasDe,
  resumoCapoto,
  type CapotoSpec,
} from '@/domain/etics';

/**
 * Página de materiais do orçamento (pedido do promotor, 24/10/2026): o que foi escolhido, porque
 * serve, e o que é preciso ter em conta. Vai no documento final, do lado do pintor e do lado do
 * cliente, para que a comparação entre propostas seja feita sobre a mesma informação.
 *
 * Diz as vantagens **e** os cuidados. Um documento que só enumera virtudes não ajuda a decidir, e o
 * cliente acaba a escolher pelo preço por falta de outra coisa em que se agarrar.
 */
export function CapotoMateriais({ spec }: { spec: CapotoSpec }) {
  const manutencao = spec.situacao === 'manutencao';
  const camadas = camadasDe(spec);
  const iso = spec.isolante ? ISOLANTE_INFO[spec.isolante] : null;
  const acab = spec.acabamento ? ACABAMENTO_INFO[spec.acabamento] : null;

  return (
    <section className="mt-8 break-before-page border-t border-slate-200 pt-6">
      <p className="eyebrow">Materiais</p>
      <h4 className="mt-1 text-[20px] leading-snug font-semibold">{resumoCapoto(spec)}</h4>
      <p className="mt-1 text-[17px] text-slate-600">{SITUACAO_LABELS[spec.situacao]}.</p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <figure>
          <CapotoCorte isolante={spec.isolante} espessuraMm={spec.espessuraMm} manutencao={manutencao} className="h-36 w-full" />
          <figcaption className="text-center text-[15px] text-slate-500">
            Corte da parede, da estrutura para a rua. Esquema, não está à escala real.
          </figcaption>
        </figure>
        <div>
          <p className="text-[17px] font-medium">O que é aplicado, por ordem</p>
          <ol className="mt-1 text-[17px]">
            {CAMADAS.filter((c) => camadas.includes(c.id)).map((c, i) => (
              <li key={c.id} className="border-b border-slate-100 py-1 last:border-0">
                <span className="font-medium">
                  {i + 1}. {c.label}
                </span>{' '}
                <span className="text-slate-600">{c.descricao}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {iso && spec.isolante && (
        <div className="mt-6 rounded-xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <IsolanteSwatch isolante={spec.isolante} className="h-12 w-20 shrink-0" />
            <div>
              <p className="font-semibold">
                {iso.label}
                {spec.espessuraMm ? `, ${spec.espessuraMm} mm` : ''}
              </p>
              <p className="text-[17px] text-slate-600">{iso.resumo}</p>
              <p className="text-[15px] text-slate-500">
                Condutibilidade indicativa λ {iso.lambda[0].toLocaleString('pt-PT')}–{iso.lambda[1].toLocaleString('pt-PT')} W/(m·K) ·{' '}
                {iso.fogo}
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-4 text-[17px] sm:grid-cols-2">
            <div>
              <p className="font-medium">Vantagens</p>
              <ul className="mt-1 list-disc pl-5 text-slate-700">
                {iso.vantagens.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium">A ter em conta</p>
              <ul className="mt-1 list-disc pl-5 text-slate-700">
                {iso.cuidados.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {acab && (
        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <p className="font-semibold">
            Acabamento {acab.label.toLowerCase()}
            {spec.demaos ? ` · ${spec.demaos} ${spec.demaos === 1 ? 'demão' : 'demãos'}` : ''}
          </p>
          <p className="text-[17px] text-slate-600">{acab.resumo}</p>
          <div className="mt-3 grid gap-4 text-[17px] sm:grid-cols-2">
            <div>
              <p className="font-medium">Vantagens</p>
              <ul className="mt-1 list-disc pl-5 text-slate-700">
                {acab.vantagens.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium">A ter em conta</p>
              <ul className="mt-1 list-disc pl-5 text-slate-700">
                {acab.cuidados.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-[15px] text-slate-500">
        Um capoto é um sistema certificado: a cola, o isolante, a argamassa de base, a rede, os perfis e o acabamento
        vêm aprovados em conjunto pelo fabricante. Misturar marcas por conveniência anula a garantia do sistema. Os
        valores de condutibilidade são indicativos; o que vale é a ficha técnica do produto aplicado.
      </p>
    </section>
  );
}
