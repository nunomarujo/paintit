import { describe, expect, it } from 'vitest';
import { configuracaoWhatsApp, numeroWhatsApp, variaveisDoAviso } from './whatsapp';

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
