import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Nenhuma função `security definer` que escreve fica sem saber quem a chamou.
 *
 * ## De onde veio esta regra
 *
 * O analisador do Supabase avisa (30/10/2026, 39 ocorrências) que todas as funções `security
 * definer` de `public` são chamáveis por qualquer utilizador autenticado, por
 * `/rest/v1/rpc/<nome>`. É verdade, e não é defeito: uma função destas corre com os privilégios de
 * quem a criou, e o que a torna segura é **verificar quem a chamou lá dentro** — que é a
 * alternativa que a própria documentação do Supabase aponta a revogar o `execute`.
 *
 * A auditoria de 30/10/2026 passou pelas 43 e não encontrou buraco nenhum: as 32 que escrevem têm
 * todas uma verificação, e a única sem ela (`acc_post`) está revogada a `authenticated` e só corre
 * pelo serviço. Este teste é o que impede que a próxima deixe de ter.
 *
 * ## O que este teste **não** garante
 *
 * Lê texto. Vê que a função menciona uma verificação; não vê se a verificação está no sítio certo
 * nem se devolve o que devia. Uma função que chame `can_manage_org` e ignore o resultado passa
 * aqui. O que ele apanha é o caso real: uma função nova escrita à pressa, sem verificação nenhuma,
 * exposta ao mundo por uma rota REST que ninguém se lembrou que existia.
 */

const DIR = join(import.meta.dirname, '..', 'migrations');

const VERIFICACOES = [
  'is_platform_admin',
  'can_manage_org',
  'can_access_org',
  'can_access_as_surveyor',
  'has_role',
  'is_painter',
  'org_members',
  'proposal_visible',
  'auth.uid()',
];

/** Funções que podem não verificar nada, com a razão escrita. */
const DISPENSADAS: Record<string, string> = {
  'public.acc_post': 'Revogada a authenticated e a anon: só corre pelo serviço (livro_de_movimentos).',
};

interface Funcao {
  nome: string;
  ficheiro: string;
  corpo: string;
}

function funcoesSecurityDefiner(): Funcao[] {
  const padrao = /create\s+(?:or\s+replace\s+)?function\s+(public\.\w+)\s*\(([^)]*)\)([\s\S]*?)\$\$([\s\S]*?)\$\$/gi;
  // A última definição de cada nome é a que manda: uma migração posterior pode substituí-la.
  const ultima = new Map<string, Funcao>();
  for (const f of readdirSync(DIR).filter((n) => n.endsWith('.sql')).sort()) {
    const texto = readFileSync(join(DIR, f), 'utf8');
    for (const m of texto.matchAll(padrao)) {
      const [, nome, , cabeca, corpo] = m;
      if (!/security definer/i.test(cabeca!)) continue;
      ultima.set(nome!, { nome: nome!, ficheiro: f, corpo: corpo! });
    }
  }
  return [...ultima.values()];
}

const escreve = (corpo: string) => /\b(insert\s+into|update\s+public\.|delete\s+from)\b/i.test(corpo);

describe('funções security definer', () => {
  const todas = funcoesSecurityDefiner();

  it('há-as, e são muitas — se este número for a zero, o teste deixou de ler alguma coisa', () => {
    expect(todas.length).toBeGreaterThan(30);
  });

  it('todas as que escrevem verificam quem as chamou', () => {
    const semVerificacao = todas
      .filter((f) => escreve(f.corpo))
      .filter((f) => !DISPENSADAS[f.nome])
      .filter((f) => !VERIFICACOES.some((v) => f.corpo.includes(v)))
      .map((f) => `${f.nome} (${f.ficheiro})`);
    expect(semVerificacao).toEqual([]);
  });

  it('as dispensadas continuam a existir — uma dispensa a apontar para o vazio engana quem a lê', () => {
    for (const nome of Object.keys(DISPENSADAS)) {
      expect(todas.map((f) => f.nome)).toContain(nome);
    }
  });
});
