import { isValidNif, normalizeNif } from './nif';

// Organizações e prédios: tipos e validação partilhados pela interface e pelo
// servidor. A base de dados repete as restrições essenciais (NIF, código
// postal) para que um pedido que contorne a interface também seja recusado.

export const ORG_KINDS = ['condominio', 'administradora', 'particular', 'pintor', 'fornecedor'] as const;
export type OrgKind = (typeof ORG_KINDS)[number];

export const ORG_KIND_LABELS: Record<OrgKind, string> = {
  condominio: 'Condomínio',
  administradora: 'Empresa de administração de condomínios',
  particular: 'Particular',
  pintor: 'Pintor ou empresa de pintura',
  fornecedor: 'Fornecedor de tintas e materiais',
};

/**
 * Uma conta tem um só perfil (decisão de 20/10/2026): cliente (condomínios, administradoras,
 * particulares), pintor ou fornecedor. Não pode pertencer a entidades de perfis diferentes.
 */
export type AccountProfile = 'cliente' | 'pintor' | 'fornecedor';
export const ACCOUNT_PROFILE_LABELS: Record<AccountProfile, string> = {
  cliente: 'Cliente (condomínio, administração ou particular)',
  pintor: 'Pintor',
  fornecedor: 'Fornecedor de tintas e materiais',
};
export function accountProfile(kind: OrgKind): AccountProfile {
  return kind === 'pintor' ? 'pintor' : kind === 'fornecedor' ? 'fornecedor' : 'cliente';
}
/** Tipos de entidade que a conta ainda pode criar, dado o que já tem. */
export function allowedOrgKinds(existing: OrgKind[]): OrgKind[] {
  const first = existing[0];
  if (!first) return [...ORG_KINDS];
  const profile = accountProfile(first);
  // Pintor e fornecedor: a conta é uma só entidade. Clientes (administradora, condomínios) podem ter várias.
  if (profile !== 'cliente') return [];
  return ORG_KINDS.filter((k) => accountProfile(k) === profile);
}

export const MEMBER_ROLES = ['proprietario', 'gestor', 'financeiro', 'vendedor', 'leitor'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/** Descrição do papel adaptada ao tipo de entidade (um fornecedor não gere prédios). */
export function roleDescription(kind: OrgKind, role: MemberRole): string {
  const byKind: Partial<Record<OrgKind, Partial<Record<MemberRole, string>>>> = {
    fornecedor: {
      gestor: 'Gere produtos, descontos, entregas e encomendas.',
      financeiro: 'Acompanha a subscrição e as encomendas.',
      vendedor: 'Recebe e faz o levantamento de obras na sua zona (papel "avaliador").',
    },
    pintor: {
      gestor: 'Gere propostas, obras e documentos.',
      financeiro: 'Envia documentos e acompanha comissões e pagamentos.',
    },
  };
  return byKind[kind]?.[role] ?? MEMBER_ROLE_LABELS[role].description;
}

export const MEMBER_ROLE_LABELS: Record<MemberRole, { label: string; description: string }> = {
  proprietario: { label: 'Proprietário', description: 'Gere tudo, incluindo a equipa.' },
  gestor: { label: 'Gestor', description: 'Gere prédios, pedidos e documentos.' },
  financeiro: { label: 'Financeiro', description: 'Envia documentos e acompanha pagamentos.' },
  // Nome interno do papel ('vendedor') por continuidade com a base de dados (enum já em produção); o
  // texto visível ao utilizador usa "avaliador" — decisão de 23/10/2026, docs/DECISOES.md.
  vendedor: { label: 'Avaliador', description: 'Recebe pedidos de levantamento de obras.' },
  leitor: { label: 'Leitor', description: 'Só consulta.' },
};

export function parseInvite(form: FormData): { value?: { email: string; role: MemberRole }; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const email = (text(form.get('email')) ?? '').toLowerCase();
  if (!EMAIL.test(email)) errors.email = 'Indique um email válido.';
  const role = text(form.get('role'));
  if (!role || !(MEMBER_ROLES as readonly string[]).includes(role)) errors.role = 'Escolha o papel.';
  if (Object.keys(errors).length > 0) return { errors };
  return { errors, value: { email, role: role as MemberRole } };
}

export const BUILDING_KINDS =['edificio_habitacao', 'edificio_misto', 'moradia', 'apartamento', 'comercial'] as const;
export type BuildingKind = (typeof BUILDING_KINDS)[number];

export const BUILDING_KIND_LABELS: Record<BuildingKind, string> = {
  edificio_habitacao: 'Edifício de habitação',
  edificio_misto: 'Edifício misto (habitação e comércio)',
  moradia: 'Moradia',
  apartamento: 'Apartamento',
  comercial: 'Edifício comercial ou de serviços',
};

export const DOC_KINDS = [
  'certidao_permanente',
  'ata_nomeacao_administrador',
  'ata_aprovacao_obra',
  'alvara_impic',
  'certificado_impic',
  'seguro_acidentes_trabalho',
  'seguro_responsabilidade_civil',
  'declaracao_nao_divida_at',
  'declaracao_nao_divida_ss',
  'autorizacao_marca',
  'outro',
] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export const DOC_KIND_LABELS: Record<DocKind, string> = {
  certidao_permanente: 'Certidão permanente (registo comercial)',
  ata_nomeacao_administrador: 'Ata de nomeação do administrador',
  ata_aprovacao_obra: 'Ata da assembleia que aprova a obra',
  alvara_impic: 'Alvará de construção (IMPIC)',
  certificado_impic: 'Certificado de empreiteiro (IMPIC)',
  seguro_acidentes_trabalho: 'Seguro de acidentes de trabalho',
  seguro_responsabilidade_civil: 'Seguro de responsabilidade civil',
  declaracao_nao_divida_at: 'Declaração de não dívida às Finanças',
  declaracao_nao_divida_ss: 'Declaração de não dívida à Segurança Social',
  autorizacao_marca: 'Autorização de revenda de marca',
  outro: 'Outro documento',
};

/** Documentos que fazem sentido para cada tipo de entidade (só estes aparecem para enviar). */
export const ALLOWED_DOCS: Record<OrgKind, DocKind[]> = {
  condominio: ['ata_nomeacao_administrador', 'ata_aprovacao_obra', 'outro'],
  administradora: ['certidao_permanente', 'ata_nomeacao_administrador', 'ata_aprovacao_obra', 'outro'],
  particular: ['outro'],
  pintor: [
    'alvara_impic',
    'certificado_impic',
    'seguro_acidentes_trabalho',
    'seguro_responsabilidade_civil',
    'declaracao_nao_divida_at',
    'declaracao_nao_divida_ss',
    'certidao_permanente',
    'outro',
  ],
  fornecedor: ['certidao_permanente', 'autorizacao_marca', 'outro'],
};

/** Porque é que a plataforma pede cada documento, em linguagem simples. */
export const DOC_KIND_WHY: Record<DocKind, string> = {
  certidao_permanente: 'Confirma que a empresa existe e quem a pode obrigar.',
  ata_nomeacao_administrador: 'Prova que quem assina representa o condomínio.',
  ata_aprovacao_obra: 'Prova que a assembleia aprovou a obra; sem ela o condomínio não assina.',
  alvara_impic: 'Obrigatório por lei para obras acima de 40 000 €; a classe define o valor máximo.',
  certificado_impic: 'Habilita para obras até 40 000 €.',
  seguro_acidentes_trabalho: 'Obrigatório para quem tem trabalhadores em obra.',
  seguro_responsabilidade_civil: 'Cobre danos a terceiros e ao prédio durante a obra.',
  declaracao_nao_divida_at: 'Mostra ao cliente que a empresa tem a situação fiscal regularizada.',
  declaracao_nao_divida_ss: 'Mostra ao cliente que a empresa paga as contribuições.',
  autorizacao_marca: 'Confirma que vende a marca como revendedor autorizado.',
  outro: 'Qualquer outro documento útil. Não substitui os anteriores.',
};

/**
 * Documentos que cada tipo de entidade deve submeter para ser verificada.
 * Para o pintor, basta um de alvará ou certificado do IMPIC (consoante o valor
 * das obras); a exigência exata está por validar (questão E4).
 */
export const EXPECTED_DOCS: Record<OrgKind, DocKind[][]> = {
  condominio: [['ata_nomeacao_administrador']],
  administradora: [['certidao_permanente']],
  particular: [],
  pintor: [
    ['alvara_impic', 'certificado_impic'],
    ['seguro_acidentes_trabalho'],
    ['seguro_responsabilidade_civil'],
    ['declaracao_nao_divida_at'],
    ['declaracao_nao_divida_ss'],
  ],
  fornecedor: [['certidao_permanente']],
};

/** Grupos de documentos ainda em falta, contando os submetidos e os aprovados. */
export function missingDocs(kind: OrgKind, submitted: { kind: DocKind; status: string }[]): DocKind[][] {
  const usable = new Set(submitted.filter((d) => d.status !== 'rejeitado' && d.status !== 'expirado').map((d) => d.kind));
  return EXPECTED_DOCS[kind].filter((group) => !group.some((k) => usable.has(k)));
}

export type FieldErrors = Record<string, string>;

export interface OrganizationInput {
  kind: OrgKind;
  nome: string;
  nif: string | null;
  moradaFiscal: string | null;
  codigoPostal: string | null;
  localidade: string | null;
  emailContacto: string | null;
  telefone: string | null;
  atendimentoPublico: string | null;
  geridaPor: string | null;
}

export interface BuildingInput {
  nomeInterno: string;
  tipo: BuildingKind;
  morada: string;
  codigoPostal: string;
  localidade: string;
  concelho: string;
  artigoMatricial: string | null;
  pisos: number | null;
  fracoes: number | null;
  fachadas: number | null;
  anoConstrucao: number | null;
  temVarandas: boolean;
  temElevador: boolean;
  acessos: string | null;
}

const POSTAL_CODE = /^\d{4}-\d{3}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  return s === '' ? null : s;
}

function int(value: FormDataEntryValue | null): number | null | 'invalid' {
  const s = text(value);
  if (s === null) return null;
  return /^\d+$/.test(s) ? Number(s) : 'invalid';
}

// O NIF é obrigatório para quem contrata ou fatura; um particular pode
// registar-se sem ele e só o indica quando contratar.
const NIF_REQUIRED: OrgKind[] = ['condominio', 'administradora', 'pintor', 'fornecedor'];

export function parseOrganization(form: FormData): { value?: OrganizationInput; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const kind = text(form.get('kind'));
  if (!kind || !(ORG_KINDS as readonly string[]).includes(kind)) errors.kind = 'Escolha o tipo de entidade.';

  const nome = text(form.get('nome'));
  if (!nome) errors.nome = 'Indique o nome ou a denominação.';

  const rawNif = text(form.get('nif'));
  const nif = rawNif ? normalizeNif(rawNif) : null;
  if (nif && !isValidNif(nif)) errors.nif = 'NIF inválido: confirme os 9 algarismos.';
  if (!nif && kind && NIF_REQUIRED.includes(kind as OrgKind)) errors.nif = 'O NIF é obrigatório para esta entidade.';

  const codigoPostal = text(form.get('codigoPostal'));
  if (codigoPostal && !POSTAL_CODE.test(codigoPostal)) errors.codigoPostal = 'Use o formato 0000-000.';

  const emailContacto = text(form.get('emailContacto'));
  if (emailContacto && !EMAIL.test(emailContacto)) errors.emailContacto = 'Email inválido.';

  const geridaPor = text(form.get('geridaPor'));
  if (geridaPor && kind !== 'condominio') errors.geridaPor = 'Só um condomínio pode ser gerido por uma administradora.';

  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    value: {
      kind: kind as OrgKind,
      nome: nome!,
      nif,
      moradaFiscal: text(form.get('moradaFiscal')),
      codigoPostal,
      localidade: text(form.get('localidade')),
      emailContacto,
      telefone: text(form.get('telefone')),
      atendimentoPublico: text(form.get('atendimentoPublico')),
      geridaPor,
    },
  };
}

export function parseBuilding(form: FormData): { value?: BuildingInput; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const nomeInterno = text(form.get('nomeInterno'));
  if (!nomeInterno) errors.nomeInterno = 'Dê um nome ao prédio (por exemplo, a rua e o número).';

  const tipo = text(form.get('tipo'));
  if (!tipo || !(BUILDING_KINDS as readonly string[]).includes(tipo)) errors.tipo = 'Escolha o tipo de imóvel.';

  const morada = text(form.get('morada'));
  if (!morada) errors.morada = 'Indique a morada.';
  const codigoPostal = text(form.get('codigoPostal'));
  if (!codigoPostal || !POSTAL_CODE.test(codigoPostal)) errors.codigoPostal = 'Use o formato 0000-000.';
  const localidade = text(form.get('localidade'));
  if (!localidade) errors.localidade = 'Indique a localidade.';
  const concelho = text(form.get('concelho'));
  if (!concelho) errors.concelho = 'Indique o concelho: é a única localização mostrada aos pintores.';

  const ranges: [string, number, number][] = [
    ['pisos', 0, 100],
    ['fracoes', 0, 2000],
    ['fachadas', 0, 8],
    ['anoConstrucao', 1500, 2100],
  ];
  const numbers: Record<string, number | null> = {};
  for (const [field, min, max] of ranges) {
    const n = int(form.get(field));
    if (n === 'invalid' || (n !== null && (n < min || n > max))) errors[field] = `Valor entre ${min} e ${max}.`;
    else numbers[field] = n;
  }

  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    value: {
      nomeInterno: nomeInterno!,
      tipo: tipo as BuildingKind,
      morada: morada!,
      codigoPostal: codigoPostal!,
      localidade: localidade!,
      concelho: concelho!,
      artigoMatricial: text(form.get('artigoMatricial')),
      pisos: numbers.pisos ?? null,
      fracoes: numbers.fracoes ?? null,
      fachadas: numbers.fachadas ?? null,
      anoConstrucao: numbers.anoConstrucao ?? null,
      temVarandas: form.get('temVarandas') === 'on',
      temElevador: form.get('temElevador') === 'on',
      acessos: text(form.get('acessos')),
    },
  };
}
