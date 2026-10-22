import { redirect } from 'next/navigation';

// A validação passou para o backoffice (Entidades e Pedidos).
export default function ValidationRedirect() {
  redirect('/app/backoffice/entidades');
}
