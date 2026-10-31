// Termos de confidencialidade para o avaliador ver a morada exata de uma obra reservada — decisão de
// 23/10/2026, docs/DECISOES.md. Mesma razão do painterTerms.ts: o texto vive em
// src/app/app/levantamentos/[surveyId]/AcceptTerms.tsx (não há aqui nenhuma regra de dinheiro a
// testar); esta versão é a única coisa que precisa de estar certa nos dois sítios: mudar o texto
// exige mudar esta constante, o que pede aceitação de novo a toda a gente.

export const CURRENT_SURVEY_TERMS_VERSION = '2026-10-31';

// 31/10/2026: a versão subiu porque os termos passaram a cobrir **contactos de pessoas**, e não só a morada
// exata. O promotor decidiu que o avaliador telefona ao cliente na primeira hora útil, o que obriga a dar-lhe
// nome, telefone e email — informação de outra natureza. Quem tinha aceitado a versão anterior aceita de novo.
// A base de dados conhece esta mesma versão em `private.versao_dos_termos_com_contactos()`, e há um teste em
// `supabase/tests/rls.test.ts` que falha se as duas divergirem.
