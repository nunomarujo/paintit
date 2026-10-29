import { ESTADO_LABELS, quantidadeEmPalavras, type Classificacao, type TrabalhoNaProposta } from '@/domain/comparador';
import { formatEuros } from '@/domain/money';
import type { Cents } from '@/domain/money';

/**
 * Comparar duas propostas de cada vez, por blocos — a vista do telemóvel.
 *
 * A tabela detalhada tem catorze linhas e uma coluna por proposta. Num ecrã de 390px isso é uma
 * folha que se arrasta para o lado: o cliente perde a linha em que ia, e perde a coluna a que
 * pertence o número que está a ler. Duas de cada vez, por assunto, é a forma de ler isto com um
 * polegar (desenho do promotor, 28/10/2026).
 *
 * O par escolhido vive no endereço, como tudo o resto neste ecrã: não há estado de cliente, o botão
 * de voltar desfaz a escolha, e uma comparação partilha-se com um link.
 */

export interface PropostaEmBloco {
  id: string;
  alias: string;
  totalComIva: Cents;
  base: Cents;
  opcionais: Cents;
  condicionados: Cents;
  trabalhos: TrabalhoNaProposta[];
  classificacao: Classificacao;
  inicioPossivel: string | null;
  duracaoDias: number | null;
  adiantamentoBps: number;
  garantiaAnos: number | null;
  seguroRc: string | null;
  seguroAt: string | null;
  verificado: boolean;
}

const pt = (d: string | null) => (d ? d.split('-').reverse().join('/') : 'Não indicado');
const seguro = (v: string | null) => (v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : 'Por declarar');

export function ComparacaoEmBlocos({ a, b }: { a: PropostaEmBloco; b: PropostaEmBloco }) {
  return (
    <div className="space-y-5">
      <Bloco titulo="Preço" a={a} b={b}>
        <Linha rotulo="Total a pagar, com IVA" a={<strong>{formatEuros(a.totalComIva)}</strong>} b={<strong>{formatEuros(b.totalComIva)}</strong>} />
        <Linha rotulo="Sem IVA" a={formatEuros(a.base)} b={formatEuros(b.base)} />
        {(a.opcionais > 0 || b.opcionais > 0) && (
          <Linha rotulo="Opções, não somadas" a={a.opcionais > 0 ? formatEuros(a.opcionais) : '—'} b={b.opcionais > 0 ? formatEuros(b.opcionais) : '—'} />
        )}
        {(a.condicionados > 0 || b.condicionados > 0) && (
          <Linha
            rotulo="Sujeito a observação"
            a={a.condicionados > 0 ? formatEuros(a.condicionados) : '—'}
            b={b.condicionados > 0 ? formatEuros(b.condicionados) : '—'}
          />
        )}
      </Bloco>

      <Bloco titulo="Trabalhos que pediu" a={a} b={b}>
        {a.trabalhos.map((t, i) => (
          <Linha
            key={t.work}
            rotulo={t.label}
            a={<Estado t={t} />}
            b={<Estado t={b.trabalhos[i]!} />}
          />
        ))}
      </Bloco>

      <Bloco titulo="Materiais e execução" a={a} b={b}>
        {a.trabalhos.map((t, i) => {
          const outro = b.trabalhos[i]!;
          // Um trabalho que nenhuma das duas incluiu não tem execução para comparar.
          if (t.estado !== 'incluido' && outro.estado !== 'incluido') return null;
          return <Linha key={t.work} rotulo={t.label} a={<Execucao t={t} />} b={<Execucao t={outro} />} />;
        })}
        <Linha rotulo="Correspondência técnica" a={a.classificacao.tecnica.frase} b={b.classificacao.tecnica.frase} />
      </Bloco>

      <Bloco titulo="Prazos e pagamentos" a={a} b={b}>
        <Linha rotulo="Pode começar" a={pt(a.inicioPossivel)} b={pt(b.inicioPossivel)} />
        <Linha rotulo="Duração" a={a.duracaoDias ? `${a.duracaoDias} dias` : 'Não indicada'} b={b.duracaoDias ? `${b.duracaoDias} dias` : 'Não indicada'} />
        <Linha
          rotulo="Adiantamento"
          a={a.adiantamentoBps > 0 ? `${a.adiantamentoBps / 100}%` : 'Nenhum'}
          b={b.adiantamentoBps > 0 ? `${b.adiantamentoBps / 100}%` : 'Nenhum'}
        />
      </Bloco>

      <Bloco titulo="Garantias e seguros" a={a} b={b}>
        <Linha
          rotulo="Garantia da obra"
          a={a.garantiaAnos !== null ? `${a.garantiaAnos} anos` : 'Não indicada'}
          b={b.garantiaAnos !== null ? `${b.garantiaAnos} anos` : 'Não indicada'}
        />
        <Linha rotulo="Responsabilidade civil" a={seguro(a.seguroRc)} b={seguro(b.seguroRc)} />
        <Linha rotulo="Acidentes de trabalho" a={seguro(a.seguroAt)} b={seguro(b.seguroAt)} />
        <Linha rotulo="Documentos validados" a={a.verificado ? 'Sim' : 'Ainda não'} b={b.verificado ? 'Sim' : 'Ainda não'} />
      </Bloco>
    </div>
  );
}

function Bloco({ titulo, a, b, children }: { titulo: string; a: PropostaEmBloco; b: PropostaEmBloco; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <h3 className="border-b border-slate-200 px-4 py-2.5 font-semibold">{titulo}</h3>
      {/* O nome das duas propostas repete-se em cada bloco: quem desce o ecrã perde o cabeçalho de
          vista, e sem ele os dois números deixam de ter dono. */}
      <div className="grid grid-cols-2 gap-3 border-b border-slate-100 px-4 py-1.5 text-[15px] font-semibold text-slate-500">
        <span>{a.alias}</span>
        <span>{b.alias}</span>
      </div>
      <dl className="divide-y divide-slate-100">{children}</dl>
    </section>
  );
}

function Linha({ rotulo, a, b }: { rotulo: string; a: React.ReactNode; b: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5">
      <dt className="text-[15px] text-slate-500">{rotulo}</dt>
      <dd className="mt-0.5 grid grid-cols-2 gap-3 text-[17px]">
        <span>{a}</span>
        <span>{b}</span>
      </dd>
    </div>
  );
}

function Estado({ t }: { t: TrabalhoNaProposta }) {
  return (
    <>
      <span className={t.estado === 'incluido' ? 'text-tinta-700' : t.estado === 'excluido' ? 'text-red-700' : 'text-amber-800'}>
        {ESTADO_LABELS[t.estado]}
      </span>
      {t.precoCents > 0 && <span className="block text-[15px] tabular-nums text-slate-600">{formatEuros(t.precoCents)}</span>}
    </>
  );
}

function Execucao({ t }: { t: TrabalhoNaProposta }) {
  if (t.estado !== 'incluido') return <span className="text-slate-500">{ESTADO_LABELS[t.estado]}</span>;
  const partes = [quantidadeEmPalavras(t), t.demaos ? `${t.demaos} ${t.demaos === 1 ? 'demão' : 'demãos'}` : null, ...t.produtos].filter(Boolean);
  return partes.length > 0 ? <>{partes.join(' · ')}</> : <span className="text-slate-500">Sem detalhe</span>;
}
