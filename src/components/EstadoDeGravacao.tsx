'use client';

/**
 * O que se diz enquanto se grava, e depois de gravar.
 *
 * ## A exigência
 *
 * «Mostrar *A guardar…* / *Guardado* / *Não foi possível guardar*. Se falhar, conservar o conteúdo e
 * oferecer nova tentativa» (promotor, 30/10/2026). As três frases existiam espalhadas por cada
 * formulário, cada uma à sua maneira, e a quarta parte — a nova tentativa — não existia em lado
 * nenhum: quem levasse com um erro de rede ficava com o botão a olhar para ele.
 *
 * ## O conteúdo conserva-se, e diz-se
 *
 * O `useFormAction` nunca limpa o formulário quando a resposta traz erro, e o «Tentar de novo»
 * repete **o mesmo envio**, com o mesmo botão — não reconstrói nada a partir do ecrã. Por isso a
 * frase que acompanha a falha pode dizer com verdade que o que está escrito continua lá: é a única
 * coisa que uma pessoa quer saber quando uma gravação falha.
 *
 * ## Âmbar, não vermelho
 *
 * Regra 13: vermelho é para o que já fechou, caducou ou foi recusado. Uma gravação que falhou
 * resolve-se carregando outra vez — é âmbar.
 */
export function EstadoDeGravacao({
  pending,
  ok,
  mensagem,
  repetir,
}: {
  pending: boolean;
  ok?: boolean;
  mensagem?: string;
  /** Repete o último envio. Sem isto não há botão de nova tentativa. */
  repetir?: () => void;
}) {
  if (pending) {
    return (
      <p className="text-[17px] text-slate-600" role="status">
        A guardar…
      </p>
    );
  }
  if (!mensagem) return null;
  if (ok) {
    return (
      <p className="text-[17px] text-tinta-700" role="status">
        {mensagem}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1" role="status">
      <p className="text-[17px] text-amber-900">
        {mensagem} <span className="text-slate-700">O que escreveu continua aqui.</span>
      </p>
      {repetir && (
        <button type="button" onClick={repetir} className="btn-quiet btn-sm">
          Tentar de novo
        </button>
      )}
    </div>
  );
}
