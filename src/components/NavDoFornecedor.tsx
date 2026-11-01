'use client';

import { usePathname } from 'next/navigation';
import { AppNav, type NavGroup } from '@/components/AppNav';
import { SeletorDeContexto } from '@/components/SeletorDeContexto';
import { contextoDoCaminho } from '@/domain/workspaceFornecedor';

/**
 * A navegação de uma conta de fornecedor: o seletor de contexto e os destinos do contexto em que se está.
 *
 * Os dois conjuntos vêm prontos do servidor e a escolha faz-se aqui, porque o endereço atual só existe do
 * lado do cliente. Mandar os dois não custa nada — são duas listas de meia dúzia de linhas — e evita que
 * trocar de contexto tenha de ir ao servidor buscar o menu.
 */
export function NavDoFornecedor({ vendas, avaliacoes }: { vendas: NavGroup[]; avaliacoes: NavGroup[] }) {
  const contexto = contextoDoCaminho(usePathname());
  return (
    <>
      <SeletorDeContexto />
      <AppNav groups={contexto === 'avaliacoes' ? avaliacoes : vendas} />
    </>
  );
}
