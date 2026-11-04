import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Encontra botões e links com a geometria escrita à mão — `rounded` + `px-` + `py-` — sem garantia de
 * chegarem aos 44px de altura mínima (regra 17 do CLAUDE.md).
 *
 * Isto não substitui a medição no banco de ensaio, que vê a altura verdadeira depois de desenhada. Serve
 * para o que a medição não apanha: um ecrã que ninguém fotografou. A auditoria de 27/10/2026 contou 99
 * botões à mão em 22 geometrias, e a regra vivia num comentário — por isso voltou a ser violada. Daqui
 * em diante falha nos testes.
 *
 * Fica de fora o que já traz altura: `btn-*` e `campo` (as classes do sistema), `min-h-[44px]`, `h-11`,
 * `h-12`, e `rounded-full`, que é a forma das pílulas e dos pontos, não de um botão.
 */

const ALVO = /<(?:button|Link|a)\b[^>]*className=(?:"([^"]*)"|\{`([^`]*)`\})/gs;
const TEM_ALTURA = ['min-h-[44px]', 'h-11', 'h-12', 'rounded-full'];

export function geometriaAMao(fonte: string): string[] {
  const achados: string[] = [];
  for (const m of fonte.matchAll(ALVO)) {
    const cls = m[1] ?? m[2] ?? '';
    if (cls.includes('btn-') || cls.includes('campo')) continue;
    const temGeometria = cls.includes('rounded') && /\bpx-\d/.test(cls) && (/\bpy-\d/.test(cls) || /\bp-\d/.test(cls));
    if (!temGeometria) continue;
    if (TEM_ALTURA.some((k) => cls.includes(k))) continue;
    achados.push(cls.replace(/\s+/g, ' ').trim());
  }
  return achados;
}

export function contarPorFicheiro(raiz: string): Record<string, number> {
  const contagem: Record<string, number> = {};
  const andar = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, e.name);
      if (e.isDirectory()) andar(caminho);
      else if (e.name.endsWith('.tsx')) {
        const n = geometriaAMao(readFileSync(caminho, 'utf8')).length;
        if (n > 0) contagem[caminho.replace(`${raiz}/`, '')] = n;
      }
    }
  };
  andar(raiz);
  return contagem;
}

/**
 * O que abre um `<details>` (`<summary>`) também se toca, e o verificador acima só via botões e links:
 * o (i) da `Dica` tinha 20 × 20 px e nenhum teste o apanhava (auditoria da margem de erro, 04/11/2026).
 * Aqui apanha-se o caso que se consegue ver no código — uma altura escrita abaixo de 44 px (`h-1` a
 * `h-10`) sem `min-h-[44px]` — e não os `summary` sem altura nenhuma, que crescem com o texto.
 */
const RESUMO = /<summary\b[^>]*className=(?:"([^"]*)"|\{`([^`]*)`\})/gs;

export function resumosPequenos(fonte: string): string[] {
  const achados: string[] = [];
  for (const m of fonte.matchAll(RESUMO)) {
    const cls = m[1] ?? m[2] ?? '';
    const alturas = [...cls.matchAll(/(?:^|\s)h-(\d+(?:\.5)?)(?=\s|$)/g)].map((a) => Number(a[1]));
    if (alturas.some((h) => h < 11) && !cls.includes('min-h-[44px]')) achados.push(cls.replace(/\s+/g, ' ').trim());
  }
  return achados;
}

export function resumosPequenosPorFicheiro(raiz: string): Record<string, string[]> {
  const achados: Record<string, string[]> = {};
  const andar = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, e.name);
      if (e.isDirectory()) andar(caminho);
      else if (e.name.endsWith('.tsx')) {
        const r = resumosPequenos(readFileSync(caminho, 'utf8'));
        if (r.length > 0) achados[caminho.replace(`${raiz}/`, '')] = r;
      }
    }
  };
  andar(raiz);
  return achados;
}
