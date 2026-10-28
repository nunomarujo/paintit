import { describe, expect, it } from 'vitest';
import { DATA_FLEXIVEL_LABELS, etiquetaDosTipos, parseRequest, tipoPrincipal, tiposCanonicos } from './request';

/** O formulário mínimo que `parseRequest` aceita, sem nenhum tipo escolhido. */
function formulario(): FormData {
  const f = new FormData();
  f.set('buildingId', 'b1');
  f.set('titulo', 'Fachadas 2027');
  return f;
}

describe('uma obra com mais do que um tipo', () => {
  it('o principal é o primeiro pela ordem canónica, não pela ordem em que foi assinalado', () => {
    // Quem marca primeiro "Interior" e depois "Fachadas" tem a mesma obra de quem marca ao contrário:
    // o principal não pode depender da ordem dos cliques, senão o mesmo pedido dá dois anúncios.
    expect(tipoPrincipal(['interior', 'fachadas'])).toBe('fachadas');
    expect(tipoPrincipal(['fachadas', 'interior'])).toBe('fachadas');
    expect(tipoPrincipal(['interior', 'zonas_comuns'])).toBe('zonas_comuns');
  });

  it('a lista canónica ordena, tira repetidos e descarta o que não é um tipo', () => {
    expect(tiposCanonicos(['interior', 'fachadas', 'interior'])).toEqual(['fachadas', 'interior']);
    expect(tiposCanonicos(['telhados', ''])).toEqual([]);
  });

  it('a etiqueta junta os tipos; com um só, é a de sempre', () => {
    expect(etiquetaDosTipos(['fachadas'])).toBe('Fachadas e varandas');
    expect(etiquetaDosTipos(['interior', 'fachadas'])).toBe('Fachadas e varandas · Interior de habitação');
    // Lista vazia acontece em anúncios antigos, antes da migração: vale o tipo por omissão.
    expect(etiquetaDosTipos([])).toBe('Fachadas e varandas');
  });

  it('o formulário aceita vários tipos e guarda o principal a par da lista', () => {
    const f = formulario();
    f.append('tipoObra', 'interior');
    f.append('tipoObra', 'fachadas');
    const v = parseRequest(f).value;
    expect(v?.tiposObra).toEqual(['fachadas', 'interior']);
    expect(v?.tipoObra).toBe('fachadas');
  });

  it('nenhum tipo assinalado é um erro, e não um pedido sem tipo', () => {
    expect(parseRequest(formulario()).errors.tipoObra).toBe('Escolha pelo menos um tipo de obra.');
  });
});

describe('datas que o cliente dá por indicativas', () => {
  it('lê as assinaladas e ignora o que não é uma delas', () => {
    const f = formulario();
    f.append('tipoObra', 'fachadas');
    f.append('dataFlexivel', 'execucao_desde');
    f.append('dataFlexivel', 'tudo');
    f.append('dataFlexivel', 'execucao_desde');
    expect(parseRequest(f).value?.datasFlexiveis).toEqual(['execucao_desde']);
  });

  it('sem nenhuma assinalada, as datas são firmes', () => {
    const f = formulario();
    f.append('tipoObra', 'fachadas');
    expect(parseRequest(f).value?.datasFlexiveis).toEqual([]);
  });

  it('o prazo das propostas fala em prolongar, não em mudar a data', () => {
    // A entrega simultânea depende deste prazo: marcá-lo flexível informa o pintor, não move nada.
    expect(DATA_FLEXIVEL_LABELS.propostas).toContain('prolongar');
  });
});
