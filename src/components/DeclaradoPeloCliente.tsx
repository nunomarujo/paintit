/**
 * O que o cliente declarou no pedido e o pintor orçamenta sem alterar (caleiras; o interior junta-se
 * aqui). O mesmo texto que entra no contrato (`declaracaoDasCaleiras`). Sem nada declarado, não aparece.
 */
export function DeclaradoPeloCliente({ frases }: { frases: (string | null)[] }) {
  const lista = frases.filter((f): f is string => !!f);
  if (lista.length === 0) return null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="text-[15px] font-semibold text-slate-600">Declarado pelo cliente</h2>
      <ul className="mt-2 space-y-1 text-[17px] text-slate-900">
        {lista.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <p className="mt-2 max-w-[54ch] text-[15px] text-slate-600">
        Entra no contrato tal como está. As caleiras orçamentam-se em metros lineares (ml); a medição confirma-se em obra.
      </p>
    </section>
  );
}
