import { PublicHeader } from '@/components/LegalPage';
import {
  METODOLOGIA,
  VERSAO_METODOLOGIA,
  prioridadeEmPalavras,
  type Metodologia,
} from '@/domain/metodologia';

/**
 * A página pública que explica como as propostas se comparam.
 *
 * É a fonte comum dos quatro níveis de transparência: o ecrã das propostas liga para aqui, o
 * relatório impresso traz o endereço desta versão, as condições dos pintores referem-na, e ela
 * própria é o texto completo.
 *
 * **Versionada por desenho.** Um relatório emitido hoje aponta para a versão que o produziu. Quem o
 * abrir daqui a seis meses lê as regras que estavam em vigor quando os números foram calculados, e
 * não as que entretanto mudaram — senão a explicação deixaria de explicar aquele PDF.
 *
 * Nada aqui expõe propostas, dados de uma obra ou identidades: são as regras, não os casos.
 */
export function MetodologiaPublica({ m = METODOLOGIA }: { m?: Metodologia }) {
  const actual = m.versao === VERSAO_METODOLOGIA;
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 text-[17px] leading-relaxed">
        <div>
          <h1 className="text-[26px] leading-tight font-semibold">Como comparamos as propostas</h1>
          <p className="mt-1 text-[15px] text-slate-600">
            Versão {m.versao}
            {actual ? ' · em vigor' : ' · versão anterior, mantida porque há relatórios emitidos com ela'}
          </p>
        </div>

        <p>
          Esta página explica o que a plataforma mede, o que prevalece sobre o quê, e em que condições não indica nada. A
          plataforma descreve e compara; não escolhe pelo cliente, e a escolha final e as suas razões ficam registadas no
          nome de quem a fez.
        </p>

        <section>
          <h2 className="text-[20px] font-semibold">1. O que pesa, e porquê</h2>
          <p className="mt-2">{prioridadeEmPalavras()}</p>
          <dl className="mt-3 space-y-3">
            {m.parametros.map((p, i) => (
              <div key={p.id}>
                <dt className="font-semibold">
                  {i + 1}. {p.nome}
                </dt>
                <dd className="text-slate-700">
                  {p.descricao} <span className="text-slate-900">{p.importancia}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2 className="text-[20px] font-semibold">2. As indicações, e o que cada uma não quer dizer</h2>
          <dl className="mt-2 space-y-3">
            {m.indicacoes.map((r) => (
              <div key={r.id}>
                <dt className="font-semibold">{r.nome}</dt>
                <dd className="text-slate-700">
                  <span className="block">
                    <span className="font-medium text-slate-900">Quem pode recebê-la:</span> {r.elegibilidade}
                  </span>
                  <span className="block">
                    <span className="font-medium text-slate-900">O que a decide:</span> {r.criterio}
                  </span>
                  <span className="block">
                    <span className="font-medium text-slate-900">O que não significa:</span> {r.limite}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2 className="text-[20px] font-semibold">3. Quando não indicamos nada</h2>
          <p className="mt-2">
            A ausência de uma indicação não é um juízo sobre as propostas. Acontece nestes casos, e o relatório diz qual
            deles se verificou:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {m.semIndicacao.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-[20px] font-semibold">4. O que não influencia nada disto</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {m.naoInfluenciam.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-[20px] font-semibold">5. De onde vêm os números</h2>
          <dl className="mt-2 space-y-2">
            {m.fontes.map((f) => (
              <div key={f.o_que}>
                <dt className="font-medium">{f.o_que}</dt>
                <dd className="text-slate-700">{f.donde}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2">
            A plataforma não altera, completa nem estima valores que a proposta não declare. Onde falta informação, diz
            que falta.
          </p>
        </section>

        <section>
          <h2 className="text-[20px] font-semibold">6. Avaliações e históricos curtos</h2>
          <p className="mt-2">
            Cada obra concluída dá direito a uma avaliação, feita pelo cliente dessa obra. Abaixo de três avaliações
            mostra-se que o histórico ainda é limitado, em vez de uma média: com uma ou duas obras, a média diz mais sobre
            o acaso do que sobre o pintor. Um pintor novo não recebe por isso uma classificação baixa.
          </p>
        </section>

        <section>
          <h2 className="text-[20px] font-semibold">7. Omissões, custos por fechar e divergências</h2>
          <p className="mt-2">
            Um trabalho que a proposta não refere é uma lacuna de âmbito; um trabalho previsto cujo preço só fecha depois
            de observar a obra é incerteza de preço. São coisas diferentes e contam-se em separado. Quando a área que uma
            proposta considera difere da do levantamento do cliente, diz-se que diverge — não que alguém mediu mal, porque
            pode ser uma convenção de medição diferente.
          </p>
        </section>

        <section>
          <h2 className="text-[20px] font-semibold">8. Corrigir ou esclarecer</h2>
          <p className="mt-2">
            Cliente e pintor podem pedir esclarecimento sobre qualquer número desta comparação pelas mensagens da própria
            proposta, sem se identificarem antes do momento previsto. Um dado corrigido dá origem a uma versão nova da
            proposta, e o relatório diz com que versão foi calculado.
          </p>
        </section>

        {!actual && (
          <p className="text-[15px] text-slate-600">
            Esta é a versão {m.versao}. A que está em vigor é a {VERSAO_METODOLOGIA}.
          </p>
        )}
      </main>
    </>
  );
}
