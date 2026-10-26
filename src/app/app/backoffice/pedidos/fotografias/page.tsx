import { getUser } from '@/lib/supabase/server';
import { PhotoReviewForm } from '../PhotoReviewForm';

// Fotografias de pormenor dos pedidos: só chegam aos pintores depois de aprovadas.
export default async function PhotoReviewPage() {
  const { supabase } = await getUser();
  const { data: photos } = await supabase.from('request_photos').select('id, legenda, created_at').eq('revisao', 'pendente').order('created_at');
  return (
    <section>
      <p className="text-[17px] text-slate-600">
        Só aprove se a fotografia não permitir reconhecer o prédio nem a rua: sem fachada inteira, sem números de porta, placas, montras, matrículas, pessoas ou vista para edifícios vizinhos. Na dúvida, recuse e
        explique.
      </p>
      {!photos || photos.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-[17px] text-slate-600">Não há fotografias à espera.</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {photos.map((p) => (
            <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 text-[17px]">
              <a href={`/app/fotos/${p.id}`} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- link temporário assinado */}
                <img src={`/app/fotos/${p.id}`} alt={p.legenda ?? 'Fotografia de pormenor'} className="max-h-72 w-full rounded-lg object-contain" />
              </a>
              <p className="mt-2 text-slate-600">
                {p.legenda ?? 'Sem legenda'} · enviada a {p.created_at.slice(0, 10).split('-').reverse().join('/')}
              </p>
              <PhotoReviewForm photoId={p.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
