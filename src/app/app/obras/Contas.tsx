import Link from 'next/link';
import { formatEuros } from '@/domain/money';
import type { ContaDaObra } from '@/lib/queries';

/**
 * As contas de uma obra, na ordem em que a pergunta se faz: **quanto é que isto me dá no fim?**
 *
 * O ecrã antigo dava uma lista de valores sem hierarquia — contrato, recebido, por receber, custos,
 * margem, custo por m² — e o número que interessa estava a meio, no mesmo tamanho dos outros. Aqui o
 * resultado previsto é o título, e por baixo explica-se de onde vem, porque um número de margem que
 * não se percebe é um número em que não se confia (protótipo do promotor, 26/10/2026).
 */
export function Contas({ contas }: { contas: ContaDaObra[] }) {
  if (contas.length === 0)
    return (
      <p className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[15px] text-slate-600">Ainda não há obras.</p>
    );

  return (
    <div className="space-y-4">
      {contas.map((c) => (
        <ContaDeUmaObra key={c.id} c={c} />
      ))}
    </div>
  );
}

function ContaDeUmaObra({ c }: { c: ContaDaObra }) {
  const margemPct = c.contrato > 0 ? (c.margem / c.contrato) * 100 : 0;
  const positiva = c.margem >= 0;
  // A régua é composta sobre o valor contratado: o que já se gastou, o que sobra para gastar, e o
  // que fica. Quando a obra já deu prejuízo não há terceira parte, e a régua enche-se de custo.
  const base = Math.max(c.contrato, c.custos, 1);
  const parteCusto = Math.min(100, (c.custos / base) * 100);
  const parteResultado = positiva ? Math.max(0, (c.margem / base) * 100) : 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2 className="text-[18px] font-semibold text-slate-900">{c.nome}</h2>
        <Link href={`/app/obras/${c.id}?s=financeiro`} className="text-[14px] font-semibold text-tinta-700 hover:underline">
          Abrir a obra →
        </Link>
      </div>

      <div className="px-5 py-5">
        <p className="eyebrow">Resultado previsto no fim</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-3">
          <span className={`text-[34px] font-semibold leading-none tabular-nums ${positiva ? 'text-tinta-800' : 'text-red-700'}`}>
            {positiva ? '+' : ''}
            {formatEuros(c.margem)}
          </span>
          {c.contrato > 0 && (
            <span
              className={`rounded-full px-2.5 py-1 text-[14px] font-semibold ${
                positiva ? 'bg-sage text-tinta-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {margemPct.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}% de margem
            </span>
          )}
        </p>
        <p className="mt-2 text-[15px] text-slate-600">
          Valor da obra: {formatEuros(c.contrato)} · custos directos considerados
        </p>

        {!c.fiavel && (
          // O aviso que impede o número de enganar: sem horas, o custo da mão de obra é zero e a
          // margem parece melhor do que é.
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] leading-snug text-amber-900">
            <strong className="font-semibold">Estimativa incompleta:</strong> não há horas registadas nesta obra, por isso
            a mão de obra está a zero e a margem acima parece melhor do que é.{' '}
            <Link href={`/app/obras/${c.id}?s=dia`} className="font-semibold underline underline-offset-4">
              Registar o dia
            </Link>
          </p>
        )}
      </div>

      <div className="border-t border-slate-100 px-5 py-5">
        <p className="text-[16px] font-semibold text-slate-900">Como chegámos a este valor</p>
        <dl className="mt-3 space-y-3">
          <Linha
            termo="Valor aprovado da obra"
            nota={c.adendasAceites > 0 ? `Contrato e ${formatEuros(c.adendasAceites)} de trabalhos a mais aceites` : 'Contrato assinado'}
            valor={formatEuros(c.contrato)}
          />
          <Linha termo="Custos já incorridos" nota="Equipa, materiais e equipamento" valor={formatEuros(c.custos)} />
          <Linha
            termo="Resultado"
            nota={positiva ? 'O que sobra depois dos custos conhecidos' : 'A obra está a custar mais do que foi contratado'}
            valor={formatEuros(c.margem)}
            forte
          />
        </dl>

        <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-200" aria-hidden>
          <span className="bg-tinta-700" style={{ width: `${parteCusto}%` }} />
          <span className="bg-sage" style={{ width: `${parteResultado}%` }} />
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-600">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-tinta-700" />
            Já custou
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-sage" />
            Resultado
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
        <div>
          <p className="text-[16px] font-semibold text-slate-900">Falta receber do cliente</p>
          <p className="text-[14px] text-slate-600">
            {c.recebido > 0 ? `Já recebeu ${formatEuros(c.recebido)}` : 'Ainda não recebeu nenhuma tranche'}
            {c.adendasPendentes > 0 && ` · ${formatEuros(c.adendasPendentes)} em trabalhos a mais por aceitar`}
          </p>
        </div>
        <p className="text-[24px] font-semibold tabular-nums text-slate-900">{formatEuros(c.porReceber)}</p>
      </div>
    </section>
  );
}

function Linha({ termo, nota, valor, forte }: { termo: string; nota: string; valor: string; forte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt>
        <span className={`block text-[15px] ${forte ? 'font-semibold text-slate-900' : 'text-slate-900'}`}>{termo}</span>
        <span className="block text-[13.5px] text-slate-600">{nota}</span>
      </dt>
      <dd className={`shrink-0 tabular-nums ${forte ? 'text-[18px] font-semibold text-slate-900' : 'text-[16px] text-slate-800'}`}>
        {valor}
      </dd>
    </div>
  );
}
