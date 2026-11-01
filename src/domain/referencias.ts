/**
 * A referência de um levantamento, como se diz ao telefone: «QP-1042».
 *
 * O número vem da base (`request_surveys.numero`, sequência); a forma vive aqui para poder mudar sem tocar
 * em dados. Nunca se monta uma referência à mão num ecrã: todos os sítios chamam esta função, senão o
 * prefixo acaba escrito de três maneiras diferentes.
 */
export function referenciaDoLevantamento(numero: number): string {
  return `QP-${numero}`;
}
