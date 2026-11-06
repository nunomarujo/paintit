// Lojas do fornecedor (promotor, 06/11/2026). Uma loja tem nome e morada; o concelho tira-o o servidor do
// código postal. Os concelhos das lojas juntam-se ao da morada da empresa nos concelhos por omissão
// (`coberturaDaEmpresa.ts`).

export interface LojaInput {
  nome: string;
  morada: string;
  codigoPostal: string;
  localidade: string;
}

const limpo = (v: FormDataEntryValue | null) => String(v ?? '').replace(/\s+/g, ' ').trim();

/** Valida o formulário de uma loja (regra 10: o servidor volta a ver tudo). */
export function lerLoja(form: FormData): { value: LojaInput } | { errors: Record<string, string> } {
  const nome = limpo(form.get('nome'));
  const morada = limpo(form.get('morada'));
  const codigoPostal = limpo(form.get('codigoPostal'));
  const localidade = limpo(form.get('localidade'));
  const errors: Record<string, string> = {};
  if (!nome) errors.nome = 'Indique o nome da loja.';
  else if (nome.length > 120) errors.nome = 'No máximo 120 caracteres.';
  if (!/^\d{4}-\d{3}$/.test(codigoPostal)) errors.codigoPostal = 'Código postal no formato 0000-000.';
  if (!localidade) errors.localidade = 'Indique a localidade.';
  else if (localidade.length > 120) errors.localidade = 'No máximo 120 caracteres.';
  if (!morada) errors.morada = 'Indique a morada da loja.';
  else if (morada.length > 200) errors.morada = 'No máximo 200 caracteres.';
  if (Object.keys(errors).length > 0) return { errors };
  return { value: { nome, morada, codigoPostal, localidade } };
}
