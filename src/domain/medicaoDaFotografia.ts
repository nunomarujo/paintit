/**
 * A medição de uma fachada pela fotografia, convertida para uma zona do pedido (06/11/2026).
 *
 * Decisão do promotor (05/11/2026): o cliente também mede, na ferramenta de fotografia; a zona fica com a
 * origem «medida pelo cliente» e com a margem de erro da medição, e **nunca confirmada** — confirma-a quem
 * mede no local. A base garante as duas coisas (migração 20261106010000); aqui decide-se o que se grava.
 *
 * Grava-se a área a pintar e a margem. **Nunca a fotografia**, nem a geometria desenhada sobre ela: o pintor
 * lê as zonas de um anúncio aberto, e a fotografia original não lhe pode chegar antes da apresentação
 * (regra 6). A área já desconta os vãos e soma as paredes das marquises, por isso vai como área direta, sem
 * largura nem altura.
 *
 * Unidades (regra 1): a área em centésimos de m² (`area_direta_cm2`, apesar do nome), a margem em
 * pontos-base. A margem arredonda-se **para cima** — nunca se promete menos erro do que o calculado.
 */

/** O que a ferramenta tem no passo 4 de uma fachada, e que interessa ao pedido. */
export interface MedicaoDaFotografia {
  /** Há contorno desenhado (sem ele não há fachada medida). */
  temContorno: boolean;
  /** Área a pintar, em m², como a ferramenta a mostra (`ResultadoFachada.pintavelM2`). */
  pintavelM2: number;
  /** O que a ferramenta ainda dá por medir (profundidade das marquises, por exemplo). */
  porMedir: readonly string[];
  /** Margem relativa da área a pintar (0,021 = ± 2,1 %), ou `null` quando a ferramenta não a sabe. */
  margemRelativa: number | null;
}

export type ZonaDaMedicao = { ok: true; areaDiretaCm2: number; margemBps: number } | { ok: false; motivo: string };

/** Acima disto a área deixa de caber numa coluna inteira: não é uma fachada, é um erro. */
const AREA_MAXIMA_CM2 = 100_000_000; // 1 000 000 m²

export function zonaDaMedicao(m: MedicaoDaFotografia): ZonaDaMedicao {
  if (!m.temContorno) return { ok: false, motivo: 'Falta desenhar o contorno da fachada.' };
  if (m.porMedir.length > 0) {
    // Uma área com partes por medir é uma área incompleta: gravada, o pintor contava com ela inteira.
    return { ok: false, motivo: `Falta medir: ${m.porMedir.join('; ')}.` };
  }
  if (!Number.isFinite(m.pintavelM2) || m.pintavelM2 <= 0) return { ok: false, motivo: 'A área a pintar tem de ser maior do que zero.' };
  const areaDiretaCm2 = Math.round(m.pintavelM2 * 100);
  if (areaDiretaCm2 < 1 || areaDiretaCm2 > AREA_MAXIMA_CM2) return { ok: false, motivo: 'A área a pintar não é plausível.' };
  if (m.margemRelativa === null || !Number.isFinite(m.margemRelativa) || m.margemRelativa < 0) {
    // Sem margem, a medição do cliente não se distingue de uma medida verificada — e a decisão é que ela
    // vá sempre com a sua margem. Melhor não gravar do que gravar sem ela.
    return {
      ok: false,
      motivo: 'A ferramenta não conseguiu calcular a margem de erro desta medição: acerte a referência e tente de novo.',
    };
  }
  // Para cima, e nunca zero: uma medição pela fotografia tem sempre alguma margem.
  const margemBps = Math.max(1, Math.ceil(m.margemRelativa * 10_000 - 1e-9));
  if (margemBps > 10_000) return { ok: false, motivo: 'A margem de erro passa dos 100 %: a medição não serve como está.' };
  return { ok: true, areaDiretaCm2, margemBps };
}

/** «± 6 %», «± 1,7 %» — como a margem se lê no cartão da zona e no anúncio. */
export function margemEmTexto(bps: number): string {
  const pct = bps / 100;
  const casas = pct < 10 && !Number.isInteger(pct) ? 1 : 0;
  // Para cima também ao mostrar: 1,71 % lê-se «± 1,8 %», nunca «± 1,7 %».
  const fator = 10 ** casas;
  const arred = Math.ceil(pct * fator - 1e-9) / fator;
  return `± ${arred.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: casas })} %`;
}
