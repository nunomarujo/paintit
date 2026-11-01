import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { LegalLinks } from '@/components/LegalPage';
import { Revelar } from '@/components/landing/Revelar';
import { SiteHeader } from '@/components/landing/SiteHeader';
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
 *
 * Desenho (regra 19, 01/11/2026): sem eyebrows — o título diz a quem se dirige; sem caixas com
 * borda — os blocos separam-se por degrau de tom (papel sobre branco); as secções entram com
 * `Revelar`; uma fotografia real por página, com crédito no rodapé.
 */
export function PaginaDePerfil({
  titulo,
  intro,
  demo,
  destaques,
  beneficios,
  nota,
  ctaHref,
  ctaTexto,
  ctaNota,
  credito,
  foto,
  destaquesTitulo,
  fotoInclui,
  children,
}: {
  /** Secções próprias do perfil, entre a demonstração e «Tudo o que inclui». */
  children?: React.ReactNode;
  titulo: string;
  intro: string;
  demo: { src: string; width: number; height: number; alt: string; legenda: string };
  destaques: string[];
  beneficios: string[];
  nota: string;
  ctaHref: string;
  ctaTexto: string;
  ctaNota: string;
  /** Créditos das fotografias usadas na página (licenças Creative Commons), no rodapé. */
  credito?: React.ReactNode;
  /** Fotografia do hero — a coisa que domina o primeiro ecrã ao lado do título. */
  foto: { src: string; width: number; height: number; alt: string };
  /** Título da secção dos destaques (uma secção com texto leva sempre título). */
  destaquesTitulo: string;
  /** Fotografia ao lado de «Tudo o que inclui». */
  fotoInclui: { src: string; width: number; height: number; alt: string };
}) {
  type Foto = typeof foto;
  const Fotografia = ({ f, className }: { f: Foto; className?: string }) => (
    // Fotografias reais do mundo da obra, ficheiros estáticos (crédito no rodapé quando a licença o pede).
    // eslint-disable-next-line @next/next/no-img-element
    <img src={f.src} width={f.width} height={f.height} alt={f.alt} decoding="async" className={`block h-auto w-full rounded-2xl object-cover ${className ?? ''}`} />
  );
  return (
    <main className="bg-white">
      <SiteHeader />

      {/* Primeiro ecrã: o título à esquerda e uma fotografia que ocupa a metade direita até à margem da janela — uma coisa a dominar, não duas. */}
      <section className="bg-paper pt-[72px]">
        <div className="grid items-stretch gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-0">
          <div className="mx-auto w-full max-w-6xl px-4 pt-10 lg:mx-0 lg:max-w-none lg:py-20 lg:pl-[max(1rem,calc((100vw-72rem)/2+1rem))] lg:pr-8">
            <h1 className="text-[34px] font-medium leading-[1.02] tracking-[-0.035em] text-tinta-900 sm:text-[44px] xl:text-[48px]">{titulo}</h1>
            <p className="mt-5 max-w-[48ch] text-[17px] leading-relaxed text-slate-600 sm:text-[20px]">{intro}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link href={ctaHref} className="btn-primary btn-lg whitespace-nowrap">
                {ctaTexto}
              </Link>
              <span className="text-[15px] text-slate-600">{ctaNota}</span>
            </div>
          </div>
          <div className="px-4 pb-10 lg:p-0">
            <Fotografia f={foto} className="aspect-[4/3] !rounded-[28px] lg:aspect-auto lg:h-full lg:min-h-[600px] lg:!rounded-none" />
          </div>
        </div>
      </section>

      <Revelar as="section" className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="text-[26px] font-medium leading-[1.05] tracking-[-0.03em] text-tinta-900 sm:text-[34px] lg:text-[44px]">{destaquesTitulo}</h2>
          <ul className="mt-6 flex flex-col gap-5">
          {destaques.map((d) => (
            <li key={d} className="flex items-start gap-4 text-[20px] font-medium leading-snug text-tinta-900">
              <svg className="mt-1.5 flex-none text-tinta-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {d}
            </li>
          ))}
          </ul>
        </div>
        <figure className="m-0">
          <div className="overflow-hidden rounded-[28px] bg-paper p-3 sm:p-5">
            {/* Captura gerada dos componentes reais; ficheiro estático, sem optimizador (mesma razão do Logotipo). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={demo.src} width={demo.width} height={demo.height} alt={demo.alt} className="block h-auto w-full rounded-lg" />
          </div>
          <figcaption className="mt-3 text-[15px] text-slate-600">{demo.legenda}</figcaption>
        </figure>
      </Revelar>

      {children}

      <Revelar as="section" className="bg-paper py-20">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16">
          <div>
            <h2 className="text-[26px] font-medium leading-[1.05] tracking-[-0.03em] text-tinta-900 sm:text-[34px] lg:text-[44px]">Tudo o que inclui</h2>
            <ul className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {beneficios.map((b) => (
                <li key={b} className="flex items-start gap-3 text-[17px] text-slate-700">
                  <span className="mt-2.5 h-2 w-2 flex-none rounded-full bg-tinta-600" />
                  {b}
                </li>
              ))}
            </ul>
            <p className="mt-10 max-w-[54ch] rounded-2xl bg-white p-5 text-[17px] leading-relaxed text-slate-700">{nota}</p>
          </div>
          <Fotografia f={fotoInclui} className="aspect-[4/5] !rounded-[28px] lg:sticky lg:top-24" />
        </div>
      </Revelar>

      <Revelar as="section" className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-[28px] bg-tinta-900 px-7 py-14 text-center text-white">
          <h2 className="mx-auto max-w-2xl text-[26px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[34px] lg:text-[44px]">{ctaTexto}.</h2>
          <p className="mt-3 text-[17px] text-tinta-200">{ctaNota}</p>
          <div className="mt-7 flex flex-col items-center gap-5">
            <Link href={ctaHref} className="btn-primary btn-lg whitespace-nowrap">
              {ctaTexto}
            </Link>
            <Link href="/" className="btn-secondary border-white/40 bg-transparent text-white hover:bg-white/10">
              Sou cliente — pedir orçamentos
            </Link>
          </div>
        </div>
      </Revelar>

      <footer className="bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-6 text-[15px] text-slate-500">
          <BrandMark />
          <span>© {new Date().getFullYear()} {BRAND.name}</span>
          <a href={`mailto:${BRAND.email}`} className="inline-flex min-h-[44px] items-center hover:underline">{BRAND.email}</a>
          <LegalLinks />
          {credito ? <span className="basis-full text-[13px] text-slate-500">{credito}</span> : null}
        </div>
      </footer>
    </main>
  );
}
