import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { missingDocs, type DocKind } from '@/domain/organization';
import type { Database } from '@/lib/database.types';
import { faltasDaEntidade, poderesDoLado, type LeituraDaEntidade } from './poderes';

// Tudo ou nada (05/11/2026). Enquanto a migração `20261105230000_poderes_de_representacao` não estiver aplicada,
// publicar o código não pode ligar metade da funcionalidade: nem a assinatura grava resultado em regime nenhum
// (o do titular — particulares e empresários em nome individual — não precisa das tabelas novas, e gravava),
// nem a página da entidade passa a pedir a certidão ao pintor sociedade sem lhe deixar entregar o código.
// Um cliente Supabase falso responde por tabela; «sem a migração» é o erro 42P01 nas duas tabelas novas.

type Resposta = { data: unknown; error: { code: string; message: string } | null };
const SEM_TABELA: Resposta = { data: null, error: { code: '42P01', message: 'relation does not exist' } };
const ok = (data: unknown): Resposta => ({ data, error: null });

interface Consulta extends PromiseLike<Resposta> {
  select: () => Consulta;
  eq: () => Consulta;
  in: () => Consulta;
  order: () => Consulta;
  maybeSingle: () => Promise<Resposta>;
}

function clienteFalso(tabelas: Record<string, Resposta>) {
  const pedidas: string[] = [];
  const from = (tabela: string) => {
    pedidas.push(tabela);
    const resposta = tabelas[tabela] ?? { data: null, error: { code: 'XX000', message: `tabela inesperada: ${tabela}` } };
    const q: Consulta = {
      select: () => q,
      eq: () => q,
      in: () => q,
      order: () => q,
      maybeSingle: () => Promise.resolve(resposta),
      then: (aceitar, rejeitar) => Promise.resolve(resposta).then(aceitar, rejeitar),
    };
    return q;
  };
  return { cliente: { from } as unknown as SupabaseClient<Database>, pedidas };
}

const AGORA = new Date('2026-11-05T12:00:00Z');
const ORG = '00000000-0000-0000-0000-000000000001';

/** As tabelas que já existiam antes da migração: a entidade, o proprietário e o seu perfil. */
const base = (kind: string, nif: string | null, titular = 'Rui Miguel Santos Mota') => ({
  organizations: ok({ kind, nif }),
  org_members: ok([{ user_id: 'u1' }]),
  profiles: ok([{ nome: titular }]),
});
const semMigracao = { poderes_de_representacao: SEM_TABELA, poderes_membros: SEM_TABELA };
const comMigracaoVazia = { poderes_de_representacao: ok(null), poderes_membros: ok([]) };

describe('poderesDoLado — sem a migração aplicada, nenhum resultado em regime nenhum', () => {
  it('particular: não grava resultado (antes dava «não confere» com um perfil «Rui»)', async () => {
    const { cliente } = clienteFalso({ ...base('particular', '123456789', 'Rui'), ...semMigracao });
    expect(await poderesDoLado(cliente, ORG, ['RUI MIGUEL SANTOS MOTA'], AGORA)).toBeNull();
  });

  it('particular cujo nome confere: também não grava resultado', async () => {
    const { cliente } = clienteFalso({ ...base('particular', '123456789'), ...semMigracao });
    expect(await poderesDoLado(cliente, ORG, ['RUI MIGUEL SANTOS MOTA'], AGORA)).toBeNull();
  });

  it('pintor empresário em nome individual (NIF 1…): não grava resultado', async () => {
    const { cliente } = clienteFalso({ ...base('pintor', '123456789'), ...semMigracao });
    expect(await poderesDoLado(cliente, ORG, ['RUI MIGUEL SANTOS MOTA'], AGORA)).toBeNull();
  });

  it('pintor com NIF fora da verificação (6…): não grava «não se aplica»', async () => {
    const { cliente } = clienteFalso({ ...base('pintor', '600000000'), ...semMigracao });
    expect(await poderesDoLado(cliente, ORG, ['RUI MIGUEL SANTOS MOTA'], AGORA)).toBeNull();
  });

  it.each([
    ['pintor', '501234567'],
    ['administradora', '501234567'],
    ['fornecedor', '501234567'],
    ['condominio', '901234567'],
  ])('%s: não grava resultado', async (kind, nif) => {
    const { cliente } = clienteFalso({ ...base(kind, nif), ...semMigracao });
    expect(await poderesDoLado(cliente, ORG, ['RUI MIGUEL SANTOS MOTA'], AGORA)).toBeNull();
  });

  it('a tabela dos poderes é lida mesmo no regime do titular, que não a usa', async () => {
    const { cliente, pedidas } = clienteFalso({ ...base('particular', '123456789'), ...comMigracaoVazia });
    await poderesDoLado(cliente, ORG, ['RUI MIGUEL SANTOS MOTA'], AGORA);
    expect(pedidas).toContain('poderes_de_representacao');
  });
});

describe('poderesDoLado — com a migração aplicada', () => {
  it('particular: o nome confere com o titular', async () => {
    const { cliente } = clienteFalso({ ...base('particular', '123456789'), ...comMigracaoVazia });
    expect((await poderesDoLado(cliente, ORG, ['RUI MIGUEL SANTOS MOTA'], AGORA))?.resultado).toBe('particular_confere');
  });

  it('particular: o nome não confere com o titular', async () => {
    const { cliente } = clienteFalso({ ...base('particular', '123456789', 'Rui'), ...comMigracaoVazia });
    expect((await poderesDoLado(cliente, ORG, ['RUI MIGUEL SANTOS MOTA'], AGORA))?.resultado).toBe('particular_nao_confere');
  });

  it('empresário em nome individual: compara com o titular da conta', async () => {
    const { cliente } = clienteFalso({ ...base('pintor', '234567890'), ...comMigracaoVazia });
    expect((await poderesDoLado(cliente, ORG, ['Rui Miguel Santos Mota'], AGORA))?.resultado).toBe('particular_confere');
  });

  it('pintor com NIF fora da verificação: «não se aplica»', async () => {
    const { cliente } = clienteFalso({ ...base('pintor', '600000000'), ...comMigracaoVazia });
    expect((await poderesDoLado(cliente, ORG, ['RUI MIGUEL SANTOS MOTA'], AGORA))?.resultado).toBe('nao_aplicavel');
  });

  it('pintor sociedade sem leitura: «sem leitura registada»', async () => {
    const { cliente } = clienteFalso({ ...base('pintor', '501234567'), ...comMigracaoVazia });
    expect((await poderesDoLado(cliente, ORG, ['RUI MIGUEL SANTOS MOTA'], AGORA))?.resultado).toBe('sem_certidao');
  });

  it('pintor sociedade com leitura válida: o nome confere com a certidão', async () => {
    const { cliente } = clienteFalso({
      ...base('pintor', '501234567'),
      poderes_de_representacao: ok({
        org_id: ORG,
        fonte: 'certidao',
        codigo_entregue_em: '2026-11-01T10:00:00Z',
        forma_de_obrigar: 'Com a assinatura de um gerente.',
        assinaturas_exigidas: 1,
        valida_ate: '2027-06-30',
        lida_em: '2026-11-02T10:00:00Z',
        lida_por: 'admin',
      }),
      poderes_membros: ok([{ nome: 'JOÃO LUIS SILVA', cargo: 'Gerente', ordem: 0 }]),
    });
    const p = await poderesDoLado(cliente, ORG, ['João Luís Silva'], AGORA);
    expect(p?.resultado).toBe('confere');
    expect(p?.texto).not.toMatch(/verificad/i);
  });

  it('sem conseguir ler o titular da conta, não grava resultado', async () => {
    const { cliente } = clienteFalso({
      ...base('particular', '123456789'),
      org_members: { data: null, error: { code: '42501', message: 'permission denied' } },
      ...comMigracaoVazia,
    });
    expect(await poderesDoLado(cliente, ORG, ['RUI MIGUEL SANTOS MOTA'], AGORA)).toBeNull();
  });
});

describe('faltasDaEntidade — a página da entidade', () => {
  const HOJE = '2026-11-05';
  const docsDoPintor: { kind: DocKind; status: string }[] = [
    { kind: 'alvara_impic', status: 'aprovado' },
    { kind: 'seguro_acidentes_trabalho', status: 'aprovado' },
  ];
  const leitura = (estado: Partial<NonNullable<LeituraDaEntidade['estado']>> | null): LeituraDaEntidade => ({
    estado: estado
      ? {
          org_id: ORG,
          fonte: 'certidao',
          codigo_entregue_em: null,
          forma_de_obrigar: null,
          assinaturas_exigidas: null,
          valida_ate: null,
          lida_em: null,
          lida_por: null,
          ...estado,
        }
      : null,
    membros: [],
    leitura: null,
    codigoEntregue: Boolean(estado?.codigo_entregue_em),
  });
  const temCertidao = (faltas: DocKind[][]) => faltas.some((g) => g.includes('certidao_permanente'));
  const sociedade = { kind: 'pintor' as const, nif: '501234567' };

  it('sem a migração (sem leitura), o pintor sociedade fica como estava: a certidão não é pedida', () => {
    const { faltas, leitura: estado } = faltasDaEntidade(sociedade, docsDoPintor, undefined, HOJE);
    expect(temCertidao(faltas)).toBe(false);
    expect(faltas).toEqual(missingDocs('pintor', docsDoPintor));
    expect(estado.estado).toBe('sem_codigo');
  });

  it('com a migração, a certidão passa a ser pedida ao pintor sociedade', () => {
    expect(temCertidao(faltasDaEntidade(sociedade, docsDoPintor, leitura(null), HOJE).faltas)).toBe(true);
  });

  it('um código guardado e por ler vale pela certidão', () => {
    const r = faltasDaEntidade(sociedade, docsDoPintor, leitura({ codigo_entregue_em: '2026-11-04T10:00:00Z' }), HOJE);
    expect(r.leitura.estado).toBe('por_ler');
    expect(temCertidao(r.faltas)).toBe(false);
  });

  it('uma leitura caducada não vale pela certidão', () => {
    const r = faltasDaEntidade(
      sociedade,
      docsDoPintor,
      leitura({ codigo_entregue_em: '2026-01-01T10:00:00Z', lida_em: '2026-01-02T10:00:00Z', valida_ate: '2026-07-01' }),
      HOJE,
    );
    expect(r.leitura.estado).toBe('caducada');
    expect(temCertidao(r.faltas)).toBe(true);
  });

  it('o pintor empresário em nome individual nunca vê a certidão pedida', () => {
    expect(temCertidao(faltasDaEntidade({ kind: 'pintor', nif: '123456789' }, docsDoPintor, leitura(null), HOJE).faltas)).toBe(false);
  });

  it('à administradora a certidão já era pedida, com ou sem a migração', () => {
    const adm = { kind: 'administradora' as const, nif: '501234567' };
    expect(temCertidao(faltasDaEntidade(adm, [], undefined, HOJE).faltas)).toBe(true);
    expect(temCertidao(faltasDaEntidade(adm, [], leitura(null), HOJE).faltas)).toBe(true);
  });
});
