'use client';

import { guardarLogotipo, removerLogotipo, type FormState } from '@/app/app/actions';
import { Field } from '@/components/Field';
import { EstadoDeGravacao } from '@/components/EstadoDeGravacao';
import { useFormAction } from '@/components/useFormAction';

/**
 * O logótipo da empresa de pintura.
 *
 * ## Onde é que ele aparece
 *
 * No cabeçalho dos orçamentos, no lugar que já estava reservado para ele. A 29/10/2026 esse lugar
 * tinha o logótipo da Quem Pinta e o promotor corrigiu: «no orçamento, a Quem Pinta continua a
 * ocupar o lugar onde deveria sobressair a empresa de pintura». Ficou uma caixa a tracejado à
 * espera; isto é o que a preenche.
 *
 * Nos orçamentos feitos a pedidos do mercado, só depois da escolha — até lá o documento não leva
 * nome nem marca de ninguém, que é a regra do anonimato. Nos orçamentos que a empresa faz a
 * clientes seus, aparece sempre: aí não há anonimato nenhum a proteger.
 *
 * ## Sem logótipo não falta nada
 *
 * Quem não tiver um continua a ver as iniciais da empresa, como até aqui. Isto é uma oferta, não
 * uma pendência — e por isso não aparece em lista nenhuma do que falta fazer.
 */
export function LogotipoDaEmpresa({ orgId, url }: { orgId: string; url: string | null }) {
  const { state, pending, repetir, formProps } = useFormAction<FormState>(
    guardarLogotipo.bind(null, orgId),
    { errors: {} },
    { resetOnSuccess: true },
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[17px] font-semibold">Logótipo da empresa</h3>
        <p className="mt-1 max-w-[54ch] text-[17px] text-slate-600">
          Aparece no cabeçalho dos orçamentos, no lugar da empresa. Nos orçamentos a pedidos do mercado, só depois de
          a obra lhe ser adjudicada. Sem logótipo, ficam as iniciais.
        </p>
      </div>

      {url && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- cofre público, sem otimizador */}
            <img src={url} alt="Logótipo da empresa" className="max-h-full max-w-full object-contain" />
          </div>
          <form action={removerLogotipo.bind(null, orgId)}>
            <button type="submit" className="btn-quiet btn-sm text-red-700">
              Remover logótipo
            </button>
          </form>
        </div>
      )}

      <form {...formProps} className="space-y-4">
        <Field
          name="ficheiro"
          label={url ? 'Substituir por outro' : 'Ficheiro'}
          error={state.errors.ficheiro}
          hint="JPG ou PNG, até 2 MB. Um quadrado ou algo perto disso é o que fica melhor."
          info="A aplicação retira os metadados do ficheiro antes de o guardar — num logótipo isso costuma ser o nome de quem o desenhou e o caminho no computador dele."
        >
          <input
            name="ficheiro"
            type="file"
            required
            accept="image/jpeg,image/png"
            className="mt-1 block w-full text-[17px]"
          />
        </Field>
        <button type="submit" disabled={pending} className="btn-secondary">
          {url ? 'Substituir logótipo' : 'Enviar logótipo'}
        </button>
        <EstadoDeGravacao pending={pending} ok={state.ok} mensagem={state.message} repetir={repetir} />
      </form>
    </div>
  );
}
