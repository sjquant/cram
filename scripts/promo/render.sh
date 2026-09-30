#!/usr/bin/env bash
# Render a promo video: scripts/promo/render.sh <long|short> <en|ko>
# Output: scripts/promo/out/cram-<long|short>-<lang>.mp4. See scripts/promo/README.md.
set -euo pipefail
cd "$(dirname "$0")"
CUT=$1; L=$2
FFMPEG=${FFMPEG:-ffmpeg}; PYTHON=${PYTHON:-python3}; WORKERS=${WORKERS:-4}; FPS=60
export FFMPEG
if [ "$CUT" = short ]; then
  "$PYTHON" build_short.py
  PAGE=(--page=short.html --w=1080 --h=1920); DUR=28
else
  PAGE=(--page=stage.html --w=1920 --h=1080); DUR=59
fi
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
mkdir -p out; OUT=out/cram-$CUT-$L.mp4
node render.js --lang="$L" "${PAGE[@]}" --cues="$TMP/cues.json"
"$PYTHON" audio.py "$TMP/cues.json" "$TMP/audio.wav"
TOT=$((DUR * FPS)); pids=()
for k in $(seq 0 $((WORKERS - 1))); do
  a=$((TOT * k / WORKERS)); b=$((TOT * (k + 1) / WORKERS))
  node render.js --lang="$L" "${PAGE[@]}" --video="$TMP/part$k.mp4" --f0=$a --f1=$b --fps=$FPS --crf=17 --preset=slow &
  pids+=($!); echo "file 'part$k.mp4'" >> "$TMP/list.txt"
done
for p in "${pids[@]}"; do wait "$p"; done
"$FFMPEG" -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" -i "$TMP/audio.wav" \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf "${CRF:-22}" -pix_fmt yuv420p \
  -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT"
echo "Wrote $OUT"
