/**
 * Ícones da barra lateral: traço simples, no mesmo espírito do prédio em BrandMark.tsx — nunca um
 * conjunto de terceiros (sem dependência nova). Um por item de navegação, para ler a lista pela
 * forma antes de ler o texto.
 *
 * Traços exactos do caderno de desenho da interface (26/10/2026, protótipo do promotor:
 * QuemPinta_Desenho_Interface.html, secção "Ícones SVG desenhados à mão"): viewBox 24×24, traço
 * 1.8. Uma só fonte de verdade — não se desenha um segundo conjunto parecido.
 */
import type { SVGProps } from 'react';

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
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

/** home — Início */
export const IconHome = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="m3 10 9-7 9 7v10H3Z" />
    <path d="M9 20v-7h6v7" />
  </Icon>
);

/** work — Gestão de obra */
export const IconWork = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M3 21V7h10v14M13 12h8v9M6 10h4M6 14h4M6 18h4M16 15h2M16 18h2" />
  </Icon>
);

/** search — Oportunidades (ganhar obra) */
export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="10" cy="10" r="6" />
    <path d="m15 15 6 6" />
  </Icon>
);

/** public — Obra pública */
export const IconPublic = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="m3 8 9-5 9 5H3Zm0 13h18M5 10v8m7-8v8m7-8v8" />
  </Icon>
);

/** quote — Orçamentos, Pedidos de orçamento, Encomendas, Produtos e descontos */
export const IconQuote = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M5 3h11l3 3v15H5Z" />
    <path d="M9 9h6m-6 4h6m-6 4h4" />
  </Icon>
);

/** contract — Contratações */
export const IconContract = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M5 3h14v18H5Z" />
    <path d="M9 8h6m-6 4h6m-7 5 2 1 4-3" />
  </Icon>
);

/** box — Catálogo de materiais, Armazém e consumíveis, Levantamentos */
export const IconBox = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 5 9-5M12 12v9M8 5l9 5" />
  </Icon>
);

/** team — Clientes (fornecedor) */
export const IconTeam = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="9" cy="7" r="3" />
    <path d="M3 21v-4a6 6 0 0 1 12 0v4M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2" />
  </Icon>
);

/** expense — Comissões de adesão */
export const IconExpense = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M5 3h14v18l-3-2-4 2-4-2-3 2Z" />
    <path d="M9 7h6M9 11h6M9 15h3" />
  </Icon>
);

/** user — Empresa e conta (rodapé) */
export const IconUser = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="12" cy="7" r="4" />
    <path d="M4 21v-3a8 8 0 0 1 16 0v3" />
  </Icon>
);

/** check — confirmação, estado concluído */
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="m5 12 4 4L19 6" />
  </Icon>
);

/** camera — fotografar o trabalho */
export const IconCamera = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M3 7h5l2-3h4l2 3h5v13H3Z" />
    <circle cx="12" cy="13" r="4" />
  </Icon>
);

/** clock — data/hora */
export const IconClock = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6v6l4 2" />
  </Icon>
);

/** arrow — ver mais, avançar */
export const IconArrow = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 12h16m-6-6 6 6-6 6" />
  </Icon>
);

/** alert — atenção */
export const IconAlert = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="m12 3 10 18H2Zm0 6v5m0 2v2" />
  </Icon>
);

// Ícones do backoffice (equipa da plataforma): fora do âmbito do caderno de desenho (26/10/2026,
// "O backoffice da plataforma está fora do âmbito") — mantém-se o conjunto anterior, à parte.
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
 *
 * Nomes actualizados a par do conjunto de ícones do caderno de desenho da interface (mesmo dia,
 * sessão seguinte): os nomes seguem agora os ícones novos (`IconWork`, `IconPublic`, `IconQuote`,
 * `IconContract`, `IconTeam`, `IconExpense`), não os que a correcção original tinha mapeado.
 */
/* Cadeado e folha: entraram a 28/10/2026 para substituir os caracteres 🔒 e ▤ que o Workspace
   escrevia como texto — um emoji e um glifo de caixa não têm o traço deste conjunto nem o
   acompanham quando muda. Mesmo viewBox e mesma espessura dos restantes. */
function IconLock(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </Icon>
  );
}

function IconSheet(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5Z" />
      <path d="M14 3.5v4h4M9 12.5h6M9 16h4" />
    </Icon>
  );
}

/* Seta de voltar: substitui o carácter ←, que estava escrito como texto em 30 ecrãs. Uma seta de
   texto desenha-se com a fonte do sistema — não tem o traço deste conjunto, não alinha com os
   ícones ao lado e muda de forma conforme o aparelho (28/10/2026). */
function IconBack(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M15 5 8 12l7 7" />
    </Icon>
  );
}

/* Aviso e fechar: o ⚠ e o ✕ estavam escritos como texto. O ⚠ é pior do que uma seta — em vários
   sistemas o tipo de letra substitui-o por um emoji amarelo, que entra na página com uma cor que
   não é da paleta e não obedece ao `text-amber-*` ao lado (28/10/2026). */
function IconWarn(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 4.5 2.8 20h18.4L12 4.5Z" />
      <path d="M12 10v4.5M12 17.2v.1" />
    </Icon>
  );
}

function IconClose(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export const ICONES = {
  casa: IconHome,
  voltar: IconBack,
  aviso: IconWarn,
  fechar: IconClose,
  cadeado: IconLock,
  folha: IconSheet,
  recibo: IconQuote,
  capacete: IconWork,
  caixa: IconBox,
  lupa: IconSearch,
  publico: IconPublic,
  documento: IconContract,
  pessoas: IconTeam,
  percentagem: IconExpense,
  mostrador: IconGauge,
  entrada: IconInbox,
  predio: IconBuilding,
  balanca: IconScale,
  calculadora: IconCalculator,
  servidor: IconServer,
} as const;

export type NomeDeIcone = keyof typeof ICONES;
