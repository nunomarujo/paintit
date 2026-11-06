import { urgenciaPrazo, type NivelPrazo } from './request';

// O «Hoje» do pintor (06/11/2026): o que pede ação desta empresa, por ordem de urgência. As escolhas
// vivem aqui, em funções puras, e o ecrã só as desenha (regra 2 do CLAUDE.md).

export interface PedidoAberto {
  request_id: string;
  ref: string;
  concelho: string;
  tipo_obra: string;
  area_total_cm2: number;
  prazo_propostas: string; // AAAA-MM-DD
}

export interface PropostaDaEmpresa {
  request_id: string;
  status: string;
}

export interface LinhaDePrazo {
  requestId: string;
  ref: string;
  concelho: string;
  tipoObra: string;
  areaCm2: number;
  dias: number;
  nivel: NivelPrazo;
  /** `rascunho`: já começou a proposta e falta enviá-la. `por_propor`: ainda nada feito. */
  estado: 'rascunho' | 'por_propor';
}

/**
 * Pedidos abertos que fecham dentro da janela e em que esta empresa ainda tem algo a fazer.
 * Quem já enviou (ou foi escolhido, ou retirou) não aparece: não há ação. O rascunho aparece primeiro
 * a igualdade de prazo, porque é o mais perto de estar feito.
 *
 * `porPropor` conta todos os pedidos abertos sem proposta enviada, dentro ou fora da janela: é o número
 * da ligação «Ver todas as oportunidades».
 */
export function prazosAFechar(
  abertos: PedidoAberto[],
  minhas: PropostaDaEmpresa[],
  hojeISO: string,
  { janelaDias = 7, limite = 5 }: { janelaDias?: number; limite?: number } = {},
): { linhas: LinhaDePrazo[]; porPropor: number } {
  const estadoDe = new Map(minhas.map((p) => [p.request_id, p.status]));
  const pendentes = abertos.filter((p) => {
    const s = estadoDe.get(p.request_id);
    return s === undefined || s === 'rascunho';
  });
  const linhas = pendentes
    .map((p): LinhaDePrazo => {
      const u = urgenciaPrazo(p.prazo_propostas, hojeISO);
      return {
        requestId: p.request_id,
        ref: p.ref,
        concelho: p.concelho,
        tipoObra: p.tipo_obra,
        areaCm2: p.area_total_cm2,
        dias: u.dias,
        nivel: u.nivel,
        estado: estadoDe.get(p.request_id) === 'rascunho' ? 'rascunho' : 'por_propor',
      };
    })
    .filter((l) => l.dias >= 0 && l.dias <= janelaDias)
    .sort((a, b) => a.dias - b.dias || Number(b.estado === 'rascunho') - Number(a.estado === 'rascunho'));
  return { linhas: linhas.slice(0, limite), porPropor: pendentes.length };
}

export interface DocumentoDaEmpresa {
  kind: string;
  status: string;
  valido_ate: string | null;
}

export interface DocumentoACaducar {
  kind: string;
  /** Negativo: já caducou há tantos dias. */
  dias: number;
}

/** Documentos aprovados que caducam na janela ou já caducaram, o mais urgente primeiro. */
export function documentosACaducar(docs: DocumentoDaEmpresa[], hojeISO: string, janelaDias = 30): DocumentoACaducar[] {
  return docs
    .filter((d) => d.status === 'aprovado' && d.valido_ate)
    .map((d) => ({ kind: d.kind, dias: urgenciaPrazo(d.valido_ate!, hojeISO).dias }))
    .filter((d) => d.dias <= janelaDias)
    .sort((a, b) => a.dias - b.dias);
}
