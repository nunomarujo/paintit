import Link from 'next/link';
import { elegibilidade, type Habilitacao, type Subcategoria } from '@/domain/obrasPublicas';
import { TenderRow } from '@/components/TenderRow';
import type { Database } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

const dias = (ate: string) => Math.ceil((new Date(ate).getTime() - Date.now()) / 86_400_000);

/**
 * Concursos abertos. Responde a uma pergunta: **qual dos concursos anunciados é que esta empresa pode
 * ganhar, e até quando tem de entregar**. Por isso o veredicto de elegibilidade é a primeira coisa de
 * cada linha, e a lista vem ordenada por prazo dentro dos elegíveis.
 *
 * Regras de alarme (iguais ao resto da aplicação): uma só banda com fundo de cor no topo; nas linhas o
 * alarme é texto, não cor de fundo; vermelho só para o que já fechou ou caducou.
 *
 * É a vista secundária da secção, e de propósito: desde Outubro de 2026 a maior parte da obra pública
 * de pintura é adjudicada sem anúncio, e é o mapa — não esta lista — que mostra esse mercado.
 */
export async function Concursos({
  supabase,
  orgId,
  soElegiveis,
}: {
  supabase: SupabaseClient<Database>;
  orgId: string;
  /** Mostrar só os que o título da empresa cobre. O contrário é ver também os que ficam fora. */
  soElegiveis: boolean;
}) {
  const [{ data: prefs }, { data: docs }] = await Promise.all([
    supabase.from('painter_tender_prefs').select('distritos').eq('org_id', orgId).maybeSingle(),
    supabase
      .from('org_documents')
      .select('kind, classe, subcategorias, status')
      .eq('org_id', orgId)
      .in('kind', ['alvara_impic', 'certificado_impic'])
      .eq('status', 'aprovado'),
  ]);

  const alvara = (docs ?? []).find((d) => d.kind === 'alvara_impic');
  const certificado = (docs ?? []).find((d) => d.kind === 'certificado_impic');
  const habilitacao: Habilitacao = alvara
    ? { titulo: 'alvara', classe: alvara.classe, subcategorias: alvara.subcategorias ?? [] }
    : certificado
      ? { titulo: 'certificado', classe: null, subcategorias: certificado.subcategorias ?? [] }
      : { titulo: 'nenhum', classe: null, subcategorias: [] };

  const distritos = prefs?.distritos ?? [];
  let q = supabase.from('public_tenders').select('*').gte('prazo_entrega', new Date().toISOString()).order('prazo_entrega');
  if (distritos.length > 0) q = q.in('distrito', distritos);
  const { data: concursos } = await q;

  const avaliados = (concursos ?? []).map((c) => ({
    ...c,
    e: elegibilidade(habilitacao, c.valor_cents ?? 0, (c.subcategorias ?? []) as Subcategoria[]),
    faltam: dias(c.prazo_entrega),
  }));
  const elegiveis = avaliados.filter((c) => c.e.veredicto === 'pode');
  const fora = avaliados.filter((c) => c.e.veredicto !== 'pode');
  const aFechar = elegiveis.filter((c) => c.faltam <= 7);
  const lista = soElegiveis ? elegiveis : [...elegiveis, ...fora];

  const habilitacaoTexto =
    habilitacao.titulo === 'alvara'
      ? `alvará classe ${habilitacao.classe ?? '—'}`
      : habilitacao.titulo === 'certificado'
        ? 'certificado de empreiteiro'
        : 'sem alvará nem certificado';

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <h2 className="text-[20px] font-semibold">Concursos abertos</h2>
        <p className="mt-1 text-[17px] text-slate-600">
          {elegiveis.length} {elegiveis.length === 1 ? 'aberto' : 'abertos'} para a empresa · {habilitacaoTexto} ·{' '}
          {distritos.length > 0 ? distritos.join(', ') : 'todos os distritos'}
        </p>
      </header>

      {aFechar.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[17px] text-amber-900">
          <strong className="font-semibold">
            {aFechar.length} {aFechar.length === 1 ? 'fecha' : 'fecham'} nos próximos 7 dias:
          </strong>{' '}
          {aFechar[0]!.objeto} — {aFechar[0]!.entidade}, {aFechar[0]!.faltam}{' '}
          {aFechar[0]!.faltam === 1 ? 'dia' : 'dias'}.
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-[17px]">
        <p className="text-slate-600">
          Cobertura a crescer distrito a distrito; a lista é verificada pela equipa antes de aparecer aqui.
        </p>
        <Link
          href={soElegiveis ? '/app/obras-publicas?ver=concursos&todos=1' : '/app/obras-publicas?ver=concursos'}
          className="font-semibold text-tinta-700 underline underline-offset-4"
        >
          {soElegiveis ? `Ver também os que ficam fora do alvará (${fora.length})` : 'Mostrar só os que o alvará cobre'}
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-[17px] text-slate-600">
          <p className="font-semibold text-slate-900">Ainda não há concursos abertos nos seus distritos.</p>
          <p className="mt-2">
            A lista é curada pela equipa a partir dos anúncios da 2.ª série do Diário da República. Desde 1 de Outubro de
            2026, uma empreitada até 1 000 000 € pode ser adjudicada por consulta prévia, sem anúncio público — por isso
            o que aparece aqui é uma parte do mercado, não o mercado todo.
          </p>
          {habilitacao.titulo === 'nenhum' && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
              Sem alvará nem certificado do IMPIC validado, nenhuma obra pública é elegível. O certificado habilita até
              40 000 € e, nas subcategorias de pintura e de impermeabilizações, não exige quadro técnico.
            </p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {lista.map((c) => (
            <TenderRow key={c.id} c={c as never} e={c.e} faltam={c.faltam} />
          ))}
        </ul>
      )}

      <p className="text-[15px] text-slate-500">
        A classe do título mede-se pelo valor global da empreitada, não pela parte de pintura (artigo 8.º da Lei
        41/2015). Desde Outubro de 2026, uma empreitada até 1 000 000 € também pode ser adjudicada por convite, sem
        anúncio nenhum — por isso ser conhecido da entidade continua a valer tanto como ver a lista. Os documentos de
        não dívida passaram a ser obtidos pela própria entidade; basta a situação estar regularizada. A plataforma
        prepara o dossier, não submete a candidatura no portal da entidade.
      </p>
    </div>
  );
}
