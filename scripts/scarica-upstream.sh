#!/usr/bin/env bash
# Scarica dal repository DoveVannoINostriSoldi SOLO i file che servono a
# scripts/estrai-dati.mjs (poche decine di MB invece dell'intero repository).
#
# Uso: bash scripts/scarica-upstream.sh            → .cache/upstream
#      UPSTREAM_DIR=/altra/cartella bash scripts/scarica-upstream.sh
set -euo pipefail

REPO="https://github.com/Italian-Builders-Org/DoveVannoINostriSoldi.git"
DEST="${UPSTREAM_DIR:-.cache/upstream}"
G="/src/data/generated"

rm -rf "$DEST"
git clone --quiet --depth 1 --filter=blob:none --no-checkout "$REPO" "$DEST"
git -C "$DEST" sparse-checkout set --no-cone \
  "$G/siope-municipal-detail*.json" \
  "$G/siope-municipal-receipts-detail-*.json" \
  "$G/opencivitas-*.json" \
  "$G/mef-irpef-[0-9]*.json" \
  "$G/integrated/catalog.json" \
  "$G/integrated/rows/pnrr-progetti.part-*" \
  "$G/integrated/rows/rgs-conto-annuale-occupazione-ente-*.part-*" \
  "$G/integrated/rows/rgs-conto-annuale-costo-*.part-*" \
  "$G/integrated/rows/mef-patrimonio-beni-*.part-*" \
  "$G/integrated/rows/mef-patrimonio-fabbricati-fermi-*.part-*" \
  "$G/integrated/rows/mim-scuole-statali-comuni.part-*" \
  "$G/anac-entity-procurement-page/meta.json" \
  "$G/anac-entity-procurement-page/entities/5a.jsonl.gz"
git -C "$DEST" checkout --quiet

echo "Repository originale @ $(git -C "$DEST" rev-parse --short=12 HEAD) in $DEST ($(du -sh "$DEST" | cut -f1))"
