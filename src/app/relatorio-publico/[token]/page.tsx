import { notFound } from 'next/navigation';
import { BrandMark } from '@/components/BrandMark';
import Link from 'next/link';
import { RelatorioCongeladoView } from '@/components/RelatorioCongeladoView';
import { BRAND } from '@/config/brand';
import { reconstroiFicha, linhaDeFicha, enderecoPublico, type DadosDaFichaGuardada } from '@/domain/relatorioCongelado';
import { qrCodeSvg } from '@/lib/qrcode';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: `Relatório de propostas, verificado — ${BRAND.name}` };

/**
 * Leitura pública, sem conta, do relatório de propostas pelo código QR ou pelo link — a mesma
 * fotografia que a assembleia recebe em papel, para quem não tem conta na plataforma (um condómino).
 * Mostra exactamente o que a versão interna mostra: nunca a identidade do pintor.
 *
 * Único ponto da aplicação pensado para ser aberto sem sessão: a porta é só o token (longo, aleatório,
 * nunca listado), verificado inteiramente dentro de `public.relatorio_publico` — esta página não lê
 * nenhuma tabela directamente.
 */
export default async function RelatorioPublicoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc('relatorio_publico', { p_token: token });
  const linha = data?.[0];
  if (!linha) notFound();

  const fichasGuardadas = (linha.fichas as unknown as { numero: number; codigoPagina: string; dados: DadosDaFichaGuardada }[]) ?? [];
  const fichas = fichasGuardadas.map(reconstroiFicha).sort((a, b) => a.numero - b.numero);
  const linhas = fichas.map(linhaDeFicha);
  const link = enderecoPublico(BRAND.domain, token);
  const qrSvg = qrCodeSvg(link, 'Código QR do relatório público de propostas');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="print:hidden border-b border-slate-200 bg-white px-4 py-4">
        <Link href="/" className="inline-block">
          <BrandMark />
        </Link>
      </header>
      <main className="px-4 py-8">
        <div className="print:hidden mx-auto mb-5 max-w-[210mm] rounded-2xl border border-slate-200 bg-white p-5">
          <p className="eyebrow">Verificação pública</p>
          <h1 className="mt-1 text-[20px] font-semibold">Relatório de propostas — fotografia congelada</h1>
          <p className="mt-2 text-[17px] text-slate-600">
            Esta página mostra a mesma fotografia distribuída em papel à assembleia, sem alterações desde que foi
            gerada. Não é preciso conta nem sessão para a abrir — só este código QR ou ligação, que não é adivinhável
            nem fica listado em lugar nenhum.
          </p>
        </div>
        <RelatorioCongeladoView
          titulo="Relatório de propostas"
          ref={linha.codigo_obra}
          codigoObra={linha.codigo_obra}
          numeroDePropostas={linha.numero_de_propostas}
          avisoDeIntegridade={linha.aviso_integridade}
          geradoEm={linha.gerado_em}
          linhas={linhas}
          fichas={fichas}
          qrSvg={qrSvg}
          link={link}
        />
      </main>
    </div>
  );
}
