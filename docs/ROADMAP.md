# Plano

O produto avança por fases que entregam um percurso completo cada uma. O negócio (jurídico, pagamentos,
marca, piloto) avança em paralelo e condiciona o lançamento.

## Produto

| Fase | Conteúdo | Estado |
| --- | --- | --- |
| 0. Fundações | Projeto, regras de contratação testadas, site público com simulador | Feito |
| 1. Contas e organizações | Entrada por email, entidades com NIF validado e morada fiscal, administradora com vários condomínios, prédios, edição, equipa com papéis e convites, perfil, documentos de verificação e ecrã de validação para a equipa da plataforma. Fica para depois: email automático do convite (precisa de serviço de email) e aviso de documentos a expirar | Feito |
| 2. Prédios e pedidos | Feito: pedido de orçamento sobre um prédio, superfícies com área direta ou largura × altura − vãos, pré-visualização do anúncio, publicação com verificação de anonimato e anúncio anónimo para pintores, volume 3D genérico a partir dos dados do prédio, fotografias privadas sem metadados e fotografias de pormenor revistas pela equipa da plataforma antes de chegarem ao anúncio | Feito |
| 3. Marketplace | Feito: oportunidades para pintores (filtro por tipo e zonas de serviço), propostas com linhas técnicas (incluído, opcional, condicionado), condições, versões, comparador anónimo lado a lado, mensagens com filtro de contactos, escolha pelo cliente. Fica para depois: convites da equipa da plataforma a pintores e avaliações | Feito |
| 4. Contratação | Feito: contratação criada na escolha, acontecimentos registados por quem os pode fazer e estado reconstruído de `engagement.ts`; depósito e comissão confirmados pela equipa da plataforma; minuta gerada com resumo SHA-256; assinatura das partes; prazos; desistência, litígio, transição para outra proposta; apresentação (identidades e morada) quando a comissão entra. Falta ligar: parceiro de pagamentos e assinatura com CMD | Feito |
| 5. Backoffice | Feito: painel com filas (documentos, fotografias, contratações, denúncias), denúncias de anúncios e suspensão, decisões de litígio, conciliação com instruções ao parceiro e CSV, auditoria das decisões da equipa | Feito |
| 6. Fornecedores | Feito: catálogo com fichas técnicas (PDF), rendimento e preço de referência datado; desativar em vez de apagar; pesquisa e estimativa de consumo; produtos sugeridos nas linhas das propostas. Fica para depois: confirmação de compras de materiais (FOR-10) | Feito |

## Negócio

| Frente | Próximo passo |
| --- | --- |
| Jurídico | Enviar o documento de questões a um advogado; prioridade A1, B1, B3, B4, C2, F1, F2, F4 |
| Pagamentos | Escolher uma instituição de pagamento com retenção de fundos e passaporte para Portugal |
| Fiscal | Validar com contabilista o IVA da garantia perdida e o momento da fatura (bloco D) |
| Marca | Pesquisa INPI/EUIPO do nome; domínio |
| Infraestrutura | Criar projeto de base de dados próprio, na UE; alojamento; email transacional |
| Piloto | Uma região, 15–20 pintores verificados, algumas administradoras de condomínio |
| Marketing | Site público, conteúdos práticos para administradoras, captação de pintores |

## Complementos (19/10/2026)

| Tema | Estado |
| --- | --- |
| Materiais certificados no orçamento, descontos por escalão e entregas dos fornecedores | Feito |
| Encomendas certificadas e avaliações de fornecedores | Feito |
| Ferramentas de obra (separador discreto para o pintor) | Feito |
| Assinatura com PDF da Autenticação.gov | Feito (falta validar a cadeia de confiança do certificado) |
| Design das páginas | Feito: linguagem do protótipo v05 em toda a app |
