import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { baseComMigracoes } from './baseEmMemoria';

// Condóminos com acesso a um prédio (migração `condominos_do_predio`, 01/11/2026).
//
// O que se prova aqui: o condómino vê o seu prédio e o pedido publicado nele, e nada do resto da
// administradora; vê as propostas só depois da abertura simultânea, como o cliente; vota uma vez,
// pode mudar o voto, e não vota antes da abertura nem depois da escolha; não lê os descontos dos
// fornecedores. E a entrada pelo código: anónimo vê o prédio e regista-se; a linha liga-se ao
// utilizador pelo email na primeira sessão.

const GESTOR = '00000000-0000-4000-8000-00000000c001';
const PINTOR = '00000000-0000-4000-8000-00000000c002';
const ANA = '00000000-0000-4000-8000-00000000c0a1'; // condómina do prédio 1
const RUI = '00000000-0000-4000-8000-00000000c0a2'; // condómino do prédio 1
const ZE = '00000000-0000-4000-8000-00000000c0a3'; // condómino de OUTRO prédio da mesma gestora
const PINTOR2 = '00000000-0000-4000-8000-00000000c003';
const FORN = '00000000-0000-4000-8000-00000000c0f0';
const OUTRO = '00000000-0000-4000-8000-00000000c0b0'; // particular sem relação

const email = (u: string) => `c${u.slice(-2)}@teste.invalid`;

let db: PGlite;
let adminOrg: string;
let condo1: string;
let condo2: string;
let predio1: string;
let predio2: string;
let pedido1: string;
let pedido2: string;
let pintorOrg: string;
let pintorOrg2: string;
let prop1: string;
let prop2: string;

async function as<T>(user: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(user ? 'set role authenticated' : 'set role anon');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user ?? '']);
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [
    user ? JSON.stringify({ sub: user, email: email(user) }) : '',
  ]);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}
const one = async <T>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0]!;
const rows = async (sql: string, params: unknown[] = []) => (await db.query(sql, params)).rows;

async function predio(org: string, nome: string) {
  return (
    await one<{ id: string }>(
      `insert into public.buildings (org_id, nome_interno, tipo, morada, codigo_postal, localidade, concelho)
       values ($1, $2, 'edificio_habitacao', $2, '1000-001', 'Lisboa', 'Lisboa') returning id`,
      [org, nome],
    )
  ).id;
}

async function pedidoPublicado(org: string, building: string, titulo: string) {
  const id = (
    await as(GESTOR, () =>
      one<{ id: string }>(
        `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, prazo_propostas)
         values ($1, $2, $3, 'fachadas', 'Pintura das fachadas, com fissuras a reparar e tetos.', current_date + 10) returning id`,
        [org, building, titulo],
      ),
    )
  ).id;
  await as(GESTOR, () =>
    db.query(
      `insert into public.request_surfaces (request_id, kind, largura_cm, altura_cm, vaos_cm2) values ($1, 'fachada', 1200, 1550, 2450)`,
      [id],
    ),
  );
  await as(GESTOR, () => db.query(`update public.work_requests set status = 'publicado' where id = $1`, [id]));
  return id;
}

async function proposta(request: string, user = PINTOR, org = pintorOrg) {
  const id = (
    await as(user, () =>
      one<{ id: string }>(
        `insert into public.proposals (request_id, painter_org_id, validade, duracao_dias) values ($1, $2, current_date + 30, 20) returning id`,
        [request, org],
      ),
    )
  ).id;
  await as(user, () =>
    db.query(
      `insert into public.proposal_lines (proposal_id, categoria, descricao, superficie, quantidade, preco_unitario_cents, inclusao) values ($1, 'pintura', 'Pintura', 'fachada', 16150, 850, 'incluido')`,
      [id],
    ),
  );
  await as(user, () =>
    db.query(
      `update public.proposals set confirma_mao_obra = true, seguro_rc = 'sim', seguro_at = 'nao',
         fases = '[{"nome":"No início","bps":3000},{"nome":"No fim","bps":7000}]'::jsonb where id = $1`,
      [id],
    ),
  );
  await as(user, () => db.query(`update public.proposals set status = 'submetida' where id = $1`, [id]));
  return id;
}

beforeAll(async () => {
  db = await baseComMigracoes();
  for (const u of [GESTOR, PINTOR, PINTOR2, ANA, RUI, ZE, FORN, OUTRO]) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [u, email(u)]);
  }
  adminOrg = (
    await as(GESTOR, () =>
      one<{ id: string }>(`insert into public.organizations (kind, nome, nif) values ('administradora', 'Gestora C', '500000000') returning id`),
    )
  ).id;
  condo1 = (
    await as(GESTOR, () =>
      one<{ id: string }>(
        `insert into public.organizations (kind, nome, nif, gerida_por) values ('condominio', 'Condomínio Um', '901000000', $1) returning id`,
        [adminOrg],
      ),
    )
  ).id;
  condo2 = (
    await as(GESTOR, () =>
      one<{ id: string }>(
        `insert into public.organizations (kind, nome, nif, gerida_por) values ('condominio', 'Condomínio Dois', '901000019', $1) returning id`,
        [adminOrg],
      ),
    )
  ).id;
  predio1 = await predio(condo1, 'Rua Um, 1');
  predio2 = await predio(condo2, 'Rua Dois, 2');
  pintorOrg = (
    await as(PINTOR, () =>
      one<{ id: string }>(`insert into public.organizations (kind, nome, nif) values ('pintor', 'Pinturas C', '501964843') returning id`),
    )
  ).id;
  pintorOrg2 = (
    await as(PINTOR2, () =>
      one<{ id: string }>(`insert into public.organizations (kind, nome, nif) values ('pintor', 'Pinturas D', '502011378') returning id`),
    )
  ).id;
  await as(FORN, () =>
    db.query(`insert into public.organizations (kind, nome, nif) values ('fornecedor', 'Tintas C', '599999993')`),
  );
  pedido1 = await pedidoPublicado(condo1, predio1, 'Fachadas do Um');
  pedido2 = await pedidoPublicado(condo2, predio2, 'Fachadas do Dois');
  prop1 = await proposta(pedido1);
  prop2 = await proposta(pedido1, PINTOR2, pintorOrg2);
}, 300_000);

describe('entrada pelo código do prédio', () => {
  it('o gestor cria o código; um anónimo vê o prédio por ele, e nada mais', async () => {
    await as(GESTOR, () =>
      db.query(`insert into public.building_access_codes (building_id, org_id, codigo, created_by) values ($1, $2, 'abc123def4', $3)`, [
        predio1,
        condo1,
        GESTOR,
      ]),
    );
    const p = await as(null, () => one<{ nome_interno: string; condominio: string }>(`select * from public.predio_por_codigo('ABC123DEF4')`));
    expect(p).toMatchObject({ nome_interno: 'Rua Um, 1', condominio: 'Condomínio Um' });
    expect(await as(null, () => rows(`select * from public.predio_por_codigo('nao-existe')`))).toEqual([]);
    await expect(as(null, () => rows('select * from public.buildings'))).rejects.toThrow(/permission denied/);
  });

  it('o anónimo regista-se com fração, andar, email e telemóvel; sem telemóvel é recusado', async () => {
    await expect(
      as(null, () => db.query(`select public.registar_condomino('abc123def4', '3.º Esq', '3', $1, '', 'Ana')`, [email(ANA)])),
    ).rejects.toThrow(/telemóvel/);
    await as(null, () =>
      db.query(`select public.registar_condomino('abc123def4', '3.º Esq', '3', $1, '912345678', 'Ana')`, [email(ANA).toUpperCase()]),
    );
    const r = await one<{ user_id: string | null; email: string }>('select user_id, email from public.building_residents where fracao = $1', ['3.º Esq']);
    expect(r.user_id).toBeNull();
    expect(r.email).toBe(email(ANA));
  });

  it('na primeira sessão a linha liga-se pelo email; o condómino vê só a sua', async () => {
    expect((await as(ANA, () => one<{ n: number }>('select public.reclamar_acesso_de_condomino() n'))).n).toBe(1);
    expect((await as(ANA, () => one<{ n: number }>('select public.reclamar_acesso_de_condomino() n'))).n).toBe(0);
    const mine = await as(ANA, () => rows('select fracao from public.building_residents'));
    expect(mine).toEqual([{ fracao: '3.º Esq' }]);
  });

  it('o gestor regista um condómino à mão, com permilagem; o registo pelo código não a apaga', async () => {
    await as(GESTOR, () =>
      db.query(
        `insert into public.building_residents (building_id, org_id, email, fracao, andar, permilagem, created_by) values ($1, $2, $3, '1.º Dto', '1', 180, $4)`,
        [predio1, condo1, email(RUI), GESTOR],
      ),
    );
    await as(null, () => db.query(`select public.registar_condomino('abc123def4', '1.º Dto', '1', $1, '913333333', 'Rui')`, [email(RUI)]));
    const r = await one<{ permilagem: number; telemovel: string }>('select permilagem, telemovel from public.building_residents where fracao = $1', ['1.º Dto']);
    expect(r).toEqual({ permilagem: 180, telemovel: '913333333' });
    await as(RUI, () => db.query('select public.reclamar_acesso_de_condomino()'));
    // Zé é de outro prédio da mesma gestora.
    await as(GESTOR, () =>
      db.query(`insert into public.building_residents (building_id, org_id, email, fracao, created_by) values ($1, $2, $3, 'R/C', $4)`, [
        predio2,
        condo2,
        email(ZE),
        GESTOR,
      ]),
    );
    await as(ZE, () => db.query('select public.reclamar_acesso_de_condomino()'));
  });

  it('o gestor não regista um condómino num prédio que não gere', async () => {
    const outraOrg = (
      await as(OUTRO, () =>
        one<{ id: string }>(`insert into public.organizations (kind, nome, nif) values ('particular', 'Outro', '123456789') returning id`),
      )
    ).id;
    const outroPredio = await predio(outraOrg, 'Rua Alheia');
    await expect(
      as(GESTOR, () =>
        db.query(`insert into public.building_residents (building_id, org_id, email, fracao, created_by) values ($1, $2, 'x@y.pt', 'A', $3)`, [
          outroPredio,
          outraOrg,
          GESTOR,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
  });
});

describe('o que o condómino vê', () => {
  it('vê o seu prédio e o pedido publicado nele; não vê o outro prédio da gestora', async () => {
    expect(await as(ANA, () => rows('select nome_interno from public.buildings order by 1'))).toEqual([{ nome_interno: 'Rua Um, 1' }]);
    expect(await as(ANA, () => rows('select titulo from public.work_requests'))).toEqual([{ titulo: 'Fachadas do Um' }]);
    expect(await as(ZE, () => rows('select titulo from public.work_requests'))).toEqual([{ titulo: 'Fachadas do Dois' }]);
    expect(await as(ANA, () => rows('select nome from public.organizations where kind = $1', ['condominio']))).toEqual([{ nome: 'Condomínio Um' }]);
    expect(await as(ANA, () => rows('select count(*)::int n from public.request_surfaces'))).toEqual([{ n: 1 }]);
  });

  it('um rascunho do mesmo prédio não é do prédio', async () => {
    await as(GESTOR, () =>
      db.query(
        `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, prazo_propostas)
         values ($1, $2, 'Rascunho', 'fachadas', 'Ainda a pensar nisto, descrição comprida.', current_date + 10)`,
        [condo1, predio1],
      ),
    );
    expect(await as(ANA, () => rows('select titulo from public.work_requests'))).toEqual([{ titulo: 'Fachadas do Um' }]);
  });

  it('antes da abertura não vê propostas nem vota', async () => {
    expect(await as(ANA, () => rows('select id from public.proposals'))).toEqual([]);
    expect(await as(ANA, () => rows('select id from public.proposal_lines'))).toEqual([]);
    await expect(as(ANA, () => db.query('select public.votar($1, $2)', [pedido1, prop1]))).rejects.toThrow(/ainda não abriram/);
  });

  it('depois da abertura vê as propostas e as linhas, como o cliente', async () => {
    await db.query(`update public.request_listings set prazo_propostas = (now() at time zone 'Europe/Lisbon')::date - 1 where request_id = $1`, [pedido1]);
    expect(await as(ANA, () => rows('select count(*)::int n from public.proposals'))).toEqual([{ n: 2 }]);
    expect(await as(ANA, () => rows('select count(*)::int n from public.proposal_lines'))).toEqual([{ n: 2 }]);
    expect(await as(ZE, () => rows('select count(*)::int n from public.proposals'))).toEqual([{ n: 0 }]);
  });

  it('não lê os descontos dos fornecedores; os preços de referência sim', async () => {
    // O desconto entra como a base (o que se prova é quem o lê, não quem o escreve).
    await db.query(
      `insert into public.supplier_discounts (org_id, desconto_bps, created_by)
       select id, 1000, $1 from public.organizations where kind = 'fornecedor' and nome = 'Tintas C'`,
      [FORN],
    );
    expect(await as(FORN, () => rows('select count(*)::int n from public.supplier_discounts'))).toEqual([{ n: 1 }]);
    expect(await as(ANA, () => rows('select count(*)::int n from public.supplier_discounts'))).toEqual([{ n: 0 }]);
    await as(ANA, () => rows('select id from public.reference_products limit 1')); // não lança
  });
});

describe('o voto', () => {
  it('vota, muda o voto, e fica um por fração; o de outro prédio não vota aqui', async () => {
    await as(ANA, () => db.query('select public.votar($1, $2)', [pedido1, prop1]));
    await as(ANA, () => db.query('select public.votar($1, $2)', [pedido1, prop2]));
    await as(RUI, () => db.query('select public.votar($1, $2)', [pedido1, prop1]));
    const votos = await as(GESTOR, () => rows('select proposal_id from public.proposal_votes where request_id = $1 order by updated_at', [pedido1]));
    expect(votos).toHaveLength(2);
    expect(await as(ANA, () => rows('select proposal_id from public.proposal_votes'))).toEqual([{ proposal_id: prop2 }]);
    await expect(as(ZE, () => db.query('select public.votar($1, $2)', [pedido1, prop1]))).rejects.toThrow(/sem acesso/);
    await expect(as(ANA, () => db.query('select public.votar($1, $2)', [pedido2, prop1]))).rejects.toThrow(/sem acesso|inválida/);
  });

  it('ninguém escreve votos directamente', async () => {
    const rid = (await one<{ id: string }>('select id from public.building_residents where fracao = $1', ['3.º Esq'])).id;
    await expect(
      as(ANA, () => db.query('insert into public.proposal_votes (request_id, resident_id, proposal_id) values ($1, $2, $3)', [pedido1, rid, prop1])),
    ).rejects.toThrow();
    // Sem política de delete, o apagar não atinge linha nenhuma — nem para o gestor.
    await as(GESTOR, () => db.query('delete from public.proposal_votes'));
    expect(await as(GESTOR, () => rows('select count(*)::int n from public.proposal_votes'))).toEqual([{ n: 2 }]);
  });

  it('com uma proposta escolhida a votação fecha', async () => {
    await db.query(`update public.proposals set status = 'selecionada' where id = $1`, [prop1]);
    await expect(as(RUI, () => db.query('select public.votar($1, $2)', [pedido1, prop2]))).rejects.toThrow(/fechada/);
  });
});
