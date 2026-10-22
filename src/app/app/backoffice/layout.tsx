import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { isPlatformAdmin } from '@/lib/access';
import { getUser } from '@/lib/supabase/server';

// Tudo o que está abaixo de /app/backoffice é só para a equipa da plataforma.
export default async function BackofficeLayout({ children }: { children: ReactNode }) {
  const { supabase, user } = await getUser();
  if (!user || !(await isPlatformAdmin(supabase, user.id))) notFound();
  return children;
}
