import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { baseComMigracoes } from './baseEmMemoria';

// Elementos do contrato e comprovativos de pagamento (06/11/2026, migração `elementos_e_comprovativos`):
// - só o servidor escreve (chave de serviço); nenhum utilizador escreve diretamente;
// - os elementos só se acrescentam depois da apresentação e antes da primeira assinatura, e só com a
//   minuta nova; os comprovativos só depois das duas assinaturas;
// - nada se reescreve nem se apaga, nem pela chave de serviço;
// - as duas partes e a equipa leem; mais ninguém.

let db: PGlite;
const CLIENTE = '00000000-0000-4000-8000-00000000c101';
const PINTOR = '00000000-0000-4000-8000-00000000c102';
const ESTRANHO = '00000000-0000-4000-8000-00000000c103';
const EQUIPA = '00000000-0000-4000-8000-00000000c104';
const IBAN = 'PT50000201231234567890154';

async function as<T>(user: string, fn: () => Promise<T>): Promise<T> {
  await db.exec('set role authenticated');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user]);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}
async function servico<T>(fn: () => Promise<T>): Promise<T> {
  await db.exec('set role service_role');
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}
const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0]!;

/** Uma contratação mínima, criada como dono da base (fora das regras de acesso, só para o ensaio). */
let c: string;
let p: string;
/** As duas entidades do ensaio, uma vez (uma conta de pintor só tem uma empresa). */
async function entidades() {
  const sub = (u: string) => db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [u]);
  await sub(CLIENTE);
  c = (await one<{ id: string }>(`insert into public.organizations (kind, nome, created_by) values ('condominio', 'zz-test Condomínio', $1) returning id`, [CLIENTE])).id;
  await sub(PINTOR);
  p = (await one<{ id: string }>(`insert into public.organizations (kind, nome, created_by) values ('pintor', 'zz-test Pinturas', $1) returning id`, [PINTOR])).id;
  await db.query(
    `insert into public.org_members (org_id, user_id, role) values ($1, $2, 'proprietario'), ($3, $4, 'proprietario') on conflict do nothing`,
    [c, CLIENTE, p, PINTOR],
  );
  await sub(CLIENTE);
}

/** Uma contratação mínima, criada como dono da base (fora das regras de acesso, só para o ensaio). */
async function contratacao(minuta: string | null, garantia: number | null = null): Promise<string> {
  const b = (await one<{ id: string }>(
    `insert into public.buildings (org_id, nome_interno, tipo, morada, codigo_postal, localidade, concelho)
     values ($1, 'zz-test', 'edificio_habitacao', 'Rua A, 1', '1000-001', 'Lisboa', 'Lisboa') returning id`,
    [c],
  )).id;
  const r = (await one<{ id: string }>(`insert into public.work_requests (org_id, building_id, titulo, tipo_obra) values ($1, $2, 'zz-test', 'fachadas') returning id`, [c, b])).id;
  const pr = (await one<{ id: string }>(`insert into public.proposals (request_id, painter_org_id, garantia_anos) values ($1, $2, $3) returning id`, [r, p, garantia])).id;
  return (
    await one<{ id: string }>(
      `insert into public.engagements (proposal_id, request_id, client_org_id, painter_org_id, base_cents, advance_cents, rules_version, minuta_versao)
       values ($1, $2, $3, $4, 100000, 0, '2026-10-19', $5) returning id`,
      [pr, r, c, p, minuta],
    )
  ).id;
}
const evento = async (engagement: string, kind: string) => {
  // Fora dos gatilhos (a assinatura real só entra com o registo verificado do servidor): é só o estado do ensaio.
  await db.exec(`set session_replication_role = replica`);
  try {
    await db.query(`insert into public.engagement_events (engagement_id, kind) values ($1, $2)`, [engagement, kind]);
  } finally {
    await db.exec(`set session_replication_role = origin`);
  }
};
const elemento = (engagement: string, lado = 'pintor', campo = 'iban', valor = IBAN, validacao = 'sem_validacao', por = PINTOR) =>
  servico(() =>
    db.query(
      `insert into public.elementos_do_contrato (engagement_id, lado, campo, valor, validacao, criado_por) values ($1, $2, $3, $4, $5, $6) returning id`,
      [engagement, lado, campo, valor, validacao, por],
    ),
  );
const comprovativo = (engagement: string) =>
  servico(() =>
    db.query(
      `insert into public.comprovativos_de_pagamento (engagement_id, tranche, valor_cents, pago_em, criado_por) values ($1, 'Adiantamento', 30000, current_date, $2) returning id`,
      [engagement, CLIENTE],
    ),
  );

let aberta: string;
let semMinuta: string;

beforeAll(async () => {
  db = await baseComMigracoes();
  await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4), ($5, $6), ($7, $8)', [
    CLIENTE, 'cliente@teste.invalid', PINTOR, 'pintor@teste.invalid', ESTRANHO, 'estranho@teste.invalid', EQUIPA, 'equipa@teste.invalid',
  ]);
  await db.query('insert into public.platform_admins (user_id) values ($1)', [EQUIPA]);
  await entidades();
  aberta = await contratacao('2026-11-06');
  semMinuta = await contratacao(null);
}, 120_000);

describe('elementos do contrato', () => {
  it('antes da apresentação não se regista nada (regra 6)', async () => {
    await expect(elemento(aberta)).rejects.toThrow(/apresentação/);
  });

  it('depois da apresentação, o servidor regista; a data é a da base', async () => {
    await evento(aberta, 'fee_recebido');
    await elemento(aberta);
    await elemento(aberta, 'cliente', 'email', 'condominio@exemplo.pt', 'codigo', CLIENTE);
    const n = await one<{ n: number }>('select count(*)::int as n from public.elementos_do_contrato where engagement_id = $1', [aberta]);
    expect(n.n).toBe(2);
  });

  it('as contratações anteriores à minuta nova não recebem elementos', async () => {
    await evento(semMinuta, 'fee_recebido');
    await expect(elemento(semMinuta)).rejects.toThrow(/apresentação|assinatura/);
  });

  it('nenhum utilizador escreve diretamente, nem do seu lado', async () => {
    await expect(
      as(PINTOR, () =>
        db.query(`insert into public.elementos_do_contrato (engagement_id, lado, campo, valor, validacao, criado_por) values ($1, 'pintor', 'iban', $2, 'sem_validacao', $3)`, [aberta, IBAN, PINTOR]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it('a base recusa um IBAN mal formado e um email sem confirmação', async () => {
    await expect(elemento(aberta, 'pintor', 'iban', 'PT5012')).rejects.toThrow(/elementos_iban/);
    await expect(elemento(aberta, 'cliente', 'email', 'a@b.pt', 'sem_validacao', CLIENTE)).rejects.toThrow(/elementos_email/);
    await expect(elemento(aberta, 'pintor', 'telefone', '912345678', 'codigo')).rejects.toThrow(/elementos_validacao/);
  });

  it('nada se reescreve nem se apaga — nem pela chave de serviço', async () => {
    await expect(servico(() => db.query(`update public.elementos_do_contrato set valor = 'x' where engagement_id = $1`, [aberta]))).rejects.toThrow(/só de acrescentar/);
    await expect(servico(() => db.query(`delete from public.elementos_do_contrato where engagement_id = $1`, [aberta]))).rejects.toThrow(/só de acrescentar/);
  });

  it('as duas partes e a equipa leem; um estranho não', async () => {
    const ler = (u: string) => as(u, async () => (await db.query('select id from public.elementos_do_contrato where engagement_id = $1', [aberta])).rows.length);
    expect(await ler(CLIENTE)).toBe(2);
    expect(await ler(PINTOR)).toBe(2);
    expect(await ler(EQUIPA)).toBe(2);
    expect(await ler(ESTRANHO)).toBe(0);
  });

  it('os códigos de email não se leem pela API, nem do próprio', async () => {
    await expect(as(CLIENTE, () => db.query('select * from public.codigos_de_email'))).rejects.toThrow(/permission denied/);
  });

  it('depois da primeira assinatura, fecha: só por adenda, fora da plataforma', async () => {
    await evento(aberta, 'cliente_assinou');
    await expect(elemento(aberta, 'pintor', 'telefone', '912345678')).rejects.toThrow(/assinatura/);
  });
});

describe('comprovativos de pagamento', () => {
  it('só depois das duas assinaturas', async () => {
    await expect(comprovativo(aberta)).rejects.toThrow(/assinado pelas duas partes/);
    await evento(aberta, 'pintor_assinou');
    await comprovativo(aberta);
  });

  it('nenhum utilizador escreve diretamente; nada se reescreve nem se apaga', async () => {
    await expect(
      as(CLIENTE, () =>
        db.query(`insert into public.comprovativos_de_pagamento (engagement_id, tranche, valor_cents, pago_em, criado_por) values ($1, 'x', 1, current_date, $2)`, [aberta, CLIENTE]),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(servico(() => db.query(`update public.comprovativos_de_pagamento set valor_cents = 1 where engagement_id = $1`, [aberta]))).rejects.toThrow(/só de acrescentar/);
    await expect(servico(() => db.query(`delete from public.comprovativos_de_pagamento where engagement_id = $1`, [aberta]))).rejects.toThrow(/só de acrescentar/);
  });

  it('o ficheiro, quando há, vive na pasta da contratação e traz o resumo', async () => {
    await expect(
      servico(() =>
        db.query(
          `insert into public.comprovativos_de_pagamento (engagement_id, tranche, valor_cents, pago_em, ficheiro_path, criado_por) values ($1, 'x', 1, current_date, $2, $3)`,
          [aberta, `${aberta}/a.pdf`, CLIENTE],
        ),
      ),
    ).rejects.toThrow(/comprovativos_ficheiro/);
    await expect(
      servico(() =>
        db.query(
          `insert into public.comprovativos_de_pagamento (engagement_id, tranche, valor_cents, pago_em, ficheiro_path, ficheiro_sha256, criado_por) values ($1, 'x', 1, current_date, 'outra/a.pdf', $2, $3)`,
          [aberta, 'a'.repeat(64), CLIENTE],
        ),
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it('as partes e a equipa leem; um estranho não', async () => {
    const ler = (u: string) => as(u, async () => (await db.query('select id from public.comprovativos_de_pagamento')).rows.length);
    expect(await ler(CLIENTE)).toBe(1);
    expect(await ler(PINTOR)).toBe(1);
    expect(await ler(EQUIPA)).toBe(1);
    expect(await ler(ESTRANHO)).toBe(0);
  });

  it('a contratação não se apaga com registos destes agarrados', async () => {
    await expect(db.query('delete from public.engagements where id = $1', [aberta])).rejects.toThrow(/foreign key|violates/);
  });
});

describe('conclusão da obra e garantia (06/11/2026)', () => {
  const passo = (engagement: string, lado: string, p: string, data: string | null, razao: string | null = null) =>
    servico(() =>
      db.query(
        `insert into public.conclusao_da_obra (engagement_id, lado, passo, data_conclusao, razao, criado_por) values ($1, $2, $3, $4, $5, $6)`,
        [engagement, lado, p, data, razao, lado === 'cliente' ? CLIENTE : PINTOR],
      ),
    );

  it('a contratação nova guarda os anos de garantia da proposta escolhida; as antigas não', async () => {
    const anos = async (id: string) => (await one<{ garantia_anos: number | null }>('select garantia_anos from public.engagements where id = $1', [id])).garantia_anos;
    expect(await anos(await contratacao('2026-11-06', 2))).toBe(2);
    expect(await anos(await contratacao(null, 2))).toBeNull();
  });

  it('antes do contrato celebrado não se regista', async () => {
    const outra = await contratacao('2026-11-06');
    await expect(passo(outra, 'pintor', 'declarou', '2026-11-01')).rejects.toThrow(/assinado pelas duas partes/);
  });

  it('declarar exige a data (não futura); discordar exige a razão; nada se reescreve', async () => {
    await expect(passo(aberta, 'pintor', 'declarou', null)).rejects.toThrow(/conclusao_declarou_tem_data/);
    await expect(passo(aberta, 'pintor', 'declarou', '2999-01-01')).rejects.toThrow(/futura/);
    await expect(passo(aberta, 'cliente', 'discordou', null)).rejects.toThrow(/conclusao_discordou_tem_razao/);
    await passo(aberta, 'pintor', 'declarou', '2026-11-01');
    await passo(aberta, 'cliente', 'confirmou', null);
    await expect(servico(() => db.query('delete from public.conclusao_da_obra where engagement_id = $1', [aberta]))).rejects.toThrow(/só de acrescentar/);
    await expect(as(CLIENTE, () => db.query(`insert into public.conclusao_da_obra (engagement_id, lado, passo, criado_por) values ($1, 'cliente', 'confirmou', $2)`, [aberta, CLIENTE]))).rejects.toThrow(/permission denied/);
  });

  it('a garantia calculada guarda as duas datas e a data do cálculo; não se reescreve', async () => {
    await servico(() =>
      db.query(`insert into public.garantias_calculadas (engagement_id, inicio, anos, fim_garantia, fim_conservacao, calculado_em) values ($1, '2026-11-01', 2, '2028-11-01', '2030-11-01', '2000-01-01')`, [aberta]),
    );
    const g = await one<{ calculado_em: string }>('select calculado_em from public.garantias_calculadas where engagement_id = $1', [aberta]);
    expect(new Date(g.calculado_em).getUTCFullYear()).toBeGreaterThan(2000);
    await expect(servico(() => db.query('update public.garantias_calculadas set anos = 9 where engagement_id = $1', [aberta]))).rejects.toThrow(/só de acrescentar/);
    expect(await as(ESTRANHO, async () => (await db.query('select id from public.garantias_calculadas')).rows.length)).toBe(0);
    expect(await as(CLIENTE, async () => (await db.query('select id from public.garantias_calculadas')).rows.length)).toBe(1);
  });
});

describe('registo do percurso negocial (06/11/2026)', () => {
  const tipos = async (filtro: string, v: unknown) =>
    (await db.query<{ tipo: string }>(`select tipo from public.registo_da_obra where ${filtro} = $1 order by ordem`, [v])).rows.map((r) => r.tipo);

  it('cada passo fica registado, por ordem, com a data do servidor', async () => {
    // Os acontecimentos do ensaio entraram com os gatilhos desligados (ver `evento`); este entra com eles.
    const nova = await contratacao('2026-11-06');
    await db.query(`insert into public.engagement_events (engagement_id, kind, amount_cents) values ($1, 'deposito_confirmado', 3000)`, [nova]);
    expect(await tipos('engagement_id', nova)).toEqual(['contratacao_criada', 'contratacao_evento']);
    const t = await tipos('engagement_id', aberta);
    expect(t).toEqual(expect.arrayContaining(['contratacao_criada', 'elemento_alterado', 'comprovativo', 'conclusao', 'garantia']));
    expect(await tipos('org_id', c)).toContain('conta_aberta');
  });

  it('o IBAN vai mascarado para o registo', async () => {
    const r = await db.query<{ v: string }>(`select dados->>'valor' as v from public.registo_da_obra where tipo = 'elemento_alterado' and dados->>'campo' = 'iban'`);
    expect(r.rows.length).toBeGreaterThan(0);
    for (const x of r.rows) expect(x.v).not.toContain('0002012312345678');
  });

  it('ninguém o reescreve nem o apaga, nem a chave de serviço; ninguém escreve nele diretamente', async () => {
    await expect(servico(() => db.query(`update public.registo_da_obra set tipo = 'outro' where engagement_id = $1`, [aberta]))).rejects.toThrow(/só de acrescentar/);
    await expect(servico(() => db.query(`delete from public.registo_da_obra where engagement_id = $1`, [aberta]))).rejects.toThrow(/só de acrescentar/);
    await expect(as(CLIENTE, () => db.query(`insert into public.registo_da_obra (tipo) values ('inventado')`))).rejects.toThrow(/permission denied/);
  });

  it('só a equipa o lê', async () => {
    expect(await as(CLIENTE, async () => (await db.query('select id from public.registo_da_obra')).rows.length)).toBe(0);
    expect(await as(EQUIPA, async () => (await db.query('select id from public.registo_da_obra')).rows.length)).toBeGreaterThan(0);
  });

  it('apagar um pedido em rascunho com propostas não apaga o rasto: o essencial fica copiado', async () => {
    const b = (await one<{ id: string }>('select building_id as id from public.work_requests where org_id = $1 limit 1', [c])).id;
    const r = (await one<{ id: string }>(`insert into public.work_requests (org_id, building_id, titulo, tipo_obra) values ($1, $2, 'zz-test a apagar', 'fachadas') returning id`, [c, b])).id;
    await db.exec(`set session_replication_role = replica`);
    await db.query(`insert into public.proposals (request_id, painter_org_id, status, base_cents) values ($1, $2, 'submetida', 50000)`, [r, p]);
    await db.exec(`set session_replication_role = origin`);
    await db.query('delete from public.work_requests where id = $1', [r]);
    expect(await one<{ n: number }>('select count(*)::int as n from public.work_requests where id = $1', [r])).toEqual({ n: 0 });
    const t = await tipos('request_id', r);
    expect(t[0]).toBe('pedido_criado');
    expect(t).toContain('pedido_apagado');
    expect(t).toContain('proposta_apagada');
    const copia = await one<{ base: string }>(`select dados->>'base_cents' as base from public.registo_da_obra where request_id = $1 and tipo = 'proposta_apagada'`, [r]);
    expect(copia.base).toBe('50000');
  });

  it('o relatório pede-o quem gere a entidade cliente do pedido; outro não', async () => {
    const r = (await one<{ request_id: string }>('select request_id from public.engagements where id = $1', [aberta])).request_id;
    await as(CLIENTE, () => db.query(`insert into public.pedidos_de_relatorio (request_id, org_id, motivo) values ($1, $2, 'litigio')`, [r, c]));
    await expect(as(PINTOR, () => db.query(`insert into public.pedidos_de_relatorio (request_id, org_id, motivo) values ($1, $2, 'litigio')`, [r, c]))).rejects.toThrow(/row-level security/);
    await expect(as(PINTOR, () => db.query(`insert into public.pedidos_de_relatorio (request_id, org_id, motivo) values ($1, $2, 'litigio')`, [r, p]))).rejects.toThrow(/entidade que fez o pedido|row-level/);
    expect(await tipos('request_id', r)).toContain('relatorio_pedido');
  });

  it('o relatório emitido não muda; o do cliente só o lê a entidade que o pediu e a equipa', async () => {
    const r = (await one<{ request_id: string }>('select request_id from public.engagements where id = $1', [aberta])).request_id;
    const pedido = (await one<{ id: string }>('select id from public.pedidos_de_relatorio where request_id = $1', [r])).id;
    await servico(() =>
      db.query(
        `insert into public.relatorios_do_percurso (request_id, pedido_id, destinatario, versao, conteudo, sha256, emitido_por) values ($1, $2, 'cliente', 1, 'texto', $3, $4),
                ($1, null, 'backoffice', 1, 'texto completo', $3, $4)`,
        [r, pedido, 'b'.repeat(64), EQUIPA],
      ),
    );
    await expect(servico(() => db.query(`update public.relatorios_do_percurso set conteudo = 'outro' where request_id = $1`, [r]))).rejects.toThrow(/só de acrescentar/);
    await expect(
      servico(() => db.query(`insert into public.relatorios_do_percurso (request_id, destinatario, versao, conteudo, sha256, emitido_por) values ($1, 'cliente', 2, 'x', $2, $3)`, [r, 'b'.repeat(64), EQUIPA])),
    ).rejects.toThrow(/cliente_tem_pedido/);
    const ler = (u: string) => as(u, async () => (await db.query<{ destinatario: string }>('select destinatario from public.relatorios_do_percurso where request_id = $1', [r])).rows.map((x) => x.destinatario));
    expect(await ler(CLIENTE)).toEqual(['cliente']);
    expect(await ler(PINTOR)).toEqual([]);
    expect((await ler(EQUIPA)).sort()).toEqual(['backoffice', 'cliente']);
    expect(await tipos('request_id', r)).toEqual(expect.arrayContaining(['relatorio_emitido', 'relatorio_entregue']));
  });
});
