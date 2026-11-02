import { BRAND } from '@/config/brand';
import type { Indicacoes } from '@/domain/indicacoes';
import { REGRAS_DAS_INDICACOES } from '@/domain/metodologia';

/**
 * As três indicações lado a lado — **a mais barata**, **a mais completa** e **a Escolha Quem Pinta**
 * — por cima da síntese, no ecrã do cliente e na demonstração da página inicial (metodologia 1.1,
 * 02/11/2026, a pedido do promotor). Cada bloco diz o pintor, o total e a razão em números que
 * estão na tabela por baixo; quando uma indicação não se atribui, o bloco fica e diz porquê.
 *
 * A Escolha é a única que a plataforma assume como sugestão, e por isso é o único bloco com fundo
 * marinho. As outras duas são factos. Sem medalhas, sem «vencedora»: a decisão é do cliente.
 */
export function SugestoesQuemPinta({ indicacoes }: { indicacoes: Indicacoes }) {
  return (
    <section aria-label={`Sugestões ${BRAND.name}`} className="grid gap-3 md:grid-cols-3">
      {REGRAS_DAS_INDICACOES.map((regra) => {
        const dada = indicacoes.atribuidas.find((x) => x.indicacao === regra.id);
        const sem = indicacoes.naoAtribuidas.find((x) => x.indicacao === regra.id);
        const escolha = regra.id === 'menor_preco_completo';
        return (
          <div
            key={regra.id}
            className={`flex flex-col gap-1 rounded-2xl p-5 ${escolha ? 'bg-tinta-900 text-white' : 'border border-slate-200 bg-white text-tinta-900'}`}
          >
            <p className={`text-[13px] font-semibold ${escolha ? 'text-lima' : 'text-slate-500'}`}>{regra.rotulo}</p>
            {dada ? (
              <>
                <p className="text-[20px] font-semibold leading-tight">{dada.alias}</p>
                <p className={`text-[26px] font-semibold leading-none tabular-nums ${escolha ? 'text-white' : 'text-tinta-900'}`}>{dada.valor}</p>
                <p className={`mt-2 text-[15px] leading-snug ${escolha ? 'text-tinta-100' : 'text-slate-600'}`}>
                  {dada.nota.charAt(0).toLocaleUpperCase('pt-PT') + dada.nota.slice(1)}
                </p>
              </>
            ) : (
              <p className={`mt-1 text-[15px] leading-snug ${escolha ? 'text-tinta-100' : 'text-slate-600'}`}>{sem?.motivo ?? 'Sem indicação.'}</p>
            )}
          </div>
        );
      })}
    </section>
  );
}
