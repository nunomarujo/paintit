-- A reaplicação de 20261106151731 voltou a criar private.versao_da_autodeclaracao_do_avaliador sem search_path
-- (o aviso do analisador regressou). Fixa-se outra vez, como em 20261105094822. Não muda nada no comportamento:
-- a função devolve uma constante.
alter function private.versao_da_autodeclaracao_do_avaliador() set search_path = '';
