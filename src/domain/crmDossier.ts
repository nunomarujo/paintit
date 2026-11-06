/**
 * O dossier de dores, lacunas e acertos (promotor, 06/11/2026). Cada entrada é um tema ouvido a um perfil, numa zona,
 * com uma medida de quanto a plataforma o resolve hoje (cobertura 0 a 3). Os temas partilhados por vários perfis e zonas
 * pesam mais. Daqui saem duas listas: as mensagens fortes para as campanhas (a dor é comum e a plataforma resolve-a) e
 * as lacunas do produto (a dor é comum e a plataforma ainda não a resolve).
 */

export type TipoDeEntrada = 'dor' | 'lacuna' | 'acerto';

export interface EntradaDoDossier {
  perfil: string;
  zonaId: string | null;
  tema: string;
  tipo: TipoDeEntrada;
  evidencias: number;
  cobertura: number;
}

export interface TemaDoDossier {
  tema: string;
  perfis: string[];
  zonas: number;
  evidencias: number;
  cobertura: number;
  /** Quanto o tema é sentido: evidências vezes a largura (perfis e zonas distintos). */
  peso: number;
  /** Para uma campanha: peso × quanto a plataforma resolve. Os acertos entram a peso inteiro. */
  mensagem: number;
  /** Para o produto: peso × quanto falta resolver. */
  lacuna: number;
}

const chave = (t: string) => t.trim().toLowerCase();

export function agruparPorTema(entradas: EntradaDoDossier[]): TemaDoDossier[] {
  const mapa = new Map<string, { nome: string; perfis: Set<string>; zonas: Set<string>; evidencias: number; coberturaPonderada: number; acertos: number }>();
  for (const e of entradas) {
    const k = chave(e.tema);
    const t = mapa.get(k) ?? { nome: e.tema.trim(), perfis: new Set(), zonas: new Set(), evidencias: 0, coberturaPonderada: 0, acertos: 0 };
    t.perfis.add(e.perfil);
    t.zonas.add(e.zonaId ?? 'geral');
    t.evidencias += e.evidencias;
    t.coberturaPonderada += e.cobertura * e.evidencias;
    if (e.tipo === 'acerto') t.acertos += e.evidencias;
    mapa.set(k, t);
  }
  return [...mapa.values()]
    .map((t) => {
      const cobertura = t.coberturaPonderada / t.evidencias;
      const peso = t.evidencias * (t.perfis.size + t.zonas.size - 1);
      const mensagem = peso * (cobertura / 3) + t.acertos;
      return {
        tema: t.nome,
        perfis: [...t.perfis].sort(),
        zonas: t.zonas.size,
        evidencias: t.evidencias,
        cobertura: Math.round(cobertura * 10) / 10,
        peso,
        mensagem: Math.round(mensagem * 10) / 10,
        lacuna: Math.round(peso * ((3 - cobertura) / 3) * 10) / 10,
      };
    })
    .sort((a, b) => b.peso - a.peso);
}

export const melhoresMensagens = (ts: TemaDoDossier[], n = 5) => [...ts].filter((t) => t.mensagem > 0).sort((a, b) => b.mensagem - a.mensagem).slice(0, n);
export const principaisLacunas = (ts: TemaDoDossier[], n = 5) => [...ts].filter((t) => t.lacuna > 0).sort((a, b) => b.lacuna - a.lacuna).slice(0, n);
