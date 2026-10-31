import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { baseComMigracoes } from './baseEmMemoria';

// A fila dos avisos por email. O que importa aqui não é o caminho felizizar: é o que acontece quando falha.
//
// Nota sobre o ambiente: nem `net` (pg_net) nem `vault` existem nesta base em memória. Isso é exactamente a
// condição que `private.pedir_envio_de_avisos` tem de aguentar sem fazer falhar nada — e por isso estes
// testes provam, de graça, que uma chamada HTTP indisponível não quebra a reserva nem a verificação dos
// prazos. Se um dia essa função deixar de engolir a falha, estes testes passam a vermelho.

let db: PGlite;

const U = '00000000-0000-4000-8000-0000000000a1';
const V = '00000000-0000-4000-8000-0000000000a2';
const ORG = '00000000-0000-4000-8000-0000000000b1';

async function avisoNaFila(texto: string, dono = U): Promise<string> {
  const r = await db.query<{ id: string }>(
    `with n as (
       insert into public.notifications (org_id, user_id, texto, link) values ($1, $2, $3, '/app/levantamentos')
       returning id
     )
     insert into public.avisos_por_email (notification_id, destinatario, assunto)
     select n.id, $2, 'Assunto de ensaio' from n returning id`,
    [ORG, dono, texto],
  );
  return r.rows[0]!.id;
}

const estadoDe = async (id: string) =>
  (
    await db.query<{ estado: string; tentativas: number; ultimo_erro: string | null; proxima_tentativa_em: Date }>(
      'select estado, tentativas, ultimo_erro, proxima_tentativa_em from public.avisos_por_email where id = $1',
      [id],
    )
  ).rows[0]!;

beforeAll(async () => {
  db = await baseComMigracoes();
  await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [
    U,
    'u1@teste.invalid',
    V,
    'u2@teste.invalid',
  ]);
  await db.query(
    `insert into public.organizations (id, kind, nome, created_by) values ($1, 'fornecedor', 'Tintas de Ensaio', $2)`,
    [ORG, U],
  );
}, 60_000);

describe('duplicados', () => {
  it('o mesmo aviso não entra na fila duas vezes', async () => {
    const r = await db.query<{ id: string }>(
      `insert into public.notifications (org_id, user_id, texto, link) values ($1, $2, 'Um aviso.', '/app') returning id`,
      [ORG, U],
    );
    const aviso = r.rows[0]!.id;
    await db.query(
      `insert into public.avisos_por_email (notification_id, destinatario, assunto) values ($1, $2, 'A')`,
      [aviso, U],
    );
    await expect(
      db.query(`insert into public.avisos_por_email (notification_id, destinatario, assunto) values ($1, $2, 'A')`, [
        aviso,
        U,
      ]),
    ).rejects.toThrow(/avisos_por_email_notification_id_key|duplicate key/);
  });
});

describe('reclamar e registar o resultado', () => {
  it('reclamar marca a linha e devolve o texto do aviso', async () => {
    const id = await avisoNaFila('Perdeu a reserva de um levantamento: falhou a primeira hora útil.');
    const linhas = (
      await db.query<{ id: string; texto: string; assunto: string }>('select * from private.reclamar_avisos(10)')
    ).rows;
    expect(linhas.map((l) => l.id)).toContain(id);
    expect(linhas.find((l) => l.id === id)!.texto).toMatch(/Perdeu a reserva/);
    expect((await estadoDe(id)).estado).toBe('a_enviar');
    expect((await estadoDe(id)).tentativas).toBe(1);
  });

  // Sobre concorrência, e o que este ficheiro pode e não pode provar: esta base em memória tem uma só
  // ligação, por isso duas transações **ao mesmo tempo** não são reproduzíveis aqui. O que se prova é o
  // mecanismo que as separa — `reclamar_avisos` escolhe com `for update skip locked` e muda o estado na
  // mesma instrução, por isso quem chegar a seguir vê `a_enviar` e salta a linha. O teste abaixo é a versão
  // sequencial disso: se a mudança de estado deixasse de ser atómica, falhava.
  it('uma linha reclamada não volta a ser reclamada', async () => {
    const id = await avisoNaFila('Aviso único.');
    await db.query('select * from private.reclamar_avisos(10)');
    const segunda = (await db.query<{ id: string }>('select * from private.reclamar_avisos(10)')).rows.map((l) => l.id);
    expect(segunda).not.toContain(id);
  });

  it('o sucesso fica registado com a hora', async () => {
    const id = await avisoNaFila('Aviso que vai sair.');
    await db.query('select * from private.reclamar_avisos(10)');
    await db.query('select private.resultado_do_aviso($1, true)', [id]);
    const r = (
      await db.query<{ estado: string; enviado_em: Date | null }>(
        'select estado, enviado_em from public.avisos_por_email where id = $1',
        [id],
      )
    ).rows[0]!;
    expect(r.estado).toBe('enviado');
    expect(r.enviado_em).not.toBeNull();
  });
});

describe('falha e repetição', () => {
  it('uma falha devolve a linha à fila, com recuo e a razão registada', async () => {
    const id = await avisoNaFila('Aviso que vai falhar.');
    await db.query('select * from private.reclamar_avisos(10)');
    await db.query('select private.resultado_do_aviso($1, false, $2)', [id, 'O serviço de correio recusou.']);
    const r = await estadoDe(id);
    expect(r.estado).toBe('pendente');
    expect(r.ultimo_erro).toBe('O serviço de correio recusou.');
    // Com recuo: não está pronta a sair outra vez já.
    expect(new Date(r.proxima_tentativa_em).getTime()).toBeGreaterThan(Date.now());
    expect((await db.query<{ id: string }>('select * from private.reclamar_avisos(10)')).rows.map((l) => l.id)).not.toContain(id);
  });

  it('à quinta tentativa desiste, e fica registada como falhada', async () => {
    const id = await avisoNaFila('Aviso teimoso.');
    for (let i = 0; i < 6; i += 1) {
      await db.query(`update public.avisos_por_email set proxima_tentativa_em = now() - interval '1 minute' where id = $1`, [id]);
      const reclamadas = (await db.query<{ id: string }>('select * from private.reclamar_avisos(10)')).rows.map((l) => l.id);
      if (!reclamadas.includes(id)) break;
      await db.query('select private.resultado_do_aviso($1, false, $2)', [id, 'falhou outra vez']);
    }
    expect((await estadoDe(id)).estado).toBe('falhou');
    // E não volta a ser tentada, mesmo com a hora já passada.
    await db.query(`update public.avisos_por_email set proxima_tentativa_em = now() - interval '1 hour' where id = $1`, [id]);
    expect((await db.query<{ id: string }>('select * from private.reclamar_avisos(10)')).rows.map((l) => l.id)).not.toContain(id);
  });

  it('quem morre a meio do envio volta à fila cinco minutos depois, e não antes', async () => {
    const id = await avisoNaFila('Aviso interrompido.');
    await db.query('select * from private.reclamar_avisos(10)');
    expect((await estadoDe(id)).estado).toBe('a_enviar');
    // Dois minutos depois ainda não: podia estar a sair neste instante.
    await db.query(`update public.avisos_por_email set ultima_tentativa_em = now() - interval '2 minutes' where id = $1`, [id]);
    await db.query('select * from private.reclamar_avisos(10)');
    expect((await estadoDe(id)).estado).toBe('a_enviar');
    // Seis minutos depois, sim.
    await db.query(`update public.avisos_por_email set ultima_tentativa_em = now() - interval '6 minutes' where id = $1`, [id]);
    const segunda = (await db.query<{ id: string }>('select * from private.reclamar_avisos(10)')).rows.map((l) => l.id);
    expect(segunda).toContain(id);
  });
});

describe('pertinência', () => {
  it('um aviso cujo dono mudou é dispensado em vez de enviado', async () => {
    // Fila com uma tentativa: o aviso é do U, mas a tentativa passa a ser do V.
    const req = (
      await db.query<{ id: string }>(
        `with p as (
           insert into public.buildings (org_id, nome_interno, tipo, morada, codigo_postal, localidade, concelho, created_by)
           values ($1, 'Prédio de ensaio', 'edificio_habitacao', 'Rua de Ensaio, 1', '1000-001', 'Lisboa', 'Lisboa', $2) returning id
         )
         insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, created_by)
         select $1, p.id, 'Obra de ensaio', 'fachadas', '', $2 from p returning id`,
        [ORG, U],
      )
    ).rows[0]!.id;
    // O levantamento nasce com o pedido, por gatilho (migração levantamento_automatico): não se insere.
    const survey = (
      await db.query<{ id: string }>('select id from public.request_surveys where request_id = $1', [req])
    ).rows[0]!.id;
    const tentativa = (
      await db.query<{ id: string }>(
        `insert into public.survey_attempts (survey_id, numero, vendedor_org_id, vendedor_user_id,
           prazo_contacto, prazo_conclusao, limite_adiamento)
         values ($1, 1, $2, $3, now(), now() + interval '48 hours', now() + interval '7 days') returning id`,
        [survey, ORG, V],
      )
    ).rows[0]!.id;
    const aviso = (
      await db.query<{ id: string }>(
        `with n as (
           insert into public.notifications (org_id, user_id, texto, link) values ($1, $2, 'Aviso trocado.', '/app')
           returning id
         )
         insert into public.avisos_por_email (notification_id, attempt_id, destinatario, assunto)
         select n.id, $3, $2, 'Assunto' from n returning id`,
        [ORG, U, tentativa],
      )
    ).rows[0]!.id;
    // O destinatário é o U, mas a tentativa é do V: deixou de ser pertinente.
    expect((await db.query<{ p: boolean }>('select private.aviso_pertinente($1) as p', [aviso])).rows[0]!.p).toBe(false);
    const reclamadas = (await db.query<{ id: string }>('select * from private.reclamar_avisos(10)')).rows.map((l) => l.id);
    expect(reclamadas).not.toContain(aviso);
    expect((await estadoDe(aviso)).estado).toBe('dispensado');
  });
});

describe('a chamada à aplicação não pode quebrar nada', () => {
  it('pedir o envio sem pg_net nem Vault não dá erro', async () => {
    await expect(db.query('select private.pedir_envio_de_avisos()')).resolves.toBeTruthy();
  });

  it('a verificação dos prazos corre inteira mesmo sem a chamada disponível', async () => {
    await avisoNaFila('Aviso à espera, para a verificação tentar pedir o envio.');
    await expect(db.query('select private.vencimentos_de_levantamentos()')).resolves.toBeTruthy();
  });

  it('escrever um aviso com email sem pg_net disponível guarda o aviso e a fila', async () => {
    await db.query('select private.notify_user_por_email($1, $2, $3, $4, $5)', [
      U,
      ORG,
      'Aviso escrito pela função completa.',
      '/app/levantamentos',
      'Assunto do aviso',
    ]);
    const n = (
      await db.query<{ c: number }>(`select count(*)::int as c from public.notifications where texto = $1`, [
        'Aviso escrito pela função completa.',
      ])
    ).rows[0]!.c;
    expect(n).toBe(1);
    const f = (
      await db.query<{ c: number }>(
        `select count(*)::int as c from public.avisos_por_email f join public.notifications n on n.id = f.notification_id where n.texto = $1`,
        ['Aviso escrito pela função completa.'],
      )
    ).rows[0]!.c;
    expect(f).toBe(1);
  });
});

describe('a fila é invisível a quem tem sessão', () => {
  it('nem ler, nem escrever', async () => {
    // Pelos privilégios, que é o que vale: um `set role` num teste é fácil de esquecer de reverter, e um
    // privilégio concedido por omissão passaria por baixo dele sem se ver.
    const r = (
      await db.query<{ priv: string; pode: boolean }>(
        `select unnest(array['select','insert','update','delete']) as priv,
                unnest(array[
                  has_table_privilege('authenticated', 'public.avisos_por_email', 'select'),
                  has_table_privilege('authenticated', 'public.avisos_por_email', 'insert'),
                  has_table_privilege('authenticated', 'public.avisos_por_email', 'update'),
                  has_table_privilege('authenticated', 'public.avisos_por_email', 'delete')
                ]) as pode`,
      )
    ).rows;
    expect(r.every((x) => x.pode === false)).toBe(true);
    const anon = (
      await db.query<{ pode: boolean }>(
        `select has_table_privilege('anon', 'public.avisos_por_email', 'select') as pode`,
      )
    ).rows[0]!.pode;
    expect(anon).toBe(false);
  });

  it('as portas públicas estão abertas só à chave de serviço', async () => {
    const r = (
      await db.query<{ papel: string; pode: boolean }>(
        `select unnest(array['anon','authenticated','service_role']) as papel,
                unnest(array[
                  has_function_privilege('anon', 'public.reclamar_avisos(int)', 'execute'),
                  has_function_privilege('authenticated', 'public.reclamar_avisos(int)', 'execute'),
                  has_function_privilege('service_role', 'public.reclamar_avisos(int)', 'execute')
                ]) as pode`,
      )
    ).rows;
    expect(r).toEqual([
      { papel: 'anon', pode: false },
      { papel: 'authenticated', pode: false },
      { papel: 'service_role', pode: true },
    ]);
  });
});
