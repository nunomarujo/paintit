import { CAMPANHA_DE_LANCAMENTO, FLYERS, PERFIL_LABELS, caminhoDoFlyer, type Perfil } from '@/domain/campanhas';
import { EnviarFlyer } from './EnviarFlyer';

const PERFIS: Perfil[] = ['cliente', 'condominio', 'pintor', 'fornecedor'];
const data = (iso: string) => new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });

/**
 * Campanhas e Marketing — os materiais de divulgação, por perfil, para descarregar ou enviar por
 * email, com a data de criação (pedido do promotor, 02/11/2026). O catálogo vive em
 * `src/domain/campanhas.ts`; os ficheiros em `public/campanhas/`, gerados por `scripts/gerar-flyers.ts`.
 *
 * O que ainda não existe, e está em EM_ABERTO.md: automatismos de campanha e um motor de divulgação
 * com métricas (os QR já levam um código por flyer, para isso ser possível).
 */
export default function CampanhasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">Campanhas e Marketing</h1>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Dois flyers por perfil, em A5, prontos a imprimir ou a enviar. Cada QR leva um código próprio, para um dia se
          saber de onde veio cada adesão.
        </p>
      </div>

      <section className="rounded-2xl bg-lima p-5 text-tinta-900">
        <h2 className="text-[20px] font-semibold">{CAMPANHA_DE_LANCAMENTO.nome} · até {CAMPANHA_DE_LANCAMENTO.ateEmPalavras}</h2>
        <p className="mt-1 max-w-[60ch] text-[15px]">
          As condições anunciadas nos flyers. Estão em rascunho até o promotor as confirmar; mudam-se num sítio só e os
          flyers regeneram-se.
        </p>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {PERFIS.map((p) => (
            <div key={p} className="rounded-lg bg-white/60 p-3 text-[15px]">
              <dt className="font-semibold">{PERFIL_LABELS[p]}</dt>
              <dd className="mt-0.5 text-tinta-900/80">{CAMPANHA_DE_LANCAMENTO.condicoes[p]}</dd>
            </div>
          ))}
        </dl>
      </section>

      {PERFIS.map((perfil) => (
        <section key={perfil} aria-labelledby={`perfil-${perfil}`}>
          <h2 id={`perfil-${perfil}`} className="text-[13px] font-semibold text-slate-500">{PERFIL_LABELS[perfil]}</h2>
          <ul className="mt-2 grid gap-4 lg:grid-cols-2">
            {FLYERS.filter((f) => f.perfil === perfil).map((f) => (
              <li key={f.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[120px_1fr]">
                <a href={caminhoDoFlyer(f, 'pdf')} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg bg-paper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={caminhoDoFlyer(f, 'jpg')} alt={`Pré-visualização do flyer «${f.titulo}»`} width={559} height={794} className="block h-auto w-full" />
                </a>
                <div className="flex min-w-0 flex-col gap-2">
                  <div>
                    <p className="text-[17px] font-semibold text-tinta-900">{f.titulo}</p>
                    <p className="text-[15px] text-slate-600">{f.angulo}</p>
                  </div>
                  <p className="text-[15px] text-slate-600">
                    Criado a {data(f.criadoEm)} ·{' '}
                    {f.estado === 'rascunho' ? <span className="text-amber-800">rascunho, condições por confirmar</span> : 'aprovado'} · QR para{' '}
                    <span className="break-all">{f.destino}</span>
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <a href={caminhoDoFlyer(f, 'pdf')} download className="btn-secondary btn-sm">
                      Descarregar PDF
                    </a>
                    <a href={caminhoDoFlyer(f, 'jpg')} download className="btn-quiet btn-sm">
                      Imagem
                    </a>
                  </div>
                  <EnviarFlyer flyerId={f.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
