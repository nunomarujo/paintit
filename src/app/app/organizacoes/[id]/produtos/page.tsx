import { ProdutosEPrecos, type ProdutoNaLista } from '@/components/vendas/ProdutosEPrecos';
import { matchesSearch } from '@/domain/search';
import { loadReferences } from '@/lib/reference';
import { contextoDoCatalogo } from './dados';

/**
 * Produtos e preços — separador «Produtos».
 *
 * Era uma página só, com a subscrição no topo, um formulário de produto sempre aberto, a lista, os
 * descontos e a entrega em obra, pela mesma ordem. Para ver um preço havia que rolar por tudo isso.
 * Agora são três separadores, e a subscrição saiu para «Empresa» (01/11/2026).
 */
export default async function ProdutosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  const { supabase, manager, catalogo } = await contextoDoCatalogo(id);

  const [{ data: products }, { data: discounts }, referencias] = await Promise.all([
    supabase.from('products').select('*').eq('org_id', id).order('marca').order('nome'),
    supabase.from('supplier_discounts').select('product_id, tipo, desconto_bps, valido_ate, painter_org_id').eq('org_id', id),
    loadReferences(supabase),
  ]);
  // A fotografia é do produto de referência do fabricante, não do produto do fornecedor.
  const fotoDe = new Map(referencias.map((r) => [r.id, r.foto_path ?? null]));

  // O melhor desconto já em vigor para um artigo, sem olhar ao cliente nem à área: é um sinal, não um
  // preço final — mostra o que já está coberto antes de se escolher o que falta atribuir.
  const hoje = new Date().toISOString().slice(0, 10);
  const descontoDe = (p: { id: string; tipo: string }) => {
    const bate = (discounts ?? []).filter(
      (d) =>
        !d.painter_org_id &&
        (!d.valido_ate || d.valido_ate >= hoje) &&
        (d.product_id === p.id || d.tipo === p.tipo || (!d.product_id && !d.tipo)),
    );
    return bate.length ? Math.max(...bate.map((d) => d.desconto_bps)) : null;
  };

  const termo = (q ?? '').trim();
  const lista: ProdutoNaLista[] = (products ?? [])
    .filter((p) => !termo || matchesSearch(termo, { tipo: p.tipo, texto: `${p.marca} ${p.nome} ${p.referencia ?? ''} ${p.descricao ?? ''}` }))
    .map((p) => ({
      id: p.id,
      marca: p.marca,
      nome: p.nome,
      referencia: p.referencia,
      tipo: p.tipo,
      embalagem: p.embalagem_ml ? `${(p.embalagem_ml / 1000).toLocaleString('pt-PT')} ${p.unidade}` : 'embalagem não indicada',
      precoCents: p.preco_fornecedor_cents,
      descontoMaximoBps: descontoDe(p),
      ativo: p.ativo,
      fotoPath: fotoDe.get(p.reference_product_id ?? '') ?? null,
    }));

  return (
    <ProdutosEPrecos
      base={`/app/organizacoes/${id}/produtos`}
      aba="produtos"
      produtos={lista}
      termo={termo}
      podeGerir={manager && catalogo}
      semCatalogo={!catalogo}
    />
  );
}
