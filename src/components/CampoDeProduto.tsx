'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { PRODUCT_TYPE_LABELS } from '@/domain/catalog';
import { sugestoesDeProduto, type ProdutoSugerivel } from '@/domain/produtoSugerido';

/**
 * Escrever o produto com o catálogo a ajudar, sem deixar de ser texto livre.
 *
 * Quem o usa está numa obra, de telemóvel, muitas vezes de luva. Daí o desenho:
 *
 * - as sugestões aparecem **antes de se escrever** quando a obra já tem produtos orçamentados —
 *   um toque e está feito;
 * - escolher escreve o nome canónico no campo, e o campo continua a aceitar o que se queira:
 *   quem aplicou algo que não está no catálogo escreve-o à mesma;
 * - as setas e o Enter percorrem a lista, porque no computador ninguém quer tirar a mão do teclado;
 * - a lista fecha-se sozinha quando o que está escrito já é igual a um produto do catálogo — é esse
 *   o sinal de que ficou arrumado.
 *
 * Tudo em memória: a lista chega com o ecrã. Numa obra a rede falha, e um campo que precisa do
 * servidor para sugerir é um campo que não sugere nada no único sítio onde é usado.
 */
export function CampoDeProduto({
  name,
  label,
  placeholder,
  defaultValue,
  candidatos,
  className,
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  candidatos: ProdutoSugerivel[];
  className?: string;
}) {
  const [valor, setValor] = useState(defaultValue ?? '');
  const [aberto, setAberto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const listaId = useId();
  const fechar = useRef<number | undefined>(undefined);
  const campo = useRef<HTMLInputElement>(null);

  // Este campo é controlado pelo React, e `form.reset()` não lhe toca — o formulário do diário
  // limpa-se sozinho depois de cada fotografia (`resetOnSuccess`), e sem isto o produto da anterior
  // ficava lá escrito, pronto a ser gravado outra vez sem ninguém reparar.
  useEffect(() => {
    const form = campo.current?.form;
    if (!form) return;
    const limpar = () => {
      setValor(defaultValue ?? '');
      setAberto(false);
      setActivo(-1);
    };
    form.addEventListener('reset', limpar);
    return () => form.removeEventListener('reset', limpar);
  }, [defaultValue]);

  const sugestoes = useMemo(() => sugestoesDeProduto(valor, candidatos), [valor, candidatos]);
  const mostrar = aberto && sugestoes.length > 0;

  const escolher = (s: ProdutoSugerivel) => {
    setValor(s.label);
    setAberto(false);
    setActivo(-1);
  };

  const teclas = (ev: React.KeyboardEvent) => {
    if (!mostrar) return;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      setActivo((i) => {
        const n = sugestoes.length;
        return ev.key === 'ArrowDown' ? (i + 1) % n : (i <= 0 ? n : i) - 1;
      });
    } else if (ev.key === 'Enter' && activo >= 0) {
      // Só rouba o Enter quando há uma sugestão escolhida: de outro modo o formulário deixava de
      // se enviar com o teclado, que é pior do que não haver sugestões nenhumas.
      ev.preventDefault();
      escolher(sugestoes[activo]!);
    } else if (ev.key === 'Escape') {
      setAberto(false);
      setActivo(-1);
    }
  };

  return (
    <div className={`relative ${className ?? ''}`}>
      <label className="block text-[17px]">
        {label}
        <input
          ref={campo}
          name={name}
          value={valor}
          autoComplete="off"
          placeholder={placeholder}
          onChange={(ev) => {
            setValor(ev.target.value);
            setAberto(true);
            setActivo(-1);
          }}
          onFocus={() => setAberto(true)}
          // O toque numa sugestão tira o foco do campo antes de o clique chegar; o adiamento deixa-o chegar.
          onBlur={() => {
            fechar.current = window.setTimeout(() => setAberto(false), 150);
          }}
          onKeyDown={teclas}
          role="combobox"
          aria-expanded={mostrar}
          aria-controls={listaId}
          aria-autocomplete="list"
          className="mt-1 campo"
        />
      </label>
      {mostrar && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {sugestoes.map((s, i) => (
            <li key={`${s.origem}-${s.label}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === activo}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => {
                  window.clearTimeout(fechar.current);
                  escolher(s);
                }}
                className={`flex min-h-[44px] w-full flex-col justify-center px-3 py-1.5 text-left text-[17px] ${
                  i === activo ? 'bg-tinta-50' : 'hover:bg-slate-50'
                }`}
              >
                <span className="font-medium">{s.label}</span>
                <span className="text-[15px] text-slate-500">
                  {s.origem === 'obra' ? 'Orçamentado nesta obra · ' : ''}
                  {PRODUCT_TYPE_LABELS[s.tipo]}
                  {s.detalhe ? ` · ${s.detalhe}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
