// O percurso completo de um aviso de prazo, do vencimento ao email, numa base em memória.
//
// Serve para se ver o caminho todo de uma vez, antes de os prazos ficarem ativos para avaliadores reais.
// Corre as migrações do repositório numa base Postgres em memória e narra cada passo.
//
//   node scripts/percurso-dos-avisos.mjs
//
// Não toca em produção nem na rede. O que não se pode demonstrar aqui — o pg_net e o Vault não existem
// nesta base — fica dito em voz alta no sítio onde aconteceria.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const RAIZ = new URL('..', import.meta.url).pathname;
const STUB = readFileSync(join(RAIZ, 'supabase/tests/baseEmMemoria.ts'), 'utf8')
  .split('export const SUPABASE_STUB = `')[1]
  .split('`;')[0];

const CLIENTE = '00000000-0000-4000-8000-00000000c001';
const DONO = '00000000-0000-4000-8000-00000000d001';
const AVALIADOR = '00000000-0000-4000-8000-00000000a001';

let passo = 0;
const diz = (texto) => console.log(`\n${String(++passo).padStart(2, '0')}. ${texto}`);
const detalhe = (texto) => console.log(`    ${texto}`);
const hora = (d) =>
  new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(d));

const db = new PGlite();
await db.exec(STUB);
for (const f of readdirSync(join(RAIZ, 'supabase/migrations')).filter((x) => x.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(join(RAIZ, 'supabase/migrations', f), 'utf8'));
}
const uma = async (sql, params = []) => (await db.query(sql, params)).rows[0];

diz('Duas contas e duas entidades: uma condómina que pede a obra, um fornecedor que faz levantamentos.');
await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4), ($5, $6)', [
  CLIENTE,
  'condominio@exemplo.invalid',
  DONO,
  'dono@exemplo.invalid',
  AVALIADOR,
  'avaliador@exemplo.invalid',
]);
const condo = (
  await uma(
    `insert into public.organizations (kind, nome, created_by) values ('condominio', 'Condomínio da Rua das Flores', $1) returning id`,
    [CLIENTE],
  )
).id;
const fornecedor = (
  await uma(
    `insert into public.organizations (kind, nome, created_by) values ('fornecedor', 'Tintas do Vale', $1) returning id`,
    [DONO],
  )
).id;
// Quem cria a entidade fica proprietário por gatilho. O avaliador é outra pessoa, com o papel «vendedor».
await db.query(`insert into public.org_members (org_id, user_id, role) values ($1, $2, 'vendedor')`, [fornecedor, AVALIADOR]);
await db.query(`insert into public.supplier_survey_coverage (org_id, concelhos) values ($1, array['Lisboa'])`, [fornecedor]);
detalhe(`O avaliador tem o papel «vendedor» — o papel que, até hoje, não via aviso nenhum.`);

diz('A condómina cria o pedido. O levantamento abre com ele, por gatilho.');
const predio = (
  await uma(
    `insert into public.buildings (org_id, nome_interno, tipo, morada, codigo_postal, localidade, concelho, created_by)
     values ($1, 'Prédio da Rua das Flores', 'edificio_habitacao', 'Rua das Flores, 12', '4900-001', 'Viana do Castelo', 'Lisboa', $2)
     returning id`,
    [condo, CLIENTE],
  )
).id;
const pedido = (
  await uma(
    `insert into public.work_requests (org_id, building_id, titulo, tipo_obra, descricao, created_by)
     values ($1, $2, 'Pintura das fachadas', 'fachadas', 'Quatro fachadas e caixa de escadas.', $3) returning id`,
    [condo, predio, CLIENTE],
  )
).id;
const levantamento = (await uma('select id, status from public.request_surveys where request_id = $1', [pedido]));
detalhe(`Levantamento ${levantamento.id.slice(0, 8)} em estado «${levantamento.status}».`);

diz('O avaliador aceita. Os três prazos ficam escritos de uma vez, e não se movem mais.');
await db.exec(`set session "request.jwt.claim.sub" = '${AVALIADOR}'`);
await db.query('select public.reserve_survey($1, $2)', [levantamento.id, fornecedor]);
const t = await uma('select * from public.survey_attempts where survey_id = $1', [levantamento.id]);
detalhe(`Tentativa ${t.numero}, estado «${t.estado}».`);
detalhe(`Contactar até:    ${hora(t.prazo_contacto)}`);
detalhe(`Concluir até:     ${hora(t.prazo_conclusao)}`);
detalhe(`Adiamento até:    ${hora(t.limite_adiamento)}  (só a pedido da cliente)`);

diz('Passa a primeira hora útil sem contacto registado. É o caso da primeira linha da matriz.');
await db.query(
  `update public.survey_attempts set prazo_contacto = now() - interval '1 minute', prazo_conclusao = now() + interval '40 hours' where id = $1`,
  [t.id],
);
detalhe('Prazo de contacto vencido há um minuto. A verificação corre ao minuto, pela hora exata.');

diz('A verificação dos prazos corre.');
await db.query('select private.vencimentos_de_levantamentos()');
const depois = await uma('select estado, fecho_motivo, fecho_em, contacto_notas from public.survey_attempts where id = $1', [t.id]);
const vaga = await uma('select status, contact_notes from public.request_surveys where id = $1', [levantamento.id]);
detalhe(`A tentativa fechou: «${depois.estado}» às ${hora(depois.fecho_em)} — ${depois.fecho_motivo}`);
detalhe(`A vaga voltou à praça: «${vaga.status}».`);
detalhe(`O histórico ficou: a tentativa continua na base, fechada, com o motivo e a hora.`);

diz('O aviso foi escrito, dirigido à pessoa, e entrou na fila do email.');
const aviso = await uma(
  `select n.texto, n.user_id, f.id as fila, f.assunto, f.estado, f.attempt_id
   from public.avisos_por_email f join public.notifications n on n.id = f.notification_id
   where n.user_id = $1 order by n.created_at desc limit 1`,
  [AVALIADOR],
);
detalhe(`Dono do aviso:  ${aviso.user_id === AVALIADOR ? 'o avaliador que perdeu a reserva' : 'OUTRO — algo está errado'}`);
detalhe(`Texto:          ${aviso.texto}`);
detalhe(`Assunto:        ${aviso.assunto}`);
detalhe(`Na fila:        «${aviso.estado}», ligada à tentativa ${aviso.attempt_id.slice(0, 8)}`);
detalhe('Aqui a base pediria à aplicação que esvaziasse a fila (pg_net). Nesta base não existe, e o bloco');
detalhe('que engole a falha fez o seu trabalho: a verificação dos prazos correu inteira, como se vê acima.');

diz('A aplicação reclama a linha. Antes de a entregar, a base reconfirma a pertinência.');
const reclamadas = (await db.query('select * from private.reclamar_avisos(10)')).rows;
detalhe(`Reclamadas: ${reclamadas.length}. Assunto: «${reclamadas[0].assunto}».`);
detalhe(`Estado agora: «${(await uma('select estado from public.avisos_por_email where id = $1', [aviso.fila])).estado}» —`);
detalhe('por isso o outro caminho, se corresse neste instante, saltava esta linha.');

diz('O serviço de correio recusa. A linha volta à fila, com a razão e um recuo.');
await db.query('select private.resultado_do_aviso($1, false, $2)', [aviso.fila, 'O serviço de correio devolveu 429.']);
const falhou = await uma(
  'select estado, tentativas, ultimo_erro, proxima_tentativa_em from public.avisos_por_email where id = $1',
  [aviso.fila],
);
detalhe(`Estado «${falhou.estado}», ${falhou.tentativas} tentativa(s), razão: ${falhou.ultimo_erro}`);
detalhe(`Próxima tentativa a partir de ${hora(falhou.proxima_tentativa_em)}.`);
detalhe('Entretanto o avaliador já vê o aviso na aplicação — é essa a garantia, e não o email.');

diz('Chega a hora da repetição e o envio corre bem.');
await db.query(`update public.avisos_por_email set proxima_tentativa_em = now() - interval '1 second' where id = $1`, [aviso.fila]);
await db.query('select * from private.reclamar_avisos(10)');
await db.query('select private.resultado_do_aviso($1, true)', [aviso.fila]);
const enviado = await uma('select estado, tentativas, enviado_em from public.avisos_por_email where id = $1', [aviso.fila]);
detalhe(`Estado «${enviado.estado}» à ${enviado.tentativas}.ª tentativa, às ${hora(enviado.enviado_em)}.`);
detalhe('E não volta a sair: uma linha enviada não é reclamada outra vez.');

diz('A vaga é agora de outro avaliador. Um aviso antigo da tentativa anterior não lhe seria enviado.');
const pertinente = await uma('select private.aviso_pertinente($1) as p', [aviso.fila]);
detalhe(`Pertinência deste aviso para o seu destinatário: ${pertinente.p ? 'mantém-se' : 'perdeu-se'} —`);
detalhe('a tentativa continua a ser dele, por isso mantém-se. Se a vaga mudasse de dono e o aviso ainda');
detalhe('estivesse na fila, seria dispensado em vez de enviado a quem já não é o avaliador daquela tentativa.');

console.log('\n— fim do percurso —\n');
await db.close();
