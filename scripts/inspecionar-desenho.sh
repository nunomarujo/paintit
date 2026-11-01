#!/usr/bin/env bash
# Corre o inspetor do taste-skill (regra 19 do CLAUDE.md) sobre um endereço público ou um ficheiro
# HTML estático. Precisa de Node 22+ e de um Chrome/Chromium instalado; descarrega o repositório
# para uma pasta temporária se ainda não existir.
#
#   scripts/inspecionar-desenho.sh https://quempinta.pt            # página pública
#   scripts/inspecionar-desenho.sh --app caminho/para/ecra.html    # ecrã de aplicação (renderização)
#
# Os ecrãs da aplicação exigem sessão: inspecionam-se por renderização estática dos componentes,
# não ao vivo. O relatório e as capturas ficam em .taste-skill/<nome>/.
set -euo pipefail
DEST="${TASTE_SKILL_DIR:-${TMPDIR:-/tmp}/taste-skill}"
if [ ! -d "$DEST/skills/taste-skill" ]; then
  git clone -q --depth 1 https://github.com/Leonxlnx/taste-skill.git "$DEST"
fi
exec node "$DEST/skills/taste-skill/scripts/inspect.mjs" "$@"
