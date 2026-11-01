#!/usr/bin/env bash
# Ponto de situação do que está por publicar. Corre-se antes de responder a «o que falta?».
# Só vê o que o Git sabe: migrações por aplicar e avisos da base pedem o painel ou o MCP do Supabase
# (ver docs/EM_ABERTO.md, «Como se verifica»).
set -u
PROD="origin/claude/sweet-brahmagupta-xd1vp7"
git fetch -q origin || { echo "Sem acesso ao remoto: o resultado abaixo pode estar desatualizado."; }
echo "== Ramos com commits que a produção não tem"
achou=0
for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin | grep -v -E 'origin/(HEAD|claude/sweet-brahmagupta-xd1vp7)$'); do
  n=$(git rev-list --count "$PROD..$b")
  if [ "$n" -gt 0 ]; then achou=1; echo "  $b: $n commit(s) por publicar"; git log --format='    %h %ad %s' --date=short "$PROD..$b" | head -5; fi
done
[ "$achou" -eq 0 ] && echo "  nenhum"
echo "== Alterações locais por enviar"
git status --porcelain | head -10
git log --oneline "@{u}..HEAD" 2>/dev/null | head -10
echo "== TODO/FIXME no código"
grep -rn -E "\b(TODO|FIXME)\b" src supabase --include=*.ts --include=*.tsx --include=*.sql | head -10
echo "(fim)"
