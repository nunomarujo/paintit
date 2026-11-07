import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { tratarMensagemRecebida } from './crmEntrada';

type Linha = Record<string, unknown>;

/** Uma base mínima em memória, só com o que o serviço usa: filtros por igualdade, ilike, in, ordenar, limitar. */
function baseDeEnsaio(tabelas: Tabelas) {
  let seq = 0;
  const from = (nome: string) => {
    const filtros: ((l: Linha) => boolean)[] = [];
    let op: 'select' | 'insert' | 'update' = 'select';
    let valores: Linha | Linha[] = {};
    let ordem: { col: string; asc: boolean } | null = null;
    let max = Infinity;
    const correr = () => {
      const t = (tabelas as unknown as Record<string, Linha[]>)[nome] ?? [];
      if (op === 'insert') {
        const novas = (Array.isArray(valores) ? valores : [valores]).map((v) => ({ id: `id-${++seq}`, ...v }));
        for (const n of novas) {
          const mid = (n as Linha).message_id;
          if (mid && t.some((l) => l.message_id === mid)) return { data: null, error: { code: '23505', message: 'duplicate key' } };
        }
        t.push(...novas);
        return { data: novas, error: null };
      }
      let alvo = t.filter((l) => filtros.every((f) => f(l)));
      if (op === 'update') {
        for (const l of alvo) Object.assign(l, valores);
        return { data: alvo, error: null };
      }
      if (ordem) alvo = [...alvo].sort((a, b) => (String(a[ordem!.col]) < String(b[ordem!.col]) ? -1 : 1) * (ordem!.asc ? 1 : -1));
      return { data: alvo.slice(0, max), error: null };
    };
    const b: Record<string, unknown> = {
      select: () => b,
      insert: (v: Linha | Linha[]) => ((op = 'insert'), (valores = v), b),
      update: (v: Linha) => ((op = 'update'), (valores = v), b),
      eq: (c: string, v: unknown) => (filtros.push((l) => l[c] === v), b),
      in: (c: string, vs: unknown[]) => (filtros.push((l) => vs.includes(l[c])), b),
      ilike: (c: string, v: string) => (filtros.push((l) => String(l[c] ?? '').toLowerCase() === v.toLowerCase()), b),
      order: (col: string, o?: { ascending?: boolean }) => ((ordem = { col, asc: o?.ascending !== false }), b),
      limit: (n: number) => ((max = n), b),
      maybeSingle: async () => {
        const r = correr();
        return { data: (r.data as Linha[] | null)?.[0] ?? null, error: r.error };
      },
      single: async () => {
        const r = correr();
        return { data: (r.data as Linha[] | null)?.[0] ?? null, error: r.error };
      },
      then: (res: (v: unknown) => unknown) => res(correr()),
    };
    return b;
  };
  return { from } as never;
}

type Tabelas = { crm_contactos: Linha[]; crm_envios: Linha[]; crm_eventos: Linha[]; crm_mensagens: Linha[] };
let t: Tabelas;
beforeEach(() => {
  t = {
    crm_contactos: [{ id: 'c1', nome: 'Pinturas Lima, Lda.', email: 'geral@lima.pt', estado: 'contactado', desistiu_em: null }],
    crm_envios: [
      { id: 'e1', contacto_id: 'c1', campanha_id: 'pintor-1', estado: 'enviado', enviado_em: '2026-11-06' },
      { id: 'e2', contacto_id: 'c1', campanha_id: 'pintor-2', estado: 'aprovado' },
    ],
    crm_eventos: [],
    crm_mensagens: [],
  };
});
const tratar = (o: { de?: string; assunto?: string; texto: string; messageId?: string }) =>
  tratarMensagemRecebida(baseDeEnsaio(t), { de: o.de ?? 'Maria <geral@lima.pt>', assunto: o.assunto ?? 'Re: Plano Pro', texto: o.texto, messageId: o.messageId });

describe('tratarMensagemRecebida', () => {
  it('um pedido para sair: o contacto sai, o que ia sair deixa de sair, e conta como desistência', async () => {
    const r = await tratar({ texto: 'Por favor removam o meu email da vossa lista.' });
    expect(r).toMatchObject({ categoria: 'desistencia', contactoId: 'c1' });
    expect(t.crm_contactos[0]).toMatchObject({ estado: 'desistiu' });
    expect(t.crm_contactos[0]!.desistiu_em).toBeTruthy();
    expect(t.crm_envios.find((e) => e.id === 'e2')!.estado).toBe('rejeitado');
    expect(t.crm_envios.find((e) => e.id === 'e1')!.estado).toBe('enviado');
    expect(t.crm_eventos).toMatchObject([{ contacto_id: 'c1', tipo: 'desistencia' }]);
    expect(t.crm_mensagens).toHaveLength(1);
    expect(t.crm_mensagens[0]).toMatchObject({ estado: 'tratada', direcao: 'entrada' });
  });

  it('uma recusa: pára, sem contar como desistência', async () => {
    await tratar({ texto: 'Não temos interesse, obrigado.' });
    expect(t.crm_contactos[0]).toMatchObject({ estado: 'recusou' });
    expect(t.crm_contactos[0]!.desistiu_em).toBeNull();
    expect(t.crm_envios.find((e) => e.id === 'e2')!.estado).toBe('rejeitado');
    expect(t.crm_eventos).toMatchObject([{ tipo: 'resposta', detalhe: 'recusa' }]);
    expect(t.crm_mensagens[0]).toMatchObject({ estado: 'tratada' });
  });

  it('um ressalto: o endereço que falhou, lido da mensagem, deixa de existir para a base', async () => {
    const r = await tratar({
      de: 'Mail Delivery Subsystem <mailer-daemon@googlemail.com>',
      assunto: 'Mail delivery failed',
      texto: 'A mensagem não foi entregue. Delivery to the following recipient failed permanently: geral@lima.pt\nFinal-Recipient: rfc822; geral@lima.pt',
    });
    expect(r).toMatchObject({ categoria: 'ressalto', contactoId: 'c1' });
    expect(t.crm_contactos[0]).toMatchObject({ email: null });
    expect(t.crm_contactos[0]!.enriquecido_em).toBeTruthy();
    expect(t.crm_mensagens[0]).toMatchObject({ categoria: 'ressalto', estado: 'tratada' });
  });

  it('um ressalto de um endereço que não conhecemos só se guarda', async () => {
    await tratar({ de: 'mailer-daemon@x.com', assunto: 'Undeliverable', texto: 'falhou: desconhecido@outra.pt' });
    expect(t.crm_contactos[0]).toMatchObject({ email: 'geral@lima.pt' });
    expect(t.crm_mensagens[0]).toMatchObject({ categoria: 'ressalto', contacto_id: null });
  });

  it('interesse: fica por tratar, conta como resposta, e traz um rascunho com a campanha que saiu', async () => {
    const r = await tratar({ texto: 'Tenho interesse. Podem enviar mais informação?' });
    expect(r).toMatchObject({ categoria: 'interesse', rascunho: true });
    expect(t.crm_contactos[0]).toMatchObject({ estado: 'respondeu' });
    expect(t.crm_eventos).toMatchObject([{ tipo: 'resposta', detalhe: 'interesse' }]);
    const [entrada, saida] = t.crm_mensagens;
    expect(entrada).toMatchObject({ direcao: 'entrada', estado: 'nova' });
    expect(saida).toMatchObject({ direcao: 'saida', estado: 'rascunho', em_resposta_a: entrada!.id, campanha_id: 'pintor-1' });
    expect(String(saida!.texto)).toContain('Pinturas Lima, Lda.');
  });

  it('uma pergunta fica por tratar, sem rascunho', async () => {
    const r = await tratar({ texto: 'A empresa é de Viana? Qual a morada?' });
    expect(r).toMatchObject({ categoria: 'pergunta', rascunho: false });
    expect(t.crm_mensagens).toHaveLength(1);
    expect(t.crm_mensagens[0]).toMatchObject({ estado: 'nova' });
  });

  it('a nossa mensagem citada não faz de uma resposta um pedido para sair', async () => {
    const r = await tratar({ texto: 'Tenho interesse, liguem-me.\n\n> Para não receber mais mensagens: https://quempinta.pt/api/crm/sair/AB12CD34' });
    expect(r.categoria).toBe('interesse');
    expect(t.crm_contactos[0]).toMatchObject({ estado: 'respondeu' });
    expect(t.crm_contactos[0]!.desistiu_em).toBeNull();
  });

  it('a mesma mensagem entregue duas vezes conta uma', async () => {
    const a = await tratar({ texto: 'Tenho interesse.', messageId: '<abc@mail>' });
    const b = await tratar({ texto: 'Tenho interesse.', messageId: '<abc@mail>' });
    expect(a.duplicada).toBe(false);
    expect(b.duplicada).toBe(true);
    expect(t.crm_mensagens.filter((m) => m.direcao === 'entrada')).toHaveLength(1);
    expect(t.crm_eventos).toHaveLength(1);
  });

  it('um remetente desconhecido é guardado, sem contacto e sem rascunho', async () => {
    const r = await tratar({ de: 'Ana <ana@outra.pt>', texto: 'Tenho interesse.' });
    expect(r).toMatchObject({ categoria: 'interesse', contactoId: null, rascunho: false });
    expect(t.crm_mensagens).toHaveLength(1);
    expect(t.crm_mensagens[0]).toMatchObject({ contacto_id: null, estado: 'nova' });
    expect(t.crm_eventos).toHaveLength(0);
  });

  it('o texto guardado tem limite e não traz a citação', async () => {
    await tratar({ texto: `${'a'.repeat(9000)}\n\n> citado` });
    expect(String(t.crm_mensagens[0]!.texto).length).toBeLessThanOrEqual(4000);
    expect(String(t.crm_mensagens[0]!.texto)).not.toContain('citado');
  });
});
