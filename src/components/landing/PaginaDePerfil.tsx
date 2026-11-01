import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { LegalLinks } from '@/components/LegalPage';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { VoltarAtras } from '@/components/VoltarAtras';
import { BRAND } from '@/config/brand';

/**
 * A página própria de um dos outros dois públicos — empresa de pintura (`/empresas`) e fornecedor
 * de tintas (`/fornecedores`). Saíram da página inicial a 01/11/2026 por decisão do promotor: a
 * página inicial é do cliente, e estes dois chegam-lhe por dois cartões.
 *
 * A estrutura é a mesma nas duas: hero curto, a demonstração visual real (a mesma captura que o
 * `AudiencePopup` usava, gerada dos componentes reais em `src/app/demo-*`), os destaques, a lista
 * completa do que inclui, a nota comercial **sem percentagens** (regra 15 do CLAUDE.md) e o CTA de
 * adesão. O conteúdo vem de `CONTEUDO_DE_PERFIL`, partilhado com o popup para não haver duas verdades.
 */
export function PaginaDePerfil({
  eyebrow,
  titulo,
  intro,
  demo,
  destaques,
  beneficios,
  nota,
  ctaHref,
  ctaTexto,
  ctaNota,
}: {
  eyebrow: string;
  titulo: string;
  intro: string;
  demo: { src: string; width: number; height: number; alt: string; legenda: string };
  destaques: string[];
  beneficios: string[];
  nota: string;
  ctaHref: string;
  ctaTexto: string;
  ctaNota: string;
}) {
  return (
    <main className="bg-white">
      <SiteHeader />

      <section className="bg-paper pb-16 pt-24">
        <div className="mx-auto max-w-6xl px-4">
          <VoltarAtras className="mb-4" />
          <p className="eyebrow !text-tinta-600">{eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-[34px] font-extrabold leading-[1.08] text-tinta-900 sm:text-5xl">{titulo}</h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-slate-600 sm:text-[20px]">{intro}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link href={ctaHref} className="btn-primary btn-lg">
              {ctaTexto}
            </Link>
            <span className="text-[15px] text-slate-600">{ctaNota}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2 lg:gap-16">
        <ul className="flex flex-col gap-4">
          {destaques.map((d) => (
            <li key={d} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-[17px] font-semibold text-tinta-900">
              <svg className="mt-1 flex-none text-tinta-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {d}
            </li>
          ))}
        </ul>
        <figure className="m-0">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {/* Captura gerada dos componentes reais; ficheiro estático, sem optimizador (mesma razão do Logotipo). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={demo.src} width={demo.width} height={demo.height} alt={demo.alt} className="block h-auto w-full" />
          </div>
          <figcaption className="mt-3 text-[15px] text-slate-600">{demo.legenda}</figcaption>
        </figure>
      </section>

      <section className="border-t border-slate-200 bg-paper py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-[26px] font-extrabold leading-tight text-tinta-900 sm:text-[34px]">Tudo o que inclui</h2>
          <ul className="mt-8 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {beneficios.map((b) => (
              <li key={b} className="flex items-start gap-3 text-[17px] text-slate-700">
                <span className="mt-2.5 h-2 w-2 flex-none rounded-full bg-tinta-600" />
                {b}
              </li>
            ))}
          </ul>
          <p className="mt-10 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 text-[15px] leading-relaxed text-slate-600">{nota}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl bg-tinta-900 px-7 py-14 text-center text-white">
          <h2 className="mx-auto max-w-2xl text-[26px] font-extrabold leading-tight sm:text-[34px]">{ctaTexto}.</h2>
          <p className="mt-3 text-[17px] text-tinta-200">{ctaNota}</p>
          <div className="mt-7 flex flex-col items-center gap-5">
            <Link href={ctaHref} className="btn-primary btn-lg">
              {ctaTexto}
            </Link>
            <Link href="/" className="inline-flex min-h-[44px] items-center text-[15px] font-semibold text-lima underline-offset-4 hover:underline">
              Sou cliente — pedir orçamentos
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-6 text-[15px] text-slate-500">
          <BrandMark />
          <span>© {new Date().getFullYear()} {BRAND.name}</span>
          <a href={`mailto:${BRAND.email}`} className="inline-flex min-h-[44px] items-center hover:underline">{BRAND.email}</a>
          <LegalLinks />
        </div>
      </footer>
    </main>
  );
}
