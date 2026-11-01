import { redirect } from 'next/navigation';

/**
 * O endereço antigo dos levantamentos, que passa a encaminhar para o novo (01/11/2026).
 *
 * Esta página juntava oportunidades, trabalho próprio, cobertura geográfica e pagamentos numa só, e
 * mostrava sempre o prazo das 48 horas. Cada uma dessas coisas tem agora o seu ecrã em «Avaliações».
 *
 * Não se apaga o endereço: está em emails, em marcadores e na barra de endereços de quem já cá andou —
 * e deixá-lo vivo a mostrar a versão antiga foi precisamente o que fez o promotor abrir a aplicação e
 * concluir, com razão, que nada tinha mudado.
 */
export default async function LevantamentosAntigosPage() {
  redirect('/app/avaliacoes/levantamentos');
}
