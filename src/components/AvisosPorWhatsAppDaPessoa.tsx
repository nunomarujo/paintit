import { AvisosPorWhatsApp } from '@/components/AvisosPorWhatsApp';
import { NumerosDeWhatsApp } from '@/components/NumerosDeWhatsApp';
import { BRAND } from '@/config/brand';
import { configuracaoWhatsApp } from '@/domain/whatsapp';
import type { NumeroDeWhatsApp } from '@/app/app/perfil/whatsapp-actions';
import { getUser } from '@/lib/supabase/server';

/**
 * O consentimento e, ao lado, o cartão com os números em vigor (06/11/2026). Lê o que é da pessoa em sessão —
 * os números confirmados e o consentimento — para os ecrãs que o oferecem não terem de o fazer cada um.
 */

async function numerosDaPessoa(): Promise<{ lista: NumeroDeWhatsApp[]; alerta: boolean }> {
  const { supabase, user } = await getUser();
  const [{ data: numeros }, { data: preferencia }] = await Promise.all([
    supabase.from('whatsapp_numeros').select('id, numero, confirmado_em').eq('user_id', user!.id).order('confirmado_em'),
    supabase.from('survey_availability').select('alerta_whatsapp').eq('user_id', user!.id).maybeSingle(),
  ]);
  return {
    lista: (numeros ?? []).map((n) => ({ id: n.id, numero: n.numero, confirmadoEm: n.confirmado_em })),
    alerta: preferencia?.alerta_whatsapp ?? false,
  };
}

function Cartao({ lista }: { lista: NumeroDeWhatsApp[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-[17px] font-semibold text-tinta-900">Números em vigor</h3>
      <div className="mt-3">
        <NumerosDeWhatsApp
          numeros={lista}
          whatsappDisponivel={configuracaoWhatsApp(process.env) !== null}
          numeroDaPlataforma={BRAND.whatsapp}
        />
      </div>
    </div>
  );
}

/** O cartão dos números, sozinho (onde o consentimento já vive noutro formulário). */
export async function CartaoDosNumeros() {
  const { lista } = await numerosDaPessoa();
  return <Cartao lista={lista} />;
}

/** O consentimento à esquerda, o cartão dos números à direita. */
export async function AvisosPorWhatsAppDaPessoa() {
  const { lista, alerta } = await numerosDaPessoa();
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <AvisosPorWhatsApp alertaWhatsApp={alerta} temNumero={lista.length > 0} />
      <Cartao lista={lista} />
    </div>
  );
}
