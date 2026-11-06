/**
 * Textos dos emails das campanhas do CRM (promotor, 06/11/2026). Isto é o RASCUNHO inicial de cada campanha: o texto que
 * vale é o guardado em `crm_campanhas`, que só envia depois de o promotor o aprovar. Aqui só se escrevem factos que a
 * plataforma já cumpre: propostas abertas em simultâneo, contrato assinado na plataforma, e nada de números de propostas.
 * Regra 15: ao cliente nunca se fala de comissão; a oferta de comissão é só para pintores e fornecedores.
 */

import { COMPANY } from '@/config/company';
import { BRAND } from '@/config/brand';

export interface TextoDeCampanha {
  assunto: string;
  /** Parágrafos separados por linha em branco. {nome} e {codigo} são substituídos por contacto. */
  corpo: string;
  cta: string;
}

export const TEXTOS_INICIAIS: Record<string, TextoDeCampanha> = {
  'pintor-1': {
    assunto: 'Orçamentar obras de pintura sem perder tempo',
    corpo: `Bom dia, {nome}.

Sou o Nuno, da Quem Pinta, uma plataforma portuguesa onde condomínios e particulares descrevem a obra e pintores verificados enviam o seu orçamento. Estamos a abrir em Viana do Castelo.

A plataforma ajuda a montar o orçamento a partir das medidas do pedido, e as propostas só são abertas ao cliente no fim do prazo, todas ao mesmo tempo: ninguém ganha por entregar primeiro.

Quem se registar com o código {codigo} tem 5% de desconto na primeira comissão da plataforma.`,
    cta: 'Ver como funciona',
  },
  'pintor-2': {
    assunto: 'Obras de pintura na sua zona, com contrato assinado na plataforma',
    corpo: `Bom dia, {nome}.

Sou o Nuno, da Quem Pinta. Condomínios e particulares publicam aqui as obras de pintura que querem orçamentar, e os pintores verificados da zona respondem com a sua proposta.

Quando o cliente escolhe, o contrato assina-se na própria plataforma, pelas duas partes. Não há contactos soltos nem propostas perdidas em conversas.

Quem se registar com o código {codigo} tem 5% de desconto na primeira comissão da plataforma.`,
    cta: 'Ver as obras da zona',
  },
  'fornecedor-1': {
    assunto: 'O seu catálogo de tintas dentro do orçamento do pintor',
    corpo: `Bom dia, {nome}.

Sou o Nuno, da Quem Pinta. Quando um pintor monta um orçamento na plataforma, escolhe os produtos de um catálogo. Os fornecedores que lá estão aparecem no momento em que a escolha é feita.

Estamos a abrir em Viana do Castelo e a convidar as lojas e distribuidores de tintas da zona.

Quem se registar com o código {codigo} tem 5% de desconto na primeira comissão da plataforma.`,
    cta: 'Ver como entrar no catálogo',
  },
  'fornecedor-2': {
    assunto: 'Quem vê a obra primeiro vende a tinta',
    corpo: `Bom dia, {nome}.

Sou o Nuno, da Quem Pinta. Antes de um pintor orçamentar, alguém tem de ver a obra e medi-la. Na plataforma, os fornecedores podem ser avaliadores desses levantamentos na sua zona.

Quem vê a obra primeiro conhece o que vai ser preciso. Estamos a abrir em Viana do Castelo.

Quem se registar com o código {codigo} tem 5% de desconto na primeira comissão da plataforma.`,
    cta: 'Ver como ser avaliador',
  },
  'condominio-1': {
    assunto: 'Propostas de pintura comparáveis para a assembleia',
    corpo: `Bom dia, {nome}.

Sou o Nuno, da Quem Pinta. Para quem administra condomínios: descreve-se a obra uma vez e pintores verificados enviam as suas propostas, que só são abertas no fim do prazo, todas ao mesmo tempo.

Cada proposta fica comparável com as outras, e a plataforma gera um relatório pronto para levar à assembleia. Estamos a abrir em Viana do Castelo.

Para os prédios que registar com o código {codigo}, o relatório e o acesso dos condóminos não têm custo.`,
    cta: 'Ver um exemplo de relatório',
  },
  'condominio-2': {
    assunto: 'O voto dos condóminos nas propostas, sem papéis',
    corpo: `Bom dia, {nome}.

Sou o Nuno, da Quem Pinta. Na plataforma, os condóminos de um prédio podem ver as propostas de pintura e votar, e a administração fica com o resultado registado.

Estamos a abrir em Viana do Castelo e a convidar as administradoras da zona.

Para os prédios que registar com o código {codigo}, o relatório e o acesso dos condóminos não têm custo.`,
    cta: 'Ver como funciona',
  },
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface EmailRenderizado {
  assunto: string;
  texto: string;
  html: string;
  linkDeSaida: string;
}

/** Monta o email de um contacto: texto da campanha, botão com o link rastreado e o rodapé legal. */
export function renderizarEmail(campanhaId: string, t: TextoDeCampanha, c: { nome: string; codigo: string }): EmailRenderizado {
  const sub = (s: string) => s.replace(/\{nome\}/g, c.nome).replace(/\{codigo\}/g, c.codigo);
  const link = `${BRAND.url}/api/crm/c/${c.codigo}?e=${encodeURIComponent(campanhaId)}`;
  const linkDeSaida = `${BRAND.url}/api/crm/sair/${c.codigo}`;
  const paragrafos = sub(t.corpo).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const rodape = [
    `${COMPANY.name}, NIF ${COMPANY.nif}, ${COMPANY.address}, ${COMPANY.postalCode} ${COMPANY.city}.`,
    'Escrevemos-lhe porque o contacto da sua empresa é público (OpenStreetMap ou o website da empresa).',
    `Para não receber mais mensagens: ${linkDeSaida}`,
  ];
  const texto = [...paragrafos, `${t.cta}: ${link}`, '', ...rodape].join('\n\n');
  const html = `<!doctype html><html><body style="margin:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#0b2540">
<div style="max-width:560px;margin:0 auto;padding:24px;font-size:16px;line-height:1.5">
${paragrafos.map((p) => `<p style="margin:0 0 14px">${esc(p)}</p>`).join('\n')}
<p style="margin:18px 0"><a href="${esc(link)}" style="display:inline-block;background:#0b2540;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px">${esc(t.cta)}</a></p>
<p style="margin:24px 0 0;font-size:13px;color:#475467">${esc(rodape[0]!)}<br>${esc(rodape[1]!)}<br><a href="${esc(linkDeSaida)}" style="color:#475467">Não quero receber mais mensagens</a></p>
</div></body></html>`;
  return { assunto: sub(t.assunto), texto, html, linkDeSaida };
}
