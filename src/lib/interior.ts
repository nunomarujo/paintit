import 'server-only';
import type { Database } from '@/lib/database.types';
import type { InteriorInicial } from '@/app/app/pedidos/[id]/InteriorDaHabitacao';
import type { MaterialDeReferencia } from '@/components/ListaDeMateriais';
import { MODOS_INTERIOR, isTipoDeDivisao, type DivisaoEnviada, type ModoInterior } from '@/domain/interior';
import type { ReferenceProduct } from '@/lib/reference';

type Room = Database['public']['Tables']['request_rooms']['Row'];
type Pedido = Pick<Database['public']['Tables']['work_requests']['Row'], 'interior_modo' | 'interior_pe_direito_cm' | 'interior_pe_direito_corrente'>;

const m = (cm: number | null) => (cm === null ? null : cm / 100);

/** As divisões gravadas, de volta ao que o ecrã edita. Uma divisão de tipo desconhecido não volta. */
export function divisoesDasLinhas(rows: readonly Room[]): DivisaoEnviada[] {
  return rows
    .filter((r) => isTipoDeDivisao(r.tipo))
    .map((r) => ({
      tipo: r.tipo as DivisaoEnviada['tipo'],
      numero: r.numero,
      comprimentoM: m(r.comprimento_cm),
      larguraM: m(r.largura_cm),
      perimetroM: m(r.perimetro_cm),
      peDireitoM: m(r.pe_direito_cm),
      vaos: (Array.isArray(r.vaos) ? (r.vaos as { largura_cm?: number; altura_cm?: number; quantidade?: number; descontar?: string }[]) : []).map((v) => ({
        larguraM: (v.largura_cm ?? 0) / 100,
        alturaM: (v.altura_cm ?? 0) / 100,
        quantidade: v.quantidade ?? 1,
        descontar: v.descontar === 'sim' || v.descontar === 'nao' ? v.descontar : 'auto',
      })),
      pintarParedes: r.pintar_paredes,
      pintarTeto: r.pintar_teto,
      areaParedesManualM2: m(r.area_paredes_manual_cm2),
      areaTetoManualM2: m(r.area_teto_manual_cm2),
      corReferencia: r.cor_referencia,
      corHex: r.cor_hex,
      margem: r.margem_bp === null ? null : r.margem_bp / 10_000,
    }));
}

export function interiorInicial(req: Partial<Pedido>, rows: readonly Room[]): InteriorInicial {
  const modo = (MODOS_INTERIOR as readonly string[]).includes(req.interior_modo ?? '') ? (req.interior_modo as ModoInterior) : null;
  return { modo, peDireitoM: m(req.interior_pe_direito_cm ?? null), aceiteComoCorrente: req.interior_pe_direito_corrente ?? false, divisoes: divisoesDasLinhas(rows) };
}

export const paraMaterial = (r: ReferenceProduct): MaterialDeReferencia => ({
  id: r.id,
  marca: r.marca,
  nome: r.nome,
  tipo: r.tipo,
  precoCents: r.preco_referencia_cents,
  embalagemL: r.preco_embalagem_l,
  m2PorEmbalagem: r.m2_por_embalagem,
  rendimentoM2L: r.rendimento_m2_l,
  embalagens: r.embalagens_l ?? [],
  precoData: r.preco_data,
  precoFonte: r.preco_fonte,
  fichaTecnica: r.url_ficha_tecnica,
  fotoPath: r.foto_path,
});
