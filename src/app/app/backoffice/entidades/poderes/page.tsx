import Link from 'next/link';
import { diaDeLisboa } from '@/domain/disponibilidade';
import { ORG_KIND_LABELS } from '@/domain/organization';
import { getUser } from '@/lib/supabase/server';
import { LeituraForm } from './LeituraForm';

// Poderes de representação (05/11/2026, docs/DECISOES.md): a fila das certidões e atas por ler, e as leituras
// registadas. É o único ecrã onde o código de acesso aparece — e só à equipa (RLS de `certidao_codigos`).

const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
const pt = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
const ASSINATURAS: Record<string, string> = { '1': 'uma assinatura', '2': 'duas assinaturas, em conjunto', confirmar: 'a confirmar' };

export default async function PoderesPage() {
  const { supabase } = await getUser();
  const hoje = diaDeLisboa(new Date());
  const [estados, codigos, membros, docs] = await Promise.all([
    supabase.from('poderes_de_representacao').select('*'),
    supabase.from('certidao_codigos').select('org_id, codigo, definido_em'),
    supabase.from('poderes_membros').select('org_id, nome, cargo, nif, ordem').order('ordem'),
    supabase
      .from('org_documents')
      .select('id, org_id, kind, nome_ficheiro, status, created_at')
      .in('kind', ['certidao_permanente', 'ata_nomeacao_administrador'])
      .in('status', ['submetido', 'em_validacao', 'aprovado'])
      .order('created_at'),
  ]);
  if (estados.error || codigos.error || membros.error) {
    return (
      <section className={card}>
        <h2 className="font-semibold">Poderes de representação</h2>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          A migração <code>20261105230000_poderes_de_representacao</code> ainda não foi aplicada a esta base: sem ela não há códigos nem
          leituras para mostrar.
        </p>
      </section>
    );
  }

  const estadoDe = new Map((estados.data ?? []).map((e) => [e.org_id, e]));
  const codigoDe = new Map((codigos.data ?? []).map((c) => [c.org_id, c]));
  const lida = (orgId: string) => Boolean(estadoDe.get(orgId)?.lida_em);
  const docIds = [...new Set((docs.data ?? []).map((d) => d.org_id))];
  const ids = [...new Set([...(estados.data ?? []).map((e) => e.org_id), ...docIds])];
  const { data: orgs } = ids.length ? await supabase.from('organizations').select('id, nome, kind, nif').in('id', ids) : { data: [] };
  const orgDe = new Map((orgs ?? []).map((o) => [o.id, o]));

  // O documento que serve a cada entidade: a ata num condomínio, a certidão nas outras.
  const docsDe = (orgId: string) => {
    const kind = orgDe.get(orgId)?.kind;
    if (!kind || kind === 'particular') return [];
    return (docs.data ?? []).filter(
      (d) => d.org_id === orgId && d.kind === (kind === 'condominio' ? 'ata_nomeacao_administrador' : 'certidao_permanente'),
    );
  };
  const porLer = ids
    .filter((id) => orgDe.has(id) && !lida(id) && (estadoDe.get(id)?.codigo_entregue_em || docsDe(id).length > 0))
    .sort((a, b) => (estadoDe.get(a)?.codigo_entregue_em ?? '9').localeCompare(estadoDe.get(b)?.codigo_entregue_em ?? '9'));
  const lidas = (estados.data ?? [])
    .filter((e) => e.lida_em && orgDe.has(e.org_id))
    .sort((a, b) => (a.valida_ate ?? '').localeCompare(b.valida_ate ?? ''));
  const membrosDe = (orgId: string) => (membros.data ?? []).filter((m) => m.org_id === orgId);

  const cabecalho = (orgId: string) => {
    const o = orgDe.get(orgId)!;
    const c = codigoDe.get(orgId);
    return (
      <>
        <p>
          <Link href={`/app/organizacoes/${o.id}`} className="font-semibold text-tinta-700 hover:underline">
            {o.nome}
          </Link>
          <span className="text-slate-500">
            {' '}
            · {ORG_KIND_LABELS[o.kind]}
            {o.nif ? ` · NIF ${o.nif}` : ''}
          </span>
        </p>
        {c && (
          <p className="mt-1">
            Código de acesso: <span className="font-semibold tabular-nums">{c.codigo}</span>
            <span className="text-slate-500"> · entregue a {pt(c.definido_em)}</span>
          </p>
        )}
        {docsDe(orgId).map((d) => (
          <p key={d.id} className="mt-1">
            <a href={`/app/documentos/${d.id}`} target="_blank" rel="noreferrer" className="text-tinta-700 hover:underline">
              {d.nome_ficheiro}
            </a>
            <span className="text-slate-500"> · enviado a {pt(d.created_at)}</span>
          </p>
        ))}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <section className={card}>
        <h2 className="font-semibold">Por ler{porLer.length > 0 ? ` (${porLer.length})` : ''}</h2>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Abra a certidão no portal registo.justica.gov.pt com o código (ou o ficheiro enviado) e registe só o que o formulário pede. Num
          condomínio, registe o administrador a partir da ata de nomeação. O código dá acesso a dados pessoais de terceiros: não o copie
          para fora daqui.
        </p>
        {porLer.length === 0 ? (
          <p className="mt-3 text-[17px] text-slate-600">Nada por ler.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-[17px]">
            {porLer.map((id) => (
              <li key={id} className="py-4">
                {cabecalho(id)}
                <LeituraForm orgId={id} fonte={orgDe.get(id)!.kind === 'condominio' ? 'ata' : 'certidao'} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card}>
        <h2 className="font-semibold">Leituras registadas</h2>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          As que caducam primeiro estão em cima. Na assinatura de um contrato, o nome de cada certificado é comparado com esta lista.
        </p>
        {lidas.length === 0 ? (
          <p className="mt-3 text-[17px] text-slate-600">Ainda nenhuma.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 text-[17px]">
            {lidas.map((l) => {
              const ms = membrosDe(l.org_id);
              const caducada = (l.valida_ate ?? '') < hoje;
              const assinaturas = l.assinaturas_exigidas === null ? 'confirmar' : String(l.assinaturas_exigidas);
              return (
                <li key={l.org_id} className="py-4">
                  {cabecalho(l.org_id)}
                  <p className={`mt-1 ${caducada ? 'text-amber-800' : 'text-slate-600'}`}>
                    {l.fonte === 'ata' ? 'Ata de nomeação' : 'Certidão permanente'} · lida a {pt(l.lida_em!)} ·{' '}
                    {caducada ? `caducou a ${pt(l.valida_ate!)}` : `válida até ${pt(l.valida_ate!)}`} · {ASSINATURAS[assinaturas]}
                  </p>
                  <ul className="mt-1 list-disc pl-5">
                    {ms.map((m) => (
                      <li key={m.ordem}>
                        {m.nome}{' '}
                        <span className="text-slate-500">
                          · {m.cargo}
                          {m.nif ? ` · NIF ${m.nif}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[15px] text-slate-600">Forma de obrigar: «{l.forma_de_obrigar}»</p>
                  <details className="mt-2">
                    <summary className="inline-flex min-h-[44px] cursor-pointer items-center font-semibold text-tinta-700">
                      Registar de novo
                    </summary>
                    <LeituraForm
                      orgId={l.org_id}
                      fonte={l.fonte}
                      inicial={{
                        membros: ms.map((m) => ({ nome: m.nome, cargo: m.cargo, nif: m.nif })),
                        formaDeObrigar: l.forma_de_obrigar ?? '',
                        assinaturasExigidas: l.assinaturas_exigidas === 1 || l.assinaturas_exigidas === 2 ? l.assinaturas_exigidas : null,
                        validaAte: caducada ? '' : (l.valida_ate ?? ''),
                      }}
                    />
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
