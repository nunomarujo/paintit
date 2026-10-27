import { localDate } from '@/domain/deadline';
import { CURRENT_RULES } from '@/domain/rules';
import {
  chaveDoToque,
  ehEmail,
  toquesDaCobranca,
  toquesDevidos,
  toquesDoOrcamento,
  type PedidoParaToque,
  type Toque,
} from '@/domain/toques';
import { notifyCobranca, notifyJanela, notifySeguimento, notifySemana } from '@/lib/notify';
import { adminClient } from '@/lib/supabase/admin';

/**
 * A tarefa diária dos avisos automáticos (27/10/2026).
 *
 * Olha para os pedidos com anúncio e pergunta ao domínio quem é tocado hoje. Quem já foi tocado fica
 * na tabela `toques`, com chave única — por isso correr duas vezes no mesmo dia não incomoda
 * ninguém duas vezes, e não é preciso a tarefa lembrar-se de nada.
 *
 * **Regista primeiro, envia depois.** Se o registo falhar, não se envia; se o envio falhar depois de
 * registado, o aviso perde-se. É a troca certa: um pintor que não recebe um email volta a ver tudo
 * na aplicação, mas um cliente que recebe o mesmo aviso cinco vezes desinstala-nos da cabeça.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Não autorizado', { status: 401 });
  const db = adminClient();
  if (!db) return new Response('Não configurado', { status: 503 });

  const hoje = localDate(new Date(), CURRENT_RULES.timeZone);
  const { data: listings, error } = await db.from('request_listings').select('request_id, prazo_propostas, aberto');
  if (error) {
    console.error('toques: ' + error.message);
    return new Response('Erro a ler os anúncios', { status: 500 });
  }

  const ids = (listings ?? []).map((l) => l.request_id);
  const [{ data: props }, { data: jaEnviados }] = await Promise.all([
    db.from('proposals').select('request_id').in('request_id', ids).neq('status', 'rascunho'),
    db.from('toques').select('tipo, alvo, destinatario').in('alvo', ids),
  ]);

  const quantas = new Map<string, number>();
  for (const p of props ?? []) quantas.set(p.request_id, (quantas.get(p.request_id) ?? 0) + 1);
  const feitos = new Set((jaEnviados ?? []).map((t) => chaveDoToque(t as Toque)));

  // Os orçamentos próprios, com seguimento autorizado: três toques ao cliente do pintor.
  const { data: orcamentos } = await db
    .from('painter_quotes')
    .select('id, enviado_em, estado, seguimento, cliente_contacto')
    .eq('seguimento', true)
    .eq('estado', 'enviado');
  const { data: toquesDeOrcamentos } = orcamentos?.length
    ? await db.from('toques').select('tipo, alvo, destinatario').in('alvo', orcamentos.map((q) => q.id))
    : { data: [] };
  for (const t of toquesDeOrcamentos ?? []) feitos.add(chaveDoToque(t as Toque));

  // As tranches por receber de obras com cobrança autorizada.
  const { data: obrasComCobranca } = await db.from('worksites').select('id, cliente_contacto').eq('cobranca', true);
  const { data: tranches } = obrasComCobranca?.length
    ? await db
        .from('worksite_entries')
        .select('id, prevista, recebida_em, worksite_id')
        .eq('tipo', 'tranche')
        .is('recebida_em', null)
        .in('worksite_id', obrasComCobranca.map((o) => o.id))
    : { data: [] };
  const { data: toquesDeTranches } = tranches?.length
    ? await db.from('toques').select('tipo, alvo, destinatario').in('alvo', tranches.map((t) => t.id))
    : { data: [] };
  for (const t of toquesDeTranches ?? []) feitos.add(chaveDoToque(t as Toque));
  const emailDaObra = new Map((obrasComCobranca ?? []).map((o) => [o.id, ehEmail(o.cliente_contacto)]));

  const devidos = (listings ?? []).flatMap((l) =>
    toquesDevidos(
      { requestId: l.request_id, prazo: l.prazo_propostas, aberto: l.aberto, propostas: quantas.get(l.request_id) ?? 0 } satisfies PedidoParaToque,
      hoje,
      feitos,
    ),
  );

  devidos.push(
    ...(orcamentos ?? []).flatMap((q) =>
      toquesDoOrcamento(
        {
          quoteId: q.id,
          enviadoEm: q.enviado_em ? q.enviado_em.slice(0, 10) : null,
          estado: q.estado,
          seguimento: q.seguimento,
          temEmail: ehEmail(q.cliente_contacto),
        },
        hoje,
        feitos,
      ),
    ),
  );

  devidos.push(
    ...(tranches ?? []).flatMap((t) =>
      toquesDaCobranca(
        {
          trancheId: t.id,
          prevista: t.prevista,
          recebida: !!t.recebida_em,
          cobranca: true,
          temEmail: emailDaObra.get(t.worksite_id) ?? false,
        },
        hoje,
        feitos,
      ),
    ),
  );

  let enviados = 0;
  for (const t of devidos) {
    // A chave única é a garantia de que não repete, mesmo com duas tarefas ao mesmo tempo: se outra
    // já registou este toque, a inserção falha e salta-se.
    const { error: dup } = await db.from('toques').insert({ tipo: t.tipo, alvo: t.alvo, destinatario: t.destinatario });
    if (dup) continue;
    if (t.tipo === 'janela_abriu' || t.tipo === 'janela_acaba') {
      // O destinatário destes é sempre um dos dois lados da obra, nunca um cliente do pintor.
      if (t.destinatario === 'cliente_do_pintor') continue;
      await notifyJanela(t.tipo, t.alvo, t.destinatario).catch((e) => console.error('toques: ' + String(e)));
    } else if (t.tipo.startsWith('cobranca')) {
      await notifyCobranca(t.tipo as 'cobranca_1', t.alvo).catch((e) => console.error('toques: ' + String(e)));
    } else {
      await notifySeguimento(t.tipo as 'orcamento_1', t.alvo).catch((e) => console.error('toques: ' + String(e)));
    }
    enviados += 1;
  }

  // Segunda-feira: o email da semana a cada empresa de pintura, se tiver matéria.
  let semana = 0;
  if (new Date(`${hoje}T12:00:00Z`).getUTCDay() === 1) {
    const chave = `semana_${hoje}`;
    const { data: pintores } = await db.from('organizations').select('id').eq('kind', 'pintor');
    for (const p of pintores ?? []) {
      // O mesmo registo de sempre: a chave leva a data da segunda, por isso repete-se todas as
      // semanas mas nunca duas vezes na mesma.
      const { error: dup } = await db.from('toques').insert({ tipo: chave, alvo: p.id, destinatario: 'pintor' });
      if (dup) continue;
      if (await notifySemana(p.id, hoje).catch(() => false)) semana += 1;
    }
  }

  const resumo = {
    hoje,
    semana,
    anuncios: ids.length,
    orcamentos: (orcamentos ?? []).length,
    tranches: (tranches ?? []).length,
    devidos: devidos.length,
    enviados,
  };
  console.log('toques: ' + JSON.stringify(resumo));
  return Response.json(resumo);
}
