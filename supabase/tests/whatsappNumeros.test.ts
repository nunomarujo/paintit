import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { baseComMigracoes } from './baseEmMemoria';

// Os números de WhatsApp só valem depois de confirmados por mensagem recebida (06/11/2026):
//  · o número não se escreve: nem pela tabela de preferências, nem pela API; vem do webhook, com um código;
//  · o código é de uso único, expira, e quem se engana cinco vezes numa hora fica a aguardar;
//  · um número vale em uma conta de cada vez; até três por conta;
//  · «PARAR» e «Remover» tiram o número, e o consentimento sai com o último;
//  · cada pessoa vê só os seus números.

let db: PGlite;

const ANA = '00000000-0000-4000-8000-00000000f001';
const BRUNO = '00000000-0000-4000-8000-00000000f002';
const N1 = '+351912345678';
const N2 = '+351913345678';
const N3 = '+351914345678';
const N4 = '+351915345678';

async function as<T>(user: string, fn: () => Promise<T>): Promise<T> {
  await db.exec('set role authenticated');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user]);
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: user })]);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

/** A chave de serviço, como o webhook a usa: sem sessão de pessoa nenhuma. */
async function servico<T>(fn: () => Promise<T>): Promise<T> {
  await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  await db.query(`select set_config('request.jwt.claims', '{}', false)`);
  await db.exec('set role service_role');
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0]!;

const pedir = (user: string) => as(user, async () => (await one<{ c: string }>('select public.pedir_codigo_whatsapp() as c')).c);
const confirmar = (codigo: string, numero: string) =>
  servico(
    async () =>
      (await one<{ r: { estado: string; user_id?: string } }>('select public.confirmar_numero_whatsapp($1, $2) as r', [codigo, numero])).r,
  );
const numerosDe = async (user: string) =>
  (
    await db.query<{ numero: string }>('select numero from public.whatsapp_numeros where user_id = $1 order by confirmado_em, numero', [
      user,
    ])
  ).rows.map((r) => r.numero);
const preferencia = async (user: string) =>
  one<{ alerta_whatsapp: boolean; telemovel_whatsapp: string | null }>(
    'select alerta_whatsapp, telemovel_whatsapp from public.survey_availability where user_id = $1',
    [user],
  ).catch(() => null);

async function limpar() {
  await db.query('delete from public.whatsapp_numeros');
  await db.query('delete from public.whatsapp_codigos');
  await db.query('delete from public.whatsapp_tentativas');
  await db.query('delete from public.survey_availability where user_id in ($1, $2)', [ANA, BRUNO]);
}

beforeAll(async () => {
  db = await baseComMigracoes();
  await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [ANA, 'ana@teste.invalid', BRUNO, 'bruno@teste.invalid']);
}, 60_000);

describe('confirmar um número', () => {
  it('o código enviado do telemóvel liga o número à conta e liga os avisos', async () => {
    await limpar();
    const codigo = await pedir(ANA);
    expect(codigo).toMatch(/^QP-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(await confirmar(codigo, N1)).toEqual({ estado: 'ok', user_id: ANA });
    expect(await numerosDe(ANA)).toEqual([N1]);
    expect(await preferencia(ANA)).toEqual({ alerta_whatsapp: true, telemovel_whatsapp: N1 });
  });

  it('o código só se guarda em resumo, e escrito de outra maneira (minúsculas, sem traços) também serve', async () => {
    await limpar();
    const codigo = await pedir(ANA);
    const guardado = await one<{ codigo_hash: string }>('select codigo_hash from public.whatsapp_codigos where user_id = $1', [ANA]);
    expect(guardado.codigo_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(guardado.codigo_hash).not.toContain(codigo.slice(3, 7));
    expect((await confirmar(codigo.toLowerCase().replace(/-/g, ' '), N1)).estado).toBe('ok');
  });

  it('é de uso único', async () => {
    await limpar();
    const codigo = await pedir(ANA);
    expect((await confirmar(codigo, N1)).estado).toBe('ok');
    expect((await confirmar(codigo, N2)).estado).toBe('invalido');
    expect(await numerosDe(ANA)).toEqual([N1]);
  });

  it('um código caducado não vale', async () => {
    await limpar();
    const codigo = await pedir(ANA);
    await db.query(`update public.whatsapp_codigos set expira_em = now() - interval '1 minute' where user_id = $1`, [ANA]);
    expect((await confirmar(codigo, N1)).estado).toBe('invalido');
    expect(await numerosDe(ANA)).toEqual([]);
  });

  it('pedir outro código invalida o anterior', async () => {
    await limpar();
    const antigo = await pedir(ANA);
    const novo = await pedir(ANA);
    expect((await confirmar(antigo, N1)).estado).toBe('invalido');
    expect((await confirmar(novo, N1)).estado).toBe('ok');
  });

  it('quem se engana cinco vezes numa hora fica a aguardar, mesmo com o código certo', async () => {
    await limpar();
    const codigo = await pedir(ANA);
    for (let i = 0; i < 5; i++) expect((await confirmar('QP-0000-000' + i, N4)).estado).toBe('invalido');
    expect((await confirmar(codigo, N4)).estado).toBe('demasiadas');
    expect(await numerosDe(ANA)).toEqual([]);
    // Outro número não é afetado.
    expect((await confirmar(codigo, N1)).estado).toBe('ok');
  });

  it('o mesmo número outra vez, na mesma conta, não muda nada', async () => {
    await limpar();
    expect((await confirmar(await pedir(ANA), N1)).estado).toBe('ok');
    expect((await confirmar(await pedir(ANA), N1)).estado).toBe('ja_associado');
    expect(await numerosDe(ANA)).toEqual([N1]);
  });

  it('um número vale em uma conta de cada vez: quem prova que é seu fica com ele', async () => {
    await limpar();
    expect((await confirmar(await pedir(ANA), N1)).estado).toBe('ok');
    expect((await confirmar(await pedir(BRUNO), N1)).estado).toBe('transferido');
    expect(await numerosDe(ANA)).toEqual([]);
    expect(await numerosDe(BRUNO)).toEqual([N1]);
    // A conta que o perdeu fica sem número e sem consentimento.
    expect(await preferencia(ANA)).toEqual({ alerta_whatsapp: false, telemovel_whatsapp: null });
    expect(await preferencia(BRUNO)).toEqual({ alerta_whatsapp: true, telemovel_whatsapp: N1 });
  });

  it('até três números por conta', async () => {
    await limpar();
    for (const n of [N1, N2, N3]) expect((await confirmar(await pedir(ANA), n)).estado).toBe('ok');
    await expect(pedir(ANA)).rejects.toThrow(/Já tem 3 números/);
    expect(await numerosDe(ANA)).toEqual([N1, N2, N3]);
    // O número que as outras partes leem é o mais recente.
    expect((await preferencia(ANA))?.telemovel_whatsapp).toBe(N3);
  });
});

describe('desistir de um código', () => {
  it('cancelar torna o código inútil já, e só o da própria pessoa', async () => {
    await limpar();
    const codigo = await pedir(ANA);
    const outro = await pedir(BRUNO);
    await as(ANA, () => db.query('select public.cancelar_codigo_whatsapp()'));
    expect((await confirmar(codigo, N1)).estado).toBe('invalido');
    expect((await confirmar(outro, N2)).estado).toBe('ok');
  });

  it('pedir um código novo limpa os caducados de toda a gente', async () => {
    await limpar();
    await pedir(BRUNO);
    await db.query(`update public.whatsapp_codigos set expira_em = now() - interval '1 hour' where user_id = $1`, [BRUNO]);
    await pedir(ANA);
    expect((await one<{ n: number }>('select count(*)::int as n from public.whatsapp_codigos')).n).toBe(1);
  });
});

describe('tirar um número', () => {
  it('«PARAR» tira o número; o consentimento sai com o último', async () => {
    await limpar();
    await confirmar(await pedir(ANA), N1);
    await confirmar(await pedir(ANA), N2);
    expect(await servico(async () => (await one<{ r: boolean }>('select public.parar_whatsapp($1) as r', [N2])).r)).toBe(true);
    expect(await preferencia(ANA)).toEqual({ alerta_whatsapp: true, telemovel_whatsapp: N1 });
    expect(await servico(async () => (await one<{ r: boolean }>('select public.parar_whatsapp($1) as r', [N1])).r)).toBe(true);
    expect(await preferencia(ANA)).toEqual({ alerta_whatsapp: false, telemovel_whatsapp: null });
    expect(await servico(async () => (await one<{ r: boolean }>('select public.parar_whatsapp($1) as r', [N1])).r)).toBe(false);
  });

  it('a pessoa remove um número seu, e não o de outra', async () => {
    await limpar();
    await confirmar(await pedir(ANA), N1);
    await confirmar(await pedir(BRUNO), N2);
    const dele = await one<{ id: string }>('select id from public.whatsapp_numeros where user_id = $1', [BRUNO]);
    await as(ANA, () => db.query('select public.remover_numero_whatsapp($1)', [dele.id]));
    expect(await numerosDe(BRUNO)).toEqual([N2]);
    const meu = await one<{ id: string }>('select id from public.whatsapp_numeros where user_id = $1', [ANA]);
    await as(ANA, () => db.query('select public.remover_numero_whatsapp($1)', [meu.id]));
    expect(await numerosDe(ANA)).toEqual([]);
    expect(await preferencia(ANA)).toEqual({ alerta_whatsapp: false, telemovel_whatsapp: null });
  });
});

describe('o que a API não deixa fazer', () => {
  it('escrever o número direto nas preferências', async () => {
    await limpar();
    await expect(
      as(ANA, () => db.query(`insert into public.survey_availability (user_id, telemovel_whatsapp) values ($1, $2)`, [ANA, N1])),
    ).rejects.toThrow(/só se associa por mensagem/);
    await as(ANA, () => db.query(`insert into public.survey_availability (user_id) values ($1)`, [ANA]));
    await expect(
      as(ANA, () => db.query(`update public.survey_availability set telemovel_whatsapp = $2 where user_id = $1`, [ANA, N1])),
    ).rejects.toThrow(/só se associa por mensagem/);
    expect((await preferencia(ANA))?.telemovel_whatsapp).toBeNull();
  });

  it('as outras colunas continuam a ser da pessoa', async () => {
    await limpar();
    await as(ANA, () => db.query(`insert into public.survey_availability (user_id) values ($1)`, [ANA]));
    await as(ANA, () => db.query(`update public.survey_availability set alerta_email = false where user_id = $1`, [ANA]));
    expect(
      (await one<{ alerta_email: boolean }>('select alerta_email from public.survey_availability where user_id = $1', [ANA])).alerta_email,
    ).toBe(false);
  });

  it('escrever nas tabelas dos números, dos códigos ou das tentativas', async () => {
    await limpar();
    await expect(
      as(ANA, () => db.query(`insert into public.whatsapp_numeros (user_id, numero) values ($1, $2)`, [ANA, N1])),
    ).rejects.toThrow(/permission denied/);
    await expect(as(ANA, () => db.query('select * from public.whatsapp_codigos'))).rejects.toThrow(/permission denied/);
    await expect(as(ANA, () => db.query('select * from public.whatsapp_tentativas'))).rejects.toThrow(/permission denied/);
  });

  it('chamar as funções do webhook', async () => {
    await expect(as(ANA, () => db.query(`select public.confirmar_numero_whatsapp('QP-0000-0000', $1)`, [N1]))).rejects.toThrow(
      /permission denied/,
    );
    await expect(as(ANA, () => db.query('select public.parar_whatsapp($1)', [N1]))).rejects.toThrow(/permission denied/);
  });

  it('cada pessoa vê só os seus números', async () => {
    await limpar();
    await confirmar(await pedir(ANA), N1);
    await confirmar(await pedir(BRUNO), N2);
    const vistos = await as(ANA, () => db.query<{ numero: string }>('select numero from public.whatsapp_numeros'));
    expect(vistos.rows.map((r) => r.numero)).toEqual([N1]);
  });
});
