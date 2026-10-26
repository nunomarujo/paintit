import Link from 'next/link';

const options = [
  {
    href: '/app/organizacoes/nova?perfil=cliente',
    title: 'Preciso de pintar',
    who: 'Administração de condomínio, condomínio ou particular',
    text: 'Descreve a obra, recebe propostas comparáveis de pintores verificados e assina o contrato.',
  },
  {
    href: '/app/organizacoes/nova?tipo=pintor',
    title: 'Sou pintor',
    who: 'Empresa de pintura ou empresário em nome individual',
    text: 'Vê obras na sua zona, orçamenta e, se for escolhido, assina o contrato.',
  },
  {
    href: '/app/organizacoes/nova?tipo=fornecedor',
    title: 'Vendo tintas e materiais',
    who: 'Fornecedor ou revendedor',
    text: 'Põe os seus produtos e descontos à frente dos pintores quando orçamentam.',
  },
];

// Primeiro ecrã de uma conta nova: o perfil escolhe-se uma vez e não se mistura (docs/DECISOES.md).
export default function StartPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-[26px] leading-tight font-semibold">Bem-vindo à Quem Pinta</h1>
      <p className="mt-2 text-[17px] text-slate-600">
        Como vai usar a plataforma? Cada conta tem um só perfil: para usar outro, crie outra conta com outro email.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {options.map((o) => (
          <li key={o.href}>
            <Link href={o.href} className="block h-full rounded-2xl border border-slate-200 bg-white p-5 hover:border-tinta-600">
              <span className="block text-[20px] font-semibold text-tinta-700">{o.title}</span>
              <span className="mt-1 block text-[15px] text-slate-500">{o.who}</span>
              <span className="mt-3 block text-[17px] text-slate-700">{o.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
