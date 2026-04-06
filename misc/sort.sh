#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="$SCRIPT_DIR/../icons"
TMP_DIR="$SCRIPT_DIR/.tmp_icons"

styles=(
  "sharp"
  "duotone"
  "bold"
  "sharp-fill"
  "fill"
  "regular"
)

# Detect zip
ZIP_FILE=$(find "$SCRIPT_DIR" -maxdepth 1 -type f -iname "*.zip" | head -n 1)

if [[ -n "$ZIP_FILE" ]]; then
  echo "Using zip source: $ZIP_FILE"
  rm -rf "$TMP_DIR"
  mkdir -p "$TMP_DIR"
  unzip -qq "$ZIP_FILE" -d "$TMP_DIR"
  SRC_DIR="$TMP_DIR"
else
  echo "Using ./icons folder as source"
  SRC_DIR="$SCRIPT_DIR/icons"
fi

rm -rf "$OUT_DIR"

# Create output dirs
for style in "${styles[@]}"; do
  mkdir -p "$OUT_DIR/$style"
done

empty_files=()

# Process files
find "$SRC_DIR" -type f -iname "*.svg" | while read -r file; do
  filename=$(basename "$file")

  # Skip empty files
  if [[ ! -s "$file" ]]; then
    empty_files+=("$filename")
    continue
  fi

  # Lowercase filename
  lower=$(echo "$filename" | tr '[:upper:]' '[:lower:]')

  matched=false

  for style in "${styles[@]}"; do
    if [[ "$lower" == *-"$style".svg ]]; then
      base="${lower%-$style.svg}"

      cp "$file" "$OUT_DIR/$style/$base.svg"
      matched=true
      break
    fi
  done

  # Optional: unmatched files
  if [[ "$matched" = false ]]; then
    mkdir -p "$OUT_DIR/misc"
    cp "$file" "$OUT_DIR/misc/$lower"
  fi
done

# Show warning for empty files
if (( ${#empty_files[@]} > 0 )); then
  message="Empty files skipped:\n$(printf '%s\n' "${empty_files[@]}")"

  if command -v zenity >/dev/null 2>&1; then
    zenity --warning --title="Empty SVG files" --text="$message"
  else
    echo -e "$message"
  fi
fi

# Cleanup temp if used
[[ -d "$TMP_DIR" ]] && rm -rf "$TMP_DIR"

echo "Done sorting icons into '$OUT_DIR'."
