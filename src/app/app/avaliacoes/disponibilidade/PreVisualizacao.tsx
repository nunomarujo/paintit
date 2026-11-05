import { REGRAS_DA_CONVOCATORIA as R, TEXTO_ATRIBUIDA, TEXTO_JA_ATRIBUIDA, textoDoConvite } from '@/domain/convocatoria';

/**
 * Como chega um convite ao WhatsApp — o texto é o da regra (`textoDoConvite`), não uma cópia, para a
 * pré-visualização nunca dizer outra coisa do que a mensagem diz. É ilustração: nada aqui se carrega.
 */
export function PreVisualizacaoDoConvite({ concelho }: { concelho: string }) {
  const convite = textoDoConvite(concelho, 'fachadas de prédio, cerca de 420 m²');
  return (
    <figure aria-label="Exemplo de convite por WhatsApp" className="mx-auto w-full max-w-[22rem] self-start overflow-hidden rounded-2xl border border-slate-300 bg-[#efeae2]">
      <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
        <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-[15px] font-semibold">
          QP
        </span>
        <div>
          <p className="text-[15px] font-semibold leading-tight">Quem Pinta</p>
          <p className="text-[13px] leading-tight text-white/80">Conta comercial</p>
        </div>
      </div>

      <div className="space-y-2 p-3 text-[15px] leading-snug text-slate-900">
        <div className="max-w-[88%] rounded-lg bg-white p-2.5">
          <p className="whitespace-pre-line">{convite}</p>
          <p className="mt-1 text-right text-[13px] text-slate-600">10:02</p>
        </div>
        <div className="max-w-[88%] rounded-lg bg-white py-2.5 text-center font-medium text-[#027eb5]">Aceito</div>

        <div className="ml-auto max-w-[60%] rounded-lg bg-[#d9fdd3] p-2.5">
          <p>Aceito</p>
          <p className="mt-1 text-right text-[13px] text-slate-600">10:04 ✓✓</p>
        </div>

        <div className="max-w-[88%] rounded-lg bg-white p-2.5">
          <p className="[overflow-wrap:anywhere]">{TEXTO_ATRIBUIDA('quempinta.pt/app/avaliacoes/levantamentos')}</p>
          <p className="mt-1 text-right text-[13px] text-slate-600">10:04</p>
        </div>
      </div>

      <figcaption className="border-t border-slate-300 bg-white px-4 py-3 text-[13px] leading-snug text-slate-700">
        Se outra pessoa tiver aceitado primeiro, a resposta é: «{TEXTO_JA_ATRIBUIDA}» Quem não responde não recebe mais
        nada. Cada convite espera {R.janelaMinutosUteis === 60 ? 'uma hora útil' : `${R.janelaMinutosUteis} minutos úteis`}.
      </figcaption>
    </figure>
  );
}

/** As regras dos convites, em linguagem de quem as vive. Os números vêm da versão em vigor. */
export function RegrasDosConvites() {
  const [anel1, anel2] = R.aneisKm;
  const regras = [
    `Os convites saem por ondas, só em horário útil (9h às 18h, dias úteis): primeiro quem tem base no concelho da obra, depois até ${anel1} km, até ${anel2} km e até ao raio de cada pessoa. Nunca para lá do raio indicado.`,
    `Cada onda junta ${R.ondaMinima} a ${R.ondaMaxima} avaliadores. Até metade dos lugares é para quem ainda tem menos de ${R.novoAbaixoDe} levantamentos avaliados: quem chega precisa de por onde começar.`,
    'Fica com o trabalho a primeira pessoa a carregar em «Aceito». A ficha e os contactos do cliente abrem logo na aplicação; o contacto com o cliente é até ao fim da primeira hora útil.',
    'Entre quem já tem histórico, a ordem segue a qualificação — a mesma que define a percentagem da comissão. Em empate, primeiro quem está há mais tempo sem trabalho.',
    `Quem ficou com um levantamento nas últimas ${R.rotacaoHoras} horas passa para o fim da fila do seu anel, para o trabalho não ir sempre para as mesmas mãos.`,
    `Média abaixo de ${R.notaBaixa} estrelas (com ${R.notaBaixaMinimoAvaliacoes} ou mais avaliações) ou um prazo falhado nos últimos 7 dias: os convites chegam a partir da segunda onda. Ninguém é excluído automaticamente.`,
    `Com ${R.maximoEmCurso} levantamentos em curso, os convites param até um terminar.`,
  ];
  return (
    <ul className="max-w-[60ch] list-disc space-y-2 pl-5 text-[15px] text-slate-700">
      {regras.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ul>
  );
}
