#!/bin/sh
# Incrusta AdaptaPE.md (fuente canónica en la extensión Base) en SKILL.md entre los marcadores
# AdaptaPE.md:inicio/fin y copia AdaptaPE.md y la skill a cada carpeta de AdaptaPE:
# .agents/skills/ (Codex) y .claude/skills/ (Claude Code).
set -eu

SKILL_DIR=$(cd "$(dirname "$0")/.." && pwd)
BASE=$(cd "$SKILL_DIR/../.." && pwd)
FUENTE="$BASE/AdaptaPE.md"
SKILL="$SKILL_DIR/SKILL.md"
[ -f "$FUENTE" ] || { echo "No existe la fuente: $FUENTE" >&2; exit 1; }

# Incrusta la guía bajando un nivel los títulos para que quede dentro de la skill.
TMP=$(mktemp)
awk -v fuente="$FUENTE" '
    /<!-- AdaptaPE.md:inicio/ { print; while ((getline linea < fuente) > 0) { if (linea ~ /^#/) linea = "#" linea; print linea }; dentro = 1; next }
    /<!-- AdaptaPE.md:fin -->/ { dentro = 0 }
    !dentro { print }
' "$SKILL" > "$TMP"
grep -q '<!-- AdaptaPE.md:fin -->' "$TMP" || { rm -f "$TMP"; echo "Faltan marcadores en $SKILL" >&2; exit 1; }
mv "$TMP" "$SKILL"
echo "SKILL.md actualizado"

# Copia sólo SKILL.md y agents/: este script depende de la ruta de la fuente y no viaja.
copiar_skill() {
    for raiz in "$1/.agents/skills" "$1/.claude/skills"; do
        mkdir -p "$raiz/adaptape-nativo/agents"
        cp "$SKILL" "$raiz/adaptape-nativo/SKILL.md"
        cp "$SKILL_DIR/agents/openai.yaml" "$raiz/adaptape-nativo/agents/openai.yaml"
    done
}

copiar_skill "$BASE"
echo "skill copiada: $BASE"

# Destinos del Mac del titular; una carpeta ausente se informa y se omite.
DESTINOS="
$HOME/PycharmProjects/WelcomeScreen/extensiónLite
$HOME/Desktop/Adapta-PE-Win
$HOME/Desktop/Adapta-PE-Lite-Win
$HOME/Desktop/TheAlejoCloud/Adapta-PE
$HOME/Desktop/TheAlejoCloud/Adapta-PE-Lite
$HOME/Desktop/Adapta-PE-Pro
$HOME/Desktop/AdaptaPE Browser
$HOME/Desktop/Mascota-Modular-Adapta-PE
$HOME/WebstormProjects/adapta-pe
"

echo "$DESTINOS" | while IFS= read -r dir; do
    [ -n "$dir" ] || continue
    if [ -d "$dir" ]; then
        cp "$FUENTE" "$dir/AdaptaPE.md"
        copiar_skill "$dir"
        echo "copiado: $dir"
    else echo "omitido (no existe): $dir" >&2; fi
done
