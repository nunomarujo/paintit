'use client';

import { useState } from 'react';
import { Field } from '@/components/Field';
import { useFormAction } from '@/components/useFormAction';
import { useConfirmacao } from '@/components/Confirmar';
import { alterarPermilagem, registarCondomino, retirarAcesso, reporAcesso, criarCodigo, desactivarCodigo, type Estado } from './actions';

export function FormularioDeRegisto({ orgId, predioId }: { orgId: string; predioId: string }) {
  const { state, pending, formProps } = useFormAction<Estado>(registarCondomino.bind(null, orgId, predioId), { errors: {} }, { resetOnSuccess: true });
  const e = state.errors;
  return (
    <form {...formProps} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="email" label="Email" type="email" inputMode="email" required error={e.email} />
        <Field name="nome" label="Nome" error={e.nome} />
        <Field name="fracao" label="Fração" required placeholder="3.º Esq, B, loja 2…" error={e.fracao} />
        <Field name="andar" label="Andar" placeholder="3, R/C, cave…" error={e.andar} />
        <Field
          name="permilagem"
          label="Permilagem"
          inputMode="numeric"
          placeholder="ex.: 125"
          hint="‰ da fração, do título constitutivo. Conta na votação; pode ficar em branco."
          error={e.permilagem}
        />
      </div>
      {state.message && (
        <p className={`text-[17px] ${state.ok ? 'text-tinta-700' : 'text-red-700'}`} role="status">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? 'A registar…' : 'Registar condómino'}
      </button>
    </form>
  );
}

export function Permilagem({ orgId, predioId, residentId, valor }: { orgId: string; predioId: string; residentId: string; valor: number | null }) {
  const { state, pending, formProps } = useFormAction<Estado>(alterarPermilagem.bind(null, orgId, predioId, residentId), { errors: {} });
  return (
    <form {...formProps} className="flex items-center gap-2">
      <input
        name="permilagem"
        defaultValue={valor ?? ''}
        inputMode="numeric"
        placeholder="‰"
        aria-label="Permilagem"
        aria-invalid={state.errors.permilagem ? true : undefined}
        className="campo w-24 text-right"
      />
      <button type="submit" disabled={pending} className="btn-quiet btn-sm">
        {pending ? '…' : 'Guardar'}
      </button>
      {state.errors.permilagem && <span className="text-[13px] text-red-700">{state.errors.permilagem}</span>}
    </form>
  );
}

export function BotaoDeAcesso({ orgId, predioId, residentId, activo, fracao }: { orgId: string; predioId: string; residentId: string; activo: boolean; fracao: string }) {
  const [pedir, dialogo] = useConfirmacao();
  const [aEnviar, setAEnviar] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={aEnviar}
        className="btn-quiet btn-sm"
        onClick={async () => {
          if (activo) {
            const ok = await pedir({
              titulo: `Retirar o acesso à fração ${fracao}?`,
              texto: 'Deixa de ver o pedido e as propostas, e o voto que tiver dado deixa de contar. Pode repor o acesso mais tarde.',
              confirmar: 'Retirar acesso',
              destrutivo: true,
            });
            if (!ok) return;
          }
          setAEnviar(true);
          await (activo ? retirarAcesso : reporAcesso)(orgId, predioId, residentId);
          setAEnviar(false);
        }}
      >
        {activo ? 'Retirar acesso' : 'Repor acesso'}
      </button>
      {dialogo}
    </>
  );
}

export function BotoesDoCodigo({ orgId, predioId, temCodigo }: { orgId: string; predioId: string; temCodigo: boolean }) {
  const [pedir, dialogo] = useConfirmacao();
  const [aEnviar, setAEnviar] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={aEnviar}
        className={temCodigo ? 'btn-quiet' : 'btn-primary'}
        onClick={async () => {
          if (temCodigo) {
            const ok = await pedir({
              titulo: 'Gerar um código novo?',
              texto: 'O código e o QR actuais deixam de funcionar. Quem já entrou mantém o acesso; quem ainda tiver o papel antigo precisa do novo.',
              confirmar: 'Gerar código novo',
            });
            if (!ok) return;
          }
          setAEnviar(true);
          await criarCodigo(orgId, predioId);
          setAEnviar(false);
        }}
      >
        {temCodigo ? 'Gerar código novo' : 'Criar código do prédio'}
      </button>
      {temCodigo && (
        <button
          type="button"
          disabled={aEnviar}
          className="btn-quiet"
          onClick={async () => {
            const ok = await pedir({
              titulo: 'Desactivar o código?',
              texto: 'Ninguém mais se regista por ele. Quem já entrou mantém o acesso.',
              confirmar: 'Desactivar',
              destrutivo: true,
            });
            if (!ok) return;
            setAEnviar(true);
            await desactivarCodigo(orgId, predioId);
            setAEnviar(false);
          }}
        >
          Desactivar
        </button>
      )}
      {dialogo}
    </div>
  );
}

export function CopiarLink({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          /* sem clipboard: o link está visível ao lado */
        }
      }}
    >
      {copiado ? 'Copiado' : 'Copiar link'}
    </button>
  );
}
