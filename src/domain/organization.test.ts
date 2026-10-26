import { describe, expect, it } from 'vitest';
import { isValidNif } from './nif';
import { INVALID_NIFS, VALID_NIFS } from './nif.vectors';
import {
  caeAviso,
  caeElegibilidade,
  missingDocs,
  parseBuilding,
  parseEntityCard,
  parseInvite,
  parseOrganization,
  ROLE_CAPABILITIES,
} from './organization';

describe('convite', () => {
  it('normaliza o email para minúsculas', () => {
    const f = new FormData();
    f.set('email', ' Maria@Exemplo.PT ');
    f.set('role', 'gestor');
    expect(parseInvite(f).value).toEqual({ email: 'maria@exemplo.pt', role: 'gestor' });
  });

  it('recusa papel inexistente', () => {
    const f = new FormData();
    f.set('email', 'maria@exemplo.pt');
    f.set('role', 'administrador');
    expect(parseInvite(f).errors.role).toBeDefined();
  });
});
import { safeNext } from '@/lib/redirect';

describe('documentos em falta', () => {
  it('um pintor sem documentos tem cinco grupos em falta', () => {
    expect(missingDocs('pintor', [])).toHaveLength(5);
  });

  it('alvará ou certificado satisfazem o mesmo grupo; um rejeitado não conta', () => {
    const left = missingDocs('pintor', [
      { kind: 'certificado_impic', status: 'submetido' },
      { kind: 'seguro_acidentes_trabalho', status: 'rejeitado' },
    ]);
    expect(left).toHaveLength(4);
    expect(left).toContainEqual(['seguro_acidentes_trabalho']);
  });
});

describe('destino depois de entrar', () => {
  it('só aceita caminhos internos da área reservada, ou o convite direto de uma obra', () => {
    expect(safeNext('/app/organizacoes/1')).toBe('/app/organizacoes/1');
    expect(safeNext('/convite/ABCD1234')).toBe('/convite/ABCD1234');
    expect(safeNext('https://exemplo.com')).toBe('/app');
    expect(safeNext('//exemplo.com')).toBe('/app');
    expect(safeNext('/convite')).toBe('/app'); // sem barra final: não é um código, é a secção.
    expect(safeNext(null)).toBe('/app');
  });
});


describe('NIF', () => {
  it.each(VALID_NIFS)('aceita %s', (nif) => expect(isValidNif(nif)).toBe(true));
  it.each(INVALID_NIFS)('recusa %s', (nif) => expect(isValidNif(nif)).toBe(false));
  it('ignora espaços e pontos', () => expect(isValidNif('123 456 789')).toBe(true));
});

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

describe('organização', () => {
  it('exige NIF a um condomínio', () => {
    const r = parseOrganization(form({ kind: 'condominio', nome: 'Condomínio Rua A, 10' }));
    expect(r.errors.nif).toBeDefined();
  });

  it('aceita um particular sem NIF', () => {
    const r = parseOrganization(form({ kind: 'particular', nome: 'Ana Silva' }));
    expect(r.errors).toEqual({});
    expect(r.value?.nif).toBeNull();
  });

  it('recusa NIF com dígito de controlo errado e código postal mal formado', () => {
    const r = parseOrganization(
      form({ kind: 'pintor', nome: 'Pinturas Lda', nif: '123456780', codigoPostal: '1000' }),
    );
    expect(Object.keys(r.errors).sort()).toEqual(['codigoPostal', 'nif']);
  });

  it('só um condomínio pode ser gerido por uma administradora', () => {
    const r = parseOrganization(form({ kind: 'pintor', nome: 'X', nif: '123456789', geridaPor: 'abc' }));
    expect(r.errors.geridaPor).toBeDefined();
  });
});

describe('prédio', () => {
  const base = {
    nomeInterno: 'Rua das Flores, 12',
    tipo: 'edificio_habitacao',
    morada: 'Rua das Flores, 12',
    codigoPostal: '1200-195',
    localidade: 'Lisboa',
    concelho: 'Lisboa',
  };

  it('aceita os dados mínimos', () => {
    const r = parseBuilding(form(base));
    expect(r.errors).toEqual({});
    expect(r.value?.pisos).toBeNull();
  });

  it('valida números de pisos e fachadas', () => {
    const r = parseBuilding(form({ ...base, pisos: '-1', fachadas: '12' }));
    expect(Object.keys(r.errors).sort()).toEqual(['fachadas', 'pisos']);
  });

  it('exige o concelho, que é a única localização mostrada aos pintores', () => {
    const r = parseBuilding(form({ ...base, concelho: '' }));
    expect(r.errors.concelho).toMatch(/pintores/);
  });
});

import { accountProfile, allowedOrgKinds } from './organization';

describe('um perfil por conta', () => {
  it('cliente, pintor ou fornecedor, nunca mais de um', () => {
    expect(allowedOrgKinds([])).toHaveLength(5);
    expect(allowedOrgKinds(['pintor'])).toEqual([]);
    expect(allowedOrgKinds(['fornecedor'])).toEqual([]);
    expect(allowedOrgKinds(['administradora'])).toEqual(['condominio', 'administradora', 'particular']);
    expect(accountProfile('condominio')).toBe('cliente');
  });
});

describe('cartão de "O meu Perfil"', () => {
  it('exige nome da empresa, nome do gerente e mail de contacto', () => {
    const f = new FormData();
    const r = parseEntityCard(f);
    expect(Object.keys(r.errors).sort()).toEqual(['emailContacto', 'gerenteNome', 'nome']);
  });

  it('aceita os dados mínimos, telefone é opcional', () => {
    const f = new FormData();
    f.set('nome', 'Pinturas Lda');
    f.set('gerenteNome', 'António');
    f.set('emailContacto', 'geral@pinturas.pt');
    const r = parseEntityCard(f);
    expect(r.errors).toEqual({});
    expect(r.value).toEqual({ nome: 'Pinturas Lda', gerenteNome: 'António', telefone: null, emailContacto: 'geral@pinturas.pt' });
  });

  it('recusa um mail de contacto inválido', () => {
    const f = new FormData();
    f.set('nome', 'Pinturas Lda');
    f.set('gerenteNome', 'António');
    f.set('emailContacto', 'não é um email');
    expect(parseEntityCard(f).errors.emailContacto).toBeDefined();
  });
});

describe('elegibilidade do CAE para pintura/construção', () => {
  it('secção F (divisões 41-43) é elegível; o resto não; sem código fica por verificar', () => {
    expect(caeElegibilidade('43341')).toBe('elegivel');
    expect(caeElegibilidade('41200')).toBe('elegivel');
    expect(caeElegibilidade('42110')).toBe('elegivel');
    expect(caeElegibilidade('47520')).toBe('nao_elegivel'); // comércio a retalho de ferragens
    expect(caeElegibilidade(null)).toBe('por_verificar');
  });

  it('só avisa quando não é elegível ou está por verificar, nunca quando é elegível', () => {
    expect(caeAviso('elegivel')).toBeNull();
    expect(caeAviso('nao_elegivel')).toMatch(/elegibilidade/);
    expect(caeAviso('por_verificar')).toMatch(/elegibilidade/);
  });
});

describe('capacidades por papel em "Equipa online"', () => {
  it('só o proprietário gere quem tem acesso; só proprietário e gestor editam a empresa e orçamentam', () => {
    expect(ROLE_CAPABILITIES.proprietario.giereEquipaOnline).toBe(true);
    expect(ROLE_CAPABILITIES.gestor.giereEquipaOnline).toBe(false);
    expect(ROLE_CAPABILITIES.gestor.criarEEnviarOrcamentos).toBe(true);
    expect(ROLE_CAPABILITIES.financeiro.criarEEnviarOrcamentos).toBe(false);
    expect(ROLE_CAPABILITIES.financeiro.carregarDocumentos).toBe(true);
    expect(ROLE_CAPABILITIES.leitor.carregarDocumentos).toBe(false);
  });
});
