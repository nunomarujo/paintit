'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  cancelarCodigoDeWhatsApp,
  numerosDeWhatsApp,
  pedirCodigoDeWhatsApp,
  removerNumeroDeWhatsApp,
  type NumeroDeWhatsApp,
} from '@/app/app/perfil/whatsapp-actions';
import { useConfirmacao } from '@/components/Confirmar';
import { ligacaoParaAssociar } from '@/domain/whatsappNumeros';

/**
 * Os números de WhatsApp em vigor, com «Remover», e o caminho para associar outro (06/11/2026).
 *
 * O número não se escreve: a pessoa pede um código, envia-o por WhatsApp para a plataforma, e a plataforma fica
 * com o número DE ONDE a mensagem veio — é o WhatsApp que garante que é o dela. Assim uma conta não consegue
 * pôr o telemóvel de outra pessoa a receber avisos. Enquanto espera, o ecrã vê de três em três segundos se o
 * número já chegou, e atualiza-se sozinho quando chegar.
 */

const VALIDADE_MS = 15 * 60 * 1000;

/** «+351912345678» → «+351 912 345 678». */
export function numeroEmTexto(n: string): string {
  const m = /^\+351(\d{3})(\d{3})(\d{3})$/.exec(n);
  return m ? `+351 ${m[1]} ${m[2]} ${m[3]}` : n;
}

const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function NumerosDeWhatsApp({
  numeros,
  maximo = 3,
  whatsappDisponivel,
  numeroDaPlataforma,
}: {
  numeros: NumeroDeWhatsApp[];
  maximo?: number;
  /** O canal existe neste ambiente (chaves configuradas). Sem ele, não se oferece o que não funciona. */
  whatsappDisponivel: boolean;
  /** O número da plataforma, para onde se envia o código. */
  numeroDaPlataforma: string;
}) {
  const router = useRouter();
  const [pedir, dialogo] = useConfirmacao();
  const [lista, setLista] = useState(numeros);
  const [codigo, setCodigo] = useState<{ texto: string; ate: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aPedir, setAPedir] = useState(false);
  const [aRemover, setARemover] = useState<string | null>(null);
  const [acabouDeChegar, setAcabouDeChegar] = useState<string | null>(null);
  const antes = useRef(numeros.length);

  // A página pode vir de novo do servidor (depois de um refresh): a lista segue-a.
  useEffect(() => setLista(numeros), [numeros]);

  // À espera da mensagem: pergunta de três em três segundos; ao chegar, mostra-o e atualiza o resto da página.
  useEffect(() => {
    if (!codigo) return;
    let parado = false;
    const volta = setInterval(async () => {
      if (Date.now() > codigo.ate) {
        setCodigo(null);
        setErro('O código caducou. Peça outro para tentar de novo.');
        return;
      }
      const agora = await numerosDeWhatsApp().catch(() => null);
      if (parado || !agora) return;
      const novo = agora.find((n) => !lista.some((l) => l.id === n.id));
      if (novo || agora.length !== lista.length) {
        setLista(agora);
        setCodigo(null);
        setAcabouDeChegar(novo ? numeroEmTexto(novo.numero) : null);
        antes.current = agora.length;
        router.refresh();
      }
    }, 3000);
    return () => {
      parado = true;
      clearInterval(volta);
    };
  }, [codigo, lista, router]);

  const associar = async () => {
    setErro(null);
    setAcabouDeChegar(null);
    setAPedir(true);
    try {
      const r = await pedirCodigoDeWhatsApp();
      if (r.codigo) setCodigo({ texto: r.codigo, ate: Date.now() + VALIDADE_MS });
      else setErro(r.erro ?? 'Não foi possível pedir o código.');
    } finally {
      setAPedir(false);
    }
  };

  const remover = async (n: NumeroDeWhatsApp) => {
    const ok = await pedir({
      titulo: `Remover ${numeroEmTexto(n.numero)}?`,
      texto: 'Deixa de receber avisos por WhatsApp neste número. Pode associá-lo outra vez mais tarde.',
      confirmar: 'Remover o número',
      destrutivo: true,
    });
    if (!ok) return;
    setARemover(n.id);
    try {
      const r = await removerNumeroDeWhatsApp(n.id);
      if (r.ok) {
        setLista((l) => l.filter((x) => x.id !== n.id));
        router.refresh();
      } else setErro('Não foi possível remover. Tente de novo.');
    } finally {
      setARemover(null);
    }
  };

  const cheio = lista.length >= maximo;

  return (
    <div className="space-y-4">
      {lista.length === 0 ? (
        <p className="text-[17px] text-slate-700">Nenhum número associado. Os avisos seguem por email e aparecem aqui na aplicação.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
          {lista.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
              <div>
                <p className="text-[17px] font-medium tabular-nums text-slate-900">{numeroEmTexto(n.numero)}</p>
                <p className="text-[15px] text-slate-600">Confirmado a {dia(n.confirmadoEm)}</p>
              </div>
              <button
                type="button"
                disabled={aRemover === n.id}
                onClick={() => remover(n)}
                className="btn-quiet btn-sm -mr-3 font-normal text-slate-700"
                aria-label={`Remover ${numeroEmTexto(n.numero)}`}
              >
                {aRemover === n.id ? 'A remover…' : 'Remover'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {acabouDeChegar && (
        <p className="text-[15px] text-tinta-700" role="status">
          {acabouDeChegar} associado. Os avisos de trabalho seguem também por WhatsApp; para parar, basta escrever PARAR nessa conversa.
        </p>
      )}
      {erro && (
        <p className="text-[15px] font-semibold text-amber-800" role="alert">
          {erro}
        </p>
      )}

      {codigo ? (
        <div className="space-y-3 rounded-lg bg-slate-50 p-4">
          <p className="text-[17px] text-slate-900">
            No telemóvel cujo número quer associar, abrir o WhatsApp e enviar a mensagem que já vem escrita.
          </p>
          <a href={ligacaoParaAssociar(numeroDaPlataforma, codigo.texto)} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Abrir o WhatsApp
          </a>
          <p className="text-[15px] text-slate-700">
            Se a mensagem não vier escrita, enviar para {numeroEmTexto(numeroDaPlataforma)} o código{' '}
            <span className="font-semibold tabular-nums text-slate-900">{codigo.texto}</span>. Vale 15 minutos e só serve uma vez.
          </p>
          <p className="text-[15px] text-slate-600" role="status">
            À espera da mensagem… Se a resposta no WhatsApp disser outra coisa, pedir um novo código.
          </p>
          <button
            type="button"
            onClick={() => {
              setCodigo(null);
              void cancelarCodigoDeWhatsApp();
            }}
            className="btn-quiet btn-sm -ml-3 font-normal text-slate-700"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div>
          {!whatsappDisponivel ? (
            <p className="text-[15px] text-slate-600">
              O canal de WhatsApp ainda está a ser preparado: poderá associar o número assim que abrir.
            </p>
          ) : cheio ? (
            <p className="text-[15px] text-slate-600">Já tem {maximo} números. Para associar outro, remova um.</p>
          ) : (
            <>
              <button type="button" onClick={associar} disabled={aPedir} className="btn-secondary">
                {aPedir ? 'A preparar…' : lista.length === 0 ? 'Associar um número' : 'Associar outro número'}
              </button>
              <p className="mt-2 text-[15px] text-slate-600">
                Confirma-se enviando uma mensagem desse número. Assim só recebe avisos quem tem o telemóvel na mão.
              </p>
            </>
          )}
        </div>
      )}
      {dialogo}
    </div>
  );
}
