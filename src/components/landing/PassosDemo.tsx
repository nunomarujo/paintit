/**
 * Os três passos da página inicial, cada um com um ecrã da aplicação desenhado em marcação
 * (v5, 01/11/2026). Não são capturas: são os ecrãs reais — o passo "Zonas" do pedido, a lista
 * de propostas com as perguntas a seguir, e a assinatura do contrato — redesenhados na paleta v5,
 * para a página mostrar a aplicação como vai ficar e não como está.
 *
 * Nada aqui é interativo: os controlos são `<span>` com aspeto de botão, de propósito, para não
 * haver botões falsos numa página pública (o mesmo princípio do `ComparadorDemo`, que desliga os
 * controlos nativos). Dados fictícios, os mesmos do comparador (240 m², Pintor A/B/C).
 */

function Janela({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-tinta-100 p-3">
      <div className="flex items-center gap-2 px-1 pb-2.5">
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        <span className="ml-2 rounded-full bg-white px-2.5 py-0.5 text-[13px] text-slate-500">{url}</span>
      </div>
      <div className="flex flex-col gap-3.5 rounded-2xl bg-white p-5">{children}</div>
    </div>
  );
}

const Pastilha = ({ children, ativa = false }: { children: React.ReactNode; ativa?: boolean }) => (
  <span
    className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${ativa ? 'bg-tinta-900 text-white' : 'bg-slate-50 text-slate-600'}`}
  >
    {children}
  </span>
);

const BotaoFalso = ({ children, primario = false }: { children: React.ReactNode; primario?: boolean }) => (
  <span
    aria-hidden="true"
    className={`inline-flex min-h-[44px] items-center rounded-lg px-5 text-[15px] font-bold ${primario ? 'bg-tinta-600 text-white' : 'bg-tinta-900 text-white'}`}
  >
    {children}
  </span>
);

export function PassoDescrever() {
  return (
    <Janela url="app.quempinta.pt/pedidos/novo">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold text-slate-500">Passo 2 de 4 · Zonas</span>
        <span className="text-[13px] font-bold text-tinta-700">Guardado</span>
      </div>
      <p className="text-[20px] font-extrabold text-tinta-900">Que fachadas quer pintar?</p>
      <div className="flex flex-wrap gap-2">
        <Pastilha ativa>Frente</Pastilha>
        <Pastilha ativa>Fundo</Pastilha>
        <Pastilha>Empena esquerda</Pastilha>
        <Pastilha ativa>Empena direita</Pastilha>
        <Pastilha>Entrada</Pastilha>
        <Pastilha>Escadas</Pastilha>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5 text-[13px] font-semibold text-slate-600">
          Frente (m)
          <span className="campo pointer-events-none text-tinta-900">14,5</span>
        </div>
        <div className="flex flex-col gap-1.5 text-[13px] font-semibold text-slate-600">
          Pé-direito (m)
          <span className="campo pointer-events-none text-tinta-900">3,1</span>
        </div>
      </div>
      <p className="rounded-lg bg-tinta-100 px-3.5 py-3 text-[15px] text-tinta-900">
        Não sabe as medidas? <span className="font-bold text-tinta-700">Peça um avaliador</span> — vai ao local sem custo.
      </p>
      <div className="flex justify-end">
        <BotaoFalso primario>Continuar</BotaoFalso>
      </div>
    </Janela>
  );
}

const propostas = [
  // O mesmo cenário dos seis estados do comparador (src/app/demo-comparador/fixtures.ts, 02/11/2026).
  { n: 'A', v: '6 408 €', tag: 'Escolha Quem Pinta', atencao: false, destaque: true },
  { n: 'B', v: '5 563 €', tag: '1 excluído · 1 por esclarecer', atencao: true, destaque: false },
  { n: 'C', v: '9 375 €', tag: 'Tudo + 2 trabalhos a mais', atencao: false, destaque: false },
];

export function PassoComparar() {
  return (
    <Janela url="app.quempinta.pt/pedidos/…/propostas">
      <div className="flex items-center justify-between">
        <p className="text-[20px] font-extrabold text-tinta-900">3 propostas recebidas</p>
        <span className="text-[13px] text-slate-500">Área do pedido: 240 m²</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {propostas.map((p) => (
          <div
            key={p.n}
            className={`flex flex-col gap-1 rounded-lg p-3 ${p.destaque ? 'bg-selected' : 'bg-paper'}`}
          >
            <span className="text-[13px] font-bold">Pintor {p.n}</span>
            <span className="whitespace-nowrap text-[17px] font-extrabold tabular-nums">{p.v}</span>
            <span className={`text-[13px] font-semibold ${p.atencao ? 'text-amber-800' : 'text-tinta-700'}`}>{p.tag}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3.5">
        <span className="text-[13px] font-bold text-slate-500">Perguntas que valem a pena fazer</span>
        <p className="text-[15px]">
          <strong>A Pintor B:</strong> a impermeabilização está incluída no preço? Se não, quanto custaria?
        </p>
        <p className="text-[15px]">
          <strong>A Pintor B:</strong> a reparação de fissuras está excluída — por que preço a faria?
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <BotaoFalso>Enviar as 2 perguntas</BotaoFalso>
          <span className="text-[13px] text-slate-500">Vão a cada pintor pela plataforma.</span>
        </div>
      </div>
    </Janela>
  );
}

export function PassoAssinar() {
  return (
    <Janela url="app.quempinta.pt/contratacoes/…/assinar">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[20px] font-extrabold text-tinta-900">Assinar o contrato</p>
        <span className="rounded-full bg-tinta-100 px-2.5 py-1 text-[13px] font-bold text-tinta-700">Cliente assina primeiro</span>
      </div>
      <dl className="flex flex-col gap-2 rounded-lg bg-paper p-3.5 text-[15px]">
        {[
          ['Empreitada', 'Pintura de fachadas · 240 m²'],
          ['Empresa', 'Pintor A · alvará verificado'],
          ['Valor', '6 408,30 € + IVA'],
          ['Caução depositada', '192,25 € · devolvida nas 2 assinaturas'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-slate-600">{k}</dt>
            <dd className={`text-right font-bold ${k === 'Caução depositada' ? 'text-tinta-700' : ''}`}>{v}</dd>
          </div>
        ))}
      </dl>
      {/* A minuta não é este cartão: transcreve a proposta inteira. Diz-se o que lá vai e aponta-se
          para o documento (promotor, 02/11/2026). */}
      <div className="rounded-lg border border-slate-200 p-3.5 text-[15px]">
        <p className="font-bold text-tinta-900">A minuta transcreve a proposta escolhida</p>
        <ul className="mt-2 grid gap-1 text-slate-700">
          {[
            '5 trabalhos, zona a zona, com quantidades',
            'Produtos e demãos: CIN Primário Fixador · Vinylmatt, 2 demãos · Sika Membrane',
            'Prazo: início a 10/11, 15 dias úteis',
            'Pagamentos: 20% de adiantamento, o resto por fases',
            'Garantia da obra: 5 anos · exclusões por escrito',
            'Trabalhos a mais só com adenda assinada',
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-tinta-600" />
              {t}
            </li>
          ))}
        </ul>
        <span aria-hidden="true" className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 font-bold text-tinta-700 underline underline-offset-4">
          Ver a minuta completa (PDF)
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
        </span>
      </div>
      <div className="flex items-center gap-3.5 rounded-lg bg-tinta-900 p-3.5 text-white">
        <svg className="flex-none text-lima" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M11 18h2" />
        </svg>
        <span className="flex flex-col">
          <span className="text-[15px] font-bold">Chave Móvel Digital</span>
          <span className="text-[13px] text-tinta-200">Recebe o código no telemóvel. 8 dias para cada parte assinar.</span>
        </span>
        <span aria-hidden="true" className="ml-auto inline-flex min-h-[44px] flex-none items-center rounded-full bg-lima px-4 text-[15px] font-extrabold text-tinta-900">
          Assinar
        </span>
      </div>
    </Janela>
  );
}
