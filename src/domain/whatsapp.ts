/**
 * Avisos por WhatsApp (02/11/2026, pedido do promotor).
 *
 * O WhatsApp só deixa a empresa iniciar conversa com textos aprovados de antemão pela Meta. Em vez de
 * aprovar um texto por tipo de aviso, usa-se **um só modelo genérico** com três variáveis — assunto,
 * texto e ligação — que são exatamente as três colunas que a fila de avisos já tem. Assim um aviso novo
 * na aplicação não precisa de aprovação nova.
 *
 * O número guarda-se no formato internacional (+351…), que é o único que o serviço aceita. Quem escreve
 * «912 345 678» ou «00351912345678» fica com o número certo na mesma.
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

export type ConfiguracaoWhatsApp = {
  accountSid: string;
  authToken: string;
  /** O remetente, no formato que o serviço usa: «whatsapp:+351…». */
  de: string;
  /** O identificador do modelo genérico aprovado (três variáveis: assunto, texto, ligação). */
  modelo: string;
};

/** Lê a configuração do ambiente. Sem as quatro chaves, o canal não existe — e isso não é erro: o email
 * continua a sair. */
export function configuracaoWhatsApp(env: Record<string, string | undefined>): ConfiguracaoWhatsApp | null {
  const accountSid = env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = env.TWILIO_AUTH_TOKEN?.trim();
  const de = env.TWILIO_WHATSAPP_FROM?.trim();
  const modelo = env.WHATSAPP_MODELO_AVISO?.trim();
  if (!accountSid || !authToken || !de || !modelo) return null;
  return { accountSid, authToken, de: de.startsWith('whatsapp:') ? de : `whatsapp:${de}`, modelo };
}

/** As três variáveis do modelo, já aparadas ao que o WhatsApp aceita (sem quebras de linha, tamanho
 * razoável). A ligação vai inteira: cortá-la seria pior do que nada. */
export function variaveisDoAviso(assunto: string, texto: string, link: string | null): Record<string, string> {
  const limpa = (s: string, max: number) => {
    const t = s.replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max - 1) + '…' : t;
  };
  return { '1': limpa(assunto, 120), '2': limpa(texto, 600), '3': link ?? '' };
}
