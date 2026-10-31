'use client';

import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';

const toOrg = (tipo: string) => `/entrar?seguinte=${encodeURIComponent(`/app/organizacoes/nova?tipo=${tipo}`)}`;

type Tipo = 'pintor' | 'fornecedor';

/**
 * Conteúdo dos dois popups "Para quem", pela ordem decidida na v4: introdução → 3 vantagens
 * resumidas → "Tudo o que inclui" (lista completa) → nota de condições comerciais (sem
 * percentagens — regra 15 do CLAUDE.md) → CTA de adesão.
 *
 * Sem demonstração visual do produto: o protótipo isolado tinha capturas de ecrã próprias
 * (`assets/geral/...`) que não existem neste repositório, e inventar imagens que pareçam capturas
 * reais do produto seria apresentar como existente algo que não foi confirmado.
 */
const CONTEUDO: Record<Tipo, {
  tag: string;
  titulo: string;
  intro: string;
  destaques: string[];
  beneficios: string[];
  nota: string;
  ctaTexto: string;
  ctaNota: string;
}> = {
  pintor: {
    tag: 'Para empresas de pintura',
    titulo: 'Mais obras, menos tempo em orçamentos.',
    intro:
      'Oportunidades de negócio filtradas pela sua zona e tipo de obra, com uma ferramenta de orçamentação feita para pintores — não uma folha de cálculo genérica.',
    destaques: [
      'Oportunidades de negócio na sua zona, por tipo de obra',
      'Comissão só devida depois de ganhar a obra — nunca antecipada',
      'Documento A4 gerado automaticamente, pronto a enviar',
    ],
    beneficios: [
      'Oportunidades de negócio na sua zona, por tipo de obra',
      'Orçamento guiado, com sugestões de produtos do catálogo',
      'Associação direta de trabalhos a materiais e preços',
      'Documento A4 gerado automaticamente, pronto a enviar',
      'Orçamentos para clientes próprios, fora do mercado aberto',
      'Gestão de obra incluída — fotos, horas e despesas',
    ],
    nota:
      'A comissão só é devida depois de ganhar uma obra — nunca antecipada — e desce com fidelização e com referências de fornecedores. Há também um plano Pro opcional, com desconto adicional de comissão. Os valores exatos são confirmados na área profissional.',
    ctaTexto: 'Aderir como empresa',
    ctaNota: 'Receba pedidos de orçamento compatíveis com a sua zona e especialidade.',
  },
  fornecedor: {
    tag: 'Para fornecedores de tintas',
    titulo: 'O seu catálogo, dentro de cada orçamento.',
    intro:
      'Os seus produtos aparecem onde a decisão é tomada: dentro do orçamento guiado dos pintores, com fichas técnicas e condições já definidas.',
    destaques: [
      'Presença direta nos orçamentos dos pintores da plataforma',
      'Descontos e condições automáticas, sem negociação manual',
      'Dois programas de referência (adesão e indicação)',
    ],
    beneficios: [
      'Catálogo integrado com fichas técnicas e preço de referência',
      'Presença direta nos orçamentos dos pintores da plataforma',
      'Descontos e condições automáticas, sem negociação manual repetida',
      'Gestão da relação com os pintores que usam o seu catálogo',
      'Dois programas de referência: código de adesão para pintores e indicação de outros fornecedores',
      'Oportunidades de levantamento no terreno, através dos avaliadores',
    ],
    nota:
      'A presença no catálogo depende de um plano de subscrição mensal; as condições comerciais reais, incluindo subscrições já existentes, são confirmadas na área de fornecedor.',
    ctaTexto: 'Aderir como fornecedor',
    ctaNota: 'Ponha o seu catálogo à frente de quem orçamenta pintura todos os dias.',
  },
};

export function AudiencePopup({ tipo, open, onClose }: { tipo: Tipo; open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const titleId = useId();
  const c = CONTEUDO[tipo];

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = () =>
      dialog
        ? Array.from(
            dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'),
          ).filter((el) => el.offsetParent !== null)
        : [];
    focusable()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const f = focusable();
        if (f.length === 0) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="presentation">
      <div className="absolute inset-0 bg-[rgba(18,48,42,.55)] backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[94vh] w-full max-w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_30px_70px_-20px_rgba(0,0,0,.45)] [&_*:focus]:outline [&_*:focus]:outline-[3px] [&_*:focus]:outline-offset-2 [&_*:focus]:outline-[#458b81] sm:max-h-[88vh] sm:max-w-[840px] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-[26px]">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[.04em] text-tinta-700">{c.tag}</p>
            <h2 id={titleId} className="mt-2 text-[26px] font-extrabold leading-tight text-tinta-900">
              {c.titulo}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          >
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8 pt-4 sm:px-[26px]">
          <p className="max-w-[62ch] text-[17px] text-slate-600">{c.intro}</p>

          <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
            {c.destaques.map((d) => (
              <li key={d} className="flex items-start gap-2 rounded-lg bg-tinta-50 px-3 py-2.5 text-[15px] font-semibold text-tinta-900">
                <span className="mt-1.5 h-[7px] w-[7px] flex-none rounded-full bg-terracota" />
                {d}
              </li>
            ))}
          </ul>

          <p className="mt-7 text-[13px] font-bold uppercase tracking-[.04em] text-slate-500">Tudo o que inclui</p>
          <ul className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
            {c.beneficios.map((b) => (
              <li key={b} className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3.5 py-3 text-[15px] text-slate-700">
                <span className="mt-1.5 h-[7px] w-[7px] flex-none rounded-full bg-tinta-700" />
                {b}
              </li>
            ))}
          </ul>

          <p className="mt-5 max-w-[70ch] rounded-lg bg-tinta-50 px-3 py-2.5 text-[13px] text-slate-500">{c.nota}</p>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3.5 border-t border-slate-200 pt-5">
            <p className="max-w-[40ch] text-[15px] text-slate-600">{c.ctaNota}</p>
            <Link href={toOrg(tipo)} className="btn-primary btn-lg">
              {c.ctaTexto}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
