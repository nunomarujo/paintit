import Link from 'next/link';
import { BRAND } from '@/config/brand';

export const metadata = {
  title: `O mercado que não se anuncia · ${BRAND.name}`,
  description:
    'Em 2026 o Estado contratou 62,5 milhões de euros em pintura, e dois terços foram entregues sem concurso nenhum. Os nomes dos convidados são públicos. O que isso vale, e o que não vale, a quem pinta.',
};

/**
 * Artigo público sobre a obra pública de pintura, a partir dos contratos do portal BASE.
 *
 * Serve três fins, por esta ordem: explicar um mercado que a maioria dos pintores não sabe que
 * existe; dizer com números o que a plataforma pode fazer nele; e **equalizar expectativas** antes
 * de alguém subscrever à espera do que isto não entrega. A terceira é a que mais importa — uma
 * ferramenta que promete convites e entrega silêncio perde o cliente e a confiança de uma vez.
 *
 * Os números são uma fotografia, não um cálculo ao vivo: a tabela dos contratos só é legível por
 * conta autenticada, e esta página é pública. Vêm todos de `public_contracts` e a data da medição
 * está escrita no texto. Para os actualizar, voltar a correr as contagens e mudar `MEDIDO` e as
 * constantes abaixo — e, se a percentagem de convite tiver caído muito, rever as frases, porque é
 * uma tendência a descer há quinze anos (ver docs/DECISOES.md, 26/10/2026).
 */
const MEDIDO = '26 de Outubro de 2026';

export default function ObraPublicaPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 text-[17px] leading-relaxed text-slate-800">
      <Link href="/" className="text-[15px] text-slate-600 hover:underline">
        ← {BRAND.name}
      </Link>

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,64ch)_280px] lg:items-start lg:gap-12">
      <article className="space-y-5">
        <header className="space-y-3 border-b border-slate-200 pb-7">
          <h1 className="text-[34px] font-semibold leading-tight text-slate-900">O mercado que não se anuncia</h1>
          <p className="text-[20px] leading-snug text-slate-600">
            Em 2026 o Estado português contratou 62,5 milhões de euros em obras de pintura. Dois terços foram entregues
            sem concurso nenhum — por convite directo a empresas que a entidade já conhecia. Os nomes dessas empresas
            são públicos e estão publicados há catorze anos. Quase ninguém os lê.
          </p>
        </header>

        <p>
          <strong className="font-semibold">
            Há um mercado de obra pública de pintura ao qual a maioria das empresas de pintura nunca concorre, porque
            não sabe que existe.
          </strong>{' '}
          Não é um mercado fechado por lei nem por corrupção: é um mercado em que a câmara, a junta de freguesia ou o
          hospital escolhem três ou quatro empresas, pedem preço e adjudicam — sem publicar anúncio, porque a lei não
          os obriga a publicá-lo. Quem não está na lista de quem é lembrado nunca chega a saber que a obra existiu.
          Este artigo explica o tamanho desse mercado, como se entra nele e — sobretudo — o que é razoável esperar de
          lá entrar.
        </p>

        <h2 className="pt-3 text-[20px] font-semibold text-slate-900">O que o Estado compra</h2>
        <p>
          Entre 2012 e 2026, entidades públicas portuguesas celebraram{' '}
          <strong className="font-semibold">9 393 contratos de empreitada de pintura, fachadas e isolamento</strong>, no
          total de <strong className="font-semibold">770,9 milhões de euros</strong>. Não são só câmaras: são juntas de
          freguesia, misericórdias, hospitais, universidades, empresas municipais de habitação, forças de segurança.
          Desde 2022, <strong className="font-semibold">795 entidades diferentes</strong> contrataram pintura — cerca de{' '}
          <strong className="font-semibold">556 contratos por ano</strong>, em todo o país.
        </p>
        <p>
          Não é um mercado enorme. É um mercado constante. Uma câmara de dimensão média contrata pintura várias vezes
          por ano, todos os anos, e continua a contratar quando o mercado privado arrefece. É esse o seu valor: não o
          tamanho, mas a regularidade.
        </p>

        <h2 className="pt-3 text-[20px] font-semibold text-slate-900">Como é entregue</h2>
        <p>
          Em 2012, <strong className="font-semibold">94%</strong> destes contratos foram adjudicados por ajuste directo
          ou consulta prévia — isto é, por convite, sem anúncio público. Em 2026 são{' '}
          <strong className="font-semibold">68%</strong>. A percentagem desce há quinze anos de forma consistente, e
          2026 é o valor mais baixo de toda a série.
        </p>
        <p>
          Duas leituras, e ambas interessam. A primeira: o mercado está a abrir-se, devagar. A segunda, mais útil: ainda
          hoje, de cada três obras públicas de pintura, duas são entregues a quem foi lembrado. Um alerta de concursos
          públicos — que é o que a maior parte das ferramentas do género oferece — dá acesso a um terço deste mercado e
          deixa dois terços de fora.
        </p>

        <h2 className="pt-3 text-[20px] font-semibold text-slate-900">A lista que ninguém lê</h2>
        <p>
          Quando uma entidade adjudica por convite, tem de publicar o contrato no Portal BASE, e com ele — na maior
          parte dos casos — os nomes das empresas que convidou. Essa informação é pública, é gratuita, e está
          disponível para descarregar em ficheiro.
        </p>
        <p>
          O problema é o volume. O ficheiro de 2026 tem{' '}
          <strong className="font-semibold">199 701 contratos</strong> de todo o tipo — estradas, software, limpeza,
          refeições — dos quais <strong className="font-semibold">478</strong> são de pintura. Ninguém abre isso à mão.
          É por isso que uma informação pública há catorze anos funciona, na prática, como informação privada.
        </p>
        <p className="text-slate-600">
          Uma ressalva honesta: a lista nem sempre lá está. Dos 326 contratos por convite de 2026, a entidade publicou
          quem convidou em 213 e não publicou em 113. Onde não há lista, não se sabe — e dizer o contrário seria
          inventar.
        </p>

        <h2 className="pt-3 text-[20px] font-semibold text-slate-900">Quem é convidado</h2>
        <p>
          A suposição natural é que existe um clube fechado. Os dados dizem que não, pelo menos à escala do país. Desde
          2022 foram convidadas <strong className="font-semibold">1 235 empresas diferentes</strong>, e{' '}
          <strong className="font-semibold">828 delas foram convidadas uma única vez</strong>. Dentro de cada entidade
          que convida com regularidade, a empresa mais chamada fica, em média, com apenas{' '}
          <strong className="font-semibold">24%</strong> dos convites. As entidades rodam.
        </p>
        <p>
          Isso é boa notícia para quem está de fora: a porta não está fechada, está apenas noutro sítio. Mas a média do
          país não é o sítio onde se trabalha, e localmente há excepções fortes. Há câmaras em que{' '}
          <strong className="font-semibold">21 dos 33 convites</strong> foram a uma empresa só. Nessas entidades, estar
          na lista não ajuda a ganhar a obra: decide-a.
        </p>
        <p>Saber de que tipo é a entidade do lado de casa muda o que vale a pena fazer. E isso lê-se nos dados.</p>

        <h2 className="pt-3 text-[20px] font-semibold text-slate-900">As contas, sem embelezar</h2>
        <p>
          Aqui está a parte que a maioria das ferramentas não escreve, e que é a razão de este artigo existir.
        </p>
        <p>
          Em todo o país há cerca de <strong className="font-semibold">977 lugares de convidado por ano</strong> — ou
          seja, 977 vezes em que uma empresa de pintura é chamada a dar preço numa obra pública sem concurso. Repartidos
          por todo o país e por milhares de empresas de pintura, <strong className="font-semibold">a
          probabilidade de uma empresa em concreto ser convidada num ano qualquer é baixa</strong>. Manifestar interesse
          junto de uma entidade não obriga ninguém a nada. Pode não haver resposta. Pode não haver obra. Pode haver obra
          daqui a catorze meses.
        </p>
        <p>
          Quem subscrever uma ferramenta destas à espera de um convite no mês seguinte vai ficar desiludido, e com
          razão. <strong className="font-semibold">Isto não é um gerador de trabalho. É um bilhete de rifa barato, numa
          rifa que ninguém mais na zona se deu ao trabalho de comprar.</strong>
        </p>

        <h2 className="pt-3 text-[20px] font-semibold text-slate-900">O que a plataforma faz</h2>
        <p>
          O trabalho que separa um pintor de estar nessa lista não é difícil — é maçador, e é por isso que quase
          ninguém o faz. É preciso descobrir que entidades contratam pintura no seu concelho, com que frequência e por
          que valores; perceber quais convidam sempre as mesmas empresas e quais rodam; encontrar o contacto certo;
          escrever uma carta que não pareça circular; juntar o alvará, a certidão e duas fotografias de obra feita; e
          repetir isto com alguma regularidade, sem retorno visível a curto prazo.
        </p>
        <p>
          <strong className="font-semibold">
            O que a plataforma faz é identificar as ocasiões que fazem sentido e preparar tudo o resto.
          </strong>{' '}
          Lê os contratos publicados todas as semanas, isola os de pintura, mostra quem contrata à volta de cada empresa
          e com que hábitos, e prepara a manifestação de interesse já dirigida àquela entidade, com os documentos
          anexados e os números certos — incluindo quantas obras de pintura aquela entidade contratou e por que valores,
          que é o que torna uma carta credível em vez de genérica. Ao pintor resta ler, aprovar e enviar.
        </p>
        <p>
          Poucas e dirigidas, nunca em massa: trinta cartas iguais para trinta câmaras é publicidade não solicitada e
          estraga o nome de quem a envia. Quatro cartas certas, enviadas no momento em que há uma obra acabada para
          mostrar, são outra coisa.
        </p>

        <h2 className="pt-3 text-[20px] font-semibold text-slate-900">O que não se promete</h2>
        <p>
          Não se promete um convite. Não se promete resposta. Não se promete prazo. Nenhuma entidade é obrigada a
          convidar seja quem for, e a plataforma não tem — nem quer ter — influência nessa escolha.
        </p>
        <p>
          O que se promete é que o trabalho fica feito: que alguém leu os 199 701 contratos por si, que a carta está
          escrita e correcta, e que, quando a entidade do lado de casa for escolher a quem pedir preço, o seu nome já
          lá passou pelo menos uma vez. Para quem nunca trabalhou para o Estado, esse é o passo inteiro que falta.
        </p>
        <p className="border-l-2 border-slate-300 pl-4 text-slate-700">
          O esforço, para o pintor, é assinar e enviar. A recompensa possível é uma obra pública por ano que de outro
          modo nunca teria sabido que existia. É uma aposta de custo quase nulo e retorno incerto. Fica dito assim, e
          não de outra maneira, para que ninguém a compre a pensar que é outra coisa.
        </p>

        <footer className="border-t border-slate-200 pt-6 text-[15px] leading-relaxed text-slate-600">
          <p>
            Todos os números deste artigo foram medidos a {MEDIDO} sobre os contratos publicados no Portal BASE,
            através do conjunto de dados aberto do IMPIC em dados.gov.pt, que é de domínio público e actualizado
            semanalmente. Abrange contratos de empreitada classificados como de pintura, fachadas ou isolamento entre
            2012 e 2026. Onde a entidade adjudicante não publicou a lista de convidados, isso é contado à parte e nunca
            somado aos convites a várias empresas.
          </p>
        </footer>
      </article>

      {/* Os números ficavam enterrados no meio dos parágrafos, com meio ecrã vazio ao lado. Aqui
          lêem-se de relance, ao lado do texto que os explica. No telemóvel vêm no fim, que é onde
          fazem sentido depois de se ter lido o artigo. */}
      <aside className="mt-10 rounded-2xl border border-slate-200 bg-white px-5 py-5 lg:sticky lg:top-6 lg:mt-0">
        <p className="eyebrow">Em números</p>
        <dl className="mt-3 space-y-3.5">
          {[
            ['62,5 M€', 'contratados pelo Estado em pintura, em 2026'],
            ['68%', 'entregues por convite, sem anúncio público'],
            ['94% → 68%', 'a queda do convite directo em quinze anos'],
            ['9 393', 'contratos de pintura entre 2012 e 2026'],
            ['795', 'entidades públicas que contratam pintura'],
            ['199 701', 'contratos no ficheiro de 2026, para encontrar 478 de pintura'],
            ['828 de 1 235', 'empresas convidadas uma única vez desde 2022'],
            ['977', 'lugares de convidado por ano, em todo o país'],
          ].map(([n, t]) => (
            <div key={n}>
              <dt className="text-[20px] font-semibold leading-none tabular-nums text-slate-900">{n}</dt>
              <dd className="mt-1 text-[15px] leading-snug text-slate-600">{t}</dd>
            </div>
          ))}
        </dl>
      </aside>
      </div>
    </main>
  );
}
