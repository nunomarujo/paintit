import { describe, expect, it } from 'vitest';

type Modelo = { to: string; template: { components: { type: string; sub_type?: string; index?: string; parameters: { text?: string; payload?: string }[] }[] } };
import {
  assinaturaMeta, assinaturaValida, configuracaoWhatsApp, conviteDoPayload, corpoDeTexto, corpoDoModelo, eAceito,
  eventosDoWebhook, numeroDaMeta, numeroParaMeta, numeroWhatsApp, payloadDoConvite, respostaDaVerificacao, variaveisDoAviso,
} from './whatsapp';

describe('o número de WhatsApp', () => {
  it('aceita um telemóvel português escrito de várias maneiras', () => {
    for (const n of ['912 345 678', '+351 912 345 678', '00351912345678', '912345678']) expect(numeroWhatsApp(n)).toBe('+351912345678');
  });
  it('recusa o que não é telemóvel', () => {
    for (const n of ['', null, '211234567', '12345', '+351 812 345 678', 'abc']) expect(numeroWhatsApp(n as string | null)).toBeNull();
  });
  it('a Meta usa o número sem o «+»', () => {
    expect(numeroParaMeta('+351912345678')).toBe('351912345678');
    expect(numeroDaMeta('351912345678')).toBe('+351912345678');
  });
});

describe('a configuração', () => {
  const todas = { WHATSAPP_TOKEN: 't', WHATSAPP_NUMERO_ID: '123', WHATSAPP_SEGREDO_APP: 's', WHATSAPP_TOKEN_VERIFICACAO: 'v' };
  it('sem as quatro chaves, o canal não existe', () => {
    expect(configuracaoWhatsApp({})).toBeNull();
    expect(configuracaoWhatsApp({ ...todas, WHATSAPP_TOKEN: undefined })).toBeNull();
  });
  it('com tudo, assume idioma e versão por omissão', () => {
    expect(configuracaoWhatsApp(todas)).toMatchObject({ numeroId: '123', idioma: 'pt_PT', versaoApi: 'v21.0' });
  });
});

describe('o que se envia', () => {
  it('apara as variáveis: sem quebras de linha, ligação inteira', () => {
    const v = variaveisDoAviso('  Prazo\na acabar ', 'x'.repeat(700), 'https://quempinta.pt/app/1');
    expect(v[0]).toBe('Prazo a acabar');
    expect(v[1]).toHaveLength(600);
    expect(v[2]).toBe('https://quempinta.pt/app/1');
  });
  it('o modelo com botão leva o convite no payload', () => {
    const id = '11111111-2222-4333-8444-555555555555';
    const c = corpoDoModelo('+351912345678', 'avaliador_nova_oportunidade', 'pt_PT', ['Viana do Castelo', 'fachadas'], payloadDoConvite(id)) as unknown as Modelo;
    expect(c.to).toBe('351912345678');
    expect(c.template.components[0]!.parameters.map((p) => p.text)).toEqual(['Viana do Castelo', 'fachadas']);
    expect(c.template.components[1]!).toMatchObject({ type: 'button', sub_type: 'quick_reply', index: '0' });
    expect(conviteDoPayload(c.template.components[1]!.parameters[0]!.payload)).toBe(id);
  });
  it('texto livre não gera pré-visualização', () => {
    expect((corpoDeTexto('+351912345678', 'Olá') as { text: unknown }).text).toEqual({ body: 'Olá', preview_url: false });
  });
  it('um payload que não é de convite não dá convite', () => {
    expect(conviteDoPayload('aceito_avaliador')).toBeNull();
    expect(conviteDoPayload('outra:coisa')).toBeNull();
  });
});

describe('o que chega da Meta', () => {
  it('a assinatura é HMAC-SHA256 do corpo cru com o segredo da aplicação', () => {
    // Vetor independente (python hmac): segredo «segredo», corpo «{"a":1}».
    expect(assinaturaMeta('segredo', '{"a":1}')).toBe('sha256=d74ec81e38acd14dea41865e84bfb51d4ed99dd9042fc82a87534890ac2bb655');
  });
  it('recusa a assinatura em falta, trocada, ou de outro corpo', () => {
    const corpo = '{"entry":[]}';
    const boa = assinaturaMeta('s', corpo);
    expect(assinaturaValida('s', corpo, boa)).toBe(true);
    expect(assinaturaValida('s', corpo, null)).toBe(false);
    expect(assinaturaValida('outro', corpo, boa)).toBe(false);
    expect(assinaturaValida('s', corpo + ' ', boa)).toBe(false);
  });
  it('confirma o endereço só com a palavra combinada', () => {
    const q = (t: string) => new URLSearchParams({ 'hub.mode': 'subscribe', 'hub.verify_token': t, 'hub.challenge': '1234' });
    expect(respostaDaVerificacao(q('v'), 'v')).toBe('1234');
    expect(respostaDaVerificacao(q('x'), 'v')).toBeNull();
  });
  it('lê o «Aceito» do botão e os estados de entrega', () => {
    const corpo = {
      entry: [{ changes: [{ value: {
        messages: [{ from: '351938279769', id: 'wamid.A', type: 'button', button: { payload: 'aceito_avaliador:11111111-2222-4333-8444-555555555555', text: 'Aceito' }, context: { id: 'wamid.O' } }],
        statuses: [{ id: 'wamid.O', status: 'failed', errors: [{ code: 131026, title: 'Undeliverable' }] }, { id: 'wamid.P', status: 'delivered' }],
      } }] }],
    };
    const { mensagens, estados } = eventosDoWebhook(corpo);
    expect(mensagens).toEqual([expect.objectContaining({ de: '+351938279769', respondeA: 'wamid.O', aceito: true })]);
    expect(estados).toEqual([{ id: 'wamid.O', estado: 'failed', erro: 'Erro 131026 Undeliverable' }, { id: 'wamid.P', estado: 'delivered', erro: null }]);
  });
  it('lê o que não conhece sem falhar', () => {
    expect(eventosDoWebhook(null)).toEqual({ mensagens: [], estados: [] });
    expect(eventosDoWebhook({ entry: [{ changes: [{ value: {} }] }] })).toEqual({ mensagens: [], estados: [] });
  });
  it('«Aceito» escrito à mão conta; «não aceito» não', () => {
    expect(eAceito(null, ' Aceito! ')).toBe(true);
    expect(eAceito(null, 'Não aceito')).toBe(false);
    expect(eAceito(null, 'Olá')).toBe(false);
  });
});
