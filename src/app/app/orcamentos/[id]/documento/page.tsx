import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/components/PrintButton';
import { ProposalDocument } from '@/components/ProposalDocument';
import { temPro } from '@/domain/painterPlan';
import { painterOrgs, painterSubscription } from '@/lib/queries';
import { getUser } from '@/lib/supabase/server';
import { Voltar } from '@/components/Voltar';

/**
 * O documento de um orçamento a cliente próprio. Mesmo componente do orçamento do mercado — não
 * existem dois documentos para a mesma coisa.
 *
 * A marca própria — logótipo e contactos da empresa, sem marca de água, com a plataforma só numa
 * linha no fundo — é do plano Pro (decisão de 25/10/2026). Sem plano, o documento sai na mesma, com
 * a marca Quem Pinta.pt: quem não subscreve continua a poder orçamentar e a entregar ao cliente, que
 * é o que não se fecha nunca.
 */
export default async function PrivateQuoteDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const orgs = await painterOrgs(supabase, user!.id);
  const org = orgs[0];
  if (!org) notFound();

  const { data: q } = await supabase.from('painter_quotes').select('*').eq('id', id).maybeSingle();
  if (!q) notFound();

  const [{ data: linhas }, { data: empresa }, subscricao] = await Promise.all([
    supabase.from('painter_quote_lines').select('*').eq('quote_id', id).order('ordem'),
    supabase.from('organizations').select('nome, nif, telefone, email_contacto').eq('id', org.id).maybeSingle(),
    painterSubscription(supabase, org.id),
  ]);
  const pro = temPro(subscricao, new Date().toISOString().slice(0, 10));

  const areaTotalCm2 = (linhas ?? []).filter((l) => l.unidade === 'm2').reduce((n, l) => n + l.quantidade, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Voltar href={`/app/orcamentos/${id}`}>Voltar ao orçamento</Voltar>
        <PrintButton />
      </div>
      {/* Dito antes de imprimir, não depois: quem imprimir sem saber entrega ao cliente um documento
          com a marca da plataforma e só percebe no fim. */}
      {!pro && (
        <p className="rounded-xl border border-tinta-200 bg-tinta-50/60 px-4 py-3 text-[17px] text-slate-800 print:hidden">
          Este documento sai com a marca Quem Pinta.pt. Com o{' '}
          <Link href="/app/subscricao" className="font-semibold text-tinta-800 underline">
            plano Pro
          </Link>{' '}
          sai com o logótipo e os contactos da sua empresa no topo, sem marca de água.
        </p>
      )}
      <ProposalDocument
        marca={pro ? 'propria' : 'quempinta'}
        revelado
        identity={{
          label: empresa?.nome ?? 'A sua empresa',
          nif: empresa?.nif ?? null,
          telefone: empresa?.telefone ?? null,
          emailContacto: empresa?.email_contacto ?? null,
        }}
        request={{
          ref: `ORC-${String(q.numero).padStart(4, '0')}`,
          concelho: q.local ?? '',
          tipoObra: 'fachadas',
          tipoImovel: null,
          areaTotalCm2,
        }}
        zones={[]}
        lines={(linhas ?? []).map((l) => ({
          id: l.id,
          categoria: l.categoria,
          descricao: l.descricao,
          superficie: null,
          quantidade: l.quantidade,
          unidade: l.unidade,
          precoUnitario: l.preco_unitario,
          demaos: l.demaos,
          produto: l.produto,
          inclusao: l.inclusao,
        }))}
        terms={{
          ivaBps: q.iva_bps,
          validade: q.validade,
          inicioPossivel: q.inicio_possivel,
          duracaoDias: q.duracao_dias,
          adiantamentoBps: 0,
          precoAjusteM2: null,
          garantiaAnos: q.garantia_anos,
          exclusoes: q.exclusoes,
          notas: q.notas,
          fases: [],
          confirmaMaoObra: true,
          seguroRc: null,
          seguroAt: null,
        }}
        capoto={null}
        submittedAt={q.enviado_em}
      />
    </div>
  );
}
