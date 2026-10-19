import { getUser } from '@/lib/supabase/server';
import { ProfileForm } from './ProfileForm';
import { PasswordForm } from './PasswordForm';

export default async function ProfilePage() {
  const { supabase, user } = await getUser();
  const { data: profile } = await supabase.from('profiles').select('nome, telefone, email').eq('user_id', user!.id).maybeSingle();

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold">O seu perfil</h1>
      <p className="mt-2 text-sm text-slate-600">
        Conta: <strong>{user!.email}</strong>. O nome aparece à sua equipa; nunca é mostrado a pintores ou clientes antes
        da apresentação.
      </p>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <ProfileForm nome={profile?.nome ?? ''} telefone={profile?.telefone ?? null} />
      </div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <PasswordForm />
      </div>
    </div>
  );
}
