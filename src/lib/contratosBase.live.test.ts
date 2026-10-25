import { describe, expect, it } from 'vitest';
import { ficheiroDoAno, lerAno } from '@/lib/contratosBase';

/**
 * Verificação ao vivo do carregamento dos contratos públicos. **Não corre no `npm test`**: descarrega
 * 44 MB e lê 350 MB de JSON. Corre-se à mão, quando se desconfia da fonte:
 *
 *     CARGA_AO_VIVO=1 npx vitest run src/lib/contratosBase.live.test.ts
 *
 * Existe por causa de uma avaria silenciosa: `ficheiroDoAno` procura o recurso cujo título é
 * exactamente `contratos<ano>.zip`. Se o portal lhe mudar o nome, a função devolve `null`, a tarefa
 * semanal não carrega nada e ninguém dá por isso — a tabela fica como estava. Isto dá-lhe voz.
 *
 * Em 25/10/2026, com o ficheiro desse dia: 482 linhas de 199 701 contratos, 63,6 M€, 68% por convite,
 * 17 segundos e 208 MB de memória.
 */
describe.runIf(process.env.CARGA_AO_VIVO === '1')('carga ao vivo do portal', () => {
  it('encontra o ficheiro do ano e extrai as empreitadas de pintura', async () => {
    const url = await ficheiroDoAno(2026);
    expect(url, 'o portal deixou de publicar "contratos2026.zip" com esse título').toBeTruthy();

    let somaCents = 0;
    let convite = 0;
    const total = await lerAno(url!, 2026, async (linhas) => {
      for (const l of linhas) {
        somaCents += l.preco_cents;
        if (l.por_convite) convite++;
        expect(l.id_contrato).toBeTruthy();
        expect(l.ano).toBe(2026);
        expect(l.preco_cents).toBeGreaterThanOrEqual(0);
      }
    });

    // Margens largas de propósito: o ano ainda cresce a cada actualização semanal. O que se verifica
    // é a ordem de grandeza — se desabar para dezenas ou saltar para milhares, a classificação mudou.
    expect(total).toBeGreaterThan(300);
    expect(total).toBeLessThan(1500);
    expect(somaCents / 100_000_000).toBeGreaterThan(30);
    expect(Math.round((convite / total) * 100)).toBeGreaterThan(50);
  }, 900_000);
});
