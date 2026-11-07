import type { SupabaseClient } from '@supabase/supabase-js';
import { emailsDoHtml } from '@/domain/crmEnriquecimento';
import { PRECISA_DE_PESSOA, classificarMensagem, enderecoDe, rascunhoDeResposta, semCitacao, type Categoria } from '@/domain/crmRespostas';
import type { Database } from '@/lib/database.types';
import { registarDesistencia } from '@/lib/crmServico';

const MAX_TEXTO = 4000;

export interface EntradaBruta {
  de: string;
  assunto: string;
  texto: string;
  /** O identificador da mensagem no correio de origem: a mesma mensagem entregue duas vezes conta uma. */
  messageId?: string;
}

export interface Tratada {
  duplicada: boolean;
  categoria?: Categoria;
  contactoId?: string | null;
  rascunho?: boolean;
}

/**
 * Guarda uma resposta recebida, classifica-a e faz sozinha só o que deve ser feito logo: respeitar um pedido para sair, parar
 * perante uma recusa, deixar de escrever para um endereço que ressaltou. O resto fica na caixa, à espera de uma pessoa. O texto
 * que vem de fora é dados: nunca é seguido nem executado, só classificado e mostrado.
 */
export async function tratarMensagemRecebida(db: SupabaseClient<Database>, e: EntradaBruta): Promise<Tratada> {
  const messageId = e.messageId?.trim().slice(0, 300) || null;
  if (messageId) {
    const { data: ja } = await db.from('crm_mensagens').select('id').eq('message_id', messageId).maybeSingle();
    if (ja) return { duplicada: true };
  }

  const procurar = async (endereco: string | null) =>
    endereco ? ((await db.from('crm_contactos').select('id, nome, estado').ilike('email', endereco).maybeSingle()).data ?? null) : null;
  const categoria = classificarMensagem({ de: e.de, assunto: e.assunto, texto: e.texto });
  let contacto = await procurar(enderecoDe(e.de));
  // Um ressalto vem do servidor de correio, não do contacto: o endereço que falhou está dentro da mensagem.
  if (!contacto && categoria === 'ressalto') {
    for (const candidato of emailsDoHtml(e.texto).slice(0, 10)) {
      contacto = await procurar(candidato);
      if (contacto) break;
    }
  }
  const precisa = PRECISA_DE_PESSOA.includes(categoria);
  const texto = (semCitacao(e.texto) || e.texto).trim().slice(0, MAX_TEXTO);

  const { data: entrada, error } = await db
    .from('crm_mensagens')
    .insert({
      contacto_id: contacto?.id ?? null,
      direcao: 'entrada',
      de: e.de.slice(0, 300),
      assunto: e.assunto.slice(0, 300),
      texto,
      categoria,
      estado: precisa ? 'nova' : 'tratada',
      message_id: messageId,
    })
    .select('id')
    .single();
  if (error || !entrada) {
    // Uma corrida entre duas entregas da mesma mensagem: a segunda é duplicada, não um erro.
    if (error?.code === '23505') return { duplicada: true };
    throw new Error(`crm_mensagens: ${error?.message ?? 'sem linha'}`);
  }

  if (contacto) {
    if (categoria === 'desistencia') await registarDesistencia(db, contacto.id);
    else if (categoria === 'recusa') {
      await db.from('crm_contactos').update({ estado: 'recusou' }).eq('id', contacto.id);
      await db.from('crm_envios').update({ estado: 'rejeitado' }).eq('contacto_id', contacto.id).in('estado', ['proposto', 'aprovado']);
      await db.from('crm_eventos').insert({ contacto_id: contacto.id, tipo: 'resposta', detalhe: 'recusa' });
    } else if (categoria === 'ressalto') {
      // O endereço não existe: sem email, a base recusa qualquer envio; marca-se como lido para o enriquecimento não voltar lá.
      await db.from('crm_contactos').update({ email: null, enriquecido_em: new Date().toISOString() }).eq('id', contacto.id);
    } else if (precisa) {
      await db.from('crm_eventos').insert({ contacto_id: contacto.id, tipo: 'resposta', detalhe: categoria });
      if (contacto.estado === 'novo' || contacto.estado === 'contactado') await db.from('crm_contactos').update({ estado: 'respondeu' }).eq('id', contacto.id);
    }
  }

  // Rascunho de resposta a quem mostrou interesse: espera por uma pessoa.
  let rascunho = false;
  const r = contacto ? rascunhoDeResposta(categoria, { nome: contacto.nome, assuntoOriginal: e.assunto }) : null;
  if (contacto && r) {
    const { data: envio } = await db
      .from('crm_envios')
      .select('campanha_id')
      .eq('contacto_id', contacto.id)
      .eq('estado', 'enviado')
      .order('enviado_em', { ascending: false })
      .limit(1)
      .maybeSingle();
    await db.from('crm_mensagens').insert({
      contacto_id: contacto.id,
      direcao: 'saida',
      assunto: r.assunto,
      texto: r.corpo,
      estado: 'rascunho',
      em_resposta_a: entrada.id,
      campanha_id: envio?.campanha_id ?? null,
    });
    rascunho = true;
  }
  return { duplicada: false, categoria, contactoId: contacto?.id ?? null, rascunho };
}
