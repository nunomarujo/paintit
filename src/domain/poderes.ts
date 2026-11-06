import { isPessoaSingularNif, isSociedadeNif, isValidNif, normalizeNif } from './nif';
import type { FieldErrors, OrgKind } from './organization';

// Poderes de representação (05/11/2026, docs/DECISOES.md): quem assina um contrato em nome de uma entidade
// tem poderes para a obrigar?
//
// A leitura automática da certidão permanente é proibida sem autorização do IRN (Termos do portal
// registo.justica.gov.pt, §4), por isso a versão é manual: a empresa entrega o código de acesso da
// certidão (Portaria 285/2012, art. 6.º, n.º 2 — entregar o código é entregar a certidão), a equipa da
// plataforma abre-a e regista quem tem poderes, a forma de obrigar e a validade. Num condomínio, a equipa
// regista o administrador a partir da ata de nomeação, com a mesma lógica.
//
// O que se compara é o NOME. O certificado do Cartão de Cidadão ou da Chave Móvel Digital traz o nome
// completo (CN) e o n.º de identificação civil, mas não o NIF; a certidão traz nome, NIF e cargo. Um
// «confere» é por isso um indício e não uma prova — homónimos existem — e nenhum texto daqui diz
// «verificado». Nada disto impede uma assinatura: avisa, e a decisão continua a ser das partes.
//
// Os textos vão para o acontecimento da assinatura, que as duas partes leem: dizem o resultado e nunca os
// dados da certidão (nomes, cargos, forma de obrigar, datas). O nome de quem assinou já é público para
// as duas partes (vem do certificado), por isso também não se repete aqui.

export const RESULTADOS = [
  'confere',
  'provavel',
  'nao_consta',
  'faltam_assinaturas',
  'sem_certidao',
  'certidao_caducada',
  'por_confirmar',
  'particular_confere',
  'particular_nao_confere',
  'nao_aplicavel',
] as const;
export type ResultadoPoderes = (typeof RESULTADOS)[number];

export interface PoderesDaAssinatura {
  resultado: ResultadoPoderes;
  texto: string;
}

/** Os resultados que não pedem aviso. Tudo o resto — incluindo «provável» — aparece numa banda âmbar. */
const SEM_AVISO: readonly ResultadoPoderes[] = ['confere', 'particular_confere', 'nao_aplicavel'];
export const pedeAviso = (r: ResultadoPoderes) => !SEM_AVISO.includes(r);

/** Rótulo curto, para listas da equipa da plataforma. */
export const RESULTADO_ROTULO: Record<ResultadoPoderes, string> = {
  confere: 'Nome confere',
  provavel: 'Nome provável',
  nao_consta: 'Nome não consta',
  faltam_assinaturas: 'Faltam assinaturas',
  sem_certidao: 'Sem leitura registada',
  certidao_caducada: 'Leitura caducada',
  por_confirmar: 'Por confirmar',
  particular_confere: 'Confere com o titular',
  particular_nao_confere: 'Não confere com o titular',
  nao_aplicavel: 'Não se aplica',
};

// Nomes -------------------------------------------------------------------------------------------------

/** Partículas que não distinguem ninguém e que a certidão e o certificado escrevem de maneira diferente. */
const PARTICULAS = new Set(['DE', 'DA', 'DO', 'DOS', 'DAS', 'E', 'D']);

/**
 * As palavras de um nome, para comparar: maiúsculas, sem acentos (a certidão escreve «JOÃO LUIS» e o
 * cartão «João Luís»), sem pontuação nem hífenes, e sem as partículas DE/DA/DO/DOS/DAS/E/D' («D'ALMEIDA»
 * fica «ALMEIDA»).
 */
export function palavrasDoNome(nome: string | null | undefined): string[] {
  return (nome ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]+/g, ' ')
    .split(' ')
    .filter((p) => p !== '' && !PARTICULAS.has(p));
}

export const normalizarNome = (nome: string | null | undefined) => palavrasDoNome(nome).join(' ');

export type Semelhanca = 'confere' | 'provavel' | 'nao';

/**
 * «confere»: as mesmas palavras, por qualquer ordem. «provavel»: o mesmo primeiro e o mesmo último nome, e
 * as palavras de um contidas nas do outro («JOÃO SILVA» e «JOÃO PEDRO SILVA»). Nada mais conta.
 */
export function compararNomes(a: string | null | undefined, b: string | null | undefined): Semelhanca {
  const pa = palavrasDoNome(a);
  const pb = palavrasDoNome(b);
  if (pa.length === 0 || pb.length === 0) return 'nao';
  const sa = new Set(pa);
  const sb = new Set(pb);
  const contido = (x: Set<string>, y: Set<string>) => [...x].every((p) => y.has(p));
  if (sa.size === sb.size && contido(sa, sb)) return 'confere';
  const extremos = pa.length >= 2 && pb.length >= 2 && pa[0] === pb[0] && pa[pa.length - 1] === pb[pb.length - 1];
  if (extremos && (contido(sa, sb) || contido(sb, sa))) return 'provavel';
  return 'nao';
}

/** A mesma pessoa a assinar duas vezes conta uma vez: o que se mede são pessoas, não assinaturas. */
function pessoasDistintas(nomes: (string | null)[]): { lidos: string[]; ilegiveis: number } {
  const vistos = new Set<string>();
  const lidos: string[] = [];
  let ilegiveis = 0;
  for (const nome of nomes) {
    const chave = [...new Set(palavrasDoNome(nome))].sort().join(' ');
    if (chave === '') ilegiveis++;
    else if (!vistos.has(chave)) {
      vistos.add(chave);
      lidos.push(nome!);
    }
  }
  return { lidos, ilegiveis };
}

/**
 * Cada pessoa que assinou fica com, no máximo, um membro da leitura, e cada membro com uma pessoa — dois
 * signatários não valem por duas assinaturas se forem o mesmo gerente. Escolhe-se o emparelhamento com
 * mais pares e, entre esses, com mais «confere». São poucas pessoas e poucos membros: percorre-se tudo.
 */
function emparelhar(signatarios: string[], membros: string[]): { pares: number; confere: number } {
  let melhor = { pares: 0, confere: 0 };
  const usados = new Set<number>();
  const andar = (i: number, pares: number, confere: number) => {
    if (i === signatarios.length) {
      if (pares > melhor.pares || (pares === melhor.pares && confere > melhor.confere)) melhor = { pares, confere };
      return;
    }
    andar(i + 1, pares, confere);
    membros.forEach((m, j) => {
      if (usados.has(j)) return;
      const s = compararNomes(signatarios[i], m);
      if (s === 'nao') return;
      usados.add(j);
      andar(i + 1, pares + 1, confere + (s === 'confere' ? 1 : 0));
      usados.delete(j);
    });
  };
  andar(0, 0, 0);
  return melhor;
}

// Quem obriga cada entidade ---------------------------------------------------------------------------------

/**
 * De onde vem a resposta para cada entidade:
 * - «certidao»: sociedades (NIPC a começar por 5), e administradoras e fornecedores que não sejam pessoas
 *   singulares (já lhes era pedida a certidão em EXPECTED_DOCS);
 * - «ata»: condomínios — o administrador nomeado em assembleia;
 * - «titular»: particulares e empresários em nome individual (NIF de pessoa singular), que se obrigam a si
 *   próprios: compara-se com o nome do titular da conta;
 * - «nenhum»: um pintor com outro tipo de NIF (público, herança indivisa, …), que esta verificação não cobre.
 */
export type RegimeDosPoderes = 'certidao' | 'ata' | 'titular' | 'nenhum';

export function regimeDosPoderes(tipo: OrgKind, nif: string | null): RegimeDosPoderes {
  if (tipo === 'particular') return 'titular';
  if (tipo === 'condominio') return 'ata';
  if (isPessoaSingularNif(nif)) return 'titular';
  if (isSociedadeNif(nif)) return 'certidao';
  return tipo === 'administradora' || tipo === 'fornecedor' ? 'certidao' : 'nenhum';
}

/** A entidade deve entregar a certidão permanente (ou o código de acesso)? */
export const usaCertidao = (tipo: OrgKind, nif: string | null) => regimeDosPoderes(tipo, nif) === 'certidao';

// O resultado de uma assinatura ---------------------------------------------------------------------------

export interface LeituraDosPoderes {
  fonte: 'certidao' | 'ata';
  membros: { nome: string }[];
  /** 1 ou 2; `null` quando a forma de obrigar é invulgar e ficou «a confirmar». */
  assinaturasExigidas: 1 | 2 | null;
  /** «AAAA-MM-DD», inclusive. */
  validaAte: string;
}

export interface PedidoDePoderes {
  tipo: OrgKind;
  nif: string | null;
  /** A leitura registada pela equipa; `null` se não houver, ou se um código novo a pôs por fazer. */
  leitura: LeituraDosPoderes | null;
  /** A entidade já entregou o código da certidão (só muda o texto quando ainda não há leitura). */
  codigoEntregue: boolean;
  /** O nome (CN) de cada certificado que assinou por este lado. */
  signatarios: (string | null)[];
  /** Nome do titular da conta (o proprietário da entidade), para particulares e empresários em nome individual. */
  titulares: string[];
  /** «AAAA-MM-DD», hora de Lisboa. */
  hoje: string;
}

const r = (resultado: ResultadoPoderes, texto: string): PoderesDaAssinatura => ({ resultado, texto });

export function poderesDaAssinatura(p: PedidoDePoderes): PoderesDaAssinatura {
  const regime = regimeDosPoderes(p.tipo, p.nif);
  if (regime === 'nenhum') return r('nao_aplicavel', 'Esta entidade não tem verificação de poderes de representação.');
  const pessoas = pessoasDistintas(p.signatarios);
  return regime === 'titular' ? pelaConta(pessoas, p.titulares) : pelaLeitura(regime, p, pessoas);
}

function pelaConta(pessoas: { lidos: string[]; ilegiveis: number }, titulares: string[]): PoderesDaAssinatura {
  const nomes = titulares.filter((t) => palavrasDoNome(t).length > 0);
  if (nomes.length === 0) {
    return r('por_confirmar', 'A conta não tem o nome do titular registado: não foi possível compará-lo com o nome de quem assinou.');
  }
  if (pessoas.lidos.length === 0) {
    return r('por_confirmar', 'O certificado não traz o nome de quem assinou: não foi possível compará-lo com o titular da conta.');
  }
  const semelhancas = pessoas.lidos.flatMap((s) => nomes.map((t) => compararNomes(s, t)));
  if (semelhancas.includes('confere')) {
    return r('particular_confere', 'O nome de quem assinou confere com o nome do titular da conta. A comparação é feita só pelo nome.');
  }
  if (semelhancas.includes('provavel')) {
    return r(
      'particular_confere',
      'O primeiro e o último nome de quem assinou conferem com o titular da conta, mas o nome completo não é igual.',
    );
  }
  return r('particular_nao_confere', 'O nome de quem assinou não confere com o nome do titular da conta.');
}

function pelaLeitura(regime: 'certidao' | 'ata', p: PedidoDePoderes, pessoas: { lidos: string[]; ilegiveis: number }): PoderesDaAssinatura {
  const ata = regime === 'ata';
  const documento = ata ? 'a ata de nomeação do administrador' : 'a certidão permanente';
  const entidade = ata ? 'o condomínio' : 'a entidade';
  const l = p.leitura;
  if (!l) {
    if (ata) {
      return r(
        'sem_certidao',
        'A ata de nomeação do administrador ainda não foi lida pela equipa da plataforma: não foi possível confirmar se quem assinou representa o condomínio.',
      );
    }
    return r(
      'sem_certidao',
      p.codigoEntregue
        ? 'A certidão permanente ainda não foi lida pela equipa da plataforma: não foi possível confirmar se quem assinou pode obrigar a entidade.'
        : 'A entidade ainda não entregou o código de acesso da certidão permanente: não foi possível confirmar se quem assinou a pode obrigar.',
    );
  }
  if (l.validaAte < p.hoje) {
    return r(
      'certidao_caducada',
      ata
        ? 'O mandato do administrador registado a partir da ata de nomeação já terminou: não foi possível confirmar se quem assinou representa o condomínio.'
        : 'A certidão permanente registada já caducou: não foi possível confirmar se quem assinou pode obrigar a entidade.',
    );
  }

  const { pares, confere } = emparelhar(
    pessoas.lidos,
    l.membros.map((m) => m.nome),
  );
  if (pares < pessoas.lidos.length) {
    return r(
      'nao_consta',
      pessoas.lidos.length + pessoas.ilegiveis > 1
        ? `O nome de uma das pessoas que assinaram não consta de quem tem poderes segundo ${documento}. A assinatura pode não obrigar ${entidade}.`
        : `O nome de quem assinou não consta de quem tem poderes segundo ${documento}. A assinatura pode não obrigar ${entidade}.`,
    );
  }
  if (pessoas.ilegiveis > 0) {
    return r('por_confirmar', `Um certificado não traz o nome de quem assinou: não foi possível compará-lo com ${documento}.`);
  }
  if (l.assinaturasExigidas === null) {
    return r(
      'por_confirmar',
      `O nome de quem assinou consta de ${documento}, mas a forma de obrigar registada é invulgar e ainda tem de ser confirmada pela equipa da plataforma.`,
    );
  }
  if (pares < l.assinaturasExigidas) {
    return r(
      'faltam_assinaturas',
      `A forma de obrigar registada exige mais assinaturas de quem tem poderes do que as que o contrato tem. Sem elas, a assinatura pode não obrigar ${entidade}.`,
    );
  }
  if (confere < pares) {
    return r(
      'provavel',
      `O primeiro e o último nome de quem assinou conferem com ${documento}, mas o nome completo não é igual. Convém confirmar que se trata da mesma pessoa.`,
    );
  }
  return r('confere', `O nome de quem assinou confere com ${documento}. A comparação é feita só pelo nome: é um indício, não uma prova.`);
}

// O que fica no acontecimento da assinatura -----------------------------------------------------------------

/** Lê `payload.poderes` de um acontecimento. O payload vem da base: confirma-se a forma antes de o usar. */
export function poderesDoPayload(payload: unknown): PoderesDaAssinatura | null {
  const p = (payload as { poderes?: unknown } | null)?.poderes as { resultado?: unknown; texto?: unknown } | undefined;
  if (!p || typeof p.texto !== 'string' || !(RESULTADOS as readonly unknown[]).includes(p.resultado)) return null;
  return { resultado: p.resultado as ResultadoPoderes, texto: p.texto };
}

export interface AvisoDeAssinatura extends PoderesDaAssinatura {
  lado: 'cliente' | 'pintor';
}

/** As assinaturas registadas cujo resultado pede aviso, pela ordem em que foram feitas. */
export function avisosDasAssinaturas(eventos: { kind: string; payload: unknown }[]): AvisoDeAssinatura[] {
  const out: AvisoDeAssinatura[] = [];
  for (const e of eventos) {
    if (e.kind !== 'cliente_assinou' && e.kind !== 'pintor_assinou') continue;
    const p = poderesDoPayload(e.payload);
    if (p && pedeAviso(p.resultado)) out.push({ lado: e.kind === 'cliente_assinou' ? 'cliente' : 'pintor', ...p });
  }
  return out;
}

// O código de acesso e o estado da leitura ----------------------------------------------------------------

/** «1234-5678-9012», a partir do que se escreveu (com ou sem hífenes e espaços). `null` se não for um código. */
export function normalizarCodigoCertidao(input: string): string | null {
  const s = input.trim();
  if (!/^[\d\s-]+$/.test(s)) return null;
  const d = s.replace(/\D/g, '');
  return d.length === 12 ? `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}` : null;
}

export type EstadoDaLeitura = 'sem_codigo' | 'por_ler' | 'lida' | 'caducada';

const pt = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/**
 * O que a entidade vê no lugar do código, depois de o guardar: nunca o código, só o estado da leitura.
 * `lidaEm` é o instante; `validaAte` e `hoje` são dias («AAAA-MM-DD»).
 */
export function estadoDaLeitura(
  l: { codigoEntregueEm: string | null; lidaEm: string | null; validaAte: string | null } | null,
  hoje: string,
): { estado: EstadoDaLeitura; texto: string } {
  if (l?.lidaEm && l.validaAte) {
    if (l.validaAte < hoje) {
      return { estado: 'caducada', texto: `Lida a ${pt(l.lidaEm)} · caducou a ${pt(l.validaAte)}. Falta o código da certidão renovada.` };
    }
    return { estado: 'lida', texto: `Lida pela equipa a ${pt(l.lidaEm)} · válida até ${pt(l.validaAte)}` };
  }
  if (l?.codigoEntregueEm) return { estado: 'por_ler', texto: 'Guardado · por ler pela equipa' };
  return { estado: 'sem_codigo', texto: 'Ainda sem código.' };
}

// O formulário da equipa ------------------------------------------------------------------------------------

export const MAX_MEMBROS = 20;

export interface MembroInput {
  nome: string;
  cargo: string;
  nif: string | null;
}

export interface LeituraInput {
  formaDeObrigar: string;
  assinaturasExigidas: 1 | 2 | null;
  validaAte: string;
  membros: MembroInput[];
}

const texto = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v.trim() : '');

/**
 * O que a equipa regista ao ler a certidão (ou a ata): só o necessário — nome, cargo e NIF (opcional) de
 * quem tem poderes, a forma de obrigar como está escrita, o número de assinaturas e a validade. As moradas,
 * o estado civil e o resto da certidão não se guardam.
 */
export function parseLeitura(form: FormData, hoje: string): { value?: LeituraInput; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const nomes = form.getAll('membroNome').map(texto);
  const cargos = form.getAll('membroCargo').map(texto);
  const nifs = form.getAll('membroNif').map(texto);
  const membros: MembroInput[] = [];
  for (let i = 0; i < Math.max(nomes.length, cargos.length, nifs.length); i++) {
    const nome = (nomes[i] ?? '').replace(/\s+/g, ' ');
    const cargo = (cargos[i] ?? '').replace(/\s+/g, ' ');
    const nif = normalizeNif(nifs[i] ?? '');
    if (!nome && !cargo && !nif) continue;
    // Fica o primeiro erro: é o que está mais acima no formulário.
    const erro = (m: string) => (errors.membros ??= `Linha ${i + 1}: ${m}`);
    if (palavrasDoNome(nome).length === 0) erro('indique o nome como está na certidão.');
    else if (nome.length > 200) erro('o nome é demasiado comprido.');
    else if (cargo.length < 2 || cargo.length > 100) erro('indique o cargo (por exemplo, gerente).');
    else if (nif && !isValidNif(nif)) erro('o NIF não é válido. Pode ficar em branco.');
    membros.push({ nome, cargo, nif: nif || null });
  }
  if (!errors.membros && membros.length === 0) errors.membros = 'Registe pelo menos uma pessoa com poderes.';
  if (membros.length > MAX_MEMBROS) errors.membros = `No máximo ${MAX_MEMBROS} pessoas.`;

  const formaDeObrigar = texto(form.get('formaDeObrigar'));
  if (!formaDeObrigar) errors.formaDeObrigar = 'Copie a forma de obrigar como está na certidão.';
  else if (formaDeObrigar.length > 1000) errors.formaDeObrigar = 'No máximo 1000 caracteres.';

  const assinaturas = texto(form.get('assinaturas'));
  if (!['1', '2', 'confirmar'].includes(assinaturas)) errors.assinaturas = 'Escolha quantas assinaturas obrigam a entidade.';

  const validaAte = texto(form.get('validaAte'));
  const instante = /^\d{4}-\d{2}-\d{2}$/.test(validaAte) ? Date.parse(`${validaAte}T00:00:00Z`) : NaN;
  // «2026-02-30» passa no Date.parse (vira 2 de março): só conta uma data que volte a dar o mesmo texto.
  const dataReal = !Number.isNaN(instante) && new Date(instante).toISOString().startsWith(validaAte);
  if (!dataReal) errors.validaAte = 'Indique a data «válida até».';
  else if (validaAte < hoje) errors.validaAte = 'Esta data já passou: a certidão caducou e é precisa uma nova.';

  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    value: {
      formaDeObrigar,
      assinaturasExigidas: assinaturas === 'confirmar' ? null : (Number(assinaturas) as 1 | 2),
      validaAte,
      membros,
    },
  };
}
