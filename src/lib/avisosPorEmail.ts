import 'server-only';
import { sendEmail } from '@/lib/notify';
import { enviarModelo } from '@/lib/whatsapp';
import { configuracaoWhatsApp, modeloDoAviso, variaveisDoAviso } from '@/domain/whatsapp';
import { adminClient } from '@/lib/supabase/admin';

/**
 * Esvaziar a fila dos avisos por email (31/10/2026).
 *
 * A fila vive na base de dados porque os avisos de prazo nascem lá — a verificação de vencimentos corre ao
 * minuto dentro do Postgres — e os emails saem daqui. Dois caminhos pedem este esvaziamento: o `pg_net`,
 * logo que um aviso entra na fila, e uma tarefa diária, como rede de último recurso. É a mesma função nos
 * dois casos, de propósito: um caminho a mais não é um comportamento a mais.
 *
 * **Reclamar primeiro, enviar depois.** `private.reclamar_avisos` marca as linhas como `a_enviar` numa só
 * instrução, com `for update skip locked`, por isso os dois caminhos a correr ao mesmo tempo nunca apanham
 * a mesma linha. Se esta função morrer a meio, a linha volta à fila cinco minutos depois.
 *
 * A pertinência é reconfirmada do lado da base, imediatamente antes de entregar as linhas: um aviso cuja
 * tentativa mudou de dono é dispensado em vez de enviado.
 *
 * Nada aqui promete entrega. O que se garante é que o envio é **tentado**, com repetições e recuo
 * progressivo, e que o aviso continua visível na aplicação mesmo que o email nunca saia.
 */

export type ResumoDoEsvaziamento = {
  reclamados: number;
  enviados: number;
  falhados: number;
  semEndereco: number;
  /** Só conta quando o canal está configurado e a pessoa o ligou. */
  whatsappEnviados: number;
  whatsappFalhados: number;
};

export async function esvaziarFilaDeAvisos(limite = 20): Promise<ResumoDoEsvaziamento> {
  const db = adminClient();
  const vazio: ResumoDoEsvaziamento = { reclamados: 0, enviados: 0, falhados: 0, semEndereco: 0, whatsappEnviados: 0, whatsappFalhados: 0 };
  if (!db) return vazio;

  const { data: linhas, error } = await db.rpc('reclamar_avisos', { p_limite: limite });
  if (error || !linhas || linhas.length === 0) return vazio;

  const resumo: ResumoDoEsvaziamento = { ...vazio, reclamados: linhas.length };
  // Sem o modelo genérico aprovado os avisos gerais não saem por WhatsApp (os convites têm o seu).
  const whatsapp = modeloDoAviso(process.env) ? configuracaoWhatsApp(process.env) : null;
  const modeloAviso = modeloDoAviso(process.env);

  for (const linha of linhas) {
    // WhatsApp, quando existe o canal e a pessoa o ligou. Independente do email: uma falha aqui não trava
    // o outro, e o resultado fica na própria linha. Sem consentimento, nem se tenta (02/11/2026).
    if (whatsapp) {
      const [{ data: pref }, { data: numeros }] = await Promise.all([
        db.from('survey_availability').select('alerta_whatsapp').eq('user_id', linha.destinatario).maybeSingle(),
        // Só números confirmados por mensagem recebida (06/11/2026), todos os da pessoa.
        db.from('whatsapp_numeros').select('numero').eq('user_id', linha.destinatario),
      ]);
      if (pref?.alerta_whatsapp && (numeros ?? []).length > 0) {
        let enviou = false;
        let falha: string | null = null;
        for (const n of numeros ?? []) {
          try {
            await enviarModelo(whatsapp, n.numero, modeloAviso!, variaveisDoAviso(linha.assunto, linha.texto, linha.link));
            enviou = true;
          } catch (e) {
            falha = (e instanceof Error ? e.message : 'Falha desconhecida.').slice(0, 500);
          }
        }
        if (enviou) {
          resumo.whatsappEnviados += 1;
          await db.from('avisos_por_email').update({ whatsapp_estado: 'enviado', whatsapp_em: new Date().toISOString(), whatsapp_erro: null }).eq('id', linha.id);
        } else {
          resumo.whatsappFalhados += 1;
          await db.from('avisos_por_email').update({ whatsapp_estado: 'falhou', whatsapp_erro: falha }).eq('id', linha.id);
        }
      } else {
        await db.from('avisos_por_email').update({ whatsapp_estado: 'sem_consentimento' }).eq('id', linha.id);
      }
    }

    // O endereço vem da conta, não da fila: uma pessoa que mude de email recebe no novo.
    const { data: conta } = await db.auth.admin.getUserById(linha.destinatario);
    const para = conta.user?.email;
    if (!para) {
      resumo.semEndereco += 1;
      await db.rpc('resultado_do_aviso', {
        p_id: linha.id,
        p_ok: false,
        p_erro: 'A conta do destinatário não tem endereço de email.',
      });
      continue;
    }
    try {
      await sendEmail([para], linha.assunto, [linha.texto], linha.link);
      resumo.enviados += 1;
      await db.rpc('resultado_do_aviso', { p_id: linha.id, p_ok: true });
    } catch (e) {
      resumo.falhados += 1;
      await db.rpc('resultado_do_aviso', {
        p_id: linha.id,
        p_ok: false,
        p_erro: e instanceof Error ? e.message : 'Falha desconhecida ao enviar.',
      });
    }
  }
  return resumo;
}

/** Autorização comum aos dois caminhos: o mesmo segredo que a Vercel usa nas tarefas, e que a base guarda
 * no Vault para a chamada do `pg_net`. Sem segredo configurado, ninguém entra. */
export function pedidoAutorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}
