import Link from 'next/link';
import { markNotificationsRead } from '@/app/app/extras-actions';

export interface AvisoDoInicio {
  id: string;
  link: string;
  texto: string;
  created_at: string;
}

/**
 * Avisos por ler. Um cartão por aviso, não uma lista corrida: ficava tudo colado (pedido do promotor,
 * 26/10/2026). O cartão inteiro é o alvo, não só a frase (28/10/2026). `first-letter:uppercase` é defesa:
 * os textos guardados já começam por maiúscula. Fundo de cor é só para a banda do topo do ecrã
 * (regra 13 do CLAUDE.md): aqui não há nenhum.
 */
export function AvisosDoInicio({ avisos }: { avisos: AvisoDoInicio[] }) {
  if (avisos.length === 0) return null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-[17px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Avisos</h2>
        <form action={markNotificationsRead}>
          <button type="submit" className="inline-flex min-h-[44px] items-center text-tinta-700 hover:underline">
            Marcar todos como lidos
          </button>
        </form>
      </div>
      <ul className="mt-2 space-y-2">
        {avisos.map((n) => (
          <li key={n.id} className="rounded-lg border border-slate-200">
            <Link href={n.link} className="block rounded-lg p-3 hover:bg-slate-50 focus-visible:bg-slate-50">
              <span className="block text-tinta-900 first-letter:uppercase">{n.texto}</span>
              <span className="mt-0.5 block text-[15px] text-slate-500">
                {new Date(n.created_at).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
