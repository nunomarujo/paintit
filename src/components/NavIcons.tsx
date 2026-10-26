/**
 * Ícones da barra lateral: traço simples, no mesmo espírito do prédio em BrandMark.tsx — nunca um
 * conjunto de terceiros (sem dependência nova). Um por item de navegação, para ler a lista por forma
 * antes de ler o texto (reorganização de 26/10/2026, docs/DECISOES.md).
 */
import type { SVGProps } from 'react';

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-[18px] w-[18px] shrink-0"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 11.5 12 4l8 7.5" />
    <path d="M6 10v9.5a.5.5 0 0 0 .5.5H10v-6h4v6h3.5a.5.5 0 0 0 .5-.5V10" />
  </Icon>
);

export const IconClipboard = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" />
    <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
  </Icon>
);

export const IconFlag = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 21V4" />
    <path d="M6 5h11l-3 4 3 4H6" />
  </Icon>
);

export const IconReceipt = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 3h12v17l-2-1.3L14 20l-2-1.3L10 20l-2-1.3L6 20V3Z" />
    <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5" />
  </Icon>
);

export const IconDocCheck = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 3h8l4 4v14H6Z" />
    <path d="M14 3v4h4" />
    <path d="m9 14.3 2 2 4-4.3" />
  </Icon>
);

export const IconBox = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="m3.5 7 8.5-4 8.5 4-8.5 4-8.5-4Z" />
    <path d="M3.5 7v10l8.5 4 8.5-4V7" />
    <path d="M12 11v10" />
  </Icon>
);

export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="10" cy="10" r="6" />
    <path d="m14.5 14.5 5 5" />
    <path d="M8 10h4M10 8v4" />
  </Icon>
);

export const IconRoller = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="2.5" y="4" width="11" height="5" rx="1.2" />
    <path d="M8 9v3" />
    <path d="M8 12h3a2 2 0 0 1 2 2v2" />
    <rect x="11.5" y="16" width="4" height="5" rx="1" />
  </Icon>
);

export const IconHardHat = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 16a8 8 0 0 1 16 0Z" />
    <path d="M2 16h20" />
    <path d="M12 8V5" />
  </Icon>
);

export const IconCard = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="M3 10h18" />
    <path d="M6.5 14.5h4" />
  </Icon>
);

export const IconLink = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M9.5 14.5 14.5 9.5" />
    <path d="M11 7.5 13 5.5a3 3 0 0 1 4.2 4.2L15.2 11.7" />
    <path d="M13 16.5 11 18.5a3 3 0 0 1-4.2-4.2l2-2" />
  </Icon>
);

export const IconTag = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M3 11.5 11.5 3H19a2 2 0 0 1 2 2v7.5L12.5 21 3 11.5Z" />
    <circle cx="15.5" cy="8.5" r="1.3" />
  </Icon>
);

export const IconUsers = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <circle cx="17" cy="9" r="2.3" />
    <path d="M15.5 20a4.3 4.3 0 0 1 6-4" />
  </Icon>
);

export const IconPercent = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="7" cy="7" r="2" />
    <circle cx="17" cy="17" r="2" />
    <path d="M18 6 6 18" />
  </Icon>
);

export const IconGauge = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 16a8 8 0 1 1 16 0" />
    <path d="M12 16 16 10" />
    <path d="M12 16h.01" />
  </Icon>
);

export const IconInbox = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 12h4.5l1.5 3h4l1.5-3H20" />
    <path d="M4 12 6 5h12l2 7v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
  </Icon>
);

export const IconBuilding = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
    <path d="M10 21v-4h4v4" />
  </Icon>
);

export const IconScale = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 3v15" />
    <path d="M6 7h12" />
    <path d="M6 7 3.5 12a2.5 2.5 0 0 0 5 0Z" />
    <path d="M18 7l-2.5 5a2.5 2.5 0 0 0 5 0Z" />
    <path d="M8 21h8" />
  </Icon>
);

export const IconCalculator = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M8 7h8" />
    <path d="M8 11h.01M12 11h.01M16 11h.01M8 14.5h.01M12 14.5h.01M16 14.5h.01M8 18h.01M12 18h.01M16 18h.01" />
  </Icon>
);

export const IconServer = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="4" y="4" width="16" height="6" rx="1.3" />
    <rect x="4" y="14" width="16" height="6" rx="1.3" />
    <path d="M7.5 7h.01M7.5 17h.01" />
  </Icon>
);

/**
 * Os ícones por nome, para a navegação os poder pedir por uma string.
 *
 * O `layout.tsx` é componente de servidor e o `AppNav` é de cliente. Passar o componente do ícone
 * directamente de um para o outro atira em execução — *"Functions cannot be passed directly to
 * Client Components"* —, e atirava em **todas** as páginas da aplicação (produção em baixo a
 * 26/10/2026, 12:49). Uma função não atravessa essa fronteira; uma string atravessa. O servidor diz
 * o nome, o cliente procura-o aqui.
 */
export const ICONES = {
  casa: IconHome,
  prancheta: IconClipboard,
  bandeira: IconFlag,
  recibo: IconReceipt,
  documento: IconDocCheck,
  caixa: IconBox,
  lupa: IconSearch,
  rolo: IconRoller,
  capacete: IconHardHat,
  cartao: IconCard,
  elo: IconLink,
  etiqueta: IconTag,
  pessoas: IconUsers,
  percentagem: IconPercent,
  mostrador: IconGauge,
  entrada: IconInbox,
  predio: IconBuilding,
  balanca: IconScale,
  calculadora: IconCalculator,
  servidor: IconServer,
} as const;

export type NomeDeIcone = keyof typeof ICONES;
