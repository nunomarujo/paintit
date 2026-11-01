/**
 * De uma tentativa de levantamento para a linha que se mostra numa lista (01/11/2026).
 *
 * Isto existe porque o prazo visível estava errado: a lista mostrava sempre a conclusão (48 horas), mesmo a
 * quem ainda não tinha telefonado e tinha uma hora útil a correr. A obrigação em curso e o prazo que lhe
 * corresponde decidem-se num sítio só, aqui, e os ecrãs limitam-se a desenhar (regra 2 do CLAUDE.md).
 */

export type EstadoNaLista = 'por_contactar' | 'aguarda_cliente' | 'agendado' | 'em_revisao' | 'concluido';

export type TentativaParaLista = {
  estado: 'ativa' | 'concluida' | 'libertada' | 'em_revisao';
  prazo_contacto: string;
  prazo_conclusao: string;
  adiado_para: string | null;
  contacto_registado_em: string | null;
  agendado_para: string | null;
  resposta_cliente: 'agendado_48h' | 'adiado' | 'nao_contactado' | null;
};

export type ObrigacaoEmCurso = {
  estado: EstadoNaLista;
  /** O instante que conta agora. Nulo quando não há prazo a correr. */
  prazo: string | null;
  /** Conta-se no relógio útil (a primeira hora) ou no de calendário (as 48 horas). */
  prazoUtil: boolean;
  agendadoPara: string | null;
};

export function obrigacaoEmCurso(t: TentativaParaLista): ObrigacaoEmCurso {
  // Terminados: já não há nada a correr, e o que interessa é quando foi a visita.
  if (t.estado === 'concluida') {
    return { estado: 'concluido', prazo: null, prazoUtil: false, agendadoPara: t.agendado_para };
  }
  if (t.estado === 'em_revisao') {
    return { estado: 'em_revisao', prazo: null, prazoUtil: false, agendadoPara: t.agendado_para };
  }

  // O prazo mais curto é o primeiro: enquanto não houver chamada registada, é a hora útil que conta.
  if (!t.contacto_registado_em) {
    return { estado: 'por_contactar', prazo: t.prazo_contacto, prazoUtil: true, agendadoPara: null };
  }

  // Contactado: corre a conclusão, adiada ou não. O prazo continua a correr enquanto a cliente não
  // confirma — e dizê-lo é metade do ecrã (decisão de 01/11/2026).
  const prazo = t.adiado_para ?? t.prazo_conclusao;
  const confirmado = t.resposta_cliente === 'agendado_48h' || t.resposta_cliente === 'adiado';
  return {
    estado: confirmado ? 'agendado' : 'aguarda_cliente',
    prazo,
    prazoUtil: false,
    agendadoPara: t.agendado_para,
  };
}
