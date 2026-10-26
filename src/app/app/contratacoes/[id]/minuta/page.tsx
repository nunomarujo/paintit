import { createHash } from 'node:crypto';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { draftText, plainSummary } from '@/domain/contracting';
import { engagementSide, loadDraft, loadReplay } from '@/lib/engagements';
import { getUser } from '@/lib/supabase/server';

// Minuta do contrato, gerada da proposta escolhida. Para imprimir ou guardar em
// PDF, use a impressão do navegador.
export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { data: row } = await supabase.from('engagements').select('*').eq('id', id).maybeSingle();
  if (!row) notFound();
  const draft = await loadDraft(supabase, row);
  const hash = createHash('sha256').update(draftText(draft)).digest('hex');
  const e = (await loadReplay(supabase, row)).replay.engagement;
  const prazo = draft.sections.find((x) => x.heading === '3. Prazo')?.paragraphs[0] ?? '';
  const materiais = draft.sections.find((x) => x.heading === '2-A. Materiais')?.paragraphs.length ?? 0;
  const plain = plainSummary(e, { duracao: prazo, materiais: Math.max(0, materiais - 2) }, (await engagementSide(supabase, user!.id, row)) ?? 'plataforma');

  return (
    <div className="space-y-6">
      <Link href={`/app/contratacoes/${id}`} className="text-[17px] text-slate-600 hover:underline print:hidden">
        ← Contratação
      </Link>
      <aside className="rounded-2xl border border-tinta-100 bg-tinta-50 p-6 text-[17px] print:hidden">
        <h2 className="font-semibold">Em linguagem simples</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {plain.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="mt-2 text-[15px] text-slate-600">Este resumo ajuda a ler; o que vale é o texto do contrato abaixo.</p>
      </aside>
      <article className="rounded-2xl border border-slate-200 bg-white p-8 text-[17px] leading-relaxed print:border-0 print:p-0">
        <h1 className="text-[20px] leading-snug font-semibold">{draft.title}</h1>
        {draft.sections.map((s) => (
          <section key={s.heading} className="mt-6">
            <h2 className="font-semibold">{s.heading}</h2>
            {s.paragraphs.filter(Boolean).map((p, i) => (
              <p key={i} className="mt-2 whitespace-pre-line">
                {p}
              </p>
            ))}
          </section>
        ))}
        <p className="mt-8 break-all text-[15px] text-slate-500">Resumo SHA-256 deste texto: {hash}</p>
      </article>
      <p className="text-[15px] text-slate-500 print:hidden">
        A assinatura qualificada com Chave Móvel Digital será ligada quando o serviço de assinatura estiver contratado. Até
        lá, a assinatura na plataforma regista a aceitação, a hora e o resumo do texto aceite. O texto da minuta deve ser
        validado por um advogado antes do lançamento.
      </p>
    </div>
  );
}
