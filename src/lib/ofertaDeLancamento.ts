import 'server-only';
import { cookies } from 'next/headers';
import { CURRENT_RULES } from '@/domain/rules';
import { COOKIE_DE_ORIGEM, VERSAO_DE_LANCAMENTO, concessaoPara, origemDoCookie } from '@/domain/ofertaDeLancamento';
import { localDate } from '@/domain/deadline';
import { adminClient } from '@/lib/supabase/admin';

/**
 * Concede a oferta de lançamento a uma entidade acabada de criar, se chegou pelo QR de um flyer (pintores ou fornecedores) ou
 * pelo link de um email do CRM. Corre com a chave de serviço (a política de acesso só deixa o pintor criar subscrições «por pagar»). Nunca
 * impede o registo: se algo falha, regista-se o erro e a entidade fica como estava.
 */
export async function aplicarOfertaDeLancamento(orgId: string, kind: string): Promise<void> {
  try {
    const origem = origemDoCookie((await cookies()).get(COOKIE_DE_ORIGEM)?.value);
    if (!origem) return;
    const db = adminClient();
    if (!db) return;
    const hoje = localDate(new Date(), CURRENT_RULES.timeZone);
    const concessao = concessaoPara(kind, origem, hoje);

    // Uma só oferta por entidade: a chave primária recusa a segunda.
    let contactoId: string | null = null;
    if (origem.codigo) {
      const { data: c } = await db.from('crm_contactos').select('id').eq('codigo', origem.codigo).maybeSingle();
      contactoId = c?.id ?? null;
    }
    const { error: erroRegisto } = await db.from('ofertas_de_lancamento').insert({
      org_id: orgId,
      origem_flyer: origem.flyer,
      origem_contacto: contactoId,
      concedida: concessao?.tipo ?? null,
      valida_ate: concessao?.validaAte ?? null,
    });
    if (erroRegisto) return;

    if (concessao?.tipo === 'pro') {
      const { data: viva } = await db.from('org_subscriptions').select('id').eq('org_id', orgId).in('estado', ['ativa', 'por_pagar']).maybeSingle();
      if (!viva) {
        const { error } = await db.from('org_subscriptions').insert({
          org_id: orgId,
          plano: 'pro',
          periodicidade: 'mensal',
          estado: 'cancelada',
          preco_versao: VERSAO_DE_LANCAMENTO,
          preco_cents: 0,
          valida_ate: concessao.validaAte,
        });
        if (error) console.error('oferta de lançamento: não foi possível conceder o Pro:', error.message);
      }
    }
    if (concessao?.tipo === 'catalogo') {
      // Um fornecedor só tem uma linha (chave primária): se já tem plano, não se mexe.
      const { data: existente } = await db.from('supplier_subscriptions').select('org_id').eq('org_id', orgId).maybeSingle();
      if (!existente) {
        const { error } = await db.from('supplier_subscriptions').insert({
          org_id: orgId,
          plan: 'catalogo',
          status: 'ativa',
          price_cents: 0,
          valida_ate: concessao.validaAte,
          origem: 'lancamento',
          updated_by: null,
        });
        if (error) console.error('oferta de lançamento: não foi possível conceder o catálogo:', error.message);
      }
    }
    if (contactoId) {
      await db.from('crm_eventos').insert({ contacto_id: contactoId, tipo: 'adesao', detalhe: `org ${orgId}` });
      await db.from('crm_contactos').update({ estado: 'aderiu' }).eq('id', contactoId);
    }
  } catch (err) {
    console.error('oferta de lançamento:', err);
  }
}
