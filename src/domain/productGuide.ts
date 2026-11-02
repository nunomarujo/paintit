import type { ProductType } from './catalog';

// Resumos do produto (CMP-05): "para que serve", "como se aplica" e "sugestões", pedidos pelo Nuno
// para aparecerem em botões na ficha de cada produto de referência (02/11/2026). Em vez de guardar
// texto escrito à mão por produto — 90+ fichas, sem ninguém a validar cada uma — o texto é gerado por
// tipo de produto e preenchido com os números reais da própria ficha (demãos, secagem, rendimento,
// espessura, condutividade térmica). Nunca inventa um número que a ficha não tenha: quando o campo
// está em branco, a frase recua para "confirmar na ficha técnica" em vez de adivinhar.

export interface ProductGuideInput {
  tipo: ProductType;
  acabamento: string | null;
  uso: string | null;
  demaos: string | null;
  diluicao: string | null;
  secagemHoras: number | null;
  rendimentoM2L: number | null;
  espessurasMm: number[];
  condutividadeTermicaWMk: number | null;
  reacaoFogo: string | null;
}

export interface ProductGuide {
  paraQueServe: string;
  comoAplicar: string;
  sugestoes: string;
}

const FICHA = 'ver a ficha técnica do fabricante';

function fraseDemaos(demaos: string | null): string {
  return demaos ? `em ${demaos}` : `no número de demãos indicado na ficha técnica`;
}

function fraseSecagem(secagemHoras: number | null): string {
  return secagemHoras
    ? `respeitando ${secagemHoras.toLocaleString('pt-PT')}h de secagem entre demãos`
    : `respeitando o tempo de secagem entre demãos indicado na ficha técnica`;
}

function fraseDiluicao(diluicao: string | null): string | null {
  return diluicao ? `Diluir ${diluicao}.` : null;
}

function fraseRendimento(rendimentoM2L: number | null): string | null {
  return rendimentoM2L
    ? `O rendimento desta tinta (${rendimentoM2L.toLocaleString('pt-PT')} m²/L por demão, nos Detalhes acima) ajuda a estimar a quantidade necessária para a área a pintar.`
    : null;
}

function placas(input: ProductGuideInput, variante: string): ProductGuide {
  const espessura = input.espessurasMm.length
    ? `${input.espessurasMm.map((e) => e.toLocaleString('pt-PT')).join(' / ')} mm`
    : null;
  const condutividade = input.condutividadeTermicaWMk ? `λ = ${input.condutividadeTermicaWMk.toLocaleString('pt-PT')} W/(m·K)` : null;
  return {
    paraQueServe: `Placa de isolamento térmico para sistemas de isolamento térmico pelo exterior (ETICS, conhecido em Portugal como "capoto"). ${variante}`,
    comoAplicar: [
      'Colar as placas à parede com a argamassa própria do sistema, com as juntas desalinhadas entre filas (como numa alvenaria), e fixar mecanicamente com buchas para capoto assim que a cola secar.',
      espessura || condutividade
        ? `${espessura ? `A espessura desta placa (${espessura})` : 'A espessura'}${espessura && condutividade ? ' e a condutividade térmica' : condutividade ? 'A condutividade térmica' : ''}${condutividade ? ` (${condutividade})` : ''} determinam o desempenho de isolamento conseguido.`
        : `A espessura e a condutividade térmica determinam o desempenho de isolamento conseguido — ${FICHA}.`,
    ].join(' '),
    sugestoes: [
      input.reacaoFogo
        ? `Confirmar junto do projeto térmico se a reação ao fogo indicada (${input.reacaoFogo}) cumpre o exigido para esta obra.`
        : `Confirmar a reação ao fogo junto do fabricante antes de aplicar, sobretudo em edifícios com regras mais exigentes.`,
      'Este produto usa-se normalmente junto com um fixador (bucha), uma rede de fibra de vidro e um reboco próprios para capoto — ver "Para usar na mesma obra" acima.',
    ].join(' '),
  };
}

/** Texto gerado a partir dos campos reais da ficha — nunca inventa números que a ficha não tenha. */
export function productGuide(input: ProductGuideInput): ProductGuide {
  switch (input.tipo) {
    case 'tinta_exterior':
      return {
        paraQueServe: `Tinta para superfícies exteriores — fachadas, muros e outras zonas expostas à chuva, ao sol e às variações de temperatura.${
          input.uso ? ` Indicada para ${input.uso}.` : ''
        }`,
        comoAplicar: [fraseDiluicao(input.diluicao), `Aplicar ${fraseDemaos(input.demaos)}, ${fraseSecagem(input.secagemHoras)}.`]
          .filter(Boolean)
          .join(' '),
        sugestoes: [
          'Preferir dias sem chuva prevista, com temperaturas amenas e sem sol direto ou vento forte durante a secagem.',
          'Proteger caixilharias, pavimento e vegetação antes de começar; limpar e, se necessário, lixar a superfície antes da primeira demão.',
          fraseRendimento(input.rendimentoM2L),
        ]
          .filter(Boolean)
          .join(' '),
      };

    case 'tinta_interior':
      return {
        paraQueServe: `Tinta para paredes e tetos de interiores.${input.uso ? ` Indicada para ${input.uso}.` : ''}`,
        comoAplicar: [fraseDiluicao(input.diluicao), `Aplicar ${fraseDemaos(input.demaos)}, ${fraseSecagem(input.secagemHoras)}.`]
          .filter(Boolean)
          .join(' '),
        sugestoes: [
          'Arejar bem a divisão durante e depois da aplicação; proteger pavimento, rodapés e mobiliário antes de começar.',
          fraseRendimento(input.rendimentoM2L),
        ]
          .filter(Boolean)
          .join(' '),
      };

    case 'primario':
      return {
        paraQueServe:
          'Primário/isolante aplicado antes da tinta final, para uniformizar a absorção da superfície, melhorar a aderência da demão seguinte e fixar poeiras ou manchas.',
        comoAplicar: [fraseDiluicao(input.diluicao), `Aplicar ${fraseDemaos(input.demaos)}, ${fraseSecagem(input.secagemHoras)}.`]
          .filter(Boolean)
          .join(' '),
        sugestoes:
          'Aplicar sobre superfície seca, limpa e sem poeiras; respeitar o tempo de secagem antes da demão seguinte, mesmo que a superfície pareça seca ao tato.',
      };

    case 'impermeabilizante':
      return {
        paraQueServe:
          'Produto para impedir a entrada de água em zonas expostas (terraços, varandas, paredes húmidas), aplicado antes do acabamento final.',
        comoAplicar: [fraseDiluicao(input.diluicao), `Aplicar ${fraseDemaos(input.demaos)}, ${fraseSecagem(input.secagemHoras)}.`]
          .filter(Boolean)
          .join(' '),
        sugestoes:
          'Garantir continuidade nos encontros com paredes e remates (sem interrupções nem zonas finas); respeitar o tempo de cura completo antes de pôr a zona em uso, mesmo que a camada pareça seca.',
      };

    case 'esmalte':
      return {
        paraQueServe:
          'Acabamento para metais e madeiras — portas, janelas, grades, mobiliário de exterior — que acrescenta uma camada protetora e o brilho escolhido.',
        comoAplicar: [fraseDiluicao(input.diluicao), `Aplicar ${fraseDemaos(input.demaos)}, ${fraseSecagem(input.secagemHoras)}.`]
          .filter(Boolean)
          .join(' '),
        sugestoes:
          'Lixar ligeiramente entre demãos para melhorar a aderência; aplicar em camadas finas para evitar pingos e escorridos; garantir boa ventilação durante a secagem.',
      };

    case 'massa_reparacao':
      return {
        paraQueServe: 'Massa para preencher fissuras, buracos e irregularidades na superfície, antes de pintar.',
        comoAplicar:
          'Aplicar com espátula em camadas finas, deixar secar por completo e lixar até à superfície ficar lisa e nivelada, antes da demão de primário ou de tinta.',
        sugestoes:
          'Em fissuras ou buracos maiores, preferir duas ou mais camadas finas a uma só camada grossa — reduz o risco de a massa retrair e voltar a fissurar.',
      };

    case 'isolamento_eps':
      return placas(input, 'O EPS (poliestireno expandido, por vezes chamado "esferovite") é a opção mais comum e económica deste sistema.');

    case 'isolamento_eps_grafitado':
      return placas(
        input,
        'O EPS grafitado tem a grafite incorporada, que lhe dá um desempenho térmico melhor do que o EPS comum com a mesma espessura.',
      );

    case 'isolamento_xps':
      return placas(
        input,
        'O XPS (poliestireno extrudido) resiste melhor à humidade e à compressão do que o EPS, por isso é preferido em zonas mais expostas ou de maior exigência mecânica, como socos.',
      );

    case 'isolamento_la_mineral':
      return placas(
        input,
        'A lã mineral (rocha) tem melhor comportamento ao fogo do que os isolantes à base de plástico, o que pode ser exigido em certos edifícios.',
      );

    case 'isolamento_cortica':
      return placas(
        input,
        'A cortiça (ICB) é um isolante natural, usado sobretudo quando se procura um material de origem renovável.',
      );

    case 'fixador_capoto':
      return {
        paraQueServe:
          'Buchas/fixadores mecânicos que reforçam a colagem das placas de isolamento ao suporte, sobretudo em alturas ou suportes menos firmes.',
        comoAplicar:
          'Aplicar depois de a cola das placas secar, furando através da placa até ao suporte e fixando com o comprimento adequado à espessura do isolamento usado.',
        sugestoes:
          'O comprimento certo da bucha depende da espessura da placa de isolamento e do tipo de suporte (betão, alvenaria) — confirmar junto do fabricante do sistema antes de encomendar.',
      };

    case 'rede_fibra_vidro':
      return {
        paraQueServe: 'Rede/malha de fibra de vidro embebida na primeira camada de reboco do sistema de capoto, para evitar fissuras e reforçar o conjunto.',
        comoAplicar:
          'Aplicar embebida na camada de base do reboco, com sobreposição entre tiras, antes de aplicar a camada de acabamento.',
        sugestoes:
          'Reforçar com uma segunda camada de rede nos cantos de vãos (janelas, portas) e nos primeiros metros a partir do solo — zonas de maior risco de impacto.',
      };

    case 'reboco_capoto':
      return {
        paraQueServe:
          'Reboco delgado para sistemas de capoto (ETICS), aplicado sobre o isolamento com a rede de fibra de vidro embebida, como camada de base e/ou de acabamento.',
        comoAplicar:
          'Aplicar em camada fina sobre a placa de isolamento, embebendo nela a rede de fibra de vidro, e deixar secar antes da camada de acabamento ou da pintura final.',
        sugestoes: 'Evitar aplicar em dias de chuva ou com risco de geada; proteger a superfície recém-aplicada durante a secagem.',
      };

    case 'outro':
    default:
      return {
        paraQueServe: `Consultar a ficha técnica do fabricante para saber para que serve este produto.`,
        comoAplicar: `Consultar a ficha técnica do fabricante para saber como aplicar este produto.`,
        sugestoes: `Consultar a ficha técnica do fabricante antes de usar este produto.`,
      };
  }
}
