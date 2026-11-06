/**
 * Confirmar o número de WhatsApp por mensagem recebida — as partes puras (06/11/2026). Vive à parte de
 * `whatsapp.ts` porque o ecrã dos números (um componente de cliente) usa `ligacaoParaAssociar`, e `whatsapp.ts`
 * importa `node:crypto` para as assinaturas da Meta, que não pode ir para o navegador.
 */
// ---------------------------------------------------------------------------------------------------
// Confirmar o número por mensagem recebida (06/11/2026)
// ---------------------------------------------------------------------------------------------------

/**
 * O número é da pessoa se a mensagem com o código chegar DESSE número: é o WhatsApp que diz de onde veio, e o
 * webhook entrega-o (`MensagemRecebida.de`). Por isso o número nunca se escreve. O código é `QP-XXXX-XXXX`
 * (8 algarismos hexadecimais, de uso único, 15 minutos — `pedir_codigo_whatsapp`).
 */
const PADRAO_DO_CODIGO = /\bQP[\s-]*([0-9A-F]{4})[\s-]*([0-9A-F]{4})\b/i;

/** O código que vem numa mensagem, no formato `QP-XXXX-XXXX`, ou `null`. Aceita minúsculas, espaços e sem traços. */
export function codigoNaMensagem(texto: string): string | null {
  const m = PADRAO_DO_CODIGO.exec(texto);
  return m ? `QP-${m[1]!.toUpperCase()}-${m[2]!.toUpperCase()}` : null;
}

/** O código já usado ou falhado não precisa de ficar à vista nos registos: «QP-••••-••••». */
export const mascararCodigos = (texto: string) => texto.replace(new RegExp(PADRAO_DO_CODIGO.source, 'gi'), 'QP-••••-••••');

/** «PARAR» (ou «STOP»), escrito sozinho: a pessoa deixa de receber neste número. */
export function eParar(texto: string): boolean {
  const t = texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.!\s]+$/, '');
  return t === 'parar' || t === 'stop';
}

/** A mensagem que o botão «Abrir o WhatsApp» deixa escrita; a pessoa só tem de a enviar. */
export const mensagemDeAssociacao = (codigo: string) => `Quero receber avisos da Quem Pinta por WhatsApp. Código: ${codigo}`;

/** O endereço que abre o WhatsApp (no telemóvel ou no computador) já com a mensagem escrita. */
export function ligacaoParaAssociar(numeroDaPlataforma: string, codigo: string): string {
  return `https://wa.me/${numeroDaPlataforma.replace(/^\+/, '')}?text=${encodeURIComponent(mensagemDeAssociacao(codigo))}`;
}

/** O resultado de `confirmar_numero_whatsapp` e o que se responde por WhatsApp (texto livre: a pessoa falou primeiro). */
export const RESPOSTAS_DA_ASSOCIACAO: Record<string, string> = {
  ok: 'Número associado. A partir de agora os avisos de trabalho seguem também por aqui, nunca publicidade. Para deixar de receber, escreva PARAR.',
  transferido: 'Número associado a esta conta. Estava noutra conta, que deixou de o ter. Para deixar de receber avisos, escreva PARAR.',
  ja_associado: 'Este número já estava associado a esta conta. Para deixar de receber avisos, escreva PARAR.',
  invalido: 'Este código não é válido ou já caducou. Peça um novo na página «Avisos por WhatsApp» da aplicação.',
  demasiadas: 'Houve demasiadas tentativas com este número. Tente de novo dentro de uma hora.',
  cheio: 'Esta conta já tem 3 números associados. Remova um na aplicação e peça um novo código.',
};
export const RESPOSTA_PARAR = 'Feito: deixou de receber avisos neste número. Para voltar a receber, peça um código na aplicação.';
