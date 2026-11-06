/**
 * Textos dos emails das campanhas do CRM (promotor, 06/11/2026). Isto é o RASCUNHO inicial de cada campanha: o texto que
 * vale é o guardado em `crm_campanhas`, que só envia depois de o promotor o aprovar. Aqui só se escrevem factos que a
 * plataforma já cumpre (ver `BENEFICIOS_PRO` em `painterPlan.ts`) e as condições da campanha de lançamento, lidas de
 * `CAMPANHA_DE_LANCAMENTO`, o mesmo sítio dos flyers. Nunca números de propostas; regra 15: nunca comissão ao cliente,
 * nem percentagens a quem ainda não aceitou os termos do pintor.
 */

import { COMPANY } from '@/config/company';
import { CAMPANHA_DE_LANCAMENTO } from './campanhas';
import { BRAND } from '@/config/brand';

export interface TextoDeCampanha {
  assunto: string;
  /** Parágrafos separados por linha em branco. {nome} e {codigo} são substituídos por contacto. */
  corpo: string;
  cta: string;
}

const ATE = CAMPANHA_DE_LANCAMENTO.ateEmPalavras;

export const TEXTOS_INICIAIS: Record<string, TextoDeCampanha> = {
  'pintor-1': {
    assunto: 'Plano Pro grátis até 31 de janeiro, para empresas de pintura',
    corpo: `Bom dia, {nome}.

Sou o Nuno, da Quem Pinta, uma ferramenta de orçamentação e gestão de obra para empresas de pintura, com marketplace incluído. Estamos a abrir em Viana do Castelo.

Até ${ATE}, o Plano Pro não tem custo para as empresas que aderirem por este email. Inclui orçamentos com o seu logótipo e contactos, prontos a exportar ou a enviar aos seus clientes; o seguimento automático dos orçamentos enviados; o cofre de documentos, com aviso antes de caducarem; adendas de trabalhos a mais aceites pelo cliente num clique; o diário fotográfico da obra; e desconto na comissão das obras ganhas pelo marketplace.

Os orçamentos para os seus clientes próprios não pagam comissão.

Se aderir mais tarde, indique o código {codigo}.`,
    cta: 'Experimentar o Plano Pro',
  },
  'pintor-2': {
    assunto: 'Obras de pintura na sua zona, e orçamentos com o seu logótipo',
    corpo: `Bom dia, {nome}.

Sou o Nuno, da Quem Pinta. Condomínios e particulares publicam aqui as obras de pintura que querem orçamentar, e as empresas verificadas respondem com a sua proposta. Quando o cliente escolhe, o contrato assina-se na própria plataforma, pelas duas partes.

Até ${ATE}, o Plano Pro não tem custo para as empresas que aderirem por este email: orçamentos com o seu logótipo e contactos, que pode exportar ou enviar aos seus clientes, cofre de documentos, adendas aceites pelo cliente e diário de obra.

Se aderir mais tarde, indique o código {codigo}.`,
    cta: 'Ver as obras da zona',
  },
  'fornecedor-1': {
    assunto: 'O seu catálogo de tintas dentro do orçamento do pintor',
    corpo: `Bom dia, {nome}.

Sou o Nuno, da Quem Pinta. Quando um pintor monta um orçamento na plataforma, escolhe os produtos de um catálogo. Os fornecedores que lá estão aparecem no momento em que a escolha é feita.

Estamos a abrir em Viana do Castelo. Até ${ATE}, a presença no catálogo não tem subscrição para os fornecedores que aderirem por este email.

Se aderir mais tarde, indique o código {codigo}.`,
    cta: 'Ver como entrar no catálogo',
  },
  'fornecedor-2': {
    assunto: 'Quem vê a obra primeiro vende a tinta',
    corpo: `Bom dia, {nome}.

Sou o Nuno, da Quem Pinta. Antes de um pintor orçamentar, alguém tem de ver a obra e medi-la. Na plataforma, os fornecedores podem ser avaliadores desses levantamentos na sua zona. Quem vê a obra primeiro conhece o que vai ser preciso.

Estamos a abrir em Viana do Castelo. Até ${ATE}, a presença no catálogo não tem subscrição para os fornecedores que aderirem por este email.

Se aderir mais tarde, indique o código {codigo}.`,
    cta: 'Ver como ser avaliador',
  },
  'condominio-1': {
    assunto: 'Propostas de pintura comparáveis para a assembleia',
    corpo: `Bom dia, {nome}.

Sou o Nuno, da Quem Pinta. Para quem administra condomínios: descreve-se a obra uma vez e pintores verificados enviam as suas propostas, que só são abertas no fim do prazo, todas ao mesmo tempo.

Cada proposta fica comparável com as outras, e a plataforma gera um relatório pronto para levar à assembleia. Estamos a abrir em Viana do Castelo. Até ${ATE}, o relatório e o acesso dos condóminos não têm custo para os prédios registados por este email.

Se registar mais tarde, indique o código {codigo}.`,
    cta: 'Ver um exemplo de relatório',
  },
  'condominio-2': {
    assunto: 'O voto dos condóminos nas propostas, sem papéis',
    corpo: `Bom dia, {nome}.

Sou o Nuno, da Quem Pinta. Na plataforma, os condóminos de um prédio podem ver as propostas de pintura e votar, e a administração fica com o resultado registado.

Estamos a abrir em Viana do Castelo. Até ${ATE}, o relatório e o acesso dos condóminos não têm custo para os prédios registados por este email.

Se registar mais tarde, indique o código {codigo}.`,
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
