/**
 * Respostas aos emails das campanhas: a que categoria pertence cada uma, e o que a plataforma faz sozinha (promotor,
 * 06/11/2026). Funções puras, sem IA nem custo: regras sobre o texto, testadas com frases reais.
 *
 * O que se faz sozinho é só o que a lei ou o bom senso mandam fazer logo — respeitar um pedido para sair, parar uma
 * recusa, deixar de escrever para um endereço que não existe. O resto (interesse, perguntas) espera por uma pessoa, com
 * um rascunho de resposta quando o há.
 */

export const CATEGORIAS = ['ressalto', 'automatica', 'desistencia', 'recusa', 'interesse', 'pergunta', 'outro'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

/** Categorias que esperam por uma pessoa; as outras a plataforma trata sozinha. */
export const PRECISA_DE_PESSOA: readonly Categoria[] = ['interesse', 'pergunta', 'outro'];

/** Sem acentos, minúsculas, espaços simples: as regras escrevem-se uma vez. */
export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Só o que a pessoa escreveu, sem a nossa mensagem citada por baixo. Importa: o rodapé dos nossos emails diz «não quero
 * receber mais mensagens» e, citado, faria de toda a resposta um pedido de saída.
 */
export function semCitacao(texto: string): string {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n');
  const fim = linhas.findIndex((l, i) => {
    const t = l.trim();
    if (/^>/.test(t)) return true;
    if (/^-{2,}\s*(mensagem original|original message|forwarded)/i.test(t)) return true;
    if (/^_{5,}$/.test(t)) return true;
    if (/^(em|on) .{5,200}(escreveu|wrote)\s*:?$/i.test(t)) return true;
    // «Em sex., 6 de nov. de 2026 às 10:00, Nuno <x@y.pt> escreveu:» partido por duas linhas.
    if (/^(em|on) .{5,200}$/i.test(t) && /(escreveu|wrote)\s*:?$/i.test((linhas[i + 1] ?? '').trim())) return true;
    if (/^(de|from)\s*:\s*\S/i.test(t) && i > 0 && /^(enviado|sent|date|data|para|to|assunto|subject)\s*:/i.test((linhas[i + 1] ?? '').trim())) return true;
    return false;
  });
  return (fim === -1 ? linhas : linhas.slice(0, fim)).join('\n').trim();
}

export interface MensagemRecebida {
  de: string;
  assunto: string;
  texto: string;
}

const RESSALTO_REMETENTE = /mailer-daemon|postmaster|mail delivery|no-?reply.*(bounce|delivery)/;
const RESSALTO_ASSUNTO = /undeliverable|delivery status|delivery failure|returned mail|failure notice|nao foi possivel entregar|falha (na|de) entrega|mensagem nao entregue|endereco nao encontrado/;
const AUTOMATICA = /resposta automatica|mensagem automatica|automatic reply|auto-?reply|out of office|fora do escritorio|estou ausente|encontro-me ausente|de ferias|em ferias|volto a|regresso a/;
const DESISTENCIA = /deixar de receber|nao quero receber|nao pretendo receber|nao (me )?(enviem|contactem|escrevam)|parem de (me )?(enviar|escrever|contactar)|parar de (me )?(enviar|escrever|contactar)|remov(er|am|a) (o meu|este|o nosso) (email|endereco|contacto)|retir(ar|em|e) (o meu|este|o nosso) (email|endereco|contacto)|remover da (vossa )?lista|retirar da (vossa )?lista|unsubscribe|cancelar (a )?(subscricao|inscricao)|apagar (os )?(meus|nossos) dados|rgpd|isto e spam|\bspam\b/;
const RECUSA = /nao (tenho|temos|estou|estamos) (nada )?interess|sem interesse|nao (me|nos) interessa|nao precisamos|nao necessito|nao e do nosso interesse|agradeco mas nao|obrigado mas nao|obrigada mas nao|nao, obrigad/;
const INTERESSE = /tenho interesse|temos interesse|estou interessad|estamos interessad|interessa-?me|interessa-nos|quero saber|queremos saber|gostaria de saber|gostava de saber|gostaria de (conhecer|ver|experimentar)|mais informac|como funciona|podem (enviar|explicar|ligar|contactar)|pode (enviar|explicar|ligar|contactar)|enviar (mais )?(informacao|informacoes|proposta|detalhes)|marcar (uma )?(reuniao|chamada|conversa|demonstracao)|contacte-?me|contactem-?me|liguem-?me|ligue-?me|quanto custa|qual (e )?o preco|quero aderir|queremos aderir|como (me )?(registo|registar|adiro|aderir)|pode ser/;

/** A que categoria pertence uma resposta. A ordem importa: o que obriga a plataforma a agir vem primeiro. */
export function classificarMensagem(m: MensagemRecebida): Categoria {
  const de = normalizar(m.de);
  const assunto = normalizar(m.assunto);
  const texto = normalizar(semCitacao(m.texto));
  if (RESSALTO_REMETENTE.test(de) || RESSALTO_ASSUNTO.test(assunto)) return 'ressalto';
  if (AUTOMATICA.test(assunto) || AUTOMATICA.test(texto.slice(0, 400))) return 'automatica';
  if (DESISTENCIA.test(texto) || DESISTENCIA.test(assunto)) return 'desistencia';
  if (RECUSA.test(texto)) return 'recusa';
  if (INTERESSE.test(texto)) return 'interesse';
  if (texto.includes('?')) return 'pergunta';
  return 'outro';
}

/** O que a plataforma faz sozinha, por categoria. */
export type AcaoAutomatica = 'sair' | 'parar' | 'endereco_invalido' | 'nenhuma';
export const ACAO_AUTOMATICA: Record<Categoria, AcaoAutomatica> = {
  desistencia: 'sair',
  recusa: 'parar',
  ressalto: 'endereco_invalido',
  automatica: 'nenhuma',
  interesse: 'nenhuma',
  pergunta: 'nenhuma',
  outro: 'nenhuma',
};

/** Rascunho de resposta a quem mostrou interesse. As perguntas ficam para uma pessoa: um rascunho errado custa mais do que nenhum. */
export function rascunhoDeResposta(categoria: Categoria, c: { nome: string; assuntoOriginal: string }): { assunto: string; corpo: string } | null {
  if (categoria !== 'interesse') return null;
  const assunto = /^re\s*:/i.test(c.assuntoOriginal.trim()) ? c.assuntoOriginal.trim() : `Re: ${c.assuntoOriginal.trim() || 'Quem Pinta'}`;
  return {
    assunto,
    corpo: `Bom dia, ${c.nome}.\n\nObrigado pela resposta. No botão abaixo vê como funciona e pode aderir quando quiser.\n\nSe preferir falar, diga-me o melhor número e a melhor hora e ligo-lhe.\n\nNuno, Quem Pinta`,
  };
}

/** O endereço de «Nome <a@b.pt>», em minúsculas; null se não houver. */
export function enderecoDe(de: string): string | null {
  const m = /<([^<>\s]+@[^<>\s]+)>/.exec(de) ?? /([^\s<>"',;]+@[^\s<>"',;]+)/.exec(de);
  return m ? m[1]!.toLowerCase() : null;
}
