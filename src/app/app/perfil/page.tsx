import { getUser } from '@/lib/supabase/server';
import { ProfileForm } from './ProfileForm';
import { PasswordForm } from './PasswordForm';
import { AvisosPorWhatsApp } from '@/components/AvisosPorWhatsApp';
import { configuracaoWhatsApp } from '@/domain/whatsapp';

/**
 * Perfil em quadros lado a lado (promotor, 01/11/2026: nada de colunas únicas encostadas à
 * esquerda). Três áreas com função distinta: a conta (só leitura), os dados pessoais, o acesso.
 */
export default async function ProfilePage() {
  const { supabase, user } = await getUser();
  const [{ data: profile }, { data: preferencia }] = await Promise.all([
    supabase.from('profiles').select('nome, telefone, email').eq('user_id', user!.id).maybeSingle(),
    supabase.from('survey_availability').select('alerta_whatsapp, telemovel_whatsapp').eq('user_id', user!.id).maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">O seu perfil</h1>
        <p className="mt-1 text-[17px] text-slate-600">
          O nome aparece à sua equipa; nunca é mostrado a pintores ou clientes antes da apresentação.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-12">
        <section className="rounded-2xl bg-tinta-900 p-5 text-white lg:col-span-3">
          <p className="text-[13px] font-semibold text-lima">Conta</p>
          <p className="mt-2 break-all text-[17px] font-semibold">{user!.email}</p>
          <p className="mt-2 text-[15px] text-tinta-200">É com este email que entra. Para o mudar, fale com a equipa da plataforma.</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5">
          <h2 className="text-[17px] font-semibold text-tinta-900">Dados pessoais</h2>
          <p className="mt-0.5 mb-4 text-[15px] text-slate-500">Como a sua equipa o vê.</p>
          <ProfileForm nome={profile?.nome ?? ''} telefone={profile?.telefone ?? null} />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-4">
          <h2 className="text-[17px] font-semibold text-tinta-900">Acesso</h2>
          <p className="mt-0.5 mb-4 text-[15px] text-slate-500">Palavra-passe, para quem não entra pelo link do email.</p>
          <PasswordForm />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-6">
          <h2 className="text-[17px] font-semibold text-tinta-900">Avisos por WhatsApp</h2>
          <p className="mt-0.5 mb-4 text-[15px] text-slate-500">Os avisos chegam sempre por email e aqui na aplicação; o WhatsApp é um extra.</p>
          <AvisosPorWhatsApp
            alertaWhatsApp={preferencia?.alerta_whatsapp ?? false}
            telemovel={preferencia?.telemovel_whatsapp ?? null}
            whatsappDisponivel={configuracaoWhatsApp(process.env) !== null}
          />
        </section>
      </div>
    </div>
  );
}
