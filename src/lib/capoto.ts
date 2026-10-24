import { isAcabamento, isIsolante, isSituacao, type CapotoSpec } from '@/domain/etics';

/**
 * Lê a especificação do capoto guardada na proposta. O que está na base pode ser antigo, incompleto ou
 * ter sido escrito por uma versão anterior: cada campo é confrontado com a lista do domínio e, se não
 * bater certo, vale como não indicado. Objeto vazio significa "esta obra é só pintura" — e devolve
 * `null`, para o ecrã saber que não há nada a mostrar.
 */
export function parseCapoto(valor: unknown): CapotoSpec | null {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  const o = valor as Record<string, unknown>;
  if (!isSituacao(o.situacao)) return null;
  const espessura = typeof o.espessuraMm === 'number' && o.espessuraMm > 0 ? o.espessuraMm : null;
  const demaos = typeof o.demaos === 'number' && o.demaos > 0 ? o.demaos : null;
  return {
    situacao: o.situacao,
    isolante: isIsolante(o.isolante) ? o.isolante : null,
    espessuraMm: espessura,
    acabamento: isAcabamento(o.acabamento) ? o.acabamento : null,
    demaos,
    cor: typeof o.cor === 'string' && o.cor.trim() ? o.cor.trim().slice(0, 60) : null,
  };
}
