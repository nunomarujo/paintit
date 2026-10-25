// Leitura da resposta do Have I Been Pwned (25/10/2026, docs/DECISOES.md).
//
// Função pura, aqui, porque é regra de negócio e testa-se sem rede; quem fala com o serviço é
// src/lib/pwned.ts.
//
// Cada linha da resposta vem no formato "<resto do resumo>:<ocorrências>".

/**
 * Quantas vezes o resumo aparece na lista devolvida. Zero quando não aparece.
 *
 * Com o cabeçalho `Add-Padding` o serviço mistura linhas falsas com contagem zero, para o tamanho da
 * resposta não revelar nada — por isso uma contagem de zero é tratada como ausência.
 */
export function contarEm(corpo: string, resto: string): number {
  for (const linha of corpo.split('\n')) {
    const [sufixo, contagem] = linha.trim().split(':');
    if (sufixo === resto) {
      const n = Number(contagem);
      return Number.isFinite(n) ? n : 0;
    }
  }
  return 0;
}

/** A partir de quantas aparições se recusa a palavra-passe. Uma única fuga conhecida já chega. */
export const LIMIAR_FUGAS = 1;

/** A mensagem que o utilizador vê. Diz o que aconteceu e o que fazer, sem o culpar nem o assustar. */
export function mensagemDeFuga(ocorrencias: number): string {
  return ocorrencias >= 1_000
    ? 'Esta palavra-passe já apareceu em fugas de dados de outros sites, e muitas vezes. Escolha outra — mesmo que seja só sua, já está nas listas que os atacantes usam.'
    : 'Esta palavra-passe já apareceu numa fuga de dados de outro site. Escolha outra, por segurança.';
}
