'use client';

import { useState } from 'react';
import Link from 'next/link';
import { saveBuildingCharacteristic } from '@/app/app/actions';
import type { FormState } from '@/app/app/actions';
import { BUILDING_NEEDS, BUILDING_NEED_LABELS, canStartRequest, isQuotableNeed, splitNeeds } from '@/domain/buildingNeeds';

/**
 * Que obras o condomínio quer fazer agora, gravadas à medida que se assinalam (sem botão). Assim que
 * houver pelo menos uma que a plataforma orçamente, aparece o convite a abrir o pedido — é esse o passo
 * seguinte que o promotor desenhou em 24/10/2026.
 *
 * As obras fora da pintura ficam registadas na mesma, e dizemo-lo sem rodeios em vez de as esconder: o
 * avaliador precisa de saber o que vai encontrar, e o condomínio não tem de fingir que só quer pintura.
 */
export function Needs({
  orgId,
  buildingId,
  iniciais,
}: {
  orgId: string;
  buildingId: string;
  iniciais: string[];
}) {
  const [obras, setObras] = useState<string[]>(iniciais);
  const [estado, setEstado] = useState<'parado' | 'a_guardar' | 'guardado' | 'erro'>('parado');
  const [erro, setErro] = useState<string | null>(null);

  async function alternar(obra: string, ligado: boolean) {
    const novas = ligado ? [...new Set([...obras, obra])] : obras.filter((o) => o !== obra);
    setObras(novas);
    setEstado('a_guardar');
    const form = new FormData();
    for (const o of novas) form.append('obras', o);
    const r: FormState = await saveBuildingCharacteristic(orgId, buildingId, 'obras_pretendidas', { errors: {} }, form);
    if (r.ok) {
      setErro(null);
      setEstado('guardado');
    } else {
      setErro(r.message ?? 'Não foi possível guardar.');
      setEstado('erro');
      setObras(obras); // repõe o que estava, para o ecrã não mentir sobre o que ficou gravado
    }
  }

  const { soRegistados } = splitNeeds(obras);
  const podePedir = canStartRequest(obras);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Que obras quer fazer neste prédio</h2>
          {estado === 'a_guardar' && <span className="text-xs text-slate-500">a guardar…</span>}
          {estado === 'guardado' && !erro && <span className="text-xs text-tinta-700">guardado</span>}
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Assinale o que precisa agora. Grava-se sozinho. Serve para o avaliador saber o que vai encontrar quando
          visitar a obra.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {BUILDING_NEEDS.map((n) => (
          <label key={n} className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={obras.includes(n)} onChange={(ev) => void alternar(n, ev.target.checked)} className="mt-1" />
            <span>
              {BUILDING_NEED_LABELS[n]}
              {!isQuotableNeed(n) && <span className="block text-xs text-slate-500">fica registado; não se orçamenta aqui</span>}
            </span>
          </label>
        ))}
      </div>

      {erro && (
        <p className="text-sm text-red-700" role="alert">
          {erro}
        </p>
      )}

      {soRegistados.length > 0 && (
        <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          A Quem Pinta é uma plataforma de <strong>pintura</strong>: {soRegistados.length === 1 ? 'o trabalho assinalado' : 'os trabalhos assinalados'} fora
          disso {soRegistados.length === 1 ? 'fica registado' : 'ficam registados'} na ficha do prédio e {soRegistados.length === 1 ? 'é mostrado' : 'são mostrados'} a
          quem fizer o levantamento, mas não {soRegistados.length === 1 ? 'entra' : 'entram'} no pedido de orçamento.
        </p>
      )}

      {podePedir && (
        <div className="rounded-2xl border border-tinta-600 bg-tinta-50 p-5">
          <p className="font-semibold text-tinta-900">Quer iniciar pedidos de orçamentos?</p>
          <p className="mt-1 text-sm text-slate-700">
            Abre-se um processo para este prédio, onde descreve a obra e o problema — e onde pode pedir a ajuda gratuita
            de um avaliador, que vai ao local fazer o levantamento consigo.
          </p>
          <Link
            href={`/app/organizacoes/${orgId}/pedidos/novo?predio=${buildingId}`}
            className="mt-3 inline-block rounded-lg bg-tinta-600 px-5 py-2 text-sm font-semibold text-white hover:bg-tinta-700"
          >
            Iniciar pedido de orçamento →
          </Link>
        </div>
      )}
    </div>
  );
}
