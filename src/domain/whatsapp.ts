import { createHmac, timingSafeEqual } from 'node:crypto';
/**
 * WhatsApp pela Meta, sem intermediário (WhatsApp Cloud API) — decisão do promotor de 05/11/2026.
 *
 * Até essa data o envio passava pela Twilio (02/11/2026, «o caminho mais curto»). A Twilio exigia, além da
 * verificação da empresa, a fotografia do cartão de cidadão do gerente por um terceiro (Persona); o promotor
 * recusou, e com razão — a Meta só verifica a empresa, com documentos da empresa. O número e os modelos
 * aprovados são da conta WhatsApp Business da Relevante Planeta, não da Twilio, por isso ficam.
 *
 * O que vive aqui é tudo o que se pode testar sem rede: o número no formato certo, os corpos dos pedidos à
 * Meta, a assinatura dos pedidos que a Meta nos faz, e a leitura do que chega. A chamada em si está em
 * `src/lib/whatsapp.ts`.
 */

/** Devolve o número em formato internacional, ou `null` se não for um número de telemóvel reconhecível. */
export function numeroWhatsApp(entrada: string | null | undefined): string | null {
  if (!entrada) return null;
  let d = entrada.replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  if (!d.startsWith('+')) {
    // Sem indicativo: assume-se Portugal, e só um telemóvel (9 algarismos a começar por 9).
    if (/^9\d{8}$/.test(d)) d = '+351' + d;
    else return null;
  }
  const digitos = d.slice(1);
  if (!/^\d{8,15}$/.test(digitos)) return null;
  if (digitos.startsWith('351') && !/^3519\d{8}$/.test(digitos)) return null;
  return '+' + digitos;
}

/** «+351912345678» → «351912345678», o formato que a Meta usa nos dois sentidos. */
export const numeroParaMeta = (n: string) => n.replace(/^\+/, '');
/** «351912345678» → «+351912345678», o formato que guardamos. */
export const numeroDaMeta = (n: string | undefined) => (n ? `+${n.replace(/^\+/, '')}` : '');

// ---------------------------------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------------------------------

export type ConfiguracaoWhatsApp = {
  /** Token permanente de um utilizador de sistema do Business Manager. */
  token: string;
  /** O identificador do número na Cloud API (não é o número). */
  numeroId: string;
  /** O segredo da aplicação Meta: assina o que a Meta nos envia. */
  segredoApp: string;
  /** A palavra combinada para a Meta confirmar o endereço do webhook. */
  tokenVerificacao: string;
  /** Idioma dos modelos aprovados. */
  idioma: string;
  versaoApi: string;
};

/** Lê a configuração do ambiente. Sem as quatro chaves o canal não existe — e isso não é erro: o email e
 * os avisos dentro da aplicação continuam. */
export function configuracaoWhatsApp(env: Record<string, string | undefined>): ConfiguracaoWhatsApp | null {
  const token = env.WHATSAPP_TOKEN?.trim();
  const numeroId = env.WHATSAPP_NUMERO_ID?.trim();
  const segredoApp = env.WHATSAPP_SEGREDO_APP?.trim();
  const tokenVerificacao = env.WHATSAPP_TOKEN_VERIFICACAO?.trim();
  if (!token || !numeroId || !segredoApp || !tokenVerificacao) return null;
  return {
    token,
    numeroId,
    segredoApp,
    tokenVerificacao,
    idioma: env.WHATSAPP_IDIOMA?.trim() || 'pt_PT',
    versaoApi: env.WHATSAPP_VERSAO_API?.trim() || 'v21.0',
  };
}

/** O modelo do convite aos avaliadores, aprovado na Meta: {{1}} concelho, {{2}} descrição, botão «Aceito». */
export const modeloDoConvite = (env: Record<string, string | undefined>) => env.WHATSAPP_MODELO_CONVITE?.trim() || 'avaliador_nova_oportunidade';

/** O modelo genérico dos avisos (assunto, texto, ligação). Sem ele, os avisos não saem por WhatsApp. */
export const modeloDoAviso = (env: Record<string, string | undefined>) => env.WHATSAPP_MODELO_AVISO?.trim() || null;

/**
 * O modelo do contrato pronto para assinar (05/11/2026, `contrato_para_assinar`): {{1}} a referência da obra,
 * e o botão «Abrir o contrato» com o identificador da contratação no fim do endereço
 * (`https://quempinta.pt/app/contratacoes/{{1}}`). Sem a variável — o modelo ainda não foi aprovado na Meta
 * —, o aviso do contrato não sai por WhatsApp; o email e o aviso dentro da aplicação saem como sempre.
 */
export const modeloDoContrato = (env: Record<string, string | undefined>) => env.WHATSAPP_MODELO_CONTRATO?.trim() || null;

/** A única variável do modelo do contrato: a referência da obra, que as duas partes já conhecem. Nada do
 * contrato (valores, nomes, morada) vai na mensagem. */
export const variaveisDoContrato = (referencia: string): string[] => [limpa(referencia, 60)];

// ---------------------------------------------------------------------------------------------------
// O que se envia
// ---------------------------------------------------------------------------------------------------

const limpa = (s: string, max: number) => {
  // A Meta recusa quebras de linha, tabulações e mais de quatro espaços seguidos dentro de uma variável.
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
};

/** As três variáveis do aviso genérico, já aparadas. A ligação vai inteira: cortá-la seria pior do que nada. */
export function variaveisDoAviso(assunto: string, texto: string, link: string | null): string[] {
  return [limpa(assunto, 120), limpa(texto, 600), link ?? ''];
}

/** O botão «Aceito» leva o convite consigo: a resposta diz exatamente a que convite se refere. */
export const PAYLOAD_ACEITO = 'aceito_avaliador';
export const payloadDoConvite = (conviteId: string) => `${PAYLOAD_ACEITO}:${conviteId}`;
export function conviteDoPayload(payload: string | undefined): string | null {
  const m = /^aceito_avaliador:([0-9a-f-]{36})$/i.exec(payload ?? '');
  return m ? m[1]!.toLowerCase() : null;
}

/**
 * Corpo de um envio de modelo. `botao`, quando existe, é o payload do botão de resposta rápida n.º 0 (texto)
 * ou o fim do endereço do botão «Visitar website» n.º 0 (`{ sufixoUrl }`).
 */
export function corpoDoModelo(
  para: string,
  nome: string,
  idioma: string,
  parametros: string[],
  botao?: string | { sufixoUrl: string },
): Record<string, unknown> {
  const components: Record<string, unknown>[] = [];
  if (parametros.length) components.push({ type: 'body', parameters: parametros.map((text) => ({ type: 'text', text: limpa(text, 1000) })) });
  if (typeof botao === 'string' && botao) components.push({ type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: botao }] });
  if (typeof botao === 'object') components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: botao.sufixoUrl }] });
  return { messaging_product: 'whatsapp', to: numeroParaMeta(para), type: 'template', template: { name: nome, language: { code: idioma }, components } };
}

/** Texto livre — só vale nas 24 horas a seguir a uma mensagem da pessoa (é o caso das respostas ao «Aceito»). */
export function corpoDeTexto(para: string, texto: string): Record<string, unknown> {
  return { messaging_product: 'whatsapp', to: numeroParaMeta(para), type: 'text', text: { body: texto.slice(0, 4096), preview_url: false } };
}

// ---------------------------------------------------------------------------------------------------
// O que chega da Meta
// ---------------------------------------------------------------------------------------------------

/**
 * A assinatura que a Meta põe em cada pedido (`X-Hub-Signature-256`): «sha256=» + HMAC-SHA256 do corpo
 * cru, com o segredo da aplicação. É a única prova de que o pedido veio da Meta — sem ela, qualquer pessoa
 * reservava levantamentos a partir da internet. Compara em tempo constante.
 */
export function assinaturaMeta(segredo: string, corpoCru: string): string {
  return 'sha256=' + createHmac('sha256', segredo).update(corpoCru, 'utf8').digest('hex');
}

export function assinaturaValida(segredo: string, corpoCru: string, recebida: string | null): boolean {
  if (!recebida) return false;
  const esperada = Buffer.from(assinaturaMeta(segredo, corpoCru));
  const dada = Buffer.from(recebida);
  return esperada.length === dada.length && timingSafeEqual(esperada, dada);
}

/** A confirmação do endereço do webhook: a Meta pede-a uma vez, com a palavra combinada. */
export function respostaDaVerificacao(params: URLSearchParams, tokenVerificacao: string): string | null {
  return params.get('hub.mode') === 'subscribe' && params.get('hub.verify_token') === tokenVerificacao ? params.get('hub.challenge') : null;
}

export type MensagemRecebida = {
  /** Formato guardado: «+351…». */
  de: string;
  id: string;
  /** A mensagem nossa a que esta responde, se for resposta. */
  respondeA: string | null;
  texto: string;
  payload: string | null;
  aceito: boolean;
};

export type EstadoDeEnvio = { id: string; estado: string; erro: string | null };

type Valor = {
  messages?: {
    from?: string;
    id?: string;
    type?: string;
    text?: { body?: string };
    button?: { payload?: string; text?: string };
    interactive?: { button_reply?: { id?: string; title?: string } };
    context?: { id?: string };
  }[];
  statuses?: { id?: string; status?: string; errors?: { code?: number; title?: string }[] }[];
};

/** Lê o corpo do webhook: as mensagens recebidas e os estados das que enviámos. Ignora o que não conhece. */
export function eventosDoWebhook(corpo: unknown): { mensagens: MensagemRecebida[]; estados: EstadoDeEnvio[] } {
  const mensagens: MensagemRecebida[] = [];
  const estados: EstadoDeEnvio[] = [];
  const entradas = (corpo as { entry?: { changes?: { value?: Valor }[] }[] })?.entry ?? [];
  for (const e of entradas) {
    for (const c of e.changes ?? []) {
      const v = c.value ?? {};
      for (const m of v.messages ?? []) {
        if (!m.from || !m.id) continue;
        const payload = m.button?.payload ?? m.interactive?.button_reply?.id ?? null;
        const texto = m.button?.text ?? m.interactive?.button_reply?.title ?? m.text?.body ?? '';
        mensagens.push({ de: numeroDaMeta(m.from), id: m.id, respondeA: m.context?.id ?? null, texto, payload, aceito: eAceito(payload, texto) });
      }
      for (const s of v.statuses ?? []) {
        if (!s.id || !s.status) continue;
        const erro = s.errors?.[0];
        estados.push({ id: s.id, estado: s.status, erro: erro ? `Erro ${erro.code ?? ''} ${erro.title ?? ''}`.trim().slice(0, 500) : null });
      }
    }
  }
  return { mensagens, estados };
}

/** É um «Aceito»? O botão manda o payload; quem escreve à mão «Aceito» conta também. */
export function eAceito(payload: string | null, texto: string): boolean {
  if (payload && (payload === PAYLOAD_ACEITO || payload.startsWith(`${PAYLOAD_ACEITO}:`))) return true;
  const t = texto.trim().toLowerCase().replace(/[.!]+$/, '');
  return t === 'aceito' || t === 'aceite';
}
