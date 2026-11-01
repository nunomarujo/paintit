import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { limiteAplicavel, type LimiteDeDesconto } from '../../src/domain/limitesDeDesconto';
import { baseComMigracoes } from './baseEmMemoria';

// O limite de desconto do vendedor existe duas vezes: na base, porque é lá que a porta tem de estar
// fechada (um argumento vindo do navegador pode ser trocado), e em TypeScript, porque o ecrã tem de
// dizer quanto se pode dar antes de alguém tentar.
//
// Duas cópias da mesma regra só valem se se provar que concordam. Este ficheiro percorre todas as
// combinações de regras e de artigos e compara-as uma a uma.

let db: PGlite;

const ORG = '00000000-0000-4000-8000-00000000d001';
const DONO = '00000000-0000-4000-8000-00000000d0d0';
const JOAO = '00000000-0000-4000-8000-00000000d0a1';
const ANA = '00000000-0000-4000-8000-00000000d0a2';
const P1 = '00000000-0000-4000-8000-00000000d0f1';

beforeAll(async () => {
  db = await baseComMigracoes();
  await db.exec('set role postgres');
  for (const [u, e] of [
    [DONO, 'dono@teste.invalid'],
    [JOAO, 'joao@teste.invalid'],
    [ANA, 'ana@teste.invalid'],
  ] as const) {
    await db.query('insert into auth.users (id, email) values ($1, $2) on conflict do nothing', [u, e]);
  }
  await db.query(
    `insert into public.organizations (id, kind, nome, nif, created_by)
     values ($1, 'fornecedor', 'Tintas de Ensaio, Lda', '599999993', $2) on conflict do nothing`,
    [ORG, DONO],
  );
  await db.query(
    `insert into public.products (id, org_id, marca, nome, tipo, unidade, created_by)
     values ($1, $2, 'Marca', 'Esmalte de ensaio', 'esmalte', 'L', $3) on conflict do nothing`,
    [P1, ORG, DONO],
  );
}, 60_000);

async function sqlLimite(user: string, tipo: string | null, produto: string | null): Promise<number> {
  const r = await db.query<{ n: number }>('select private.limite_de_desconto($1, $2, $3, $4) as n', [
    ORG,
    user,
    tipo,
    produto,
  ]);
  return Number(r.rows[0]!.n);
}

async function gravar(limites: LimiteDeDesconto[]): Promise<void> {
  await db.query('delete from public.supplier_discount_limits where org_id = $1', [ORG]);
  for (const l of limites) {
    await db.query(
      `insert into public.supplier_discount_limits (org_id, vendedor_user_id, tipo, product_id, limite_bps, updated_by)
       values ($1, $2, $3, $4, $5, $6)`,
      [ORG, l.vendedorUserId, l.tipo, l.productId, l.limiteBps, DONO],
    );
  }
}

const l = (p: Partial<LimiteDeDesconto> & { limiteBps: number }): LimiteDeDesconto => ({
  vendedorUserId: null,
  tipo: null,
  productId: null,
  ...p,
});

// Cada cenário é um conjunto de regras; cada artigo é uma pergunta feita às duas implementações.
const CENARIOS: { nome: string; limites: LimiteDeDesconto[] }[] = [
  { nome: 'sem regra nenhuma', limites: [] },
  { nome: 'só o limite da empresa', limites: [l({ limiteBps: 1000 })] },
  { nome: 'vendedor acima da empresa', limites: [l({ limiteBps: 1000 }), l({ vendedorUserId: JOAO, limiteBps: 1500 })] },
  { nome: 'vendedor abaixo da empresa', limites: [l({ limiteBps: 1000 }), l({ vendedorUserId: ANA, limiteBps: 300 })] },
  {
    nome: 'teto de categoria por cima de tudo',
    limites: [l({ limiteBps: 1000 }), l({ vendedorUserId: JOAO, limiteBps: 1500 }), l({ tipo: 'esmalte', limiteBps: 500 })],
  },
  {
    nome: 'teto de produto, o mais específico',
    limites: [l({ limiteBps: 1000 }), l({ tipo: 'esmalte', limiteBps: 500 }), l({ productId: P1, limiteBps: 200 })],
  },
  { nome: 'só um teto de produto, sem limite de empresa', limites: [l({ productId: P1, limiteBps: 200 })] },
  {
    nome: 'tetos de duas categorias',
    limites: [l({ limiteBps: 2000 }), l({ tipo: 'esmalte', limiteBps: 500 }), l({ tipo: 'primario', limiteBps: 800 })],
  },
];

const ARTIGOS = [
  { nome: 'todo o catálogo', tipo: null, productId: null },
  { nome: 'categoria esmalte', tipo: 'esmalte', productId: null },
  { nome: 'categoria tinta de exterior', tipo: 'tinta_exterior', productId: null },
  { nome: 'o produto P1 (esmalte)', tipo: 'esmalte', productId: P1 },
];

describe('o limite de desconto diz o mesmo na base e no código', () => {
  for (const c of CENARIOS) {
    for (const a of ARTIGOS) {
      for (const [quem, user] of [['João', JOAO], ['Ana', ANA]] as const) {
        it(`${c.nome} · ${a.nome} · ${quem}`, async () => {
          await gravar(c.limites);
          const naBase = await sqlLimite(user, a.tipo, a.productId);
          const noCodigo = limiteAplicavel(c.limites, user, { tipo: a.tipo, productId: a.productId });
          expect(naBase).toBe(noCodigo);
        });
      }
    }
  }
});
