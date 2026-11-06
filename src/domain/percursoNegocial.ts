import { formatEuros } from './money';

// O relatório do percurso negocial de cada obra (pedido do promotor, 06/11/2026).
//
// Tira-se do registo só de acrescentar (`registo_da_obra`), por ordem, com as datas do servidor:
// abertura de conta; criação e publicação do pedido; propostas recebidas; quais passaram à comparação;
// quem ganhou e em que condições; contratação e assinaturas; tranches e comprovativos; adendas;
// alterações dos elementos do contrato antes da assinatura; conclusão e garantia.
//
// **Duas versões, gerada cada uma por inteiro** (nunca uma filtrada à saída da outra):
// - **backoffice:** tudo o que o registo tem;
// - **cliente:** sem o que a plataforma cobra ao pintor (regra 15 — nenhum valor dos acontecimentos da
//   contratação, e «confirmação do pintor» em vez de comissão) e **sem a identidade dos pintores que não
//   ganharam** (dados de terceiros: «Pintor A», «Pintor B», como `relatorios_de_propostas_fichas`); das
//   propostas que não ganharam diz-se só o estado. O que mostrar a quem pede decide-se com o jurista.
//
// O texto diz o que o relatório é — um registo do que aconteceu na plataforma, com datas — e não diz que
// tem valor de prova perante um tribunal.

export type Destinatario = 'backoffice' | 'cliente';

export interface EventoDoRegisto {
  ordem: number;
  tipo: string;
  criadoEm: string;
  orgId: string | null;
  painterOrgId: string | null;
  dados: Record<string, unknown>;
}

export interface DadosDoRelatorio {
  ref: string;
  destinatario: Destinatario;
  versao: number;
  emitidoEm: Date;
  eventos: EventoDoRegisto[];
  /** Nome de cada entidade, para a versão do backoffice e para as partes. */
  nomes: Record<string, string>;
  clienteOrgId: string;
  /** O pintor da contratação, se houve. */
  vencedorOrgId: string | null;
}

const MOTIVOS: Record<string, string> = { litigio: 'litígio', disputa_de_consumo: 'disputa de consumo', outro: 'outro motivo' };
const ESTADOS_DO_PEDIDO: Record<string, string> = { rascunho: 'rascunho', publicado: 'publicado', encerrado: 'encerrado', cancelado: 'cancelado' };
const ESTADOS_DA_PROPOSTA: Record<string, string> = {
  rascunho: 'em preparação',
  submetida: 'submetida',
  retirada: 'retirada',
  selecionada: 'escolhida',
  nao_selecionada: 'não escolhida',
  falhada: 'sem efeito',
};
/** Os acontecimentos da contratação, nas palavras de cada versão (regra 15 na do cliente). */
const EVENTOS: Record<string, { backoffice: string; cliente: string }> = {
  deposito_confirmado: { backoffice: 'Caução do cliente confirmada pelo parceiro de pagamentos', cliente: 'Caução do dono da obra confirmada' },
  cliente_assinou: { backoffice: 'O cliente assinou o contrato', cliente: 'O dono da obra assinou o contrato' },
  fee_recebido: { backoffice: 'Comissão do pintor recebida: as partes ficam a conhecer-se', cliente: 'Confirmação do pintor registada: as partes ficam a conhecer-se' },
  pintor_assinou: { backoffice: 'O pintor assinou: contrato celebrado', cliente: 'O empreiteiro assinou: contrato celebrado' },
  cliente_desistiu: { backoffice: 'O cliente desistiu', cliente: 'O dono da obra desistiu' },
  litigio_aberto: { backoffice: 'Litígio aberto', cliente: 'Litígio aberto' },
  litigio_resolvido: { backoffice: 'Litígio resolvido pela plataforma', cliente: 'Litígio encerrado' },
  transitar: { backoffice: 'Valores transitam para outra proposta', cliente: 'A escolha passa para outra proposta' },
  encerrar_sem_contrato: { backoffice: 'Encerrado sem contrato', cliente: 'Encerrado sem contrato' },
};
const PASSOS: Record<string, string> = { declarou: 'declarou a obra concluída', confirmou: 'confirmou a conclusão', discordou: 'discordou da conclusão', juntou_prova: 'juntou prova' };
const CAMPOS: Record<string, string> = { iban: 'IBAN', telefone: 'telefone', email: 'email para correspondência' };

const quando = (iso: string) =>
  new Date(iso).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dia = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10).split('-').reverse().join('/') : null);
const euros = (v: unknown) => (typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v)) ? formatEuros(Number(v)) : null);
const txt = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** «Pintor A», «Pintor B»… pela ordem em que aparecem; o vencedor e as partes pelo nome. */
function quemE(d: DadosDoRelatorio) {
  const letras = new Map<string, string>();
  return (orgId: string | null): string => {
    if (!orgId) return 'Pintor';
    const nome = d.nomes[orgId];
    if (d.destinatario === 'backoffice' || orgId === d.vencedorOrgId || orgId === d.clienteOrgId) return nome ?? 'Entidade';
    if (!letras.has(orgId)) letras.set(orgId, `Pintor ${String.fromCharCode(65 + letras.size)}`);
    return letras.get(orgId)!;
  };
}

function condicoes(dados: Record<string, unknown>): string {
  const partes = [
    euros(dados.base_cents) ? `preço sem IVA ${euros(dados.base_cents)}` : null,
    euros(dados.iva_cents) ? `IVA ${euros(dados.iva_cents)}` : null,
    typeof dados.adiantamento_bps === 'number' && dados.adiantamento_bps > 0 ? `adiantamento ${dados.adiantamento_bps / 100}%` : null,
    Array.isArray(dados.fases) && dados.fases.length > 0
      ? `plano de pagamentos: ${(dados.fases as { nome?: string; bps?: number }[]).map((f) => `${f.nome || 'fase'} ${(f.bps ?? 0) / 100}%`).join(', ')}`
      : null,
    typeof dados.duracao_dias === 'number' ? `duração ${dados.duracao_dias} dias` : null,
    dia(dados.inicio_possivel) ? `início possível ${dia(dados.inicio_possivel)}` : null,
    typeof dados.garantia_anos === 'number' ? `garantia ${dados.garantia_anos} anos` : null,
  ].filter(Boolean);
  return partes.join('; ');
}

/** Uma linha por acontecimento; `null` para o que esta versão não mostra. */
function linha(e: EventoDoRegisto, d: DadosDoRelatorio, quem: (o: string | null) => string): string | null {
  const x = e.dados;
  const cliente = d.destinatario === 'cliente';
  const doVencedor = e.painterOrgId !== null && e.painterOrgId === d.vencedorOrgId;
  switch (e.tipo) {
    case 'conta_aberta':
      return `Conta aberta na plataforma: ${quem(e.orgId)}.`;
    case 'membro_entrou':
      return cliente ? null : `Pessoa associada a ${quem(e.orgId)} (${String(x.papel ?? '')}).`;
    case 'pedido_criado':
      return `Pedido de orçamentos criado (${String(x.titulo ?? x.ref ?? '')})${txt(x.descricao) ? `: «${txt(x.descricao)}»` : ''}.`;
    case 'pedido_estado':
      return `Pedido passa de ${ESTADOS_DO_PEDIDO[String(x.de)] ?? x.de} a ${ESTADOS_DO_PEDIDO[String(x.para)] ?? x.para} (versão ${x.version}).`;
    case 'pedido_publicado':
      return `Pedido publicado aos pintores (referência ${x.ref}, propostas até ${dia(x.prazo_propostas) ?? 'data por definir'}).`;
    case 'pedido_apagado':
      return 'O pedido foi apagado da plataforma; o que está acima ficou guardado neste registo.';
    case 'proposta_estado': {
      const estado = ESTADOS_DA_PROPOSTA[String(x.status)] ?? String(x.status);
      if (x.status === 'rascunho') return cliente ? null : `${quem(e.painterOrgId)} começou a preparar uma proposta.`;
      const mostrarCondicoes = !cliente || doVencedor;
      const c = mostrarCondicoes ? condicoes(x) : '';
      return `Proposta de ${quem(e.painterOrgId)}: ${estado}${c ? ` — ${c}` : ''}.`;
    }
    case 'proposta_versao':
      return `Proposta de ${quem(e.painterOrgId)}: versão ${x.version} submetida.`;
    case 'proposta_apagada':
      return `Proposta de ${quem(e.painterOrgId)} apagada da plataforma; ficou guardada neste registo.`;
    case 'comparacao':
      return `Relatório de comparação de propostas gerado (${x.numero_de_propostas} propostas a comparar).`;
    case 'contratacao_criada':
      return `Escolhida a proposta de ${quem(e.painterOrgId)}: contratação iniciada, preço sem IVA ${euros(x.base_cents) ?? '—'}${
        euros(x.advance_cents) && Number(x.advance_cents) > 0 ? `, adiantamento ${euros(x.advance_cents)}` : ''
      }${typeof x.garantia_anos === 'number' ? `, garantia ${x.garantia_anos} anos` : ''}.`;
    case 'contratacao_evento': {
      const k = String(x.kind);
      const rotulo = EVENTOS[k]?.[d.destinatario] ?? k;
      // Na versão do cliente nenhum valor destes acontecimentos: um deles é a comissão do pintor (regra 15).
      const valor = !cliente && euros(x.amount_cents) ? ` (${euros(x.amount_cents)})` : '';
      const hash = txt(x.documentHash) ? ` Impressão digital do documento assinado: ${x.documentHash}.` : '';
      const razao = txt(x.reason) ? ` Motivo indicado: «${x.reason}».` : '';
      return `${rotulo}${valor}.${hash}${razao}`;
    }
    case 'versao_da_minuta':
      return `Nova versão do contrato por assinar (impressão digital ${x.sha256}).`;
    case 'elemento_alterado':
      return `${x.lado === 'cliente' ? 'Dono da obra' : 'Empreiteiro'} indicou ${CAMPOS[String(x.campo)] ?? x.campo}: ${x.valor} (${
        x.validacao === 'codigo' ? 'validado por código' : x.validacao === 'inicio_de_sessao' ? 'validado pelo início de sessão' : 'sem validação'
      }).`;
    case 'adenda':
      return `Trabalho a mais (adenda) ${x.estado === 'proposta' ? 'proposto' : String(x.estado ?? '')}: «${txt(x.descricao) ?? ''}», ${euros(x.valor_cents) ?? '—'}${
        txt(x.nota_cliente) ? `; nota do dono da obra: «${x.nota_cliente}»` : ''
      }.`;
    case 'comprovativo':
      return `Comprovativo de pagamento registado pelo dono da obra: ${x.tranche}, ${euros(x.valor_cents) ?? '—'}, pago a ${dia(x.pago_em) ?? '—'}${
        txt(x.nota) ? `; nota: «${x.nota}»` : ''
      }${txt(x.ficheiro_sha256) ? `; ficheiro com a impressão digital ${x.ficheiro_sha256}` : ''}.`;
    case 'conclusao':
      return `${x.lado === 'cliente' ? 'Dono da obra' : 'Empreiteiro'} ${PASSOS[String(x.passo)] ?? x.passo}${dia(x.data_conclusao) ? ` (${dia(x.data_conclusao)})` : ''}${
        txt(x.razao) ? `: «${x.razao}»` : ''
      }${txt(x.ficheiro_sha256) ? `; prova com a impressão digital ${x.ficheiro_sha256}` : ''}.`;
    case 'garantia':
      return `Garantia contratual de ${x.anos} anos, de ${dia(x.inicio)} a ${dia(x.fim_garantia)}; registos guardados até ${dia(x.fim_conservacao)}.`;
    case 'relatorio_pedido':
      return `Pedido deste relatório pelo dono da obra (motivo: ${MOTIVOS[String(x.motivo)] ?? x.motivo}).`;
    case 'relatorio_emitido':
      return `Relatório emitido (${x.destinatario === 'cliente' ? 'para o dono da obra' : 'para a equipa'}, versão ${x.versao}, impressão digital ${x.sha256}).`;
    case 'relatorio_entregue':
      return 'Relatório disponibilizado ao dono da obra na aplicação.';
    default:
      return cliente ? null : `${e.tipo}.`;
  }
}

/** O texto do relatório. É este texto que se resume (SHA-256) e se guarda, uma vez, sem nunca mudar. */
export function relatorioDoPercurso(d: DadosDoRelatorio): string {
  const quem = quemE(d);
  const ordenados = [...d.eventos].sort((a, b) => a.ordem - b.ordem);
  const linhas = ordenados
    .map((e) => {
      const l = linha(e, d, quem);
      return l ? `${quando(e.criadoEm)} — ${l}` : null;
    })
    .filter((l): l is string => !!l);
  return [
    `Relatório do percurso negocial — obra ${d.ref}`,
    `Versão ${d.versao}, emitida a ${quando(d.emitidoEm.toISOString())}, ${d.destinatario === 'cliente' ? 'para o dono da obra' : 'para a equipa da plataforma'}.`,
    'Este relatório é um registo do que aconteceu na plataforma, por ordem, com as datas e horas do servidor (hora de Lisboa).',
    ...(d.destinatario === 'cliente' ? ['Os pintores cujas propostas não foram escolhidas aparecem identificados por uma letra.'] : []),
    '',
    ...(linhas.length ? linhas : ['Não há acontecimentos registados para esta obra.']),
  ].join('\n');
}
