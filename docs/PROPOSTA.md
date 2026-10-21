# Orçamento do pintor: desenho (21/10/2026)

Decisões do promotor e plano por fases. Ler antes de mexer em `src/domain/proposal.ts`, `ProposalForms.tsx` ou `ProposalView.tsx`.

## Princípios

1. O orçamento é **guiado**: o pintor seleciona trabalhos e, para cada um, preenche os detalhes necessários.
2. **Caixa vazia não significa excluído.** Cada trabalho tem um estado: *Incluído · Opcional · Não incluído ·
   Não aplicável · A confirmar* (antes de escolher: *Por definir*). Sim/Não só para perguntas simples
   ("Foi realizada visita?", "O cliente disponibiliza água?"). Responsabilidades: *Pintor · Cliente · A confirmar*.
3. Todos os orçamentos incluem **mão-de-obra qualificada** na execução proposta (confirmação obrigatória). Materiais e
   mão-de-obra **não** se separam por linha.
4. **Resumo sempre igual** para o cliente (por capítulo) e, em todo o lado onde a proposta aparece (cartão, comparador,
   dossiê, anexo do contrato), **"Ver orçamento discriminado"** com todas as linhas.
5. **Seguros** (RC e acidentes de trabalho): declaração obrigatória; "não tenho" não bloqueia, mas gera aviso vermelho.
6. **Pagamentos**: fases e % criadas pelo pintor, somando 100% com o adiantamento (≤30%). Pago entre as partes.
7. **Garantia**: a legal aparece sempre (sem número até haver parecer), o pintor pode aumentar.
8. Quantidade estimada fica identificada como estimada. Valor por preencher nunca aparece como 0 €.
   Proposta com pontos essenciais pendentes fica identificada como **preliminar**.

## Estrutura em 5 passos (desktop: passos à esquerda, campos ao centro, resumo à direita; telemóvel: uma coluna)

1. **Obra e medições**: dados do pedido pré-preenchidos; visita (sim/não, data); base da proposta (visita, fotografias,
   plantas, cliente); zonas/fachadas com suporte, área, critério de medição (bruta/líquida), origem e estado
   (confirmada/estimada); tipo de preço (fixo para o âmbito / sujeito a medição final / estimativa preliminar).
2. **Trabalhos**: "Aplicar esta solução a" uma, várias ou todas as fachadas. Grupos recolhidos com seletor de estado:
   acessos e proteções; preparação e limpeza; remoção de revestimentos; fissuras; rebocos e reparações; betão;
   regularização e barramento; redes e armaduras; primários; pintura final; juntas e remates; impermeabilização;
   elementos complementares (metais, madeiras, ETICS…); conclusão (resíduos, limpeza, documentação).
   Módulos técnicos só quando relevantes (rede ≠ armadura de impermeabilização; primário e pintura final com produto,
   referência, cor, acabamento, demãos escolhidas explicitamente, nunca pré-preenchidas). "Adicionar outro produto".
3. **Preços**: gerados a partir do passo 2 (sem reescrever descrições). Preço conjunto para vários trabalhos
   ("incluído no conjunto"), sem duplicar somas. Total base, opcionais e por confirmar separados.
4. **Prazos e condições**: execução, pagamentos, responsabilidades (água, eletricidade, acessos, licenças), validade,
   exclusões, trabalhos adicionais, garantias (execução e fabricante), anexos.
5. **Rever e enviar**: vista do cliente + pendências com ligação ao campo (pintura sem produto, incluído sem preço,
   estimativa sem critério, exclusão de trabalho pedido sem justificação).

## Zonas por fachada (pedido do cliente e proposta)

- Cliente: assinala as fachadas (principal, tardoz, laterais, outras com nome). Pergunta "Os trabalhos são iguais em
  todas?": *Sim, o mesmo pedido a todas · Há diferenças (comuns + ajustes por fachada) · Ainda não sei* (descreve e junta
  fotografias). Fotografias, dimensões e problemas ficam por fachada. O cliente descreve o que pretende e observa; os
  campos técnicos são do pintor.
- Pintor: "Aplicar esta solução a…"; "Usar esta solução noutra fachada" (copia); "Personalizar esta fachada" (diferença,
  com "Motivo da diferença" se o pedido era igual para todas). Alterar uma solução comum pergunta onde aplicar (só esta,
  todas as que a usam, escolher); diferenças já personalizadas não se apagam sem indicação.
- Partilhado: trabalhos, produtos, demãos, cor, preço unitário (se o pintor quiser). Por fachada: área, estado
  observado, fotografias, reparações localizadas, acessos. Custos únicos (mobilização, andaimes) aparecem uma vez.

## Fases

| Fase | Conteúdo | Estado |
|---|---|---|
| 1 | Condições obrigatórias (mão-de-obra, seguros, pagamentos por fases), garantia legal + adicional, resumo + discriminado | feito e aplicada (21/10/2026) |
| 2 | Zonas por fachada: o pedido diz se os trabalhos são iguais (`trabalhos_modo`) e cada zona pode ter os seus trabalhos; cada linha da proposta liga-se a uma ou mais zonas, com motivo da diferença; o comparador mostra que zonas ficaram sem preço | feito e aplicada (21/10/2026) |
| 3 | Orçamento guiado em 5 passos: trabalhos com estado, módulos técnicos, preços gerados | por fazer |
| 4 | Catálogo de produtos nos módulos, modelos próprios do pintor, duplicar solução, cobertura dos trabalhos pedidos no comparador | por fazer |
