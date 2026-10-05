#!/usr/bin/env bash
# Cuts Canva page previews into transparent sprites.
# Usage: scripts/cut-sprites.sh <thumbs.txt> <preview-dir>
# thumbs.txt lines:  "<kind> <id> <blob>"  or  "grid <kind> <blob> <id1> <id2> <id3> [<id4>]"
set -euo pipefail
LIST=$1; SRC=$2; OUT="$(dirname "$0")/../public/art/sprites"
key() { # white background → alpha, keep the white inside the ink outline
  convert "$1" -alpha set -bordercolor white -border 1 -fuzz 12% -fill none \
    -draw "color 0,0 floodfill" -shave 1x1 -channel A -morphology Erode Disk:1 -blur 0x0.6 +channel \
    -trim +repage "$2"
}
while read -r a b c rest; do
  [ -z "${a:-}" ] && continue
  if [ "$a" = grid ]; then
    kind=$b; f="$SRC/mcp-Canva-blob-$c.png"; mkdir -p "$OUT/$kind"; i=0
    for id in $rest; do
      x=$(( (i % 2) * 300 )); y=$(( (i / 2) * 300 ))
      convert "$f" -crop 300x300+$x+$y +repage -shave 4x4 /tmp/cell.png
      key /tmp/cell.png "$OUT/$kind/$id.png"; i=$((i+1))
    done
  else
    mkdir -p "$OUT/$a"; key "$SRC/mcp-Canva-blob-$c.png" "$OUT/$a/$b.png"
  fi
done < "$LIST"
