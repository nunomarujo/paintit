// Destino depois de entrar: só caminhos internos da área reservada (ou o convite direto de uma obra, que também
// pede sessão), para que um link manipulado não leve o utilizador para fora do site.
export function safeNext(value: string | null | undefined): string {
  if (!value || value.startsWith('//') || !(value.startsWith('/app') || value.startsWith('/convite/'))) return '/app';
  return value;
}
