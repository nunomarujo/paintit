import { describe, expect, it } from 'vitest';
import { configuracaoWhatsApp, numeroWhatsApp, variaveisDoAviso, assinaturaTwilio, assinaturaValida, eAceito, numeroDoRemetente } from './whatsapp';

describe('o número de WhatsApp', () => {
  it('aceita um telemóvel português escrito de várias maneiras', () => {
    for (const e of ['912345678', '912 345 678', '+351 912 345 678', '00351912345678', '+351912345678']) {
      expect(numeroWhatsApp(e)).toBe('+351912345678');
    }
  });
  it('recusa fixos e números incompletos', () => {
    expect(numeroWhatsApp('212345678')).toBeNull();
    expect(numeroWhatsApp('91234')).toBeNull();
    expect(numeroWhatsApp('+351212345678')).toBeNull();
    expect(numeroWhatsApp('')).toBeNull();
    expect(numeroWhatsApp(null)).toBeNull();
  });
  it('aceita um número estrangeiro com indicativo', () => {
    expect(numeroWhatsApp('+34 612 345 678')).toBe('+34612345678');
  });
});

describe('a configuração', () => {
  it('sem as quatro chaves, o canal não existe', () => {
    expect(configuracaoWhatsApp({})).toBeNull();
    expect(configuracaoWhatsApp({ TWILIO_ACCOUNT_SID: 'a', TWILIO_AUTH_TOKEN: 'b', TWILIO_WHATSAPP_FROM: '+1' })).toBeNull();
  });
  it('com tudo, prefixa o remetente', () => {
    const c = configuracaoWhatsApp({ TWILIO_ACCOUNT_SID: 'a', TWILIO_AUTH_TOKEN: 'b', TWILIO_WHATSAPP_FROM: '+15550001', WHATSAPP_MODELO_AVISO: 'HX1' });
    expect(c?.de).toBe('whatsapp:+15550001');
  });
});

describe('as variáveis do modelo', () => {
  it('apara o texto e mantém a ligação inteira', () => {
    const v = variaveisDoAviso('  Prazo\na acabar ', 'x'.repeat(700), 'https://quempinta.pt/app/levantamentos/1');
    expect(v['1']).toBe('Prazo a acabar');
    expect(v['2']?.length).toBe(600);
    expect(v['3']).toBe('https://quempinta.pt/app/levantamentos/1');
  });
});

describe('o que chega da Twilio', () => {
  // O exemplo da própria documentação da Twilio («Webhooks security»), com o Auth Token 12345.
  const url = 'https://mycompany.com/myapp.php?foo=1&bar=2';
  const params = { CallSid: 'CA1234567890ABCDE', Caller: '+12349013030', Digits: '1234', From: '+12349013030', To: '+18005551212' };
  it('a assinatura é a da documentação da Twilio', () => {
    expect(assinaturaTwilio('12345', url, params)).toBe('0/KCTR6DLpKmkAf8muzZqo1nDgQ=');
  });
  it('recusa a assinatura em falta, trocada, ou de outro endereço', () => {
    expect(assinaturaValida('12345', url, params, '0/KCTR6DLpKmkAf8muzZqo1nDgQ=')).toBe(true);
    expect(assinaturaValida('12345', url, params, null)).toBe(false);
    expect(assinaturaValida('12345', url, { ...params, Digits: '9999' }, '0/KCTR6DLpKmkAf8muzZqo1nDgQ=')).toBe(false);
    expect(assinaturaValida('12345', 'https://outro.pt/', params, '0/KCTR6DLpKmkAf8muzZqo1nDgQ=')).toBe(false);
  });
  it('reconhece o «Aceito» pelo botão ou escrito à mão', () => {
    expect(eAceito({ ButtonPayload: 'aceito_avaliador' })).toBe(true);
    expect(eAceito({ Body: ' Aceito! ' })).toBe(true);
    expect(eAceito({ Body: 'aceite' })).toBe(true);
    expect(eAceito({ Body: 'Não aceito' })).toBe(false);
    expect(eAceito({ Body: 'Olá' })).toBe(false);
  });
  it('tira o prefixo do remetente', () => {
    expect(numeroDoRemetente('whatsapp:+351912345678')).toBe('+351912345678');
  });
});
